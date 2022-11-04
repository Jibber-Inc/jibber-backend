import ExtendableError from 'extendable-error-class';
import NoticeService from '../services/NoticeService';
import ChatService from '../services/ChatService';
import { MESSAGE } from '../constants';

class DeleteNoticesCloudError extends ExtendableError {}

const deleteNotices = async request => {
  const notices = await NoticeService.getReadMessageNotices();

  if (notices.length) {
    for (let i = 0; i < notices.length; i++) {
      const attributes = notices[i].get('attributes');
      const messageId = attributes.messageId;

      const message = await ChatService.getMessage(messageId);

      if (message && message.context != MESSAGE.CONTEXT.TIME_SENSITIVE) {
        await NoticeService.deleteMessageReadNotice(notices[i].get('id'));
      }
    }
  }
};

export default deleteNotices;
