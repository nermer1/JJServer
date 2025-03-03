import express from 'express';

import HypervConnectedController from '../controller/HypervConnectedController.js';
import UnidocuLicenseController from '../controller/UnidocuLicenseController.js';
import PrdApiController from '../controller/PrdApiController.js';
import RdpDownloadController from '../controller/RdpDownloadController.js';
import GitHistoryDownloadController from '../controller/GitHistoryDownloadController.js';
import GoogleOtpController from '../controller/GoogleOtpController.js';
import LoginController from '../controller/LoginController.js';

const router = express.Router();

/**
 * 하이퍼브이 접속 정보 관련
 */
router.get('/hyperv/connect/init', HypervConnectedController.getHyperVConnect.bind(HypervConnectedController));
router.get('/hyperv/connect/update', HypervConnectedController.getHyperVUpdate.bind(HypervConnectedController));

/**
 * 유니다큐 암복호화 관련
 */
router.post('/license/encrypt/text', UnidocuLicenseController.getEncryptText.bind(UnidocuLicenseController));
router.post('/license/decrypt/text', UnidocuLicenseController.getDecryptText.bind(UnidocuLicenseController));
router.post('/license/encrypt/file', UnidocuLicenseController.getLicenseFile.bind(UnidocuLicenseController));

/**
 *
 */
router.post('/api/v1', PrdApiController.call.bind(PrdApiController));

// rdp 테스트
router.post('/rdp/download', RdpDownloadController.getFileDownload.bind(RdpDownloadController));

// git 이력 다운로드
router.post('/git/download', GitHistoryDownloadController.getFileDownload.bind(GitHistoryDownloadController));

// google otp 가져오기
router.post('/getOtpList', GoogleOtpController.getList.bind(GoogleOtpController));

// sse 테스트
router.get('/sse/hyperv', HypervConnectedController.test.bind(HypervConnectedController));

// 로그인 테스트
router.post('/login', LoginController.test.bind(LoginController));

export {router};

// 전체 데이터 반환
/* router.route('/hyperv/connect')
.get(controller.getHyperVConnect)
.put() */

// /hyperv/connect

// 안에 type 에 따라 분기
// method : put
