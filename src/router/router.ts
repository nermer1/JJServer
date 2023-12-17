import express from 'express';
import hyperv from '../controller/hypervConnectedController.js';
import license from '../controller/unidocuLicenseController.js';
import db from '../controller/apiController.js';
const router = express.Router();

/**
 * 하이퍼브이 접속 정보 관련
 */
router.get('/hyperv/connect/init', hyperv.getHyperVConnect);
router.get('/hyperv/connect/update', hyperv.getHyperVUpdate);

/**
 * 유니다큐 암복호화 관련
 */
router.post('/license/encrypt/text', license.getEncryptText);
router.post('/license/decrypt/text', license.getDecryptText);
router.post('/license/encrypt/file', license.getLicenseFile);

/**
 *
 */
router.post('/api/v1', db.call);

export {router};

// 전체 데이터 반환
/* router.route('/hyperv/connect')
.get(controller.getHyperVConnect)
.put() */

// /hyperv/connect

// 안에 type 에 따라 분기
// method : put
