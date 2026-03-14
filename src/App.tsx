import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { ChartsPanel } from './components/ChartsPanel';
import { FileDrop } from './components/FileDrop';
import { ReconciliationDashboard } from './components/ReconciliationDashboard';
import { AnimatedBackground } from './components/AnimatedBackground';
import { TypingAnimation } from './components/TypingAnimation';
import { buildMetrics, reconcileTransactions } from './lib/reconcile';
import type { BankTransaction, PineLabsTransaction, ReconciliationRow } from './types';

async function parseCsvFile<T>(file: File): Promise<T[]> {
  const text = await file.text();
  const parsed = Papa.parse<T>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return parsed.data;
}

type PromptEntry = {
  prompt: string;
  summary: string;
  timestamp: string;
};

type DashboardFilter = {
  status?: 'reconciled' | 'unreconciled' | 'high-risk';
  hospital?: string;
  rail?: string;
};

function applyPrompt(rows: ReconciliationRow[], prompt: string) {
  const normalized = prompt.trim().toLowerCase();
  let filtered = rows;
  let summary = 'Showing the full reconciliation view.';

  if (normalized.includes('high risk') || normalized.includes('high-risk')) {
    filtered = rows.filter((row) => row.status === 'high-risk');
    summary = 'Showing only high-risk cases.';
  } else if (normalized.includes('delayed')) {
    filtered = rows.filter((row) => row.status === 'delayed');
    summary = 'Showing delayed settlement cases.';
  } else if (normalized.includes('unreconciled') || normalized.includes('mismatch')) {
    filtered = rows.filter((row) => row.status === 'unreconciled');
    summary = 'Showing unreconciled cases.';
  } else if (normalized.includes('reconciled')) {
    filtered = rows.filter((row) => row.status === 'reconciled');
    summary = 'Showing reconciled transactions.';
  } else if (normalized.includes('upi')) {
    filtered = rows.filter((row) => row.rail.toLowerCase() === 'upi');
    summary = 'Showing UPI transactions.';
  } else if (normalized.includes('card')) {
    filtered = rows.filter((row) => row.rail.toLowerCase() === 'card');
    summary = 'Showing card transactions.';
  } else if (normalized.includes('netbanking')) {
    filtered = rows.filter((row) => row.rail.toLowerCase() === 'netbanking');
    summary = 'Showing netbanking transactions.';
  } else if (normalized.includes('emi')) {
    filtered = rows.filter((row) => row.rail.toLowerCase() === 'emi');
    summary = 'Showing EMI transactions.';
  } else {
    const hospitalMatch = rows.find((row) => normalized.includes(row.hospitalName.toLowerCase()));
    if (hospitalMatch) {
      filtered = rows.filter((row) => row.hospitalId === hospitalMatch.hospitalId);
      summary = `Showing transactions for ${hospitalMatch.hospitalName}.`;
    }
  }

  return {
    filtered,
    summary
  };
}

export default function App() {
  const PAGE_SIZE = 5;
  const [pineLabsRows, setPineLabsRows] = useState<PineLabsTransaction[]>([]);
  const [bankRows, setBankRows] = useState<BankTransaction[]>([]);
  const [results, setResults] = useState<ReconciliationRow[]>([]);
  const [promptRows, setPromptRows] = useState<ReconciliationRow[]>([]);
  const [hasReconciled, setHasReconciled] = useState(false);
  const [error, setError] = useState('');
  const [pineLabsFileName, setPineLabsFileName] = useState('');
  const [bankFileName, setBankFileName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [promptHistory, setPromptHistory] = useState<PromptEntry[]>([]);
  const [promptError, setPromptError] = useState('');
  const historyRef = useRef<HTMLDivElement | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilter>({});

  // Auto-load sample datasets on component mount
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        // Load Pine Labs data
        const plResponse = await fetch('/datasets/pine_labs_hospital_payments.csv');
        const plText = await plResponse.text();
        const plParsed = Papa.parse<PineLabsTransaction>(plText, { header: true, dynamicTyping: true, skipEmptyLines: true });
        setPineLabsRows(plParsed.data);
        setPineLabsFileName('pine_labs_hospital_payments.csv');

        // Load Bank data
        const bankResponse = await fetch('/datasets/hospital_bank_statement.csv');
        const bankText = await bankResponse.text();
        const bankParsed = Papa.parse<BankTransaction>(bankText, { header: true, dynamicTyping: true, skipEmptyLines: true });
        setBankRows(bankParsed.data);
        setBankFileName('hospital_bank_statement.csv');
      } catch (err) {
        console.error('Error loading sample data:', err);
      }
    };

    loadSampleData();
  }, []);

  const visibleRows = useMemo(() => {
    return promptRows.filter((row) => {
      if (dashboardFilter.status && row.status !== dashboardFilter.status) return false;
      if (dashboardFilter.hospital && row.hospitalName !== dashboardFilter.hospital) return false;
      if (dashboardFilter.rail && row.rail !== dashboardFilter.rail) return false;
      return true;
    });
  }, [promptRows, dashboardFilter]);

  const metrics = buildMetrics(visibleRows);

  const handleReconcile = () => {
    if (pineLabsRows.length === 0 && bankRows.length === 0) {
      setError('Upload at least one dataset to run reconciliation.');
      return;
    }

    setError('');
    // Use whichever dataset is available, or both if both are available
    const usePineLabs = pineLabsRows.length > 0 ? pineLabsRows : [];
    const useBank = bankRows.length > 0 ? bankRows : [];

    const nextResults = reconcileTransactions(usePineLabs, useBank);
    setResults(nextResults);
    setPromptRows(nextResults);
    setPromptHistory([]);
    setPrompt('');
    setPromptError('');
    setDashboardFilter({});
    setCurrentPage(1);
    setHasReconciled(true);
  };

  const handlePineLabsUpload = async (file: File | null) => {
    if (!file) return;
    const rows = await parseCsvFile<PineLabsTransaction>(file);
    setPineLabsRows(rows);
    setPineLabsFileName(file.name);
    setError('');
  };

  const handleBankUpload = async (file: File | null) => {
    if (!file) return;
    const rows = await parseCsvFile<BankTransaction>(file);
    setBankRows(rows);
    setBankFileName(file.name);
    setError('');
  };

  const clearPineLabsUpload = () => {
    setPineLabsRows([]);
    setPineLabsFileName('');
    setHasReconciled(false);
    setResults([]);
    setPromptRows([]);
    setDashboardFilter({});
    setCurrentPage(1);
  };

  const clearBankUpload = () => {
    setBankRows([]);
    setBankFileName('');
    setHasReconciled(false);
    setResults([]);
    setPromptRows([]);
    setDashboardFilter({});
    setCurrentPage(1);
  };

  const exceptions = visibleRows.filter((row) => row.status !== 'reconciled');
  const totalPages = Math.max(1, Math.ceil(exceptions.length / PAGE_SIZE));
  const paginatedExceptions = exceptions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePromptSubmit = () => {
    if (!prompt.trim()) {
      setPromptError('Enter a prompt for the agent.');
      return;
    }

    const response = applyPrompt(results, prompt);
    setPromptRows(response.filtered);
    setDashboardFilter({});
    setPromptHistory((current) => [
      ...current,
      {
        prompt,
        summary: response.summary,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setPrompt('');
    setPromptError('');
    setCurrentPage(1);
  };

  const toggleStatusFilter = (status: 'reconciled' | 'unreconciled' | 'high-risk') => {
    setDashboardFilter((current) => ({
      ...current,
      status: current.status === status ? undefined : status
    }));
    setCurrentPage(1);
  };

  const toggleHospitalFilter = (hospital: string) => {
    setDashboardFilter((current) => ({
      ...current,
      hospital: current.hospital === hospital ? undefined : hospital
    }));
    setCurrentPage(1);
  };

  const toggleRailFilter = (rail: string) => {
    setDashboardFilter((current) => ({
      ...current,
      rail: current.rail === rail ? undefined : rail
    }));
    setCurrentPage(1);
  };

  const resetDashboardView = () => {
    setPromptRows(results);
    setDashboardFilter({});
    setPrompt('');
    setPromptError('');
    setCurrentPage(1);
  };

  useEffect(() => {
    if (!historyRef.current) return;
    historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [promptHistory]);

  return (
    <div className="app-shell">
      {!hasReconciled ? (
        <>
          {/* Netflix-Style Hero */}
          <div className="netflix-hero">
            <AnimatedBackground />
            <div className="netflix-hero__overlay" />

            <div className="netflix-hero__content">
              <div className="netflix-hero__main">
                <div className="netflix-hero__title-wrapper">
                  <h1 className="netflix-hero__title">PRIYA</h1>
                  <p className="netflix-hero__tagline">Proactive Revenue & Invoice Yield Automator</p>
                </div>
                <p className="netflix-hero__subtitle">
                  <TypingAnimation
                    baseText="Vendor payments shouldn't take 3-5 hours"
                    endings={[
                      ' a week.',
                      ' per merchant.',
                      ' every week.',
                      ' to process.'
                    ]}
                    typingSpeed={40}
                    delayBetweenEndings={2500}
                    className="typing-text"
                  />
                </p>
                <p className="netflix-hero__description">
                  One sentence. That's all it takes. Tell PRIYA what to do, and watch as it orchestrates every payment, every refund, every settlement, and every reconciliation — autonomously. From invoice to audit trail.
                </p>

                <div className="netflix-hero__features">
                  <div className="netflix-hero__feature">
                    <span className="netflix-hero__feature-icon">⚡</span>
                    <span className="netflix-hero__feature-text">From 5 hours to 5 seconds</span>
                  </div>
                  <div className="netflix-hero__feature">
                    <span className="netflix-hero__feature-icon">🤖</span>
                    <span className="netflix-hero__feature-text">Fully autonomous orchestration</span>
                  </div>
                  <div className="netflix-hero__feature">
                    <span className="netflix-hero__feature-icon">📋</span>
                    <span className="netflix-hero__feature-text">CA-ready audit trail included</span>
                  </div>
                </div>

                <div className="netflix-hero__cta">
                  <button
                    className="netflix-btn netflix-btn--secondary"
                    onClick={() => {
                      const el = document.querySelector('.upload-section');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    More Info
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Section */}
          <section className="upload-section">
            <div className="upload-section__container">
              <div className="upload-section__header">
                <h2>See It In Action</h2>
                <p>Upload your payment data. Watch it reconcile perfectly.</p>
              </div>

              <div className="upload-section__grid">
                <FileDrop
                  title={pineLabsFileName ? "✓ Payment Orders" : "Payment Orders"}
                  accept=".csv"
                  fileName={pineLabsFileName}
                  onChange={handlePineLabsUpload}
                  onRemove={clearPineLabsUpload}
                />
                <FileDrop
                  title={bankFileName ? "✓ Bank Statement" : "Bank Statement"}
                  accept=".csv"
                  fileName={bankFileName}
                  onChange={handleBankUpload}
                  onRemove={clearBankUpload}
                />
              </div>

              {error && <p className="upload-section__error">{error}</p>}

              <button
                className="netflix-btn netflix-btn--primary netflix-btn--full"
                onClick={handleReconcile}
                disabled={pineLabsRows.length === 0 && bankRows.length === 0}
              >
                <span>✨</span> See Your Data Reconcile Live
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          <ReconciliationDashboard
            metrics={metrics}
            visibleRows={visibleRows}
            paginatedExceptions={paginatedExceptions}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onReset={resetDashboardView}
            prompt={prompt}
            onPromptChange={setPrompt}
            onPromptSubmit={handlePromptSubmit}
            promptHistory={promptHistory}
            promptError={promptError}
          />
          <ChartsPanel
            metrics={metrics}
            rows={visibleRows}
            onStatusSelect={toggleStatusFilter}
            onHospitalSelect={toggleHospitalFilter}
            onRailSelect={toggleRailFilter}
          />
        </>
      )}
    </div>
  );
}
