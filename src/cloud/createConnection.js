
/**
 * Create a connection
 * @param {*} request
 * @param {*} response
 */
const createConnection = (request, response) => {

    let phoneNumber = request.params.phoneNumber;

     // Phone number is required in request body
    if (!phoneNumber) {
        throw new Error('No phone number provided in request');
    }

    // Strip phone number
    phoneNumber = stripPhoneNumber(phoneNumber);

    // Build query to find user with phoneNumber
    const userQuery = new Parse.Query(Parse.User);
    userQuery.equalTo('phoneNumber', phoneNumber);

    // Query for user
    let user = await userQuery.first({ useMasterKey: true })

    if (user) {
        // Determine if the user already has a connection with the requesting user
        const connectionQuery = new Parse.Query(Parse.Connection)
        connectionQuery.equalTo('to', user)
        connectionQuery.equalTo('from', request.user)

        let connection = await connectionQuery.first({ useMasterKey: true })

        // If there is a connection, return it
        if (connection) {
            return connection
        } 
        // Otherwise create a connection between the users and set the status to invited
        else {
            const newConnection = new Parse.Connection();
            newConnection.set('to', user)
            newConnection.set('from', request.user)
            newConnection.set('phoneNumber', phoneNumber)
            newConnection.set('status', 'invited')
            newConnection.save()
            .then((savedConneciton) => {
                request.user.addUnique(newConnection, 'connections')
                request.user.save()
                .then((updatedUser) => {
                    return savedConneciton
                }, (error) => {
                    return error
                })
            }, (error) => {
                return error
            });
        }
    } else {
        // Determine if their is already a connection with the given phoneNumber for the requesting user
        const connectionQuery = new Parse.Query(Parse.Connection)
        connectionQuery.equalTo('phoneNumber', phoneNumber)
        connectionQuery.equalTo('from', request.user)

        let connection = await connectionQuery.first({ useMasterKey: true })
        
        // If there is a connection, return it
        if (connection) {
            return connection
        } 
        // Otherwise create a connection with the sender and phoneNumber 
        else {
            const newConnection = new Parse.Connection();
            newConnection.set('from', request.user)
            newConnection.set('phoneNumber', phoneNumber)
            newConnection.set('status', 'invited')
            newConnection.save()
            .then((savedConneciton) => {
                request.user.addUnique(newConnection, 'connections')
                request.user.save()
                .then((updatedUser) => {
                    return savedConneciton
                }, (error) => {
                    return error
                })
            }, (error) => {
                return error
            });
        }
    }
  };
  
  
  export default updateConnection;
