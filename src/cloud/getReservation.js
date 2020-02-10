

// /**
//  * Query for reservation object
//  */
// const getReservation = async (request, response) => {
//   const reservationId = request.params.reservationId;

//   // Build query
//   const reservationQuery = Parse.Query(Parse.Reservation);

//   // Eventually this should query by code
//   // @todo enforce code column unique values in db
//   reservationQuery.equalTo('objectId', reservationId);

//   return reservationQuery
//     .first({ useMasterKey: true })
//     .then(async reservation => {
//       if (!!reservation) {

//         // If reservation already contains a user
//         if (reservation.has('user')) {

//           // Find the user
//           const userQuery = new Parse.Query(Parse.User);
//           userQuery.equalTo('objectId', reservation.user.objectId);

//           //Query for user
//           // const user = await userQuery.first({ useMasterKey: true });

//           // Send the code to the phone number
//         }

//         // If reservation has no user
//         // Return reservation in response
//       }

//       // If reservation not found
//       // add phone number to waitlist
//       // return Some status code for client

//     });
// };

// export default getReservation;
