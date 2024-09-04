import fs from 'fs';
import path from 'path';
import env from 'dotenv';
import UniPostCipher from '../cipher/UniPostCipher.js';

/**
 *
 */
class Property implements IProperty {
    private dirPath;

    public constructor(dirPath: string) {
        this.dirPath = dirPath;
        this.mergeEnv(this.dirPath);
    }

    private mergeEnv(dirPath: string) {
        fs.readdirSync(dirPath).forEach((name: string) => {
            const fullPath = path.join(dirPath, name);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                const serverAlias = process.env['SERVER_ALIAS'];
                if ((serverAlias !== 'product' && name === 'prd') || (serverAlias === 'product' && name === 'dev')) return;
                this.mergeEnv(fullPath);
            } else if (stat.isFile()) {
                env.config({path: fullPath});
            }
        });
    }

    private typeConverter: any = {
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
    private uniPostCipher: UniPostCipher;
    private static instance: ServerProperty;
    public static path = 'config/server/';

    private constructor() {
        super(ServerProperty.path);
        this.uniPostCipher = new UniPostCipher(this.getString('KEY_AES_CONST_HIDDEN', ''), this.getString('KEY_AES_IV_CONST_HIDDEN', ''));
    }

    public getProperty() {
        return {
            server: {
                port: this.getString('PROD_PORT', '3000')
            },
            db: {
                user: this.getDecyptProperty(this.getString('DB_USER')),
                password: this.getDecyptProperty(this.getString('DB_PASSWORD')),
                host: this.getString('DB_HOST')
            },
            smtp: {
                user: this.getDecyptProperty(this.getString('SMTP_USER')),
                password: this.getDecyptProperty(this.getString('SMTP_PASS')),
                port: this.getNumber('SMTP_PORT'),
                host: this.getString('SMTP_HOST')
            },
            selenium: {
                support: {
                    user: this.getDecyptProperty(this.getString('SELENIUM_SUPPORT_USER')),
                    password: this.getDecyptProperty(this.getString('SELENIUM_SUPPORT_PASS'))
                },
                portal: {
                    user: this.getDecyptProperty(this.getString('SELENIUM_PORTAL_USER')),
                    password: this.getDecyptProperty(this.getString('SELENIUM_PORTAL_PASS'))
                }
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

const extenalProperty = ServerProperty.getInstance();
const basicProperty = ServerProperty.getInstance().getProperty();

export {extenalProperty, basicProperty};
