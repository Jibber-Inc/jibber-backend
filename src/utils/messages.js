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

const welcomeMessages = [
  ["How do I move up the waitlist?", "Invite friends or family. Groups of 3+ get in first."],
  ["Are you an independent startup?", "100%. Jibber is not secretly owned by big social."],
  ["Can anyone invest in Jibber?", "Users can soon. Accredited investors can now. JoinJibber.com"],
  ["How is your business model different?", "If we're good enough that 1 in 3 upgrade, we will never need ads."],
  ["Why does the world need another chat app?", "Because they all work the same way. We think different can be better."],
  ["Will there always be a free version?", "Yes. Plus many ways to earn a free upgrade."],
  ["What will premium cost?", "We're thinking half of what it's worth, so it's twice the value."],
  ["Can I create multiple groups?", "Soon. Lots of premium features coming."],
  ["Can I invite someone who has Android?", "Not yet. iPhone first for now."],
  ["Can I use Jibber for group chat?", "Yes. Up to 10 people, including you."],
  ["What does quiet or urgent delivery mean?", "Messages sent respect the focus setting on your iPhone."],
  ["Can I attach how I'm feeling to a message?", "Yes, you can see how I felt when I wrote this. [:relieved: Calm]"],
  ["What do the colors mean?", "The darker means most recent message."],
  ["What makes Jibber unique?", "So many things. Try scrolling."],
  ["Why did you make Jibber?", "To improve the way we talk, so we connect when we're together."],
  ["What is Jibber?", "A new way to talk that feels more like being in person."]
];

const waitlistMessages = [
  "Hi, I'm Benji Dodgson, Co-founder of Jibber. Welcome to the private beta.",
  "If you have any questions, I'm here for you. Just ask.",
  "Type a message, then swipe it up to send it to me."
];

export default {
  getMessage,
  welcomeMessages,
  waitlistMessages,
};
