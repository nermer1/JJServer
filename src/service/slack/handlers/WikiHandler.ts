import axios from 'axios';
import {WikiBlocks} from '../blocks/WikiBlocks.js';
import {basicProperty} from '../../../properties/ServerProperty.js';

export class WikiHandler {
    static async handlePostAction(payload: any, value: string, responseUrl: string) {
        // wiki
        const OUTLINE_API_KEY = basicProperty.wiki.token;
        const OUTLINE_BASE_URL = 'http://wiki:3000/api';

        const outlineClient = axios.create({
            baseURL: OUTLINE_BASE_URL,
            headers: {
                Authorization: `Bearer ${OUTLINE_API_KEY}`,
                'Content-Type': 'application/json',
                'X-Forwarded-Proto': 'https'
            }
        });

        const response = await outlineClient.post('/documents.info', {id: value});
        const doc: any = response.data.data;

        console.log(doc);

        const messagePayload = {
            replace_original: false, // 기존 검색 결과 유지 여부 (형 의도에 따라 true/false)
            response_type: 'in_channel', // 채널 전체 공개
            attachments: WikiBlocks.buildDocumentBlock(doc)
        };

        await axios.post(responseUrl, messagePayload);
    }
}
