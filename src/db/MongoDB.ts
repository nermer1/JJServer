import mongoose from 'mongoose';
import {basicProperty} from '../properties/ServerProperty.js';
import {stringUtil} from '../utils/UnietangUtils.js';
import BaseDB from './BaseDB.js';

class MongoDB extends BaseDB {
    constructor() {
        super();
    }
    public async connect(): Promise<void> {
        const connectURL = stringUtil.format(basicProperty.db.host, {
            user: basicProperty.db.user,
            password: basicProperty.db.password
        });

        mongoose.set('strictQuery', false);
        mongoose
            .connect(connectURL, {useNewUrlParser: true, useUnifiedTopology: true} as MongooseOption)
            .then(() => console.log('db connect sucess'))
            .catch((e) => console.error(e));
    }

    public getClient() {
        throw new Error('Method not implemented.');
    }

    public async close(): Promise<void> {
        mongoose.connection.close();
    }
}

export default MongoDB;

/* export default {
    connect: () => {
        const connectURL = stringUtil.format(basicProperty.db.host, {
            user: basicProperty.db.user,
            password: basicProperty.db.password
        });

        mongoose.set('strictQuery', false);
        mongoose
            .connect(connectURL, {useNewUrlParser: true, useUnifiedTopology: true} as MongooseOption)
            .then(() => console.log('db connect sucess'))
            .catch((e) => console.error(e));
    },
    close: () => {
        mongoose.connection.close();
    }
}; */
