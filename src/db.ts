import mongoose from 'mongoose';
import {basicProperty} from './properties/ServerProperty.js';
import {jjUtil} from './utils/JJUtils.js';

export default {
    connect: () => {
        const connectURL = jjUtil.stringUtil.formatString(basicProperty.db.host, {
            user: basicProperty.db.user,
            password: basicProperty.db.password
        });

        mongoose.set('strictQuery', false);
        mongoose
            .connect(connectURL, {useNewUrlParser: true, useUnifiedTopology: true} as MongooseOption)
            .then(() => console.log('sucess'))
            .catch((e) => console.error(e));
    },
    close: () => {
        mongoose.connection.close();
    }
};
