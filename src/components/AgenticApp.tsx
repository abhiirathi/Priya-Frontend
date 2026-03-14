import { useState, useEffect, useRef, useMemo } from 'react';
import { OrdersTab } from './OrdersTab';
import type { OrdersTabState } from './OrdersTab';
import { SettlementTab } from './SettlementTab';
import { ReconciliationDashboard } from './ReconciliationDashboard';
import { DynamicQueryView } from './DynamicQueryView';
import { usePriyaStore } from '../store/priyaStore';
import { usePriyaApi } from '../hooks/usePriyaApi';
import { useWebSocket } from '../hooks/useWebSocket';
import type { ReconRow, WSEvent, VendorRow } from '../types';

type Tab = 'orders' | 'payments' | 'settlement' | 'reconciliation';
type WorkflowStep = 'order' | 'pay' | 'settle' | 'reconcile';

const ZEN_QUOTES = [
  { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Cash flow is the lifeblood of business.', author: 'Richard Branson' },
  { text: 'Do not save what is left after spending, but spend what is left after saving.', author: 'Warren Buffett' },
  { text: 'Revenue is vanity, profit is sanity, but cash is king.', author: 'Alan Miltz' },
  { text: 'In the middle of difficulty lies opportunity.', author: 'Albert Einstein' },
  { text: 'Automation is not about replacing humans. It is about amplifying human potential.', author: 'Satya Nadella' },
  { text: 'Time is money.', author: 'Benjamin Franklin' },
  { text: 'The goal is to turn data into information, and information into insight.', author: 'Carly Fiorina' },
  { text: 'Efficiency is doing things right; effectiveness is doing the right things.', author: 'Peter Drucker' },
  { text: 'What gets measured gets managed.', author: 'Peter Drucker' },
  { text: 'A penny saved is a penny earned.', author: 'Benjamin Franklin' },
];

function ZenQuote({ hint }: { hint: string }) {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * ZEN_QUOTES.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % ZEN_QUOTES.length);
        setFade(true);
      }, 600);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const quote = ZEN_QUOTES[quoteIndex];

  return (
    <div className="agentic-chat-empty" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', padding: '32px 24px', gap: '24px',
    }}>
      <div style={{
        opacity: fade ? 1 : 0,
        transform: fade ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.6s ease, transform 0.6s ease',
        textAlign: 'center', maxWidth: '280px',
      }}>
        <div style={{
          fontSize: '28px', opacity: 0.15, marginBottom: '12px', lineHeight: 1,
        }}>"</div>
        <div style={{
          fontSize: '14px', lineHeight: 1.7, color: 'rgba(255,255,255,0.5)',
          fontStyle: 'italic', letterSpacing: '0.2px',
        }}>
          {quote.text}
        </div>
        <div style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '12px',
          fontWeight: 600, letterSpacing: '0.5px',
        }}>
          — {quote.author}
        </div>
      </div>

      {/* Breathing dot animation */}
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: 'rgba(99,102,241,0.4)',
        animation: 'breathe 3s ease-in-out infinite',
      }} />

      <div style={{
        fontSize: '12px', color: 'rgba(255,255,255,0.3)',
        textAlign: 'center', maxWidth: '240px', lineHeight: 1.5,
      }}>
        {hint}
      </div>
    </div>
  );
}

function MiniZenQuote() {
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * ZEN_QUOTES.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIndex(i => (i + 1) % ZEN_QUOTES.length);
        setFade(true);
      }, 500);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const quote = ZEN_QUOTES[quoteIndex];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '24px 20px', marginTop: 'auto',
      opacity: fade ? 1 : 0,
      transform: fade ? 'translateY(0)' : 'translateY(4px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <div style={{
        width: '4px', height: '4px', borderRadius: '50%',
        background: 'rgba(99,102,241,0.35)',
        animation: 'breathe 3s ease-in-out infinite',
        marginBottom: '16px',
      }} />
      <div style={{
        fontSize: '12px', lineHeight: 1.6, color: 'rgba(255,255,255,0.3)',
        fontStyle: 'italic', textAlign: 'center', maxWidth: '240px',
      }}>
        "{quote.text}"
      </div>
      <div style={{
        fontSize: '10px', color: 'rgba(255,255,255,0.15)', marginTop: '8px',
        fontWeight: 600,
      }}>
        — {quote.author}
      </div>
    </div>
  );
}

function PaymentAwaitingCard({ data, paymentLink, runId }: {
  data: { total_payments: number; confirmed_count: number; failed_count: number; pending_count: number; elapsed_seconds: number; timeout_seconds: number; message: string };
  paymentLink?: string;
  runId?: string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleManualConfirm = async () => {
    if (!runId || confirming || confirmed) return;
    setConfirming(true);
    try {
      await fetch(`http://localhost:8000/api/confirm-payment/${runId}`, { method: 'POST' });
      setConfirmed(true);
    } catch (e) {
      console.error('Manual confirm failed:', e);
    }
    setConfirming(false);
  };
  const progress = data.total_payments > 0
    ? ((data.confirmed_count + data.failed_count) / data.total_payments) * 100
    : 0;
  const allDone = data.pending_count === 0 && data.confirmed_count > 0;

  return (
    <div style={{
      background: 'rgba(99,102,241,0.06)', borderRadius: '16px',
      border: '1px solid rgba(99,102,241,0.2)', padding: '32px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px',
    }}>
      {/* Pulsing icon */}
      <div style={{
        width: '64px', height: '64px', borderRadius: '50%',
        background: allDone ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: allDone ? 'none' : 'breathe 2s ease-in-out infinite',
      }}>
        <span style={{ fontSize: '28px' }}>{allDone ? '\u2713' : '\u23F3'}</span>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '18px', fontWeight: 700,
          color: allDone ? '#22c55e' : 'rgba(255,255,255,0.9)',
        }}>
          {allDone ? 'Payment Confirmed!' : 'Awaiting Payment Confirmation'}
        </div>
        <div style={{
          fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '4px',
        }}>
          {allDone
            ? `${data.confirmed_count} payment(s) confirmed via webhook`
            : 'Waiting for Pine Labs webhook callback...'
          }
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', maxWidth: '320px' }}>
        <div style={{
          width: '100%', height: '6px', borderRadius: '3px',
          background: 'rgba(255,255,255,0.08)', overflow: 'hidden',
        }}>
          <div style={{
            width: `${progress}%`, height: '100%', borderRadius: '3px',
            background: data.failed_count > 0
              ? 'linear-gradient(90deg, #22c55e, #ef4444)'
              : 'linear-gradient(90deg, #6366f1, #22c55e)',
            transition: 'width 0.5s ease',
          }} />
        </div>
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: '8px',
          fontSize: '11px', color: 'rgba(255,255,255,0.4)',
        }}>
          <span>{data.confirmed_count} confirmed</span>
          {data.failed_count > 0 && <span style={{ color: '#ef4444' }}>{data.failed_count} failed</span>}
          <span>{data.pending_count} pending</span>
        </div>
      </div>

      {/* Payment link */}
      {paymentLink && !allDone && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 16px', borderRadius: '8px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          fontSize: '12px',
        }}>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Payment Link:</span>
          <a href={paymentLink} target="_blank" rel="noopener noreferrer"
            style={{ color: '#60a5fa', textDecoration: 'underline', fontFamily: 'monospace', fontSize: '11px' }}>
            {paymentLink.length > 50 ? paymentLink.slice(0, 50) + '...' : paymentLink}
          </a>
          <button onClick={() => navigator.clipboard.writeText(paymentLink)}
            style={{
              background: 'rgba(99,102,241,0.2)', border: 'none', color: '#a78bfa',
              padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px',
            }}>
            Copy
          </button>
        </div>
      )}

      {/* Actions row: Confirm + Open Link */}
      {!allDone && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {paymentLink && (
            <a href={paymentLink} target="_blank" rel="noopener noreferrer"
              style={{
                padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(99,102,241,0.15)', color: '#a78bfa', border: '1px solid rgba(99,102,241,0.3)',
                textDecoration: 'none', cursor: 'pointer',
              }}>
              Open Payment Link
            </a>
          )}
          <button onClick={handleManualConfirm} disabled={confirming || confirmed}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              background: confirmed ? 'rgba(34,197,94,0.25)' : confirming ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.15)',
              color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)',
              cursor: confirmed || confirming ? 'default' : 'pointer',
              opacity: confirmed ? 0.7 : 1,
            }}>
            {confirmed ? '\u2713 Confirmed' : confirming ? 'Confirming...' : 'Confirm Payment Received'}
          </button>
        </div>
      )}

      {/* Timer */}
      {!allDone && (
        <div style={{
          fontSize: '11px', color: 'rgba(255,255,255,0.3)',
          fontFamily: 'monospace',
        }}>
          {Math.floor(data.elapsed_seconds / 60)}:{(data.elapsed_seconds % 60).toString().padStart(2, '0')}
          {' / '}
          {Math.floor(data.timeout_seconds / 60)}:{(data.timeout_seconds % 60).toString().padStart(2, '0')}
          {' timeout'}
        </div>
      )}
    </div>
  );
}

export function AgenticApp() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [selectedVendorsForPayment, setSelectedVendorsForPayment] = useState<string[]>([]);
  const ordersStateRef = useRef<OrdersTabState | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatInput, setChatInput] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  const [reconciliationRows, setReconciliationRows] = useState<any[]>([]);
  const [reconRows, setReconRows] = useState<ReconRow[]>([]);

  // Zustand store
  const store = usePriyaStore();
  const {
    runId, persona, agentStatus, vendors, pipelineDots,
    chatMessages, rawEvents, runSummary, queryResult, paymentAwaitingData,
    policyGateData, setRunId, setQueryResult, handleWSEvent, addChatMessage, reset,
  } = store;

  // API hook
  const api = usePriyaApi();

  // WebSocket connection - connect when runId is set
  // Hook uses refs internally so these callbacks don't cause reconnects
  useWebSocket(runId, {
    onMessage: (event: WSEvent) => {
      console.log('[AgenticApp] WS event:', event.type, event);
      handleWSEvent(event);
    },
    onOpen: () => console.log('[AgenticApp] WS connected'),
    onClose: () => console.log('[AgenticApp] WS disconnected'),
  });

  // Derive workflow step from pipeline dots
  const completedSteps = useMemo((): WorkflowStep[] => {
    const steps: WorkflowStep[] = [];
    const dots = pipelineDots;
    const hasStage = (stage: string, status: string) =>
      dots.some(d => d.stage === stage && d.status === status);

    if (hasStage('order', 'done') || dots.some(d => d.stage === 'pay')) steps.push('order');
    if (hasStage('pay', 'done') || dots.some(d => d.stage === 'settle')) steps.push('pay');
    if (hasStage('settle', 'done') || dots.some(d => d.stage === 'recon')) steps.push('settle');
    if (hasStage('recon', 'done')) steps.push('reconcile');
    return steps;
  }, [pipelineDots]);

  const currentStep = useMemo((): WorkflowStep => {
    const dots = pipelineDots;
    if (dots.some(d => d.stage === 'recon' && d.status === 'in_progress')) return 'reconcile';
    if (dots.some(d => d.stage === 'settle' && d.status === 'in_progress')) return 'settle';
    if (dots.some(d => d.stage === 'pay' && d.status === 'in_progress')) return 'pay';
    return 'order';
  }, [pipelineDots]);

  const isAutomating = agentStatus === 'running' || agentStatus === 'awaiting_approval' || agentStatus === 'escalation';

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, rawEvents]);

  // Auto-switch tabs based on pipeline progress
  useEffect(() => {
    if (!isAutomating && agentStatus !== 'complete' && agentStatus !== 'partial') return;

    if (completedSteps.includes('settle') || currentStep === 'reconcile') {
      setActiveTab('reconciliation');
    } else if (completedSteps.includes('pay') || currentStep === 'settle') {
      setActiveTab('settlement');
    } else if (completedSteps.includes('order') || currentStep === 'pay') {
      setActiveTab('payments');
    }
  }, [completedSteps, currentStep, isAutomating, agentStatus]);

  // Fetch reconciliation data when run completes
  useEffect(() => {
    if ((agentStatus === 'complete' || agentStatus === 'partial') && runId) {
      fetchReconciliationData(runId);
    }
  }, [agentStatus, runId]);

  const fetchReconciliationData = async (rid: string) => {
    try {
      // Try the new /api/reconciliation/{run_id} endpoint first
      const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8000';
      let recons: any[] = [];
      try {
        const res = await fetch(`${API_BASE}/api/reconciliation/${rid}`);
        if (res.ok) {
          const json = await res.json();
          recons = json.reconciliations || [];
        }
      } catch {
        // Fall through to legacy endpoint
      }

      // Fall back to legacy run endpoint
      if (recons.length === 0) {
        const data = await api.getRun(rid);
        recons = data.reconciliations || [];
      }

      setReconciliationRows(recons);

      // Map for ReconciliationDashboard v2
      const newRows: ReconRow[] = recons.map((r: any, i: number) => ({
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
        variance: parseFloat(r.variance || 0),
        platform_fee: parseFloat(r.platform_fee || 0),
        mdr_rate_actual: parseFloat(r.mdr_rate_actual || 1.8),
        mdr_rate_contracted: parseFloat(r.mdr_rate_contracted || 1.8),
        mdr_drift_flagged: r.mdr_drift_flagged || false,
        rail_used: r.rail_used || r.rail || 'NEFT',
        retries: r.retries || 0,
        outcome: r.outcome || 'PROCESSED',
        recon_status: ((r.recon_status || r.status || 'PENDING') as string).toUpperCase() as ReconRow['recon_status'],
        checks: r.checks || [],
        settlement_delay_days: r.settlement_delay_days || 0,
        settled_at: r.settled_at || null,
        created_at: r.created_at || new Date().toISOString(),
      }));
      setReconRows(newRows);
    } catch (err) {
      console.error('[AgenticApp] Failed to fetch recon data:', err);
    }
  };

  // Start real automation run
  const startAutomation = async (instruction: string, vendorNames: string[]) => {
    // Reset store for new run
    reset();
    store.setAgentStatus('running');

    addChatMessage({
      timestamp: new Date().toLocaleTimeString(),
      text: `Starting payment workflow for ${vendorNames.length} vendors...`,
      level: 'info',
    });

    try {
      // Generate CSV from selected vendor names with amounts
      const csvContent = generateCsvFromVendors(vendorNames);
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      const csvFile = new File([csvBlob], 'vendors.csv', { type: 'text/csv' });

      // Start the run via API
      const result = await api.startRun(persona, instruction, csvFile);
      setRunId(result.run_id);

      addChatMessage({
        timestamp: new Date().toLocaleTimeString(),
        text: `Run started: ${result.run_id}. Connecting to live feed...`,
        level: 'info',
      });
    } catch (err: any) {
      console.error('[AgenticApp] Start automation error:', err);
      store.setAgentStatus('idle');
      addChatMessage({
        timestamp: new Date().toLocaleTimeString(),
        text: `Failed to start: ${err.message}`,
        level: 'error',
      });
    }
  };

  const generateCsvFromVendors = (vendorNames: string[]): string => {
    const invoices = ordersStateRef.current?.invoices || [];
    const selected = invoices.filter(inv => vendorNames.includes(inv.vendorName));

    const lines = ['vendor_id,vendor_name,category,amount,preferred_rail,vendor_type,drug_schedule,is_compliant,credit_days,invoice_date,due_date,invoice_number,items'];
    selected.forEach((inv, idx) => {
      const vendorId = `vnd_${inv.vendorName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 20)}_${String(idx + 1).padStart(3, '0')}`;
      const category = persona === 'hospital'
        ? (inv.vendorType === 'company' ? 'pharma_general' : 'consumables')
        : (inv.vendorType === 'grocery' ? 'dairy' : 'goods');
      const rail = persona === 'hospital' ? 'neft' : 'upi';
      const drugSchedule = inv.drugSchedule === 'H' ? 'schedule_h' : '';
      lines.push(`${vendorId},${inv.vendorName},${category},${inv.amount},${rail},established,${drugSchedule},true,0,${inv.invoiceDate},${inv.dueDate},${inv.invoiceNumber},${inv.items}`);
    });
    return lines.join('\n');
  };

  // Handle "Generate Payment Links" from OrdersTab
  const handleGeneratePaymentLinks = (vendorNames: string[]) => {
    setSelectedVendorsForPayment(vendorNames);
    const instruction = `Process payments for ${vendorNames.length} ${persona} vendors: ${vendorNames.join(', ')}`;
    startAutomation(instruction, vendorNames);
  };

  // Handle approval
  const handleApprove = async () => {
    if (!runId) return;
    try {
      await api.approvePolicyGate(runId);
      store.setAgentStatus('running');
      store.setPolicyGateData(null);
      addChatMessage({
        timestamp: new Date().toLocaleTimeString(),
        text: 'Payment plan approved. Executing...',
        level: 'info',
      });
    } catch (err: any) {
      addChatMessage({
        timestamp: new Date().toLocaleTimeString(),
        text: `Approval failed: ${err.message}`,
        level: 'error',
      });
    }
  };

  // Handle escalation decision
  const handleEscalation = async (vendorId: string, decision: 'capture' | 'cancel') => {
    if (!runId) return;
    try {
      await api.escalationDecision(runId, vendorId, decision);
      addChatMessage({
        timestamp: new Date().toLocaleTimeString(),
        text: `Escalation ${decision}d for vendor ${vendorId}`,
        level: 'info',
      });
    } catch (err: any) {
      addChatMessage({
        timestamp: new Date().toLocaleTimeString(),
        text: `Escalation failed: ${err.message}`,
        level: 'error',
      });
    }
  };

  // ---- Context-aware agentic chat ----
  const reply = (text: string, level: 'info' | 'warn' | 'error' = 'info') => {
    addChatMessage({ timestamp: new Date().toLocaleTimeString(), text, level });
  };

  // Live canvas context — derived from actual component state
  const getCtx = () => {
    const os = ordersStateRef.current;
    const nSel = selectedVendorsForPayment.length;
    const vList = vendorList;
    return {
      // Orders tab state (live from child component)
      synced: os?.syncState === 'synced',
      invoiceCount: os?.invoiceCount || 0,
      invoices: os?.invoices || [],
      overdueCount: os?.overdueCount || 0,
      totalAmount: os?.totalAmount || 0,
      scheduleHCount: os?.scheduleHCount || 0,
      selectByFilter: os?.selectByFilter,
      // Selection
      nSelected: nSel,
      selectedNames: selectedVendorsForPayment,
      // Run state
      isRunning: isAutomating,
      status: agentStatus,
      step: currentStep,
      hasRun: !!runId,
      nVendors: vList.length,
      processed: vList.filter(v => v.state === 'PROCESSED').length,
      failed: vList.filter(v => v.state === 'FAILED').length,
      escalated: vList.filter(v => v.escalation).length,
      hasPolicyGate: !!policyGateData,
      hasRecon: reconciliationRows.length > 0,
      nRecon: reconciliationRows.length,
      hasSummary: !!runSummary,
      persona,
      completedSteps,
    };
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;
    const input = chatInput.trim();
    setChatInput('');

    addChatMessage({ timestamp: new Date().toLocaleTimeString(), text: input, level: 'info' });

    const lower = input.toLowerCase();
    const ctx = getCtx();
    const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

    // ==== DURING ACTIVE RUN ====
    if (ctx.hasRun && ctx.status !== 'idle') {
      if (/\b(approve|yes|confirm|accept|lgtm)\b/i.test(lower) && ctx.hasPolicyGate) { handleApprove(); return; }
      if (/\b(export|download|audit|csv)\b/i.test(lower) && runId) {
        reply('Downloading audit CSV...');
        try { await api.exportAuditCsv(runId); reply('Audit CSV downloaded.'); } catch { reply('Export not ready yet.', 'warn'); }
        return;
      }
      if (/\b(status|progress|where|how far)\b/i.test(lower)) {
        const stepLabel = { order: 'Order Creation', pay: 'Payment Execution', settle: 'Settlement', reconcile: 'Reconciliation' }[ctx.step];
        reply(`Current phase: ${stepLabel}\nVendors: ${ctx.processed}/${ctx.nVendors} processed${ctx.failed ? `, ${ctx.failed} failed` : ''}${ctx.escalated ? `, ${ctx.escalated} escalated` : ''}\nSteps done: ${ctx.completedSteps.map(s => s.toUpperCase()).join(' > ') || 'starting...'}`);
        return;
      }
      try {
        await api.submitQuery(runId!, input);
      } catch (err: any) {
        if (err.message === 'Failed to fetch' || err.message?.includes('404')) {
          // Agent session ended — fall back to standalone NL→SQL→Chart
          reply('Querying PRIYA database...');
          try {
            const result = await api.chatQuery(input, runId || undefined);
            usePriyaStore.getState().setQueryResult(result);
            reply(`Query complete: ${result.row_count} row${result.row_count !== 1 ? 's' : ''} returned`);
          } catch (e2: any) {
            reply(`Query error: ${e2.message}`, 'error');
          }
        } else {
          reply(`Query error: ${err.message}`, 'error');
        }
      }
      return;
    }

    // ==== PRE-RUN: INTELLIGENT CANVAS-AWARE CHAT ====

    // --- NL Invoice Filtering & Selection ---
    // "select overdue" / "select schedule H" / "select above 2 lakh" / "select pharma companies"
    if (/\b(select|pick|choose|filter|show|find)\b/i.test(lower) && ctx.synced && ctx.selectByFilter) {
      // Overdue
      if (/\boverdue\b/i.test(lower)) {
        ctx.selectByFilter(inv => inv.status === 'overdue');
        const matches = ctx.invoices.filter(inv => inv.status === 'overdue');
        reply(`Selected ${matches.length} overdue vendors: ${matches.map(i => i.vendorName).join(', ')}\nTotal: ${fmt(matches.reduce((s, i) => s + i.amount, 0))}\n\nSay "process payments" to start.`);
        return;
      }
      // Schedule H
      if (/\bschedule\s*h\b/i.test(lower) || /\bsch[\s-]*h\b/i.test(lower)) {
        ctx.selectByFilter(inv => inv.drugSchedule === 'H');
        const matches = ctx.invoices.filter(inv => inv.drugSchedule === 'H');
        reply(`Selected ${matches.length} Schedule H vendors: ${matches.map(i => i.vendorName).join(', ')}\nThese require compliance review during payment.\n\nSay "process payments" to start.`);
        return;
      }
      // Pending
      if (/\bpending\b/i.test(lower)) {
        ctx.selectByFilter(inv => inv.status === 'pending');
        const matches = ctx.invoices.filter(inv => inv.status === 'pending');
        reply(`Selected ${matches.length} pending vendors.\nTotal: ${fmt(matches.reduce((s, i) => s + i.amount, 0))}\n\nSay "process payments" to start.`);
        return;
      }
      // By vendor type
      if (/\bpharm(a|acy|aceutical)?\s*(co|companies|company)?\b/i.test(lower) && !/select all/i.test(lower)) {
        const isCompanyType = /\bco(mpan)?\b/i.test(lower);
        const type = isCompanyType ? 'company' : 'pharma';
        ctx.selectByFilter(inv => inv.vendorType === type);
        const matches = ctx.invoices.filter(inv => inv.vendorType === type);
        reply(`Selected ${matches.length} ${isCompanyType ? 'pharma company' : 'pharmacy'} vendors: ${matches.map(i => i.vendorName).join(', ')}\n\nSay "process payments" to start.`);
        return;
      }
      if (/\b(fmcg|grocery)\b/i.test(lower)) {
        const type = /\bgrocery\b/i.test(lower) ? 'grocery' : 'fmcg';
        ctx.selectByFilter(inv => inv.vendorType === type);
        const matches = ctx.invoices.filter(inv => inv.vendorType === type);
        reply(`Selected ${matches.length} ${type.toUpperCase()} vendors: ${matches.map(i => i.vendorName).join(', ')}\n\nSay "process payments" to start.`);
        return;
      }
      // Items count filter: "items more than 10", "filter by items > 15"
      const itemsMatch = lower.match(/\bitems?\b.*?\b(more than|above|over|greater than|>)\s*(\d+)/i)
        || lower.match(/\b(more than|above|over|greater than|>)\s*(\d+)\s*items?\b/i);
      if (itemsMatch) {
        const threshold = parseInt(itemsMatch[2]);
        ctx.selectByFilter(inv => inv.items > threshold);
        const matches = ctx.invoices.filter(inv => inv.items > threshold);
        reply(`Selected ${matches.length} vendors with more than ${threshold} items:\n${matches.map(i => `  ${i.vendorName} (${i.items} items, ${fmt(i.amount)})`).join('\n')}\n\nSay "process payments" to start.`);
        return;
      }
      const itemsBelowMatch = lower.match(/\bitems?\b.*?\b(less than|below|under|fewer than|<)\s*(\d+)/i)
        || lower.match(/\b(less than|below|under|fewer than|<)\s*(\d+)\s*items?\b/i);
      if (itemsBelowMatch) {
        const threshold = parseInt(itemsBelowMatch[2]);
        ctx.selectByFilter(inv => inv.items < threshold);
        const matches = ctx.invoices.filter(inv => inv.items < threshold);
        reply(`Selected ${matches.length} vendors with fewer than ${threshold} items:\n${matches.map(i => `  ${i.vendorName} (${i.items} items, ${fmt(i.amount)})`).join('\n')}\n\nSay "process payments" to start.`);
        return;
      }

      // Amount filter: "above 2 lakh", "over 200000", "more than 1.5L", "amount more than 2 lakh"
      const amtMatch = lower.match(/\b(?:amount\s*)?\b(above|over|more than|greater than|>)\s*([\d.]+)\s*(lakh|lac|l|k)?\b/i);
      if (amtMatch) {
        let threshold = parseFloat(amtMatch[2]);
        const unit = (amtMatch[3] || '').toLowerCase();
        if (unit === 'lakh' || unit === 'lac' || unit === 'l') threshold *= 100000;
        else if (unit === 'k') threshold *= 1000;
        ctx.selectByFilter(inv => inv.amount > threshold);
        const matches = ctx.invoices.filter(inv => inv.amount > threshold);
        reply(`Selected ${matches.length} vendors above ${fmt(threshold)}: ${matches.map(i => `${i.vendorName} (${fmt(i.amount)})`).join(', ')}\n\nSay "process payments" to start.`);
        return;
      }
      // Below amount
      const belowMatch = lower.match(/\b(below|under|less than|<)\s*([\d.]+)\s*(lakh|lac|l|k)?\b/i);
      if (belowMatch) {
        let threshold = parseFloat(belowMatch[2]);
        const unit = (belowMatch[3] || '').toLowerCase();
        if (unit === 'lakh' || unit === 'lac' || unit === 'l') threshold *= 100000;
        else if (unit === 'k') threshold *= 1000;
        ctx.selectByFilter(inv => inv.amount < threshold);
        const matches = ctx.invoices.filter(inv => inv.amount < threshold);
        reply(`Selected ${matches.length} vendors below ${fmt(threshold)}: ${matches.map(i => `${i.vendorName} (${fmt(i.amount)})`).join(', ')}\n\nSay "process payments" to start.`);
        return;
      }
      // Due date filter: "due this week", "due before march 25"
      if (/\bdue\b/i.test(lower)) {
        const dateMatch = lower.match(/before\s+(\w+\s+\d+)/i) || lower.match(/by\s+(\w+\s+\d+)/i);
        if (/this week/i.test(lower)) {
          const now = new Date(); const weekEnd = new Date(now); weekEnd.setDate(now.getDate() + 7);
          ctx.selectByFilter(inv => new Date(inv.dueDate) <= weekEnd);
          const matches = ctx.invoices.filter(inv => new Date(inv.dueDate) <= weekEnd);
          reply(`Selected ${matches.length} vendors due this week.\n\nSay "process payments" to start.`);
          return;
        }
        if (dateMatch) {
          const targetDate = new Date(dateMatch[1] + ' 2026');
          ctx.selectByFilter(inv => new Date(inv.dueDate) <= targetDate);
          const matches = ctx.invoices.filter(inv => new Date(inv.dueDate) <= targetDate);
          reply(`Selected ${matches.length} vendors due before ${targetDate.toLocaleDateString()}.\n\nSay "process payments" to start.`);
          return;
        }
      }
      // Select all
      if (/\ball\b/i.test(lower)) {
        ctx.selectByFilter(() => true);
        reply(`Selected all ${ctx.invoiceCount} vendors.\nTotal: ${fmt(ctx.totalAmount)}\n\nSay "process payments" to start the pipeline.`);
        return;
      }
      // Combined: "overdue above 2 lakh", "pending schedule H"
      // If both status + amount mentioned
      const hasOverdue = /\boverdue\b/i.test(lower);
      const hasPending = /\bpending\b/i.test(lower);
      const hasSchH = /\bschedule\s*h\b/i.test(lower) || /\bsch[\s-]*h\b/i.test(lower);
      const combinedAmtMatch = lower.match(/(above|over|more than|>)\s*([\d.]+)\s*(lakh|lac|l|k)?/i);
      if ((hasOverdue || hasPending || hasSchH) && combinedAmtMatch) {
        let threshold = parseFloat(combinedAmtMatch[2]);
        const unit = (combinedAmtMatch[3] || '').toLowerCase();
        if (unit === 'lakh' || unit === 'lac' || unit === 'l') threshold *= 100000;
        else if (unit === 'k') threshold *= 1000;
        ctx.selectByFilter(inv => {
          const statusOk = hasOverdue ? inv.status === 'overdue' : hasPending ? inv.status === 'pending' : true;
          const schOk = hasSchH ? inv.drugSchedule === 'H' : true;
          return statusOk && schOk && inv.amount > threshold;
        });
        const matches = ctx.invoices.filter(inv => {
          const statusOk = hasOverdue ? inv.status === 'overdue' : hasPending ? inv.status === 'pending' : true;
          const schOk = hasSchH ? inv.drugSchedule === 'H' : true;
          return statusOk && schOk && inv.amount > threshold;
        });
        const filterDesc = [hasOverdue && 'overdue', hasPending && 'pending', hasSchH && 'Schedule H'].filter(Boolean).join(' + ');
        reply(`Selected ${matches.length} ${filterDesc} vendors above ${fmt(threshold)}:\n${matches.map(i => `  ${i.vendorName} (${fmt(i.amount)})`).join('\n')}\n\nSay "process payments" to start.`);
        return;
      }

      // By vendor name
      const nameMatches = ctx.invoices.filter(inv => lower.includes(inv.vendorName.toLowerCase()));
      if (nameMatches.length > 0) {
        ctx.selectByFilter(inv => lower.includes(inv.vendorName.toLowerCase()));
        reply(`Selected: ${nameMatches.map(i => i.vendorName).join(', ')}\n\nSay "process payments" to start.`);
        return;
      }
    }

    // --- Greetings ---
    if (/^(hi|hello|hey|namaste|yo|sup|good\s*(morning|afternoon|evening))[\s!?.]*$/i.test(lower) || /how (are|r) (you|u)/i.test(lower)) {
      const label = persona === 'hospital' ? 'hospital pharma' : 'kirana FMCG';
      if (!ctx.synced) {
        reply(`Hey! I'm PRIYA, your ${label} payment agent.\n\nYou're on the Orders tab. Click "Sync with Khatabook" to load your invoices.\n\nYou can do:\n  "sync" - guide through import\n  "help" - see all commands`);
      } else if (ctx.nSelected === 0) {
        reply(`Hey! ${ctx.invoiceCount} invoices loaded (${ctx.overdueCount} overdue, ${ctx.scheduleHCount} Schedule H).\nTotal payable: ${fmt(ctx.totalAmount)}\n\nTry:\n  "select overdue" - pick overdue vendors\n  "select schedule H" - pick Schedule H\n  "select above 2 lakh" - filter by amount\n  "select all" - pick everything\n  "process payments" - start after selecting`);
      } else {
        reply(`${ctx.nSelected} vendors selected (${fmt(ctx.invoices.filter(i => ctx.selectedNames.includes(i.vendorName)).reduce((s, i) => s + i.amount, 0))}).\n\nReady to:\n  "process payments" - start the pipeline\n  "select overdue" - change selection\n  "status" - see details`);
      }
      return;
    }

    // --- Help ---
    if (/\b(help|what can|what do|what else|actions|options|commands)\b/i.test(lower)) {
      const actions: string[] = [];
      if (!ctx.synced) {
        actions.push('Click "Sync with Khatabook" to load invoices');
      } else {
        actions.push('"select overdue" - Select overdue invoices');
        actions.push('"select schedule H" - Select Schedule H vendors');
        actions.push('"select above 2 lakh" - Filter by amount');
        actions.push('"select pending" - Select pending invoices');
        actions.push('"select all" - Select everything');
        if (ctx.nSelected > 0) actions.push(`"process payments" - Start pipeline (${ctx.nSelected} selected)`);
      }
      if (ctx.hasPolicyGate) actions.push('"approve" - Approve payment plan');
      if (ctx.hasRun) actions.push('"status" - Pipeline progress');
      if (ctx.hasSummary) actions.push('"export" - Download audit CSV');
      actions.push(`"switch to ${persona === 'hospital' ? 'kirana' : 'hospital'}" - Change persona`);
      reply(`Here's what I can do:\n\n${actions.map(a => `  ${a}`).join('\n')}`);
      return;
    }

    // --- Sync ---
    if (/\b(sync|import|load|connect|fetch)\b/i.test(lower)) {
      if (ctx.synced) {
        reply(`Already synced! ${ctx.invoiceCount} invoices loaded (${ctx.overdueCount} overdue).\n\nNow select vendors:\n  "select overdue" / "select all" / "select above 2 lakh"\n\nOr click the "Re-sync" button to refresh.`);
      } else {
        reply(`Click the "Sync with Khatabook" button above to import your ${persona === 'hospital' ? 'pharma vendor' : 'FMCG supplier'} invoices.`);
      }
      return;
    }

    // --- Process/start ---
    if (/\b(process|start|pay|execute|run|go|begin|initiate|launch)\b/i.test(lower)) {
      if (ctx.nSelected > 0) {
        reply(`Starting pipeline for ${ctx.nSelected} vendors...`);
        startAutomation(input, selectedVendorsForPayment);
      } else if (ctx.synced) {
        reply(`No vendors selected. Try:\n  "select overdue" - ${ctx.overdueCount} overdue vendors\n  "select schedule H" - ${ctx.scheduleHCount} Schedule H vendors\n  "select all" - all ${ctx.invoiceCount} vendors\n  "select above 2 lakh" - high-value invoices`, 'warn');
      } else {
        reply(`Sync your invoices first, then select vendors to pay.`, 'warn');
      }
      return;
    }

    // --- Status ---
    if (/\b(status|state|where|summary|what's happening)\b/i.test(lower)) {
      if (!ctx.synced) {
        reply(`Orders tab - no invoices synced.\nNext: Click "Sync with Khatabook"`);
      } else {
        reply(`Canvas: Orders tab\nInvoices: ${ctx.invoiceCount} loaded (${ctx.overdueCount} overdue, ${ctx.scheduleHCount} Schedule H)\nTotal: ${fmt(ctx.totalAmount)}\nSelected: ${ctx.nSelected} vendors\nPersona: ${persona.toUpperCase()}\n\n${ctx.nSelected > 0 ? 'Say "process payments" to start.' : 'Select vendors to continue.'}`);
      }
      return;
    }

    // --- Persona switch ---
    if (/\b(switch|change).*(hospital|kirana)/i.test(lower) || /\b(hospital|kirana)\s*(mode|persona)/i.test(lower)) {
      const target = lower.includes('hospital') ? 'hospital' : 'kirana';
      store.setPersona(target as 'hospital' | 'kirana');
      reply(`Switched to ${target.toUpperCase()} mode. Re-sync to load ${target === 'hospital' ? 'pharma' : 'FMCG'} invoices.`);
      return;
    }

    // --- Fallback: try NL→SQL→Chart for data questions ---
    // If it looks like a data/analytics question, route to standalone query
    if (/\b(how many|total|sum|average|count|show me|list|which|what|compare|breakdown|distribution|top|highest|lowest|mdr|settlement|payment|vendor|recon|amount|paid|deferred|failed)\b/i.test(lower)) {
      reply('Querying PRIYA database...');
      try {
        const result = await api.chatQuery(input, runId || undefined);
        usePriyaStore.getState().setQueryResult(result);
        reply(`Query complete: ${result.row_count} row${result.row_count !== 1 ? 's' : ''} returned`);
      } catch (e: any) {
        reply(`Query error: ${e.message}`, 'error');
      }
      return;
    }

    if (ctx.synced) {
      reply(`I can help filter vendors or query your data. Try:\n  "select overdue" / "select schedule H"\n  "show me total paid amount" / "compare vendor payments"\n  "process payments" - start pipeline\n  "help" - full command list`);
    } else {
      reply(`Click "Sync with Khatabook" above to load invoices, or ask me a data question like "show me total payments by vendor".\n\nSay "help" for all commands.`);
    }
  };

  // Convert Zustand vendor Map to array for display
  const vendorList = useMemo((): VendorRow[] => {
    return Array.from(vendors.values());
  }, [vendors]);

  // Pipeline step dots
  const stepDots = [
    { step: 'order' as const, label: 'ORDER' },
    { step: 'pay' as const, label: 'PAY' },
    { step: 'settle' as const, label: 'SETTLE' },
    { step: 'reconcile' as const, label: 'RECONCILE' },
  ];

  const getVendorStatusDisplay = (state: string) => {
    switch (state) {
      case 'PROCESSED': return '✓ PROCESSED';
      case 'PENDING': return 'PENDING...';
      case 'AUTHORIZED': return 'AUTHORIZED';
      case 'CREATED': return 'CREATED';
      case 'FAILED': return '✕ FAILED';
      case 'CANCELLED': return '✕ CANCELLED';
      default: return state;
    }
  };

  return (
    <div className="agentic-app">
      {/* Modern Top Bar */}
      <div className="agentic-topbar">
        <div className="agentic-topbar__left">
          <div className="agentic-logo">
            <div className="agentic-logo__icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="agentic-logo__text">PRIYA</span>
          </div>
        </div>

        <div className="agentic-topbar__center">
          <div className="agentic-status-group">
            <select
              className="agentic-persona-select"
              value={persona}
              onChange={(e) => store.setPersona(e.target.value as 'hospital' | 'kirana')}
              disabled={isAutomating || agentStatus === 'complete'}
            >
              <option value="hospital">HOSPITAL</option>
              <option value="kirana">KIRANA</option>
            </select>
            {runId && <span className="agentic-run-id">{runId}</span>}
          </div>

          {/* Step Indicators */}
          <div className="agentic-steps-indicator">
            {stepDots.map((item, idx) => (
              <div key={item.step} className="agentic-step-item">
                {completedSteps.includes(item.step) ? (
                  <div className="agentic-dot agentic-dot--done">✓</div>
                ) : currentStep === item.step && isAutomating ? (
                  <div className="agentic-dot agentic-dot--active">●</div>
                ) : (
                  <div className="agentic-dot">●</div>
                )}
                <span className="agentic-step-label">{idx + 1} {item.label}</span>
                {idx < stepDots.length - 1 && <div className="agentic-step-divider"></div>}
              </div>
            ))}
          </div>
        </div>

        <div className="agentic-topbar__right">
          {agentStatus === 'awaiting_approval' && (
            <button className="agentic-status-badge" onClick={handleApprove} style={{ cursor: 'pointer' }}>
              <span className="agentic-status-pulse"></span>
              Click to Approve
            </button>
          )}
          {agentStatus === 'running' && (
            <div className="agentic-status-badge">
              <span className="agentic-status-pulse"></span>
              Running...
            </div>
          )}
          {(agentStatus === 'complete' || agentStatus === 'partial') && (
            <div className="agentic-status-badge" style={{ background: 'rgba(34,197,94,0.2)' }}>
              Complete
            </div>
          )}
        </div>
      </div>

      <div className="agentic-main">
        {/* Main Content Area */}
        <div className="agentic-content">
          {/* Policy Gate Overlay */}
          {policyGateData && agentStatus === 'awaiting_approval' && (
            <div className="agentic-run-board">
              <div className="agentic-run-board__header">
                <h2>APPROVAL REQUIRED</h2>
                <span className="agentic-run-board__count">
                  {policyGateData.vendors?.length || 0} vendors — Total: Rs {(policyGateData.total || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <table className="agentic-vendors-table">
                <thead>
                  <tr>
                    <th>VENDOR</th>
                    <th>INVOICE</th>
                    <th>ITEMS</th>
                    <th>AMOUNT</th>
                    <th>DUE DATE</th>
                    <th>ACTION</th>
                    <th>PRIORITY</th>
                  </tr>
                </thead>
                <tbody>
                  {(policyGateData.vendors || []).map((v: any) => (
                    <tr key={v.vendor_id} className="agentic-vendor-row">
                      <td className="agentic-vendor-name">
                        {v.name}
                        {v.drug_schedule && (
                          <span style={{
                            marginLeft: '6px', fontSize: '10px', padding: '2px 6px',
                            borderRadius: '4px', fontWeight: 700, letterSpacing: '0.5px',
                            background: v.drug_schedule === 'schedule_h' ? 'rgba(239,68,68,0.2)' : 'rgba(251,191,36,0.2)',
                            color: v.drug_schedule === 'schedule_h' ? '#f87171' : '#fbbf24',
                          }}>
                            {v.drug_schedule === 'schedule_h' ? 'SCH-H' : v.drug_schedule.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                        {v.invoice_number || '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>{v.items || '—'}</td>
                      <td style={{ fontWeight: 600 }}>Rs {(v.amount || 0).toLocaleString('en-IN')}</td>
                      <td style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{v.due_date || '—'}</td>
                      <td><span className={`agentic-status-badge agentic-status-badge--${v.action}`}>{v.action?.toUpperCase()}</span></td>
                      <td>{v.priority_score}/100</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'center' }}>
                <button className="orders-footer__generate-btn" onClick={handleApprove}>
                  Approve Payment Plan
                </button>
              </div>
            </div>
          )}

          {/* Vendor Run Board - during order/pay phases */}
          {vendorList.length > 0 && !policyGateData && (currentStep === 'order' || currentStep === 'pay') && (() => {
            const batchTotal = vendorList.reduce((s, v) => s + (v.amount || 0), 0);
            const batchOrderId = vendorList.find(v => v.pine_order_id)?.pine_order_id;
            const batchPaymentLink = vendorList.find(v => v.payment_link)?.payment_link;
            const processedCount = vendorList.filter(v => v.state === 'PROCESSED').length;
            const failedCount = vendorList.filter(v => v.state === 'FAILED').length;
            const batchRail = vendorList[0]?.rail || 'neft';
            return (
            <div className="agentic-run-board">
              <div className="agentic-run-board__header">
                <h2>BATCH PAYMENT RUN</h2>
                <span className="agentic-run-board__count">{vendorList.length} vendors &mdash; Rs {batchTotal.toLocaleString('en-IN')}</span>
              </div>

              {/* Batch summary bar */}
              {batchOrderId && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 20px',
                  background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '13px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Pine Order:</span>
                    <span style={{ fontFamily: 'monospace', color: '#a78bfa', fontWeight: 600 }}>{batchOrderId}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Rail:</span>
                    <span style={{ color: '#818cf8', fontWeight: 600 }}>{batchRail.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)' }}>Total:</span>
                    <span style={{ color: '#22c55e', fontWeight: 600 }}>Rs {batchTotal.toLocaleString('en-IN')}</span>
                  </div>
                  {batchPaymentLink && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Pay:</span>
                      <a
                        href={batchPaymentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#60a5fa', fontWeight: 600, fontSize: '12px',
                          textDecoration: 'underline', cursor: 'pointer',
                        }}
                      >
                        {batchPaymentLink.split('/').pop()}
                      </a>
                    </div>
                  )}
                  {processedCount > 0 && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#22c55e' }}>{processedCount} paid</span>
                      {failedCount > 0 && <span style={{ color: '#ef4444' }}>{failedCount} failed</span>}
                    </div>
                  )}
                </div>
              )}

              <table className="agentic-vendors-table">
                <thead>
                  <tr>
                    <th>VENDOR</th>
                    <th>AMOUNT</th>
                    <th>RAIL</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {vendorList.map((vendor) => (
                    <tr key={vendor.vendor_id} className={`agentic-vendor-row agentic-vendor-row--${vendor.state.toLowerCase()}`}>
                      <td className="agentic-vendor-name">
                        <span className={`agentic-vendor-dot agentic-vendor-dot--${vendor.state.toLowerCase()}`}></span>
                        {vendor.name}
                        {vendor.escalation && (
                          <span style={{ marginLeft: '8px', color: '#f59e0b', fontSize: '12px' }}>
                            [{vendor.escalation.flag_type}]
                          </span>
                        )}
                      </td>
                      <td>Rs {(vendor.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="agentic-rail">
                        {vendor.rail_history && vendor.rail_history.length > 0 ? (
                          <span className="agentic-rail-history">
                            <span className="agentic-rail-from">{vendor.rail_history[vendor.rail_history.length - 1].from_rail}</span>
                            <span className="agentic-rail-arrow">&rarr;</span>
                            <span className="agentic-rail-to">{vendor.rail_history[vendor.rail_history.length - 1].to_rail}</span>
                          </span>
                        ) : (
                          (vendor.rail || '').toUpperCase()
                        )}
                      </td>
                      <td>
                        <span className={`agentic-status-badge agentic-status-badge--${vendor.state.toLowerCase()}`}>
                          {getVendorStatusDisplay(vendor.state)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Escalation actions */}
              {vendorList.some(v => v.escalation?.action_required) && (
                <div className="agentic-annotations">
                  {vendorList.filter(v => v.escalation?.action_required).map(v => (
                    <div key={v.vendor_id} className="agentic-annotation" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="agentic-annotation__text">
                        {v.name}: {v.escalation?.details || v.escalation?.flag_type}
                      </span>
                      <button
                        onClick={() => handleEscalation(v.vendor_id, 'capture')}
                        style={{ padding: '4px 12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleEscalation(v.vendor_id, 'cancel')}
                        style={{ padding: '4px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Annotations */}
              <div className="agentic-annotations">
                {vendorList.some(v => v.rail_history && v.rail_history.length > 0) && (
                  <div className="agentic-annotation">
                    <span className="agentic-annotation__icon">&rarr;</span>
                    <span className="agentic-annotation__text">Auto rail-switch on failure</span>
                  </div>
                )}
                {batchOrderId && (
                  <div className="agentic-annotation">
                    <span className="agentic-annotation__icon">&rarr;</span>
                    <span className="agentic-annotation__text">Single batch order — {vendorList.length} vendors grouped</span>
                  </div>
                )}
              </div>

              {/* Payment Awaiting Webhook Card */}
              {paymentAwaitingData && (
                <div style={{ padding: '16px 20px' }}>
                  <PaymentAwaitingCard
                    data={paymentAwaitingData}
                    paymentLink={batchPaymentLink}
                    runId={runId}
                  />
                </div>
              )}
            </div>
            );
          })()}

          {/* Settlement view */}
          {currentStep === 'settle' && vendorList.length > 0 && !policyGateData && (
            <SettlementTab selectedVendors={selectedVendorsForPayment} />
          )}

          {/* Reconciliation view */}
          {(currentStep === 'reconcile' || activeTab === 'reconciliation') && !policyGateData && (
            <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: 0 }}>
              <ReconciliationDashboard
                runId={runId}
                data={reconRows.length > 0 ? reconRows : undefined}
                mode="run"
              />
            </div>
          )}

          {/* Dynamic Query Result Visualization */}
          {queryResult && (
            <div style={{ padding: '16px', width: '100%' }}>
              <DynamicQueryView
                result={queryResult}
                onDismiss={() => setQueryResult(null)}
              />
            </div>
          )}

          {/* Run Summary */}
          {runSummary && !policyGateData && reconciliationRows.length === 0 && (
            <div className="agentic-run-board">
              <div className="agentic-run-board__header">
                <h2>RUN SUMMARY</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', padding: '20px' }}>
                <div className="summary-stat-card">
                  <div className="summary-stat-card__label">Paid</div>
                  <div className="summary-stat-card__value">Rs {(runSummary.paid || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-card__label">Deferred</div>
                  <div className="summary-stat-card__value">Rs {(runSummary.deferred || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-card__label">Float Saved</div>
                  <div className="summary-stat-card__value">Rs {(runSummary.float_saved || 0).toLocaleString('en-IN')}</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-card__label">Vendors Processed</div>
                  <div className="summary-stat-card__value">{runSummary.vendors_processed || 0}</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-card__label">Failed</div>
                  <div className="summary-stat-card__value">{runSummary.failed || 0}</div>
                </div>
                <div className="summary-stat-card">
                  <div className="summary-stat-card__label">Total</div>
                  <div className="summary-stat-card__value">Rs {(runSummary.total || 0).toLocaleString('en-IN')}</div>
                </div>
              </div>
              {runId && (
                <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
                  <button
                    className="orders-footer__generate-btn"
                    onClick={() => api.exportAuditCsv(runId)}
                  >
                    Download Audit CSV
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Default: Orders Tab when nothing is running */}
          {!isAutomating && agentStatus !== 'complete' && agentStatus !== 'partial' && vendorList.length === 0 && !policyGateData && reconciliationRows.length === 0 && !runSummary && activeTab !== 'reconciliation' && (
            <OrdersTab
              invoices={[]}
              persona={persona}
              onGeneratePaymentLinks={handleGeneratePaymentLinks}
              onSelectionChange={setSelectedVendorsForPayment}
              onStateChange={(state) => { ordersStateRef.current = state; }}
              isLoading={false}
            />
          )}
        </div>

        {/* PRIYA Agent Chat Sidebar */}
        <div className="agentic-chat-sidebar">
          <div className="agentic-chat-header">
            <span className="agentic-chat-header__title">PRIYA AGENT</span>
            {showLogs ? (
              <button className="agentic-logs-toggle agentic-logs-toggle--active" onClick={() => setShowLogs(false)}>
                Hide Logs
              </button>
            ) : (
              <button className="agentic-logs-toggle" onClick={() => setShowLogs(true)}>
                Show Logs ({rawEvents.length})
              </button>
            )}
          </div>

          {!showLogs ? (
            <div className="agentic-chat-messages">
              {chatMessages.length === 0 ? (
                <ZenQuote hint={
                  ordersStateRef.current?.syncState !== 'synced'
                    ? 'Say "hi" to meet me, or sync your invoices to get started'
                    : selectedVendorsForPayment.length === 0
                      ? `${ordersStateRef.current?.invoiceCount || 0} invoices loaded. Try "select overdue" or "select all"`
                      : `${selectedVendorsForPayment.length} vendors ready. Say "process payments" to start`
                } />
              ) : (
                <>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`agentic-chat-message agentic-chat-message--assistant agentic-chat-message--${msg.level}`}>
                      <div className="agentic-chat-message__time">{msg.timestamp}</div>
                      <div className="agentic-chat-message__content">{msg.text}</div>
                    </div>
                  ))}
                  {chatMessages.length < 8 && (
                    <MiniZenQuote />
                  )}
                </>
              )}
              <div ref={chatEndRef} />
            </div>
          ) : (
            <div className="agentic-system-logs">
              {rawEvents.map((log, idx) => (
                <div key={idx} className="agentic-log-entry">
                  <span className="agentic-log-time">[{log.timestamp}]</span>
                  <span className="agentic-log-message">{log.event.type}: {JSON.stringify(log.event.payload || {}).substring(0, 120)}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Chat Input */}
          <div className="agentic-chat-input">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
              placeholder={
                agentStatus === 'awaiting_approval' ? 'Say "approve" to proceed...' :
                runId ? 'Ask about this run or say "status"...' :
                selectedVendorsForPayment.length > 0 ? `Say "process payments" (${selectedVendorsForPayment.length} selected)` :
                ordersStateRef.current?.syncState === 'synced' ? 'Try "select overdue" or "select all"...' :
                'Say "hi" to get started...'
              }
              className="agentic-chat-input__field"
            />
            <button
              onClick={handleChatSubmit}
              disabled={!chatInput.trim()}
              className="agentic-chat-input__send"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
