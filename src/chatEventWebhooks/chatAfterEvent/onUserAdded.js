
/**
 * UserSid - string, SID - The SID of the User that was updated.
 * EventType - string - Always onUserAdded
 * Identity - string - The Identity of the User that was updated
 * FriendlyName - string, optional
 *              - The optional FriendlyName (if set) of the updated User
 * RoleSid - string - The Role SID the User that was updated
 * DateCreated - string, ISO8601 time
 *             - The date and time the User was first created
 * Attributes - JSON, string, optional
 *            - The optional Attributes of the updated user (if set). JSON
 *              structure in string format.
 */
const onUserAdded = (request, response) => {
  return response
    .status(200)
    .json({});
};

export default onUserAdded;
