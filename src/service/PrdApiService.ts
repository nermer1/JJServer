//import {schemas} from '../schemas/schemaMap.js';
import ApiReturn from '../structure/ApiReturn.js';

class PrdApiService {
    public async call(params: DBParamsType): Promise<ApiReturn> {
        try {
            const serviceName = params.name;
            const schemaModule = await import(`../schemas/${serviceName}.js`);
            //const schema = schemas[serviceName as keyof typeof schemas];

            if (!schemaModule) throw 'Schema not found';

            return await schemaModule.getApiReturn(params);
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
