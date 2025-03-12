import express from 'express';
import LoginController from '../controller/LoginController.js';

const router = express.Router();

router.post('/auth/token', LoginController.test.bind(LoginController));

export {router};
