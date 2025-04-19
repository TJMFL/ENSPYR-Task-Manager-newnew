import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from './queryClient';

// Define the user type
export interface User {
  id: number;
  username: string;
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Create the auth provider
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Check if the user is logged in
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await apiRequest('GET', '/api/auth/user');
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/login', { username, password });
      const userData = await response.json();
      setUser(userData);
      toast({
        title: 'Login successful',
        description: `Welcome back, ${userData.username}!`,
      });
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Register function
  const register = async (username: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/auth/register', { username, password });
      const userData = await response.json();
      setUser(userData);
      toast({
        title: 'Registration successful',
        description: `Welcome, ${userData.username}!`,
      });
    } catch (error) {
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Failed to create account',
        variant: 'destructive',
      });
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout');
      setUser(null);
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully',
      });
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: error instanceof Error ? error.message : 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Create a hook to use the auth context
export function useAuth() {
  return useContext(AuthContext);
}