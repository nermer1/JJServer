import {apiClient, ApiClient} from '../../../modules/httpClient/ApiClient.js';
import {WikiBlocks} from '../blocks/WikiBlocks.js';
import SystemSettingsCacheService from '../../../service/SystemSettingsCacheService.js';
import logger from '../../../utils/logger.js';

const getOutlineClient = () =>
    new ApiClient({
        baseURL: SystemSettingsCacheService.getRequired('OUTLINE_BASE_URL'),
        headers: {
            Authorization: `Bearer ${SystemSettingsCacheService.getRequired('OUTLINE_WIKI_TOKEN')}`,
            'Content-Type': 'application/json',
            'X-Forwarded-Proto': 'https'
        }
    });

export class WikiHandler {
    static async handlePostAction(payload: any, value: string, responseUrl: string) {
        logger.info(`[WikiHandler] 위키 포스트 액션 시작 (id: ${value})`);
        
        try {
            const client = getOutlineClient();
            const response = await client.post<{data: any}>('/documents.info', {id: value});
            
            if (!response.success) {
                logger.error(`[WikiHandler] Wiki API 통신 에러: ${response.error}`);
                return;
            }
            
            const doc: any = response.data.data;
            logger.info('wiki find doc', {meta: doc});
            const messagePayload = {
                replace_original: false,
                response_type: 'in_channel',
                attachments: WikiBlocks.buildDocumentBlock(doc)
            };

            await apiClient.post(responseUrl, messagePayload);
        } catch (error: any) {
            logger.error(`[WikiHandler] 치명적 에러 발생: ${error.message}`);
        }
    }
}
