import { useRef, useEffect, useState } from 'react';
import type { ReconciliationRow, DashboardMetrics } from '../types';

type ReconciliationDashboardProps = {
  metrics: DashboardMetrics;
  visibleRows: ReconciliationRow[];
  paginatedExceptions: ReconciliationRow[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onReset: () => void;
  prompt: string;
  onPromptChange: (value: string) => void;
  onPromptSubmit: () => void;
  promptHistory: Array<{ prompt: string; summary: string; timestamp: string }>;
  promptError: string;
  onStatusSelect?: (status: 'reconciled' | 'unreconciled' | 'high-risk' | 'delayed') => void;
  selectedStatus?: 'reconciled' | 'unreconciled' | 'high-risk' | 'delayed' | undefined;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

function getVarianceColor(percent: number): 'high' | 'medium' | 'low' {
  if (percent > 30) return 'high';
  if (percent > 5) return 'medium';
  return 'low';
}

export function ReconciliationDashboard({
  metrics,
  visibleRows,
  paginatedExceptions,
  currentPage,
  totalPages,
  onPageChange,
  onReset,
  prompt,
  onPromptChange,
  onPromptSubmit,
  promptHistory,
  promptError,
  onStatusSelect,
  selectedStatus
}: ReconciliationDashboardProps) {
  const historyRef = useRef<HTMLDivElement | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [promptHistory]);

  const handleRowClick = (orderId: string) => {
    setSelectedRowId(selectedRowId === orderId ? null : orderId);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-main">
        {/* Summary Header */}
        <div className="summary-header">
          <div className="dashboard-header">
            <h2 className="dashboard-header__title">Reconciliation Summary</h2>
            <button className="dashboard-header__reset" onClick={onReset}>
              ↻ Reset View
            </button>
          </div>

          <div className="summary-stats">
            <div className="summary-stat">
              <span className="summary-stat__label">Total Transactions</span>
              <span className="summary-stat__value">{metrics.totalTransactions}</span>
            </div>

            <div className="summary-stat">
              <span className="summary-stat__label">Total Volume</span>
              <span className="summary-stat__value">{formatCurrency(metrics.totalPineLabsVolume)}</span>
              <span className="summary-stat__secondary">Pine Labs</span>
            </div>

            <div className="summary-stat">
              <span className="summary-stat__label">Bank Credited</span>
              <span className="summary-stat__value">{formatCurrency(metrics.totalBankVolume)}</span>
              <span className="summary-stat__secondary">vs expected</span>
            </div>

            <div className="summary-stat">
              <span className="summary-stat__label">Reconciliation Rate</span>
              <span className="summary-stat__value">{metrics.reconciledPercent}%</span>
              <span className="summary-stat__secondary">of transactions</span>
            </div>
          </div>

          {/* Status Summary */}
          <div className="status-summary">
            <div
              className={`status-item ${selectedStatus === 'reconciled' ? 'active' : ''}`}
              onClick={() => onStatusSelect?.('reconciled')}
            >
              <div className="status-item__dot status-item__dot--reconciled"></div>
              <div className="status-item__info">
                <div className="status-item__label">Reconciled</div>
                <div className="status-item__count">{metrics.reconciledCount}</div>
              </div>
            </div>

            <div
              className={`status-item ${selectedStatus === 'unreconciled' ? 'active' : ''}`}
              onClick={() => onStatusSelect?.('unreconciled')}
            >
              <div className="status-item__dot status-item__dot--unreconciled"></div>
              <div className="status-item__info">
                <div className="status-item__label">Unreconciled</div>
                <div className="status-item__count">{metrics.unreconciledCount}</div>
              </div>
            </div>

            <div
              className={`status-item ${selectedStatus === 'delayed' ? 'active' : ''}`}
              onClick={() => onStatusSelect?.('delayed')}
            >
              <div className="status-item__dot status-item__dot--delayed"></div>
              <div className="status-item__info">
                <div className="status-item__label">Delayed</div>
                <div className="status-item__count">{metrics.delayedCount}</div>
              </div>
            </div>

            <div
              className={`status-item ${selectedStatus === 'high-risk' ? 'active' : ''}`}
              onClick={() => onStatusSelect?.('high-risk')}
            >
              <div className="status-item__dot status-item__dot--high-risk"></div>
              <div className="status-item__info">
                <div className="status-item__label">High-Risk</div>
                <div className="status-item__count">{metrics.highRiskCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {paginatedExceptions.length > 0 && (
          <div className="pagination-container">
            <span className="pagination-info">
              Showing {(currentPage - 1) * 5 + 1} – {Math.min(currentPage * 5, visibleRows.length)} of {visibleRows.length}
            </span>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
              </button>
              <span style={{ padding: '0 8px', color: '#64748b', fontWeight: 600 }}>
                {currentPage} / {totalPages}
              </span>
              <button
                className="pagination-btn"
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Exception Cards */}
        <div className="exceptions-grid">
          {paginatedExceptions.length > 0 ? (
            paginatedExceptions.map((row) => (
              <div
                key={row.orderId}
                className={`exception-card exception-card--${row.status} ${selectedRowId === row.orderId ? 'exception-card--selected' : ''}`}
                onClick={() => handleRowClick(row.orderId)}
              >
                <div className="exception-card__status">
                  <div className={`exception-card__status-dot exception-card__status-dot--${row.status}`}></div>
                  <span className="exception-card__status-label">{row.status}</span>
                </div>

                <div className="exception-card__content">
                  <div>
                    <div className="exception-card__field">
                      <span className="exception-card__field-label">Order</span>
                      <span className="exception-card__field-value">{row.orderId}</span>
                    </div>
                    <div className="exception-card__field" style={{ marginTop: 16 }}>
                      <span className="exception-card__field-label">Hospital</span>
                      <span className="exception-card__field-value--secondary">{row.hospitalName}</span>
                    </div>
                  </div>

                  <div>
                    <div className="exception-card__field">
                      <span className="exception-card__field-label">UTR</span>
                      <span className="exception-card__field-value">{row.utr}</span>
                    </div>
                    <div className="exception-card__field" style={{ marginTop: 16 }}>
                      <span className="exception-card__field-label">Rail</span>
                      <span className="exception-card__field-value--secondary">{row.rail}</span>
                    </div>
                  </div>
                </div>

                <div className="exception-card__variance">
                  <div>
                    <div className="exception-card__field-label">Expected</div>
                    <div className="exception-card__field-value">{formatCurrency(row.pineLabsAmount)}</div>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div className="exception-card__field-label">Credited</div>
                    <div className="exception-card__field-value">{formatCurrency(row.bankAmount)}</div>
                  </div>
                  <div
                    className={`exception-card__variance-percent exception-card__variance-percent--${getVarianceColor(
                      row.variancePercent
                    )}`}
                    style={{ marginTop: 12 }}
                  >
                    {row.variancePercent}% variance
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
              No transactions to display
            </div>
          )}
        </div>
      </div>

      {/* Agent Sidebar */}
      <aside className="agent-sidebar">
        <div className="agent-panel">
          {/* Header */}
          <div className="agent-panel__header">
            <div className="agent-panel__header-content">
              <div className="agent-panel__icon-wrapper">
                <span className="agent-panel__icon">✨</span>
              </div>
              <div>
                <h3 className="agent-panel__title">Query Agent</h3>
                <p className="agent-panel__subtitle">Ask to filter & explore</p>
              </div>
            </div>
          </div>

          {/* Quick Suggestions - Show when no history */}
          {promptHistory.length === 0 && (
            <div className="agent-suggestions">
              <div className="suggestions-label">Quick queries</div>
              <div className="suggestions-grid">
                <button
                  className="suggestion-card"
                  onClick={() => {
                    onPromptChange('Show me high-risk cases');
                    setTimeout(() => onPromptSubmit(), 0);
                  }}
                >
                  <span className="suggestion-icon">⚠️</span>
                  <span>High-risk cases</span>
                </button>
                <button
                  className="suggestion-card"
                  onClick={() => {
                    onPromptChange('Show unreconciled transactions');
                    setTimeout(() => onPromptSubmit(), 0);
                  }}
                >
                  <span className="suggestion-icon">❌</span>
                  <span>Unreconciled</span>
                </button>
                <button
                  className="suggestion-card"
                  onClick={() => {
                    onPromptChange('Show me reconciled items');
                    setTimeout(() => onPromptSubmit(), 0);
                  }}
                >
                  <span className="suggestion-icon">✅</span>
                  <span>Reconciled</span>
                </button>
                <button
                  className="suggestion-card"
                  onClick={() => {
                    onPromptChange('Show UPI transactions');
                    setTimeout(() => onPromptSubmit(), 0);
                  }}
                >
                  <span className="suggestion-icon">📱</span>
                  <span>UPI only</span>
                </button>
              </div>
            </div>
          )}

          {/* Chat History */}
          <div className="agent-history" ref={historyRef}>
            {promptHistory.length > 0 ? (
              promptHistory.map((entry, index) => (
                <div key={`${entry.prompt}-${index}`} className="history-message">
                  <div className="history-message__query">
                    <span className="history-message__icon">💬</span>
                    <span className="history-message__prompt">{entry.prompt}</span>
                  </div>
                  <div className="history-message__response">
                    <span className="history-message__icon response">✓</span>
                    <span className="history-message__result">{entry.summary}</span>
                  </div>
                  <span className="history-message__time">{entry.timestamp}</span>
                </div>
              ))
            ) : (
              <div className="history-empty">
                <div className="history-empty__hint">Natural language search</div>
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="agent-input-container">
            <div className="agent-input-wrapper">
              <textarea
                className="agent-textarea"
                placeholder="Ask anything... e.g., 'Show high-risk cases' or 'UPI transactions'"
                value={prompt}
                onChange={(event) => onPromptChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    onPromptSubmit();
                  }
                }}
              />
              <button
                className="agent-send-btn"
                onClick={onPromptSubmit}
                disabled={!prompt.trim()}
                title="Send (Cmd+Enter)"
                aria-label="Send query"
              >
                <span className="send-icon">→</span>
              </button>
            </div>
            {promptError ? (
              <p className="agent-error">{promptError}</p>
            ) : (
              <span className="agent-hint"> Cmd + Enter to send</span>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
