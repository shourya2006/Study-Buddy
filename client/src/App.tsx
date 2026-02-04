import { Routes, Route } from "react-router-dom";
import AnimatedHeroSection from "./components/animated-hero-section";
import TargetCursor from "./components/Cursor";
import ProtectedRoute from "./components/ProtectedRoute";
import SelectSemester from "./pages/SelectSemester";
import SelectSubject from "./pages/SelectSubject";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import "./App.css";

function App() {
  return (
    <>
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<AnimatedHeroSection />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected Routes */}
        <Route
          path="/select-semester"
          element={
            <ProtectedRoute>
              <SelectSemester />
            </ProtectedRoute>
          }
        />
        <Route
          path="/select-subject/:semesterId"
          element={
            <ProtectedRoute>
              <SelectSubject />
            </ProtectedRoute>
          }
        />
        <Route
          path="/chat/:subjectId"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default App;
