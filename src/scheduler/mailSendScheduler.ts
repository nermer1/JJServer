import {TaskScheduleManager as schedule} from './TaskScheduleManager.js';
import mailService from '../service/scheduleSendMailService.js';

/**
 * 서포트 잔여 일감 메일 발송 스케줄러
 * 월 - 금 오후 2시 발송
 */
schedule.add('test', '0 0 14 * * 5', mailService.run1);

/**
 * 서포트 공수 메일 발송 스케줄러
 * 월 - 금 오후 2시 발송
 */
schedule.add('test1', '0 0 14 * * 5', mailService.run2);

/**
 * 휴가자 메일 발송 스케줄러
 * 월 - 금 오전 9시 발송
 */
schedule.add('test2', '0 9 * * 1-5', mailService.run3);
//schedule.add('test2', '*/5 * * * * *', mailService.run3);

const scheduleManager = {
    init: () => {
        schedule.run();
    },
    close: () => {
        schedule.cancel();
    }
};

export default scheduleManager;
