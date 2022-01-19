import Parse from '../providers/ParseProvider';

/**
 * Creates a Notice object with the given data
 *
 * @param {*} data
 * @returns
 */
const createNotice = data => {
  const { type, body, attributes, priority, user } = data;

  const notice = new Parse.Object('Notice');

  notice.set('type', type);
  notice.set('body', body);
  notice.set('attributes', attributes);
  notice.set('priority', priority);
  notice.setACL(new Parse.ACL(user));
  notice.set('owner', user);

  notice.save(null, { useMasterKey: true });
  return notice;
};

const getNoticeByOwner = async (user) => {
  console.log('IIIIIII')
  const notice =  await new Parse.Query('Notice').equalTo('owner', user).first({ useMasterKey: true });
  console.log('PPPPPP', notice)
  return notice;
};

export default {
  createNotice,
  getNoticeByOwner
};
