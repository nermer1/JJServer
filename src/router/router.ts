import express from 'express';

import PrdApiController from '../controller/PrdApiController.js';
import GoogleOtpController from '../controller/GoogleOtpController.js';
import {router as login} from './login.js';
import {router as license} from './license.js';
import {router as hyperv} from './hyperv.js';
import {router as download} from './download.js';

const router = express.Router();

// 라우터 분리 작업 시작
router.use('/login', login);
router.use('/license', license);
router.use('/hyperv', hyperv);
router.use('/download', download);

/**
 *
 */
router.post('/api/v1', PrdApiController.call.bind(PrdApiController));

// google otp 가져오기
router.post('/getOtpList', GoogleOtpController.getList.bind(GoogleOtpController));

export default router;

// 전체 데이터 반환
/* router.route('/hyperv/connect')
.get(controller.getHyperVConnect)
.put() */

// /hyperv/connect

// 안에 type 에 따라 분기
// method : put
