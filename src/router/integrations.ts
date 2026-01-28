import express from 'express';
import SlackController from '../controller/SlackController.js';

const router = express.Router();

router.post('/slack/commands', SlackController.commands.bind(SlackController));
router.post('/slack/interactivity', SlackController.interactivity.bind(SlackController));

export {router};
