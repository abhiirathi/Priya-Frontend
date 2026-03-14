import { useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { ChartsPanel } from './components/ChartsPanel';
import { FileDrop } from './components/FileDrop';
import { MetricCard } from './components/MetricCard';
import { buildMetrics, reconcileTransactions } from './lib/reconcile';
import type { BankTransaction, PineLabsTransaction, ReconciliationRow } from './types';

async function parseCsvFile<T>(file: File): Promise<T[]> {
  const text = await file.text();
  const parsed = Papa.parse<T>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return parsed.data;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
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
    if (pineLabsRows.length === 0 || bankRows.length === 0) {
      setError('Upload both datasets before running reconciliation.');
      return;
    }

    setError('');
    const nextResults = reconcileTransactions(pineLabsRows, bankRows);
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
          <section className="hero hero--simple">
            <div className="hero__copy hero__copy--full">
              <h1>PRIYA</h1>
              <h2>Proactive Revenue & Invoice Yield Automator</h2>
              <div className="statement-block statement-block--pitch">
                <p>
                  An autonomous B2B commerce agent that orchestrates procurement payments end-to-end — from a single
                  natural language instruction to multi-vendor payouts — and self-heals when anything breaks, without a
                  human ever touching the payment stack.
                </p>
              </div>
            </div>
          </section>

          <section className="panel problem-block">
            <div className="panel__header">
              <h3>The Problem</h3>
            </div>
            <p>
              Small businesses and merchants spend significant time manually managing vendor payments and operational
              finance tasks such as transferring money to suppliers, retrying failed payments, and reconciling
              settlements. These workflows are repetitive, error-prone, and operationally expensive.
            </p>
            <p>
              When payments fail or balances are insufficient, merchants must manually intervene, often delaying vendor
              payments and disrupting supply chains. PRIYA removes that manual orchestration layer.
            </p>
          </section>

          <section className="upload-grid upload-grid--simple">
            <FileDrop
              title="Upload synthetic data (Pine Labs)"
              accept=".csv"
              fileName={pineLabsFileName}
              onChange={handlePineLabsUpload}
              onRemove={clearPineLabsUpload}
            />
            <FileDrop
              title="Upload bank statement"
              accept=".csv"
              fileName={bankFileName}
              onChange={handleBankUpload}
              onRemove={clearBankUpload}
            />
          </section>

          <section className="cta-strip">
            {error ? <p className="form-error">{error}</p> : null}
            <div className="hero__actions hero__actions--center">
              <button className="primary-button primary-button--large" onClick={handleReconcile}>
                Reconcile
              </button>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="workspace-grid">
            <div className="workspace-main">
              <section className="hero hero--dashboard">
                <div className="hero__copy">
                  <h2 className="dashboard-title">Reconciliation dashboard</h2>
                </div>
                <div className="dashboard-reset-wrap">
                  <button type="button" className="primary-button dashboard-reset" onClick={resetDashboardView}>
                    Reset
                  </button>
                </div>
              </section>

              <section className="metrics-grid">
                <MetricCard label="Total transactions" value={String(metrics.totalTransactions)} />
                <MetricCard
                  label="Reconciled %"
                  value={`${metrics.reconciledPercent}%`}
                  tone="good"
                  active={dashboardFilter.status === 'reconciled'}
                  onClick={() => toggleStatusFilter('reconciled')}
                />
                <MetricCard
                  label="Unreconciled %"
                  value={`${metrics.unreconciledPercent}%`}
                  tone="danger"
                  active={dashboardFilter.status === 'unreconciled'}
                  onClick={() => toggleStatusFilter('unreconciled')}
                />
                <MetricCard
                  label="High-risk cases"
                  value={String(metrics.highRiskCount)}
                  tone="danger"
                  active={dashboardFilter.status === 'high-risk'}
                  onClick={() => toggleStatusFilter('high-risk')}
                />
                <MetricCard label="Pine Labs volume" value={formatCurrency(metrics.totalPineLabsVolume)} />
                <MetricCard label="Bank credited volume" value={formatCurrency(metrics.totalBankVolume)} />
              </section>

              <section className="tables-grid tables-grid--single">
                <article className="panel">
                  <div className="panel__header">
                    <h3>Exception queue</h3>
                    <p>Rows requiring operator action or escalation.</p>
                  </div>
                  <div className="table-pagination">
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="table-pagination__actions">
                      <button
                        type="button"
                        className="ghost-button table-pagination__button"
                        onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        className="ghost-button table-pagination__button"
                        onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>UTR</th>
                          <th>Hospital</th>
                          <th>Status</th>
                          <th>Variance</th>
                          <th>Variance %</th>
                          <th>Expected</th>
                          <th>Credited</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedExceptions.length > 0 ? (
                          paginatedExceptions.map((row) => (
                            <tr key={row.orderId}>
                              <td>{row.orderId}</td>
                              <td>{row.utr}</td>
                              <td>{row.hospitalName}</td>
                              <td>
                                <span className={`status-pill status-pill--${row.status}`}>{row.status}</span>
                              </td>
                              <td>{formatCurrency(row.variance)}</td>
                              <td>{row.variancePercent}%</td>
                              <td>{row.expectedSettlementDate}</td>
                              <td>{row.actualCreditDate ?? 'Pending'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8}>No exception rows in the current agent view.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </article>
              </section>

              <ChartsPanel
                metrics={metrics}
                rows={visibleRows}
                onStatusSelect={toggleStatusFilter}
                onHospitalSelect={toggleHospitalFilter}
                onRailSelect={toggleRailFilter}
              />
            </div>

            <aside className="workspace-side panel">
              <div className="panel__header">
                <h3>Agent workspace</h3>
              </div>

              <div className="agent-box">
                <div className="agent-history-box" ref={historyRef}>
                  {promptHistory.length > 0 ? (
                    promptHistory.map((entry, index) => (
                      <article key={`${entry.prompt}-${index}`} className="history-item">
                        <div className="history-item__meta">
                          <span className="history-item__label">Prompt</span>
                          <span className="history-item__time">{entry.timestamp}</span>
                        </div>
                        <strong>{entry.prompt}</strong>
                        <span className="history-item__label">Result</span>
                        <p>{entry.summary}</p>
                      </article>
                    ))
                  ) : (
                    <p className="history-empty">No prompts yet.</p>
                  )}
                </div>
                <div className="agent-input-row">
                  <textarea
                    className="agent-input"
                    placeholder="Try: show me the high-risk cases"
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault();
                        handlePromptSubmit();
                      }
                    }}
                  />
                  <button className="run-icon-button" onClick={handlePromptSubmit} aria-label="Run prompt">
                    ▶
                  </button>
                </div>
                {promptError ? <p className="form-error">{promptError}</p> : null}
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
