import Parse from '../../providers/ParseProvider';
import { makeUser } from '../setup/seedDB';
import {
  completeOnboardingSession,
  ensureOnboardingSession,
  finalizeSessionContext,
  syncOnboardingConversation,
} from '../../services/OnboardingSessionService';

const messagingDocument = guideUserId => ({
  conversation: {
    aiGuideLabelKey: 'conversation.aiGuideLabel',
    automatedPromptLabelKey: 'conversation.automatedLabel',
    steps: [
      { id: 'welcome', inputKind: 'action' },
      { id: 'phone', inputKind: 'phone', progressIndex: 0 },
      { id: 'verification', inputKind: 'verificationCode', progressIndex: 1 },
      { id: 'name', inputKind: 'name', progressIndex: 2 },
      { id: 'faceCapture', inputKind: 'faceCapture', progressIndex: 3 },
      { id: 'completed', inputKind: 'chat' },
    ],
    version: 1,
  },
  defaultLocale: 'en',
  guideUserId,
  locales: {
    en: {
      'code.action': 'Continue',
      'code.body': 'Enter the verification code.',
      'code.completed': 'You are verified.',
      'conversation.aiGuideLabel': 'AI guide',
      'conversation.automatedLabel': 'Automated onboarding',
      'guide.subtitle': 'Setting up Jibber',
      'name.action': 'Continue',
      'name.completed': 'Thanks, {{firstName}}.',
      'name.confirm.body': 'Does {{fullName}} look right?',
      'name.first.body': 'What is your full name?',
      'name.last.body': 'What is your last name?',
      'navigation.revisit': 'Swipe down to revisit',
      'phone.action': 'Continue',
      'phone.completed': 'I sent a verification code.',
      'phone.default.body': 'What is your phone number?',
      'phone.invited.body': 'Confirm your phone number.',
      'photo.body': 'Take a profile photo.',
      'photo.capture': 'Capture',
      'photo.noFace': 'Move into the frame.',
      'photo.notSmiling': 'Smile when you are ready.',
      'photo.review': 'Use Photo',
      'photo.uploadError': 'Try the photo again.',
      'welcome.invitation.body': '{{inviterName}} invited you.',
      'welcome.moment.body': 'Connect with {{inviterName}}.',
      'welcome.standard.body': 'Welcome to Jibber.',
      'welcome.action': 'Continue',
    },
  },
  revision: 12,
  schemaVersion: 1,
});

describe('canonical onboarding conversation integration', () => {
  test('persists one safe transcript without push or unread side effects', async () => {
    const [guide, user] = await Promise.all([
      makeUser({ givenName: 'Guide', familyName: 'Agent' }),
      makeUser({ givenName: undefined, familyName: undefined }),
    ]);
    user.unset('givenName');
    user.unset('familyName');
    user.set('smsVerificationStatus', 'approved');
    user.set('status', 'inactive');
    await user.save(null, { useMasterKey: true });
    await Parse.Config.save(
      {
        conversationOnboardingV1: true,
        onboardingMessagingV1: JSON.stringify(messagingDocument(guide.id)),
      },
      { useMasterKey: true },
    );

    const session = await ensureOnboardingSession(user, { locale: 'en' });
    const first = await syncOnboardingConversation(user, { locale: 'en' });
    const retry = await syncOnboardingConversation(user, { locale: 'en' });

    expect(retry.conversationId).toBe(first.conversationId);
    expect(retry.onboardingSessionId).toBe(first.onboardingSessionId);
    expect(retry.turns).toHaveLength(first.turns.length);
    expect(retry.guideSource).toBe('configuredAgent');
    expect(retry.reachedStep).toBe('name');
    expect(
      retry.turns.find(turn => turn.metadata.turnKey === 'welcome')
        .clientMessageId,
    ).toBe('onboarding:12:welcome:prompt');
    expect(
      retry.turns.find(turn => turn.metadata.turnKey === 'phone.prompt')
        .clientMessageId,
    ).toBe('onboarding:12:phone:prompt');
    expect(
      retry.turns.find(
        turn => turn.metadata.turnKey === 'verification.prompt',
      ).clientMessageId,
    ).toBe('onboarding:12:verification:prompt');
    expect(
      retry.turns.find(turn => turn.metadata.turnKey === 'name.prompt')
        .clientMessageId,
    ).toBe('onboarding:12:name:prompt');

    const transcript = retry.turns.map(turn => turn.text).join(' ');
    expect(transcript).not.toContain(user.get('phoneNumber'));
    expect(transcript).not.toContain('Private Name');
    expect(
      retry.turns.every(
        turn =>
          turn.metadata.onboarding === true &&
          turn.metadata.suppressBot === true &&
          turn.metadata.suppressPush === true &&
          turn.metadata.suppressUnread === true,
      ),
    ).toBe(true);

    const receipts = await new Parse.Query('MessageReceipt')
      .equalTo(
        'conversation',
        Parse.Object.createWithoutData('Conversation', first.conversationId),
      )
      .count({ useMasterKey: true });
    expect(receipts).toBe(0);

    const guideMembership = await new Parse.Query('ConversationMember')
      .equalTo('conversation', session.get('conversation'))
      .equalTo('user', guide)
      .first({ useMasterKey: true });
    expect(guideMembership.get('isHidden')).toBe(true);

    user.set('givenName', 'Private');
    user.set('familyName', 'Name');
    const profile = new Parse.File(
      'profile.heic',
      { base64: Buffer.from('profile').toString('base64') },
      'image/heic',
    );
    await profile.save({ useMasterKey: true });
    user.set('smallImage', profile);
    await user.save(null, { useMasterKey: true });

    const ready = await syncOnboardingConversation(user, { locale: 'en' });
    expect(ready.reachedStep).toBe('completed');
    expect(ready.turns.map(turn => turn.text).join(' ')).not.toContain(
      'Private',
    );

    await finalizeSessionContext(session, user);
    await completeOnboardingSession(session);
    const completed = await syncOnboardingConversation(user, { locale: 'en' });
    expect(completed.completed).toBe(true);

    await guideMembership.fetch({ useMasterKey: true });
    expect(guideMembership.get('isHidden')).toBe(false);
    const connection = await new Parse.Query('Connection')
      .equalTo('from', guide)
      .equalTo('to', user)
      .first({ useMasterKey: true });
    expect(connection.get('status')).toBe('accepted');
  });
});
