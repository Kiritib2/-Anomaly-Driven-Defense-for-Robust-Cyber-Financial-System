/**
 * API Service for Cyber Fraud Intelligence Platform
 * Connects frontend to FastAPI backend at localhost:8000
 */

const API_BASE = 'http://localhost:8000';

/**
 * POST /phishing/check — Analyze a URL for phishing indicators
 * @param {string} url - The URL to analyze
 * @returns {{ phishing_score: number, risk_level: string, url: string, features_extracted: number }}
 */
export async function checkPhishing(url) {
  const res = await fetch(`${API_BASE}/phishing/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`Phishing check failed: ${res.status}`);
  return res.json();
}

/**
 * POST /bot/detect — Detect bot activity for a transaction
 * @param {string} transactionId - The transaction ID to analyze
 * @returns {{ transaction_id: string, fraud_probability: number, is_bot: boolean, confidence: number }}
 */
export async function detectBot(transactionId) {
  const res = await fetch(`${API_BASE}/bot/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction_id: transactionId }),
  });
  if (!res.ok) throw new Error(`Bot detection failed: ${res.status}`);
  return res.json();
}

/**
 * POST /bot/upload — Upload CSV dataset for PaySim batch bot activity detection
 * @param {File} file - The CSV file to upload
 */
export async function uploadBotDataset(file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE}/bot/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    let errDetail = 'Upload failed';
    try {
      const errorData = await res.json();
      errDetail = errorData.detail || errDetail;
    } catch(e) {}
    throw new Error(errDetail);
  }
  return res.json();
}

/**
 * POST /bot/detect-batch — Analyze all transactions in a batch by batch_id
 * @param {string} batchId - The batch ID to analyze (e.g., "BATCH-001")
 */
export async function detectBotBatch(batchId) {
  const res = await fetch(`${API_BASE}/bot/detect-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ batch_id: batchId }),
  });
  if (!res.ok) {
    let errDetail = 'Batch detection failed';
    try {
      const errorData = await res.json();
      errDetail = errorData.detail || errDetail;
    } catch(e) {}
    throw new Error(errDetail);
  }
  return res.json();
}

/**
 * GET /bot/batches — List all available batch IDs
 */
export async function getBotBatches() {
  const res = await fetch(`${API_BASE}/bot/batches`);
  if (!res.ok) throw new Error(`Batch list failed: ${res.status}`);
  return res.json();
}

/**
 * POST /fraud/network — Get fraud ring graph data
 * @returns {{ nodes: Array, edges: Array, cluster_id: string, total_amount: number, suspicious_count: number }}
 */
export async function getFraudNetwork() {
  const res = await fetch(`${API_BASE}/fraud/network`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Fraud network fetch failed: ${res.status}`);
  return res.json();
}

/**
 * GET /logs — Get incident logs
 * @param {number} limit - Max number of logs to return
 * @returns {{ total: number, incidents: Array }}
 */
export async function getIncidentLogs(limit = 50) {
  const res = await fetch(`${API_BASE}/logs?limit=${limit}`);
  if (!res.ok) throw new Error(`Logs fetch failed: ${res.status}`);
  return res.json();
}

/**
 * GET / — Health check
 */
export async function healthCheck() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * POST /threat/analyze — Run full threat analysis workflow
 * @param {string} indicator - The IP, domain, or trace ID to analyze
 */
export async function analyzeThreatWorkflow(indicator) {
  const res = await fetch(`${API_BASE}/threat/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indicator }),
  });
  if (!res.ok) throw new Error(`Threat analysis failed: ${res.status}`);
  return res.json();
}

/**
 * GET /dashboard/stats — Live dashboard metrics
 */
export async function getDashboardStats() {
  const res = await fetch(`${API_BASE}/dashboard/stats`);
  if (!res.ok) throw new Error(`Dashboard stats failed: ${res.status}`);
  return res.json();
}

/**
 * GET /batch/jobs — List all batch processing jobs
 */
export async function getBatchJobs(limit = 50) {
  const res = await fetch(`${API_BASE}/batch/jobs?limit=${limit}`);
  if (!res.ok) throw new Error(`Batch jobs fetch failed: ${res.status}`);
  return res.json();
}

/**
 * POST /threat/analyze/batch — Submit a batch of indicators
 */
export async function submitBatchAnalysis(indicators, chunkSize = 20) {
  const res = await fetch(`${API_BASE}/threat/analyze/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indicators, chunk_size: chunkSize }),
  });
  if (!res.ok) throw new Error(`Batch submit failed: ${res.status}`);
  return res.json();
}

/**
 * GET /threat/analyze/batch/{jobId} — Poll batch job status
 */
export async function getBatchStatus(jobId) {
  const res = await fetch(`${API_BASE}/threat/analyze/batch/${jobId}`);
  if (!res.ok) throw new Error(`Batch status failed: ${res.status}`);
  return res.json();
}

