import CommonSchema from './CommonSchema.js';
import ApiReturn from '../structure/ApiReturn.js';

class InterviewQuizSubmitSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        params.data.tableData.map((item) => (item['name'] = params.data.name));
        const returnData = await this.model.create(params.data.tableData);

        // quiz랑 제출 조인 비교, 맞는 것들 합산해서 점수 합산 후 점수 조회

        const schema = this.model;
        schema.aggregate([
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
                $group: {
                    _id: '$_id',
                    name: {$first: '$name'},
                    totalPoints: {$sum: '$quizData.point'} // point 필드를 합산
                }
            },
            {
                $project: {
                    _id: 0,
                    name: 1,
                    totalPoints: 1
                }
            }
        ]);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('삽입 성공');
        return apiReturn;
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
