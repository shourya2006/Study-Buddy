import AnimatedHeroSection from "./components/animated-hero-section";
import "./App.css";
import TargetCursor from "./components/Cursor";
function App() {
  return (
    <>
      <TargetCursor
        spinDuration={2}
        hideDefaultCursor
        parallaxOn
        hoverDuration={0.2}
      />
      <AnimatedHeroSection />
    </>
  );
}

export default App;
