import CommonQuery from './CommonQuery.js';

class InterviewQuizSubmitSchema extends CommonQuery {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }
}

/**
 * 면접자 문제 제출 정의
 * 이름 + 폰 4자리
 *
 */
const InterviewQuizSubmit = new InterviewQuizSubmitSchema('interviewQuizSubmit', {
    name: {
        required: true,
        unique: true,
        type: String
    },
    user_answer: {
        required: true,
        type: Array
    }
});

export {InterviewQuizSubmit};
