import {TaskScheduleManager as schedule} from './TaskScheduleManager.js';
import {syncHrDataJob} from './hrSyncScheduler.js';
import PermissionSyncService from '../service/PermissionSyncService.js';
//import mailService from '../service/scheduleSendMailService.js';

/**
 * 서포트 잔여 일감 메일 발송 스케줄러
 * 월 - 금 오후 2시 발송
 */
//schedule.add('test', '0 0 14 * * 5', mailService.run1);

/**
 * 서포트 공수 메일 발송 스케줄러
 * 월 - 금 오후 2시 발송
 */
//schedule.add('test1', '0 0 14 * * 5', mailService.run2);

/**
 * 휴가자 메일 발송 스케줄러
 * 월 - 금 오전 9시 발송
 */
//schedule.add('test2', '0 9 * * 1-5', mailService.run3);
//schedule.add('test2', '*/5 * * * * *', mailService.run3);

// 새벽 3시마다 인사정보 동기화!
schedule.add('HR_SYNC', '0 3 * * *', () => syncHrDataJob());

// 매일 자정에 Permission 데이터 동기화
schedule.add('PERMISSION_SYNC', '0 0 * * *', () => PermissionSyncService.syncAdminPermissions());

const scheduleManager = {
    init: () => {
        schedule.run();
    },
    close: () => {
        schedule.cancel();
    }
};

export default scheduleManager;
