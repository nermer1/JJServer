import express from 'express';
import WebPushController from '../controller/WebPushController.js';

const router = express.Router();

router.get('/vapid-public-key', WebPushController.getVapidPublicKey.bind(WebPushController));
router.post('/subscribe', WebPushController.subscribePush.bind(WebPushController));

export {router};
