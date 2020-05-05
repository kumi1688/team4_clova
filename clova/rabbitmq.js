const amqp = require('amqplib');

class RabbitmqWrapper {
    constructor(url, queueName, options) {
        this._url = url;
        this._queueName = queueName;
        this._options = options || {};

        // public
        this.channel = undefined;
        this.queue = undefined;
    }

    async setup() {
        const connect = await amqp.connect(this._url);
        const channel = await connect.createChannel();
        this.channel = channel;
    }

    async assertQueue() {
        const queue = await this.channel.assertQueue(this._queueName, {durable: false});
        this.queue = queue;
    }

    async sendToQueue(msg) {
        const sending = await this.channel.sendToQueue(this._queueName, this.encode(msg));
        return sending;
    }

    async recvFromQueue(type) {
        const message = await this.channel.get(this._queueName, {});
        if (message) {
            this.channel.ack(message);
            
            if(type === 'json'){
                return JSON.parse(message.content);
            }
            return message.content.toString();
        }
        else {
            return null;
        }
        return null;
    }

    encode(doc) {
        return Buffer.from(JSON.stringify(doc));
    }

    async sendMessage(value) {
        await this.setup();
        await this.assertQueue();
        await this.sendToQueue(value);
    }

    async recvMessage(type) {
        await this.setup();
        return await this.recvFromQueue(type);
    }
}

module.exports = RabbitmqWrapper;