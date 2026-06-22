import express from 'express';
import UnidocuLicenseController from '../controller/UnidocuLicenseController.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.post('/unidocu/aes/encrypt', requirePermission('utility:license:read'), UnidocuLicenseController.getEncryptText.bind(UnidocuLicenseController));
router.post('/unidocu/aes/decrypt', requirePermission('utility:license:read'), UnidocuLicenseController.getDecryptText.bind(UnidocuLicenseController));

export {router};
