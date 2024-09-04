export default class ObjectUtils {
    public static isEmpty(obj: ObjType | Array<any>) {
        obj = obj || {};
        return Object.keys(obj).length === 0;
    }
}
