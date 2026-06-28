import express from 'express';
import HypervSocketController from '../controller/HypervSocketController.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

// 신규 Socket.IO 등
router.post('/heartbeat', requirePermission('hyperv:read:any'), HypervSocketController.heartbeat.bind(HypervSocketController));
router.post('/request', requirePermission('hyperv:read:any'), HypervSocketController.requestVm.bind(HypervSocketController));
//router.post('/request-response', HypervSocketController.requestResponse.bind(HypervSocketController));

export {router};
