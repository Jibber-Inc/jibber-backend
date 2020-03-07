import Parse from '../../providers/ParseProvider';
import createHandle from '../../utils/createHandle';


describe('createHandle endpoint', () => {

  /** case: invalid "givenName" property */
  it('should return error if missing "givenName" property in request body', async done => {
    expect.assertions(2);
    const body = {
      givenName: null,
      familyName: 'Bar',
      position: 69,
    };
    return Parse.Cloud
      .run('createHandle', body)
      .catch(error => {
        expect(error.message)
          .toBe('[z0Enn6c2] "givenName" in request body is invalid, expected string');
        expect(error.code).toBe(141);
        done();
      });
  });

  /** case: invalid "familyName" property */
  it('should return error if missing "familyName" property in request body', async done => {
    expect.assertions(2);
    const body = {
      givenName: 'Foo',
      familyName: '',
      position: 69,
    };
    return Parse.Cloud
      .run('createHandle', body)
      .catch(error => {
        expect(error.message)
          .toBe('[2UaA/dx7] "familyName" in request body is invalid, expected string');
        expect(error.code).toBe(141);
        done();
      });
  });

  /** case: invalid "position" property */
  it('should return error if missing "familyName" property in request body', async done => {
    expect.assertions(2);
    const body = {
      givenName: 'Foo',
      familyName: 'Bar',
    };
    return Parse.Cloud
      .run('createHandle', body)
      .catch(error => {
        expect(error.message)
          .toBe('[Pin00mDK] "position" in request body is invalid, expected number');
        expect(error.code).toBe(141);
        done();
      });
  });

  /** case: valid body sent */
  it('should return result of createHandle utility function', async done => {
    expect.assertions(1);
    const givenName = 'Foo';
    const familyName = 'Bar';
    const position = 69;
    const body = {
      givenName,
      familyName,
      position,
    };
    return Parse.Cloud
      .run('createHandle', body)
      .then(response => {
        expect(response).toBe(createHandle(givenName, familyName, position));
        done();
      });
  });
});
