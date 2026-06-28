import {apiClient, ApiClient} from '../../../modules/httpClient/ApiClient.js';
import {WikiBlocks} from '../blocks/WikiBlocks.js';
import {basicProperty} from '../../../properties/ServerProperty.js';
import logger from '../../../utils/logger.js';

const OUTLINE_API_KEY = basicProperty.wiki.token;
const OUTLINE_BASE_URL = 'http://wiki:3000/api';

const outlineClient = new ApiClient({
    baseURL: OUTLINE_BASE_URL,
    headers: {
        Authorization: `Bearer ${OUTLINE_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Forwarded-Proto': 'https'
    }
});

export class WikiHandler {
    static async handlePostAction(payload: any, value: string, responseUrl: string) {
        const response = await outlineClient.post<{data: any}>('/documents.info', {id: value});
        if (!response.success) {
            logger.error(`Wiki API Error: ${response.error}`);
            return;
        }
        const doc: any = response.data.data;
        logger.info('wiki find doc', {meta: doc});
        const messagePayload = {
            replace_original: false, // 기존 검색 결과 유지 여부 (형 의도에 따라 true/false)
            response_type: 'in_channel', // 채널 전체 공개
            attachments: WikiBlocks.buildDocumentBlock(doc)
        };

        await apiClient.post(responseUrl, messagePayload);
    }
}
