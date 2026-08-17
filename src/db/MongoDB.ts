import mongoose from 'mongoose';
import {basicProperty} from '../properties/ServerProperty.js';
import {stringUtil} from '../utils/Utils.js';
import BaseDB from './BaseDB.js';
import logger from '../utils/logger.js';

class MongoDB extends BaseDB {
    constructor() {
        super();
    }

    /**
     * 현재 native MongoDB 핸들을 반환한다. (mongoose.connection.db 의 단일 접근점)
     * ⚠️ 반드시 "호출 시점"에 부른다 — 모듈/필드 초기화 시점엔 아직 연결 전이라 undefined.
     *    연결 전이면 에러를 던진다(fail-loud). 우아한 처리가 필요하면 호출부에서 try/catch.
     */
    public static getDb(): NonNullable<typeof mongoose.connection.db> {
        const db = mongoose.connection.db;
        if (!db) throw new Error('[MongoDB] 아직 연결되지 않았습니다. connect() 이후에 호출하세요.');
        return db;
    }

    public async connect(): Promise<void> {
        const connectURL = stringUtil.format(basicProperty.db.host, {
            user: basicProperty.db.user,
            password: basicProperty.db.password
        });

        mongoose.set('strictQuery', false);
        mongoose
            .connect(connectURL)
            .then(() => {
                logger.info('db connect sucess');
            })
            .catch((e) => {
                console.error(e);
            });
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
