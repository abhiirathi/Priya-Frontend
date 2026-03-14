import { useState } from 'react';
import type { ReconciliationRow, DashboardMetrics } from '../types';

type ReconciliationDashboardProps = {
  metrics: DashboardMetrics;
  visibleRows: ReconciliationRow[];
  paginatedExceptions: ReconciliationRow[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onReset: () => void;
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
  onReset
}: ReconciliationDashboardProps) {
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

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
            <div className="status-item">
              <div className="status-item__dot status-item__dot--reconciled"></div>
              <div className="status-item__info">
                <div className="status-item__label">Reconciled</div>
                <div className="status-item__count">{metrics.reconciledCount}</div>
              </div>
            </div>

            <div className="status-item">
              <div className="status-item__dot status-item__dot--unreconciled"></div>
              <div className="status-item__info">
                <div className="status-item__label">Unreconciled</div>
                <div className="status-item__count">{metrics.unreconciledCount}</div>
              </div>
            </div>

            <div className="status-item">
              <div className="status-item__dot status-item__dot--delayed"></div>
              <div className="status-item__info">
                <div className="status-item__label">Delayed</div>
                <div className="status-item__count">{metrics.delayedCount}</div>
              </div>
            </div>

            <div className="status-item">
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
    </div>
  );
}
