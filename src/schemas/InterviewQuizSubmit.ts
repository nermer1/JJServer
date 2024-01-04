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
            /* {
                $lookup: {
                    from: 'users', // 조인할 컬렉션명
                    localField: 'USER_ID',
                    foreignField: 'USER_ID',
                    as: 'user_info'
                }
            },
            {
                $unwind: '$user_info' // 배열을 풀어줌
            },
            {
                $project: {
                    USER_HOST: 1,
                    USER_NAME: '$user_info.USER_NAME' // users 컬렉션에서 가져온 nickname 필드
                }
            } */
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
