import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { storage } from "./storage";
import { USER_ROLES, UserRole, hasRoleAtLeast, hasPermission, ROLE_PERMISSIONS } from "../shared/schema";

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
  role?: UserRole;
}

export interface RoleUser {
  id: string;
  username?: string;
  email?: string;
  role: UserRole;
  isAdmin: boolean;
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

// Role-based authorization functions
export const requireRole = (requiredRole: UserRole): RequestHandler => {
  return async (req: any, res, next) => {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Use role field as the sole source of truth for authorization
    const userRole = user.role || USER_ROLES.REGISTERED;
    
    if (!hasRoleAtLeast(userRole, requiredRole)) {
      return res.status(403).json({ 
        success: false, 
        error: `Insufficient permissions. Required role: ${requiredRole}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    req.user = user;
    req.userRole = userRole;
    next();
  };
};

export const requirePermission = (permission: keyof typeof ROLE_PERMISSIONS[UserRole]): RequestHandler => {
  return async (req: any, res, next) => {
    const user = await getUserFromRequest(req);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Use role field as the sole source of truth for authorization
    const userRole = user.role || USER_ROLES.REGISTERED;
    
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ 
        success: false, 
        error: `Insufficient permissions. Required permission: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    req.user = user;
    req.userRole = userRole;
    next();
  };
};

// Helper function to get user from request (JWT or Replit Auth)
async function getUserFromRequest(req: any): Promise<RoleUser | null> {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // First, try JWT token authentication
  if (token) {
    const adminUser = verifyAdminToken(token);
    if (adminUser) {
      return {
        id: 'jwt-admin',
        username: adminUser.username,
        role: adminUser.role || USER_ROLES.ADMINISTRATOR,
        isAdmin: true
      };
    }
  }

  // If no JWT token or invalid JWT token, check session auth (Replit Auth or traditional)
  if (req.isAuthenticated && req.isAuthenticated()) {
    try {
      // Support both Replit Auth (req.user.claims.sub) and traditional auth (req.user.id)
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return null;
      }
      
      const user = await storage.getUser(userId);
      
      if (user) {
        return {
          id: user.id,
          username: user.username || undefined,
          email: user.email || undefined,
          role: (user.role as UserRole) || (user.isAdmin ? USER_ROLES.ADMINISTRATOR : USER_ROLES.REGISTERED),
          isAdmin: user.isAdmin || false
        };
      }
    } catch (error) {
      console.error('Error getting user from request:', error);
    }
  }

  return null;
}

// Legacy admin authentication middleware - supports both JWT and Replit Auth
// Maintained for backward compatibility
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

  // If no JWT token or invalid JWT token, check session auth (Replit Auth or traditional)
  if (req.isAuthenticated && req.isAuthenticated()) {
    try {
      // Support both Replit Auth (req.user.claims.sub) and traditional auth (req.user.id)
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!userId) {
        return null;
      }
      
      const user = await storage.getUser(userId);
      
      // Check for admin role using the new role system OR legacy isAdmin field
      const userRole = (user.role as UserRole) || (user.isAdmin ? USER_ROLES.ADMINISTRATOR : USER_ROLES.REGISTERED);
      if (hasRoleAtLeast(userRole, USER_ROLES.MANAGER) || user.isAdmin) {
        // User is authenticated via Replit Auth and has admin privileges (manager, administrator, or legacy isAdmin)
        req.adminUser = { 
          username: user.email || user.username || 'replit-admin', 
          isAdmin: true as const,
          role: userRole
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