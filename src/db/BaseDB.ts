abstract class BaseDB {
    abstract connect(): Promise<void>;
    abstract close(): Promise<void>;
}

export default BaseDB;
