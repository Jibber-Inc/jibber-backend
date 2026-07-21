import onboarding from '../../schemas/OnboardingSession.json';
import finalizationLease from '../../schemas/OnboardingFinalizationLease.json';
import connection from '../../schemas/Connection.json';
import conversation from '../../schemas/Conversation.json';
import definitions from '../../schemas/indexes/Onboarding.json';

describe('Canonical conversation onboarding schema', () => {
  test('keeps session writes server-owned and reads authenticated', () => {
    expect(onboarding.classLevelPermissions.find).toEqual({
      requiresAuthentication: true,
    });
    expect(onboarding.classLevelPermissions.get).toEqual({
      requiresAuthentication: true,
    });
    expect(onboarding.classLevelPermissions.create).toEqual({});
    expect(onboarding.classLevelPermissions.update).toEqual({});
    expect(onboarding.classLevelPermissions.delete).toEqual({});
  });

  test('links the canonical conversation and versions unique identity', () => {
    expect(onboarding.fields).toEqual(
      expect.objectContaining({
        completed: expect.any(Object),
        conversation: expect.any(Object),
        guide: expect.any(Object),
        lastCommittedVerificationToken: expect.any(Object),
        messagingDocumentJSON: expect.any(Object),
        pendingPhoneNumber: expect.any(Object),
        pendingVerificationStatus: expect.any(Object),
        pendingVerificationToken: expect.any(Object),
        reachedStep: expect.any(Object),
        sessionKey: expect.any(Object),
        user: expect.any(Object),
        verificationRestartRequestCount: expect.any(Object),
        verificationRestartRequestedAt: expect.any(Object),
        verificationRestartWindowStartedAt: expect.any(Object),
      }),
    );
    expect(onboarding.fields.conversation.required).toBe(false);
    expect(connection.fields.canonicalKey).toEqual(
      expect.objectContaining({ type: 'String' }),
    );
    expect(finalizationLease.fields).toEqual(
      expect.objectContaining({
        expiresAt: expect.any(Object),
        leaseKey: expect.any(Object),
        session: expect.any(Object),
        state: expect.any(Object),
        token: expect.any(Object),
        user: expect.any(Object),
      }),
    );
    expect(finalizationLease.classLevelPermissions.create).toEqual({});
    expect(conversation.fields).toEqual(
      expect.objectContaining({
        isOnboardingConversation: expect.any(Object),
        onboardingSession: expect.any(Object),
        onboardingState: expect.any(Object),
      }),
    );
    expect(definitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          className: 'OnboardingSession',
          name: 'onboarding_session_user',
          unique: true,
        }),
        expect.objectContaining({
          className: 'OnboardingSession',
          name: 'onboarding_session_conversation',
          partialFilterExpression: {
            _p_conversation: { $type: 'string' },
          },
          unique: true,
        }),
        expect.objectContaining({
          className: 'Connection',
          name: 'connection_canonical_key',
          unique: true,
        }),
        expect.objectContaining({
          className: 'OnboardingFinalizationLease',
          name: 'onboarding_finalization_lease_key',
          unique: true,
        }),
      ]),
    );
  });
});
