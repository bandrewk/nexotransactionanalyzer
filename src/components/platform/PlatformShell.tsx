import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar, { MobileMenuButton } from "../layout/Sidebar";
import ThemeToggle from "../ui/ThemeToggle";
import Spinner from "../ui/Spinner";
import HomePage from "./HomePage";
import OverviewPage from "./OverviewPage";
import CoinlistPage from "./CoinlistPage";
import TransactionsPage from "./TransactionsPage";
import { useAppStore } from "../../stores/app-store";
import { usePriceFeed } from "../../hooks/use-price-feed";
import { useFiatRates } from "../../hooks/use-fiat-rates";
import { useHistoricPrices } from "../../hooks/use-historic-prices";

export default function PlatformShell() {
  const isLoading = useAppStore((s) => s.isLoading);
  const hasData = useAppStore((s) => s.hasData);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  usePriceFeed();
  useFiatRates();
  useHistoricPrices();

  if (!hasData) return <Navigate to="/" replace />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface dark:bg-surface-dark">
        <Spinner text="Processing transactions..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-surface-dark">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 lg:px-8 py-4
          bg-slate-50/80 dark:bg-surface-dark/80 backdrop-blur-xl
          border-b border-slate-100 dark:border-white/[0.04]">
          <MobileMenuButton onClick={() => setSidebarOpen(true)} />
          <div className="lg:ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="p-6 lg:p-10">
          <Routes>
            <Route path="home" element={<HomePage />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="coinlist" element={<CoinlistPage />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="*" element={<Navigate to="home" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
