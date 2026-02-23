import CommonSchema from './CommonSchema.js';
import {validatorUtil as validator, objectUtil} from '../utils/Utils.js';
import ApiReturn from '../structure/ApiReturn.js';
import {CustomerEtc} from './customerEtc.js';
import mongoose from 'mongoose';
import {flatten} from 'flat';

class CustomerSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType): Promise<ApiReturn> {
        let apiReturn = new ApiReturn();
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const returnData = await this.model.create(params.data.tableData, {session});
            const etcData = params.data.tableData[0].etc;
            etcData._id = returnData[0]._id;
            etcData.code = returnData[0].code;
            await CustomerEtc.model.create([etcData], {session});

            const findParams: DBParamsType = {
                option: {_id: returnData[0]._id},
                data: {
                    tableData: []
                }
            };

            apiReturn = await this.findAll(findParams);
            apiReturn.setReturnMessage('생성 성공');
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            console.error(error);
            apiReturn.setReturnMessage('생성 실패');
        } finally {
            session.endSession();
        }
        return apiReturn;
    }

    async update(params: DBParamsType): Promise<ApiReturn> {
        let apiReturn = new ApiReturn();
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const inputData = params.data.tableData[0];
            const etcData = inputData.etc;
            const dataId = inputData._id;
            etcData._id = dataId;
            etcData.code = inputData.code;

            await this.model.findOneAndUpdate({_id: dataId}, flatten(inputData, {safe: true}), {new: true, session});
            const returnData = await CustomerEtc.model.findOneAndUpdate({_id: dataId}, etcData, {new: true, session, runValidators: true});

            const findParams: DBParamsType = {
                option: {_id: returnData?._id},
                data: {
                    tableData: []
                }
            };

            apiReturn = await this.findAll(findParams);
            apiReturn.setReturnMessage('업데이트 성공');
            await session.commitTransaction();
        } catch (error: any) {
            await session.abortTransaction();
            console.error(error);
            apiReturn.setReturnMessage('업데이트 실패');
            apiReturn.setReturnErrorMessage(error.message);
        } finally {
            session.endSession();
        }
        return apiReturn;
    }

    async delete(params: DBParamsType): Promise<ApiReturn> {
        const apiReturn = new ApiReturn();
        const inputData = params.data.tableData[0];
        await this.model.findByIdAndDelete(inputData._id);
        const returnData = await CustomerEtc.delete(params);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('삭제 성공');
        return apiReturn;
    }

    async getOptList(params: DBParamsType): Promise<ApiReturn> {
        const apiReturn = new ApiReturn();
        const customerData = (await this.findAll(params)).getTableData();

        const returnData = customerData.reduce<ObjAny>((arr, data) => {
            const otpArr = data.etc.otp;
            const googleOtps = otpArr.filter((otps: any) => otps.type === 'google');
            if (googleOtps.length > 0) {
                arr.push({
                    otp: googleOtps,
                    customer: {
                        code: data.code,
                        text: data.text
                    }
                });
            }
            return arr;
        }, []);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }

    async findAll(params: DBParamsType) {
        params = params || {};
        const option = params.option || {};
        const apiReturn = new ApiReturn();

        const returnData = await this.model.aggregate([
            {
                $match: option
            },
            {
                $lookup: {
                    from: 'customerEtc',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'customerEtc'
                }
            },
            {
                $unwind: {
                    path: '$customerEtc',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    etc: '$customerEtc'
                }
            },
            {
                $project: {'etc._id': 0, customerEtc: 0}
            }
        ]);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }
}

/**
 * team: 1~4팀
 * code: 업체 식별자
 * text: 업체명
 * type: 타입1 운영유지보수, 타입2 하자유지보수, 타입3 계약기간동안 운영유지보수
 */

const CustomerList = new CustomerSchema('customer', {
    team: {
        type: String
    },
    code: {
        unique: true,
        required: true,
        type: String
    },
    text: {
        required: true,
        type: String
    },
    type: {
        required: true,
        type: String,
        enum: ['M', 'S', 'R', '']
    },
    ssh: {
        type: String
    }
});

export {CustomerList};
