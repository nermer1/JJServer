import express from 'express';
import ApiKeyController from '../controller/ApiKeyController.js';

const router = express.Router();

router.post('/', ApiKeyController.issueKey.bind(ApiKeyController));
router.get('/', ApiKeyController.listKeys.bind(ApiKeyController));
router.put('/:key/revoke', ApiKeyController.revokeKey.bind(ApiKeyController));

export {router};
