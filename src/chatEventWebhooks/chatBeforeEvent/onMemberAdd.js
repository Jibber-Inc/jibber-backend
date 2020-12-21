/**
 * EventType - string - Always onMemberAdd
 * ChannelSid - string - Channel String Identifier
 * Identity - string
 *          - The Identity of the User being added to the channel as a Member
 * RoleSid - string, optional - The Role SID of added member
 * Reason - string
 *        - The reason for the addition of the member.
 *          Could be: ADDED or JOINED
 */
const onMemberAdd = (request, response) => response.status(200).json({});

export default onMemberAdd;
