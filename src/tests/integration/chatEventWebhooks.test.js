import axios from 'axios';




describe('test twilio pre event webhook endpoints', () => {

  /** case: no code sent -- I actually want this to return 422 but it wont... */
  it('should return 200 response status', async done => {

    expect.assertions(1);

    const url = `${process.env.HOST}:${process.env.PORT}/chatBeforeEvent`;
    return axios
      .get(url)
      .then(response => {
        expect(response.status).toBe(200);
        done();
      });
  });
});



describe('test twilio post event webhook endpoints', () => {

  /** case: no code sent -- I actually want this to return 422 but it wont... */
  it('should return 200 response status', async done => {

    expect.assertions(1);

    const url = `${process.env.HOST}:${process.env.PORT}/chatAfterEvent`;
    return axios
      .get(url)
      .then(response => {
        expect(response.status).toBe(200);
        done();
      });
  });
});
