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

    async findAll(params: DBParamsType) {
        params = params || {};
        const option = params.option || {};
        const apiReturn = new ApiReturn();
        const returnData = await this.model.find(option);

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
