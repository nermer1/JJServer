import express from 'express';
import otpController from '../controller/OtpController.js';

const router = express.Router();

/**
 * @todo
 * otp - 세분화 여러 otp가 있을 경우를 생각한다면 어떻게 하는게 좋을까!?
 * GoogleOtpController -> OtpController -> google, etc otp?
 */

router.post('/google', otpController.getList.bind(otpController));

export {router};
