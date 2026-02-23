import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError} from 'axios';
import ArrayUtils from '../../utils/ArrayUtils.js';

export interface ApiResult<T = any> {
    success: boolean;
    data?: T;
    error?: any;
}

class ApiClient {
    private readonly instance: AxiosInstance;

    constructor(baseURL: string = '', timeout: number = 5000) {
        this.instance = axios.create({
            baseURL,
            timeout,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        this.instance.interceptors.response.use(
            (response: AxiosResponse) => response.data,
            async (error: AxiosError) => await Promise.reject(error)
        );
    }

    public async request<T>(config: AxiosRequestConfig): Promise<ApiResult<T>> {
        try {
            const response = await this.instance.request<any, T>(config);
            return {success: true, data: response};
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    public async requestAll<T>(configs: AxiosRequestConfig[], chunkSize: number = 10): Promise<Array<ApiResult<T>>> {
        return await ArrayUtils.processInChunks(configs, chunkSize, async (config) => await this.request<T>(config), 100);
    }

    private handleError(error: any): ApiResult {
        let message = 'Unknown Error';

        if (axios.isAxiosError(error)) {
            message = error.response?.data?.message || error.message;
        } else {
            message = error.message ? error.message : String(error);
        }

        return {success: false, error: message};
    }
}

export const apiClient = new ApiClient();
