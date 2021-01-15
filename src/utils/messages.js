/**
 * Replaces the given values in the tags in a message
 *
 * @param {*} message
 * @param {*} values
 */
const getMessage = (message, values) => {
  if (values) {
    let newMessage;
    for (const [key, value] of Object.entries(values)) {
      newMessage = message.replace(`%${key}%`, value);
    }
    return newMessage;
  }
  return message;
};

export default {
  getMessage,
};
