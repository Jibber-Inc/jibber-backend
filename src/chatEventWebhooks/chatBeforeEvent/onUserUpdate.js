/**
 * UserSid - string, SID - The SID of the User about to be updated
 * EventType - string - Always onUserUpdate
 * Identity - string - The Identity of the User being updated
 * FriendlyName - string, optional
 *              - The optional (if set) FriendlyName of the User being updated
 * RoleSid - string - The Role SID the user being updated
 * DateCreated - string, ISO8601 time
 *             - The date and time of initial User creation
 * DateUpdated - string, ISO8601 time
 *             - The date and time the user was last updated
 * Attributes - JSON, string, optional
 *            - The optional Attributes (if set) of the User being updated as a
 *              JSON structure in string format.
 * IsOnline - boolean, optional
 *          - true if the user has an active session and can create and receive
 *            real-time events. This field is present only if the Reachability
 *            Indicator feature is enabled for the Service instance.
 * IsNotifiable - boolean, optional
 *              - true if the user has an active session and can create and
 *                receive push notifications. This field is present only if the
 *                Reachability Indicator and Push Notifications features are
 *                enabled for the Service instance. The User must have at least
 *                one Push Notification registration for Chat.
 */
const onUserUpdate = (request, response) => response.status(200).json({});

export default onUserUpdate;
