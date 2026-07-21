import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import ChatService from './ChatService';
import ConnectionService from './ConnectionService';

export class PassServiceError extends ExtendableError {}

const handlePass = async (passId, user, options = {}) => {
  const pass = await new Parse.Query('Pass').get(passId, {
    useMasterKey: true,
  });
  const owner = pass.get('owner');
  const connection = await ConnectionService.createConnection(
    user,
    owner,
    'accepted',
  );
  const relation = pass.relation('connections');
  relation.add(connection);
  await pass.save(null, { useMasterKey: true });

  if (options.conversation) return options.conversation;

  const members = [user.id, owner.id];
  const conversationId = `pass_${user.id}_${owner.id}`;

  return ChatService.createConversation(
    user,
    conversationId,
    'pass',
    '',
    members,
    { trustedLegacyContextKey: true },
  );
};

export default {
  handlePass,
};
