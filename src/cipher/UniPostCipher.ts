import crypto from 'crypto';

class UniPostCipher {
    key: Buffer;
    ivParameterSpec: Buffer;
    algorithm: string;
    constructor(keyHex: string, ivHex: string) {
        this.key = Buffer.from(keyHex, 'hex');
        this.ivParameterSpec = Buffer.from(ivHex, 'hex');
        this.algorithm = 'aes-128-cbc';
    }

    public encrypt(plain: string): string;
    public encrypt(plain: Buffer): Buffer;
    public encrypt(plain: string | Buffer): string | Buffer {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.ivParameterSpec);

        if (typeof plain === 'string') {
            let encrypted = cipher.update(plain, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return encrypted;
        } else {
            const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
            return encrypted;
        }
    }

    public decrypt(encrypted: string): string {
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.ivParameterSpec);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    public static getInstance(): UniPostCipher {
        const KEY_AES_CONST = '5cfb2d12ad35488c8292c792b8c42375';
        const KEY_AES_IV_CONST = 'a6d5dbc8cae6439d98d98826cc5e5a0e';
        return new UniPostCipher(KEY_AES_CONST, KEY_AES_IV_CONST);
    }
}

export default UniPostCipher;
