import express from 'express';
import UserController from '../controller/UserController.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

// GET /api/v1/user/me
router.get('/me', UserController.getMe.bind(UserController));

// GET /api/v1/user/contacts
router.get('/contacts', UserController.getContacts.bind(UserController));

// POST /api/v1/user/sync-hr (인사 정보 수동 동기화, 최고 관리자 전용)
router.post('/sync-hr', requirePermission('system:admin'), UserController.syncHrData.bind(UserController));

export {router};
