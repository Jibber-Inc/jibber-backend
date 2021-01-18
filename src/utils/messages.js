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

export default {
  getMessage,
};
