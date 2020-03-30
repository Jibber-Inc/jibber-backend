// Services
import getConnectionsService from '../services/getConnectionsService';



const getConnections = async request => {
  return getConnectionsService(request.user);
};


export default getConnections;
