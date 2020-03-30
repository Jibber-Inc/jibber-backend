import Parse from '../../providers/ParseProvider';
import createChatChannelService, { CreateChatChannelError } from '../../services/createChatChannelService';


describe('test createChatChannelService utility', () => {

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
      return createChatChannelService(...args)
        .catch(error => expect(error instanceof CreateChatChannelError)
          .toBe(true));
    }
  );
});
