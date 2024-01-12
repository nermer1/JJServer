import CommonSchema from './CommonSchema.js';
import ApiReturn from '../structure/ApiReturn.js';

class InterviewQuizSubmitSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async getUserSubmitData(findName: string = '') {
        const apiReturn = new ApiReturn();
        const userAllQuery = findName ? {name: findName} : {};
        const returnData = await this.model.aggregate([
            {
                $unwind: '$answer'
            },
            {
                $lookup: {
                    from: 'interviewQuiz',
                    let: {answerKey: '$answer.key'},
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$_id', {$toObjectId: '$$answerKey'}]
                                }
                            }
                        }
                    ],
                    as: 'quizData'
                }
            },
            {
                $unwind: '$quizData'
            },
            {
                $match: userAllQuery
            },
            {
                $group: {
                    _id: '$_id',
                    name: {$first: '$name'},
                    totalScore: {$sum: '$quizData.point'},
                    score: {
                        $sum: {
                            $cond: [{$eq: ['$quizData.answer', '$answer.value']}, '$quizData.point', 0]
                        }
                    },
                    quizData: {
                        $push: {
                            $cond: {
                                if: {$ne: ['$quizData.answer', '$answer.value']},
                                then: {
                                    $mergeObjects: ['$quizData', {user_answer: '$answer.value'}]
                                },
                                else: '$$REMOVE'
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    quizData: 1,
                    name: 1,
                    score: 1,
                    totalScore: 1
                }
            }
        ]);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('호출 성공');
        return apiReturn;
    }

    async insert(params: DBParamsType) {
        await this.model.create({
            name: params.data.name,
            answer: params.data.tableData
        });
        return await this.getUserSubmitData(params.data.name);
    }

    async findAll(params?: DBParamsType) {
        const apiReturn = new ApiReturn();
        let findUserName;
        try {
            findUserName = params?.data.name;
        } catch (e) {
            findUserName = '';
        }
        return await this.getUserSubmitData(findUserName);
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
    answer: {
        required: true,
        type: Array
    }
});

export {InterviewQuizSubmit};
