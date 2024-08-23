export default class ValidatorUtils {
    public static isEmail(email: string) {
        return /^\S+@\S+\.\S+$/.test(email);
    }

    public static isPhone(phoneNumber: string, locale: string = 'ko-kr') {
        return /^(01[01256789]|013[0123])-[0-9]{3,4}-[0-9]{4}$/.test(phoneNumber);
    }

    public static isIPv4(ip: string) {
        //^(([1][0-9]{2}|[2][0-5]{2}|[0-9]{2}|[1-9])\.([1][0-9]{2}|[2][0-5]{2}|[0-9]{2}|[1-9])\.([1][0-9]{2}|[2][0-5]{2}|[0-9]{2}|[1-9])\.([1][0-9]{2}|[2][0-5]{2}|[0-9]{2}|[1-9]))$
        //^((\d{1,2}|1\d{2}|2[0-4]\d|25[0-5])\.){3}(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5])$
        return /^((\d{1,2}|1\d{2}|2[0-4]\d|25[0-5])\.){3}(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5])$/.test(ip);
    }
}
