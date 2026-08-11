import express from 'express';
import SystemController from '../controller/SystemController.js';
import {systemSettingsCrudPermission} from '../middleware/domainPermissions.js';

const router = express.Router();

// GET /api/v1/system/ips
// 미들웨어로 원천 차단하지 않고, 내부에서 권한에 따라 응답 데이터를 가공합니다.
router.get('/ips', SystemController.getCombinedIps.bind(SystemController));

// POST /api/v1/system/settings
// 프론트엔드에서 시스템 설정을 CRUD할 때 사용하는 엔드포인트입니다.
router.post('/settings', systemSettingsCrudPermission, SystemController.callSettings.bind(SystemController));

// POST /api/v1/system/logging
// 프론트엔드에서 수동으로 로그를 남길 때 사용합니다.
router.post('/logging', SystemController.clientLog.bind(SystemController));

export {router};
