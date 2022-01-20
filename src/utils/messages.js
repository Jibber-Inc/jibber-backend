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
    'Hi %givenName% 👋, we are so glad you joined Jibber!',
    'Jibber is all about communicating better with those you are closest too.',
    "You may have noticed there isn't a send button! 😁 To send a message simply swipe up on the message bubble.",
    'You can swipe up to REPLY or right to send a new message.',
    'Tap a message to view all the replies.',
    'Feel free to try it out and leave us any feedback here! Have fun 😎',
  ],
};

const waitlistMessages = [
  "Hey %givenName% 👋, welcome to Jibber!",
  "My name is Benji, and I'm one of the Co-Founders of Jibber.",
  "If you ever wanna chat, you can just message me here."
];

export default {
  getMessage,
  messages,
  waitlistMessages,
};
