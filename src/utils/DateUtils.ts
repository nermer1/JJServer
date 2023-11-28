export default class DateUtils {
    public static formatDate(date: Date = new Date(), format: string = 'yyyyMMdd') {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        switch (format) {
            case 'ddMMyyyy':
                return `${day}${month}${year}`;
            case 'yyyy-MM-dd':
                return `${year}-${month}-${day}`;
            case 'dd-MM-yyyy':
                return `${day}-${month}-${year}`;
            default:
                return `${year}${month}${day}`;
        }
    }

    public static getMondayOfCurrentWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0은 일요일, 1은 월요일, ..., 6은 토요일

        const difference = dayOfWeek - 1; // 현재 요일에서 월요일까지의 차이
        const monday = new Date(today);
        monday.setDate(today.getDate() - difference);

        // 만약 현재 요일이 일요일이면 이전 주의 월요일을 반환
        if (dayOfWeek === 0) {
            monday.setDate(today.getDate() - 6);
        }

        // 날짜 객체로 반환
        return monday;
    }

    public static getLastFridayOfLastWeek() {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0은 일요일, 1은 월요일, ..., 6은 토요일

        // 현재 요일에서 금요일까지의 차이 계산
        console.log('today', today); // 오늘 날짜
        console.log('dayOfWeek', dayOfWeek); // 2 오늘 화요일

        const difference = dayOfWeek < 5 ? dayOfWeek + 2 : dayOfWeek - 5;

        const lastFriday = new Date(today);
        lastFriday.setDate(today.getDate() - difference - 7);

        return lastFriday;
    }
}
