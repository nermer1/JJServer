import express from 'express';
import HypervConnectedController from '../controller/HypervConnectedController.js';

const router = express.Router();

router.get('/connect/list', HypervConnectedController.getHyperVConnect.bind(HypervConnectedController));
router.get('/connect/update', HypervConnectedController.getHyperVUpdate.bind(HypervConnectedController));
router.get('/sse', HypervConnectedController.test.bind(HypervConnectedController));

export {router};
