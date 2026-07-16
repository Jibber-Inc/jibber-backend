import StagingAppClipInviteService from '../services/StagingAppClipInviteService';

const sendStagingAppClipInvite = request => {
  if (!request.master) {
    throw new Error('sendStagingAppClipInvite requires master-key access.');
  }

  return StagingAppClipInviteService.send(
    request.params.recipientPhoneNumber,
  );
};

export default sendStagingAppClipInvite;
