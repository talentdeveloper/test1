import { v4 as uuidv4 } from 'uuid/v4';
import { DocTypeConstants, PortalUserConstants } from '../../constants';
import { AuthenticationInterfaces, SyncGatewayInterfaces } from '../../models';

export class DocMocker {
  static buildDocByDocType(
    docType: string,
    includeId: boolean,
    includeRev: boolean,
    accountId?: string,
    facilityId?: string
  ): any {
    const doc: {
      _id?: string;
      _rev?: string;
      doc_type?: string;
      account_id?: string;
      facility_id?: string;
    } = { doc_type: docType };

    if (includeId) {
      doc._id = uuidv4();
    }

    if (includeRev) {
      doc._rev = Math.floor(100 * Math.random()).toString() + '-' + uuidv4();
    }

    if (
      accountId &&
      docType !== DocTypeConstants.DOC_TYPES.ACCOUNT.ACCOUNT &&
      docType.startsWith('account')
    ) {
      doc.account_id = accountId;
    }

    if (facilityId && docType.startsWith('account_device')) {
      doc.facility_id = facilityId;
    }

    return doc;
  }

  static shouldHavePermission(
    action: 'GET' | 'POST' | 'PUT' | 'DELETE',
    doc: SyncGatewayInterfaces.ISyncGatewayDocument,
    syncUserDoc: AuthenticationInterfaces.ISyncAdminDoc,
    docIsInAccount: boolean = false,
    docIsInUsersFacilities: boolean = false
  ): boolean {
    if (
      doc.doc_type === DocTypeConstants.DOC_TYPES.ACCOUNT.SYSTEM_INFO ||
      syncUserDoc.type === PortalUserConstants.FACILITY_USER
    ) {
      return false;
    }

    const isAccountNamespace = doc.doc_type.startsWith(DocTypeConstants.DOC_NAMESPACES.ACCOUNT);
    const isContentNamespace = doc.doc_type.startsWith(DocTypeConstants.DOC_NAMESPACES.CONTENT);

    return {
      [PortalUserConstants.ACCOUNT_ADMIN]: {
        GET: isAccountNamespace && docIsInAccount,
        POST:
          isAccountNamespace &&
          docIsInAccount &&
          doc.doc_type !== DocTypeConstants.DOC_TYPES.ACCOUNT.ACCOUNT,
        PUT: isAccountNamespace && docIsInAccount,
        DELETE:
          isAccountNamespace &&
          docIsInAccount &&
          doc.doc_type !== DocTypeConstants.DOC_TYPES.ACCOUNT.ACCOUNT
      },
      [PortalUserConstants.FACILITY_ADMIN]: {
        GET: isAccountNamespace && (docIsInUsersFacilities || doc._id === syncUserDoc.account_id),
        POST:
          isAccountNamespace &&
          docIsInUsersFacilities &&
          [
            DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE,
            DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE_STATUS
          ].includes(doc.doc_type),
        PUT: isAccountNamespace && docIsInUsersFacilities,
        DELETE:
          isAccountNamespace &&
          docIsInUsersFacilities &&
          [
            DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE,
            DocTypeConstants.DOC_TYPES.ACCOUNT.DEVICE_STATUS
          ].includes(doc.doc_type)
      },
      [PortalUserConstants.IN2L_ADMIN]: {
        GET: true,
        POST: true,
        PUT: true,
        DELETE: true
      },
      [PortalUserConstants.IN2L_CONTENT]: {
        GET: isContentNamespace,
        POST: isContentNamespace,
        PUT: isContentNamespace,
        DELETE: isContentNamespace
      }
    }[syncUserDoc.type][action];
  }
}
