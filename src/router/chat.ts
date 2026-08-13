/**
 * chat 라우터 - RAG 챗봇 엔드포인트
 * ------------------------------------------------------------------
 * POST /api/v1/chat
 *   body: { question: string, topK?: number, source?: string }
 *   res : { answer: string, sources: [{source, score, preview}], returnMessage }
 *
 * (/api/v1 하위라서 app.ts의 verifyApiToken 인증이 자동 적용됨)
 */
import express from 'express';
import RagChatService from '../service/ai/RagChatService.js';
import ChatHistoryService from '../service/ai/ChatHistoryService.js';
import {requirePermission} from '../middleware/permissionMiddleware.js';
import logger from '../utils/logger.js';

const router = express.Router();

// 챗봇 관련 모든 엔드포인트(질문/이력조회/초기화)는 'chatbot:use' 권한 보유자만 사용 가능.
// (상위 verifyApiToken 인증 후 실행 → req.user.permissions 검사. system:admin 은 자동 통과)
router.use(requirePermission('chatbot:use'));

router.post('/', async (req: express.Request, res: express.Response) => {
    try {
        const {question, topK, source} = (req.body || {}) as {question?: string; topK?: number; source?: string};

        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({returnErrorMessage: 'question(문자열)이 필요합니다.'});
        }

        // 사용자 식별은 오직 JWT(인증 토큰) 기준. (권한 미들웨어가 인증을 강제하므로 req.user 항상 존재)
        // → 기억(memory)도, DB 로깅(누가 질문)도 전부 이 JWT userId 로 자동 기록됨. 프론트가 임의 user 못 넣음.
        const userId = (req as any).user?.userId as string | undefined;
        const result = await RagChatService.ask(question, {topK, source, meta: {via: 'api', user: userId}});
        return res.json({...result, returnMessage: 'ok'});
    } catch (e: any) {
        logger.error(`[chat] 오류: ${e?.message || e}`);
        return res.status(500).json({returnErrorMessage: e?.message || '챗봇 처리 중 오류가 발생했습니다.'});
    }
});

/**
 * POST /api/v1/chat/history  — 챗봇 화면 진입 시 이전 대화 복원용 (JWT 유저의 대화 목록)
 *   res : { history: [{question, answer, ts}], returnMessage }
 */
router.post('/history', async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).user?.userId as string | undefined;
        if (!userId) {
            return res.status(401).json({returnErrorMessage: '인증 정보가 없습니다.'});
        }

        const history = await ChatHistoryService.list(userId);
        return res.json({history, returnMessage: 'ok'});
    } catch (e: any) {
        logger.error(`[chat] 이력 조회 오류: ${e?.message || e}`);
        return res.status(500).json({returnErrorMessage: e?.message || '대화 이력 조회 중 오류가 발생했습니다.'});
    }
});

/**
 * POST /api/v1/chat/reset  — "새 대화" 시작 시 JWT 유저의 대화 기억 초기화
 *   (프로젝트 컨벤션에 맞춰 DELETE 대신 POST 사용)
 */
router.post('/reset', async (req: express.Request, res: express.Response) => {
    try {
        const userId = (req as any).user?.userId as string | undefined;
        if (!userId) {
            return res.status(401).json({returnErrorMessage: '인증 정보가 없습니다.'});
        }

        const deleted = await ChatHistoryService.clear(userId);
        return res.json({deleted, returnMessage: 'ok'});
    } catch (e: any) {
        logger.error(`[chat] 이력 초기화 오류: ${e?.message || e}`);
        return res.status(500).json({returnErrorMessage: e?.message || '대화 이력 초기화 중 오류가 발생했습니다.'});
    }
});

export {router};

