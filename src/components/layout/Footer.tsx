export default function Footer() {
  return (
    <footer className="py-16 border-t border-slate-100 dark:border-white/[0.06]">
      <div className="max-w-[64rem] mx-auto space-y-8 text-center">
        {/* Links row */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[1.2rem]">
          <span className="text-slate-400">Version 4.0</span>
          <span className="text-slate-300 dark:text-slate-600">&middot;</span>
          <span className="text-slate-400">&copy; 2021&ndash;2026 bandrewk</span>
          <span className="text-slate-300 dark:text-slate-600">&middot;</span>
          <a
            href="https://github.com/bandrewk/nexotransactionanalyzer"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            GitHub
          </a>
        </div>

        {/* Data sources */}
        <p className="text-[1.15rem] text-slate-400 max-w-[48rem] mx-auto">
          Market data provided by CoinGecko, CryptoCompare, and frankfurter.app.
        </p>

        {/* License */}
        <p className="text-[1.1rem] text-slate-400/70 max-w-[56rem] mx-auto leading-relaxed">
          Distributed under AGPL-3.0. This software is provided WITHOUT ANY WARRANTY;
          without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
        </p>

        {/* Disclaimer */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/[0.04]">
          <p className="text-[1.15rem] font-medium text-slate-500 dark:text-slate-400 mb-2">
            Notice of Non-Affiliation and Disclaimer
          </p>
          <p className="text-[1.1rem] text-slate-400/80 max-w-[56rem] mx-auto leading-relaxed">
            We are not affiliated, associated, authorized, endorsed by, or in any
            way officially connected with Nexo Financial LLC, or any of its
            subsidiaries or its affiliates. The official Nexo Financial LLC website
            can be found at{" "}
            <a href="https://www.nexo.com" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              nexo.com
            </a>
            . The name NEXO as well as related names, marks, emblems and images are
            registered trademarks of their respective owners.
          </p>
        </div>
      </div>
    </footer>
  );
}
