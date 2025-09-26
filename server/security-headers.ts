import type { RequestHandler } from 'express';

export interface SecurityConfig {
  enforceHTTPS: boolean;
  hstsMaxAge: number;
  contentSecurityPolicy: string;
  allowedOrigins: string[];
}

export class SecurityHeadersService {
  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    enforceHTTPS: process.env.NODE_ENV === 'production',
    hstsMaxAge: 31536000, // 1 year
    contentSecurityPolicy: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.stripe.com",
      "frame-src https://js.stripe.com",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; '),
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || 'https://your-domain.com']
      : ['http://localhost:5000', 'http://127.0.0.1:5000']
  };

  /**
   * Configure security headers middleware
   */
  static configureSecurityHeaders(config: Partial<SecurityConfig> = {}): RequestHandler {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    return (req, res, next) => {
      // Enforce HTTPS in production
      if (finalConfig.enforceHTTPS && req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(`https://${req.header('host')}${req.url}`);
      }

      // Security headers
      res.set({
        // HSTS - Force HTTPS for future requests
        'Strict-Transport-Security': `max-age=${finalConfig.hstsMaxAge}; includeSubDomains; preload`,
        
        // Content Security Policy
        'Content-Security-Policy': finalConfig.contentSecurityPolicy,
        
        // Prevent XSS attacks
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        
        // Hide server info
        'Server': 'RWA-Platform',
        
        // Referrer policy
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        
        // Permissions policy
        'Permissions-Policy': [
          'camera=()',
          'microphone=()',
          'geolocation=()',
          'interest-cohort=()'
        ].join(', ')
      });

      next();
    };
  }

  /**
   * Configure CORS with security considerations
   */
  static configureCORS(config: Partial<SecurityConfig> = {}): RequestHandler {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    return (req, res, next) => {
      const origin = req.headers.origin;
      
      // Check if origin is allowed
      if (origin && finalConfig.allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      } else if (!origin) {
        // Same-origin requests
        res.setHeader('Access-Control-Allow-Origin', '*');
      }
      
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
      ].join(', '));
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      
      // Handle preflight
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      
      next();
    };
  }

  /**
   * Configure secure session cookies
   */
  static getSecureCookieOptions() {
    return {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' as const, // CSRF protection
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
    };
  }

  /**
   * Rate limiting configuration
   */
  static getRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip successful requests
      skip: (req: any, res: any) => res.statusCode < 400
    };
  }

  /**
   * Strict rate limiting for auth endpoints
   */
  static getAuthRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit auth attempts
      message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      },
      standardHeaders: true,
      legacyHeaders: false
    };
  }

  /**
   * Payment endpoint rate limiting
   */
  static getPaymentRateLimitConfig() {
    return {
      windowMs: 60 * 1000, // 1 minute
      max: 3, // Limit payment requests
      message: {
        error: 'Too many payment requests, please try again later.',
        retryAfter: '1 minute'
      },
      standardHeaders: true,
      legacyHeaders: false
    };
  }
}