import {RedisClientType} from 'redis';
import DBFactory from '../factory/DBFactory.js';

class RedisTest {
    private client: RedisClientType;
    private redis;

    constructor() {
        this.redis = DBFactory.createDB('redis');
        this.redis.connect();
        const client = this.redis.getClient();
        if (!client) throw new Error('Failed to get Redis client');
        this.client = client;
    }

    public async get(key: string): Promise<any> {
        return await this.client.get(key);
    }

    public async set(key: string, value: string): Promise<void> {
        await this.client.set(key, value);
    }
}

const redisTest = new RedisTest();

export default redisTest;
