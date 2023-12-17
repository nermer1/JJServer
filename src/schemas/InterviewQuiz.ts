import {CustomSchema} from './CustomSchema.js';

class InterviewQuizSchema extends CustomSchema {
    constructor(schemaName: string, options: {} = {}) {
        super(schemaName, options);
    }
}

/**
 * 면접 문제 제출 정의(객관식)
 *
 * 문제
 * 선택
 * 문제의 정답
 */

const InterviewQuiz = new InterviewQuizSchema('interviewQuiz', {
    question: {
        required: true,
        type: String
    },
    choice: {
        required: true,
        type: Array<string>
    },
    answer: {
        required: true,
        type: String
    }
});

export {InterviewQuiz};
