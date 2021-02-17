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
      newMessage = message.replace(`%${key}%`, value);
    });
    return newMessage;
  }
  return message;
};

const messages = {
  welcome: [
    'Hi %givenName% 👋, we are so glad you are here!',
    'Ours is a better way to communicate online and we want to show a few ways how we do that.',
    'First is to a set a time each day that you are most ready to READ/RESPOND to messages. We call this a "ritual". Every message anyone sends you will be displayed in your feed during this time. You can always access any message, but the idea here is to help you not be distracted through out your day.',
    "You may have noticed there isn't a send button! 😱 That's intentional. Simply swipe up on your message in order to send it. If you need to move the cursor, simply hold down on the spacebar. This gesture is to help reduce the number of accidental sends by adding a touch of intentionality 🤗.",
    'All messages are set to READ manually. This ensures that you know when a message is actually read, not just scrolled too 🧐. Simply tap a message, you want to set, or pull up on the last message in the conversation.',
    'Hit us up in Feeback if you have issues or suggestions. Enjoy! 🥳',
  ],
  feedback: [
    'Ours is a community of people driven to create a better place to communicate online. That includes you and your feedback! Have a suggestion 🧐? Found a bug 🤭? Let us know here!',
  ],
};

export default {
  getMessage,
  messages,
};
