import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Upgrade from "./pages/Upgrade";
import UpgradeSuccess from "./pages/UpgradeSuccess";
import UpgradeFailed from "./pages/UpgradeFailed";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upgrade" element={<Upgrade />} />
        <Route path="/upgrade/success" element={<UpgradeSuccess />} />
        <Route path="/upgrade/failed" element={<UpgradeFailed />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;