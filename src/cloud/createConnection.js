import stripPhoneNumber from "../utils/stripPhoneNumber";

/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createConnection = async (request, response) => {
  // The target users phone number
  let fromUser = request.user;
  let phoneNumber = request.params.phoneNumber;

  // Phone number is required in request body
  if (!phoneNumber) {
    throw new Error("No phone number provided in request");
  }

  const Connection = Parse.Object.extend("Connection");

  // Strip phone number
  phoneNumber = stripPhoneNumber(phoneNumber);

  // Build query to find user with phoneNumber
  const userQuery = new Parse.Query(Parse.User);
  userQuery.equalTo("phoneNumber", phoneNumber);

  // Query for user
  let targetUser = await userQuery.first({ useMasterKey: true });

  // If target user found
  if (!!targetUser) {
    // Determine if the user already has a connection with the requesting user
    const connectionQuery = new Parse.Query(Connection);
    connectionQuery.equalTo("to", targetUser);
    connectionQuery.equalTo("from", fromUser);

    let connection = await connectionQuery.first({ useMasterKey: true });

    // If there is a connection, return it
    if (!!connection) {
      return connection;
    }

    // Otherwise create a connection between the users and set the status to invited
    const newConnection = new Connection();
    newConnection.set("to", targetUser);
    newConnection.set("from", fromUser);
    newConnection.set("phoneNumber", phoneNumber);
    newConnection.set("status", "invited");

    return newConnection
      .save()
      .then(savedConnection => {
        // add the new connection to user making the request
        fromUser.addUnique(newConnection, "connections");

        return fromUser
          .save()
          .then(updatedFromUser => {
            console.log(
              `[createConnection] Saved a new connection [${newConnection.get(
                "id"
              )}] to user [${updatedFromUser.get("id")}]`
            );
            return savedConnection;
          })
          .catch(error => response.error(error));
      })
      .catch(error => response.error(error));
  }

  // If no target user found
  // Determine if their is already a connection with the given phoneNumber for the requesting user
  const connectionQuery = new Parse.Query(Connection);
  connectionQuery.equalTo("phoneNumber", phoneNumber);
  connectionQuery.equalTo("from", fromUser);

  let connection = await connectionQuery.first({ useMasterKey: true });

  // If there is a connection, return it
  if (!!connection) {
    return connection;
  }

  // Otherwise create a connection with the sender and phoneNumber
  const newConnection = new Connection();
  newConnection.set("from", fromUser);
  newConnection.set("phoneNumber", phoneNumber);
  newConnection.set("status", "invited");

  return newConnection
    .save()
    .then(savedConnection => {
      fromUser.addUnique(newConnection, "connections");
      return fromUser
        .save()
        .then(updatedFromUser => {
          console.log(
            `[createConnection] Saved a new connection: ${savedConnection.get(
              "id"
            )} to user: ${updatedFromUser.get("id")}`
          );
          return savedConnection;
        })
        .catch(error => response.error(error));
    })
    .catch(error => response.error(error));
};

export default createConnection;
