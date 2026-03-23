import { useState } from 'react';
import { motion } from 'framer-motion';
import { checkPhishing } from '../services/api';

export default function Phishing() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await checkPhishing(url.trim());
      setResult(data);
    } catch (err) {
      setError('Failed to connect to backend. Is the server running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  const riskColor = result
    ? result.risk_level === 'critical' ? 'red'
    : result.risk_level === 'high' ? 'red'
    : result.risk_level === 'medium' ? 'orange'
    : 'green'
    : 'red';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h3 className="text-3xl font-bold mb-2 dark:text-white text-slate-900">Check a URL</h3>
        <p className="dark:text-slate-400 text-slate-700 max-w-2xl">
          Use our advanced AI engine to scan suspicious URLs for phishing indicators, malicious scripts, and fraudulent behavior in real-time.
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-panel p-8 rounded-2xl mb-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          <label className="block text-sm font-medium dark:text-slate-300 text-slate-600 mb-3">Analyze Website URL</label>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">link</span>
              <input
                className="w-full dark:bg-black/20 bg-white/50 border dark:border-white/10 border-black/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-lg transition-all dark:placeholder:text-slate-600 placeholder:text-slate-600 dark:text-white text-slate-900"
                placeholder="https://secure-login-update.example-site.com/auth"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="bg-primary hover:bg-primary/80 px-8 py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 neon-glow-primary group disabled:opacity-50"
            >
              <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">
                {loading ? 'hourglass_empty' : 'rocket_launch'}
              </span>
              {loading ? 'Scanning...' : 'Analyze URL'}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 rounded-xl mb-8 border border-red-500/30 bg-red-500/10">
          <p className="text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>{error}
          </p>
        </motion.div>
      )}

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Probability Score */}
            <div className="lg:col-span-1 glass-panel rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className={`absolute inset-0 bg-${riskColor}-500/5 opacity-0 group-hover:opacity-100 transition-opacity`}></div>
              <h4 className="dark:text-slate-400 text-slate-700 font-medium mb-6 uppercase tracking-widest text-xs">Risk Probability</h4>
              <div className="relative flex items-center justify-center">
                <svg className="w-48 h-48 -rotate-90">
                  <circle cx="96" cy="96" fill="none" r="80" stroke="rgba(255,255,255,0.05)" strokeWidth="12"></circle>
                  <motion.circle
                    className={`text-${riskColor}-500`}
                    cx="96" cy="96" fill="none" r="80"
                    stroke="currentColor"
                    strokeDasharray="502"
                    initial={{ strokeDashoffset: 502 }}
                    animate={{ strokeDashoffset: 502 - (result.phishing_score / 100) * 502 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeWidth="12"
                    style={{ filter: `drop-shadow(0 0 8px rgba(239,68,68,0.8))` }}
                  ></motion.circle>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <motion.span
                    className="text-5xl font-black dark:text-white text-slate-900"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    {result.phishing_score}<span className="text-2xl dark:text-slate-500 text-slate-600">%</span>
                  </motion.span>
                  <span className={`text-xs text-${riskColor}-400 font-bold uppercase mt-1`}>
                    {result.risk_level}
                  </span>
                </div>
              </div>
              <div className="mt-8 flex gap-4 w-full">
                <div className="flex-1 text-center py-2 dark:bg-white/5 bg-black/5 rounded-lg border dark:border-white/5 border-black/5">
                  <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase">Features</p>
                  <p className="text-sm font-bold dark:text-white text-slate-900">{result.features_extracted}</p>
                </div>
                <div className="flex-1 text-center py-2 dark:bg-white/5 bg-black/5 rounded-lg border dark:border-white/5 border-black/5">
                  <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase">Model</p>
                  <p className="text-sm font-bold dark:text-white text-slate-900">RF v1.0</p>
                </div>
              </div>
            </div>

            {/* Risk Details */}
            <div className="lg:col-span-2 glass-panel rounded-2xl p-8 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-xl font-bold mb-1 dark:text-white text-slate-900">
                    Threat Level: {result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)}
                  </h4>
                  <p className="dark:text-slate-400 text-slate-700 text-sm font-mono break-all">{result.url}</p>
                </div>
                <div className={`px-4 py-2 bg-${riskColor}-500/20 border border-${riskColor}-500/50 rounded-full text-${riskColor}-500 text-xs font-bold uppercase flex items-center gap-2`}>
                  <span className="material-symbols-outlined text-sm">
                    {result.phishing_score >= 50 ? 'dangerous' : 'verified_user'}
                  </span>
                  {result.risk_level}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10">
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-500">
                    <span className="material-symbols-outlined">dns</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold dark:text-white text-slate-900">Domain Analysis</p>
                    <p className="text-xs dark:text-slate-500 text-slate-600">
                      {result.phishing_score >= 50 ? 'Suspicious domain structure detected. Multiple phishing indicators found.' : 'Domain appears legitimate based on structural analysis.'}
                    </p>
                  </div>
                  <span className={`material-symbols-outlined ${result.phishing_score >= 50 ? 'text-red-500' : 'text-green-500'}`}>
                    {result.phishing_score >= 50 ? 'error' : 'check_circle'}
                  </span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10">
                  <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-500">
                    <span className="material-symbols-outlined">terminal</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold dark:text-white text-slate-900">URL Feature Scan</p>
                    <p className="text-xs dark:text-slate-500 text-slate-600">
                      {result.features_extracted} features extracted and analyzed by RandomForest classifier.
                    </p>
                  </div>
                  <span className={`material-symbols-outlined ${result.phishing_score >= 25 ? 'text-orange-500' : 'text-green-500'}`}>
                    {result.phishing_score >= 25 ? 'warning' : 'check_circle'}
                  </span>
                </div>
                <div className="flex items-center gap-4 p-4 rounded-xl dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-500">
                    <span className="material-symbols-outlined">badge</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold dark:text-white text-slate-900">Keyword Pattern Detection</p>
                    <p className="text-xs dark:text-slate-500 text-slate-600">
                      URL scanned for suspicious keywords (login, verify, account, secure, etc.).
                    </p>
                  </div>
                  <span className={`material-symbols-outlined ${result.phishing_score >= 40 ? 'text-yellow-500' : 'text-green-500'}`}>
                    {result.phishing_score >= 40 ? 'report' : 'check_circle'}
                  </span>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button className="px-6 py-2 rounded-lg text-sm font-medium border dark:border-white/10 border-black/10 dark:hover:bg-white/5 hover:bg-black/5 transition-colors dark:text-slate-200 text-slate-700">Generate PDF Report</button>
                {result.phishing_score >= 50 && (
                  <button className="px-6 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors">Block Domain Globally</button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Footer Stats */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8"
      >
        {[
          { icon: 'verified_user', color: 'text-primary', label: 'Safe Domains', value: '12.4M' },
          { icon: 'block', color: 'text-red-500', label: 'Threats Blocked', value: '842K' },
          { icon: 'update', color: 'text-emerald-500', label: 'Database Update', value: '4m ago' },
          { icon: 'query_stats', color: 'text-blue-400', label: 'Daily Scans', value: '2.1M' },
        ].map((stat) => (
          <div key={stat.label} className="glass-panel p-4 rounded-xl flex items-center gap-3">
            <span className={`material-symbols-outlined ${stat.color}`}>{stat.icon}</span>
            <div>
              <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase font-bold">{stat.label}</p>
              <p className="text-lg font-bold dark:text-white text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </motion.div>
    </>
  );
}
