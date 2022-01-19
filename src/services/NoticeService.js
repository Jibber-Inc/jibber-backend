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

const getNoticeByACL = async (user) => {
  console.log('******** USER ID***')
 
  const notice = await new Parse.Query('Notice').equalTo('ACL', new Parse.ACL(user)).first();
  console.log('******** NOTICE ', notice)
  return notice;
};

export default {
  createNotice,
  getNoticeByACL
};
