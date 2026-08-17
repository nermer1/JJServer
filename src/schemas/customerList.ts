import CommonSchema from './CommonSchema.js';
import {validatorUtil as validator, objectUtil} from '../utils/Utils.js';
import ApiReturn from '../structure/ApiReturn.js';
import {CustomerEtc} from './customerEtc.js';
import mongoose, {Schema} from 'mongoose';
import {flatten} from 'flat';
import logger from '../utils/logger.js';

class CustomerSchema extends CommonSchema {
    constructor(schemaName: string, options = {}) {
        super(schemaName, options);
    }

    async insert(params: DBParamsType): Promise<ApiReturn> {
        let apiReturn = new ApiReturn();
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
                        if (
                            !depts.some((d: any) => {
                                const deptIdStr = typeof d === 'object' && d !== null ? d._id?.toString() || d.id?.toString() : d?.toString();
                                return deptIdStr === reqDeptId;
                            })
                        ) {
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
                return apiReturn;
            } catch (error: any) {
                await session.abortTransaction();

                if (error.code === 112 || (error.message && error.message.includes('Write conflict'))) {
                    if (attempt === maxRetries) {
                        logger.error(`생성 트랜잭션 재시도 횟수 초과 (${maxRetries}회 실패)`, error);
                        apiReturn.setReturnMessage('일시적인 시스템 혼잡으로 생성에 실패했습니다. 다시 시도해주세요.');
                        return apiReturn;
                    }
                    logger.warn(`생성 Write conflict 발생. ${attempt}번째 재시도 중...`);
                    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
                    continue;
                }

                logger.error(error.message, error);
                apiReturn.setReturnMessage(error.message);
                return apiReturn;
            } finally {
                session.endSession();
            }
        }
        return apiReturn;
    }

    async update(params: DBParamsType): Promise<ApiReturn> {
        let apiReturn = new ApiReturn();
        const maxRetries = 3;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                const inputData = params.data.tableData[0];
                const etcData = inputData.etc;
                const dataId = inputData._id;
                const inputUpdatedAt = inputData.updatedAt;
                const option = params.option || {}; // 권한 우회 방지용 옵션

                etcData._id = dataId;
                etcData.code = inputData.code;

                // 미들웨어가 주입한 option 조건 병합
                const query: any = {_id: dataId, ...option};

                // 동시성 제어 (낙관적 락): 프론트에서 받은 updatedAt이 있으면 쿼리에 추가
                if (inputUpdatedAt) {
                    query.updatedAt = inputUpdatedAt;
                }

                // _id와 etc 필드를 제거한 뒤 업데이트용 객체 생성
                const updateData = {...inputData};
                delete updateData._id;
                delete updateData.etc;
                delete updateData.updatedAt; // 자동 갱신되도록 수동 덮어쓰기 방지

                // 기존 코드에 있던 취약점 수정: _id 뿐만 아니라 권한 조건(query)도 검사
                const returnData = await this.model.findOneAndUpdate(query, flatten(updateData, {safe: true}), {new: true, session});

                if (!returnData) {
                    // updatedAt 조건 때문에 못 찾은 거라면(동시에 다른 사람이 수정함) 409 에러 발생
                    if (inputUpdatedAt) {
                        const exists = await this.model.exists({_id: dataId, ...option});
                        if (exists) {
                            const error: any = new Error('데이터가 다른 사용자에 의해 이미 수정되었습니다. 최신 데이터를 확인 후 다시 시도해주세요.');
                            error.status = 409;
                            throw error;
                        }
                    }
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
                return apiReturn;
            } catch (error: any) {
                await session.abortTransaction();

                if (error.code === 112 || (error.message && error.message.includes('Write conflict'))) {
                    if (attempt === maxRetries) {
                        logger.error(`업데이트 트랜잭션 재시도 횟수 초과 (${maxRetries}회 실패)`, error);
                        apiReturn.setReturnMessage('일시적인 시스템 혼잡으로 업데이트에 실패했습니다. 다시 시도해주세요.');
                        return apiReturn;
                    }
                    logger.warn(`업데이트 Write conflict 발생. ${attempt}번째 재시도 중...`);
                    await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
                    continue;
                }

                console.error(error);
                apiReturn.setReturnMessage('업데이트 실패');
                apiReturn.setReturnErrorMessage(error.message);
                // 에러 객체에 409 코드가 있으면 apiReturn 내부에도 마킹하여 컨트롤러가 알 수 있게 함
                if (error.status === 409) {
                    (apiReturn as any).statusCode = 409;
                }
                return apiReturn;
            } finally {
                session.endSession();
            }
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

    /**
     * customer + customerEtc 조인형 findAll.
     * projection 규약(CommonSchema.findAll 주석 참고): aggregate 스테이지에 직접 주입한다.
     * 지원 키:
     *   - projection.lookup  : $lookup 오브젝트에 병합
     *       예) { pipeline: [{ $project: { 'otp.secret': 0 } }] }  // customerEtc를 꺼내올 때 제외
     *   - projection.project : 최종 $project 스테이지에 병합 (제외 모드 0)
     *       예) { 'etc.info.data.tables': 0 }                      // 병합 결과에서 제외
     * 안 넘기면 전체 필드를 반환한다.
     */
    async findAll(params: DBParamsType) {
        params = params || {};
        const option = params.option || {};
        const projection = params.projection || {};
        const lookupProjection = projection.lookup || {}; // $lookup 오브젝트에 병합
        const projectProjection = projection.project || {}; // 최종 $project 스테이지에 병합
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
                    as: 'customerEtc',
                    ...lookupProjection
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
                $project: {'etc._id': 0, customerEtc: 0, ...projectProjection}
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

const customerSchemaDef = new Schema(
    {
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
    },
    {timestamps: true}
);

const CustomerList = new CustomerSchema('customer', customerSchemaDef);

export {CustomerList};
