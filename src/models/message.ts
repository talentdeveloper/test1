export class Message {
  _id?: string;
  _rev?: string;
  _attachments: {
    [attachmentName: string]: {
      content_type: string;
      digest: string;
      length: number;
      revpos: number;
      stub: boolean;
    };
  };
  body: string;
  contact_email: string;
  created_by: string;
  created_date: string;
  doc_type?: string;
  is_outgoing: string;
  modified_by: string;
  modified_date: string;
  read: string;
  recipient_id: string;
  type: string;
  submittedContentType?: any;
  dataAsIs?: any;
  dataBase64Stringed?: any;
  dataBuffered?: any;
  request?: any;
}
