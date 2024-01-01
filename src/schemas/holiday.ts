import CommonQuery from './CommonQuery.js';

class HolidaySchema extends CommonQuery {
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
