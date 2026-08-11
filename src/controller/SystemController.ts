import {Request, Response} from 'express';
import systemService from '../service/SystemService.js';
import logger from '../utils/logger.js';
import ApiReturn from '../structure/ApiReturn.js';
import prdApiService from '../service/PrdApiService.js';
import SystemSettingsCacheService from '../service/SystemSettingsCacheService.js';
import {DBLogger} from '../utils/DBLogger.js';
import {reloadTransporter} from '../mail/sendMail.js';
import slackService from '../service/SlackService.js';
import hypervSocketService from '../service/HypervSocketService.js';

class SystemController {
    public async getCombinedIps(req: Request, res: Response): Promise<void> {
        const apiReturn = new ApiReturn();
        try {
            const user = (req as any).user;
            const hasDetailPermission = user?.permissions?.includes('system:ip:read:any');

            const data = await systemService.getCombinedIpData(hasDetailPermission);
            apiReturn.setTableData(data);
            apiReturn.setReturnMessage('조회 성공');
        } catch (error: any) {
            logger.error(`[SystemController] getCombinedIps 오류: ${error.message}`);
            apiReturn.setReturnErrorMessage(error.message);
        }

        res.json(apiReturn);
    }

    /**
     * 프론트엔드의 /api/v1/system/settings 요청(만능 라우터 스펙)을 처리합니다.
     */
    public async callSettings(req: Request, res: Response): Promise<void> {
        const params = req.body;

        // 기존 PrdApiController 로깅 및 스키마 처리를 위해 유저 정보 주입
        (params as any).reqUser = (req as any).user;

        try {
            // 1. 기존 비즈니스 로직(암호화/복호화 로직 포함된 Schema)을 그대로 재사용
            const returnData = await prdApiService.call('systemSettings', params);

            // 2. 값이 변경(C, U, D)되는 요청일 경우 마법 제거(명시적 훅 처리)
            if (params.type && params.type !== 'R') {
                const actionNameMap: Record<string, string> = {C: '생성', U: '수정', D: '삭제'};
                const actionTypeMap: Record<string, string> = {C: 'CREATE', U: 'UPDATE', D: 'DELETE'};
                const actionStr = actionNameMap[params.type] || params.type;
                const actionTypeCode = actionTypeMap[params.type] || 'EXECUTE';

                // DB 로깅
                await DBLogger.log({
                    category: 'DATA',
                    action: `systemSettings 데이터 ${actionStr}`,
                    target: 'systemSettings',
                    actionType: actionTypeCode,
                    userId: (req as any).user?.userId || 'UNKNOWN',
                    details: params.data
                });

                // 마법 제거: 직접 명시적으로 캐시 갱신
                await SystemSettingsCacheService.loadSettings();

                // 모듈 명시적 리로드 (Slack, Mail 등)
                // TODO: 특정 키만 리로드하게 최적화할 수도 있으나, 일단 전체 리로드 수행
                reloadTransporter();
                slackService.reloadClient();
                hypervSocketService.reloadClient();

                logger.info(`[SystemController] 시스템 설정(${actionStr}) 후 모듈 명시적 리로드 완료`);
            }

            res.json(returnData);
        } catch (error: any) {
            logger.error(`[SystemController] 에러: ${error.message}`);
            const apiReturn = new ApiReturn();
            apiReturn.setReturnErrorMessage(error.message);

            res.json(apiReturn);
        }
    }

    /**
     * 프론트엔드에서 직접 로그(메뉴 이동, 버튼 클릭 등)를 남길 수 있는 전용 엔드포인트입니다.
     */
    public async clientLog(req: Request, res: Response): Promise<void> {
        const params = req.body;
        const apiReturn = new ApiReturn();

        try {
            await DBLogger.log({
                category: 'DATA',
                action: '메뉴 이동',
                target: 'menu',
                actionType: 'EXECUTE',
                userId: (req as any).user?.userId || 'UNKNOWN',
                details: params.data
            });

            apiReturn.setReturnMessage('클라이언트 로그 저장 성공');
            res.json(apiReturn);
        } catch (error: any) {
            logger.error(`[SystemController] clientLog 에러: ${error.message}`);
            apiReturn.setReturnErrorMessage(error.message);
            res.status(400).json(apiReturn);
        }
    }
}

export default new SystemController();
