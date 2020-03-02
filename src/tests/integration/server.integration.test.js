import http from 'http';
import axios from 'axios';
import { rest_headers } from '../../utils/headers';

describe('test devserver', () => {

  it('should return 200 status code', async done => {
    expect.assertions(1);
    return http.get('http://127.0.0.1:1337/',
      response => {
        expect(response.statusCode).toBe(200);
        done();
      });
  });

  it('cloud hello function should return 200 status code', async done => {
    expect.assertions(1);
    const url = `${process.env.SERVER_URL}/functions/hello`;
    axios.post(url, null, { headers: rest_headers })
      .then(response => {
        expect(response.status).toBe(200);
        done();
      });
  });

});
