import Parse from '../../providers/ParseProvider';
import createChatChannel, { CreateChatChannelError } from '../../utils/createChatChannel';


describe('test createChatChannel utility', () => {

  const user = new Parse.User();

  test.each([
    [undefined, undefined, undefined],
    [user, 'friendlyName', undefined],
    [user, 0, 'uniqueName'],
    [user, undefined, 'uniqueName'],
    [undefined, 'friendlyName', 'uniqueName'],
    [{ id: '1234' }, 'friendlyName', 'uniqueName'],
  ])(
    'given arguments (%p, %p, %p) should throw CreateChatChannelError',
    async (...args) => {
      expect.assertions(1);
      return createChatChannel(...args)
        .catch(error => expect(error instanceof CreateChatChannelError)
          .toBe(true));
    }
  );
});
