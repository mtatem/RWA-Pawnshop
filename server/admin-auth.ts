import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";

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

// Admin authentication middleware
export const requireAdminAuth: RequestHandler = (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Admin authentication required',
      code: 'ADMIN_AUTH_REQUIRED'
    });
  }

  const adminUser = verifyAdminToken(token);
  if (!adminUser) {
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid admin credentials',
      code: 'INVALID_ADMIN_TOKEN'
    });
  }

  req.adminUser = adminUser;
  next();
};