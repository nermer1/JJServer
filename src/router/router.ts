import express from 'express';

import PrdApiController from '../controller/PrdApiController.js';
import {genericCrudPermission} from '../middleware/genericCrudPermission.js';
import {userCrudPermission, roleCrudPermission, permissionCrudPermission, apiKeyCrudPermission} from '../middleware/domainPermissions.js';
import {router as licenses} from './licenses.js';
import {router as hyperv} from './hyperv.js';
import {router as downloads} from './downloads.js';

import {router as integrations} from './integrations.js';
import {router as auth} from './auth.js';
import {router as push} from './push.js';

import {router as permission} from './permission.js';
import {router as system} from './system.js';
import {router as files} from './files.js';
import {router as chat} from './chat.js';
import {RegisterRoutes} from '../routes/routes.js';

import UserController from '../controller/UserController.js';
import RoleController from '../controller/RoleController.js';
import PermissionController from '../controller/PermissionController.js';
import ApiKeyController from '../controller/ApiKeyController.js';

const router = express.Router();

// 라우터 분리 작업 시작
//router.use('/login', login);
router.use('/hyperv', hyperv);
router.use('/licenses', licenses);
router.use('/downloads', downloads);

router.use('/integrations', integrations);
router.use('/auth', auth);
//router.use('/push', push);

router.use('/permission', permission);
router.use('/system', system);
router.use('/files', files);
router.use('/chat', chat);

// 핵심 도메인 전용 요청 가로채기 (정규식 매칭)
router.post('/:collection(users)', userCrudPermission, UserController.call.bind(UserController));
router.post('/:collection(role)', roleCrudPermission, RoleController.call.bind(RoleController));
router.post('/:collection(permission)', permissionCrudPermission, PermissionController.call.bind(PermissionController));
router.post('/:collection(apiKeys)', apiKeyCrudPermission, ApiKeyController.call.bind(ApiKeyController));

router.post('/:collection', genericCrudPermission, PrdApiController.call.bind(PrdApiController));

// tsoa 기반 자동 생성 라우트 등록
RegisterRoutes(router);

export default router;

// 전체 데이터 반환
/* router.route('/hyperv/connect')
.get(controller.getHyperVConnect)
.put() */

// /hyperv/connect

// 안에 type 에 따라 분기
// method : put
