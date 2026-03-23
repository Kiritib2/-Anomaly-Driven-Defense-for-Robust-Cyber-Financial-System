import { useTheme } from '../context/ThemeContext';

export default function Navbar({ title = 'Cyber Fraud Intelligence' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="h-20 glass-navbar sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r dark:from-white dark:to-slate-400 from-slate-900 to-slate-600">
          {title}
        </h2>
        <div className="relative w-96 hidden lg:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 dark:text-slate-500 text-slate-600">
            search
          </span>
          <input
            className="w-full dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm dark:text-slate-200 text-slate-800 dark:placeholder:text-slate-700 placeholder:text-slate-600"
            placeholder="Search threats, IPs, or domains..."
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="size-10 rounded-xl glass-panel flex items-center justify-center dark:text-slate-300 text-slate-600 hover:text-primary transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="material-symbols-outlined">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        {/* Notifications */}
        <button className="size-10 rounded-xl glass-panel flex items-center justify-center dark:text-slate-300 text-slate-600 hover:text-primary transition-colors relative">
          <span className="material-symbols-outlined">notifications</span>
          <span className="absolute top-2 right-2 size-2 bg-accent-purple rounded-full"></span>
        </button>
        <div className="h-8 w-px dark:bg-white/10 bg-black/10 mx-2"></div>
        {/* Profile */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold dark:text-white text-slate-900 leading-none">Security Analyst</p>
            <p className="text-[10px] text-accent-cyan mt-1 uppercase tracking-wider">Level 4 Access</p>
          </div>
          <div className="size-10 rounded-xl border dark:border-white/10 border-black/10 overflow-hidden group-hover:border-primary/50 transition-colors bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
