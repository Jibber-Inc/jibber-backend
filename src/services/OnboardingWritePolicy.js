export const isTrustedOnboardingWrite = request =>
  Boolean(
    request &&
      request.master &&
      request.context &&
      request.context.messagingOnboardingSeed === true,
  );

export default {
  isTrustedOnboardingWrite,
};
