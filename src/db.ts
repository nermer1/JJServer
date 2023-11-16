import mongoose from 'mongoose';
import ServerProperty from './properties/ServerProperty.js';

export default {
    connect: () => {
        mongoose.set('strictQuery', false);
        mongoose
            .connect(ServerProperty.getDBHost(), {useNewUrlParser: true, useUnifiedTopology: true} as MongooseOption)
            .then(() => console.log('sucess'))
            .catch((e) => console.error(e));
        /* mongoose.connect(ServerProperty.getDBHost(), {
            'useNewUrlParser': true,
            'useUnifiedTopology': true
        });
        mongoose.connection.on('error', err => {
            console.error(err);
            console.log('connection error!!');
            process.exit();
        }); */
    },
    close: () => {
        mongoose.connection.close();
    }
};
