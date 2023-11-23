import UniPostCipher from '../cipher/UniPostCipher.js';
import {extenalProperty} from '../properties/ServerProperty.js';

const uniPostCipher = new UniPostCipher(extenalProperty.getString('KEY_AES_CONST', ''), extenalProperty.getString('KEY_AES_IV_CONST', ''));

const service = {
    getEncryptText: (cryptoText: string) => {
        try {
            return uniPostCipher.encrypt(cryptoText);
        } catch (e: any) {
            console.log('error: ', e.message);
            return {error: e.message};
        }
    },
    getDecryptText: (cryptoText: string) => {
        try {
            return uniPostCipher.decrypt(cryptoText);
        } catch (e: any) {
            console.log('error: ', e.message);
            return {error: e.message};
        }
    }
};

export default service;
