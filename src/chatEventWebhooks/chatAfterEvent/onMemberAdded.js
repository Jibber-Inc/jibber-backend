
/**
 * EventType - string - Always onMemberAdded
 * MemberSid - string - The Member SID of the newly added Member
 * ChannelSid - string - Channel String Identifier
 * Identity - string
 *          - The Identity of the User being added to the channel as a Member
 * RoleSid - string, optional - The Role SID of added member
 * Reason - string
 *        - The reason for the addition of the member. Could be ADDED or JOINED
 * DateCreated - date string - The date of Member addition
 */
const onMemberAdded = (request, response) => {
  return response
    .status(200)
    .json({});
};

export default onMemberAdded;
