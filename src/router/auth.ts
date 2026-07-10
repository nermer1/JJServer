import express from 'express';
import LoginController from '../controller/LoginController.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.post('/login', LoginController.test.bind(LoginController));
router.post('/refresh', LoginController.refresh.bind(LoginController));
router.post('/global-logout', requirePermission('system:admin'), LoginController.globalLogout.bind(LoginController));

router.get('/slack', LoginController.slackLoginRedirect.bind(LoginController));
router.get('/slack/callback', LoginController.slackLoginCallback.bind(LoginController));

export {router};
