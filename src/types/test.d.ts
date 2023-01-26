interface IProperty {
    getString(key: string): string;
}

interface MongooseOption {
    [key:string]: boolean
}