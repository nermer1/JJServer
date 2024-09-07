export default class DateUtils {
    /**
     *
     * @param date
     * @param format
     * @returns
     */
    public static formatDate(date: Date = new Date(), format: string = 'yyyyMMdd') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');

        switch (format) {
            case 'ddMMyyyy':
                return `${day}${month}${year}`;
            case 'yyyy-MM-dd':
                return `${year}-${month}-${day}`;
            case 'dd-MM-yyyy':
                return `${day}-${month}-${year}`;
            case 'yyyy-MM-dd hh:mm:dd':
                return `${year}-${month}-${day} ${hh}:${mm}:${ss}`;
            default:
                return `${year}${month}${day}`;
        }
    }

    /**
     *
     * @returns
     */
    public static getMondayOfCurrentWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay();

        const difference = dayOfWeek - 1;
        const monday = new Date(today);
        monday.setDate(today.getDate() - difference);

        if (dayOfWeek === 0) {
            monday.setDate(today.getDate() - 6);
        }

        return monday;
    }

    /**
     *
     * @returns
     */
    public static getLastFridayOfLastWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay();

        const difference = dayOfWeek < 5 ? dayOfWeek + 2 : dayOfWeek - 5 === 0 ? 7 : 0;

        const lastFriday = new Date(today);
        lastFriday.setDate(today.getDate() - difference);

        return lastFriday;
    }
}
