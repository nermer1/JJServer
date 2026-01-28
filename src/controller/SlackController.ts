import {Request, Response} from 'express';
import slackService from '../service/SlackService.js';

class SlackController {
    public async commands(req: Request, res: Response): Promise<void> {
        try {
            const {command} = req.body;
            switch (command) {
                case '/otp':
                    await slackService.commands(req, res);
                    break;
                case '/help':
                    res.json({text: '사용 가능한 명령어:\nhelp - 도움말 표시\n/otps - OTP 팝업 오픈\n/otp "검색어" - otp 조회\n/wiki - 사내 위키 검색'});
                    break;
                default:
                    res.json({text: '알 수 없는 명령어입니다.'});
            }
        } catch (e) {
            console.error('서버 에러:', e);
            res.json({text: e || '서버 에러가 발생했습니다.'});
        }
    }

    public async interactivity(req: Request, res: Response): Promise<void> {
        try {
            await slackService.interactivity(req, res);
        } catch (e) {
            console.error('서버 에러:', e);
            res.json({text: e || '서버 에러가 발생했습니다.'});
        }
    }
}

export default new SlackController();
