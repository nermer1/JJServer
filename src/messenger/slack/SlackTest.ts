import {schemas} from '../../schemas/schemaMap.js';
import {SlackMessenger} from './SlackMessenger.js';

class SlackTest {
    private readonly token = '';
    private readonly slack = new SlackMessenger(this.token);

    async syncSlackIdsToMongo(): Promise<void> {
        const bulkOps = []; // DB에 보낼 명령어를 담을 바구니

        const members = await this.slack.getUserList();
        for (const member of members) {
            // 봇, 삭제된 유저, 이메일 없는 유저는 패스
            if (member.is_bot ?? member.deleted ?? !member.profile?.email) {
                continue;
            }

            // 3. 업데이트 명령어(Operation) 만들기
            bulkOps.push({
                updateOne: {
                    filter: {email: member.profile.email}, // 조건: 이메일 일치
                    update: {
                        $set: {slackId: member.id} // 변경: 슬랙 ID 저장
                    }
                }
            });
        }

        // 3. 몽고DB에 한 방에 쏘기 (명령어가 있을 때만)
        if (bulkOps.length > 0) {
            console.log(`총 ${bulkOps.length}명의 유저 정보를 업데이트합니다...`);

            const result = await schemas.users.model.bulkWrite(bulkOps, {ordered: false});

            console.log(`업데이트 완료! (매칭된 문서: ${result.matchedCount}, 수정된 문서: ${result.modifiedCount})`);
        } else {
            console.log('업데이트할 유저가 없습니다.');
        }
    }
}

export default new SlackTest();
