import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';

export class OnboardingFeatureServiceError extends ExtendableError {}

export const assertConversationOnboardingEnabled = async request => {
  if (request && request.master) return true;
  const config = await Parse.Config.get({ useMasterKey: true });
  const enabled = config.get('conversationOnboardingV1') === true;
  if (!enabled) {
    throw new OnboardingFeatureServiceError(
      'Conversation onboarding is not enabled for this environment.',
    );
  }
  return true;
};

export default { assertConversationOnboardingEnabled };
