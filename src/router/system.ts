import express from 'express';
import SystemController from '../controller/SystemController.js';

const router = express.Router();

// GET /api/v1/system/ips
// 미들웨어로 원천 차단하지 않고, 내부에서 권한에 따라 응답 데이터를 가공합니다.
router.get('/ips', SystemController.getCombinedIps.bind(SystemController));

export {router};

