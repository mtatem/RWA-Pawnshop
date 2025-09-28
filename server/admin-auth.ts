import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { storage } from "./storage";

// Admin credentials - loaded from secure environment variables
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
  throw new Error('Missing required admin credentials: ADMIN_USERNAME, ADMIN_PASSWORD, and JWT_SECRET must be set');
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD, 12); // Increased rounds for better security
const JWT_SECRET = process.env.JWT_SECRET;

export interface AdminUser {
  username: string;
  isAdmin: true;
}

// Verify admin credentials
export function verifyAdminCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
}

// Generate admin JWT token
export function generateAdminToken(username: string): string {
  return jwt.sign(
    { username, isAdmin: true, type: 'admin' },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Verify admin JWT token
export function verifyAdminToken(token: string): AdminUser | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type === 'admin' && decoded.isAdmin && decoded.username) {
      return { username: decoded.username, isAdmin: true };
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Admin authentication middleware - supports both JWT and Replit Auth
export const requireAdminAuth: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // First, try JWT token authentication (existing behavior)
  if (token) {
    const adminUser = verifyAdminToken(token);
    if (adminUser) {
      req.adminUser = adminUser;
      return next();
    }
  }

  // If no JWT token or invalid JWT token, check Replit Auth session
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.claims?.sub) {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user && user.isAdmin) {
        // User is authenticated via Replit Auth and has admin privileges
        req.adminUser = { 
          username: user.email || user.username || 'replit-admin', 
          isAdmin: true as const 
        };
        return next();
      }
    } catch (error) {
      console.error('Error checking admin status via Replit Auth:', error);
    }
  }

  // Neither authentication method succeeded
  return res.status(401).json({ 
    success: false, 
    error: 'Admin authentication required',
    code: 'ADMIN_AUTH_REQUIRED'
  });
};