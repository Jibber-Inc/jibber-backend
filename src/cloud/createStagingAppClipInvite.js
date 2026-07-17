import StagingAppClipInviteService from '../services/StagingAppClipInviteService';

const createStagingAppClipInvite = request => {
  if (!request.master) {
    throw new Error('createStagingAppClipInvite requires master-key access.');
  }

  return StagingAppClipInviteService.create(
    request.params.recipientPhoneNumber,
  );
};

export default createStagingAppClipInvite;
