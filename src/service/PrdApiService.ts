//import {schemas} from '../schemas/schemaMap.js';
import ApiReturn from '../structure/ApiReturn.js';

class PrdApiService {
    public async call(params: DBParamsType): Promise<ApiReturn> {
        try {
            const serviceName = params.name;
            const schemaModule = await import(`../schemas/${serviceName}.js`);
            //const schema = schemas[serviceName as keyof typeof schemas];

            const schemaKeys = Object.keys(schemaModule);
            if (schemaKeys.length === 0) throw new Error('Schema module is empty');

            const schema = schemaModule[schemaKeys[0]];
            if (!schema) throw new Error('Schema does not have getApiReturn method');

            return await schema.getApiReturn(params);
        } catch (e: any) {
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(e instanceof Error ? e.message : String(e));
            return apiReturn;
        }
    }

    private checkData(params: DBParamsType): void {
        if (!params) throw '';
    }
}

export default new PrdApiService();
