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
                    localField: 'userId',
                    foreignField: 'userId',
                    as: 'user_info'
                }
            },
            {
                $unwind: '$user_info' // 배열을 풀어줌
            },
            {
                $project: {
                    userID: 1,
                    name: '$user_info.name' // users 컬렉션에서 가져온 nickname 필드
                }
            }
        ]);
    }
}

const UserHost = new UserHostSchema('userHost', {
    userId: {
        required: true,
        unique: true,
        type: String
    },
    hostname: {
        required: true,
        type: String
    }
});

export {UserHost};
