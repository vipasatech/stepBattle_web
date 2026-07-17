import { BrowserRouter, Route, Routes } from "react-router-dom";

import Home from "./pages/Home";
import Upgrade from "./pages/Upgrade";
import UpgradeSuccess from "./pages/UpgradeSuccess";
import UpgradeFailed from "./pages/UpgradeFailed";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/upgrade" element={<Upgrade />} />
        <Route path="/upgrade/success" element={<UpgradeSuccess />} />
        <Route path="/upgrade/failed" element={<UpgradeFailed />} />
        {/* Non-obvious URL to reduce hits from `/admin` scanners.
            Not a security boundary — the real gate is the is_admin
            flag checked server-side on every /api/admin-* call. */}
        <Route path="/admin-vp9421" element={<Admin />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;