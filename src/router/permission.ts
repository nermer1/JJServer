import express from 'express';
import PermissionController from '../controller/PermissionController.js';

const router = express.Router();

// 수동으로 권한을 특정 역할에 동기화하는 엔드포인트
router.post('/sync', PermissionController.sync);

export { router };
