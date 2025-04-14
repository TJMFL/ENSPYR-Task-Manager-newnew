import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  ClipboardList,
  Home,
  Zap,
  FolderKanban,
  Settings,
  LogOut,
  Calendar,
  MapPin,
} from 'lucide-react';

const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  // Define navigation items
  const navItems = [
    { 
      title: 'Dashboard', 
      icon: <Home className="h-5 w-5 mr-3" />, 
      path: '/' 
    },
    { 
      title: 'Tasks', 
      icon: <ClipboardList className="h-5 w-5 mr-3" />, 
      path: '/tasks'
    },
    { 
      title: 'Calendar', 
      icon: <Calendar className="h-5 w-5 mr-3" />, 
      path: '/calendar'
    },
    { 
      title: 'AI Assistant', 
      icon: <Zap className="h-5 w-5 mr-3" />, 
      path: '/ai-assistant'
    },
    { 
      title: 'Locations', 
      icon: <MapPin className="h-5 w-5 mr-3" />, 
      path: '/locations'
    },
    { 
      title: 'Projects', 
      icon: <FolderKanban className="h-5 w-5 mr-3" />, 
      path: '/projects'
    },
    { 
      title: 'Settings', 
      icon: <Settings className="h-5 w-5 mr-3" />, 
      path: '/settings'
    },
  ];

  return (
    <div className="bg-gray-900 text-white w-64 flex-shrink-0 flex flex-col">
      <div className="p-4 flex items-center space-x-2">
        <ClipboardList className="h-8 w-8 text-primary" />
        <h1 className="text-xl font-semibold">ENSPYR - Task Manager</h1>
      </div>
      
      <nav className="mt-8 flex-1">
        <div className="px-4 space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path} 
              className={cn(
                "flex items-center px-4 py-2 rounded-lg",
                location === item.path 
                  ? "text-gray-100 bg-gray-800" 
                  : "text-gray-300 hover:bg-gray-800"
              )}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </div>
      </nav>
      
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="text-sm font-medium">{user?.username || 'User'}</p>
          </div>
        </div>
        <Link href="/logout">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-white border-gray-700 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
