import {createClient, RedisClientType} from 'redis';
import {basicProperty} from '../properties/ServerProperty.js';
import BaseDB from './BaseDB.js';

class RedisDB extends BaseDB {
    private client: RedisClientType;

    constructor() {
        super();
        console.log('와우');
        this.client = createClient({url: `redis://192.168.11.17:6379`});
    }

    public async connect(): Promise<void> {
        await this.client.connect();
    }

    public async close(): Promise<void> {
        await this.client.quit();
    }

    public getClient(): RedisClientType {
        return this.client;
    }
}

export default RedisDB;
