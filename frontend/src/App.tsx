import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { AppShell } from "@/components/layout/app-shell";
import { LeafMark } from "@/components/brand/Logo";

const LoginPage = lazy(() => import("@/pages/login-page").then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import("@/pages/dashboard-page").then((m) => ({ default: m.DashboardPage })));
const StockPage = lazy(() => import("@/pages/stock-page").then((m) => ({ default: m.StockPage })));
const PortfolioPage = lazy(() => import("@/pages/portfolio-page").then((m) => ({ default: m.PortfolioPage })));
const DerivativesPage = lazy(() => import("@/pages/derivatives-page").then((m) => ({ default: m.DerivativesPage })));
const RiskPage = lazy(() => import("@/pages/risk-page").then((m) => ({ default: m.RiskPage })));
const BacktesterPage = lazy(() => import("@/pages/backtester-page").then((m) => ({ default: m.BacktesterPage })));
const AssistantPage = lazy(() => import("@/pages/assistant-page").then((m) => ({ default: m.AssistantPage })));

function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <LeafMark size={32} className="animate-pulse" />
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stocks" element={<StockPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/derivatives" element={<DerivativesPage />} />
            <Route path="/risk" element={<RiskPage />} />
            <Route path="/backtester" element={<BacktesterPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
