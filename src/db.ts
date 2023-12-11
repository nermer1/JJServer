import mongoose from 'mongoose';
import {basicProperty} from './properties/ServerProperty.js';
import {stringUtil} from './utils/UnietangUtils.js';

export default {
    connect: () => {
        const connectURL = stringUtil.formatString(basicProperty.db.host, {
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
};
