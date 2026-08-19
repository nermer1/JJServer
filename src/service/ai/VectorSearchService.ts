/**
 * VectorSearchService - rag_vectors 콜렉션 벡터 검색 (앱 런타임용)
 * ------------------------------------------------------------------
 * 이미 연결된 mongoose 커넥션을 그대로 사용한다. ($vectorSearch aggregation)
 */
import MongoDB from '../../db/MongoDB.js';
import {AppSettings} from '../../constants/appSettings.js';
import SystemSettingsCacheService from '../SystemSettingsCacheService.js';
import logger from '../../utils/logger.js';

export interface VectorHit {
    source: string;
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
}

export interface VectorSearchOptions {
    topK?: number;
    source?: string; // 특정 source(예: 'interviewQuiz', 'wiki')만 검색
    /** 최소 유사도. 이 값 미만 결과는 버린다. 미지정 시 RAG_MIN_SCORE 설정값(기본 0=끔). */
    minScore?: number;
}

class VectorSearchService {
    /** 질문 벡터로 유사 문서 top-k 검색 */
    static async search(queryVector: number[], options: VectorSearchOptions = {}): Promise<VectorHit[]> {
        const topK = options.topK ?? 5;

        // ⚠️ 설정은 "호출 시점"에 읽는다. 모듈 로드 시점엔 loadSettings() 전이라 기본값으로 굳어버리기 때문.
        const targetCollection = SystemSettingsCacheService.resolve(AppSettings.RAG_COLLECTION);
        const indexName = SystemSettingsCacheService.resolve(AppSettings.RAG_INDEX);

        const db = MongoDB.getDb();

        const vectorStage: any = {
            index: indexName,
            path: 'embedding',
            queryVector,
            numCandidates: Math.max(100, topK * 20),
            limit: topK
        };
        if (options.source) vectorStage.filter = {source: options.source};

        const rows: any[] = await db
            .collection(targetCollection)
            .aggregate([{$vectorSearch: vectorStage}, {$project: {_id: 0, source: 1, text: 1, metadata: 1, score: {$meta: 'vectorSearchScore'}}}])
            .toArray();

        // 최소 유사도(임계값): 미지정 시 RAG_MIN_SCORE 설정값(기본 0=끔).
        const minScore = options.minScore ?? (Number(SystemSettingsCacheService.resolve(AppSettings.RAG_MIN_SCORE)) || 0);

        // 점수 로깅 — 임계값 튜닝용. 무관한 질문이 어떤 점수대로 걸리는지 여기서 확인한다.
        logger.info(`[VectorSearch] top${topK} scores=[${rows.map((r) => (r.score ?? 0).toFixed(3)).join(', ')}] minScore=${minScore}`);

        if (minScore > 0) {
            const filtered = rows.filter((r) => (r.score ?? 0) >= minScore);
            if (filtered.length < rows.length) {
                logger.info(`[VectorSearch] 임계값 컷: ${rows.length}건 → ${filtered.length}건 (< ${minScore} 제거)`);
            }
            return filtered as VectorHit[];
        }

        return rows as VectorHit[];
    }
}

export default VectorSearchService;

