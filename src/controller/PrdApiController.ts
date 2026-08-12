import {Request, Response, NextFunction} from 'express';
import prdApiService from '../service/PrdApiService.js';
import {DBLogger} from '../utils/DBLogger.js';

class PrdApiController {
    public async call(req: Request, res: Response): Promise<void> {
        const collectionName = req.params.collection;
        const params = req.body;

        // 로깅이 끝난 후, 백엔드 스키마단 처리를 위해 유저 정보 은밀히 주입
        (params as any).reqUser = (req as any).user;

        const returnData = await prdApiService.call(collectionName, params);

        if (params.type && params.type !== 'R') {
            // CRUD 액션명을 예쁘게 매핑
            const actionNameMap: Record<string, string> = {C: '생성', U: '수정', D: '삭제'};
            const actionTypeMap: Record<string, string> = {C: 'CREATE', U: 'UPDATE', D: 'DELETE'};
            const actionStr = actionNameMap[params.type] || params.type;
            const actionTypeCode = actionTypeMap[params.type] || 'EXECUTE';

            let logDetails = params.data;

            // customerEtc 컬렉션의 경우 로그 용량 비대화 방지를 위해 info 필드 제외
            if (collectionName === 'customerList' && Array.isArray(logDetails?.tableData)) {
                const filteredTableData = logDetails.tableData.map((item: any) => {
                    if (item && item.etc && typeof item.etc === 'object' && 'info' in item.etc) {
                        const {info, ...etcRest} = item.etc; // etc 내부의 info 필드만 제외
                        return {...item, etc: etcRest}; // 기존 item 속성을 유지하며 etc 덮어쓰기
                    }
                    return item;
                });

                // 원본 객체 참조 훼손 방지를 위해 얕은 복사로 덮어쓰기
                logDetails = {...logDetails, tableData: filteredTableData};
            }

            await DBLogger.log({
                category: 'DATA', // 데이터 조작 명확화
                action: `${collectionName} 데이터 ${actionStr}`,
                target: collectionName, // 어떤 테이블인지!
                actionType: actionTypeCode, // 정확히 어떤 행위인지 (CREATE, UPDATE, DELETE)
                userId: (req as any).user?.userId || 'UNKNOWN',
                details: logDetails
            });
        }

        res.json(returnData);
    }
}

export default new PrdApiController();
