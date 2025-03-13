import express from 'express';
import RdpDownloadController from '../controller/RdpDownloadController.js';
import GitHistoryDownloadController from '../controller/GitHistoryDownloadController.js';
import UnidocuLicenseController from '../controller/UnidocuLicenseController.js';

const router = express.Router();

router.post('/hyperv/rdp', RdpDownloadController.getFileDownload.bind(RdpDownloadController));
router.post('/git/history', GitHistoryDownloadController.getFileDownload.bind(GitHistoryDownloadController));
router.post('/licenses/unidocu', UnidocuLicenseController.getLicenseFile.bind(UnidocuLicenseController));

export {router};
