import mongoose, {Schema} from 'mongoose';
import ApiReturn from '../structure/ApiReturn.js';

export default class CommonSchema {
    private schema: Schema;
    model;

    constructor(schemaName: string, options = {}) {
        this.schema = new Schema(options);
        this.model = mongoose.model(schemaName, this.schema, schemaName);
    }

    async insert(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        const returnData = await this.model.create(params.data.tableData);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('생성 성공');
        return apiReturn;
    }

    async delete(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        const inputData = params.data;
        const id = inputData.tableData[0].id;
        const returnData = await this.model.findByIdAndDelete(id);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('삭제 성공');
        return apiReturn;
    }

    async update(params: DBParamsType) {
        const apiReturn = new ApiReturn();
        const inputData = params.data;
        const id = inputData.tableData[0].id;
        const returnData = await this.model.findOneAndUpdate({_id: id}, inputData, {new: true});

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('업데이트 성공');
        return apiReturn;
    }

    async findAll(params?: DBParamsType) {
        const apiReturn = new ApiReturn();
        const returnData = await this.model.find({});

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
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
