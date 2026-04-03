import {Request, Response} from 'express';
import {ApiKeys} from '../schemas/apiKeys.js';
import ApiReturn from '../structure/ApiReturn.js';
import {generatorUtils as generator} from '../utils/Utils.js';
import crypto from 'crypto';

class ApiKeyController {
    /**
     * 새로운 API Key 발급
     */
    public async issueKey(req: Request, res: Response): Promise<void> {
        const {name} = req.body;
        // authMiddleware에서 넘겨준 파싱된 사용자 정보 추출
        const user = (req as any).user;
        const userId = user ? user.userId : req.body.userId; // 미들웨어 정보 우선, 없으면 body 확인

        const apiReturn = new ApiReturn();

        /* if (!userId) {
            apiReturn.setReturnErrorMessage('발급자의 userId 정보를 찾을 수 없습니다.');
            res.status(401).json(apiReturn);
            return;
        }

        if (!name) {
            apiReturn.setReturnErrorMessage('발급처 이름(name)이 필요합니다.');
            res.status(400).json(apiReturn);
            return;
        } */

        try {
            // 완벽한 보안 난수(16바이트 = 32자리 hex) 생성
            const rawKey = crypto.randomBytes(16).toString('hex');
            const newKey = `ak_${rawKey}`; // 구분을 위해 prefix 'ak_' 추가

            await ApiKeys.model.create({
                key: newKey,
                userId: userId || 'test_user',
                name: name || 'test_name',
                isActive: true
            });

            apiReturn.setReturnMessage('API Key가 성공적으로 발급되었습니다.');
            apiReturn.put('key', newKey);
            apiReturn.put('name', name);
            res.json(apiReturn);
        } catch (error) {
            apiReturn.setReturnErrorMessage('API Key 발급 중 오류가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }

    /**
     * 발급된 API Key 목록 조회
     */
    public async listKeys(req: Request, res: Response): Promise<void> {
        const user = (req as any).user;
        const userId = user ? user.userId : null;
        const apiReturn = new ApiReturn();

        if (!userId) {
            apiReturn.setReturnErrorMessage('권한이 없습니다.');
            res.status(403).json(apiReturn);
            return;
        }

        try {
            // 본인이 발급받은 키 목록만 조회 (어드민(isAdmin)인 경우 조건 없이 검색하려면 로직 분기 가능)
            const query = user?.isAdmin ? {} : {userId: userId};
            const keys = await ApiKeys.model.find(query).sort({createdAt: -1});

            apiReturn.setTableData(keys);
            apiReturn.setReturnMessage('전체 API Key 목록 조회 완료');
            res.json(apiReturn);
        } catch (error) {
            apiReturn.setReturnErrorMessage('목록 조회 중 오류가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }

    /**
     * 특정 API Key 무효화 처리
     */
    public async revokeKey(req: Request, res: Response): Promise<void> {
        const {key} = req.params;
        const apiReturn = new ApiReturn();

        try {
            const result = await ApiKeys.model.findOneAndUpdate({key: key}, {isActive: false}, {new: true});

            if (!result) {
                apiReturn.setReturnErrorMessage('해당 키를 찾을 수 없습니다.');
                res.status(404).json(apiReturn);
                return;
            }

            apiReturn.put('revokedKey', result);
            apiReturn.setReturnMessage('키가 무효화 되었습니다.');
            res.json(apiReturn);
        } catch (error) {
            apiReturn.setReturnErrorMessage('키 무효화 처리 중 오류가 발생했습니다.');
            res.status(500).json(apiReturn);
        }
    }
}

export default new ApiKeyController();

