import { Routes, Route } from "react-router-dom";
import AnimatedHeroSection from "./components/animated-hero-section";
import TargetCursor from "./components/Cursor";
import SelectSemester from "./pages/SelectSemester";
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
      </Routes>
    </>
  );
}

export default App;
