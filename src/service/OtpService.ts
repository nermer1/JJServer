import {authenticator} from 'otplib';
import ApiReturn from '../structure/ApiReturn.js';
import MongoDB from '../db/MongoDB.js';

class otpService {
    public async getList(customers: string[]) {
        const apiReturn = new ApiReturn();
        const params = {
            name: 'customerEtc',
            option: {code: {$in: customers}},
            projection: {code: 1, otp: 1, _id: 0}
        };

        try {
            const data = (await this.getOptList(params)).getTableData();
            const groupedData = data.reduce((acc, item) => {
                const customerCode = item.customer.code;
                const otpDetails = item.otp.map(({secret, user, mobile}: ObjAny) => ({
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

    private async getOptList(params: ObjAny): Promise<ApiReturn> {
        const apiReturn = new ApiReturn();
        const db = MongoDB.getDb();
        const customerData = await db.collection(params.name).find(params.option, {projection: params.projection}).toArray();
        const returnData = customerData.reduce<ObjAny>((arr, data) => {
            const otpArr = data.otp;
            const googleOtps = otpArr.filter((otps: any) => otps.type === 'google');
            if (googleOtps.length > 0) {
                arr.push({
                    otp: googleOtps,
                    customer: {
                        code: data.code
                    }
                });
            }
            return arr;
        }, []);

        apiReturn.setTableData(returnData);
        apiReturn.setReturnMessage('조회 성공');
        return apiReturn;
    }
}

export default new otpService();
