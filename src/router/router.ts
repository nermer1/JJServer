import express from 'express';

import PrdApiController from '../controller/PrdApiController.js';
import LoginController from '../controller/LoginController.js';
//import {router as login} from './login.js';
import {router as licenses} from './licenses.js';
import {router as hyperv} from './hyperv.js';
import {router as downloads} from './downloads.js';
import {router as otp} from './otp.js';

const router = express.Router();

// 라우터 분리 작업 시작
//router.use('/login', login);
router.use('/licenses', licenses);
router.use('/hyperv', hyperv);
router.use('/downloads', downloads);
router.use('/otp', otp);
router.post('/login', LoginController.test.bind(LoginController));
router.post('/:collection', PrdApiController.call.bind(PrdApiController));

export default router;

// 전체 데이터 반환
/* router.route('/hyperv/connect')
.get(controller.getHyperVConnect)
.put() */

// /hyperv/connect

// 안에 type 에 따라 분기
// method : put
