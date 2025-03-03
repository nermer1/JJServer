import {createClient, RedisClientType} from 'redis';
import {basicProperty} from '../properties/ServerProperty.js';
import BaseDB from './BaseDB.js';

class RedisDB extends BaseDB {
    public client: RedisClientType;

    constructor() {
        super();
        this.client = createClient({url: `redis://192.168.11.17:6379`});

        this.client.on('error', (err) => {
            console.error(err);
        });
    }

    public async connect(): Promise<void> {
        if (!this.client.isOpen) {
            try {
                await this.client.connect();
                console.log('RedisDB 연결 성공');
            } catch (error) {
                console.error('RedisDB 연결 실패:', error);
                throw error;
            }
        }
    }

    public async close(): Promise<void> {
        if (this.client.isOpen) {
            try {
                await this.client.quit();
                console.log('Redis 연결 종료');
            } catch (error) {
                console.error('Redis 연결 종료 실패:', error);
            }
        }
    }
}

export default RedisDB;
