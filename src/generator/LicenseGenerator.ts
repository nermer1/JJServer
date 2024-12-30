import UniPostCipher from '../cipher/UniPostCipher.js';
import LicenseInfo from './LicenseInfo.js';
import fs from 'fs';
import * as convert from 'xml-js';

class LicenseGenerator {
    public static EVALUATION_CONST = 'EVALUATION';
    public static LEGALITY_CONST = 'LEGALITY';

    public static createLicense(licenseInfo: LicenseInfo) {
        const convertLicenseInfoToXml = (licenseInfo: LicenseInfo) => {
            const json = {
                licenseInfo: {
                    licenseType: licenseInfo.getLicenseType(),
                    hostName: licenseInfo.getHostName(),
                    expiredDate: licenseInfo.getExpiredDate(),
                    productName: licenseInfo.getProductName(),
                    applicant: licenseInfo.getApplicant(),
                    companyName: licenseInfo.getCompanyName(),
                    email: licenseInfo.getEmail(),
                    message: licenseInfo.getMessage()
                }
            };

            const licenseStr = convert.js2xml(json, {compact: true});
            return licenseStr;
        };

        const encryptedData = UniPostCipher.getInstance().encrypt(Buffer.from(convertLicenseInfoToXml(licenseInfo)));
        const fileName = this.getLicenseFileName(licenseInfo);

        /* if (!fs.existsSync(licenseFilePath)) {
            fs.mkdirSync(licenseFilePath, {recursive: true});
        }

        const fileName = this.getLicenseFileName(licenseInfo, licenseFilePath);
        fs.writeFileSync(fileName, encrypted); */

        return {fileName, encryptedData};
    }

    public static getLicenseFileName(licenseInfo: LicenseInfo): string {
        const productName = licenseInfo.getProductName().toLowerCase();
        const expiredDate = licenseInfo.getExpiredDate();
        const companyName = licenseInfo.getCompanyName().toLowerCase();
        const applicantName = licenseInfo.getApplicant();
        const evaluationPart = licenseInfo.getLicenseType() === this.EVALUATION_CONST ? `evaluation_${expiredDate}_` : '';
        return `${productName}_${evaluationPart}for_${companyName}(${applicantName}).lic`;
    }

    public static getLicenseInfo(productName: string, applicant: string, companyName: string, email: string): LicenseInfo {
        const licenseInfo = new LicenseInfo();
        licenseInfo.setProductName(productName);
        licenseInfo.setApplicant(applicant);
        licenseInfo.setCompanyName(companyName);
        licenseInfo.setEmail(email);
        return licenseInfo;
    }
}

export default LicenseGenerator;
