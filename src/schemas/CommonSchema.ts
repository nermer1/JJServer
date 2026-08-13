import mongoose, {Schema} from 'mongoose';
import ApiReturn from '../structure/ApiReturn.js';

export default class CommonSchema {
    private readonly schema: Schema;
    model;

    constructor(schemaName: string, options = {}) {
        if (options instanceof Schema) {
            this.schema = options;
        } else {
            this.schema = new Schema(options);
        }
        this.model = mongoose.model(schemaName, this.schema, schemaName);
    }



    async insert(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        const option = params.option || {};

        // 미들웨어에서 넘어온 강제 주입 데이터(예: 생성자 id, 부서 id)를 데이터에 병합
        let dataToInsert: ObjAny = params.data.tableData;
        if (Array.isArray(dataToInsert)) {
            dataToInsert = dataToInsert.map((item) => ({...item, ...option}));
        } else {
            dataToInsert = {...dataToInsert, ...option};
        }

        const returnData = await this.model.create(dataToInsert);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('생성 성공');
        return apiReturn;
    }

    async delete(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        const inputData = params.data.tableData[0];
        const option = params.option || {};

        // _id 에 미들웨어 필터(option)를 덧붙여 권한 우회 방지
        const query = {_id: inputData._id, ...option};
        const returnData = await this.model.findOneAndDelete(query);

        if (!returnData) {
            throw new Error('삭제할 데이터를 찾을 수 없거나 접근 권한이 없습니다.');
        }

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('삭제 성공');
        return apiReturn;
    }

    async update(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        const inputData = params.data.tableData[0];
        const option = params.option || {};

        // _id 에 미들웨어 필터(option)를 덧붙여 권한 우회 방지
        const query = {_id: inputData._id, ...option};

        // 몽고DB Immutable _id 업데이트 에러 방지를 위해 payload에서 제거
        const updateData = {...inputData};
        delete updateData._id;

        const returnData = await this.model.findOneAndUpdate(query, updateData, {new: true, runValidators: true});

        if (!returnData) {
            throw new Error('업데이트할 데이터를 찾을 수 없거나 접근 권한이 없습니다.');
        }

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('업데이트 성공');
        return apiReturn;
    }

    /**
     * params.projection 규약 (findAll 오버라이드 공통 규칙)
     * ─────────────────────────────────────────────────────
     * 1) 조인이 없는 findAll (기본형): find()의 projection 인자로 그대로 넘긴다
     *      projection = { 필드명: 0 }
     *      예) { password: 0 }
     *
     * 2) aggregate 조인형 findAll (오버라이드형): 파이프라인 스테이지 이름을 키로 두고
     *    해당 스테이지 오브젝트에 그대로 병합(...)한다.
     *      projection = { <스테이지명>: { ... }, ... }
     *      - lookup  : $lookup 오브젝트에 병합 (예: { pipeline: [{ $project: { secret: 0 } }] })
     *      - project : 최종 $project 스테이지에 병합 (예: { 'etc.info.data.tables': 0 })
     *      각 오버라이드는 자기가 노출하는 스테이지 키를 메서드 위에 문서화한다.
     *
     * 3) 새로운 조인 패턴이 생기면 그 findAll에서 스테이지 키를 추가한다 (이 규약 자체는 불변).
     *
     * 공통 제약:
     *   - project 스테이지는 제외 모드(0)만 사용. 한 $project 안에서 0과 1을 섞지 않는다.
     *   - populate/lookup 연결 키(department_ids 등)는 숨기지 않는다 (숨기면 조인이 깨짐).
     *   - projection을 안 넘기면 전체 필드를 반환한다 (기존 호출부 하위호환).
     */
    async findAll(params: DBParamsType) {
        params = params || {};
        const option = params.option || {};
        // 조인 없는 기본형: projection을 그 컬렉션 필드에 그대로 적용
        const projection = params.projection || {};
        const apiReturn = new ApiReturn();
        const returnData = await this.model.find(option, projection);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }

    async hasRecord(params: ObjAny) {
        return !((await this.model.exists(params)) == null);
    }

    async getApiReturn(params: DBParamsType): Promise<ApiReturn> {
        switch (params.type) {
            case 'C':
                return await this.insert(params);
            case 'R':
                return await this.findAll(params);
            case 'U':
                return await this.update(params);
            case 'D':
                return await this.delete(params);
            default:
                throw new Error('type이 없거나 c,r,u,d만 입력 필요');
        }
    }
}
