export class SlackException extends Error implements AppError {
    constructor(
        public message: string,
        public status: number = 200
    ) {
        super(message);
    }

    formatResponse(): {status: number; body: any} {
        return {
            status: this.status,
            body: {text: this.message}
        };
    }
}
