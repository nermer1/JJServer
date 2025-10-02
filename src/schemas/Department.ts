import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class DepartmentSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const Department = new DepartmentSchema('department', {
    code: {
        type: String,
        required: [true, '부서 코드는 필수입니다.'],
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, '부서 이름은 필수입니다.'],
        trim: true
    },
    parent_id: {
        type: Schema.Types.ObjectId,
        ref: 'department',
        default: null
    },
    parent_code: {
        type: String,
        default: null
    }
});

export {Department};
