export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Unauthorized';
    }
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid data format';
    }
    else if (err.code === '23505') {
        statusCode = 409;
        message = 'Duplicate entry';
    }
    else if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record does not exist';
    }
    const errorResponse = {
        success: false,
        message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        method: req.method,
    };
    if (process.env.NODE_ENV === 'development') {
        if (err.message)
            errorResponse.error = err.message;
        if (err.stack)
            errorResponse.stack = err.stack;
    }
    const logData = {
        error: err.message,
        stack: err.stack,
        statusCode,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('user-agent'),
        ip: req.ip,
    };
    if (statusCode >= 500) {
        console.error('Server Error:', logData);
    }
    else {
        console.warn('Client Error:', logData);
    }
    res.status(statusCode).json(errorResponse);
};
