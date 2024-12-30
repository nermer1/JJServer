import UniPostCipher from '../cipher/UniPostCipher.js';
import LicenseGenerator from '../generator/LicenseGenerator.js';
import {extenalProperty} from '../properties/ServerProperty.js';
import {Request, Response, NextFunction} from 'express';

class UnidocuLicenseService {
    private uniPostCipher = new UniPostCipher(extenalProperty.getString('KEY_AES_CONST', ''), extenalProperty.getString('KEY_AES_IV_CONST', ''));
    public getEncryptText(cryptoText: string): string | {error: string} {
        try {
            return this.uniPostCipher.encrypt(cryptoText);
        } catch (e: any) {
            console.log('error: ', e.message);
            return {error: e.message};
        }
    }

    public getDecryptText(cryptoText: string): string | {error: string} {
        try {
            return this.uniPostCipher.decrypt(cryptoText);
        } catch (e: any) {
            console.log('error: ', e.message);
            return {error: e.message};
        }
    }

    public getLicenseFile(req: Request, res: Response) {
        const {licenseType, hostName, expiredDate, productName, applicant, companyName, email, message = ''} = req.body;
        const licenseInfo = LicenseGenerator.getLicenseInfo(productName, applicant, companyName, email);
        licenseInfo.setLicenseType(licenseType);
        licenseInfo.setMessage(message);
        if (licenseType === LicenseGenerator.LEGALITY_CONST) licenseInfo.setHostName(hostName);
        else licenseInfo.setExpiredDate(expiredDate);
        const {fileName, encryptedData} = LicenseGenerator.createLicense(licenseInfo);

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        res.end(encryptedData);
    }
}

export default new UnidocuLicenseService();
