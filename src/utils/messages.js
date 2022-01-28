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
  admin: [
    "Invite friends or family. Groups of 3+ get in first.",
    "100%. Jibber is not secretly owned by big social.",
    "Users can soon. Accredited investors can now. JoinJibber.com",
    "If we're good enough that 1 in 3 upgrade, we will never need ads.",
    "Because they all work the same way. We think different can be better.",
    "Yes. Plus many ways to earn a free upgrade.",
    "We're thinking half of what it's worth, so it's twice the value.",
    "Soon. Lots of premium features coming.",
    "Not yet. iPhone first for now.",
    "Yes. Up to 10 people, including you.",
    "Messages sent respect the focus setting on your iPhone.",
    "Yes, you can see how I felt when I wrote this. [😌 Calm]",
    "The darker means most recent message.",
    "So many things. Try scrolling.",
    "To improve the way we talk, so we connect when we're together.",
    "A new way to talk that feels more like being in person.",
  ],
  user: [
    "How do I move up the waitlist?",
    "Are you an independent startup?",
    "Can anyone invest in Jibber?",
    "How is your business model different?",
    "Why does the world need another chat app?",
    "Will there always be a free version?",
    "What will premium cost?",
    "Can I create multiple groups?",
    "Can I invite someone who has Android?",
    "Can I use Jibber for group chat?",
    "What does quiet or urgent delivery mean?",
    "Can I attach how I'm feeling to a message?",
    "What do the colors mean?",
    "What makes Jibber unique?",
    "Why did you make Jibber?",
    "What is Jibber?",
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
