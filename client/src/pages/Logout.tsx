import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

export default function Logout() {
  const [_, navigate] = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function performLogout() {
      try {
        await logout();
        toast({
          title: 'Logged out',
          description: 'You have been logged out successfully',
        });
        navigate('/auth');
      } catch (error) {
        toast({
          title: 'Logout failed',
          description: 'An error occurred while trying to log out',
          variant: 'destructive',
        });
        navigate('/dashboard');
      }
    }

    performLogout();
  }, [logout, navigate, toast]);

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center p-6 max-w-md mx-auto">
        <h2 className="text-2xl font-bold mb-4">Logging out...</h2>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}