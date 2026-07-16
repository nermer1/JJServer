import {TaskScheduleManager as schedule} from './TaskScheduleManager.js';
import {syncHrDataJob} from './hrSyncScheduler.js';
import PermissionSyncService from '../service/PermissionSyncService.js';
import FileController from '../controller/FileController.js';
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

import {syncAdminPermissionsJob} from '../service/PermissionSyncService.js';
import {withJobLogging} from '../utils/JobLogger.js';

// 새벽 3시마다 인사정보 동기화!
schedule.add('HR_SYNC', '0 3 * * *', () => syncHrDataJob());

// 매일 자정에 Permission 데이터 동기화
schedule.add('PERMISSION_SYNC', '0 0 * * *', () => syncAdminPermissionsJob());

// 파일 가비지 컬렉션 (여기에 래퍼 적용)
const fileGarbageCollectionJob = withJobLogging((hoursOld: number) => FileController.executeGarbageCollection(hoursOld), {
    category: 'SYNC',
    action: '임시 파일 정리 배치',
    target: 'files',
    actionType: 'DELETE'
});

// 매일 새벽 4시에 찌꺼기 파일(TEMP 상태 & 24시간 경과) 청소 (Garbage Collection)
schedule.add('FILE_GC', '0 4 * * *', () => fileGarbageCollectionJob(24));

const scheduleManager = {
    init: () => {
        schedule.run();
    },
    close: () => {
        schedule.cancel();
    }
};

export default scheduleManager;
