

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
    .get(connectionID,
      {
        success: connection => {

          //get the user the request was from
          const fromUser = connection.get('from');

          //get the user the request is to
          const toUser = connection.get('to');

          //add the user the request was to (the accepting user) to the fromUsers friends
          fromUser.relation('connections').add(toUser);

          //save the fromUser
          return fromUser
            .save(null,
              {
                success: () => {

                  //saved the user, now edit the request status and save it
                  connection.set('status', request.params.status);
                  return connection
                    .save(null,
                      {
                        success: () => response.success('saved relation and updated the connection'),
                        error: error => response.error(error),
                      });
                },
                error: error => response.error(error)
              });
        },
        error: error => response.error(error)
      });
};


export default updateConnection;
