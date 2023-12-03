import mongoose from 'mongoose';
import {basicProperty} from './properties/ServerProperty.js';

export default {
    connect: () => {
        mongoose.set('strictQuery', false);
        mongoose
            .connect(basicProperty.db.host, {useNewUrlParser: true, useUnifiedTopology: true} as MongooseOption)
            .then(() => console.log('sucess'))
            .catch((e) => console.error(e));
    },
    close: () => {
        mongoose.connection.close();
    }
};
