import generateHandle, { GenerateHandleError } from '../../utils/generateHandle';



describe('test creatHandle utility function', () => {

  /** case: invalid "givenName" property */
  it('should return error if missing "givenName" property in request body', () => {
    expect(() => generateHandle(undefined, 'Bar', 69))
      .toThrow(GenerateHandleError);
  });

  /** case: invalid "familyName" property */
  it('should return error if missing "familyName" property in request body', () => {
    expect(() => generateHandle('Foo', '', 69))
      .toThrow(GenerateHandleError);
  });

  /** case: invalid "position" property */
  it('should return error if missing "familyName" property in request body', () => {
    expect(() => generateHandle('Foo', 'Bar', undefined))
      .toThrow(GenerateHandleError);
  });

  /** case: valid body sent */
  it('should return result of generateHandle utility function', () => {
    expect(generateHandle('Foo', 'Bar', 69)).toBe('foob_69');
  });

});
