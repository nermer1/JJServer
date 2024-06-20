import {schemas} from '../schemas/schemaMap.js';
import ApiReturn from '../structure/ApiReturn.js';

class PrdApiService {
    public async call(params: DBParamsType): Promise<ApiReturn> {
        try {
            const schema = schemas[params.name];
            return await schema.getApiReturn(params);
        } catch (e: any) {
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(e.message);
            return apiReturn;
        }
    }

    private checkData(params: DBParamsType): void {
        if (!params) throw '';
    }
}

export default new PrdApiService();
