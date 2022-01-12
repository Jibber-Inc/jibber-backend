import EventHandlers from '../constants/eventHandlers';

const getEventInfo = event => {
  const [currentHandler, eventType] = event && event.split('.');
  return [
    EventHandlers.customHandlers[currentHandler] || currentHandler,
    eventType,
  ];
};

const getParams = body => ({
  ...body,
  conversationId: body.channel_id,
  conversationCid: body.channel_cid,
});

export default {
  getEventInfo,
  getParams,
};
