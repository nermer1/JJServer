import {TaskScheduleManager as schedule} from './TaskScheduleManager.js';
import mailService from '../service/scheduleSendMailService.js';

/**
 * 서포트 메일 발송 스케줄러
 * 0 0 14 ? * FRI *
 */
schedule.add('test', '*/10 * * * * *', () => {
    console.log('?');
    // 셀레니움 테스트 - 되는거 확인 이제 로직 수정해야함
    mailService.run1();
});

/**
 * 휴가자 메일 발송 스케줄러
 */
schedule.add('test1', '*/10 * * * * *', () => {
    console.log('!');
    mailService.run2();
});

schedule.add('test1', '*/30 * * * * *', () => {
    console.log('@');
    mailService.run3();
});

const scheduleManager = {
    init: () => {
        schedule.run();
    },
    close: () => {
        schedule.cancel();
    }
};

export default scheduleManager;
