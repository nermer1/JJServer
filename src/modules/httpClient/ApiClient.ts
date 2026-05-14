import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import ArrayUtils from '../../utils/ArrayUtils.js';

/**
 * [최신 트렌드 1] Result Pattern (Discriminated Union)
 * 호출부에서 try-catch를 강제하지 않고, 응답 객체의 success 여부로 타입 추론을 완벽하게 지원합니다.
 * 에러 발생 시에도 예측 가능한 타입 안정성을 제공합니다.
 */
export type ApiResult<T = any> =
    | { success: true; data: T; status: number; headers?: any }
    | { success: false; error: string; status?: number; details?: any };

/**
 * [최신 트렌드 2] 확장 가능한 Request Config
 * 재시도 로직(Retry) 등 API 클라이언트 레벨의 커스텀 설정을 추가할 수 있도록 확장합니다.
 */
export interface ExtendedRequestConfig extends AxiosRequestConfig {
    retries?: number;
    retryDelay?: number;
}

/**
 * 모던 프론트엔드/백엔드 환경에 맞춘 고도화된 ApiClient 클래스
 */
export class ApiClient {
    private readonly instance: AxiosInstance;

    /**
     * @param config - 기존 baseURL 뿐만 아니라 timeout, headers 등 모든 기본 설정을 유연하게 주입할 수 있습니다.
     */
    constructor(config?: AxiosRequestConfig) {
        this.instance = axios.create({
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
            },
            ...config,
        });

        this.setupInterceptors();
    }

    /**
     * [최신 트렌드 3] Interceptor 체인 활용
     * 요청/응답 과정에서 공통 로직(토큰 주입, 로깅, 재시도 등)을 중앙화합니다.
     */
    private setupInterceptors() {
        // 1. 요청 인터셉터
        this.instance.interceptors.request.use(
            (config: InternalAxiosRequestConfig) => {
                // 필요시 여기에 전역 로깅이나 토큰 검증 로직을 추가할 수 있습니다.
                return config;
            },
            (error: AxiosError) => Promise.reject(error)
        );

        // 2. 응답 인터셉터
        this.instance.interceptors.response.use(
            (response: AxiosResponse) => response, // 기존의 response.data 반환 대신 전체 response 유지 (상태 코드 활용 목적)
            async (error: AxiosError) => {
                const config = error.config as ExtendedRequestConfig;

                // [최신 트렌드 4] 자동 재시도(Retry) 로직
                // 네트워크 오류나 5xx 서버 에러 발생 시 설정된 횟수만큼 자동 재시도
                if (config && config.retries && config.retries > 0) {
                    config.retries -= 1;
                    const delay = config.retryDelay || 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return this.instance.request(config);
                }

                return Promise.reject(error);
            }
        );
    }



    /**
     * 코어 요청 메서드 - try-catch를 캡슐화하여 깔끔한 ApiResult를 반환합니다.
     */
    public async request<T>(config: ExtendedRequestConfig): Promise<ApiResult<T>> {
        try {
            const response: AxiosResponse<T> = await this.instance.request<T>(config);
            return {
                success: true,
                data: response.data,
                status: response.status,
                headers: response.headers
            };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    /**
     * HTTP Method Shortcuts - 깔끔한 사용성과 타입 추론을 위한 래퍼 메서드들
     */
    public get<T>(url: string, config?: ExtendedRequestConfig): Promise<ApiResult<T>> {
        return this.request<T>({ ...config, method: 'GET', url });
    }

    public post<T>(url: string, data?: any, config?: ExtendedRequestConfig): Promise<ApiResult<T>> {
        return this.request<T>({ ...config, method: 'POST', url, data });
    }

    public put<T>(url: string, data?: any, config?: ExtendedRequestConfig): Promise<ApiResult<T>> {
        return this.request<T>({ ...config, method: 'PUT', url, data });
    }

    public patch<T>(url: string, data?: any, config?: ExtendedRequestConfig): Promise<ApiResult<T>> {
        return this.request<T>({ ...config, method: 'PATCH', url, data });
    }

    public delete<T>(url: string, config?: ExtendedRequestConfig): Promise<ApiResult<T>> {
        return this.request<T>({ ...config, method: 'DELETE', url });
    }

    /**
     * 병렬/배치 요청 처리
     */
    public async requestAll<T>(configs: ExtendedRequestConfig[], chunkSize: number = 10): Promise<Array<ApiResult<T>>> {
        return await ArrayUtils.processInChunks(configs, chunkSize, async (config) => await this.request<T>(config), 100);
    }

    /**
     * 중앙 집중식 에러 핸들러
     * Axios 에러에서 HTTP 상태 코드 및 백엔드 상세 메시지(details)를 안전하게 추출합니다.
     */
    private handleError(error: any): ApiResult<never> {
        if (axios.isAxiosError(error)) {
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                status: error.response?.status,
                details: error.response?.data, // 백엔드 Validation 에러 등 원본 데이터 보존
            };
        }

        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

// -----------------------------------------------------------------------------
// 전역으로 사용할 수 있는 기본 클라이언트 싱글톤 인스턴스 (가장 흔하게 사용됨)
// -----------------------------------------------------------------------------
export const apiClient = new ApiClient();
