import ApiReturn from '../structure/ApiReturn.js';
import {CustomSchema} from './CustomSchema.js';

class InterviewQuizSchema extends CustomSchema {
    constructor(schemaName: string, options: {} = {}) {
        super(schemaName, options);
    }

    async getApiReturn(params: DBParamsType): Promise<ApiReturn> {
        const apiReturn = new ApiReturn();

        switch (params.type) {
            case 'C':
                //
                break;
            case 'R':
                const data = await this.findAll();
                apiReturn.put('data', data);
                apiReturn.setReturnMessage('이거 뜨냐');
                break;
            case 'U':
                //
                break;
            case 'D':
                //
                break;
            default:
                break;
        }
        return apiReturn;
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
    },
    passage: {
        type: String
    },
    type: {
        required: true,
        type: String
    },
    del: {
        type: String
    }
});

export {InterviewQuiz};
