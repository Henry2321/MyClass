import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import { VoiceProvider } from "./contexts/VoiceContext";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Classes from "./components/Classes-API";
import Lectures from "./components/Lectures";
import Assignments from "./components/Assignments";
import Students from "./components/Students";
import Settings from "./components/Settings";
import RightPanel from "./components/RightPanel";

// Dashboard Sub-pages
import SubmittedAssignments from "./components/dashboard-pages/SubmittedAssignments";
import Deadlines from "./components/dashboard-pages/Deadlines";
import Grades from "./components/dashboard-pages/Grades";
import Messages from "./components/dashboard-pages/Messages";
import Schedule from "./components/dashboard-pages/Schedule";

import Login from "./components/Login";
import Register from "./components/Register";

import ClassroomView from "./components/ClassroomView"; // ⭐ PHASER CLASSROOM

import "./App.css";

function MainApp() {

  const [activeTab, setActiveTab] = useState("dashboard");
  const [activeClassId, setActiveClassId] = useState<string | null>(null);

  const { user, login, logout, isAuthenticated } = useAuth();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const renderContent = () => {

    switch (activeTab) {

      case "dashboard":
        return <Dashboard onTabChange={setActiveTab} />;

      case "classes":
        return <Classes onJoinClassroom={(classId) => {
          setActiveClassId(classId);
          setActiveTab('classroom');
        }} />;

      case "lectures":
        return <Lectures />;

      case "assignments":
        return <Assignments />;

      case "students":
        return <Students />;

      case "settings":
        return <Settings />;

      // ⭐ TRANG LỚP HỌC ẢO
      case "classroom":
        return <ClassroomView classId={activeClassId || ''} />;

      // ⭐ TRANG DASHBOARD PHỤ
      case "submitted-assignments":
        return <SubmittedAssignments />;

      case "deadlines":
        return <Deadlines />;

      case "grades":
        return <Grades />;

      case "messages":
        return <Messages />;

      case "schedule":
        return <Schedule />;

      default:
        return <Dashboard onTabChange={setActiveTab} />;
    }

  };

  // nếu chưa login
  if (!isAuthenticated) {

    return (
      <div className="auth-wrapper">

        {authMode === "login" ? (

          <Login
            onLogin={login}
            onSwitchToRegister={() => setAuthMode("register")}
          />

        ) : (

          <Register
            onRegister={login}
            onSwitchToLogin={() => setAuthMode("login")}
          />

        )}

      </div>
    );

  }

  return (

    <div className="app">

      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        user={user}
        onLogout={logout}
      />

      <main className="main">

        {renderContent()}

      </main>

      <RightPanel />

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