import {authenticator} from 'otplib';
import ApiReturn from '../structure/ApiReturn.js';
import {schemas} from '../schemas/schemaMap.js';

class otpService {
    public async getList(customers: string[]) {
        const apiReturn = new ApiReturn();
        const params: DBParamsType = {
            name: 'customerList',
            type: 'R',
            option: {code: {$in: customers}},
            projection: {
                lookup: {pipeline: [{$project: {'info.data.history': 0, 'info.data.tables': 0}}]}
            },
            data: {
                tableData: []
            }
        };

        try {
            const schema = schemas.customerList;
            const otpListData = await schema.getOptList(params);
            const tableData = otpListData.getTableData();

            const groupedData = tableData.reduce((acc, item) => {
                const customerCode = item.customer.code;
                const otpDetails = item.otp.map(({secret, user, mobile}: any) => ({
                    user,
                    mobile,
                    otp: authenticator.generate(secret)
                }));
                acc[customerCode] = (acc[customerCode] || []).concat(otpDetails);

                return acc;
            }, {});

            const otps = Object.entries(groupedData).map(([key, value]) => {
                return {[key]: value};
            });

            apiReturn.put('timeUse', authenticator.timeUsed());
            apiReturn.setTableData(otps);
        } catch (e) {
            apiReturn.setReturnErrorMessage(e as string);
        }
        return apiReturn;
    }
}

export default new otpService();
