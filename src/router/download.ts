import express from 'express';
import RdpDownloadController from '../controller/RdpDownloadController.js';
import GitHistoryDownloadController from '../controller/GitHistoryDownloadController.js';

const router = express.Router();

/**
 *
 */

router.post('/rdp', RdpDownloadController.getFileDownload.bind(RdpDownloadController));
router.post('/git', GitHistoryDownloadController.getFileDownload.bind(GitHistoryDownloadController));

export {router};
