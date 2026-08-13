/**
 * ChatHistoryService - 챗봇 단기 대화 기억 (개인별)
 * ------------------------------------------------------------------
 * 대화 1턴(질문+답변)을 chat_history 컬렉션에 저장하고,
 * 답변 생성 전 "그 사용자의 최근 N턴"을 불러와 프롬프트에 끼워넣는다.
 *
 * ⚠️ 벡터 임베딩 안 함. 최근 대화 원문을 그대로 프롬프트에 넣는 방식(단기 문맥).
 *    (과거 전체를 의미검색하는 "장기 기억"은 별도 — 지금은 불필요)
 *
 * 저장 단위: { user, question, answer, ts } 한 턴 = 문서 하나.
 * 조회: user로 최근 N턴 → user/assistant 메시지 배열로 펼쳐 반환.
 */
import mongoose from 'mongoose';
import type {ChatMessage} from './types.js';
import logger from '../../utils/logger.js';
import SystemSettingsCacheService from '../SystemSettingsCacheService.js';
import {AppSettings, AppSettingsSchema} from '../../constants/appSettings.js';

const COLLECTION = 'chat_history';

/**
 * 프롬프트에 주입할 "최근 대화 턴 수"를 동적으로 결정.
 * resolve()가 DB(캐시) → env → 레지스트리 기본값 순으로 처리. 값이 숫자가 아니거나 0이하면 기본값.
 * → 재배포 없이 DB 설정(CHAT_HISTORY_TURNS)만 바꿔서 기억 길이를 조절할 수 있다.
 */
function resolveTurns(): number {
    return Number(SystemSettingsCacheService.resolve(AppSettings.CHAT_HISTORY_TURNS)); // DB → env → 스키마 기본값 자동
}

class ChatHistoryService {
    /** user의 최근 N턴을 시간순(오래된→최신) ChatMessage[] 로 반환. turns 미지정 시 DB 설정값 사용. user 없으면 빈 배열. */
    static async recent(user?: string, turns = resolveTurns()): Promise<ChatMessage[]> {
        if (!user) return [];
        const db: any = mongoose.connection.db;
        if (!db) return [];

        try {
            const rows = await db.collection(COLLECTION).find({user}).sort({ts: -1}).limit(turns).toArray();
            rows.reverse(); // 최신순으로 가져와서 → 시간순으로 뒤집기

            const messages: ChatMessage[] = [];
            for (const r of rows) {
                if (r.question) messages.push({role: 'user', content: String(r.question)});
                if (r.answer) messages.push({role: 'assistant', content: String(r.answer)});
            }
            return messages;
        } catch (e: any) {
            logger.warn(`[ChatHistory] 대화 이력 조회 실패(${user}): ${e?.message || e}`);
            return [];
        }
    }

    /**
     * 화면 표시용: 그 사용자의 저장된 대화를 시간순(오래된→최신)으로 반환.
     * recent()(최대 5턴, 프롬프트 주입용)와 달리, 진입 시 대화 복원용이라 넉넉히(기본 200턴) 준다.
     * "새 대화"(reset)로 비워지므로 = 사실상 "현재 진행 중인 대화" 전체.
     */
    static async list(user?: string, limit = 200): Promise<Array<{question: string; answer: string; ts: Date}>> {
        if (!user) return [];
        const db: any = mongoose.connection.db;
        if (!db) return [];

        try {
            const rows = await db.collection(COLLECTION).find({user}).sort({ts: 1}).limit(limit).toArray();
            return rows.map((r: any) => ({question: r.question, answer: r.answer, ts: r.ts}));
        } catch (e: any) {
            logger.warn(`[ChatHistory] 대화 이력 목록 조회 실패(${user}): ${e?.message || e}`);
            return [];
        }
    }

    /** 그 사용자의 대화 이력 전체 삭제 ("새 대화" 시작용). 삭제된 건수 반환. */
    static async clear(user?: string): Promise<number> {
        if (!user) return 0;
        const db: any = mongoose.connection.db;
        if (!db) return 0;

        try {
            const res = await db.collection(COLLECTION).deleteMany({user});
            return res.deletedCount ?? 0;
        } catch (e: any) {
            logger.warn(`[ChatHistory] 대화 이력 삭제 실패(${user}): ${e?.message || e}`);
            return 0;
        }
    }

    /** 대화 한 턴 저장. user 없으면(익명) 저장 생략. 실패해도 흐름 안 막음. */
    static async save(user: string | undefined, question: string, answer: string): Promise<void> {
        if (!user) return;
        const db: any = mongoose.connection.db;
        if (!db) return;

        try {
            await db.collection(COLLECTION).insertOne({user, question, answer, ts: new Date()});
        } catch (e: any) {
            logger.warn(`[ChatHistory] 대화 이력 저장 실패(${user}): ${e?.message || e}`);
        }
    }
}

export default ChatHistoryService;

