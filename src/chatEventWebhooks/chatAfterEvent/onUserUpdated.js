
/**
 * UserSid - string, SID - The SID of the User that was updated.
 * EventType - string - Always onUserUpdated
 * Identity - string - The Identity of the User that was updated
 * FriendlyName - string, optional
 *              - The optional FriendlyName (if set) of the updated User
 * RoleSid - string - The Role SID the User that was updated
 * DateCreated - string, ISO8601 time
 *             - The date and time the User was first created
 * DateUpdated - string, ISO8601 time - The date and time the User was updated
 * Attributes - JSON, string, optional
 *            - The optional Attributes of the updated user (if set). JSON
 *              structure in string format.
 * IsOnline - boolean, optional
 *          - true if the user has an active session and can create and receive
 *            real-time events. This field is present only if Reachability
 *            Indicator feature is enabled for the Service instance.
 * IsNotifiable - boolean, optional
 *              - true if the user has an active session and can create and
 *                receive push notifications. This field is present only if the
 *                Reachability Indicator and Push Notifications features are
 *                enabled for the Service instance. The User must also have at
 *                least one Push Notification registration for Chat.
 */
const onuserUpdated = (request, response) => {
  return response
    .status(200)
    .json({});
};

export default onuserUpdated;
