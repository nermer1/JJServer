import express from 'express';

import PrdApiController from '../controller/PrdApiController.js';
import {genericCrudPermission} from '../middleware/genericCrudPermission.js';
import {router as licenses} from './licenses.js';
import {router as hyperv} from './hyperv.js';
import {router as downloads} from './downloads.js';
import {router as otp} from './otp.js';
import {router as integrations} from './integrations.js';
import {router as auth} from './auth.js';
import {router as push} from './push.js';
import {router as user} from './user.js';

const router = express.Router();

// 라우터 분리 작업 시작
//router.use('/login', login);
router.use('/hyperv', hyperv);
router.use('/licenses', licenses);
router.use('/downloads', downloads);
router.use('/otp', otp);
router.use('/integrations', integrations);
router.use('/auth', auth);
router.use('/push', push);
router.use('/user', user);

router.post('/:collection', genericCrudPermission, PrdApiController.call.bind(PrdApiController));

export default router;

// 전체 데이터 반환
/* router.route('/hyperv/connect')
.get(controller.getHyperVConnect)
.put() */

// /hyperv/connect

// 안에 type 에 따라 분기
// method : put
