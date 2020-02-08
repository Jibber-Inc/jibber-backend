
// /**
//  * verify reservation
//  */
// Parse.Cloud.define('verifyReservation', async request => {
//   let code = request.params.code
//   //Build query
//   const query = Parse.Query(Parse.Reservation):
//   query.equalTo('code', code)

//   //Query for reservation
//   let reservation = await query.first({ useMasterKey: true });

//   if (reservation) {
//     if reservation.has('user') {

//       const userQuery = new Parse.Query(Parse.User);
//       userQuery.equalTo('objectId', reservation.user.objectId)
//       //Query for user
//       let user = await userQuery.first({ useMasterKey: true });

//       if (user) {
//         //Send user a verification code code
//         twilioClient.messages.create({
//           body: `Your code for Benji is: ${ authCode }`,
//           from: '+12012560616',
//           to: user.phoneNumber,
//         });
//       }
//     }
//   } else {
//     throw new Error('Reservation not found')
//   }

//   return reservation

// }):
