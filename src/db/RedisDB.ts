import {createClient, RedisClientType} from 'redis';
import {basicProperty} from '../properties/ServerProperty.js';
import BaseDB from './BaseDB.js';
import logger from '../utils/logger.js';

class RedisDB extends BaseDB {
    public client: RedisClientType;

    constructor() {
        super();
        this.client = createClient({
            url: basicProperty.redis.url,
            database: basicProperty.redis.database
        });

        this.client.on('error', (err) => {
            console.error(err);
        });
    }

    public async connect(): Promise<void> {
        if (!this.client.isOpen) {
            try {
                await this.client.connect();
                logger.info('RedisDB 연결 성공');
            } catch (error) {
                logger.error('RedisDB 연결 실패:', {err: error});
                throw error;
            }
        }
    }

    public async close(): Promise<void> {
        if (this.client.isOpen) {
            try {
                await this.client.quit();
                logger.info('Redis 연결 종료');
            } catch (error) {
                logger.error('RedisDB 연결 종료 실패:', {err: error});
            }
        }
    }
}

export default RedisDB;
