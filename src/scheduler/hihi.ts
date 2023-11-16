import {TaskScheduleManager as schedule} from './TaskScheduleManager.js';

/**
 * 서포트 메일 발송 스케줄러
 */
schedule.add('test', '*/5 * * * * *', () => {
    console.log('?');
});

/**
 * 휴가자 메일 발송 스케줄러
 */
schedule.add('test1', '*/10 * * * * *', () => {
    console.log('!');
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
