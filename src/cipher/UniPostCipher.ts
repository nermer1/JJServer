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

    public encrypt(plain: string): string {
        const cipher = crypto.createCipheriv(this.algorithm, this.key, this.ivParameterSpec);
        let encrypted = cipher.update(plain, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    public decrypt(encrypted: string): string {
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, this.ivParameterSpec);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}

export default UniPostCipher;
