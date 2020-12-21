// Services
import ConnectionService from '../services/ConnectionService';

const getConnections = async (request) => {
  const { user } = request;
  return ConnectionService.getConnections(user);
};

export default getConnections;
