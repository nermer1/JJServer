import {authenticator} from 'otplib';
import ApiReturn from '../structure/ApiReturn.js';
import {schemas} from '../schemas/schemaMap.js';

class GoogleOtpService {
    public async getList(customer: string) {
        const isAll = !customer;
        const apiReturn = new ApiReturn();
        const params: DBParamsType = {
            name: 'customerList',
            type: 'R',
            option: isAll ? {} : {code: customer},
            data: {
                tableData: []
            }
        };

        try {
            const schema = schemas.customerList;
            const otpListData = await schema.getOptList(params);
            if (isAll) return otpListData;
            const tableData = otpListData.getTableData();
            const otps = tableData[0].otp.map(({secret, user, mobile}: any) => {
                return {user, mobile, otp: authenticator.generate(secret)};
            });
            apiReturn.put('timeUse', authenticator.timeUsed());
            apiReturn.setTableData(otps);
        } catch (e) {
            apiReturn.setReturnErrorMessage(e as string);
        }
        return apiReturn;
    }
}

export default new GoogleOtpService();
