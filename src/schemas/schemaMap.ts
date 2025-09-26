import {Holiday} from '../schemas/holiday.js';
import {Users} from '../schemas/user.js';
import {UserHost} from '../schemas/userHost.js';
import {InterviewQuiz} from './interviewQuiz.js';
import {InterviewQuizSubmit} from './interviewQuizSubmit.js';
import {InterviewQuizTypes} from './interviewQuizTypes.js';
import {CustomerList} from './customerList.js';
import {CustomerEtc} from './customerEtc.js';
import {Department} from './Department.js';

const schemas = {
    holiday: Holiday,
    users: Users,
    userHost: UserHost,
    department: Department,
    interviewQuiz: InterviewQuiz,
    interviewQuizSubmit: InterviewQuizSubmit,
    interviewQuizTypes: InterviewQuizTypes,
    customerList: CustomerList,
    customerEtc: CustomerEtc
};

export {schemas};
