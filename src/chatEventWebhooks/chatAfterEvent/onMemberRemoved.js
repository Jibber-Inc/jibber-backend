/**
 * EventType - string - Always onMemberRemoved
 * ChannelSid - string - Channel String Identifier
 * Identity - string - The Identity of the User being removed from the channel
 * MemberSid - string - The Member SID of member being removed
 * RoleSid - string, optional - The role of removed member
 * Reason - string
 *        - The reason for the removal of the member. Could be REMOVED or LEFT
 * DateCreated - date string - The date of Member addition
 * DateRemoved - date string - The date of Member remo
 */
const onMemberRemoved = (request, response) => {
  return response.status(200).json({});
};

export default onMemberRemoved;
