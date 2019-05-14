import { Message } from './message';

export namespace MessageInterfaces {
  export interface IMessageChange {
    id: string;
    seq: number;
    doc: Message;
  }
}
