interface Tt {
    [key: string]: Ttt;
}

interface Ttt {
    customer: string;
    hostName: string;
    isConnect: boolean;
    id?: number;
    currentTime: string;
}

interface ObjType {
    [key: string]: string;
}

interface ServerToClientEvents {
    noArg: () => void;
    basicEmit: (a: number, b: string, c: Buffer) => void;
    withAck: (d: string, callback: (e: number) => void) => void;
}

interface ClientToServerEvents {
    hello: () => void;
}

interface InterServerEvents {
    ping: () => void;
}

interface SocketData {
    name: string;
    age: number;
}

interface UniPostCipher {
    key: Buffer;
    ivParameterSpec: Buffer;
    algorithm: string;
    encrypt(plain: string): stirng | Buffer;
    decrypt(encrypted: Encrypt): stirng | Buffer;
}

interface IProperty {
    getString(key: string, defaultValue?: string): string;
    getNumber(key: string, defaultValue?: string): number;
    getBoolean(key: string, defaultValue?: string): boolean;
}

interface MongooseOption {
    [key: string]: boolean;
}

interface SeleniumMailParams {
    send: string;
    receiver: string;
    subject: string;
    mustache: string;
    data: {
        [key: string]: string | ObjType[];
    };
}

interface SeleniumDriverParams {
    front: {
        url: string;
        id: string;
        pass: string;
    };
    end: {
        url: string;
        data: any;
    };
}

interface UnipostSelelniumParams {
    mail: SeleniumMailParams;
    driver: SeleniumDriverParams;
}
