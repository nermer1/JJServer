import {Controller, Post, Route, Body, Security, Tags, Hidden} from 'tsoa';
import otpService from '../service/OtpService.js';
import HypervSocketService from '../service/HypervSocketService.js';

interface OtpGoogleRequest {
    customer?: string[];
}

interface OtpRequestDto {
    phoneName: string;
    requesterName: string;
    requesterHostname?: string;
}

@Tags('OTP')
@Route('otp')
export class OtpController extends Controller {
    /**
     * 구글 OTP 등 OTP 리스트를 조회합니다.
     */
    @Post('google')
    @Security('jwt', ['utility:otp:use:any'])
    @Security('api_key', ['utility:otp:use:any'])
    public async getList(@Body() requestBody: OtpGoogleRequest): Promise<any> {
        return await otpService.getList(requestBody.customer || []);
    }

    /**
     * 특정 폰(OTP)의 점유를 요청하고 현재 점유자에게 슬랙 알림을 보냅니다.
     */
    @Post('request')
    @Hidden()
    @Security('jwt', ['utility:otp:use:any'])
    public async requestOtp(@Body() requestBody: OtpRequestDto): Promise<{ok: boolean; message?: string}> {
        if (!requestBody.phoneName || !requestBody.requesterName) {
            this.setStatus(400);
            return {ok: false, message: 'phoneName and requesterName are required'};
        }

        const result = await HypervSocketService.requestOtp(requestBody.phoneName, requestBody.requesterName, requestBody.requesterHostname);
        return result;
    }
}

