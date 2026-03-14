import { useState, useEffect, useMemo, useCallback } from 'react';
import type { ReconRow, ReconCheck, ReconScorecard } from '../types';

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE as string | undefined) ||
  'http://localhost:8000';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtINR(n: number): string {
  return 'Rs ' + Math.abs(n).toLocaleString('en-IN');
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function statusColor(status: ReconRow['recon_status']): string {
  switch (status) {
    case 'MATCHED': return '#22c55e';
    case 'MISMATCH': return '#ef4444';
    case 'WARNING': return '#f59e0b';
    case 'PENDING': return '#3b82f6';
    default: return 'rgba(255,255,255,0.4)';
  }
}

function statusBg(status: ReconRow['recon_status']): string {
  switch (status) {
    case 'MATCHED': return 'rgba(34,197,94,0.12)';
    case 'MISMATCH': return 'rgba(239,68,68,0.12)';
    case 'WARNING': return 'rgba(245,158,11,0.12)';
    case 'PENDING': return 'rgba(59,130,246,0.12)';
    default: return 'rgba(255,255,255,0.06)';
  }
}

function mdrVarianceColor(drift: number): string {
  if (drift > 0.5) return '#ef4444';
  if (drift > 0.1) return '#f59e0b';
  return '#22c55e';
}

// ─── Sample Data ─────────────────────────────────────────────────────────────
const SAMPLE_CHECKS: ReconCheck[] = [
  { check_id: 1, name: 'Amount Match', severity: 'blocking', passed: true, detail: 'Settled amount matches invoice amount' },
  { check_id: 2, name: 'UTR Present', severity: 'blocking', passed: true, detail: 'UTR number received from bank' },
  { check_id: 3, name: 'MDR Rate Valid', severity: 'warning', passed: true, detail: 'MDR within contracted band' },
  { check_id: 4, name: 'Settlement On-Time', severity: 'info', passed: true, detail: 'Received within T+1' },
  { check_id: 5, name: 'Deduction Accounted', severity: 'blocking', passed: true, detail: 'All platform deductions match' },
  { check_id: 6, name: 'Refund Debit Verified', severity: 'warning', passed: true, detail: 'No pending refund debits' },
  { check_id: 7, name: 'Order Count Match', severity: 'info', passed: true, detail: 'All orders in batch accounted' },
  { check_id: 8, name: 'Bank Credit Confirmed', severity: 'blocking', passed: false, detail: 'Awaiting bank credit entry from merchant' },
];

const MISMATCH_CHECKS: ReconCheck[] = [
  { check_id: 1, name: 'Amount Match', severity: 'blocking', passed: false, detail: 'Delta of Rs 450 detected — bank credited less than expected' },
  { check_id: 2, name: 'UTR Present', severity: 'blocking', passed: true, detail: 'UTR number received from bank' },
  { check_id: 3, name: 'MDR Rate Valid', severity: 'warning', passed: false, detail: 'MDR 2.1% vs contracted 1.8% — variance 0.3%' },
  { check_id: 4, name: 'Settlement On-Time', severity: 'info', passed: false, detail: 'Received T+3, expected T+1 — 2 days late' },
  { check_id: 5, name: 'Deduction Accounted', severity: 'blocking', passed: true, detail: 'All platform deductions match' },
  { check_id: 6, name: 'Refund Debit Verified', severity: 'warning', passed: true, detail: 'No pending refund debits' },
  { check_id: 7, name: 'Order Count Match', severity: 'info', passed: true, detail: 'All orders in batch accounted' },
  { check_id: 8, name: 'Bank Credit Confirmed', severity: 'blocking', passed: true, detail: 'Bank credit of Rs 1,24,550 confirmed' },
];

const SAMPLE_DATA: ReconRow[] = [
  {
    id: 'recon_001', run_id: 'demo', vendor_id: 'vnd_001', vendor_name: 'Cipla Pharma Ltd',
    pine_order_id: 'PL_ORD_2603_001', utr_number: 'AXISN26031400001234',
    invoice_amount: 250000, paid_amount: 250000, settled_amount: 244850, bank_credit_amount: 244850,
    bank_delta: 0, variance: 0, platform_fee: 5150, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'NEFT', retries: 0, outcome: 'PROCESSED',
    recon_status: 'MATCHED', checks: SAMPLE_CHECKS.map(c => ({ ...c, passed: c.check_id !== 8 ? c.passed : true })),
    settlement_delay_days: 1, settled_at: '2026-03-14T09:00:00Z', created_at: '2026-03-13T10:00:00Z',
  },
  {
    id: 'recon_002', run_id: 'demo', vendor_id: 'vnd_002', vendor_name: 'Sun Pharma Distributors',
    pine_order_id: 'PL_ORD_2603_002', utr_number: 'HDFCN26031400005678',
    invoice_amount: 500000, paid_amount: 500000, settled_amount: 494550, bank_credit_amount: 494100,
    bank_delta: -450, variance: 450, platform_fee: 9000, mdr_rate_actual: 2.10, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: true, rail_used: 'RTGS', retries: 1, outcome: 'PROCESSED',
    recon_status: 'MISMATCH', checks: MISMATCH_CHECKS,
    settlement_delay_days: 3, settled_at: '2026-03-14T11:00:00Z', created_at: '2026-03-11T10:00:00Z',
  },
  {
    id: 'recon_003', run_id: 'demo', vendor_id: 'vnd_003', vendor_name: 'Medline Surgicals',
    pine_order_id: 'PL_ORD_2603_003', utr_number: 'ICICI26031400009012',
    invoice_amount: 150000, paid_amount: 150000, settled_amount: 147300, bank_credit_amount: 147300,
    bank_delta: 0, variance: 0, platform_fee: 2700, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'IMPS', retries: 0, outcome: 'PROCESSED',
    recon_status: 'MATCHED', checks: SAMPLE_CHECKS.map(c => ({ ...c, passed: true })),
    settlement_delay_days: 1, settled_at: '2026-03-14T08:30:00Z', created_at: '2026-03-13T09:00:00Z',
  },
  {
    id: 'recon_004', run_id: 'demo', vendor_id: 'vnd_004', vendor_name: 'Apollo Med Supplies',
    pine_order_id: 'PL_ORD_2603_004', utr_number: 'SBIN26031400003456',
    invoice_amount: 320000, paid_amount: 320000, settled_amount: 314240, bank_credit_amount: 314240,
    bank_delta: 0, variance: 0, platform_fee: 5760, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'NEFT', retries: 0, outcome: 'PROCESSED',
    recon_status: 'MATCHED', checks: SAMPLE_CHECKS.map(c => ({ ...c, passed: true })),
    settlement_delay_days: 1, settled_at: '2026-03-14T10:15:00Z', created_at: '2026-03-13T10:00:00Z',
  },
  {
    id: 'recon_005', run_id: 'demo', vendor_id: 'vnd_005', vendor_name: 'Bharat Biotech Corp',
    pine_order_id: 'PL_ORD_2603_005', utr_number: 'KOTAK26031400007890',
    invoice_amount: 450000, paid_amount: 450000, settled_amount: 441900, bank_credit_amount: null,
    bank_delta: null, variance: 0, platform_fee: 8100, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'RTGS', retries: 0, outcome: 'PROCESSED',
    recon_status: 'PENDING', checks: SAMPLE_CHECKS,
    settlement_delay_days: 2, settled_at: '2026-03-14T07:00:00Z', created_at: '2026-03-12T10:00:00Z',
  },
  {
    id: 'recon_006', run_id: 'demo', vendor_id: 'vnd_006', vendor_name: 'Reliance Med Hub',
    pine_order_id: 'PL_ORD_2603_006', utr_number: 'YESBN26031400002345',
    invoice_amount: 180000, paid_amount: 180000, settled_amount: 176760, bank_credit_amount: 176760,
    bank_delta: 0, variance: 0, platform_fee: 3240, mdr_rate_actual: 1.95, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: true, rail_used: 'UPI', retries: 0, outcome: 'PROCESSED',
    recon_status: 'WARNING',
    checks: [
      ...SAMPLE_CHECKS.slice(0, 2).map(c => ({ ...c, passed: true })),
      { check_id: 3, name: 'MDR Rate Valid', severity: 'warning' as const, passed: false, detail: 'MDR 1.95% vs contracted 1.80% — variance 0.15%' },
      ...SAMPLE_CHECKS.slice(3).map(c => ({ ...c, passed: true })),
    ],
    settlement_delay_days: 1, settled_at: '2026-03-14T09:45:00Z', created_at: '2026-03-13T10:00:00Z',
  },
  {
    id: 'recon_007', run_id: 'demo', vendor_id: 'vnd_007', vendor_name: 'Fortis Drug Store',
    pine_order_id: 'PL_ORD_2603_007', utr_number: 'PNBNB26031400006789',
    invoice_amount: 275000, paid_amount: 275000, settled_amount: 270050, bank_credit_amount: 270050,
    bank_delta: 0, variance: 0, platform_fee: 4950, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'NEFT', retries: 0, outcome: 'PROCESSED',
    recon_status: 'MATCHED', checks: SAMPLE_CHECKS.map(c => ({ ...c, passed: true })),
    settlement_delay_days: 1, settled_at: '2026-03-14T08:00:00Z', created_at: '2026-03-13T11:00:00Z',
  },
  {
    id: 'recon_008', run_id: 'demo', vendor_id: 'vnd_008', vendor_name: 'Max Healthcare Supplies',
    pine_order_id: 'PL_ORD_2603_008', utr_number: 'UTIBK26031400004567',
    invoice_amount: 90000, paid_amount: 90000, settled_amount: 88380, bank_credit_amount: 88380,
    bank_delta: 0, variance: 0, platform_fee: 1620, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'IMPS', retries: 2, outcome: 'PROCESSED',
    recon_status: 'MATCHED', checks: SAMPLE_CHECKS.map(c => ({ ...c, passed: true })),
    settlement_delay_days: 1, settled_at: '2026-03-14T12:00:00Z', created_at: '2026-03-13T10:00:00Z',
  },
  {
    id: 'recon_009', run_id: 'demo', vendor_id: 'vnd_009', vendor_name: 'Wockhardt Exports',
    pine_order_id: 'PL_ORD_2603_009', utr_number: 'ICICIB26031400001111',
    invoice_amount: 380000, paid_amount: 380000, settled_amount: 373160, bank_credit_amount: null,
    bank_delta: null, variance: 0, platform_fee: 6840, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'NEFT', retries: 0, outcome: 'PROCESSED',
    recon_status: 'PENDING', checks: SAMPLE_CHECKS,
    settlement_delay_days: 2, settled_at: '2026-03-14T06:30:00Z', created_at: '2026-03-12T10:00:00Z',
  },
  {
    id: 'recon_010', run_id: 'demo', vendor_id: 'vnd_010', vendor_name: 'Lupin Pharmaceuticals',
    pine_order_id: 'PL_ORD_2603_010', utr_number: 'HDFCB26031400008888',
    invoice_amount: 620000, paid_amount: 620000, settled_amount: 608840, bank_credit_amount: 608840,
    bank_delta: 0, variance: 0, platform_fee: 11160, mdr_rate_actual: 1.80, mdr_rate_contracted: 1.80,
    mdr_drift_flagged: false, rail_used: 'RTGS', retries: 0, outcome: 'PROCESSED',
    recon_status: 'MATCHED', checks: SAMPLE_CHECKS.map(c => ({ ...c, passed: true })),
    settlement_delay_days: 1, settled_at: '2026-03-14T08:45:00Z', created_at: '2026-03-13T10:00:00Z',
  },
];

// ─── Scorecard computation ────────────────────────────────────────────────────
function computeScorecard(rows: ReconRow[]): ReconScorecard {
  const matched = rows.filter(r => r.recon_status === 'MATCHED').length;
  const total = rows.length || 1;
  return {
    total_settlements: rows.length,
    total_amount: rows.reduce((s, r) => s + r.settled_amount, 0),
    match_rate: Math.round((matched / total) * 100),
    mismatch_count: rows.filter(r => r.recon_status === 'MISMATCH').length,
    mdr_drift_count: rows.filter(r => r.mdr_drift_flagged).length,
    delayed_count: rows.filter(r => r.settlement_delay_days > 1).length,
    pending_bank_count: rows.filter(r => r.recon_status === 'PENDING').length,
    refund_pending: rows.filter(r => r.recon_status === 'MISMATCH' && r.bank_delta !== null && r.bank_delta < 0)
      .reduce((s, r) => s + Math.abs(r.bank_delta!), 0),
  };
}

// ─── Component Props ──────────────────────────────────────────────────────────
interface ReconciliationDashboardProps {
  runId?: string | null;
  data?: ReconRow[];
  mode?: 'run' | 'live';
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ReconciliationDashboard({ runId, data, mode = 'run' }: ReconciliationDashboardProps) {
  const [rows, setRows] = useState<ReconRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<ReconRow['recon_status'] | 'ALL'>('ALL');
  const [utrSearch, setUtrSearch] = useState('');
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | '60d'>('30d');

  // Table
  const [sortCol, setSortCol] = useState<keyof ReconRow>('settled_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [activeTileFilter, setActiveTileFilter] = useState<string | null>(null);

  // Drawer
  const [selectedRow, setSelectedRow] = useState<ReconRow | null>(null);
  const [bankCreditInput, setBankCreditInput] = useState<string>('');
  const [bankCreditSaving, setBankCreditSaving] = useState(false);
  const [bankCreditSaved, setBankCreditSaved] = useState(false);
  const [drawerOrdersExpanded, setDrawerOrdersExpanded] = useState(false);

  // Load data
  useEffect(() => {
    if (data && data.length > 0) {
      setRows(data);
      setLastSynced(new Date());
      return;
    }
    if (runId) {
      fetchRunData(runId);
    } else if (!mode || mode === 'run') {
      // No runId and no data — show empty, not dummy data
      setRows([]);
      setLastSynced(new Date());
    } else {
      // Live mode without runId — show sample as placeholder
      setRows(SAMPLE_DATA);
      setLastSynced(new Date());
    }
  }, [runId, data]);

  const fetchRunData = async (rid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reconciliation/${rid}`);
      if (res.ok) {
        const json = await res.json();
        const fetched: ReconRow[] = (json.reconciliations || []).map((r: any, i: number) => mapApiRow(r, i, rid));
        setRows(fetched);
      } else {
        setRows([]);
      }
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
      setLastSynced(new Date());
    }
  };

  const mapApiRow = (r: any, i: number, rid: string): ReconRow => ({
    id: r.id || `recon_${String(i + 1).padStart(3, '0')}`,
    run_id: rid,
    vendor_id: r.vendor_id || '',
    vendor_name: r.vendor_name || r.vendor_id || '',
    pine_order_id: r.pine_order_id || r.order_id || '',
    utr_number: r.utr_number || null,
    invoice_amount: parseFloat(r.invoice_amount || r.amount || 0),
    paid_amount: parseFloat(r.paid_amount || r.amount || 0),
    settled_amount: parseFloat(r.settled_amount || r.pine_amount || r.amount || 0),
    bank_credit_amount: r.bank_credit_amount != null ? parseFloat(r.bank_credit_amount) : null,
    bank_delta: r.bank_delta != null ? parseFloat(r.bank_delta) : null,
    variance: parseFloat(r.variance || r.total_variance_inr || 0),
    platform_fee: parseFloat(r.platform_fee || 0),
    mdr_rate_actual: parseFloat(r.mdr_rate_actual || 1.8),
    mdr_rate_contracted: parseFloat(r.mdr_rate_contracted || 1.8),
    mdr_drift_flagged: r.mdr_drift_flagged || false,
    rail_used: r.rail_used || r.rail || 'NEFT',
    retries: r.retries || 0,
    outcome: r.outcome || 'PROCESSED',
    recon_status: (r.recon_status || r.status || 'PENDING').toUpperCase() as ReconRow['recon_status'],
    checks: r.checks || [],
    settlement_delay_days: r.settlement_delay_days || 0,
    settled_at: r.settled_at || null,
    created_at: r.created_at || new Date().toISOString(),
  });

  const handleRefresh = () => {
    if (runId) {
      fetchRunData(runId);
    } else {
      // No run — try fetching latest run's recon data
      setLoading(true);
      fetch(`${API_BASE}/runs`)
        .then(res => res.json())
        .then(json => {
          const runs = json.runs || [];
          const latest = runs.find((r: any) => r.status === 'completed' || r.status === 'approved');
          if (latest) {
            fetchRunData(latest.id);
          } else {
            setRows([]);
            setLastSynced(new Date());
            setLoading(false);
          }
        })
        .catch(() => { setRows([]); setLastSynced(new Date()); setLoading(false); });
    }
  };

  // Filtered / sorted rows
  const filtered = useMemo(() => {
    let r = [...rows];
    if (statusFilter !== 'ALL') r = r.filter(row => row.recon_status === statusFilter);
    if (activeTileFilter === 'mdr_drift') r = r.filter(row => row.mdr_drift_flagged);
    if (activeTileFilter === 'delayed') r = r.filter(row => row.settlement_delay_days > 1);
    if (activeTileFilter === 'mismatch') r = r.filter(row => row.recon_status === 'MISMATCH');
    if (utrSearch.trim()) {
      const q = utrSearch.trim().toLowerCase();
      r = r.filter(row => (row.utr_number || '').toLowerCase().includes(q) || row.vendor_name.toLowerCase().includes(q));
    }
    r.sort((a, b) => {
      const va = a[sortCol] ?? '';
      const vb = b[sortCol] ?? '';
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return r;
  }, [rows, statusFilter, activeTileFilter, utrSearch, sortCol, sortDir]);

  const scorecard = useMemo(() => computeScorecard(filtered), [filtered]);

  const handleSort = useCallback((col: keyof ReconRow) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }, [sortCol]);

  const handleTileClick = (tile: string) => {
    setActiveTileFilter(activeTileFilter === tile ? null : tile);
  };

  const handleRowClick = (row: ReconRow) => {
    setSelectedRow(row);
    setBankCreditInput(row.bank_credit_amount != null ? String(row.bank_credit_amount) : '');
    setBankCreditSaved(false);
    setDrawerOrdersExpanded(false);
  };

  const handleBankCreditSave = async () => {
    if (!selectedRow || !runId) return;
    const amt = parseFloat(bankCreditInput);
    if (isNaN(amt)) return;
    setBankCreditSaving(true);
    try {
      await fetch(`${API_BASE}/api/reconciliation/${runId}/bank-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recon_id: selectedRow.id, bank_credit_amount: amt }),
      });
      // Update local state
      const delta = amt - selectedRow.settled_amount;
      const updated: ReconRow = { ...selectedRow, bank_credit_amount: amt, bank_delta: delta };
      setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedRow(updated);
      setBankCreditSaved(true);
    } catch {
      // Still update locally for demo
      const delta = amt - selectedRow.settled_amount;
      const updated: ReconRow = { ...selectedRow, bank_credit_amount: amt, bank_delta: delta };
      setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
      setSelectedRow(updated);
      setBankCreditSaved(true);
    } finally {
      setBankCreditSaving(false);
    }
  };

  // ─── Styles ────────────────────────────────────────────────────────────────
  const S = {
    root: {
      display: 'flex', flexDirection: 'column' as const, gap: '0',
      background: '#0a0c10', minHeight: '100%', width: '100%',
    } as React.CSSProperties,
    // Filters bar
    filtersBar: {
      display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const,
      padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: '#111318',
    } as React.CSSProperties,
    filterBtn: (active: boolean): React.CSSProperties => ({
      padding: '5px 12px', borderRadius: '6px', border: active ? '1px solid #F5A623' : '1px solid rgba(255,255,255,0.12)',
      background: active ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.04)',
      color: active ? '#F5A623' : 'rgba(255,255,255,0.6)', cursor: 'pointer',
      fontSize: '12px', fontWeight: 600, letterSpacing: '0.4px', transition: 'all 0.15s',
    }),
    searchInput: {
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '6px', color: 'rgba(255,255,255,0.8)', padding: '5px 12px',
      fontSize: '13px', width: '200px', outline: 'none',
    } as React.CSSProperties,
    refreshBtn: {
      marginLeft: 'auto', padding: '5px 12px', borderRadius: '6px',
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)',
      cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
    } as React.CSSProperties,
    lastSynced: {
      fontSize: '11px', color: 'rgba(255,255,255,0.3)',
    } as React.CSSProperties,
    // Scorecard
    scoreRow: {
      display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    } as React.CSSProperties,
    scoreTile: (accent: string, active: boolean): React.CSSProperties => ({
      padding: '16px 20px', background: active ? `${accent}18` : '#111318',
      cursor: 'pointer', transition: 'background 0.15s', borderRight: '1px solid rgba(255,255,255,0.04)',
      borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
    }),
    tileLabel: {
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' as const,
      color: 'rgba(255,255,255,0.4)', marginBottom: '6px',
    } as React.CSSProperties,
    tileValue: (color: string): React.CSSProperties => ({
      fontSize: '22px', fontWeight: 700, color, lineHeight: 1.2,
    }),
    tileSub: {
      fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px',
    } as React.CSSProperties,
    // Table
    tableWrap: {
      flex: 1, overflowX: 'auto' as const, background: '#0a0c10',
    } as React.CSSProperties,
    table: {
      width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px',
    } as React.CSSProperties,
    th: (active: boolean): React.CSSProperties => ({
      padding: '10px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: 700,
      letterSpacing: '0.7px', textTransform: 'uppercase' as const,
      color: active ? '#F5A623' : 'rgba(255,255,255,0.35)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      background: '#0d0f14', cursor: 'pointer', whiteSpace: 'nowrap' as const,
      userSelect: 'none' as const,
    }),
    td: {
      padding: '11px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
      color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    tr: (hover: boolean): React.CSSProperties => ({
      background: hover ? 'rgba(255,255,255,0.03)' : 'transparent',
      cursor: 'pointer', transition: 'background 0.12s',
    }),
    statusChip: (status: ReconRow['recon_status']): React.CSSProperties => ({
      display: 'inline-block', padding: '3px 9px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
      color: statusColor(status), background: statusBg(status),
    }),
    delayChip: (days: number): React.CSSProperties => ({
      display: 'inline-block', padding: '3px 9px', borderRadius: '4px',
      fontSize: '11px', fontWeight: 600,
      color: days <= 1 ? '#22c55e' : '#ef4444',
      background: days <= 1 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
    }),
    mono: { fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.55)' } as React.CSSProperties,
    // Drawer backdrop
    backdrop: {
      position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.55)',
      zIndex: 200, backdropFilter: 'blur(2px)',
    } as React.CSSProperties,
    drawer: {
      position: 'fixed' as const, top: 0, right: 0, bottom: 0, width: '450px',
      background: '#111318', borderLeft: '1px solid rgba(255,255,255,0.08)',
      zIndex: 201, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const,
    } as React.CSSProperties,
  };

  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const matchRateBg = scorecard.match_rate === 100
    ? 'rgba(34,197,94,0.18)' : scorecard.match_rate >= 90
    ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  const matchRateColor = scorecard.match_rate === 100 ? '#22c55e'
    : scorecard.match_rate >= 90 ? '#f59e0b' : '#ef4444';

  return (
    <div style={S.root}>
      {/* ── Filters Bar ──────────────────────────────────────────────────────── */}
      <div style={S.filtersBar}>
        <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.6px', color: '#F5A623', marginRight: '4px' }}>
          RECON
        </span>

        {/* Date range */}
        {(['today', '7d', '30d', '60d'] as const).map(d => (
          <button key={d} style={S.filterBtn(dateRange === d)} onClick={() => setDateRange(d)}>
            {d === 'today' ? 'Today' : d === '7d' ? 'Last 7d' : d === '30d' ? 'Last 30d' : 'Last 60d'}
          </button>
        ))}

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* Status filter */}
        {(['ALL', 'MATCHED', 'MISMATCH', 'WARNING', 'PENDING'] as const).map(s => (
          <button
            key={s}
            style={S.filterBtn(statusFilter === s)}
            onClick={() => { setStatusFilter(s); setActiveTileFilter(null); }}
          >
            {s}
          </button>
        ))}

        <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        {/* UTR search */}
        <input
          style={S.searchInput}
          value={utrSearch}
          onChange={e => setUtrSearch(e.target.value)}
          placeholder="Search UTR or vendor..."
        />

        {/* Refresh */}
        <button style={S.refreshBtn} onClick={handleRefresh} disabled={loading}>
          <span style={{ display: 'inline-block', transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>
            ↻
          </span>
          {loading ? 'Syncing...' : 'Refresh'}
        </button>

        {lastSynced && (
          <span style={S.lastSynced}>
            Last synced {lastSynced.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Scorecard ─────────────────────────────────────────────────────────── */}
      <div style={S.scoreRow}>
        <div style={S.scoreTile('#a78bfa', false)} onClick={() => handleTileClick('total')}>
          <div style={S.tileLabel}>Total Settlements</div>
          <div style={S.tileValue('#a78bfa')}>{scorecard.total_settlements}</div>
          <div style={S.tileSub}>{mode === 'run' && runId ? `Run: ${runId.slice(0, 12)}…` : 'All UTRs'}</div>
        </div>

        <div style={S.scoreTile('#3b82f6', false)} onClick={() => handleTileClick('total_amount')}>
          <div style={S.tileLabel}>Total Amount</div>
          <div style={{ ...S.tileValue('#3b82f6'), fontSize: '16px' }}>{fmtINR(scorecard.total_amount)}</div>
          <div style={S.tileSub}>Settled by Pine Labs</div>
        </div>

        <div style={{ ...S.scoreTile(matchRateColor, activeTileFilter === 'match_rate'), background: activeTileFilter === 'match_rate' ? matchRateBg : '#111318' }}
          onClick={() => handleTileClick('match_rate')}>
          <div style={S.tileLabel}>Match Rate</div>
          <div style={{ ...S.tileValue(matchRateColor), display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            {scorecard.match_rate}
            <span style={{ fontSize: '14px' }}>%</span>
          </div>
          <div style={S.tileSub}>{scorecard.total_settlements - scorecard.mismatch_count} matched</div>
        </div>

        <div style={S.scoreTile(scorecard.mismatch_count > 0 ? '#ef4444' : '#22c55e', activeTileFilter === 'mismatch')}
          onClick={() => handleTileClick('mismatch')}>
          <div style={S.tileLabel}>Mismatches</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={S.tileValue(scorecard.mismatch_count > 0 ? '#ef4444' : '#22c55e')}>
              {scorecard.mismatch_count}
            </div>
            {scorecard.mismatch_count === 0
              ? <span style={{ fontSize: '16px' }}>✓</span>
              : <span style={{ background: 'rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 700 }}>ACTION</span>
            }
          </div>
          <div style={S.tileSub}>Amount delta</div>
        </div>

        <div style={S.scoreTile('#f59e0b', activeTileFilter === 'mdr_drift')}
          onClick={() => handleTileClick('mdr_drift')}>
          <div style={S.tileLabel}>MDR Drift</div>
          <div style={S.tileValue('#f59e0b')}>{scorecard.mdr_drift_count}</div>
          <div style={S.tileSub}>Rate variance</div>
        </div>

        <div style={S.scoreTile(scorecard.delayed_count > 0 ? '#f59e0b' : '#22c55e', activeTileFilter === 'delayed')}
          onClick={() => handleTileClick('delayed')}>
          <div style={S.tileLabel}>Delayed</div>
          <div style={S.tileValue(scorecard.delayed_count > 0 ? '#f59e0b' : '#22c55e')}>
            {scorecard.delayed_count}
          </div>
          <div style={S.tileSub}>After T+1</div>
        </div>
      </div>

      {/* ── Main UTR Table ────────────────────────────────────────────────────── */}
      <div style={S.tableWrap}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
            Loading reconciliation data...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
            No records match your filters.
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {[
                  ['utr_number', 'UTR Number'],
                  ['settled_at', 'Settlement Date'],
                  ['invoice_amount', 'Expected Amt'],
                  ['settled_amount', 'Settled Amt'],
                  ['platform_fee', 'Deductions'],
                  ['bank_credit_amount', 'Bank Credit'],
                  ['bank_delta', 'Delta'],
                  ['recon_status', 'Status'],
                  ['settlement_delay_days', 'Delay'],
                ].map(([col, label]) => (
                  <th key={col} style={S.th(sortCol === col)} onClick={() => handleSort(col as keyof ReconRow)}>
                    {label} {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(row => {
                const isHovered = hoveredRow === row.id;
                const delta = row.bank_delta;
                return (
                  <tr
                    key={row.id}
                    style={S.tr(isHovered)}
                    onClick={() => handleRowClick(row)}
                    onMouseEnter={() => setHoveredRow(row.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={{ ...S.td, ...S.mono }}>
                      {row.utr_number || <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>}
                    </td>
                    <td style={{ ...S.td, fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>
                      {fmtDate(row.settled_at)}
                    </td>
                    <td style={S.td}>{fmtINR(row.invoice_amount)}</td>
                    <td style={S.td}>{fmtINR(row.settled_amount)}</td>
                    <td style={{ ...S.td, color: 'rgba(255,255,255,0.5)' }}>{fmtINR(row.platform_fee)}</td>
                    <td style={S.td}>
                      {row.bank_credit_amount != null
                        ? fmtINR(row.bank_credit_amount)
                        : <span style={{ color: '#3b82f6', fontSize: '11px', fontWeight: 600 }}>ENTER</span>
                      }
                    </td>
                    <td style={{ ...S.td, fontWeight: 700, color: delta == null ? 'rgba(255,255,255,0.3)' : delta === 0 ? '#22c55e' : '#ef4444' }}>
                      {delta == null ? '—' : delta === 0 ? '₹0' : (delta > 0 ? '+' : '') + fmtINR(delta)}
                    </td>
                    <td style={S.td}>
                      <span style={S.statusChip(row.recon_status)}>{row.recon_status}</span>
                    </td>
                    <td style={S.td}>
                      <span style={S.delayChip(row.settlement_delay_days)}>
                        {row.settlement_delay_days <= 1 ? 'T+1' : `T+${row.settlement_delay_days} — ${row.settlement_delay_days - 1}d late`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── UTR Drilldown Drawer ──────────────────────────────────────────────── */}
      {selectedRow && (
        <>
          <div style={S.backdrop} onClick={() => setSelectedRow(null)} />
          <div style={S.drawer}>
            <DrawerContent
              row={selectedRow}
              runId={runId}
              bankCreditInput={bankCreditInput}
              setBankCreditInput={setBankCreditInput}
              onSaveBankCredit={handleBankCreditSave}
              bankCreditSaving={bankCreditSaving}
              bankCreditSaved={bankCreditSaved}
              drawerOrdersExpanded={drawerOrdersExpanded}
              setDrawerOrdersExpanded={setDrawerOrdersExpanded}
              onClose={() => setSelectedRow(null)}
            />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Drawer Content ───────────────────────────────────────────────────────────
interface DrawerContentProps {
  row: ReconRow;
  runId?: string | null;
  bankCreditInput: string;
  setBankCreditInput: (v: string) => void;
  onSaveBankCredit: () => void;
  bankCreditSaving: boolean;
  bankCreditSaved: boolean;
  drawerOrdersExpanded: boolean;
  setDrawerOrdersExpanded: (v: boolean) => void;
  onClose: () => void;
}

function DrawerContent({
  row, runId,
  bankCreditInput, setBankCreditInput, onSaveBankCredit,
  bankCreditSaving, bankCreditSaved,
  drawerOrdersExpanded, setDrawerOrdersExpanded,
  onClose,
}: DrawerContentProps) {
  const computedDelta = bankCreditInput !== ''
    ? parseFloat(bankCreditInput) - row.settled_amount
    : row.bank_delta;

  const failedChecks = row.checks.filter(c => !c.passed);
  const mdrDrift = Math.abs(row.mdr_rate_actual - row.mdr_rate_contracted);

  const sField: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px',
  };
  const sLabel: React.CSSProperties = { color: 'rgba(255,255,255,0.4)', fontSize: '12px' };
  const sValue: React.CSSProperties = { color: 'rgba(255,255,255,0.85)', fontWeight: 500 };
  const sSection: React.CSSProperties = {
    padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
  };
  const sSectionTitle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.35)', marginBottom: '12px',
  };

  return (
    <>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0d0f14', position: 'sticky', top: 0, zIndex: 1,
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: '2px' }}>
            {row.vendor_name}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a78bfa' }}>
            {row.utr_number || 'No UTR'}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            padding: '4px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px',
            color: statusColor(row.recon_status), background: statusBg(row.recon_status),
          }}>
            {row.recon_status}
          </span>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.06)', border: 'none', color: 'rgba(255,255,255,0.6)',
            borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', fontSize: '16px',
          }}>×</button>
        </div>
      </div>

      {/* Settlement Fields */}
      <div style={sSection}>
        <div style={sSectionTitle}>Settlement Details</div>
        {[
          ['Pine Order ID', row.pine_order_id],
          ['UTR Number', row.utr_number || '—'],
          ['Rail Used', row.rail_used],
          ['Invoice Amount', fmtINR(row.invoice_amount)],
          ['Paid Amount', fmtINR(row.paid_amount)],
          ['Platform Fee', fmtINR(row.platform_fee)],
          ['Settled Amount', fmtINR(row.settled_amount)],
          ['Settlement Date', fmtDate(row.settled_at)],
          ['Delay', `T+${row.settlement_delay_days}`],
          ['Retries', String(row.retries)],
        ].map(([label, value]) => (
          <div key={label} style={sField}>
            <span style={sLabel}>{label}</span>
            <span style={{ ...sValue, fontFamily: label.includes('ID') || label.includes('UTR') ? 'monospace' : 'inherit', fontSize: label.includes('ID') || label.includes('UTR') ? '12px' : '13px', color: label === 'Delay' && row.settlement_delay_days > 1 ? '#f59e0b' : 'rgba(255,255,255,0.85)' }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Bank Credit Entry */}
      <div style={sSection}>
        <div style={sSectionTitle}>Bank Credit Verification</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>
          Enter the amount credited in your bank statement for this UTR.
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="number"
            value={bankCreditInput}
            onChange={e => setBankCreditInput(e.target.value)}
            placeholder={row.settled_amount.toString()}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px', color: 'rgba(255,255,255,0.9)', padding: '8px 12px',
              fontSize: '14px', outline: 'none', fontFamily: 'monospace',
            }}
          />
          <button
            onClick={onSaveBankCredit}
            disabled={bankCreditSaving || !bankCreditInput}
            style={{
              padding: '8px 16px', borderRadius: '6px', border: 'none',
              background: bankCreditSaved ? '#22c55e' : '#F5A623',
              color: '#000', fontWeight: 700, fontSize: '12px', cursor: 'pointer',
              opacity: !bankCreditInput ? 0.5 : 1,
            }}
          >
            {bankCreditSaving ? '...' : bankCreditSaved ? '✓ Saved' : 'Save'}
          </button>
        </div>

        {/* Delta display */}
        {bankCreditInput !== '' && (
          <div style={{
            marginTop: '10px', padding: '10px 14px', borderRadius: '6px',
            background: computedDelta === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Delta (Bank Credit − Settled)</span>
            <span style={{
              fontWeight: 700, fontSize: '14px',
              color: computedDelta === 0 ? '#22c55e' : '#ef4444',
            }}>
              {computedDelta === 0 ? '₹0 — Perfect match' : (computedDelta! > 0 ? '+' : '') + fmtINR(computedDelta!)}
            </span>
          </div>
        )}
      </div>

      {/* Reconciliation Checks Checklist */}
      <div style={sSection}>
        <div style={sSectionTitle}>Reconciliation Checks ({row.checks.filter(c => c.passed).length}/{row.checks.length} passed)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {row.checks.map(check => (
            <CheckItem key={check.check_id} check={check} />
          ))}
        </div>
        {failedChecks.length > 0 && (
          <button style={{
            marginTop: '14px', width: '100%', padding: '9px', borderRadius: '6px',
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#ef4444', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
            letterSpacing: '0.3px',
          }}>
            Raise Dispute ({failedChecks.length} check{failedChecks.length > 1 ? 's' : ''} failed)
          </button>
        )}
      </div>

      {/* MDR Deduction Breakdown */}
      <div style={sSection}>
        <div style={sSectionTitle}>MDR Deduction Breakdown</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {[
            ['Platform Fee', fmtINR(row.platform_fee), null],
            ['Contracted MDR', `${row.mdr_rate_contracted.toFixed(2)}%`, null],
            ['Actual MDR', `${row.mdr_rate_actual.toFixed(2)}%`, null],
            ['Variance', `${mdrDrift.toFixed(2)}%`, mdrDrift],
          ].map(([label, value, driftVal]) => (
            <div key={String(label)} style={sField}>
              <span style={sLabel}>{label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {driftVal !== null && (
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                    background: `${mdrVarianceColor(driftVal as number)}20`,
                    color: mdrVarianceColor(driftVal as number),
                  }}>
                    {(driftVal as number) < 0.1 ? 'OK' : (driftVal as number) < 0.5 ? 'WARN' : 'HIGH'}
                  </span>
                )}
                <span style={{ ...sValue, color: driftVal !== null ? mdrVarianceColor(driftVal as number) : 'rgba(255,255,255,0.85)', fontWeight: driftVal !== null ? 700 : 500 }}>
                  {String(value)}
                </span>
              </div>
            </div>
          ))}
        </div>
        {mdrDrift > 0.5 && (
          <button style={{
            marginTop: '14px', width: '100%', padding: '9px', borderRadius: '6px',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#ef4444', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
          }}>
            Dispute MDR ({mdrDrift.toFixed(2)}% variance)
          </button>
        )}
      </div>

      {/* Refund Impact */}
      {(row.bank_delta !== null && row.bank_delta < 0) && (
        <div style={sSection}>
          <div style={sSectionTitle}>Refund Impact</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
            This settlement has a pending refund debit.
          </div>
          <div style={sField}>
            <span style={sLabel}>Pending Refund Debit</span>
            <span style={{ ...sValue, color: '#ef4444' }}>{fmtINR(Math.abs(row.bank_delta))}</span>
          </div>
          <div style={sField}>
            <span style={sLabel}>Net Expected Next Batch</span>
            <span style={{ ...sValue, color: '#f59e0b' }}>{fmtINR(row.settled_amount - Math.abs(row.bank_delta))}</span>
          </div>
        </div>
      )}

      {/* Batch Orders */}
      <div style={sSection}>
        <button
          onClick={() => setDrawerOrdersExpanded(!drawerOrdersExpanded)}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: '6px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)',
            color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>Check Batch Orders</span>
          <span>{drawerOrdersExpanded ? '▲' : '▼'}</span>
        </button>
        {drawerOrdersExpanded && (
          <div style={{ marginTop: '12px' }}>
            {[
              { order: row.pine_order_id, vendor: row.vendor_name, amount: row.paid_amount, status: row.outcome },
            ].map((o, i) => (
              <div key={i} style={{
                padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                borderRadius: '6px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#a78bfa' }}>{o.order}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{o.vendor}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{fmtINR(o.amount)}</div>
                  <div style={{ fontSize: '11px', color: '#22c55e', marginTop: '2px' }}>{o.status}</div>
                </div>
              </div>
            ))}
            {runId && (
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '8px' }}>
                Run: {runId}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Check Item ───────────────────────────────────────────────────────────────
function CheckItem({ check }: { check: ReconCheck }) {
  const icon = check.passed ? '✓' : check.severity === 'blocking' ? '✕' : '⚠';
  const iconColor = check.passed ? '#22c55e' : check.severity === 'blocking' ? '#ef4444' : '#f59e0b';
  const bg = check.passed ? 'rgba(34,197,94,0.06)' : check.severity === 'blocking' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '8px 10px',
      background: bg, borderRadius: '6px',
    }}>
      <span style={{ fontWeight: 700, color: iconColor, fontSize: '13px', minWidth: '16px', marginTop: '1px' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: '2px' }}>
          {check.name}
          {!check.passed && (
            <span style={{
              marginLeft: '6px', fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
              background: check.severity === 'blocking' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
              color: check.severity === 'blocking' ? '#ef4444' : '#f59e0b',
              fontWeight: 700, letterSpacing: '0.4px',
            }}>
              {check.severity.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{check.detail}</div>
      </div>
    </div>
  );
}
