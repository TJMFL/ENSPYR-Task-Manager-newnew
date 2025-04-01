import { Switch, Route, useLocation, Redirect } from "wouter";
import { DragDropContext } from 'react-beautiful-dnd';
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import TaskBoard from "@/pages/TaskBoard";
import AIAssistant from "@/pages/AIAssistant";
import Login from "@/pages/Login";
import Sidebar from "@/components/Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Menu, X } from "lucide-react";
import { useState, ReactNode } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";

function MobileHeader({ toggleSidebar }: { toggleSidebar: () => void }) {
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
          <h1 className="text-lg font-semibold">AI Task Manager</h1>
        </div>
      </div>
      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white">JD</div>
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
            <h1 className="text-lg font-semibold text-white">AI Task Manager</h1>
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
  
  // Show loading state while checking authentication
  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }
  
  return (
    <Switch>
      <Route path="/login">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/auth">
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Login />}
      </Route>
      <Route path="/" exact>
        {isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/dashboard">
        {isAuthenticated ? <Dashboard /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/tasks">
        {isAuthenticated ? <TaskBoard /> : <Redirect to="/auth" />}
      </Route>
      <Route path="/ai-assistant">
        {isAuthenticated ? <AIAssistant /> : <Redirect to="/auth" />}
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
