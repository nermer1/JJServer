import {Holiday} from '../schemas/holiday.js';
import {Users} from '../schemas/user.js';
import {UserHost} from '../schemas/userHost.js';
import {InterviewQuiz} from './InterviewQuiz.js';
import {InterviewQuizSubmit} from './InterviewQuizSubmit.js';

const schemas = {
    holiday: Holiday,
    users: Users,
    userHost: UserHost,
    interviewQuiz: InterviewQuiz,
    interviewQuizSubmit: InterviewQuizSubmit
};

export {schemas};
