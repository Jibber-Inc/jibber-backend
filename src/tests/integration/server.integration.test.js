import http from 'http';


describe('test devserver', () => {

  it('should return 200 status code', async done => {
    expect.assertions(1);
    return http.get('http://127.0.0.1:1337/',
      response => {
        expect(response.statusCode).toBe(200);
        done();
      });
  });

});
