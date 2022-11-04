import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import Stream from '../providers/StreamProvider';
import ConnectionService from './ConnectionService';

export class PassServiceError extends ExtendableError { }

const handlePass = async (passId, user) => {
  const pass = await new Parse.Query('Pass').get(passId);
  const owner = pass.get('owner');
  const connection = await ConnectionService.createConnection(
    user,
    owner,
    'accepted',
  );
  const relation = pass.relation('connections');
  relation.add(connection);
  await pass.save(null, { useMasterKey: true });

  const members = [user.id, owner.id];
  const conversationId = `pass_${user.id}_${owner.id}`;

  const conversationConfig = Stream.client.conversation(
    'messaging',
    conversationId,
    {
      name: '',
      description: '',
      members,
      created_by_id: user.id,
    },
  );
  await conversationConfig.create();
}

/**
 * Create a reservation
 *
 * @param {Parse.User} user
 */
 const createPass = async user => {
  try {
    const currentPass = await new Parse.Query('Pass').equalTo('owner', user).first();
    if (currentPass) return currentPass;
    const pass = new Parse.Object('Pass');
    pass.set('link', 'ADD_LINK');
    pass.set('owner', user);
    pass.setACL(new Parse.ACL(user));
    return pass.save(null, { useMasterKey: true });
  } catch (error) {
    throw new PassServiceError(error.message);
  }
};

export default {
  handlePass,
  createPass
};
