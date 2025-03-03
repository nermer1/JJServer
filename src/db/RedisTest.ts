import {RedisClientType} from 'redis';
import DBFactory from '../factory/DBFactory.js';
import RedisDB from './RedisDB.js';

class RedisTest {
    private isConnected: boolean = false;
    public client: RedisClientType | null = null;
    private redis;

    constructor() {
        this.redis = DBFactory.createDB('redis');
        this.client = (this.redis as RedisDB).client;
    }

    public async connect(): Promise<void> {
        if (this.isConnected) {
            console.log('연결 되어 있음');
            return;
        }

        try {
            await this.redis.connect();
        } catch (error) {
            console.log('RedisDB 연결 실패:', error);
            this.isConnected = false;
            throw error;
        }
    }

    public async get(key: string): Promise<any> {
        if (!this.client) throw new Error('Redis client is not connected');

        try {
            return await this.client.get(key);
        } catch (error) {
            console.error('Redis get error:', error);
            throw error;
        }
    }

    public async set(key: string, value: string, option?: ObjAny): Promise<void> {
        if (!this.client) throw new Error('Redis client is not connected');
        await this.client.set(key, value, option);
    }
}

const redisTest = new RedisTest();

export default redisTest;
