import express from 'express';
import UnidocuLicenseController from '../controller/UnidocuLicenseController.js';

const router = express.Router();

router.post('/unidocu/aes/encrypt', UnidocuLicenseController.getEncryptText.bind(UnidocuLicenseController));
router.post('/unidocu/aes/decrypt', UnidocuLicenseController.getDecryptText.bind(UnidocuLicenseController));

export {router};
