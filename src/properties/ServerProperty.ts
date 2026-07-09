import fs from 'fs';
import path from 'path';
import env from 'dotenv';
import UniPostCipher from '../cipher/UniPostCipher.js';

/**
 *
 */
class Property implements IProperty {
    private readonly dirPath;
    public serverAlias = 'localhost';

    public constructor(dirPath: string) {
        this.dirPath = dirPath;
        this.mergeEnv(this.dirPath);
    }

    private mergeEnv(dirPath: string): void {
        this.serverAlias = process.env.SERVER_ALIAS ?? 'localhost';
        fs.readdirSync(dirPath).forEach((name: string) => {
            const fullPath = path.join(dirPath, name);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                if (this.serverAlias !== name) return;
                this.mergeEnv(fullPath);
            } else if (stat.isFile()) {
                env.config({path: fullPath});
            }
        });
    }

    private readonly typeConverter: any = {
        number: this.number,
        string: this.string,
        boolean: this.boolean
    };

    private number(value: string): number | undefined {
        const result = Number(value);
        if (!Number.isNaN(result)) return result;
    }

    private string(value: string): string {
        return value;
    }

    private boolean(value: string): boolean | undefined {
        switch (value) {
            case 'true':
                return true;
            case 'false':
                return false;
        }
    }

    private convert(key: string, type: string, defaultValue?: string) {
        const value = process.env[key];
        if (value !== undefined) {
            const result = this.typeConverter[type](value);
            if (result !== undefined) {
                return result;
            }
            throw new Error(`process.env.${key}에 적절한 값을 설정하지 않았습니다`);
        }
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new Error(`process.env.${key}에 할당할 값이 없습니다`);
    }

    public getNumber(key: string, defaultValue?: string): number {
        return this.convert(key, 'number', defaultValue);
    }

    public getBoolean(key: string, defaultValue?: string): boolean {
        return this.convert(key, 'boolean', defaultValue);
    }

    public getString(key: string, defaultValue?: string): string {
        return this.convert(key, 'string', defaultValue);
    }
}

/**
 *
 */
class ServerProperty extends Property {
    private readonly uniPostCipher: UniPostCipher;
    private static instance: ServerProperty;
    public static path = 'config/server/';

    private constructor() {
        super(ServerProperty.path);
        this.uniPostCipher = new UniPostCipher(this.getString('KEY_AES_CONST_HIDDEN', ''), this.getString('KEY_AES_IV_CONST_HIDDEN', ''));
    }

    public getProperty() {
        return {
            server: {
                port: this.getString('PROD_PORT', '3000'),
                alias: this.getString('SERVER_ALIAS', this.serverAlias)
            },
            db: {
                user: this.getDecyptProperty(this.getString('DB_USER')),
                password: this.getDecyptProperty(this.getString('DB_PASSWORD')),
                host: this.getString('DB_HOST')
            },
            redis: {
                url: this.getString('REDIS_URL', 'redis://192.168.11.17:6379'),
                // 운영(prd)은 0번, 그 외(dev, alpha, localhost 등)는 1번을 기본값으로 사용
                database: this.getNumber('REDIS_DB', this.serverAlias === 'prd' ? '0' : '1')
            }
        };
    }

    private getDecyptProperty(encryptProperty: string) {
        return this.uniPostCipher.decrypt(encryptProperty);
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new ServerProperty();
        }

        return this.instance;
    }
}

const externalProperty = ServerProperty.getInstance();
const basicProperty = ServerProperty.getInstance().getProperty();

export {externalProperty, basicProperty};
