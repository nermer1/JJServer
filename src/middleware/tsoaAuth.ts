import * as express from 'express';

/**
 * tsoa가 @Security 데코레이터를 보고 실행하는 커스텀 인증 브릿지입니다.
 * 실제 인증 토큰 파싱은 이미 verifyApiToken (전역 미들웨어)에서 처리되어 req.user에 담겨있습니다.
 * 여기서는 권한(scopes)만 매칭하여 통과 여부를 결정합니다.
 */
export async function expressAuthentication(
    request: express.Request,
    securityName: string,
    scopes?: string[]
): Promise<any> {
    if (securityName === 'jwt' || securityName === 'api_key') {
        const user = (request as any).user;
        
        if (!user) {
            return Promise.reject(new Error('인증 정보가 없습니다.'));
        }

        if (scopes && scopes.length > 0) {
            let hasPermission = false;
            
            // user.permissions 배열에 해당 scope가 있는지 검사
            if (user.permissions && Array.isArray(user.permissions)) {
                hasPermission = scopes.some(scope => user.permissions.includes(scope));
            }
            
            if (!hasPermission) {
                return Promise.reject(new Error('권한이 부족합니다.'));
            }
        }
        
        return Promise.resolve(user);
    }
    
    return Promise.reject(new Error('지원하지 않는 보안 인증 방식입니다.'));
}
