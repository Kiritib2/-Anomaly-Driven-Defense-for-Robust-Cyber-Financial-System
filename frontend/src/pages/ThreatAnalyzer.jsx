import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { analyzeThreatWorkflow } from '../services/api';

export default function ThreatAnalyzer() {
  const [indicator, setIndicator] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Overall result
  const [result, setResult] = useState(null);
  
  // Pipeline state
  const [currentStep, setCurrentStep] = useState(0); // 0: input, 1: fetching, 2: state-threat, 3: bot-check, 4: report, 5: visualization
  
  // Ref for D3 graph
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const handleAnalyze = async () => {
    if (!indicator.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setCurrentStep(1); // Fetching step
    
    try {
      const data = await analyzeThreatWorkflow(indicator.trim());
      setResult(data);
      runPipelineSequence(data);
    } catch (err) {
      setError(err.message || 'Failed to run analysis workflow. Backend unreachable.');
      setLoading(false);
      setCurrentStep(0);
    }
  };

  const runPipelineSequence = (data) => {
    // Reveal steps one by one for dramatic effect
    setTimeout(() => setCurrentStep(2), 1000); // State-threat check
    setTimeout(() => setCurrentStep(3), 2500); // Bot check
    setTimeout(() => setCurrentStep(4), 4000); // Detailed report
    
    // Only go to step 5 (visualization) if there's graph data
    if (data.fraud_ring_data) {
      setTimeout(() => {
        setCurrentStep(5);
        setLoading(false);
      }, 5500);
    } else {
      setTimeout(() => setLoading(false), 4500);
    }
  };

  // Render D3 graph when step 5 is reached and data exists
  useEffect(() => {
    if (currentStep === 5 && result?.fraud_ring_data && svgRef.current && containerRef.current) {
      // Need a tiny delay for the DOM to settle expansion
      setTimeout(renderGraph, 100); 
    }
  }, [currentStep, result]);

  const renderGraph = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = 400;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Defs for glow effects
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'threat-glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    const nodes = result.fraud_ring_data.nodes.map(n => ({ ...n }));
    const links = result.fraud_ring_data.edges.map(e => ({
      source: nodes.find(n => n.id === e.source) || e.source,
      target: nodes.find(n => n.id === e.target) || e.target,
      amount: e.amount,
      is_suspicious: e.is_suspicious,
    }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(20));

    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.is_suspicious ? '#ef4444' : '#334155')
      .attr('stroke-opacity', d => d.is_suspicious ? 0.8 : 0.3)
      .attr('stroke-width', d => d.is_suspicious ? 2 : 1)
      .attr('stroke-dasharray', d => d.is_suspicious ? '5,3' : 'none');

    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    node.filter(d => d.is_suspicious)
      .append('circle')
      .attr('r', 18)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .attr('filter', 'url(#threat-glow)');

    node.append('circle')
      .attr('r', 12)
      .attr('fill', d => d.is_suspicious ? '#ef444430' : '#33415530')
      .attr('stroke', d => d.is_suspicious ? '#ef4444' : '#6b7280')
      .attr('stroke-width', 2);

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h2 className="text-3xl font-bold dark:text-white text-slate-900 mb-2">Automated Threat Pipeline</h2>
        <p className="dark:text-slate-400 text-slate-700 max-w-3xl">
          End-to-end automated workflow connecting state-level threat detection, bot origin analysis, detailed forensics reporting, and interconnected fraud ring visualization.
        </p>
      </motion.div>

      {/* Input Stage */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-panel p-6 rounded-2xl mb-8 border-l-4 border-l-primary">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold dark:text-slate-300 text-slate-600 mb-2">Target Indicator (IP, Domain, or Trace ID)</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">my_location</span>
              <input
                className="w-full dark:bg-black/30 bg-white/50 border dark:border-white/10 border-black/10 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary outline-none dark:text-white text-slate-900 font-mono"
                placeholder="e.g. 185.15.59.224 or APT tracker ID"
                value={indicator}
                onChange={(e) => setIndicator(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                disabled={loading}
              />
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="w-full md:w-auto bg-primary hover:bg-primary/80 px-8 py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 neon-glow-primary disabled:opacity-50"
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'sync' : 'running_with_errors'}
            </span>
            {loading ? 'Running Pipeline...' : 'Initiate Pipeline'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-3 flex items-center gap-1"><span className="material-symbols-outlined text-sm">error</span>{error}</p>}
      </motion.div>

      {/* Pipeline Visualization */}
      {currentStep >= 1 && (
        <div className="max-w-4xl mx-auto mb-10">
          <div className="relative border-l-2 dark:border-white/10 border-black/10 ml-6 pb-4">
            
            {/* Step 1: Initializing */}
            <div className="mb-8 relative pl-8">
              <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-primary ring-4 ring-primary/20"></div>
              <h3 className="text-sm font-bold text-primary mb-1 uppercase tracking-wider">Initialization</h3>
              <p className="text-sm dark:text-slate-400 text-slate-700 font-mono">Connecting to threat intelligence streams for {result?.indicator || indicator}...</p>
            </div>

            {/* Step 2: State-level check */}
            {currentStep >= 2 && result && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8 relative pl-8">
                <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full ${result.state_level_threat.detected ? 'bg-red-500 ring-red-500/20' : 'bg-green-500 ring-green-500/20'} ring-4`}></div>
                <h3 className="text-sm font-bold dark:text-white text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">public</span>
                  State-Level Threat Analysis
                </h3>
                <div className="glass-panel p-4 rounded-xl border-l-2 border-l-red-500/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm dark:text-slate-300 text-slate-600">Actor Attribution</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${result.state_level_threat.detected ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400'} uppercase border border-transparent`}>
                      {result.state_level_threat.detected ? 'Matched' : 'Not Found'}
                    </span>
                  </div>
                  <p className="text-xl font-bold dark:text-white text-slate-900 mb-1">{result.state_level_threat.actor}</p>
                  <p className="text-sm dark:text-slate-400 text-slate-700">{result.state_level_threat.details}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="dark:text-slate-500 text-slate-600">Confidence Score</span>
                    <span className="font-mono text-primary font-bold">{result.state_level_threat.confidence}%</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Bot Check */}
            {currentStep >= 3 && result && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8 relative pl-8">
                <div className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full ${result.bot_involvement.detected ? 'bg-orange-500 ring-orange-500/20' : 'bg-green-500 ring-green-500/20'} ring-4`}></div>
                <h3 className="text-sm font-bold dark:text-white text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">smart_toy</span>
                  Bot Involvement Check
                </h3>
                <div className="glass-panel p-4 rounded-xl border-l-2 border-l-orange-500/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm dark:text-slate-300 text-slate-600">Automated Fingerprint</span>
                    <span className="text-sm font-bold dark:text-white text-slate-900">{result.bot_involvement.type || 'None'}</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-1.5 mb-1 overflow-hidden">
                    <div className={`${result.bot_involvement.detected ? 'bg-orange-500' : 'bg-green-500'} h-1.5 rounded-full`} style={{ width: `${result.bot_involvement.confidence}%` }}></div>
                  </div>
                  <span className="text-xs dark:text-slate-500 text-slate-600 text-right block">{result.bot_involvement.confidence}% Match</span>
                </div>
              </motion.div>
            )}

            {/* Step 4: Detail Report Generation */}
            {currentStep >= 4 && result && result.bot_involvement.detected && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8 relative pl-8">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-accent-purple ring-4 ring-accent-purple/20"></div>
                <h3 className="text-sm font-bold dark:text-white text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">description</span>
                  Detailed Forensic Report
                </h3>
                <div className="glass-panel p-4 rounded-xl border border-accent-purple/30 bg-accent-purple/5">
                  <pre className="font-mono text-[11px] md:text-xs dark:text-slate-300 text-slate-700 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                    {result.bot_involvement.report}
                  </pre>
                  <div className="mt-4 flex gap-2">
                    <button className="px-3 py-1.5 rounded text-xs font-bold bg-accent-purple/20 text-accent-purple border border-accent-purple/50 flex items-center gap-1 hover:bg-accent-purple/30 transition-colors">
                      <span className="material-symbols-outlined text-[14px]">download</span> Export PDF
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Fraud Ring Visualization */}
            {currentStep >= 5 && result && result.fraud_ring_data && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative pl-8">
                <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-red-500 ring-4 ring-red-500/20"></div>
                <h3 className="text-sm font-bold dark:text-white text-slate-900 mb-2 uppercase tracking-wider flex items-center gap-2 text-red-400">
                  <span className="material-symbols-outlined text-lg">hub</span>
                  Fraud Ring Detected
                </h3>
                <div className="glass-panel rounded-xl overflow-hidden border border-red-500/30">
                  <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex justify-between items-center text-xs">
                    <span className="font-bold text-red-400">Cluster {result.fraud_ring_data.cluster_id}</span>
                    <span className="dark:text-slate-300 text-slate-700">{result.fraud_ring_data.suspicious_count} Suspicious Nodes / Value: ${(result.fraud_ring_data.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-[#0a0f1a] relative" ref={containerRef}>
                    <svg ref={svgRef} className="w-full"></svg>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep >= 4 && result && !result.fraud_ring_data && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="relative pl-8">
                 <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-slate-500 ring-4 ring-slate-500/20"></div>
                 <h3 className="text-sm font-bold dark:text-slate-400 text-slate-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">hub</span>
                  Fraud Ring Scan Completed
                </h3>
                <p className="text-sm dark:text-slate-400 text-slate-700">No extensive fraud ring network associated with this indicator.</p>
              </motion.div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
