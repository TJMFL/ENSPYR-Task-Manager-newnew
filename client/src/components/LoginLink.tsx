import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

const LoginLink: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <Link href="/auth">
        <Button variant="outline" className="bg-white shadow-md">
          Login / Register
        </Button>
      </Link>
    </div>
  );
};

export default LoginLink;