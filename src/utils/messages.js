/**
 * Replaces the given values in the tags in a message
 *
 * @param {*} message
 * @param {*} values
 */
const getMessage = (message, values) => {
  if (values) {
    let newMessage;
    Object.entries(values).forEach(([key, value]) => {
      const updatedValue = value || '';
      newMessage = message.replace(`%${key}%`, updatedValue);
    });
    return newMessage;
  }
  return message;
};

const messages = {
  welcome: [
    'Hi %givenName% :hola:, we are so glad you joined Jibber!',
    'Jibber is all about communicating better with those you are closest too.',
    "You may have noticed there isn't a send button! :sonrisa_burlona: To send a message simply swipe up on the message bubble.",
    'You can swipe up to REPLY or right to send a new message.',
    'Tap a message to view all the replies.',
    'Feel free to try it out and leave us any feedback here! Have fun :gafas_de_sol:',
  ],
};

const waitlistMessages = [
  "Hi, I'm Benji Dodgson, Co-founder of Jibber. Welcome to the private beta.",
  "If you have any questions, I'm here for you. Just ask.",
  "Type a message, then swipe it up to send it to me."
];

export default {
  getMessage,
  messages,
  waitlistMessages,
};
