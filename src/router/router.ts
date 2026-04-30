import express from 'express';

import PrdApiController from '../controller/PrdApiController.js';
import LoginController from '../controller/LoginController.js';
//import {router as login} from './login.js';
import {router as licenses} from './licenses.js';
import {router as hyperv} from './hyperv.js';
import {router as downloads} from './downloads.js';
import {router as otp} from './otp.js';
import {router as integrations} from './integrations.js';
import {router as apikeys} from './apikeys.js';
import {router as auth} from './auth.js';
import {router as push} from './push.js';

const router = express.Router();

// 라우터 분리 작업 시작
//router.use('/login', login);
//router.use('/hyperv', hyperv);  이거 안 쓸꺼 같은디 흠;;
router.use('/licenses', licenses);
router.use('/downloads', downloads);
router.use('/otp', otp);
router.use('/integrations', integrations);
router.use('/apikeys', apikeys);
router.use('/auth', auth);
router.use('/push', push);

router.post('/:collection', PrdApiController.call.bind(PrdApiController));

export default router;

// 전체 데이터 반환
/* router.route('/hyperv/connect')
.get(controller.getHyperVConnect)
.put() */

// /hyperv/connect

// 안에 type 에 따라 분기
// method : put
