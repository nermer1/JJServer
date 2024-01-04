import CommonSchema from './CommonSchema.js';

class UserHostSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async getUserHost() {
        const userHost = this.model;
        return await userHost.aggregate([
            {
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
            }
        ]);
    }
}

const UserHost = new UserHostSchema('userHost', {
    USER_ID: {
        required: true,
        unique: true,
        type: String
    },
    USER_HOST: {
        required: true,
        type: String
    }
});

export {UserHost};
