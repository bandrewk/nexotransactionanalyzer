import { Routes, Route } from "react-router-dom";
import LandingPage from "./components/landing/LandingPage";
import PlatformShell from "./components/platform/PlatformShell";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/platform/*" element={<PlatformShell />} />
    </Routes>
  );
}

export default App;
