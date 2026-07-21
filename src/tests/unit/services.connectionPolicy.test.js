jest.mock('../../providers/ParseProvider', () => ({
  __esModule: true,
  default: {},
}));

const {
  beforeSaveConnection,
} = require('../../services/ConnectionService');

const connection = attributes => ({
  attributes: { ...attributes },
  dirtyKeys: () => Object.keys(attributes),
  get(field) {
    return this.attributes[field];
  },
  set(field, value) {
    this.attributes[field] = value;
  },
});

describe('Connection canonical identity policy', () => {
  const from = { id: 'from-user' };
  const to = { id: 'to-user' };

  test('derives canonical identity and rejects client poisoning', () => {
    const object = connection({ from, status: 'invited', to });
    beforeSaveConnection({ master: true, object });
    expect(object.get('canonicalKey')).toBe(
      'connection:from-user:to-user',
    );

    const poisoned = connection({
      canonicalKey: 'connection:other:pair',
      from,
      status: 'invited',
      to,
    });
    expect(() =>
      beforeSaveConnection({ object: poisoned }),
    ).toThrow('server-managed');
  });

  test('never promotes a declined connection', () => {
    const original = connection({ from, status: 'declined', to });
    const object = connection({ from, status: 'accepted', to });
    expect(() =>
      beforeSaveConnection({ master: true, object, original }),
    ).toThrow('cannot be reactivated');
  });
});
