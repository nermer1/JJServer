import path from "path";
import env from "dotenv";

//env.config({path: "./config/server/.env"});

// .env 프로퍼티 속성 제어
// 

/* const cast = (key, type, defaultValue) => {
    const value = process.env[key]
    if (value !== undefined) {
      const result = typeConverter[type](value)
      if (result !== undefined) {
        return result
      }
      throw new Error(`process.env.${key}에 적절한 값을 설정하지 않았습니다`)
    }
    if (defaultValue !== undefined) {
      return defaultValue
    }
    throw new Error(`process.env.${key}에 할당할 값이 없습니다`)
  } */

class Property implements IProperty {
    private env;

    public constructor() {
        env.config();
        this.env = process.env;
    }

    /* private typeConverter: any = {
        number: this.number,
        string: this.string,
        boolean: this.boolean
    }

    private number(value: string): number | undefined {
        const result = Number(value);
        if (!Number.isNaN(result)) return result;
    }

    private string(value: string): string {
        return value;
    }

    private boolean(value: string): boolean | undefined {
        switch (value) {
            case "true":
                return true;
            case "false":
                return false;
        }
    }; */

    /* public cast(key: string, type: string, defaultValue: string) {
        const value = process.env[key]
        if (value !== undefined) {
          const result = this.typeConverter[type](value);
          if (result !== undefined) {
            return result
          }
          throw new Error(`process.env.${key}에 적절한 값을 설정하지 않았습니다`)
        }
        if (defaultValue !== undefined) {
          return defaultValue
        }
        throw new Error(`process.env.${key}에 할당할 값이 없습니다`)
    } */

    public getNumber(key: string, defaultValue?: string): Number {
        return 0;
    }

    public getBoolean(key: string, defaultValue?: string): boolean {
        return true;
    }

    public getString(key: string, defaultValue?: string): string {
        let value = this.env[key];
        if(defaultValue !== undefined) return defaultValue;
        return !value ? "" : value;
    }
}

class ServerProperty extends Property {
    private static instance: ServerProperty;

    private constructor() {
        super();
    }

    public getServerPort(): string {
        return ServerProperty.getInstance().getString("PROD_PORT", "3000");
    }

    public getDBHost(): string {
        return ServerProperty.getInstance().getString("PROD_DB_HOST");
    }

    public static getInstance() {
        if (!this.instance) {
            this.instance = new ServerProperty();
        }

        return this.instance;
    }
}

export default ServerProperty.getInstance();
