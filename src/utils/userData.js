const getFullName = user => {
  const fullName = `${user.get('givenName')} ${user.get('familyName')}`;
  return fullName;
};

export default {
  getFullName,
};
