import CommonQuery from './CommonQuery.js';

class interviewQuizTypesSchema extends CommonQuery {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

/**
 * 면접 문제 객관식 타입 지정
 *
 */

const InterviewQuizTypes = new interviewQuizTypesSchema('interviewQuizTypes', {
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
