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
      "Invite friends or family. Groups of 3+ get in first.",
      "How do I move up the waitlist?",
      "100%. Jibber is not secretly owned by big social.",
      "Are you an independent startup?",
      "Users can soon. Accredited investors can now. JoinJibber.com",
      "Can anyone invest in Jibber?",
      "If we're good enough that 1 in 3 upgrade, we will never need ads.",
      "How is your business model different?",
      "Because they all work the same way. We think different can be better.",
      "Why does the world need another chat app?",
      "Yes. Plus many ways to earn a free upgrade.",
      "Will there always be a free version?",
      "We're thinking half of what it's worth, so it's twice the value.",
      "What will premium cost?",
      "Soon. Lots of premium features coming.",
      "Can I create multiple groups?",
      "Not yet. iPhone first for now.",
      "Can I invite someone who has Android?",
      "Yes. Up to 10 people, including you.",
      "Can I use Jibber for group chat?",
      "Messages sent respect the focus setting on your iPhone.",
      "What does quiet or urgent delivery mean?",
      "Yes, you can see how I felt when I wrote this. [😌 Calm]",
      "Can I attach how I'm feeling to a message?",
      "The darker means most recent message.",
      "What do the colors mean?",
      "So many things. Try scrolling.",
      "What makes Jibber unique?",
      "To improve the way we talk, so we connect when we're together.",
      "Why did you make Jibber?",
      "A new way to talk that feels more like being in person.",
      "What is Jibber?"
    ]
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
