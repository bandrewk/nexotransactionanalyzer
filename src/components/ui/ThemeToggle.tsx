import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/use-theme";

export default function ThemeToggle() {
  const { resolved, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      className="relative w-[3.6rem] h-[3.6rem] rounded-full flex items-center justify-center
        text-slate-400 hover:text-accent
        bg-slate-100 dark:bg-white/5
        hover:bg-slate-200 dark:hover:bg-white/10
        border border-slate-200 dark:border-white/10
        transition-all duration-200 cursor-pointer"
      aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
    >
      {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
