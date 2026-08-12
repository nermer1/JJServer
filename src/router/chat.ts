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
import logger from '../utils/logger.js';

const router = express.Router();

router.post('/', async (req: express.Request, res: express.Response) => {
    try {
        const {question, topK, source} = (req.body || {}) as {question?: string; topK?: number; source?: string};

        if (!question || typeof question !== 'string' || !question.trim()) {
            return res.status(400).json({returnErrorMessage: 'question(문자열)이 필요합니다.'});
        }

        const result = await RagChatService.ask(question, {topK, source, meta: {via: 'api'}});
        return res.json({...result, returnMessage: 'ok'});
    } catch (e: any) {
        logger.error(`[chat] 오류: ${e?.message || e}`);
        return res.status(500).json({returnErrorMessage: e?.message || '챗봇 처리 중 오류가 발생했습니다.'});
    }
});

export {router};

