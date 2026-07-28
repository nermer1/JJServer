import express from 'express';
import otpController from '../controller/OtpController.js';
import HypervSocketController from '../controller/HypervSocketController.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

/**
 * @todo
 * otp - 세분화 여러 otp가 있을 경우를 생각한다면 어떻게 하는게 좋을까!?
 * GoogleOtpController -> OtpController -> google, etc otp?
 */

router.post('/google', requirePermission('utility:otp:use:any'), otpController.getList.bind(otpController));
router.post('/request', requirePermission('utility:otp:use:any'), HypervSocketController.requestOtp.bind(HypervSocketController));

export {router};
