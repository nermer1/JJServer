/**
 * appSettings.ts — 앱 설정 레지스트리 (Single Source of Truth)
 * ==================================================================================
 * 구조:
 *   - AppSettingsSchema : "키 → {default, required, desc}" 메타 (오브젝트 키 = 실제 DB/env 키)
 *                         resolve()/validateRequired() 가 내부에서 참조해 기본값·필수여부를 해석한다.
 *   - AppSettings       : "이름 → 키 문자열" 상수. 호출부가 넘기는 값.
 *                         AppSettings.CHAT_HISTORY_TURNS === 'CHAT_HISTORY_TURNS'
 *
 * 사용 (get/getRequired/resolve 모두 "키"를 받으므로 .key 없이 통일):
 *   SystemSettingsCacheService.resolve(AppSettings.CHAT_HISTORY_TURNS)   // DB→env→default 자동
 *   SystemSettingsCacheService.getRequired(AppSettings.JWT_SECRET)       // raw 필수
 *   SystemSettingsCacheService.get(AppSettings.RAG_INDEX)                // raw 캐시
 *
 * required:true 항목은 부팅 시 SystemSettingsCacheService.validateRequired()로 일괄 검증(fail-fast).
 * 새 설정은 AppSettingsSchema 에만 추가하면 AppSettings 는 자동 파생된다.
 * ⚠️ 이 파일은 아무것도 import 하지 않는 순수 데이터 모듈(leaf) → 순환참조 없음.
 */
export interface AppSettingMeta {
    /** 선택 설정의 기본값 (미설정 시 사용). required 항목은 보통 생략. */
    default?: string;
    /** true면 부팅 시 필수 검증 대상 — DB/env 어디에도 없으면 앱 기동 실패(fail-fast). */
    required?: boolean;
    /** 설명 (문서/온보딩용). */
    desc: string;
}

// 스키마: 오브젝트 "키"가 곧 실제 DB/env 설정 키다. (아래는 시드 — 나머지도 이 형식으로 채우면 됨)
export const AppSettingsSchema = {
    // SMTP
    SMTP_HOST: {required: true, default: '', desc: 'smtp 서버 주소'},
    SMTP_PORT: {required: true, default: '', desc: 'smtp 서버 포트'},
    SMTP_USER: {required: true, default: '', desc: 'smtp 메일 발송 계정 아이디'},
    SMTP_PASS: {required: true, default: '', desc: 'smtp 서버 비밀번호'},

    // FILE SYSTEM
    FILE_UPLOAD_PATH: {required: true, default: '/', desc: '파일 업로드 경로'},
    MAX_UPLOAD_FILE_SIZE_MB: {default: '10', desc: '최대 업로드 파일 크기(MB)'},

    // JWT
    JWT_SECRET: {required: true, desc: 'JWT 서명 시크릿 (필수 — 없으면 부팅 실패)'},

    // LLM provider 선택
    CHAT_PROVIDER: {default: 'gemini', desc: '답변 생성 provider (openai|gemini|vertex)'},
    EMBEDDING_PROVIDER: {default: 'gemini', desc: '임베딩 provider (openai|gemini|vertex)'},

    // ── OpenAI ──
    OPENAI_API_KEY: {desc: 'OpenAI API 키'},
    OPENAI_CHAT_MODEL: {default: 'gpt-4o-mini', desc: 'OpenAI 채팅 모델'},
    OPENAI_EMBEDDING_MODEL: {default: 'text-embedding-3-small', desc: 'OpenAI 임베딩 모델'},

    // ── Gemini ──
    GEMINI_API_KEY: {desc: 'Gemini API 키'},
    GEMINI_CHAT_MODEL: {default: 'gemini-3.5-flash', desc: 'Gemini 채팅 모델'},
    GEMINI_EMBEDDING_MODEL: {default: 'gemini-embedding-2', desc: 'Gemini 임베딩 모델'},

    // ── Vertex (인증은 GOOGLE_APPLICATION_CREDENTIALS(env)) ──
    VERTEX_PROJECT_ID: {desc: 'Vertex GCP 프로젝트 ID'},
    VERTEX_LOCATION: {default: 'us-central1', desc: 'Vertex 기본 리전 (임베딩·챗 공통 기본값)'},
    VERTEX_CHAT_LOCATION: {default: 'global', desc: 'Vertex 채팅 전용 리전 override (예: global). 비우면 VERTEX_LOCATION 사용'},
    VERTEX_CHAT_MODEL: {default: 'gemini-3.5-flash', desc: 'Vertex 채팅 모델'},
    VERTEX_EMBED_MODEL: {default: 'text-multilingual-embedding-002', desc: 'Vertex 임베딩 모델'},

    // ── RAG / 벡터 ──
    RAG_COLLECTION: {default: 'rag_vectors', desc: '벡터 저장 컬렉션'},
    RAG_INDEX: {default: 'rag_vector_index', desc: 'Atlas 벡터 인덱스 이름'},
    RAG_EMBED_DIM: {default: '768', desc: '임베딩 차원 (인덱스 numDimensions와 일치)'},
    RAG_MIN_SCORE: {default: '0', desc: '벡터검색 최소 유사도(0~1). 이 값 미만 결과는 버림(무관한 질문 환각 방지). 0=끄기. 로그의 score 보고 튜닝'},

    // ── Langfuse ──
    LANGFUSE_HOST: {desc: 'Langfuse self-host 호스트'},
    LANGFUSE_PUBLIC_KEY: {desc: 'Langfuse public key'},
    LANGFUSE_SECRET_KEY: {desc: 'Langfuse secret key'},
    LANGFUSE_PROMPT_LABEL: {default: 'production', desc: '가져올 프롬프트 라벨'},
    LANGFUSE_PROMPT_CACHE_TTL: {default: '60', desc: '프롬프트 캐시 TTL(초)'},

    // ── 챗봇 ──
    CHAT_HISTORY_TURNS: {default: '10', desc: '프롬프트에 넣을 최근 대화 턴 수'},

    // ── 외부 연동 ──
    // 슬랙
    SLACK_CLIENT_ID: {required: true, desc: ''},
    SLACK_CLIENT_SECRET: {required: true, desc: ''},
    SLACK_REDIRECT_URI: {required: true, desc: ''},
    SLACK_TOKEN: {required: true, desc: '슬랙 봇 토큰'},
    SLACK_SIGNING_SECRET: {required: true, desc: '슬랙 앱 서명 시크릿'},

    // 깃랩
    GITLAB_PAK: {required: true, desc: ''},

    // 위키
    OUTLINE_WIKI_TOKEN: {required: true, desc: ''},
    OUTLINE_BASE_URL: {required: true, desc: ''},

    // 인사 정보 동기화
    HR_API_USERS_URL: {required: true, desc: '인사(HR) 유저 동기화 API URL'},
    HR_API_DEPARTMENTS_URL: {required: true, desc: ''}
} as const satisfies Record<string, AppSettingMeta>;

/** 설정 키(=스키마의 오브젝트 키)들의 유니온. 예: 'CHAT_HISTORY_TURNS' | 'JWT_SECRET' | ... */
export type SettingKey = keyof typeof AppSettingsSchema;

/**
 * 호출부용 키 상수. AppSettings.CHAT_HISTORY_TURNS === 'CHAT_HISTORY_TURNS'.
 * 스키마 키에서 자동 파생 → 스키마에만 추가하면 여기 자동 반영(중복 관리 X).
 */
export const AppSettings = Object.fromEntries(Object.keys(AppSettingsSchema).map((k) => [k, k])) as {
    readonly [K in SettingKey]: K;
};
