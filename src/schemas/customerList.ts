import CommonSchema from './CommonSchema.js';
import {validatorUtil as validator, objectUtil} from '../utils/Utils.js';
import ApiReturn from '../structure/ApiReturn.js';
import {CustomerEtc} from './customerEtc.js';
import mongoose, {Schema} from 'mongoose';
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
            const option = params.option || {};
            let dataToInsert = params.data.tableData;

            // 미들웨어에서 권한 제한(department_ids)이 넘어온 경우, 프론트가 보낸 데이터 검증
            if (option.department_ids) {
                const reqDeptId = option.department_ids.toString();
                const items = Array.isArray(dataToInsert) ? dataToInsert : [dataToInsert];

                for (const item of items) {
                    const depts = item.department_ids;
                    if (!depts || !Array.isArray(depts)) {
                        throw new Error('소속 부서 ID(department_ids)를 배열 형태로 포함해야 합니다.');
                    }
                    if (!depts.some((d: any) => d?.toString() === reqDeptId)) {
                        throw new Error('생성 권한이 없습니다. 본인 소속 부서 ID를 반드시 포함하여 생성해야 합니다.');
                    }
                }
            }

            const returnData = await this.model.create(dataToInsert, {session});
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
            const option = params.option || {}; // 권한 우회 방지용 옵션

            etcData._id = dataId;
            etcData.code = inputData.code;

            // 미들웨어가 주입한 option 조건 병합
            const query = {_id: dataId, ...option};

            // _id와 etc 필드를 제거한 뒤 업데이트용 객체 생성
            const updateData = {...inputData};
            delete updateData._id;
            delete updateData.etc;

            // 기존 코드에 있던 취약점 수정: _id 뿐만 아니라 권한 조건(query)도 검사
            const returnData = await this.model.findOneAndUpdate(query, flatten(updateData, {safe: true}), {new: true, session});

            if (!returnData) {
                throw new Error('업데이트할 데이터를 찾을 수 없거나 접근 권한이 없습니다.');
            }

            await CustomerEtc.model.findOneAndUpdate({_id: dataId}, etcData, {new: true, session, runValidators: true});

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
        const option = params.option || {}; // 권한 우회 방지용 옵션

        // 미들웨어가 주입한 option 조건 병합
        const query = {_id: inputData._id, ...option};
        const returnData = await this.model.findOneAndDelete(query);

        if (!returnData) {
            throw new Error('삭제할 데이터를 찾을 수 없거나 접근 권한이 없습니다.');
        }

        await CustomerEtc.delete(params);

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

        // Aggregate 연산이 끝난 결과물에 대해 Mongoose populate 적용
        // aggregate는 순수 객체(POJO)를 반환하므로, model 옵션을 명시적으로 적어주면 더 안전하고 확실합니다.
        // Mongoose가 department 모델을 메모리에 로드하도록 동적 임포트 추가
        await import('./department.js');
        const populatedData = await this.model.populate(returnData, { 
            path: 'department_ids', 
            model: 'department' 
        });

        apiReturn.setTableData(populatedData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }
}

/**
 * department_ids: 다대다 매핑된 소속 부서 ObjectId 배열
 * code: 업체 식별자
 * text: 업체명
 * type: 타입1 운영유지보수, 타입2 하자유지보수, 타입3 계약기간동안 운영유지보수
 */

const CustomerList = new CustomerSchema('customer', {
    department_ids: [
        {
            type: Schema.Types.ObjectId,
            ref: 'department'
        }
    ],
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
