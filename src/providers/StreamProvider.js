import { StreamChat } from 'stream-chat';

class StreamProvider {
  constructor() {
    // instantiate your stream client using the API key and secret 
    // the secret is only used server side and gives you full access to the API 
    this.client = StreamChat.getInstance('hvmd2mhxcres', '6bymtfbe6udf8aa3gsdp5r47ysz4cu8rvqnwc5r5cg9vtd898r3akzwxgjz5qfbq');
  }
}

export default new StreamProvider();
