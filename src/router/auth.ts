import express from 'express';
import LoginController from '../controller/LoginController.js';

const router = express.Router();

router.post('/login', LoginController.test.bind(LoginController));
router.post('/refresh', LoginController.refresh.bind(LoginController));

export {router};

