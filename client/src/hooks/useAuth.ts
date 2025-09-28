import { useQuery } from "@tanstack/react-query";
import type { User, UserRole } from "@shared/schema";
import { 
  USER_ROLES, 
  ROLE_PERMISSIONS, 
  hasPermission, 
  hasRoleAtLeast, 
  canUpgradeToKyc 
} from "@shared/schema";

interface AuthResponse {
  success: boolean;
  data: User;
  timestamp: string;
}

export function useAuth() {
  const { data: response, isLoading } = useQuery<AuthResponse | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  // Extract user data from the wrapped response
  const user = response?.data || null;
  const userRole = (user?.role as UserRole) || USER_ROLES.REGISTERED;

  // Role-based utility functions
  const checkPermission = (permission: keyof typeof ROLE_PERMISSIONS[UserRole]) => {
    if (!user) return false;
    return hasPermission(userRole, permission);
  };

  const checkRoleAtLeast = (requiredRole: UserRole) => {
    if (!user) return false;
    return hasRoleAtLeast(userRole, requiredRole);
  };

  const checkCanUpgradeToKyc = () => {
    if (!user) return false;
    return canUpgradeToKyc(userRole, user.kycStatus || 'not_started');
  };

  // Convenience permission checks
  const permissions = {
    canAccessProfile: checkPermission('canAccessProfile'),
    canPawnItems: checkPermission('canPawnItems'),
    canAccessAdmin: checkPermission('canAccessAdmin'),
    canManageUsers: checkPermission('canManageUsers'),
    canApproveKyc: checkPermission('canApproveKyc'),
    canViewAllTransactions: checkPermission('canViewAllTransactions'),
  };

  // Role level checks
  const roles = {
    isRegistered: checkRoleAtLeast(USER_ROLES.REGISTERED),
    isRegisteredKyc: checkRoleAtLeast(USER_ROLES.REGISTERED_KYC),
    isManager: checkRoleAtLeast(USER_ROLES.MANAGER),
    isAdministrator: checkRoleAtLeast(USER_ROLES.ADMINISTRATOR),
  };

  return {
    user,
    userRole,
    isLoading,
    isAuthenticated: !!user,
    // Role and permission utilities
    checkPermission,
    checkRoleAtLeast,
    checkCanUpgradeToKyc,
    permissions,
    roles,
    // Constants for easy access
    USER_ROLES,
  };
}