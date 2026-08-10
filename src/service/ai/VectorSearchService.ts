/**
 * VectorSearchService - rag_vectors 콜렉션 벡터 검색 (앱 런타임용)
 * ------------------------------------------------------------------
 * 이미 연결된 mongoose 커넥션을 그대로 사용한다. ($vectorSearch aggregation)
 */
import mongoose from 'mongoose';

const TARGET_COLLECTION = process.env.RAG_COLLECTION || 'rag_vectors';
const INDEX_NAME = process.env.RAG_INDEX || 'rag_vector_index';

export interface VectorHit {
    source: string;
    text: string;
    score: number;
    metadata?: Record<string, unknown>;
}

export interface VectorSearchOptions {
    topK?: number;
    source?: string; // 특정 source(예: 'interviewQuiz', 'wiki')만 검색
}

class VectorSearchService {
    /** 질문 벡터로 유사 문서 top-k 검색 */
    static async search(queryVector: number[], options: VectorSearchOptions = {}): Promise<VectorHit[]> {
        const topK = options.topK ?? 5;

        // mongoose 커넥션의 native db 핸들 (앱 부팅 시 connect 되어 있음)
        const db: any = mongoose.connection.db;
        if (!db) throw new Error('[VectorSearchService] MongoDB 연결이 아직 준비되지 않았습니다.');

        const vectorStage: any = {
            index: INDEX_NAME,
            path: 'embedding',
            queryVector,
            numCandidates: Math.max(100, topK * 20),
            limit: topK
        };
        if (options.source) vectorStage.filter = {source: options.source};

        const rows: any[] = await db
            .collection(TARGET_COLLECTION)
            .aggregate([
                {$vectorSearch: vectorStage},
                {$project: {_id: 0, source: 1, text: 1, metadata: 1, score: {$meta: 'vectorSearchScore'}}}
            ])
            .toArray();

        return rows as VectorHit[];
    }
}

export default VectorSearchService;
