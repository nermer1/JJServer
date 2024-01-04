import CommonSchema from './CommonSchema.js';

class InterviewQuizTypesSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

/**
 * 면접 문제 객관식 타입 지정
 *
 */

const InterviewQuizTypes = new InterviewQuizTypesSchema('interviewQuizTypes', {
    type: {
        unique: true,
        required: true,
        type: String
    },
    text: {
        required: true,
        type: String
    }
});

export {InterviewQuizTypes};
