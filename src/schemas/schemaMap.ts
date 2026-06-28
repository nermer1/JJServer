import {Holiday} from '../schemas/holiday.js';
import {Users} from './users.js';
import {UserHost} from '../schemas/userHost.js';
import {InterviewQuiz} from './interviewQuiz.js';
import {InterviewQuizSubmit} from './interviewQuizSubmit.js';
import {InterviewQuizTypes} from './interviewQuizTypes.js';
import {CustomerList} from './customerList.js';
import {CustomerEtc} from './customerEtc.js';
import {Department} from './department.js';
import {Permission} from './permission.js';
import {Role} from './role.js';
import {ApiKeys} from './apiKeys.js';
import {SystemSettings} from './systemSettings.js';
import {AuditLog} from './auditLog.js';

const schemas = {
    holiday: Holiday,
    users: Users,
    userHost: UserHost,
    department: Department,
    interviewQuiz: InterviewQuiz,
    interviewQuizSubmit: InterviewQuizSubmit,
    interviewQuizTypes: InterviewQuizTypes,
    customerList: CustomerList,
    customerEtc: CustomerEtc,
    permission: Permission,
    role: Role,
    apiKeys: ApiKeys,
    systemSettings: SystemSettings,
    auditLog: AuditLog
};

export {schemas};
