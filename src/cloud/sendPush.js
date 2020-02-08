

/**
 * Send a push notification
 * @param {Object} request
 */
const sendPush = async request => {

  // Build Query
  const query = new Parse.Query(Parse.Installation);
  query.equalTo('userId', request.userId);

  // Send push
  return Parse.Push
    .send(
      {
        where: query,
        data: {
          alert: 'Test'
        },
      }, { useMasterKey: true })
    .then(() => console.log('Push ok'),
      error => console.log('Push error', { error })
    );
};


export default sendPush;
