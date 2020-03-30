import ExtendableError from 'extendable-error-class';

import Parse from '../providers/ParseProvider';


class GetConnectionsServiceError extends ExtendableError {}


/**
 * Return any Connection objects where the "to" or "from" user is the given user
 * @param {Parse.User} user
 * @returns {Object}
 */
const getConnectionsService = async user => {

  if (!Boolean(user instanceof Parse.User)) {
    throw new GetConnectionsServiceError(
      '[29heIw2r] Expected Parse.User'
    );
  }

  // Get Connection schema
  const Connection = Parse.Object.extend('Connection');

  // Query for connections to the user
  const toQuery = new Parse.Query(Connection);
  toQuery.equalTo('to', user);

  // Query for connections from the user
  const fromQuery = new Parse.Query(Connection);
  fromQuery.equalTo('from', user);

  return {
    incoming: await toQuery.find(),
    outgoing: await fromQuery.find(),
  };
};


export default getConnectionsService;
