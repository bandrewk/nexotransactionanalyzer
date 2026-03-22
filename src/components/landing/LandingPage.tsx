import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, Link2, PieChart, History, Coins,
  Award, Clock, List, ArrowDownUp, Shield, Lock, Github,
} from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import FileUpload from "./FileUpload";
import Footer from "../layout/Footer";
import { useAppStore } from "../../stores/app-store";

const features = [
  { icon: List, label: "Transaction tracking", desc: "Full history of every Nexo transaction" },
  { icon: Link2, label: "Blockchain explorer links", desc: "Direct TX linkage for 19+ chains" },
  { icon: BarChart3, label: "Analytics & charts", desc: "Interactive graphs and breakdowns" },
  { icon: History, label: "Historic portfolio", desc: "Portfolio value over time with daily prices" },
  { icon: PieChart, label: "Live portfolio value", desc: "Real-time prices via CoinGecko" },
  { icon: Coins, label: "Coinlist & interest", desc: "Holdings breakdown with earned interest" },
  { icon: Award, label: "Referral & cashback", desc: "Track bonuses and card cashback" },
  { icon: Clock, label: "Pending transactions", desc: "See what's still processing" },
  { icon: ArrowDownUp, label: "Deposit & withdrawal", desc: "Full deposit/withdrawal history" },
  { icon: Github, label: "Open source", desc: "Free, transparent, community-driven" },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const loadFromStorage = useAppStore((s) => s.loadFromStorage);
  const hasData = useAppStore((s) => s.hasData);

  useEffect(() => {
    if (hasData) { navigate("/platform"); return; }
    const restored = loadFromStorage();
    if (restored) navigate("/platform");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onUploadSuccess = useCallback(() => {
    navigate("/platform");
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface dark:bg-surface-dark relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-[-30rem] left-1/2 -translate-x-1/2 w-[80rem] h-[60rem] bg-accent/5 dark:bg-accent/8 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative max-w-[96rem] mx-auto px-6 md:px-12 lg:px-16">
        {/* Nav bar */}
        <nav className="flex items-center justify-between py-6 mb-8">
          <div className="flex items-center gap-3">
            <img src="/logo192_dark.png" alt="nexo-ta.com" className="h-[3.2rem] dark:hidden" />
            <img src="/logo192_white.png" alt="nexo-ta.com" className="h-[3.2rem] hidden dark:block" />
            <span className="text-[1.6rem] font-bold tracking-tight text-slate-900 dark:text-white">
              nexo-ta.com
            </span>
          </div>
          <ThemeToggle />
        </nav>

        {/* Hero */}
        <header className="text-center pt-12 pb-16 animate-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[1.2rem] font-medium mb-8">
            <span className="w-[6px] h-[6px] rounded-full bg-accent animate-pulse" />
            Version 4.0 — Rebuilt from scratch
          </div>
          <h1 className="text-[4.4rem] md:text-[5.6rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6">
            Analyze your Nexo
            <br />
            <span className="text-accent">transactions</span>
          </h1>
          <p className="text-[1.6rem] md:text-[1.8rem] text-slate-500 dark:text-slate-400 max-w-[56rem] mx-auto leading-relaxed">
            A privacy-first analytical tool for the Nexo lending platform.
            Upload your CSV export and get instant portfolio insights.
          </p>
        </header>

        {/* Upload */}
        <div className="animate-in" style={{ animationDelay: "0.1s" }}>
          <FileUpload onSuccess={onUploadSuccess} />
        </div>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-8 my-20 animate-in" style={{ animationDelay: "0.2s" }}>
          {[
            { icon: Shield, text: "100% client-side" },
            { icon: Lock, text: "No data leaves your browser" },
            { icon: Github, text: "Open source" },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3 text-[1.3rem] text-slate-500 dark:text-slate-400">
              <Icon size={16} className="text-accent" />
              <span>{text}</span>
            </div>
          ))}
        </div>

        {/* Features */}
        <section className="mb-24 animate-in" style={{ animationDelay: "0.3s" }}>
          <h2 className="text-[2.4rem] font-bold text-slate-900 dark:text-white text-center mb-4">
            Everything you need
          </h2>
          <p className="text-[1.4rem] text-slate-500 dark:text-slate-400 text-center mb-12 max-w-[48rem] mx-auto">
            From basic transaction tracking to advanced portfolio analytics.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="group p-5 rounded-2xl
                  bg-white dark:bg-white/[0.03]
                  border border-slate-100 dark:border-white/[0.06]
                  hover:border-accent/30 dark:hover:border-accent/30
                  transition-all duration-300"
              >
                <div className="w-[3.6rem] h-[3.6rem] rounded-xl bg-accent/10 flex items-center justify-center mb-4
                  group-hover:bg-accent/20 transition-colors duration-300">
                  <Icon size={18} className="text-accent" />
                </div>
                <h3 className="text-[1.3rem] font-semibold text-slate-800 dark:text-white mb-1">
                  {label}
                </h3>
                <p className="text-[1.15rem] text-slate-500 dark:text-slate-500 leading-snug">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Nexo referral */}
        <section className="mb-24 animate-in" style={{ animationDelay: "0.32s" }}>
          <div className="max-w-[64rem] mx-auto p-8 rounded-2xl bg-gradient-to-r from-accent/5 to-accent/10 dark:from-accent/5 dark:to-accent/10 border border-accent/15">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="text-[1.6rem] font-bold text-slate-900 dark:text-white mb-1">
                  Not on Nexo yet?
                </h3>
                <p className="text-[1.3rem] text-slate-500 dark:text-slate-400">
                  Join Nexo and start earning interest on your crypto.
                </p>
              </div>
              <a
                href="https://nexo.com/ref/apradj05mq?src=web-link"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-2 px-8 py-3 rounded-xl
                  bg-accent text-white text-[1.3rem] font-semibold
                  hover:bg-accent-hover active:scale-[0.98]
                  transition-all duration-200 shadow-[0_2px_12px_rgba(59,130,246,0.3)]
                  no-underline"
              >
                Join Now
                <span className="text-[1.1rem] opacity-70">&rarr;</span>
              </a>
            </div>
          </div>
        </section>

        {/* Security callout */}
        <section className="mb-24 animate-in" style={{ animationDelay: "0.35s" }}>
          <div className="max-w-[64rem] mx-auto p-8 rounded-2xl bg-amber-50/80 dark:bg-amber-500/5 border border-amber-200/60 dark:border-amber-500/10">
            <div className="flex items-start gap-4">
              <div className="w-[3.6rem] h-[3.6rem] rounded-xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                <Shield size={18} className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-[1.4rem] font-semibold text-amber-900 dark:text-amber-300 mb-1">
                  Security notice
                </h3>
                <p className="text-[1.3rem] text-amber-800/80 dark:text-amber-300/60 leading-relaxed">
                  Do not share your nexo.com login or any wallet details. This app
                  only uses the exported transactions .csv file. All processing happens
                  entirely in your browser.
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
