import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { VoiceProvider } from './contexts/VoiceContext';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Classes from './components/Classes-API';
import Lectures from './components/Lectures';
import Assignments from './components/Assignments';
import Students from './components/Students';
import Settings from './components/Settings';

import SubmittedAssignments from './components/dashboard-pages/SubmittedAssignments';
import Deadlines from './components/dashboard-pages/Deadlines';
import Grades from './components/dashboard-pages/Grades';
import Messages from './components/dashboard-pages/Messages';
import Schedule from './components/dashboard-pages/Schedule';

import Login from './components/Login';
import Register from './components/Register';
import ClassroomView from './components/ClassroomView';

import './App.css';

function MainApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { user, login, logout, isAuthenticated } = useAuth();

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    setIsSidebarOpen(false);
    logout();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard onTabChange={handleTabChange} />;
      case 'classes':
        return <Classes onJoinClassroom={() => handleTabChange('classroom')} />;
      case 'lectures':
        return <Lectures />;
      case 'assignments':
        return <Assignments />;
      case 'students':
        return <Students />;
      case 'settings':
        return <Settings />;
      case 'classroom':
        return <ClassroomView />;
      case 'submitted-assignments':
        return <SubmittedAssignments />;
      case 'deadlines':
        return <Deadlines />;
      case 'grades':
        return <Grades />;
      case 'messages':
        return <Messages />;
      case 'schedule':
        return <Schedule />;
      default:
        return <Dashboard onTabChange={handleTabChange} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-wrapper">
        {authMode === 'login' ? (
          <Login
            onLogin={login}
            onSwitchToRegister={() => setAuthMode('register')}
          />
        ) : (
          <Register
            onRegister={login}
            onSwitchToLogin={() => setAuthMode('login')}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <button
        type="button"
        className="sidebar-toggle"
        aria-label={isSidebarOpen ? 'Đóng menu' : 'Mở menu'}
        aria-expanded={isSidebarOpen}
        onClick={() => setIsSidebarOpen((value) => !value)}
      >
        {isSidebarOpen ? '✕' : '☰'}
      </button>

      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div
        className={`sidebar-backdrop ${isSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <main className="main">
        <div className="main-inner">{renderContent()}</div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <VoiceProvider>
          <MainApp />
        </VoiceProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
