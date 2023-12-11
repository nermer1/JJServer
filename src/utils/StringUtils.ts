export default class StringUtils {
    public static formatString(str: string, obj: ObjType) {
        return str.replace(/(\${([a-zA-Z0-9]+)})/gi, (a, b, c) => obj[c]);
    }
}
