import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { fromError } from 'zod-validation-error';
import rateLimit from 'express-rate-limit';

// Enhanced error response structure
interface ValidationErrorResponse {
  success: false;
  error: string;
  field?: string;
  code?: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

// Request ID generator for tracking
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Enhanced validation middleware factory
export const validateRequest = <T extends z.ZodSchema>(
  schema: T,
  target: 'body' | 'query' | 'params' = 'body',
  options: {
    stripUnknown?: boolean;
    passthrough?: boolean;
    logErrors?: boolean;
  } = {}
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestId = generateRequestId();
      (req as any).requestId = requestId;

      let dataToValidate: any;
      switch (target) {
        case 'body':
          dataToValidate = req.body;
          break;
        case 'query':
          dataToValidate = req.query;
          break;
        case 'params':
          dataToValidate = req.params;
          break;
        default:
          dataToValidate = req.body;
      }

      // Apply validation - safeParse doesn't support options in this Zod version
      // Use passthrough() or strict() on schema definition instead
      const result = schema.safeParse(dataToValidate);
      
      if (!result.success) {
        // Log validation errors if enabled
        if (options.logErrors !== false) {
          console.warn(`Validation failed for ${target} on ${req.method} ${req.path}:`, {
            requestId,
            errors: result.error.issues,
            data: dataToValidate,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });
        }

        const validationError = fromError(result.error);
        const response: ValidationErrorResponse = {
          success: false,
          error: validationError.message,
          code: 'VALIDATION_ERROR',
          details: result.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
            value: issue.path.reduce((obj, key) => obj?.[key], dataToValidate)
          })),
          timestamp: new Date().toISOString(),
          requestId
        };

        return res.status(400).json(response);
      }

      // Set validated data back to request
      switch (target) {
        case 'body':
          req.body = result.data;
          break;
        case 'query':
          req.query = result.data;
          break;
        case 'params':
          req.params = result.data;
          break;
      }

      next();
    } catch (error) {
      console.error('Unexpected error in validation middleware:', error);
      const response: ValidationErrorResponse = {
        success: false,
        error: 'Internal validation error',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
        requestId: (req as any).requestId
      };
      res.status(500).json(response);
    }
  };
};

// Enhanced error handling middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = (req as any).requestId || generateRequestId();
  const timestamp = new Date().toISOString();

  // Log the error with context
  console.error('Request error:', {
    requestId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    params: req.params,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp
  });

  let response: ValidationErrorResponse;

  // Handle different types of errors
  if (error instanceof ZodError) {
    // Zod validation errors
    const validationError = fromError(error);
    response = {
      success: false,
      error: validationError.message,
      code: 'VALIDATION_ERROR',
      details: error.issues,
      timestamp,
      requestId
    };
    return res.status(400).json(response);
  }

  if (error.name === 'MulterError') {
    // File upload errors
    let message = 'File upload error';
    let statusCode = 400;

    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'File size too large (maximum 50MB allowed)';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Too many files (maximum 1 file allowed)';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Too many fields in request';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Unexpected file field';
        break;
      default:
        message = `Upload error: ${error.message}`;
    }

    response = {
      success: false,
      error: message,
      code: 'FILE_UPLOAD_ERROR',
      timestamp,
      requestId
    };
    return res.status(statusCode).json(response);
  }

  if (error.message && error.message.includes('Unsupported file type')) {
    // Custom file type validation errors
    response = {
      success: false,
      error: error.message,
      code: 'INVALID_FILE_TYPE',
      timestamp,
      requestId
    };
    return res.status(400).json(response);
  }

  // Database/Storage errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    response = {
      success: false,
      error: 'Database connection error',
      code: 'DATABASE_ERROR',
      timestamp,
      requestId
    };
    return res.status(503).json(response);
  }

  // Authentication/Authorization errors
  if (error.status === 401) {
    response = {
      success: false,
      error: error.message || 'Unauthorized',
      code: 'UNAUTHORIZED',
      timestamp,
      requestId
    };
    return res.status(401).json(response);
  }

  if (error.status === 403) {
    response = {
      success: false,
      error: error.message || 'Forbidden',
      code: 'FORBIDDEN',
      timestamp,
      requestId
    };
    return res.status(403).json(response);
  }

  // Rate limiting errors
  if (error.status === 429) {
    response = {
      success: false,
      error: error.message || 'Too many requests',
      code: 'RATE_LIMITED',
      details: {
        retryAfter: error.retryAfter,
        limit: error.limit
      },
      timestamp,
      requestId
    };
    return res.status(429).json(response);
  }

  // Generic errors - don't expose internal details
  const statusCode = error.status || error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  response = {
    success: false,
    error: isProduction 
      ? 'Internal server error' 
      : error.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
    timestamp,
    requestId
  };

  // Add stack trace in development
  if (!isProduction) {
    (response as any).stack = error.stack;
  }

  res.status(statusCode).json(response);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = generateRequestId();
  const response: ValidationErrorResponse = {
    success: false,
    error: `Resource not found: ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString(),
    requestId
  };

  console.warn('404 Not Found:', {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.status(404).json(response);
};

// Success response helper
export const successResponse = <T>(data: T, message?: string): SuccessResponse<T> => ({
  success: true,
  data,
  timestamp: new Date().toISOString()
});

// Enhanced rate limiting configurations
export const rateLimitConfigs = {
  // Strict rate limiting for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window per IP
    message: {
      success: false,
      error: 'Too many authentication attempts, please try again in 15 minutes',
      code: 'AUTH_RATE_LIMITED',
      retryAfter: 15 * 60,
      limit: 5
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful requests
    handler: (req, res) => {
      console.warn(`Auth rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({
        success: false,
        error: 'Too many authentication attempts',
        code: 'AUTH_RATE_LIMITED',
        retryAfter: Math.ceil(15 * 60),
        limit: 5,
        timestamp: new Date().toISOString()
      });
    }
  }),

  // General API rate limiting
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    message: {
      success: false,
      error: 'Too many API requests, please try again later',
      code: 'API_RATE_LIMITED',
      retryAfter: 60,
      limit: 100
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`API rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({
        success: false,
        error: 'API rate limit exceeded',
        code: 'API_RATE_LIMITED',
        retryAfter: Math.ceil(60),
        limit: 100,
        timestamp: new Date().toISOString()
      });
    }
  }),

  // Upload endpoints rate limiting
  upload: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 uploads per minute per IP
    message: {
      success: false,
      error: 'Too many file uploads, please try again later',
      code: 'UPLOAD_RATE_LIMITED',
      retryAfter: 60,
      limit: 10
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Upload rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({
        success: false,
        error: 'Upload rate limit exceeded',
        code: 'UPLOAD_RATE_LIMITED',
        retryAfter: Math.ceil(60),
        limit: 10,
        timestamp: new Date().toISOString()
      });
    }
  }),

  // Financial operations rate limiting (very strict)
  financial: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 financial operations per minute per IP
    message: {
      success: false,
      error: 'Too many financial operations, please try again later',
      code: 'FINANCIAL_RATE_LIMITED',
      retryAfter: 60,
      limit: 5
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      console.warn(`Financial rate limit exceeded for IP: ${req.ip}, endpoint: ${req.path}`);
      res.status(429).json({
        success: false,
        error: 'Financial operations rate limit exceeded',
        code: 'FINANCIAL_RATE_LIMITED',
        retryAfter: Math.ceil(60),
        limit: 5,
        timestamp: new Date().toISOString()
      });
    }
  })
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:;"
  );

  // Other security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Remove server signature
  res.removeHeader('X-Powered-By');

  next();
};