import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  success: false;
  message: string;
  error?: string;
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
}

interface CustomError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (err: CustomError, req: Request, res: Response, next: NextFunction) => {
  // Default error status and message
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Unauthorized';
  } else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Duplicate entry';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  const errorResponse: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // Include error details in development
  if (process.env.NODE_ENV === 'development') {
    if (err.message) errorResponse.error = err.message;
    if (err.stack) errorResponse.stack = err.stack;
  }

  // Log error (using console.error as fallback for logger)
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
  } else {
    console.warn('Client Error:', logData);
  }

  res.status(statusCode).json(errorResponse);
};
