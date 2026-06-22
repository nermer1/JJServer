import express from 'express';
import RdpDownloadController from '../controller/RdpDownloadController.js';
import GitHistoryDownloadController from '../controller/GitHistoryDownloadController.js';
import UnidocuLicenseController from '../controller/UnidocuLicenseController.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

//router.post('/hyperv/rdp', RdpDownloadController.getFileDownload.bind(RdpDownloadController));
router.post('/git/history', requirePermission('utility:gitlog:read'), GitHistoryDownloadController.getFileDownload.bind(GitHistoryDownloadController));
router.post('/licenses/unidocu', requirePermission('utility:license:read'), UnidocuLicenseController.getLicenseFile.bind(UnidocuLicenseController));

export {router};
