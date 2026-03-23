import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { healthCheck, getDashboardStats } from '../services/api';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const SEVERITY_MAP = {
  state_level_threat: 'Critical',
  fraud_ring: 'Critical',
  phishing: 'High',
  bot_activity: 'High',
  bot: 'High',
};

const ACTION_MAP = {
  flagged: 'Flagged',
  flagged_batch: 'Flagged (Batch)',
  blocked: 'Blocked',
};

export default function Dashboard() {
  const [backendOnline, setBackendOnline] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [online, data] = await Promise.all([
        healthCheck(),
        getDashboardStats().catch(() => null),
      ]);
      setBackendOnline(online);
      if (data) setStats(data);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  // Initial load + auto-refresh every 8 seconds
  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 8000);
    return () => clearInterval(id);
  }, [fetchAll]);

  // Stat cards derived from live data
  const cards = stats
    ? [
        { label: 'Total Incidents', value: formatNumber(stats.total_incidents), icon: 'warning', color: 'bg-red-500/20 text-red-500', bar: 'bg-red-500', pct: Math.min(stats.total_incidents * 2, 100) },
        { label: 'Phishing Detections', value: formatNumber(stats.phishing_count), icon: 'phishing', color: 'bg-accent-pink/20 text-accent-pink', bar: 'bg-accent-pink', pct: stats.total_incidents ? Math.round(stats.phishing_count / stats.total_incidents * 100) : 0 },
        { label: 'Bot Activity', value: formatNumber(stats.bot_count), icon: 'smart_toy', color: 'bg-primary/20 text-primary', bar: 'bg-primary', pct: stats.total_incidents ? Math.round(stats.bot_count / stats.total_incidents * 100) : 0 },
        { label: 'Fraud / State Threats', value: formatNumber(stats.fraud_count), icon: 'hub', color: 'bg-accent-purple/20 text-accent-purple', bar: 'bg-accent-purple', pct: stats.total_incidents ? Math.round(stats.fraud_count / stats.total_incidents * 100) : 0 },
      ]
    : [];

  const batchCards = stats
    ? [
        { label: 'Batch Jobs Total', value: stats.batch_jobs_total, icon: 'inventory_2', color: 'bg-accent-cyan/20 text-accent-cyan' },
        { label: 'Completed', value: stats.batch_jobs_completed, icon: 'check_circle', color: 'bg-green-500/20 text-green-400' },
        { label: 'Processing', value: stats.batch_jobs_processing, icon: 'sync', color: 'bg-yellow-500/20 text-yellow-400' },
        { label: 'Total Results Stored', value: formatNumber(stats.batch_results_total), icon: 'database', color: 'bg-primary/20 text-primary' },
      ]
    : [];

  const incidents = stats?.recent_incidents ?? [];

  // Threat distribution bars (from real data)
  const threatBars = stats
    ? [
        { label: 'Phishing', count: stats.phishing_count, color: 'bg-red-500' },
        { label: 'Bot', count: stats.bot_count, color: 'bg-accent-pink' },
        { label: 'Fraud', count: stats.fraud_count, color: 'bg-primary' },
        { label: 'Other', count: Math.max(stats.total_incidents - stats.phishing_count - stats.bot_count - stats.fraud_count, 0), color: 'bg-gray-500' },
      ]
    : [];
  const maxThreat = Math.max(...threatBars.map(b => b.count), 1);

  return (
    <>
      {/* Header */}
      <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-3xl font-bold tracking-tight dark:text-white text-slate-900">Dashboard Overview</h2>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            backendOnline
              ? 'bg-green-500/20 border border-green-500/30 text-green-400'
              : 'bg-yellow-500/20 border border-yellow-500/30 text-yellow-400'
          }`}>
            <span className={`size-1.5 rounded-full ${backendOnline ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`}></span>
            {backendOnline ? 'Live' : 'Offline'}
          </span>
          {backendOnline && (
            <span className="text-[10px] dark:text-slate-500 text-slate-600 ml-1">Auto-refreshes every 8s</span>
          )}
        </div>
        <p className="dark:text-slate-400 text-slate-700">Real-time cyber fraud monitoring and intelligence — powered by MongoDB.</p>
      </motion.div>

      {loading && !stats && (
        <div className="flex items-center justify-center h-64">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      )}

      {stats && (
        <>
          {/* Incident Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {cards.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-panel rounded-2xl p-6 relative overflow-hidden group hover:scale-[1.02] transition-transform"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-transparent to-white/5 rounded-bl-[60px]"></div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm dark:text-slate-400 text-slate-700 mb-1">{stat.label}</p>
                    <p className="text-3xl font-black dark:text-white text-slate-900">{stat.value}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-xl">{stat.icon}</span>
                  </div>
                </div>
                <div className="h-1 dark:bg-white/10 bg-black/10 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${stat.bar} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${stat.pct}%` }}
                    transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                  ></motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Batch Pipeline Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-10">
            <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">manufacturing</span>
              Thread Pipeline — Batch Processing
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {batchCards.map((bc, i) => (
                <motion.div
                  key={bc.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  className="glass-panel rounded-xl p-5 flex items-center gap-4"
                >
                  <div className={`w-10 h-10 rounded-lg ${bc.color} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-xl">{bc.icon}</span>
                  </div>
                  <div>
                    <p className="text-2xl font-black dark:text-white text-slate-900">{bc.value}</p>
                    <p className="text-xs dark:text-slate-400 text-slate-700">{bc.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-10">
            {/* Threat Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="lg:col-span-3 glass-panel rounded-2xl p-6"
            >
              <div className="mb-6">
                <h3 className="text-lg font-bold dark:text-white text-slate-900">Threat Distribution</h3>
                <p className="text-sm dark:text-slate-500 text-slate-600">Based on real incident data from MongoDB</p>
              </div>
              <div className="flex items-end justify-between h-44 gap-4 px-2">
                {threatBars.map((bar, i) => (
                  <div key={bar.label} className="flex flex-col items-center flex-1 gap-2">
                    <span className="text-xs font-bold dark:text-slate-300 text-slate-600">{bar.count}</span>
                    <motion.div
                      className={`w-full ${bar.color} rounded-t-lg`}
                      initial={{ height: 0 }}
                      animate={{ height: `${(bar.count / maxThreat) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.12 }}
                      style={{ minHeight: bar.count > 0 ? '8px' : '0px' }}
                    ></motion.div>
                    <span className="text-[11px] dark:text-slate-500 text-slate-600">{bar.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Live Status Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-lg font-bold dark:text-white text-slate-900">System Health</h3>
                <p className="text-sm dark:text-slate-500 text-slate-600 mb-6">MongoDB-backed live status</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Backend API', ok: backendOnline },
                  { label: 'MongoDB', ok: true },
                  { label: 'ML Models', ok: backendOnline },
                  { label: 'Batch Pipeline', ok: backendOnline },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <span className="text-sm dark:text-slate-300 text-slate-600">{s.label}</span>
                    <span className={`flex items-center gap-1 text-xs font-bold ${s.ok ? 'text-green-400' : 'text-red-400'}`}>
                      <span className={`size-2 rounded-full ${s.ok ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      {s.ok ? 'Online' : 'Down'}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Recent Incidents (real data) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-panel rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold dark:text-white text-slate-900">Recent Security Incidents</h3>
                <p className="text-sm dark:text-slate-500 text-slate-600">Live from MongoDB — last {incidents.length} records</p>
              </div>
            </div>
            {incidents.length === 0 ? (
              <p className="text-sm dark:text-slate-500 text-slate-600 py-8 text-center">
                No incidents recorded yet. Perform some scans to see data here.
              </p>
            ) : (
              <div className="space-y-3">
                {incidents.map((inc, i) => {
                  const severity = SEVERITY_MAP[inc.threat_type] || 'Medium';
                  const action = ACTION_MAP[inc.action_taken] || inc.action_taken;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.04 }}
                      className="flex items-center gap-4 p-4 rounded-xl dark:bg-white/[0.03] bg-black/[0.02] border dark:border-white/5 border-black/5 dark:hover:bg-white/[0.06] hover:bg-black/[0.04] transition-colors"
                    >
                      <div className={`w-2 h-2 rounded-full ${severity === 'Critical' ? 'bg-red-500' : severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`}></div>
                      <span className="text-xs dark:text-slate-500 text-slate-600 w-36 truncate font-mono">{inc.timestamp?.slice(0, 19) || '—'}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        inc.threat_type === 'phishing' ? 'bg-red-500/10 text-red-400'
                        : inc.threat_type?.includes('bot') ? 'bg-orange-500/10 text-orange-400'
                        : inc.threat_type === 'state_level_threat' ? 'bg-purple-500/10 text-purple-400'
                        : 'bg-blue-500/10 text-blue-400'
                      }`}>{inc.threat_type || 'unknown'}</span>
                      <span className="text-sm dark:text-slate-200 text-slate-700 font-mono flex-1 truncate">{inc.account_id}</span>
                      <span className="text-xs dark:text-slate-400 text-slate-700">prob: {(inc.fraud_probability * 100).toFixed(0)}%</span>
                      <span className={`text-xs font-bold uppercase ${action === 'Blocked' ? 'text-primary' : action.includes('Batch') ? 'text-accent-purple' : 'text-yellow-400'}`}>
                        {action}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </>
  );
}
