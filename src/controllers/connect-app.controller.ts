import * as _ from 'lodash';
import * as moment from 'moment';
import * as uuidv4 from 'uuid/v4';
import * as imageThumbnail from 'image-thumbnail';

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/observable/bindCallback';
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

// Importing fromPromise the same way that mergeMap and others are
// imported causes a typescript build error. This is the work-around.
import { fromPromise } from 'rxjs/observable/fromPromise';

import { bucketNames, DocTypeConstants, viewNames } from '../constants';

import { Message, MessageInterfaces, Resident, SyncGatewayInterfaces } from '../models';
import { SyncGatewayService } from '../services/sync-gateway.service';

const MESSAGE_ATTACHMENT = 'message_attachment';
const THUMBNAIL = 'tile_image';
const PROFILE_IMAGE = 'profile_image';

export class ConnectAppController {
  constructor(private service: SyncGatewayService) {}

  getResident(residentId: string): Observable<Resident> {
    return this.service.get(bucketNames.RESIDENT_DATA, residentId);
  }

  getContactResidents(email: string): Observable<Resident> {
    return this.service
      .getView(bucketNames.RESIDENT_DATA, viewNames.CONTACT_RESIDENTS, {
        key: email
      })
      .mergeMap((viewResults: SyncGatewayInterfaces.IViewResult<[string[], Resident]>[]) => {
        console.log(viewResults);
        const residents = (viewResults || []).map(
          item => <Resident>Object.assign({}, { _id: item.id }, item.value)
        );
        return Observable.of(_.uniqBy(residents, '_id'));
      });
  }

  getMessageAttachment(messageId: string, getThumbnail: boolean = false): Observable<string> {
    const attachmentName = getThumbnail ? THUMBNAIL : MESSAGE_ATTACHMENT;
    return this.service.getAttachment(bucketNames.MESSAGE_DATA, messageId, attachmentName);
  }

  getMessageChanges(
    contactEmail: string,
    sequenceId: string
  ): Observable<MessageInterfaces.IMessageChange[]> {
    return this.service.getMessageChanges(contactEmail, sequenceId);
  }

  /**
   * Create a message document with media attachment and thumbnail for images
   * Deployment Note: If the API is built and deployed from a non-linux machine,
   * the API will fail to run when deployed to AWS. This is due to a image-thumbnail
   * dependency (sharp) that must be built on the same OS that it is run on.
   */
  createMessageWithAttachment(
    residentId: string,
    contactEmail: string,
    contentType: string,
    data: any
  ): Observable<SyncGatewayInterfaces.IUpdateResult> {
    // To attach a media file, there must first be a message document to attach it to
    return this.service
      .update<Message>(bucketNames.MESSAGE_DATA, {
        _id: uuidv4(),
        body: '',
        contact_email: contactEmail,
        created_by: 'connect-api',
        created_date: moment.utc(new Date()).toISOString(),
        is_outgoing: false,
        modified_by: 'connect-api',
        modified_date: moment.utc(new Date()).toISOString(),
        read: false,
        recipient_id: residentId,
        type: 'connect_api_message',
        doc_type: DocTypeConstants.DOC_TYPES.MESSAGE.SHARED_MEDIA
      })
      .mergeMap((message: Message) => {
        // Each time a document in created or modified, Sync Gateway updates
        // the revision. The most recent revision is required to update a document
        return this.service.updateAttachment(
          bucketNames.MESSAGE_DATA,
          message._id,
          message._rev,
          MESSAGE_ATTACHMENT,
          contentType,
          data
        );
      })
      .mergeMap((result: SyncGatewayInterfaces.IUpdateResult) => {
        // If the request to add an attachment failed, result.ok will be false or not set
        // In that case, just pass on the result so the user can see the error
        // Also, if the contentType is not an image, then don't continue
        // since these are the only types we are making thumbails for right now.
        // The exact content type does not need to be verified since it is verified
        // by the route function
        if (!result.ok) {
          return Observable.of(
            Object.assign({}, result, {
              contentType: contentType,
              debugmsg: 'Skipping thumbnail creation due to media attachment update failure.'
            })
          );
        }

        if (!contentType.startsWith('image/')) {
          return Observable.of(
            Object.assign({}, result, {
              message: `Skipping thumbnail creation due to invalid content type ${contentType}`
            })
          );
        }

        // imageThumbnail is an async process and returns a Promise. This needs to be
        // converted to an observable. MergeMap is used directly on Observable.from
        // so that the previous update result stays in scope and we can access the
        // most recent revision. imageThumbnail returns a buffer so it can be sent
        // directly to Sync Gateway without further conversion.
        return fromPromise(
          imageThumbnail(new Buffer(data).toString('base64'), {
            width: 100,
            height: 100,
            responseType: 'buffer'
          })
        ).mergeMap(thumbnail => {
          // Update the message document with the thumbnail using the id and rev
          // from the last document update
          return this.service.updateAttachment(
            bucketNames.MESSAGE_DATA,
            result.id,
            result.rev,
            THUMBNAIL,
            contentType,
            thumbnail
          );
        });
      });
  }

  createMessage(residentId: string, contactEmail: string, message: string): Observable<Message> {
    const id = uuidv4();
    return this.service.update<Message>(bucketNames.MESSAGE_DATA, {
      _id: id,
      body: message,
      contact_email: contactEmail,
      created_by: 'connect-api',
      created_date: moment.utc(new Date()).toISOString(),
      is_outgoing: false,
      modified_by: 'connect-api',
      modified_date: moment.utc(new Date()).toISOString(),
      read: false,
      recipient_id: residentId,
      type: 'text_message',
      doc_type: DocTypeConstants.DOC_TYPES.MESSAGE.SHARED_MEDIA
    });
  }

  getResidentProfileImage(residentId: string): Observable<Resident> {
    return this.service.getAttachment(bucketNames.RESIDENT_DATA, residentId, PROFILE_IMAGE);
  }

  getIndexOfMedia(email: string): any {
    console.log(email);
    return this.service
      .getView(bucketNames.MESSAGE_DATA, viewNames.MEDIA_BY_CONTACT_EMAIL, {
        key: email
      })
      .mergeMap(viewResults => {
        console.log(viewResults);
        const media = (viewResults || []).map(
          item => <Message>Object.assign({}, { _id: item.id }, item.value)
        );
        return Observable.of(media);
      });
  }

  updateContactOnlineStatus(email: string, isOnline: string): any {
    return this.service
      .getView(bucketNames.USER_PROFILE_DATA, viewNames.USER_BY_EMAIL, { key: email })
      .mergeMap(docs => {
        const filteredContacts = docs.map(doc => doc.value).filter(doc => doc.type === 'contact');

        filteredContacts.forEach(contact => {
          contact.online_at = isOnline
            ? moment()
                .utc()
                .format()
            : null;
        });

        return this.service.bulkUpdate(bucketNames.USER_PROFILE_DATA, filteredContacts);
      });
  }
}
