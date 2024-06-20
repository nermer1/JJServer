import UniPostCipher from '../cipher/UniPostCipher.js';
import {extenalProperty} from '../properties/ServerProperty.js';

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
}

export default new UnidocuLicenseService();
