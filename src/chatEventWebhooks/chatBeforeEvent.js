



/**
 * "In the case of Pre-Event webhooks, Twilio will wait for a response from
 * your service before publishing a result. The arrival, HTTP status code, and
 * content of your response determines how Programmable Chat will proceed."
 * https://www.twilio.com/docs/chat/webhook-events#using-pre-event-webhooks-to-modify-or-reject-changes
 *
 * 👆 Parse not being able to handle custom response codes will limit our
 * ability to interact with Twilio during this Pre-Event webhook.
 * Serving these in express outside cloud code solves for now
 *
 * Webhook Event Triggers
 * https://www.twilio.com/docs/chat/webhook-events#webhook-event-triggers
 * onMessageSend - Fires when a new message is posted to a channel.
 * onMessageRemove - Fires when a message is deleted from a channel.
 * onMessageUpdate - Fires when a posted message's body or any attribute is changed.
 * onMediaMessageSend - Fires when a new media message is posted to a channel.
 * onChannelAdd - Fires when a new channel, public or private, is created.
 * onChannelUpdate - Fires when any attribute of a channel is changed.
 * onChannelDestroy - Fires when a channel is removed from the Service.
 * onMemberAdd - Fires when a User has joined a Channel as a Member.
 * onMemberUpdate - Fires when Member's attributes are updated.
 * onMemberRemove - Fires when a User is removed from the set of Channel Members.
 * onUserUpdate - Fires when any configurable attribute of a User is changed.
 *
 * @param {Request} request
 * @param {Response} response
 * @returns {Response}
 */
const chatBeforeEvent = async (request, response) => {

  return response
    .status(200)
    .json({});
};

export default chatBeforeEvent;
