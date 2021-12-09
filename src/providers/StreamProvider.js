import { StreamChat } from 'stream-chat';

class StreamProvider {
  constructor() {
    // Load environment variables
    const { STREAM_KEY, STREAM_SECRET } = process.env;
    // instantiate your stream client using the API key and secret
    // the secret is only used server side and gives you full access to the API
    this.client = StreamChat.getInstance(STREAM_KEY, STREAM_SECRET);

    // Create the wrappers for the "Channels" to use Conversation instead
    this.client.queryConversations = this.client.queryChannels;
    this.client.conversation = this.client.channel;
  }
}

export default new StreamProvider();
