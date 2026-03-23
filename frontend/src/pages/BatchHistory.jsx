import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getBatchJobs, getBatchStatus, submitBatchAnalysis } from '../services/api';

const STATUS_STYLES = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  processing: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 animate-pulse',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function BatchHistory() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState(null);
  const [expandedResults, setExpandedResults] = useState([]);
  const [expandLoading, setExpandLoading] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [indicatorText, setIndicatorText] = useState('');
  const [chunkSize, setChunkSize] = useState(20);
  const [submitting, setSubmitting] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await getBatchJobs();
      setJobs(data.jobs || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 5000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  const toggleExpand = async (jobId) => {
    if (expandedJob === jobId) {
      setExpandedJob(null);
      setExpandedResults([]);
      return;
    }
    setExpandedJob(jobId);
    setExpandLoading(true);
    try {
      const data = await getBatchStatus(jobId);
      setExpandedResults(data.results || []);
    } catch { setExpandedResults([]); }
    setExpandLoading(false);
  };

  const handleSubmit = async () => {
    const indicators = indicatorText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (indicators.length === 0) return;
    setSubmitting(true);
    try {
      await submitBatchAnalysis(indicators, chunkSize);
      setIndicatorText('');
      setSubmitOpen(false);
      fetchJobs();
    } catch { /* silent */ }
    setSubmitting(false);
  };

  return (
    <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight dark:text-white text-slate-900 flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-primary">manufacturing</span>
              Batch Processing Pipeline
            </h2>
            <p className="dark:text-slate-400 text-slate-700 mt-1">
              View previous batch jobs, their progress, and results. Auto-refreshes every 5s.
            </p>
          </div>
          <button
            onClick={() => setSubmitOpen(!submitOpen)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent-cyan text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            New Batch Job
          </button>
        </div>
      </motion.div>

      {/* Submit Panel */}
      <AnimatePresence>
        {submitOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-8"
          >
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-lg font-bold dark:text-white text-slate-900 mb-4">Submit New Batch Analysis</h3>
              <p className="text-sm dark:text-slate-400 text-slate-700 mb-4">
                Enter one indicator per line (IPs, domains, trace IDs). They will be split into chunks and processed in parallel threads.
              </p>
              <textarea
                value={indicatorText}
                onChange={e => setIndicatorText(e.target.value)}
                placeholder={'192.168.1.100\napt-28.ru.malware.net\nbot-crawler.example.com\n...'}
                rows={6}
                className="w-full bg-transparent border dark:border-white/10 border-black/10 rounded-xl p-4 text-sm font-mono dark:text-white text-slate-900 focus:outline-none focus:border-primary resize-none mb-4"
              />
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <label className="text-sm dark:text-slate-400 text-slate-700">Chunk Size:</label>
                  <input
                    type="number"
                    value={chunkSize}
                    onChange={e => setChunkSize(Number(e.target.value) || 20)}
                    min={1}
                    max={100}
                    className="w-20 bg-transparent border dark:border-white/10 border-black/10 rounded-lg px-3 py-1.5 text-sm dark:text-white text-slate-900 focus:outline-none focus:border-primary"
                  />
                </div>
                <span className="text-xs dark:text-slate-500 text-slate-600">
                  {indicatorText.split('\n').filter(l => l.trim()).length} indicators
                </span>
                <div className="flex-1"></div>
                <button
                  onClick={() => setSubmitOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm dark:text-slate-400 text-slate-700 hover:dark:text-white hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !indicatorText.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {submitting ? (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">play_arrow</span>
                  )}
                  {submitting ? 'Submitting...' : 'Run Pipeline'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center h-48">
          <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && jobs.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel rounded-2xl p-12 text-center"
        >
          <span className="material-symbols-outlined text-6xl dark:text-slate-600 text-slate-700 mb-4">inventory_2</span>
          <h3 className="text-lg font-bold dark:text-slate-400 text-slate-700 mb-2">No Batch Jobs Yet</h3>
          <p className="text-sm dark:text-slate-500 text-slate-600">Submit a batch analysis to see your processing history here.</p>
        </motion.div>
      )}

      {/* Jobs List */}
      {!loading && jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job, i) => (
            <motion.div
              key={job.job_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {/* Job Row */}
              <div
                onClick={() => job.status === 'completed' && toggleExpand(job.job_id)}
                className={`glass-panel rounded-2xl p-5 ${job.status === 'completed' ? 'cursor-pointer hover:scale-[1.005] transition-transform' : ''}`}
              >
                <div className="flex items-center gap-4">
                  {/* Status indicator */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    job.status === 'completed' ? 'bg-green-500/20' : job.status === 'processing' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  }`}>
                    <span className={`material-symbols-outlined text-xl ${
                      job.status === 'completed' ? 'text-green-400' : job.status === 'processing' ? 'text-yellow-400 animate-spin' : 'text-red-400'
                    }`}>
                      {job.status === 'completed' ? 'check_circle' : job.status === 'processing' ? 'sync' : 'error'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-sm font-bold dark:text-white text-slate-900 font-mono">{job.job_id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[job.status] || STATUS_STYLES.failed}`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs dark:text-slate-500 text-slate-600">
                      <span>Created: {job.created_at?.slice(0, 19)?.replace('T', ' ') || '—'}</span>
                      <span>•</span>
                      <span>Updated: {job.updated_at?.slice(0, 19)?.replace('T', ' ') || '—'}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-black dark:text-white text-slate-900">
                        {job.completed_items}<span className="text-sm font-normal dark:text-slate-500 text-slate-600">/{job.total_items}</span>
                      </p>
                      <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase">Items Processed</p>
                    </div>
                    <div className="w-32 hidden sm:block">
                      <div className="h-2 dark:bg-white/10 bg-black/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${job.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${job.total_items ? (job.completed_items / job.total_items) * 100 : 0}%` }}
                          transition={{ duration: 0.8 }}
                        ></motion.div>
                      </div>
                      <p className="text-[10px] dark:text-slate-500 text-slate-600 mt-1 text-center">
                        {job.total_items ? Math.round((job.completed_items / job.total_items) * 100) : 0}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black dark:text-white text-slate-900">{job.result_count ?? '—'}</p>
                      <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase">Results</p>
                    </div>
                    {job.status === 'completed' && (
                      <span className={`material-symbols-outlined text-xl dark:text-slate-500 text-slate-600 transition-transform ${expandedJob === job.job_id ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Results */}
              <AnimatePresence>
                {expandedJob === job.job_id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 glass-panel rounded-2xl p-5 max-h-96 overflow-y-auto">
                      {expandLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <span className="material-symbols-outlined animate-spin text-2xl text-primary">progress_activity</span>
                        </div>
                      ) : expandedResults.length === 0 ? (
                        <p className="text-sm dark:text-slate-500 text-slate-600 text-center py-6">No results found.</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="material-symbols-outlined text-primary text-lg">analytics</span>
                            <span className="text-sm font-bold dark:text-white text-slate-900">
                              {expandedResults.length} Results
                            </span>
                          </div>
                          {expandedResults.map((r, ri) => (
                            <div
                              key={ri}
                              className="flex items-center gap-3 p-3 rounded-xl dark:bg-white/[0.03] bg-black/[0.02] border dark:border-white/5 border-black/5"
                            >
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                r.state_level_threat?.detected ? 'bg-red-500' : r.bot_involvement?.detected ? 'bg-orange-500' : 'bg-green-500'
                              }`}></div>
                              <span className="text-sm font-mono dark:text-slate-200 text-slate-700 flex-1 truncate">
                                {r.indicator}
                              </span>
                              {r.state_level_threat?.detected && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400">
                                  STATE THREAT — {r.state_level_threat.actor}
                                </span>
                              )}
                              {r.bot_involvement?.detected && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-400">
                                  BOT
                                </span>
                              )}
                              {r.fraud_ring_data && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400">
                                  FRAUD RING
                                </span>
                              )}
                              {!r.state_level_threat?.detected && !r.bot_involvement?.detected && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400">
                                  CLEAN
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </>
  );
}
