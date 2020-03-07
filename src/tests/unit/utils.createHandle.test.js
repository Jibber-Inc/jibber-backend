import createHandle, { CreateHandleError } from '../../utils/createHandle';



describe('test creatHandle utility function', () => {

  /** case: invalid "givenName" property */
  it('should return error if missing "givenName" property in request body', () => {
    expect(() => createHandle(undefined, 'Bar', 69))
      .toThrow(CreateHandleError);
  });

  /** case: invalid "familyName" property */
  it('should return error if missing "familyName" property in request body', () => {
    expect(() => createHandle('Foo', '', 69))
      .toThrow(CreateHandleError);
  });

  /** case: invalid "position" property */
  it('should return error if missing "familyName" property in request body', () => {
    expect(() => createHandle('Foo', 'Bar', undefined))
      .toThrow(CreateHandleError);
  });

  /** case: valid body sent */
  it('should return result of createHandle utility function', () => {
    expect(createHandle('Foo', 'Bar', 69)).toBe('foob_69');
  });

});
