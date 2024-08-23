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

interface ObjAny {
    [key: string]: any;
}

interface ObjArr {
    [key: string]: Array<ObjAny>;
}

type DBNameType = 'holiday' | 'users' | 'userHost' | 'interviewQuiz' | 'customerList';

interface DBDataType {
    [key: string]: any;
    tableData: ObjAny[];
}

interface DBParamsType {
    name: DBNameType;
    type: string;
    option?: any;
    data: DBDataType;
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
        [key: string]: string | boolean | ObjType[];
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

interface ScheduleData {
    jobName: string;
    batchjob: string | Date;
    jobCallback: JobCallback;
    job?: Job;
}

interface CustomnerOtp {
    secret: string;
    mobile: string;
    user: string;
}

interface ExcelDataType {
    headers: Array<WorkbookHeaderType>;
    sheetName?: string;
    data: any;
}

interface WorkbookHeaderType {
    header: string;
    key: string;
    width?: number;
    data_header: string;
}
