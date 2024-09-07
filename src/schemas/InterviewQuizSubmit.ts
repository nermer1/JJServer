import CommonSchema from './CommonSchema.js';
import ApiReturn from '../structure/ApiReturn.js';
import DateUtils from '../utils/DateUtils.js';

class InterviewQuizSubmitSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async getUserSubmitData(option: ObjType) {
        const apiReturn = new ApiReturn();
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
                        },
                        {
                            $lookup: {
                                from: 'interviewQuizTypes',
                                localField: 'type',
                                foreignField: 'type',
                                as: 'quizType'
                            }
                        },
                        {
                            $unwind: '$quizType'
                        },
                        {
                            $addFields: {
                                type: '$quizType.text'
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
                $match: option
            },
            {
                $group: {
                    _id: '$_id',
                    startTime: {$first: '$startTime'},
                    endTime: {$first: '$endTime'},
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
                    totalScore: 1,
                    startTime: 1,
                    endTime: 1
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
        return await this.getUserSubmitData({name: params.data.name});
    }

    async findAll(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        params = params || {};
        const option = params.option || {};
        return await this.getUserSubmitData(option);
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
    },
    startTime: {type: String, default: Date.now, set: (value: Date) => DateUtils.formatDate(value, 'yyyy-MM-dd hh:mm:dd').replace(/\d{2}:\d{2}$/, '00:00')},
    endTime: {type: String, default: Date.now, set: (value: Date) => DateUtils.formatDate(value, 'yyyy-MM-dd hh:mm:dd')}
});

export {InterviewQuizSubmit};
