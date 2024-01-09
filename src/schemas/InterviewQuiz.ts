import ApiReturn from '../structure/ApiReturn.js';
import CommonSchema from './CommonSchema.js';

class InterviewQuizSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async findAll(params: DBParamsType) {
        const option = params.option || '';
        const apiReturn = new ApiReturn();
        const projectQuery: any = {
            question: 1,
            choice: 1,
            passage: 1,
            answer: 1,
            point: 1,
            del: 1,
            type: '$interviewQuiz.text'
        };
        if (option !== 'a') delete projectQuery.answer;
        const returnData = await this.model.aggregate([
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
                $project: projectQuery
            },
            {
                $match: {
                    del: {
                        $ne: 'X'
                    }
                }
            }
        ]);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }

    async delete(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        const inputData = params.data;
        const id = inputData.tableData[0].id;
        const returnData = await this.model.findOneAndUpdate({_id: id}, {del: 'X'}, {new: true});

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('삭제 성공');
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
