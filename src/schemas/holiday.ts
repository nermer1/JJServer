import mongoose, {Schema} from 'mongoose';

const HolidaySchema = new Schema({
    title: {
        required: true,
        type: String
    },
    start: {
        required: true,
        type: Date
    },
    end: {
        required: true,
        type: Date
    }
});

export default mongoose.model('users', HolidaySchema);
