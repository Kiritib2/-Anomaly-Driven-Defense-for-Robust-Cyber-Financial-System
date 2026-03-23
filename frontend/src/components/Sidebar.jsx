import { NavLink } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard Overview' },
  { to: '/phishing', icon: 'language', label: 'Phishing URL Checker' },
  { to: '/bot-detector', icon: 'smart_toy', label: 'Bot Detector' },
  { to: '/threat-analyzer', icon: 'troubleshoot', label: 'Threat Analyzer' },
  { to: '/fraud-ring', icon: 'hub', label: 'Fraud Ring Visualizer' },
  { to: '/incidents', icon: 'history_edu', label: 'Incident Logs' },
  { to: '/batch-history', icon: 'manufacturing', label: 'Batch Pipeline' },
];

export default function Sidebar() {
  const { isDark } = useTheme();

  return (
    <aside className="w-72 glass-sidebar fixed h-full z-50 flex flex-col">
      {/* Logo */}
      <div className="p-8 flex items-center gap-3">
        <div className="size-10 rounded-lg bg-gradient-to-br from-accent-cyan to-primary flex items-center justify-center neon-glow-cyan">
          <span className="material-symbols-outlined text-white text-2xl">shield_lock</span>
        </div>
        <div>
          <h1 className="text-lg font-bold leading-none dark:text-white text-slate-900">
            Fraud &amp; Phishing
          </h1>
          <p className="text-xs mt-1 dark:text-slate-400 text-slate-700">Detection Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-primary/20 text-accent-cyan border border-primary/30'
                  : 'dark:text-slate-400 text-slate-700 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-slate-900 cursor-pointer'
              }`
            }
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span className="text-sm font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-6 mt-auto">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl dark:text-slate-400 text-slate-700 hover:bg-black/5 dark:hover:bg-white/5 dark:hover:text-white hover:text-slate-900 transition-all cursor-pointer">
          <span className="material-symbols-outlined">settings</span>
          <span className="text-sm font-medium">Settings</span>
        </div>
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-accent-purple/20 to-primary/20 border dark:border-white/5 border-black/5">
          <p className="text-xs dark:text-slate-300 text-slate-600">Security Status</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-bold text-accent-cyan">OPTIMIZED</span>
            <div className="size-2 rounded-full bg-accent-cyan animate-pulse"></div>
          </div>
        </div>
      </div>
    </aside>
  );
}
