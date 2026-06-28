import express from 'express';
import SlackController from '../controller/SlackController.js';
import {verifySlackSignature} from '../middleware/slackAuthMiddleware.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.post('/slack/commands', verifySlackSignature, SlackController.commands.bind(SlackController));
router.post('/slack/interactivity', verifySlackSignature, SlackController.interactivity.bind(SlackController));
router.post('/slack/notify', requirePermission('notification:slack:send'), SlackController.notify.bind(SlackController));

export {router};
