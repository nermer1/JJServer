import express from 'express';
import UserController from '../controller/UserController.js';

const router = express.Router();

// GET /api/v1/user/me
router.get('/me', UserController.getMe.bind(UserController));

export {router};
