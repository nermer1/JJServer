import mongoose, {Schema} from 'mongoose';

const UserSchema = new Schema({
    USER_NAME: {
        required: true,
        type: String
    },
    USER_BIRTH: {
        required: true,
        type: Date
    },
    USER_HOSTNAME: {
        unique: true,
        type: String
    },
    USER_ID: {
        required: true,
        type: String
    },
    USER_IDX: {
        required: true,
        unique: true,
        type: Number
    },
    USER_JOINUS: {
        type: Date
    },
    USER_MAIL: {
        required: true,
        unique: true,
        type: String
    },
    USER_NICKNAME: {
        unique: true,
        type: String
    },
    USER_PHONE: {
        required: true,
        unique: true,
        type: String
    },
    USER_POSISTION: {
        required: true,
        type: String
    },
    USER_ROLE: {
        required: true,
        type: String,
        default: 'basic'
    }
});

export default mongoose.model('users', UserSchema);
