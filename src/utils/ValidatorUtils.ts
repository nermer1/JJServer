export default class ValidatorUtils {
    public static isEmail(email: string) {
        return /^\S+@\S+\.\S+$/.test(email);
    }

    public static isPhone(phoneNumber: string, locale: string = 'ko-kr') {
        return /^(01[01256789]|013[0123])-[0-9]{3,4}-[0-9]{4}$/.test(phoneNumber);
    }

    public static isIPv4(ip: string) {
        return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
    }
}
