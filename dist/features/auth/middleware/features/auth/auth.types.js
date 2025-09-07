export class AuthError extends Error {
    constructor(message, code, statusCode, details) {
        super(message);
        this.name = "AuthError";
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AuthError);
        }
    }
}
