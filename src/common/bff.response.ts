
export interface BffResponse {
    error?:  {
        message?: string;
        code?: string;
    };
    data?: any;
}