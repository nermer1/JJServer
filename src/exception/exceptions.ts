export class SlackException extends Error implements AppError {
    constructor(
        public message: string,
        public status: number = 200
    ) {
        super(message);
    }

    formatResponse(): AppErrorResponse {
        return {
            status: this.status,
            body: {text: this.message}
        };
    }
}

export class AuthException extends Error implements AppError {
    constructor(message: string = '인증이 필요합니다') {
        super(message);
        // ...
    }

    formatResponse(): AppErrorResponse {
        return {status: 401, body: {msg: this.message}};
    }
}
