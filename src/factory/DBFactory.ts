import MongoDB from '../db/MongoDB.js';
import RedisDB from '../db/RedisDB.js';

class DBFactory {
    static createDB(type: string) {
        switch (type) {
            case 'mongo':
                return new MongoDB();
            case 'redis':
                return new RedisDB();
            default:
                throw new Error('Invalid type');
        }
    }
}

export default DBFactory;
