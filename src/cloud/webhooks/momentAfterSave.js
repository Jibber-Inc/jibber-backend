import ExtendableError from 'extendable-error-class';
import PushService from '../../services/PushService';
import ConnectionService from '../../services/ConnectionService';
import UserUtils from '../../utils/userData';
import { STATUS_ACCEPTED, INTERRUPTION_LEVEL_TYPES } from '../../constants';

class MomentAfterSaveError extends ExtendableError {}

/**
 * After save webhook for Moment objects.
 * @param {Object} request
 */
const momentAfterSave = async request => {
  const moment = request.object;

  if (moment.className !== 'Moment') {
    throw new ConnectionBeforeSaveError(
      'Expected moment.className to be "Moment"',
    );
  }

  const authorOfTheMoment= moment.get('author');
  const author = await new Parse.Query(Parse.User).get(authorOfTheMoment.id);

  if (!author) throw new Error('Author not found!');

  const fullName = UserUtils.getFullName(author);
  const connection = await ConnectionService.getConnections(author);

  const usersWithConnections = [];

  if (connection && connection.incoming) {
    for (let i = 0; i < connection.outgoing.length; i++) {
      const status = connection.outgoing[i].get('status');
      const user = connection.outgoing[i].get('to');

      if (user && status == STATUS_ACCEPTED) {
        usersWithConnections.push(user);
      }
    }
  }

  if (usersWithConnections) {
    const data = {
      title: `New moment has been shared`,
      body: `${fullName} shared a Moment 👀`,
      target: 'moment',
      interruptionLevel: INTERRUPTION_LEVEL_TYPES.ACTIVE,
      momentId: moment.get('id'),
    };

    await PushService.sendPushNotificationToUsers(data, usersWithConnections);
  }
};

export default momentAfterSave;
