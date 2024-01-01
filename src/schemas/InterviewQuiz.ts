import ApiReturn from '../structure/ApiReturn.js';
import CommonQuery from './CommonQuery.js';

class InterviewQuizSchema extends CommonQuery {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async getApiReturn(params: DBParamsType): Promise<ApiReturn> {
        const apiReturn = new ApiReturn();

        switch (params.type) {
            case 'C':
                //
                break;
            case 'R':
                const data = await this.model.aggregate([
                    {
                        $lookup: {
                            from: 'interviewQuizTypes',
                            localField: 'type',
                            foreignField: 'type',
                            as: 'interviewQuiz'
                        }
                    },
                    {
                        $unwind: '$interviewQuiz'
                    },
                    {
                        $project: {
                            del: 1,
                            question: 1,
                            choice: 1,
                            passage: 1,
                            point: 1,
                            type: '$interviewQuiz.text'
                        }
                    },
                    {
                        $match: {
                            del: {
                                $ne: 'X'
                            }
                        }
                    }
                ]);
                apiReturn.put('data', data);
                apiReturn.setReturnMessage('호출 성공');
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
    point: {
        required: true,
        type: Number
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
