import ExtendableError from 'extendable-error-class';
import Parse from '../providers/ParseProvider';
import { assertConversationOnboardingEnabled } from '../services/OnboardingFeatureService';
import { finalizeUserOnboardingWithOptions } from './finalizeUserOnboarding';
import {
  acquireFinalizationLease,
  assertFinalizationLease,
  completeOnboardingSession,
  completeFinalizationLease,
  deriveReachedStep,
  finalizeSessionContext,
  getSessionForUser,
  releaseFinalizationLease,
  syncOnboardingConversation,
} from '../services/OnboardingSessionService';

class FinalizeUserOnboardingV2Error extends ExtendableError {}

const finalizeUserOnboardingV2 = async request => {
  let lease;
  try {
    await assertConversationOnboardingEnabled(request);
    const { user } = request;
    if (!(user instanceof Parse.User)) {
      throw new FinalizeUserOnboardingV2Error('Authentication is required.');
    }
    const session = await getSessionForUser(user);
    if (!session) {
      throw new FinalizeUserOnboardingV2Error(
        'No onboarding session exists for this user.',
      );
    }
    lease = await acquireFinalizationLease(session, user);
    if (!session.get('completed')) {
      if (deriveReachedStep(user, session) !== 'completed') {
        throw new FinalizeUserOnboardingV2Error(
          'Name and profile photo are required before onboarding can finish.',
        );
      }

      if (!session.get('contextFinalizedAt')) {
        await assertFinalizationLease(lease);
        await finalizeSessionContext(session, user);
        session.set('contextFinalizedAt', new Date());
        await session.save(null, { useMasterKey: true });
      }
      if (!session.get('accountFinalizedAt')) {
        await assertFinalizationLease(lease);
        await finalizeUserOnboardingWithOptions(
          {
            ...request,
            params: {
              ...request.params,
              momentId:
                session.get('contextType') === 'moment'
                  ? session.get('contextObjectId')
                  : undefined,
              passId:
                session.get('contextType') === 'pass'
                  ? session.get('contextObjectId')
                  : undefined,
              reservationId:
                session.get('contextType') === 'reservation'
                  ? session.get('contextObjectId')
                  : undefined,
            },
          },
          {
            skipContextHandling: true,
            skipInitialConversation: true,
          },
        );
        session.set('accountFinalizedAt', new Date());
        await session.save(null, { useMasterKey: true });
      }
      await assertFinalizationLease(lease);
      await completeOnboardingSession(session);
    } else {
      // Completed is the final marker, but retain a repair path for sessions
      // written by an earlier build or a previously interrupted completion.
      await completeOnboardingSession(session);
    }

    const summary = await syncOnboardingConversation(user, request.params);
    await completeFinalizationLease(lease);
    return { ...summary, user };
  } catch (error) {
    if (lease) {
      try {
        await releaseFinalizationLease(lease);
      } catch (releaseError) {
        // The bounded lease expires even if cleanup itself is unavailable.
      }
    }
    throw new FinalizeUserOnboardingV2Error(error.message);
  }
};

export default finalizeUserOnboardingV2;
