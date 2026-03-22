import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Home, BarChart3, Coins, List, Save, LogOut, Menu, X } from "lucide-react";
import { useAppStore } from "../../stores/app-store";
import { hasSavedData } from "../../lib/storage";
import { useState, useEffect } from "react";

const navItems = [
  { to: "/platform/home", icon: Home, label: "Home" },
  { to: "/platform/overview", icon: BarChart3, label: "Overview" },
  { to: "/platform/coinlist", icon: Coins, label: "Coinlist" },
  { to: "/platform/transactions", icon: List, label: "Transactions" },
];

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-xl bg-white dark:bg-white/[0.05]
        border border-slate-200 dark:border-white/10
        text-slate-600 dark:text-slate-300
        hover:bg-slate-50 dark:hover:bg-white/[0.08]
        transition-colors cursor-pointer"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
}

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const save = useAppStore((s) => s.save);
  const exit = useAppStore((s) => s.exit);
  const [saved, setSaved] = useState(hasSavedData());

  // Close on route change (mobile)
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => { save(); setSaved(true); };
  const handleExit = () => { exit(); navigate("/"); };

  return (
    <>
      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen
        w-[26rem] shrink-0 flex flex-col
        bg-white dark:bg-[#0d1328]
        border-r border-slate-100 dark:border-white/[0.06]
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo + close */}
        <div className="px-8 pt-8 pb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo192_dark.png" alt="logo" className="h-[3rem] dark:hidden" />
            <img src="/logo192_white.png" alt="logo" className="h-[3rem] hidden dark:block" />
            <span className="text-[1.5rem] font-bold tracking-tight text-slate-900 dark:text-white">
              nexo-ta.com
            </span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer bg-transparent border-none"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-6 h-px bg-slate-100 dark:bg-white/[0.06]" />

        {/* Navigation */}
        <nav className="flex-1 px-4 pt-4">
          <p className="text-[1rem] font-semibold text-slate-400 uppercase tracking-wider px-4 mb-3">
            Menu
          </p>
          <ul className="list-none space-y-1">
            {navItems.map(({ to, icon: Icon, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[1.35rem] font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-accent/10 text-accent shadow-[inset_0_0_0_1px_rgba(59,130,246,0.15)]"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04] hover:text-slate-700 dark:hover:text-slate-200"
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Actions */}
        <div className="px-4 pb-6 space-y-1">
          <div className="mx-2 h-px bg-slate-100 dark:bg-white/[0.06] mb-3" />
          {!saved && (
            <button
              onClick={handleSave}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[1.35rem] font-medium
                text-slate-500 dark:text-slate-400
                hover:bg-slate-50 dark:hover:bg-white/[0.04]
                hover:text-slate-700 dark:hover:text-slate-200
                transition-all duration-200 cursor-pointer bg-transparent border-none"
            >
              <Save size={18} />
              Save Session
            </button>
          )}
          <button
            onClick={handleExit}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-[1.35rem] font-medium
              text-slate-500 dark:text-slate-400
              hover:bg-red-50 dark:hover:bg-red-500/5
              hover:text-red-500 dark:hover:text-red-400
              transition-all duration-200 cursor-pointer bg-transparent border-none"
          >
            <LogOut size={18} />
            Exit
          </button>
        </div>
      </aside>
    </>
  );
}
