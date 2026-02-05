interface AppErrorResponse {
    status: number;
    body: Record<string, any>;
}

interface AppError extends Error {
    formatResponse: () => AppErrorResponse;
}
