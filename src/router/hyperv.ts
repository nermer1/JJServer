import express from 'express';
import HypervSocketController from '../controller/HypervSocketController.js';

const router = express.Router();

// 신규 Socket.IO 등
router.post('/heartbeat', HypervSocketController.heartbeat.bind(HypervSocketController));
router.post('/request', HypervSocketController.requestVm.bind(HypervSocketController));
router.post('/request-response', HypervSocketController.requestResponse.bind(HypervSocketController));

export {router};
