import axios, {AxiosResponse} from 'axios';

const instance = axios.create({
    baseURL: '',
    timeout: 5000
});

const axiosCall = (url: string, params: any, callback: Function, errorCallback?: Function) => {
    const options = {
        headers: params.headers,
        method: 'post',
        url: url,
        data: params.data
    };

    instance(options)
        .then((response) => call(response, callback, errorCallback))
        .catch((error) => errorHandler(error));
};

const call = (response: AxiosResponse, callback: Function, errorCallback?: Function) => {
    //response.status
    callback(response.data);
};

const errorHandler = (error: any) => {
    console.log(error);
};

export {axios, axiosCall};
