import { useState } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Classes from "./components/Classes-API";
import Lectures from "./components/Lectures";
import Assignments from "./components/Assignments";
import Students from "./components/Students";
import Settings from "./components/Settings";
import RightPanel from "./components/RightPanel";

import Login from "./components/Login";
import Register from "./components/Register";

import ClassroomView from "./components/ClassroomView"; // ⭐ PHASER CLASSROOM

import "./App.css";

function MainApp() {

  const [activeTab, setActiveTab] = useState("dashboard");

  const { user, login, logout, isAuthenticated } = useAuth();

  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const renderContent = () => {

    switch (activeTab) {

      case "dashboard":
        return <Dashboard />;

      case "classes":
        return <Classes onJoinClassroom={() => setActiveTab('classroom')} />;

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
        return <ClassroomView />;

      default:
        return <Dashboard />;
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

      <MainApp />

    </AuthProvider>

  );

}