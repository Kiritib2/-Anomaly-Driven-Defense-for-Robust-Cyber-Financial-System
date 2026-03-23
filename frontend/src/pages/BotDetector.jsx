import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { detectBot, uploadBotDataset, detectBotBatch, getBotBatches } from '../services/api';

export default function BotDetector() {
  const [activeTab, setActiveTab] = useState('single'); // 'single', 'batch', or 'csv'
  
  const [transactionId, setTransactionId] = useState('');
  const [result, setResult] = useState(null);
  
  const [batchId, setBatchId] = useState('');
  const [batchResult, setBatchResult] = useState(null);
  const [availableBatches, setAvailableBatches] = useState([]);
  
  const [file, setFile] = useState(null);
  const [csvResult, setCsvResult] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fileInputRef = useRef(null);

  // Fetch available batches when switching to batch tab
  useEffect(() => {
    if (activeTab === 'batch') {
      getBotBatches()
        .then(data => setAvailableBatches(data.batches || []))
        .catch(() => setAvailableBatches([]));
    }
  }, [activeTab]);

  const handleDetect = async () => {
    if (!transactionId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await detectBot(transactionId.trim());
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend. Is the server running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDetect = async () => {
    if (!batchId.trim()) return;
    setLoading(true);
    setError(null);
    setBatchResult(null);
    try {
      const data = await detectBotBatch(batchId.trim());
      setBatchResult(data);
    } catch (err) {
      setError(err.message || 'Batch detection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }
    
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setCsvResult(null);
    
    try {
      const data = await uploadBotDataset(selectedFile);
      setCsvResult(data);
    } catch (err) {
      setError(err.message || 'Failed to upload dataset. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  // Shared batch results renderer (used by both batch ID and CSV)
  const renderBatchResults = (bResult) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
         <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-primary">
            <div className="p-3 bg-primary/10 rounded-xl text-primary"><span className="material-symbols-outlined text-2xl">dataset</span></div>
            <div>
               <p className="text-xs dark:text-slate-400 text-slate-600 uppercase font-bold">Total Scanned</p>
               <p className="text-2xl font-black dark:text-white">{bResult.total_scanned}</p>
            </div>
         </div>
         <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-red-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-xl -mr-10 -mt-10"></div>
            <div className="p-3 bg-red-500/10 rounded-xl text-red-500 relative z-10"><span className="material-symbols-outlined text-2xl">smart_toy</span></div>
            <div className="relative z-10">
               <p className="text-xs dark:text-slate-400 text-slate-600 uppercase font-bold">Bots Detected</p>
               <p className="text-2xl font-black text-red-500">{bResult.total_bots_detected}</p>
            </div>
         </div>
         <div className="glass-panel p-6 rounded-2xl flex items-center gap-4 border-l-4 border-l-green-500">
            <div className="p-3 bg-green-500/10 rounded-xl text-green-500"><span className="material-symbols-outlined text-2xl">verified</span></div>
            <div>
               <p className="text-xs dark:text-slate-400 text-slate-600 uppercase font-bold">Avg Confidence</p>
               <p className="text-2xl font-black text-green-500">{bResult.overall_confidence}%</p>
            </div>
         </div>
      </div>

      <div className="glass-panel p-8 rounded-2xl">
         <h4 className="text-xl font-bold dark:text-white text-slate-900 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-red-500">flag</span>
            Top Priority Intercepts (Flagged)
         </h4>
         
         {bResult.flagged_transactions.length === 0 ? (
            <div className="text-center py-10 dark:text-slate-400 text-slate-600">
               <span className="material-symbols-outlined text-4xl mb-4 opacity-50">verified_user</span>
               <p>No high-risk transactions detected.</p>
            </div>
         ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b dark:border-white/10 border-black/10">
                        <th className="py-4 px-4 font-bold text-sm dark:text-slate-300 text-slate-600">Transaction ID</th>
                        <th className="py-4 px-4 font-bold text-sm dark:text-slate-300 text-slate-600">Amount</th>
                        <th className="py-4 px-4 font-bold text-sm dark:text-slate-300 text-slate-600">Fraud Probability</th>
                        <th className="py-4 px-4 font-bold text-sm dark:text-slate-300 text-slate-600 text-right">Action</th>
                     </tr>
                  </thead>
                  <tbody>
                     {bResult.flagged_transactions.map((txn, idx) => (
                        <tr key={idx} className="border-b dark:border-white/5 border-black/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                           <td className="py-4 px-4 font-mono text-sm dark:text-slate-300">{txn.transaction_id}</td>
                           <td className="py-4 px-4 font-bold dark:text-white">${txn.amount.toLocaleString()}</td>
                           <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-24 h-2 rounded-full dark:bg-white/10 bg-black/10 overflow-hidden">
                                    <div className="h-full bg-red-500" style={{ width: `${txn.fraud_probability}%` }}></div>
                                 </div>
                                 <span className="text-xs font-bold text-red-500">{txn.fraud_probability}%</span>
                              </div>
                           </td>
                           <td className="py-4 px-4 text-right">
                              <button className="text-xs px-3 py-1 rounded bg-red-500/20 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors">
                                 Review
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
    </motion.div>
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-10"
      >
        <h3 className="text-3xl font-bold mb-2 dark:text-white text-slate-900">Financial Bot Detector</h3>
        <p className="dark:text-slate-400 text-slate-700 max-w-2xl">
          Analyze transactions for automated bot activity using our ML-powered behavioral analysis engine.
          Detects zero-balance draining, rapid cycling, and suspicious velocity patterns.
        </p>
      </motion.div>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="glass-panel p-8 rounded-2xl mb-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-cyan/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="relative z-10">
          
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b dark:border-white/10 border-black/10 pb-4">
            <button 
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'single' ? 'bg-accent-cyan text-black neon-glow-cyan' : 'dark:text-slate-400 text-slate-600 dark:hover:bg-white/5 hover:bg-black/5'}`}
            >
              Single Check
            </button>
            <button 
              onClick={() => setActiveTab('batch')}
              className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'batch' ? 'bg-accent-purple text-white neon-glow-purple' : 'dark:text-slate-400 text-slate-600 dark:hover:bg-white/5 hover:bg-black/5'}`}
            >
              <span className="material-symbols-outlined text-sm">database</span>
              Batch Analysis
            </button>
            <button 
              onClick={() => setActiveTab('csv')}
              className={`px-4 py-2 font-bold rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'csv' ? 'bg-amber-500 text-black' : 'dark:text-slate-400 text-slate-600 dark:hover:bg-white/5 hover:bg-black/5'}`}
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              CSV Upload
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* Single Check Tab */}
            {activeTab === 'single' && (
              <motion.div
                key="single"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <label className="block text-sm font-medium dark:text-slate-300 text-slate-600 mb-3">
                  Transaction ID
                </label>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-accent-cyan">
                      receipt_long
                    </span>
                    <input
                      className="w-full dark:bg-black/20 bg-white/50 border dark:border-white/10 border-black/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-lg transition-all dark:placeholder:text-slate-600 placeholder:text-slate-600 dark:text-white text-slate-900"
                      placeholder="TXN-00001"
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDetect()}
                    />
                  </div>
                  <button
                    onClick={handleDetect}
                    disabled={loading}
                    className="bg-accent-cyan hover:bg-accent-cyan/80 px-8 py-4 rounded-xl font-bold text-black transition-all flex items-center justify-center gap-2 neon-glow-cyan group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">
                      {loading ? 'hourglass_empty' : 'smart_toy'}
                    </span>
                    {loading ? 'Analyzing...' : 'Detect Bot'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Batch Analysis Tab */}
            {activeTab === 'batch' && (
              <motion.div
                key="batch"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <label className="block text-sm font-medium dark:text-slate-300 text-slate-600 mb-3">
                  Batch ID
                </label>
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-accent-purple">
                      database
                    </span>
                    <input
                      className="w-full dark:bg-black/20 bg-white/50 border dark:border-white/10 border-black/10 rounded-xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-accent-purple focus:border-transparent outline-none text-lg transition-all dark:placeholder:text-slate-600 placeholder:text-slate-600 dark:text-white text-slate-900"
                      placeholder="BATCH-001"
                      type="text"
                      value={batchId}
                      onChange={(e) => setBatchId(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleBatchDetect()}
                    />
                  </div>
                  <button
                    onClick={handleBatchDetect}
                    disabled={loading}
                    className="bg-accent-purple hover:bg-accent-purple/80 px-8 py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 neon-glow-purple group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">
                      {loading ? 'hourglass_empty' : 'batch_prediction'}
                    </span>
                    {loading ? 'Scanning Batch...' : 'Analyze Batch'}
                  </button>
                </div>

                {/* Available Batches Chips */}
                {availableBatches.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs dark:text-slate-500 text-slate-500 mb-2 uppercase font-bold tracking-wider">Available Batches (click to select)</p>
                    <div className="flex flex-wrap gap-2">
                      {availableBatches.map((b) => (
                        <button
                          key={b.batch_id}
                          onClick={() => setBatchId(b.batch_id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            batchId === b.batch_id
                              ? 'bg-accent-purple/20 border-accent-purple text-accent-purple'
                              : 'dark:border-white/10 border-black/10 dark:text-slate-400 text-slate-600 dark:hover:bg-white/5 hover:bg-black/5'
                          }`}
                        >
                          {b.batch_id} <span className="opacity-60">({b.count} txns)</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* CSV Upload Tab */}
            {activeTab === 'csv' && (
              <motion.div
                key="csv"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center justify-center border-2 border-dashed dark:border-white/20 border-black/20 rounded-xl p-12 transition-colors hover:border-amber-500/50 dark:bg-white/5 bg-black/5"
              >
                <input 
                  type="file" 
                  accept=".csv" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 mb-6">
                  <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                </div>
                <h4 className="text-xl font-bold dark:text-white text-slate-900 mb-2">Upload PaySim Dataset</h4>
                <p className="dark:text-slate-400 text-slate-600 text-sm text-center max-w-md mb-8">
                  Upload a standard `.csv` containing transaction rows. Required columns: `amount`, `oldbalanceOrg` etc.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="bg-amber-500 px-8 py-4 rounded-xl font-bold text-black transition-transform hover:scale-105 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin">refresh</span> Processing File...</>
                  ) : (
                    <>Select CSV File</>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-panel p-4 rounded-xl mb-8 border border-red-500/30 bg-red-500/10"
        >
          <p className="text-red-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
          </p>
        </motion.div>
      )}

      {/* Single Results */}
      {result && activeTab === 'single' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8"
        >
          {/* Fraud Probability Gauge */}
          <div className="lg:col-span-1 glass-panel rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
            <div className={`absolute inset-0 ${result.is_bot ? 'bg-red-500/5' : 'bg-green-500/5'} opacity-0 group-hover:opacity-100 transition-opacity`}></div>
            <h4 className="dark:text-slate-400 text-slate-700 font-medium mb-6 uppercase tracking-widest text-xs">
              Fraud Probability
            </h4>
            <div className="relative flex items-center justify-center">
              <svg className="w-48 h-48 -rotate-90">
                <circle cx="96" cy="96" fill="none" r="80" stroke="rgba(255,255,255,0.05)" strokeWidth="12"></circle>
                <motion.circle
                  className={result.is_bot ? 'text-red-500' : 'text-green-500'}
                  cx="96" cy="96" fill="none" r="80"
                  stroke="currentColor"
                  strokeDasharray="502"
                  initial={{ strokeDashoffset: 502 }}
                  animate={{ strokeDashoffset: 502 - (result.fraud_probability / 100) * 502 }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  strokeWidth="12"
                  style={{ filter: `drop-shadow(0 0 8px ${result.is_bot ? 'rgba(239,68,68,0.8)' : 'rgba(34,197,94,0.8)'})` }}
                ></motion.circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-5xl font-black dark:text-white text-slate-900"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  {result.fraud_probability}
                  <span className="text-2xl dark:text-slate-500 text-slate-600">%</span>
                </motion.span>
                <span className={`text-xs font-bold uppercase mt-1 ${result.is_bot ? 'text-red-400' : 'text-green-400'}`}>
                  {result.is_bot ? 'BOT DETECTED' : 'LEGITIMATE'}
                </span>
              </div>
            </div>
            
            <div className="mt-8 w-full">
              <div className="flex justify-between text-xs mb-2">
                <span className="dark:text-slate-400 text-slate-700">Model Confidence</span>
                <span className="font-bold dark:text-white text-slate-900">{result.confidence}%</span>
              </div>
              <div className="h-2 w-full dark:bg-white/5 bg-black/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  style={{ boxShadow: '0 0 8px rgba(37,106,244,0.6)' }}
                ></motion.div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 glass-panel rounded-2xl p-8">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-xl font-bold mb-1 dark:text-white text-slate-900">
                  {result.is_bot ? 'Automated Bot Activity Detected' : 'Transaction Appears Legitimate'}
                </h4>
                <p className="dark:text-slate-400 text-slate-700 text-sm">
                  Transaction: <span className="font-mono">{result.transaction_id}</span>
                </p>
              </div>
              <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase flex items-center gap-2 ${
                result.is_bot
                  ? 'bg-red-500/20 border border-red-500/50 text-red-500 neon-glow-danger'
                  : 'bg-green-500/20 border border-green-500/50 text-green-500'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {result.is_bot ? 'dangerous' : 'verified_user'}
                </span>
                {result.is_bot ? 'High Risk' : 'Low Risk'}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">account_balance_wallet</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold dark:text-white text-slate-900">Origination Balance Analysis</p>
                  <p className="text-xs dark:text-slate-500 text-slate-600">
                    {result.is_bot
                      ? 'Account draining patterns detected matching known fraud signatures.'
                      : 'Account balance deltas within standard bounds.'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-xl dark:bg-white/5 bg-black/5 border dark:border-white/10 border-black/10">
                 <div className="w-10 h-10 rounded-lg bg-accent-purple/20 flex items-center justify-center text-accent-purple">
                  <span className="material-symbols-outlined">payments</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold dark:text-white text-slate-900">Transfer Type & Volume</p>
                  <p className="text-xs dark:text-slate-500 text-slate-600">PaySim feature analysis complete. Evaluated amounts against origin / destination accounts.</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Batch Results (from batch ID) */}
      {batchResult && activeTab === 'batch' && renderBatchResults(batchResult)}

      {/* CSV Results */}
      {csvResult && activeTab === 'csv' && renderBatchResults(csvResult)}
    </>
  );
}
