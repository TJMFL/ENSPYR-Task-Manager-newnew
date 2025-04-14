import { Switch, Route, useLocation, Redirect, Link } from "wouter";
import { DragDropContext } from 'react-beautiful-dnd';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import TaskBoard from "@/pages/TaskBoard";
import AIAssistant from "@/pages/AIAssistant";
import CalendarView from "@/pages/CalendarView";
import LocationsPage from "@/pages/LocationsPage";
import Login from "@/pages/Login";
import Logout from "@/pages/Logout";
import Sidebar from "@/components/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X, LogOut } from "lucide-react";
import { useState, ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import LoginLink from '@/components/LoginLink';

function MobileHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      setLocation('/auth');
    } catch (error) {
      toast({
        title: 'Logout Failed',
        description: 'Could not log out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="md:hidden bg-white w-full border-b border-gray-200 p-4 flex items-center justify-between">
      <div className="flex items-center">
        <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 mr-2">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h1 className="text-lg font-semibold">ENSPYR - Task Manager</h1>
        </div>
      </div>
      {user ? (
        <Link href="/logout" className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </Link>
      ) : (
        <Link href="/auth" className="text-sm text-primary font-medium">Login</Link>
      )}
    </div>
  );
}

function MobileSidebar({ isOpen, toggleSidebar }: { isOpen: boolean; toggleSidebar: () => void }) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={toggleSidebar}></div>
      <div className="relative flex w-64 flex-1 flex-col bg-gray-900">
        <div className="p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h1 className="text-lg font-semibold text-white">ENSPYR - Task Manager</h1>
          </div>
          <button onClick={toggleSidebar} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <Sidebar />
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile */}
      {!isMobile && <Sidebar />}
      
      {/* Mobile sidebar */}
      <MobileSidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        {isMobile && <MobileHeader toggleSidebar={toggleSidebar} />}
        
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

// Protected Route component
function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  if (!isAuthenticated) {
    // Redirect to auth page
    setLocation("/auth");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  
  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }
  
  // Forced login link for any page if cookie issues or technical problems
  if (!isAuthenticated && window.location.pathname !== '/auth' && window.location.pathname !== '/login') {
    return (
      <>
        <LoginLink />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
            <p className="mb-4">You need to be logged in to access this page.</p>
            <button
              onClick={() => navigate('/auth')}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
            >
              Go to Login Page
            </button>
          </div>
        </div>
      </>
    );
  }
  
  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/auth">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/logout">
        <Logout />
      </Route>
      <Route path="/">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/tasks">
        {isAuthenticated ? <TaskBoard /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/ai-assistant">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/calendar">
        {isAuthenticated ? <CalendarView /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/locations">
        {isAuthenticated ? <LocationsPage /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/projects">
        {isAuthenticated ? (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Projects</h1>
            <p>Projects page coming soon...</p>
          </div>
        ) : <Redirect to="/auth" />}
      </Route>
      <Route path="/settings">
        {isAuthenticated ? (
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Settings</h1>
            <p>Settings page coming soon...</p>
          </div>
        ) : <Redirect to="/auth" />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function LayoutContainer({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <>{children}</>;
  }
  
  return (
    <Layout>
      {children}
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LayoutContainer>
          <Router />
        </LayoutContainer>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
