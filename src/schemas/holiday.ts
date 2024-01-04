import CommonSchema from './CommonSchema.js';

class HolidaySchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const Holiday = new HolidaySchema('holiday', {
    title: {
        required: true,
        type: String
    },
    start: {
        required: true,
        type: String
    },
    end: {
        required: true,
        type: String
    },
    type: {
        required: true,
        type: String,
        default: 'H'
    }
});

export {Holiday};
