export default class ValidatorUtils {
    /**
     *
     * @param email
     * @returns
     */
    public static isEmail(email: string) {
        return /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@([\w-]+\.)+[\w-]{2,}$/.test(email);
    }

    /**
     *
     * @param value
     * @param minDigit
     * @param maxDigit
     * @returns
     */
    public static isDigitString(value: string, minDigit?: number, maxDigit?: number) {
        const pattern = !minDigit ? `^\\d+$` : !maxDigit ? `^\\d{${minDigit}}$` : `^\\d{${minDigit},${maxDigit}}$`;
        return new RegExp(pattern).test(value);
    }

    /**
     *
     * @param phoneNumber
     * @param locale
     * @returns
     */
    public static isPhone(phoneNumber: string, locale: string = 'ko') {
        const localeMap: ObjType = {
            ko: '^(01[01256789]|013[0123])-[0-9]{3,4}-[0-9]{4}$'
        };
        return new RegExp(localeMap[locale] || localeMap['ko']).test(phoneNumber);
    }

    /**
     *
     * @param ip
     * @returns
     */
    public static isIPv4(ip: string) {
        return /^((\d{1,2}|1\d{2}|2[0-4]\d|25[0-5])\.){3}(\d{1,2}|1\d{2}|2[0-4]\d|25[0-5])$/.test(ip);
    }

    /**
     *
     * @param macAddress
     * @returns
     */
    public static isMacAddress(macAddress: string) {
        return /^([a-fA-F0-9]{2}\-){5}([a-fA-F0-9]{2})$/.test(macAddress);
    }
}
