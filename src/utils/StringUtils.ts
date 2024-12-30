export default class StringUtils {
    public static format(str: string, obj: ObjType) {
        return str.replace(/(\${([a-zA-Z0-9]+)})/gi, (a, b, c) => obj[c]);
    }
}
