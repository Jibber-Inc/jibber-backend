import Parse from '../providers/ParseProvider';

/**
 * Creates a Circle object with the given data
 *
 * @param {*} data
 * @returns
 */
const createCircle = async user => {
  const circle = new Parse.Object('Circle');

  circle.set('users', []);
  circle.set('theme', 'eggplant');
  circle.set('name', 'Favorites');
  circle.set('invitedContacts', []);
  circle.setACL(new Parse.ACL(user));
  circle.set('owner', user);
  circle.set('limit', 10);

  await circle.save(null, { useMasterKey: true });
  
  return circle;
};

export default { createCircle };
