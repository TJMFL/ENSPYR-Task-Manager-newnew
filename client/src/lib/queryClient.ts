import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Base API URL (modify this if deploying to a custom domain)
export const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://enspyr-task-manager-newnew.app/api' 
  : '/api';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Helper to normalize URL paths
function normalizeUrl(url: string): string {
  // If URL already starts with http or https, return it as is
  if (url.startsWith('http')) {
    return url;
  }
  
  // If URL already starts with /api, just ensure it starts with /api properly
  if (url.startsWith('/api')) {
    return url;
  }
  
  // Convert old route format to new format
  // Remove old /api prefix if present
  const path = url.startsWith('/api/') ? url.substring(5) : url;
  
  // Convert to new API route structure
  return `${API_BASE_URL}/${path}`;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const normalizedUrl = normalizeUrl(url);
  
  const res = await fetch(normalizedUrl, {
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
    const normalizedUrl = normalizeUrl(queryKey[0] as string);
    
    const res = await fetch(normalizedUrl, {
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
