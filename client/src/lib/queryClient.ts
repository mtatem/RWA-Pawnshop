import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse as JSON to preserve structured error data
      const errorData = await res.json();
      // Create an error that preserves the structured data
      const error = new Error(errorData.error || errorData.message || res.statusText);
      // Attach the structured data to the error object
      Object.assign(error, errorData);
      throw error;
    } catch (parseError) {
      // If JSON parsing fails, fallback to text
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Admin API request function with authentication
export async function adminApiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const adminToken = localStorage.getItem('adminToken');
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    ...(adminToken ? { "Authorization": `Bearer ${adminToken}` } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

// Admin query function with authentication
export const getAdminQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const [baseUrl, ...params] = queryKey as [string, ...any[]];
    const adminToken = localStorage.getItem('adminToken');
    
    // Build URL with query parameters
    let url = baseUrl;
    if (params.length > 0) {
      const queryParams = new URLSearchParams();
      params.forEach(param => {
        if (param && typeof param === 'object') {
          Object.entries(param).forEach(([key, value]) => {
            if (value !== '' && value !== null && value !== undefined && value !== 'all') {
              queryParams.append(key, String(value));
            }
          });
        } else if (param !== null && param !== undefined && param !== '') {
          // Handle non-object parameters (though this shouldn't happen in our current implementation)
          queryParams.append('filter', String(param));
        }
      });
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    const headers: Record<string, string> = {
      ...(adminToken ? { "Authorization": `Bearer ${adminToken}` } : {}),
    };

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
