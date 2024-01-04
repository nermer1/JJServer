import {schemas} from '../schemas/schemaMap.js';
import ApiReturn from '../structure/ApiReturn.js';

const service = {
    call: async (params: DBParamsType) => {
        try {
            const schema = schemas[params.name];
            return await schema.getApiReturn(params);
        } catch (e: any) {
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(e.message);
            return apiReturn;
        }
    }
};

function checkData(params: DBParamsType) {
    if (!params) throw '';
}

export default service;
