



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

  return response
    .status(200)
    .json({});
};

export default chatAfterEvent;
