import Parse from '../../providers/ParseProvider';
import onChannelAdded from './onChannelAdded';
import onChannelDestroyed from './onChannelDestroyed';
import onChannelUpdated from './onChannelUpdated';
import onMediaMessageSent from './onMediaMessageSent';
import onMemberAdded from './onMemberAdded';
import onMemberRemoved from './onMemberRemoved';
import onMemberUpdated from './onMemberUpdated';
import onMessageRemoved from './onMessageRemoved';
import onMessageSent from './onMessageSent';
import onMessageUpdated from './onMessageUpdated';
import onUserAdded from './onUserAdded';
import onUserUpdated from './onUserUpdated';

/**
 * Post-Event Webhooks fire after any action taken on a Chat Service.
 *
 * onMessageSent - Fires when a new message is posted to a channel.
 * onMessageRemoved - Fires when a message is deleted from a channel.
 * onMessageUpdated - Fires when a posted message's body or any attribute is changed.
 * onMediaMessageSent - Fires when a new media message is posted to a channel.
 * onChannelAdded - Fires when a new channel, public or private, is created.
 * onChannelUpdated - Fires when any attribute of a channel is changed.
 * onChannelDestroyed - Fires when a channel is removed from the Service.
 * onMemberAdded - Fires when a User has joined a Channel as a Member.
 * onMemberUpdated - Fires when Member's attributes are updated.
 * onMemberRemoved - Fires when a User is removed from the set of Channel Members.
 * onUserAdded - Fires when a new User has been created. (cannot be intercepted with a Pre-Event hook)
 * onUserUpdated - Fires when any configurable attribute of a User is changed.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatAfterEvent = async (request, response) => {
  // Route function by Event Type
  const { EventType } = request.body;

  const handlers = {
    onChannelAdded,
    onChannelDestroyed,
    onChannelUpdated,
    onMediaMessageSent,
    onMemberAdded,
    onMemberRemoved,
    onMemberUpdated,
    onMessageRemoved,
    onMessageSent,
    onMessageUpdated,
    onUserAdded,
    onUserUpdated,
  };

  // Log twilio event in Parse
  const eventLog = new Parse.Object('EventLog');
  eventLog.set('provider', 'twilio');
  eventLog.set('eventType', EventType);
  eventLog.set('payload', request.body);
  await eventLog.save(null, { useMasterKey: true });

  // Return error if no route for EventType
  if (!Object.prototype.hasOwnProperty.call(handlers, EventType)) {
    const msg = `No handler found for ${EventType}`;
    // Log twilio event error in Parse
    eventLog.set('error', msg);
    await eventLog.save(null, { useMasterKey: true });
    return response.status(403).send(msg);
  }

  return handlers[EventType](request, response);
};

export default chatAfterEvent;