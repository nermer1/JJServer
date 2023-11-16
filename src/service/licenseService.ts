import {Request, Response, NextFunction} from 'express';
import UniPostCipher from '../cipher/UniPostCipher.js';
import ServerProperty from '../properties/ServerProperty.js';

const uniPostCipher = new UniPostCipher(ServerProperty.getString('KEY_AES_CONST', ''), ServerProperty.getString('KEY_AES_IV_CONST', ''));

const service = {
    getEncryptText: (req: Request) => {
        const {cryptoText} = req.body;
        try {
            return uniPostCipher.encrypt(cryptoText);
        } catch (e: any) {
            console.log('error: ', e.message);
            return {data: ''};
        }
    },
    getDecryptText: (req: Request) => {
        const {cryptoText} = req.body;
        try {
            return uniPostCipher.decrypt(cryptoText);
        } catch (e: any) {
            console.log('error: ', e.message);
            return {data: ''};
        }
    }
};

export default service;
