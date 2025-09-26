import CommonSchema from './CommonSchema.js';
import {Schema} from 'mongoose';

class DepartmentSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

const schema = new Schema({
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
    }
});

schema.add({children: [schema]});

const Department = new DepartmentSchema('department', schema);

export {Department};
