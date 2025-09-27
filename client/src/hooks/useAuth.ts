import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

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

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}