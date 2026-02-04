import { Routes, Route } from "react-router-dom";
import AnimatedHeroSection from "./components/animated-hero-section";
import TargetCursor from "./components/Cursor";
import SelectSemester from "./pages/SelectSemester";
import SelectSubject from "./pages/SelectSubject";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
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
        <Route path="/" element={<AnimatedHeroSection />} />
        <Route path="/select-semester" element={<SelectSemester />} />
        <Route path="/select-subject/:semesterId" element={<SelectSubject />} />
        <Route path="/chat/:subjectId" element={<ChatPage />} />
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </>
  );
}

export default App;
