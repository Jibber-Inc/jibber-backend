
/**
 * After save webhook for Connection objects.
 * @param {Object} request
 */
const connectionAfterSave = request => {
  const connection = request.object;
  console.log('connection saved:', connection.id);
};


export default connectionAfterSave;
