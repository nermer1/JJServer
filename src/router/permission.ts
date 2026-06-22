import express from 'express';
import PermissionController from '../controller/PermissionController.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

// 수동으로 권한을 특정 역할에 동기화하는 엔드포인트 (최고 관리자 전용)
router.post('/sync', requirePermission('system:admin'), PermissionController.sync);

// API 키 발급 화면용 권한 목록 조회 엔드포인트
// genericCrudPermission 미들웨어를 우회하기 위해 전용 라우터로 분리
router.get('/apikey-scopes', PermissionController.getApiKeyScopes);

export { router };
