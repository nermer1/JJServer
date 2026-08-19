/**
 * searchText - customerEtc 문서를 "검색 전용 평문 문자열"로 펼친다 (챗봇 keyword 검색용)
 * ==================================================================
 * 왜: "우남 증빙 쓰는 업체" 같은 질문은 값이 info.data.tables(시트) 안 깊이 중첩돼 있어
 *     일반 조회로 못 찾는다. → 문서 전체를 한 문자열(searchText)로 만들어 regex 한 줄로 검색.
 *
 * ⚠️ 제외 (외부 LLM(Vertex/구글)로 새면 안 되는 값 + 노이즈):
 *   - 정확 키 일치:  history(이력), searchText(자기 자신), _id/__v/embedding/__rid/ts/createdAt/updatedAt
 *   - 키 "부분일치"(변형 차단): secret, password, passwd, pass, pw, 비밀번호, 패스워드, 암호, 비번
 *     → otp.secret(구글 OTP 시크릿), 시트의 비밀번호 컬럼 등이 여기서 걸러진다.
 *
 * 사용: customer CRUD(저장 시 자동 갱신) + build-search-text.mjs(기존분 일괄 backfill) 공용.
 * ⚠️ 비번류 컬럼명이 새로 생기면 SECRET_PATTERN에 추가할 것.
 * ==================================================================
 */

// 정확히 일치하면 제외할 키 (이력 + 구조/타임스탬프 노이즈 + 자기 자신)
const EXACT_SKIP = new Set(['_id', '__v', 'embedding', '__rid', 'ts', 'history', 'searchText', 'createdAt', 'updatedAt']);
// 키 이름에 포함되면 제외할 "비밀번호/시크릿" 패턴 (대소문자 무시, 부분일치 → PC비밀번호/SSH_pw 등 변형까지 차단)
const SECRET_PATTERN = /secret|password|passwd|pass|pw|비밀번호|패스워드|암호|비번/i;

/** 이 키를 검색 텍스트에서 제외할지 */
export function shouldSkip(key: string): boolean {
    const k = String(key);
    return EXACT_SKIP.has(k) || SECRET_PATTERN.test(k);
}

// 값 "안"에 박힌 비번 마스킹용: "PW: 값" / "비밀번호=값" 형태의 "값 부분"만 [보안상 제외]로 치환.
// (키 이름이 무난해서 shouldSkip을 못 피한 경우 대비 — 예: 한 셀에 "ID: x  PW: y  IP: z" 통짜 저장)
// 라벨/구분자(: 또는 =)는 남기고, 뒤의 공백 아닌 토큰(=비번값)만 가린다. ID/IP 등은 그대로 유지.
const SECRET_VALUE_PATTERN = /(secret|password|passwd|pass|pw|비밀번호|패스워드|암호|비번)(\s*[:=]\s*)(\S+)/gi;

/** 값 문자열에서 비번류 값만 마스킹 */
function maskSecrets(text: string): string {
    return text.replace(SECRET_VALUE_PATTERN, '$1$2[보안상 제외]');
}

/** 순수 중첩 객체인지 (Date/ObjectId/BSON 특수타입 제외) */
function isPlainObject(v: any): boolean {
    return v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && typeof v.toHexString !== 'function' && !v._bsontype;
}

/** 객체를 "경로: 값" 여러 줄로 재귀 flatten. shouldSkip 키는 모든 깊이에서 제외. extraSkip은 추가 제외 키. */
function flatten(obj: any, prefix = '', extraSkip: Set<string> | null = null): string[] {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
        if (shouldSkip(k) || (extraSkip && extraSkip.has(k))) continue;
        const key = prefix ? `${prefix}.${k}` : k;
        if (v === null || v === undefined) continue;

        if (isPlainObject(v)) {
            parts.push(...flatten(v, key, extraSkip));
        } else if (Array.isArray(v)) {
            const allPrimitive = v.every((x) => !isPlainObject(x) && !Array.isArray(x));
            if (allPrimitive) {
                const joined = v.filter((x) => x !== null && x !== undefined && String(x).trim() !== '').join(', ');
                if (joined) parts.push(`${key}: ${joined}`);
            } else {
                v.forEach((item, i) => {
                    if (isPlainObject(item)) parts.push(...flatten(item, `${key}[${i}]`, extraSkip));
                    else if (item != null && String(item).trim() !== '') parts.push(`${key}[${i}]: ${item}`);
                });
            }
        } else if (v instanceof Date) {
            parts.push(`${key}: ${v.toISOString().slice(0, 10)}`);
        } else {
            const s = String(v).trim();
            if (s !== '') parts.push(`${key}: ${s}`);
        }
    }
    return parts;
}

// ---- 시트(테이블) 처리: columns[].key/label + rows[] (동적 col_해시 키) ----
function isTable(o: any): boolean {
    return isPlainObject(o) && Array.isArray(o.columns) && Array.isArray(o.rows);
}

/** 문서에서 시트 테이블 배열 찾기 (info.data.tables / info.tables / data.tables / tables) */
function findTables(doc: any): any[] {
    const cand = doc?.info?.data?.tables || doc?.info?.tables || doc?.data?.tables || doc?.tables;
    return Array.isArray(cand) ? cand.filter(isTable) : [];
}

/** 문서의 top-level 스칼라 (업체 식별 컨텍스트). 예: "code: dongwha" */
function topLevelContext(doc: any): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(doc)) {
        if (shouldSkip(k)) continue;
        if (v === null || v === undefined || typeof v === 'object') continue;
        const s = String(v).trim();
        if (s) parts.push(`${k}: ${s}`);
    }
    return parts.join(' | ');
}

/** 시트 테이블 → "행 하나 = 텍스트 한 줄" (col_해시를 실제 컬럼명으로 치환, 비밀번호 컬럼 제외) */
function serializeTableRows(table: any, prefix: string): string[] {
    const labelByKey: Record<string, string> = {};
    for (const col of table.columns || []) if (col && col.key) labelByKey[col.key] = col.label || col.key;
    const title = table.title ? `[${table.title}]` : '';
    const lines: string[] = [];
    for (const row of table.rows || []) {
        const cells: string[] = [];
        for (const [k, v] of Object.entries(row)) {
            if (k === '__rid') continue;
            const label = labelByKey[k] || k;
            if (shouldSkip(label) || shouldSkip(k)) continue; // 비밀번호/시크릿 컬럼 제외 (라벨/키 둘 다 검사)
            if (v === null || v === undefined) continue;
            const val = String(v).replace(/\s+/g, ' ').trim();
            if (val) cells.push(`${label}: ${val}`);
        }
        if (cells.length) lines.push([prefix, title, cells.join(' | ')].filter(Boolean).join(' '));
    }
    return lines;
}

/** customerEtc 문서 → 검색용 한 문자열 (시트는 행별로, 나머지는 flatten; 비번/시크릿/이력 제외) */
export function buildSearchText(doc: any): string {
    if (!doc || typeof doc !== 'object') return '';
    const tables = findTables(doc);
    const lines: string[] = [];
    if (tables.length) {
        const prefix = topLevelContext(doc);
        for (const t of tables) lines.push(...serializeTableRows(t, prefix));
        // 시트 외 나머지 필드도 포함 (tables 키는 위에서 처리했으니 중복 방지로 제외)
        const rest = flatten(doc, '', new Set(['tables'])).join('\n');
        if (rest.trim()) lines.push(rest);
    } else {
        lines.push(flatten(doc).join('\n'));
    }
    // 마지막에 값 마스킹 1회: 키 제외를 못 피한 "값 속 비번"까지 가린다 (이중 안전망)
    return maskSecrets(lines.join('\n').trim());
}
