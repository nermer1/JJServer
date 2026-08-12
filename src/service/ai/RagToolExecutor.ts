/**
 * RagToolExecutor - 랭퓨즈 config의 도구 정의를 실제로 실행하는 범용 실행기
 * ------------------------------------------------------------------
 * 핵심 아이디어: "어떤 컬렉션·필드를 어떻게 조회할지"를 코드에 박지 않고
 *   랭퓨즈 프롬프트 config의 각 tool.query 블록에 둔다. → 새 검색 추가 = config 한 줄.
 *
 * tool 예시(config 안):
 *   {
 *     "name": "findPeopleByBirthday",
 *     "description": "생일(월/일)로 사람을 찾는다. date는 MMDD (예: 1107)",
 *     "parameters": { "type":"object", "properties": { "date": {"type":"string"} }, "required":["date"] },
 *     "query": { "collection":"users", "field":"birthDate", "argKey":"date", "transform":"MMDD",
 *                "projection":["name","department","birthDate"], "limit":20 }
 *   }
 *   // 벡터검색 도구:
 *   { "name":"searchDocs", "description":"일반 의미 기반 사내 자료 검색",
 *     "parameters":{"type":"object","properties":{"query":{"type":"string"}},"required":["query"]},
 *     "query": { "type":"vector", "argKey":"query", "topK":5 } }
 *
 * ⚠️ query 블록은 LLM에게 넘기지 않는다(서버 내부 실행 정보). LLM에는 name/description/parameters 만 전달.
 */
import mongoose from 'mongoose';
import VectorSearchService from './VectorSearchService.js';
import logger from '../../utils/logger.js';
import type {EmbeddingProvider, ToolExecutor} from './types.js';

export interface ToolQuerySpec {
    type?: 'mongo' | 'vector' | 'aggregate'; // 기본 'mongo'
    collection?: string;
    /** 단순 정확일치용. filter 가 있으면 무시됨. */
    field?: string;
    argKey?: string; // args에서 값을 꺼낼 키 (기본: field, vector면 'query')
    /** 임의 Mongo 필터. 문자열 "{{키}}" 는 LLM 인자로 치환됨. (부등호/exists/전체조회 등 가능) */
    filter?: Record<string, any>;
    /**
     * aggregate 전용. 임의 Mongo 집계 파이프라인. 문자열 "{{키}}" 는 LLM 인자로 치환됨.
     * 다른 컬렉션 조인($lookup)이 필요한 질문(예: "2팀이 관리하는 업체")에 사용.
     * ⚠️ 파이프라인은 서버가 config에서 정의 → LLM은 인자(값)만 채움. 임의 파이프라인 주입 불가.
     */
    pipeline?: any[];
    transform?: 'MMDD' | 'digits' | 'nospace' | 'none';
    projection?: string[];
    limit?: number;
    topK?: number; // vector 전용
}

export interface ToolDef {
    name: string;
    description?: string;
    parameters?: Record<string, any>;
    query?: ToolQuerySpec;
}

/** 인자 값 정규화. 예: "11월 7일" / "11/7" / "1107" → "1107" (MMDD) */
function transformValue(value: any, transform?: string): any {
    if (value === null || value === undefined) return value;
    const s = String(value).trim();
    if (transform === 'nospace') return s.replace(/\s+/g, ''); // "2 팀" → "2팀" (공백 변형 흡수)
    if (transform === 'digits') return s.replace(/[^0-9]/g, '');
    if (transform === 'MMDD') {
        const nums = s.match(/\d+/g) || [];
        if (nums.length >= 2) {
            // "11월 7일", "11/7", "11-07" → 월/일을 각각 2자리로 패딩
            const mm = nums[0]!.padStart(2, '0').slice(-2);
            const dd = nums[1]!.padStart(2, '0').slice(-2);
            return mm + dd;
        }
        return s.replace(/\D/g, ''); // 숫자만 (이미 "1107" 같은 형태면 그대로)
    }
    return s;
}

/**
 * filter 객체 안의 "{{키}}" 문자열을 LLM 인자(args) 값으로 치환한다(재귀).
 * 문자열 전체가 "{{키}}" 인 경우만 치환 → 부분 치환/오염 방지.
 */
function substitute(node: any, args: Record<string, any>, transform?: string): any {
    if (typeof node === 'string') {
        const m = node.match(/^\{\{\s*(\w+)\s*\}\}$/);
        if (m) {
            const val = args[m[1]];
            return transform ? transformValue(val, transform) : val;
        }
        return node;
    }
    if (Array.isArray(node)) return node.map((x) => substitute(x, args, transform));
    if (node && typeof node === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(node)) out[k] = substitute(v, args, transform);
        return out;
    }
    return node;
}

/**
 * config의 tool 목록 + 임베더로 "이름→실행" 콜백(ToolExecutor)을 만든다.
 * LLM이 도구를 호출하면 이 콜백이 해당 tool의 query 스펙대로 Mongo/벡터검색을 수행한다.
 */
export function buildToolExecutor(tools: ToolDef[], embedder: EmbeddingProvider): ToolExecutor {
    const byName = new Map(tools.map((t) => [t.name, t]));

    return async (name, args) => {
        const spec = byName.get(name);
        if (!spec || !spec.query) return {error: `알 수 없는 도구: ${name}`};

        const q = spec.query;
        const db: any = mongoose.connection.db;
        if (!db) return {error: 'MongoDB 연결이 준비되지 않았습니다.'};

        // 1) 벡터 검색 도구
        if (q.type === 'vector') {
            const text = String(args[q.argKey ?? 'query'] ?? '');
            const vec = await embedder.embed(text, 'query');
            const hits = await VectorSearchService.search(vec, {topK: q.topK ?? 5});
            logger.info(`[RagTool] ${name}(vector): "${text}" → ${hits.length}건`);
            return hits.map((h) => h.text);
        }

        // 2) 집계(aggregate) 도구 — 조인($lookup) 등 컬렉션 간 조회
        if (q.type === 'aggregate') {
            if (!q.collection) return {error: `도구(${name})의 query에 collection이 필요합니다.`};
            if (!Array.isArray(q.pipeline)) return {error: `도구(${name})의 aggregate query에 pipeline 배열이 필요합니다.`};

            const pipeline = substitute(q.pipeline, args, q.transform); // {{인자}} 치환
            // config에 별도 $limit 이 없으면 안전상한을 뒤에 붙인다 (전체조회 폭주 방지)
            const hasLimit = pipeline.some((st: any) => st && typeof st === 'object' && '$limit' in st);
            const finalPipeline = hasLimit ? pipeline : [...pipeline, {$limit: q.limit ?? 100}];

            const rows = await db.collection(q.collection).aggregate(finalPipeline).toArray();
            logger.info(`[RagTool] ${name}(aggregate): ${q.collection} ${JSON.stringify(pipeline)} → ${rows.length}건`);
            return rows;
        }

        // 3) Mongo 검색 도구
        if (!q.collection) return {error: `도구(${name})의 query에 collection이 필요합니다.`};

        // filter(임의 조건) 우선, 없으면 field=value 정확일치로 폴백
        let mongoFilter: Record<string, any>;
        if (q.filter && typeof q.filter === 'object') {
            mongoFilter = substitute(q.filter, args, q.transform); // {{인자}} 치환
        } else if (q.field) {
            const argKey = q.argKey ?? q.field;
            mongoFilter = {[q.field]: transformValue(args[argKey], q.transform)};
        } else {
            return {error: `도구(${name})의 query에 filter 또는 field가 필요합니다.`};
        }

        const projection: Record<string, number> = {_id: 0};
        if (q.projection && q.projection.length) q.projection.forEach((f) => (projection[f] = 1));

        const rows = await db
            .collection(q.collection)
            .find(mongoFilter, {projection})
            .limit(q.limit ?? 20)
            .toArray();

        logger.info(`[RagTool] ${name}(mongo): ${q.collection} ${JSON.stringify(mongoFilter)} → ${rows.length}건`);
        return rows;
    };
}
