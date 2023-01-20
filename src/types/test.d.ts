interface ServerProperty {
    getString(key: string): string;
    getServerPort(): string;
    getDBHost(): string;
}

interface MongooseOption {
    [key:string]: boolean
}