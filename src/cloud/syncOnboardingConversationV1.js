import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import { assertConversationOnboardingEnabled } from '../services/OnboardingFeatureService';
import { syncOnboardingConversation } from '../services/OnboardingSessionService';

class SyncOnboardingConversationError extends ExtendableError {}

const syncOnboardingConversationV1 = async request => {
  try {
    await assertConversationOnboardingEnabled(request);
    if (!(request.user instanceof Parse.User)) {
      throw new SyncOnboardingConversationError('Authentication is required.');
    }
    return await syncOnboardingConversation(request.user, request.params);
  } catch (error) {
    throw new SyncOnboardingConversationError(error.message);
  }
};

export default syncOnboardingConversationV1;
