import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getIncidentLogs } from '../services/api';

const filterTabs = ['All Threats', 'Phishing', 'Bot Activity', 'Account Takeover', 'Credential Stuffing'];

const fallbackIncidents = [
  { timestamp: '2023-11-24T18:42:01', account_id: 'ACC-001045', transaction_id: 'TXN-A1B2C3', fraud_probability: 85, action_taken: 'Blocked', threat_type: 'phishing' },
  { timestamp: '2023-11-24T18:40:15', account_id: 'ACC-002100', transaction_id: 'TXN-D4E5F6', fraud_probability: 92, action_taken: 'Flagged', threat_type: 'bot_activity' },
  { timestamp: '2023-11-24T18:38:44', account_id: 'ACC-003200', transaction_id: 'TXN-G7H8I9', fraud_probability: 40, action_taken: 'Monitored', threat_type: 'credential_stuffing' },
  { timestamp: '2023-11-24T18:35:10', account_id: 'ACC-004300', transaction_id: 'TXN-J0K1L2', fraud_probability: 78, action_taken: 'Blocked', threat_type: 'phishing' },
  { timestamp: '2023-11-24T18:32:33', account_id: 'ACC-005400', transaction_id: 'TXN-M3N4O5', fraud_probability: 95, action_taken: 'Isolated', threat_type: 'bot_activity' },
  { timestamp: '2023-11-24T18:28:12', account_id: 'ACC-006500', transaction_id: 'TXN-P6Q7R8', fraud_probability: 65, action_taken: 'MFA Required', threat_type: 'account_takeover' },
];

function getThreatColor(type) {
  switch (type) {
    case 'phishing': return 'red';
    case 'bot_activity': return 'orange';
    case 'credential_stuffing': return 'blue';
    case 'account_takeover': return 'purple';
    default: return 'slate';
  }
}

function getScoreColor(score) {
  if (score >= 80) return 'bg-red-500';
  if (score >= 60) return 'bg-orange-500';
  if (score >= 40) return 'bg-yellow-500';
  return 'bg-blue-500';
}

export default function IncidentLogs() {
  const [incidents, setIncidents] = useState(fallbackIncidents);
  const [activeFilter, setActiveFilter] = useState(0);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await getIncidentLogs(50);
        if (data.incidents && data.incidents.length > 0) {
          setIncidents(data.incidents);
          setIsLive(true);
        }
      } catch {
        // Use fallback data
      }
    }
    fetchLogs();
  }, []);

  const filteredIncidents = activeFilter === 0
    ? incidents
    : incidents.filter((inc) => {
        const filterMap = ['', 'phishing', 'bot_activity', 'account_takeover', 'credential_stuffing'];
        return inc.threat_type === filterMap[activeFilter];
      });

  return (
    <>
      {/* Background decorations */}
      <div className="fixed top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold tracking-tight dark:text-white text-slate-900">Incident Logs</h2>
            {isLive && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase">
                <span className="size-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Live
              </span>
            )}
          </div>
          <p className="dark:text-slate-400 text-slate-700">Real-time monitoring of global phishing and fraud attempts across all clusters.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 dark:bg-white/5 bg-black/5 dark:hover:bg-white/10 hover:bg-black/10 border dark:border-white/10 border-black/10 rounded-lg text-sm font-medium transition-all dark:text-slate-200 text-slate-700">
            <span className="material-symbols-outlined text-xl">filter_list</span>
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-xl">download</span>
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {filterTabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(i)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              i === activeFilter
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'dark:bg-white/5 bg-black/5 dark:hover:bg-white/10 hover:bg-black/10 dark:text-slate-300 text-slate-600 border dark:border-white/10 border-black/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-xl overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b dark:border-white/5 border-black/5 dark:bg-white/5 bg-black/5">
                <th className="px-6 py-4 text-xs font-semibold dark:text-slate-400 text-slate-700 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold dark:text-slate-400 text-slate-700 uppercase tracking-wider">Account ID</th>
                <th className="px-6 py-4 text-xs font-semibold dark:text-slate-400 text-slate-700 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-4 text-xs font-semibold dark:text-slate-400 text-slate-700 uppercase tracking-wider">Threat Type</th>
                <th className="px-6 py-4 text-xs font-semibold dark:text-slate-400 text-slate-700 uppercase tracking-wider">Fraud Score</th>
                <th className="px-6 py-4 text-xs font-semibold dark:text-slate-400 text-slate-700 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-semibold dark:text-slate-400 text-slate-700 uppercase tracking-wider text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-white/5 divide-black/5">
              {filteredIncidents.map((inc, i) => {
                const color = getThreatColor(inc.threat_type);
                return (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="dark:hover:bg-white/[0.03] hover:bg-black/[0.02] transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium dark:text-slate-200 text-slate-700">
                      {new Date(inc.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap font-mono text-sm dark:text-slate-300 text-slate-700">{inc.account_id}</td>
                    <td className="px-6 py-5 whitespace-nowrap font-mono text-sm dark:text-slate-300 text-slate-700">{inc.transaction_id}</td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                        {(inc.threat_type || 'unknown').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1.5 dark:bg-white/10 bg-black/10 rounded-full overflow-hidden">
                          <div className={`h-full ${getScoreColor(inc.fraud_probability)} rounded-full`} style={{ width: `${inc.fraud_probability}%` }}></div>
                        </div>
                        <span className="text-sm font-bold dark:text-slate-100 text-slate-800">{inc.fraud_probability}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`text-sm font-semibold ${
                        inc.action_taken === 'Blocked' || inc.action_taken === 'blocked' ? 'text-primary'
                        : inc.action_taken === 'Isolated' || inc.action_taken === 'isolated' ? 'dark:text-slate-300 text-slate-600'
                        : 'dark:text-slate-500 text-slate-600'
                      }`}>
                        {inc.action_taken}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <button className="dark:text-slate-500 text-slate-600 group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">chevron_right</span>
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t dark:border-white/5 border-black/5 flex items-center justify-between dark:bg-white/[0.02] bg-black/[0.01]">
          <p className="text-sm dark:text-slate-500 text-slate-600">
            Showing <span className="dark:text-slate-200 text-slate-700">{filteredIncidents.length}</span> incidents
            {isLive && <span className="text-green-400 ml-2">• Connected to backend</span>}
          </p>
          <div className="flex gap-2">
            <button className="size-8 flex items-center justify-center rounded-lg border dark:border-white/10 border-black/10 dark:hover:bg-white/5 hover:bg-black/5 transition-colors dark:text-slate-400 text-slate-700">
              <span className="material-symbols-outlined text-lg">chevron_left</span>
            </button>
            <button className="size-8 flex items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">1</button>
            <button className="size-8 flex items-center justify-center rounded-lg border dark:border-white/10 border-black/10 dark:hover:bg-white/5 hover:bg-black/5 transition-colors dark:text-slate-400 text-slate-700">
              <span className="material-symbols-outlined text-lg">chevron_right</span>
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
