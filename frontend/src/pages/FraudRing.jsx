import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { getFraudNetwork } from '../services/api';

export default function FraudRing() {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGraph() {
      try {
        const data = await getFraudNetwork();
        setGraphData(data);
      } catch {
        // Generate fallback data
        setGraphData(generateFallbackData());
        setError('Using demo data — backend not connected');
      } finally {
        setLoading(false);
      }
    }
    fetchGraph();
  }, []);

  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;
    renderGraph();
  }, [graphData]);

  function generateFallbackData() {
    const nodes = [];
    const edges = [];
    const groups = ['suspicious', 'verified', 'unknown'];
    for (let i = 0; i < 20; i++) {
      nodes.push({
        id: `ACC-${String(i).padStart(6, '0')}`,
        label: `Wallet ${String(i).padStart(4, '0')}`,
        balance: Math.random() * 50000,
        age_days: Math.floor(Math.random() * 1000),
        risk_score: Math.random() * 100,
        is_suspicious: i < 8,
        group: i < 8 ? 'suspicious' : groups[Math.floor(Math.random() * 3)],
      });
    }
    for (let i = 0; i < 35; i++) {
      const src = Math.floor(Math.random() * 20);
      let tgt = Math.floor(Math.random() * 20);
      if (tgt === src) tgt = (tgt + 1) % 20;
      edges.push({
        source: nodes[src].id,
        target: nodes[tgt].id,
        amount: Math.random() * 20000,
        is_suspicious: nodes[src].is_suspicious && nodes[tgt].is_suspicious,
      });
    }
    return { nodes, edges, cluster_id: 'FR-8892', total_amount: 1250000, suspicious_count: 8 };
  }

  function renderGraph() {
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 500;

    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    // Defs for glow effects
    const defs = svg.append('defs');
    const glowFilter = defs.append('filter').attr('id', 'glow');
    glowFilter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glowFilter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Build D3 graph
    const nodes = graphData.nodes.map(n => ({ ...n }));
    const links = graphData.edges.map(e => ({
      source: nodes.find(n => n.id === e.source) || e.source,
      target: nodes.find(n => n.id === e.target) || e.target,
      amount: e.amount,
      is_suspicious: e.is_suspicious,
    }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.is_suspicious ? '#ef4444' : '#334155')
      .attr('stroke-opacity', d => d.is_suspicious ? 0.8 : 0.3)
      .attr('stroke-width', d => d.is_suspicious ? 2 : 1)
      .attr('stroke-dasharray', d => d.is_suspicious ? '5,3' : 'none');

    // Node groups
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedNode(d))
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

    // Outer glow ring for suspicious nodes
    node.filter(d => d.is_suspicious)
      .append('circle')
      .attr('r', 24)
      .attr('fill', 'none')
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.4)
      .attr('filter', 'url(#glow)');

    // Inner circle
    node.append('circle')
      .attr('r', 16)
      .attr('fill', d => {
        if (d.group === 'suspicious') return '#ef444430';
        if (d.group === 'verified') return '#256af430';
        return '#6b728030';
      })
      .attr('stroke', d => {
        if (d.group === 'suspicious') return '#ef4444';
        if (d.group === 'verified') return '#256af4';
        return '#6b7280';
      })
      .attr('stroke-width', 2);

    // Icon
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-family', 'Material Symbols Outlined')
      .attr('font-size', '16px')
      .attr('fill', d => {
        if (d.group === 'suspicious') return '#ef4444';
        if (d.group === 'verified') return '#256af4';
        return '#94a3b8';
      })
      .text(d => {
        if (d.group === 'suspicious') return '\ue002';
        if (d.group === 'verified') return '\ue7fd';
        return '\ue7fd';
      });

    // Labels
    node.append('text')
      .attr('dy', 30)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#94a3b8')
      .text(d => d.label);

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-8"
      >
        <div>
          <h2 className="text-3xl font-bold dark:text-white text-slate-900">Fraud Ring Visualizer</h2>
          <p className="dark:text-slate-400 text-slate-700">
            Cluster ID: #{graphData?.cluster_id || 'Loading...'} — Graph-based fraud detection network
          </p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 dark:bg-white/5 bg-black/5 dark:hover:bg-white/10 hover:bg-black/10 border dark:border-white/10 border-black/10 rounded-lg text-sm font-medium transition-all dark:text-slate-200 text-slate-700">
            <span className="material-symbols-outlined text-xl">download</span>
            Export JSON
          </button>
          <button
            onClick={() => { setLoading(true); getFraudNetwork().then(d => { setGraphData(d); setLoading(false); }).catch(() => { setGraphData(generateFallbackData()); setLoading(false); }); }}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
            Recalculate
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="glass-panel p-3 rounded-lg mb-4 border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">info</span>{error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Graph Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          ref={containerRef}
          className="lg:col-span-3 glass-panel rounded-2xl p-4 min-h-[520px] relative overflow-hidden"
        >
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            </div>
          ) : (
            <svg ref={svgRef} className="w-full"></svg>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 glass-panel rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span className="text-xs dark:text-slate-400 text-slate-700">Flagged Fraudster</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-primary"></span>
              <span className="text-xs dark:text-slate-400 text-slate-700">Verified Account</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-500"></span>
              <span className="text-xs dark:text-slate-400 text-slate-700">Unknown / Guest</span>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            {['add', 'remove', 'crop_free', 'hub'].map(icon => (
              <button key={icon} className="size-10 glass-panel rounded-lg flex items-center justify-center dark:hover:bg-white/10 hover:bg-black/10 transition-colors dark:text-slate-300 text-slate-600">
                <span className="material-symbols-outlined">{icon}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Details Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-panel rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold dark:text-white text-slate-900">Node Details</h3>
            {selectedNode && (
              <button onClick={() => setSelectedNode(null)} className="dark:text-slate-400 text-slate-700 hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            )}
          </div>
          {selectedNode ? (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedNode.is_suspicious ? 'bg-red-500/20' : 'bg-primary/20'}`}>
                  <span className={`material-symbols-outlined ${selectedNode.is_suspicious ? 'text-red-500' : 'text-primary'}`}>
                    {selectedNode.is_suspicious ? 'warning' : 'person'}
                  </span>
                </div>
                <div>
                  <p className="font-bold dark:text-white text-slate-900">{selectedNode.id}</p>
                  <p className="text-xs dark:text-slate-500 text-slate-600">
                    {selectedNode.is_suspicious ? 'Tagged: Suspicious Activity' : 'Verified Account'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5">
                  <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase font-bold">Risk Level</p>
                  <p className={`text-lg font-bold ${selectedNode.risk_score > 60 ? 'text-red-500' : 'text-green-500'}`}>
                    {selectedNode.risk_score.toFixed(0)}/100
                  </p>
                </div>
                <div className="p-3 rounded-lg dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5">
                  <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase font-bold">Balance</p>
                  <p className="text-lg font-bold dark:text-white text-slate-900">${(selectedNode.balance || 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="p-3 rounded-lg dark:bg-white/5 bg-black/5 border dark:border-white/5 border-black/5">
                <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase font-bold mb-1">Account Age</p>
                <p className="text-sm dark:text-slate-200 text-slate-700">{selectedNode.age_days} days</p>
              </div>
              {selectedNode.is_suspicious && (
                <button className="w-full py-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors text-sm font-bold uppercase">
                  Freeze All Linked Accounts
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="material-symbols-outlined text-4xl dark:text-slate-600 text-slate-700">touch_app</span>
              <p className="text-sm dark:text-slate-500 text-slate-600 mt-3">Click a node in the graph to view details</p>
            </div>
          )}

          {/* Summary Stats */}
          {graphData && (
            <div className="mt-6 pt-6 border-t dark:border-white/10 border-black/10 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="dark:text-slate-400 text-slate-700">Total Nodes</span>
                <span className="font-bold dark:text-white text-slate-900">{graphData.nodes.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="dark:text-slate-400 text-slate-700">Suspicious</span>
                <span className="font-bold text-red-400">{graphData.suspicious_count}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="dark:text-slate-400 text-slate-700">Total Edges</span>
                <span className="font-bold dark:text-white text-slate-900">{graphData.edges.length}</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
