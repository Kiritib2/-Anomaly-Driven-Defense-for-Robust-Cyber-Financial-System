import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Phishing from './pages/Phishing';
import BotDetector from './pages/BotDetector';
import ThreatAnalyzer from './pages/ThreatAnalyzer';
import FraudRing from './pages/FraudRing';
import IncidentLogs from './pages/IncidentLogs';
import BatchHistory from './pages/BatchHistory';

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="phishing" element={<Phishing />} />
            <Route path="bot-detector" element={<BotDetector />} />
            <Route path="threat-analyzer" element={<ThreatAnalyzer />} />
            <Route path="fraud-ring" element={<FraudRing />} />
            <Route path="incidents" element={<IncidentLogs />} />
            <Route path="batch-history" element={<BatchHistory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
