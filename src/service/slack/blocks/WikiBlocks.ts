import DateUtils from '../../../utils/DateUtils.js';

export const WikiBlocks = {
    buildDocumentBlock(doc: any): any[] {
        return [
            {
                color: '#0052CC', // Outline 브랜드 컬러 (파란색)
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            // 제목에 링크 걸기
                            text: `*<https://wiki.unipost.co.kr${doc.url}|${doc.title}>*`
                        }
                    },
                    {
                        type: 'context',
                        elements: [
                            {
                                type: 'mrkdwn',
                                // 컬렉션 이름 | 날짜 (첫 번째 이미지 하단 스타일)
                                // doc.collection.name이 없으면 doc.collectionId 등으로 대체 확인 필요
                                text: `${doc.collection?.name || 'wiki'} | ${DateUtils.formatDateWithString(doc.createdAt)}`
                            }
                        ]
                    }
                ]
            }
        ];
    }
};
