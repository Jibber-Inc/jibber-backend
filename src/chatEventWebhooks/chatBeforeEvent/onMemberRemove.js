/**
 * EventType - string - Always onMemberRemove
 * ChannelSid - string - Channel String Identifier
 * Identity - string - The Identity of the User being removed from the channel
 * MemberSid - string - The member SID of member being removed
 * RoleSid - string, optional - The role of removed member
 * Reason - string
 *        - The reason of the removal of the member. Could be: REMOVED or LEFT
 */
const onMemberRemove = (request, response) => {
  return response.status(200).json({});
};

export default onMemberRemove;
