

/**
 * Update a connection
 * @param {*} request
 * @param {*} response
 */
const updateConnection = (request, response) => {

  Parse.Cloud.useMasterKey();

  const connectionID = request.params.connectionID;

  // Build query
  const query = new Parse.Query('Connection');

  //get the connection object
  return query
    .get(connectionID)
    .then(connection => {

      //get the user the request was from
      const fromUser = connection.get('from');

      //get the user the request is to
      const toUser = connection.get('to');

      //add the user the request was to (the accepting user) to the fromUsers friends
      fromUser.relation('connections').add(toUser);

      //save the fromUser
      return fromUser
        .save()
        .then(() => {
          //saved the user, now edit the request status and save it
          connection.set('status', request.params.status);
          return connection
            .save()
            .then(connection => response.success(`saved relation and updated the connection ${ connection.get('id') }`))
            .catch(error => response.error(error));
        })
        .catch(error => response.error(error));
    })
    .catch(error => response.error(error));
};


export default updateConnection;
