import express from 'express';
import UnidocuLicenseController from '../controller/UnidocuLicenseController.js';

const router = express.Router();

router.post('/encrypt/text', UnidocuLicenseController.getEncryptText.bind(UnidocuLicenseController));
router.post('/decrypt/text', UnidocuLicenseController.getDecryptText.bind(UnidocuLicenseController));
router.post('/encrypt/file', UnidocuLicenseController.getLicenseFile.bind(UnidocuLicenseController));

export {router};
