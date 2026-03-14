import { useState, useEffect, useRef } from 'react';
import { OrdersTab } from './OrdersTab';
import { PaymentsTab } from './PaymentsTab';
import { SettlementTab } from './SettlementTab';
import { ReconciliationDashboard } from './ReconciliationDashboard';
import { ChartsPanel } from './ChartsPanel';
import type { ReconciliationRow, DashboardMetrics } from '../types';

type Tab = 'orders' | 'payments' | 'settlement' | 'reconciliation';
type WorkflowStep = 'order' | 'pay' | 'settle' | 'reconcile';

interface Vendor {
  id: string;
  name: string;
  amount: number;
  rail: string;
  status: 'CREATED' | 'PENDING' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'AUTHORIZED' | 'RETRY';
  paymentLink?: string;
  railHistory?: Array<{ from: string; to: string; reason: string }>;
  escalation?: { type: string; action_required: boolean };
}

// Hard-coded reconciliation data
const RECONCILIATION_DATA: ReconciliationRow[] = [
  {
    orderId: 'ORD-001',
    utr: 'NEFT20250314001',
    hospitalId: 'HOSP-001',
    hospitalName: 'Apollo Hospitals',
    pineLabsAmount: 45000,
    bankAmount: 45000,
    variance: 0,
    variancePercent: 0,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: '2026-03-14',
    status: 'reconciled',
    rail: 'NEFT'
  },
  {
    orderId: 'ORD-002',
    utr: 'UPI20250314002',
    hospitalId: 'HOSP-002',
    hospitalName: 'Max Healthcare',
    pineLabsAmount: 32500,
    bankAmount: 32500,
    variance: 0,
    variancePercent: 0,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: '2026-03-14',
    status: 'reconciled',
    rail: 'UPI'
  },
  {
    orderId: 'ORD-003',
    utr: 'NEFT20250314003',
    hospitalId: 'HOSP-003',
    hospitalName: 'Fortis Healthcare',
    pineLabsAmount: 28900,
    bankAmount: 28750,
    variance: -150,
    variancePercent: 0.5,
    expectedSettlementDate: '2026-03-13',
    actualCreditDate: '2026-03-15',
    status: 'delayed',
    rail: 'NEFT'
  },
  {
    orderId: 'ORD-004',
    utr: 'IMPS20250314004',
    hospitalId: 'HOSP-004',
    hospitalName: 'Manipal Hospitals',
    pineLabsAmount: 15000,
    bankAmount: 0,
    variance: -15000,
    variancePercent: 100,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: null,
    status: 'unreconciled',
    rail: 'IMPS'
  },
  {
    orderId: 'ORD-005',
    utr: 'UPI20250314005',
    hospitalId: 'HOSP-005',
    hospitalName: 'Medanta Hospital',
    pineLabsAmount: 42100,
    bankAmount: 40500,
    variance: -1600,
    variancePercent: 3.8,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: null,
    status: 'high-risk',
    rail: 'UPI'
  },
  {
    orderId: 'ORD-006',
    utr: 'NEFT20250314006',
    hospitalId: 'HOSP-001',
    hospitalName: 'Apollo Hospitals',
    pineLabsAmount: 22500,
    bankAmount: 22500,
    variance: 0,
    variancePercent: 0,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: '2026-03-14',
    status: 'reconciled',
    rail: 'NEFT'
  },
  {
    orderId: 'ORD-007',
    utr: 'IMPS20250314007',
    hospitalId: 'HOSP-002',
    hospitalName: 'Max Healthcare',
    pineLabsAmount: 18900,
    bankAmount: 18900,
    variance: 0,
    variancePercent: 0,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: '2026-03-14',
    status: 'reconciled',
    rail: 'IMPS'
  },
  {
    orderId: 'ORD-008',
    utr: 'UPI20250314008',
    hospitalId: 'HOSP-006',
    hospitalName: 'Aravind Eye Hospital',
    pineLabsAmount: 8500,
    bankAmount: 0,
    variance: -8500,
    variancePercent: 100,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: null,
    status: 'unreconciled',
    rail: 'UPI'
  },
  {
    orderId: 'ORD-009',
    utr: 'NEFT20250314009',
    hospitalId: 'HOSP-003',
    hospitalName: 'Fortis Healthcare',
    pineLabsAmount: 55000,
    bankAmount: 52000,
    variance: -3000,
    variancePercent: 5.5,
    expectedSettlementDate: '2026-03-13',
    actualCreditDate: '2026-03-16',
    status: 'high-risk',
    rail: 'NEFT'
  },
  {
    orderId: 'ORD-010',
    utr: 'UPI20250314010',
    hospitalId: 'HOSP-004',
    hospitalName: 'Manipal Hospitals',
    pineLabsAmount: 12300,
    bankAmount: 12300,
    variance: 0,
    variancePercent: 0,
    expectedSettlementDate: '2026-03-14',
    actualCreditDate: '2026-03-14',
    status: 'reconciled',
    rail: 'UPI'
  }
];

const generateMetrics = (rows: ReconciliationRow[]): DashboardMetrics => {
  const reconciledCount = rows.filter(r => r.status === 'reconciled').length;
  const unreconciledCount = rows.filter(r => r.status === 'unreconciled').length;
  const delayedCount = rows.filter(r => r.status === 'delayed').length;
  const highRiskCount = rows.filter(r => r.status === 'high-risk').length;

  return {
    totalTransactions: rows.length,
    reconciledCount,
    unreconciledCount,
    delayedCount,
    highRiskCount,
    reconciledPercent: Math.round((reconciledCount / rows.length) * 100),
    unreconciledPercent: Math.round((unreconciledCount / rows.length) * 100),
    delayedPercent: Math.round((delayedCount / rows.length) * 100),
    totalPineLabsVolume: rows.reduce((sum, r) => sum + r.pineLabsAmount, 0),
    totalBankVolume: rows.reduce((sum, r) => sum + r.bankAmount, 0)
  };
};

export function AgenticApp() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [selectedVendorsForPayment, setSelectedVendorsForPayment] = useState<string[]>([]);
  const [runId, setRunId] = useState<string>('');
  const [invoices] = useState<any[]>([]);
  const persona = 'HOSPITAL' as const;

  const [isAutomating, setIsAutomating] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [chatHistory, setChatHistory] = useState<Array<{ time: string; role: 'user' | 'assistant'; content: string; level?: 'info' | 'warn' | 'error' }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [systemLogs, setSystemLogs] = useState<Array<{ timestamp: string; message: string }>>([]);
  const [showLogs, setShowLogs] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [completedSteps, setCompletedSteps] = useState<WorkflowStep[]>([]);
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('order');

  // Reconciliation state
  const [filteredReconciliationRows, setFilteredReconciliationRows] = useState<ReconciliationRow[]>(RECONCILIATION_DATA);
  const [reconciliationPage, setReconciliationPage] = useState(1);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, systemLogs]);

  // Handle reconciliation query
  const handleReconciliationQuery = (query: string) => {
    addChatMessage('assistant', `Analyzing: ${query}`, 'info');

    let filtered: ReconciliationRow[] = RECONCILIATION_DATA;
    let queryMessage = '';

    if (query.toLowerCase().includes('high risk') || query.toLowerCase().includes('high-risk')) {
      filtered = RECONCILIATION_DATA.filter((r: ReconciliationRow) => r.status === 'high-risk');
      queryMessage = `Found ${filtered.length} high-risk transactions`;
    } else if (query.toLowerCase().includes('unreconciled')) {
      filtered = RECONCILIATION_DATA.filter((r: ReconciliationRow) => r.status === 'unreconciled');
      queryMessage = `Found ${filtered.length} unreconciled transactions`;
    } else if (query.toLowerCase().includes('delayed')) {
      filtered = RECONCILIATION_DATA.filter((r: ReconciliationRow) => r.status === 'delayed');
      queryMessage = `Found ${filtered.length} delayed transactions`;
    } else if (query.toLowerCase().includes('reconciled')) {
      filtered = RECONCILIATION_DATA.filter((r: ReconciliationRow) => r.status === 'reconciled');
      queryMessage = `Found ${filtered.length} reconciled transactions`;
    } else if (query.toLowerCase().includes('neft')) {
      filtered = RECONCILIATION_DATA.filter((r: ReconciliationRow) => r.rail === 'NEFT');
      queryMessage = `Found ${filtered.length} NEFT transactions`;
    } else if (query.toLowerCase().includes('upi')) {
      filtered = RECONCILIATION_DATA.filter((r: ReconciliationRow) => r.rail === 'UPI');
      queryMessage = `Found ${filtered.length} UPI transactions`;
    } else if (query.toLowerCase().includes('all')) {
      filtered = RECONCILIATION_DATA;
      queryMessage = `Showing all ${filtered.length} transactions`;
    }

    setFilteredReconciliationRows(filtered);
    setReconciliationPage(1);
    addChatMessage('assistant', queryMessage, 'info');
  };

  // Handle workflow automation - Dummy flow with smooth tab transitions
  const startAutomation = async (instruction: string, vendorCount: number) => {
    setIsAutomating(true);
    setCompletedSteps([]);
    setCurrentStep('order');
    const newRunId = `run_${new Date().toISOString().split('T')[0]}_${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    setRunId(newRunId);

    addChatMessage('assistant', `Starting payment workflow: ${instruction}`, 'info');
    addSystemLog(`Workflow initiated: ${newRunId}`);

    try {
      // Create dummy vendors for display
      const dummyVendors: Vendor[] = Array.from({ length: vendorCount }, (_, idx) => ({
        id: `vendor_${idx}`,
        name: `Vendor ${idx + 1}`,
        amount: Math.floor(Math.random() * 100000) + 10000,
        rail: ['NEFT', 'UPI', 'IMPS'][Math.floor(Math.random() * 3)],
        status: 'CREATED',
      }));

      // Step 1: Order Creation
      setCurrentStep('order');
      await sleep(1000);

      setVendors(dummyVendors);
      addChatMessage('assistant', `✓ Created ${vendorCount} orders`, 'info');
      addSystemLog(`Orders created for ${vendorCount} vendors`);
      setCompletedSteps(prev => [...prev, 'order']);

      // Simulate order processing
      await sleep(800);
      setVendors(prev => prev.map(v => ({ ...v, status: 'PENDING' })));
      addChatMessage('assistant', `Prioritizing vendors by urgency...`, 'info');

      // Step 2: Payment Generation
      setCurrentStep('pay');
      await sleep(1200);

      setVendors(prev => prev.map(v => ({ ...v, status: 'PROCESSING' })));
      addChatMessage('assistant', `Generating payment links...`, 'info');

      for (let i = 0; i < vendorCount; i++) {
        await sleep(500);
        const isRetry = Math.random() > 0.8;
        const paymentLink = i === 0
          ? 'https://api-staging.pluralonline.com/api/v3/checkout-bff/pbl/redirect?paymentLinkId=4JKD8GiZsD2M007zfYqjf4wxFNNay2KAa8Pqf0rx1oY%3D'
          : `https://pinelabs.com/pay/${Math.random().toString(36).substring(7)}`;

        if (isRetry && i > 0) {
          setVendors(prev => prev.map((v, idx) => idx === i ? { ...v, status: 'RETRY', rail: 'NEFT→UPI', paymentLink } : v));
          addChatMessage('assistant', `⚠ Vendor ${i + 1} — NEFT failed. Auto-retrying on UPI...`, 'warn');
        } else {
          setVendors(prev => prev.map((v, idx) => idx === i ? { ...v, status: 'PROCESSED', paymentLink } : v));
          addChatMessage('assistant', `✓ Vendor ${i + 1} processed`, 'info');
        }
      }

      setCompletedSteps(prev => [...prev, 'pay']);
      addSystemLog(`Payment links generated`);

      // Give time to interact with payment link and demo
      addChatMessage('assistant', `✓ Payment links ready. Click to process...`, 'info');
      await sleep(8000);

      // Smooth transition to Settlement tab
      await sleep(800);
      switchTabWithAnimation('settlement');
      addChatMessage('assistant', `Moving to settlement phase...`, 'info');

      // Step 3: Settlement
      setCurrentStep('settle');
      await sleep(1200);

      addChatMessage('assistant', `Monitoring payment settlement...`, 'info');
      addSystemLog(`Settlement monitoring started`);

      // Show settlement progress with proper calculations
      const batchSize = Math.max(1, Math.ceil(vendorCount / 3));
      for (let i = 0; i < 3; i++) {
        await sleep(1000);
        const settled = Math.min((i + 1) * batchSize, vendorCount);
        addChatMessage('assistant', `Settlement progress: ${settled}/${vendorCount} payments processed`, 'info');
      }

      setCompletedSteps(prev => [...prev, 'settle']);
      addSystemLog(`Settlement complete - All payments settled`);

      // Give time to review settlement phase
      await sleep(8000);

      // Smooth transition to Reconciliation tab
      await sleep(800);
      switchTabWithAnimation('reconciliation');
      addChatMessage('assistant', `Moving to reconciliation phase...`, 'info');

      // Step 4: Reconciliation
      setCurrentStep('reconcile');
      await sleep(1200);

      addChatMessage('assistant', `Running reconciliation...`, 'info');
      addSystemLog(`Reconciliation started`);

      await sleep(1500);
      const variance = Math.floor(Math.random() * 500);
      const mdrCharge = Math.floor(vendorCount * 150);
      addChatMessage('assistant', `✅ Complete! MDR: ₹${mdrCharge}, Variance: ₹${variance}`, 'info');
      addSystemLog(`Workflow complete - All payments reconciled`);

      setCompletedSteps(prev => [...prev, 'reconcile']);
      setCurrentStep('reconcile');

      // Keep automation running for a moment to show final state
      await sleep(2000);
      setIsAutomating(false);
    } catch (error) {
      addChatMessage('assistant', '❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error'), 'error');
      setIsAutomating(false);
    }
  };

  const switchTabWithAnimation = (tab: Tab) => {
    setActiveTab(tab);
  };

  const handleGeneratePaymentLinks = (vendorNames: string[]) => {
    setSelectedVendorsForPayment(vendorNames);
    setChatInput(`Process payments for: ${vendorNames.join(', ')}`);

    // Auto-start workflow with vendor count
    startAutomation(`Process payments for ${vendorNames.length} vendors`, vendorNames.length);
  };

  const addChatMessage = (role: 'user' | 'assistant', content: string, level?: 'info' | 'warn' | 'error') => {
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setChatHistory((prev) => [...prev, { time, role, content, level: level || 'info' }]);
  };

  const addSystemLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSystemLogs(prev => [...prev, { timestamp, message }]);
  };

  const handleChatSubmit = () => {
    if (!chatInput.trim()) return;

    addChatMessage('user', chatInput);
    const input = chatInput;
    setChatInput('');

    // Check if it's a reconciliation query
    if (activeTab === 'reconciliation') {
      handleReconciliationQuery(input);
    } else if (selectedVendorsForPayment.length > 0) {
      startAutomation(input, selectedVendorsForPayment.length);
    } else {
      addChatMessage('assistant', 'Please select invoices first on the Orders tab', 'warn');
    }
  };

  const stepDots = [
    { step: 'order' as const, label: 'ORDER' },
    { step: 'pay' as const, label: 'PAY' },
    { step: 'settle' as const, label: 'SETTLE' },
    { step: 'reconcile' as const, label: 'RECONCILE' }
  ];

  const metrics = generateMetrics(filteredReconciliationRows);
  const totalPages = Math.ceil(filteredReconciliationRows.length / 5);
  const paginatedRows = filteredReconciliationRows.slice((reconciliationPage - 1) * 5, reconciliationPage * 5);

  return (
    <div className="agentic-app">
      {/* Modern Top Bar */}
      <div className="agentic-topbar">
        <div className="agentic-topbar__left">
          <div className="agentic-logo">
            <div className="agentic-logo__icon">P</div>
            <span className="agentic-logo__text">PRIYA</span>
          </div>
        </div>

        {/* Center: Status and Steps */}
        <div className="agentic-topbar__center">
          <div className="agentic-status-group">
            <span className="agentic-persona-badge">{persona}</span>
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
          {isAutomating && (
            <div className="agentic-status-badge">
              <span className="agentic-status-pulse"></span>
              Awaiting approval
            </div>
          )}
        </div>
      </div>

      <div className="agentic-main">
        {/* Main Content Area */}
        <div className="agentic-content">
          {isAutomating && vendors.length > 0 ? (
            <>
              {(currentStep === 'order' || currentStep === 'pay') && (
                <div className="agentic-run-board">
                  <div className="agentic-run-board__header">
                    <h2>PAYMENT RUN BOARD</h2>
                    <span className="agentic-run-board__count">{vendors.length} vendors selected</span>
                  </div>

                  <table className="agentic-vendors-table">
                    <thead>
                      <tr>
                        <th>VENDOR</th>
                        <th>AMOUNT</th>
                        <th>RAIL</th>
                        <th>STATUS</th>
                        <th>PAYMENT LINK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vendors.map((vendor) => (
                        <tr key={vendor.id} className={`agentic-vendor-row agentic-vendor-row--${vendor.status.toLowerCase()}`}>
                          <td className="agentic-vendor-name">
                            <span className={`agentic-vendor-dot agentic-vendor-dot--${vendor.status.toLowerCase()}`}></span>
                            {vendor.name}
                          </td>
                          <td>₹{vendor.amount.toLocaleString('en-IN')}</td>
                          <td className="agentic-rail">
                            {vendor.railHistory ? (
                              <span className="agentic-rail-history">
                                <span className="agentic-rail-from">{vendor.railHistory[0]?.from}</span>
                                <span className="agentic-rail-arrow">→</span>
                                <span className="agentic-rail-to">{vendor.railHistory[0]?.to}</span>
                              </span>
                            ) : (
                              vendor.rail
                            )}
                          </td>
                          <td>
                            <span className={`agentic-status-badge agentic-status-badge--${vendor.status.toLowerCase()}`}>
                              {vendor.status === 'PROCESSED' && '✓ PROCESSED'}
                              {vendor.status === 'PENDING' && 'PENDING...'}
                              {vendor.status === 'PROCESSING' && 'PROCESSING...'}
                              {vendor.status === 'RETRY' && '⟳ RETRY #2'}
                              {vendor.status === 'AUTHORIZED' && 'AUTHORIZED'}
                              {vendor.status === 'CREATED' && 'CREATED'}
                              {vendor.status === 'FAILED' && '✕ FAILED'}
                            </span>
                          </td>
                          <td>
                            {vendor.paymentLink ? (
                              <a
                                href={vendor.paymentLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="agentic-payment-link"
                                title={vendor.paymentLink}
                              >
                                🔗 {vendor.paymentLink.substring(0, 30)}...
                              </a>
                            ) : (
                              <span className="agentic-payment-link-empty">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Annotations */}
                  <div className="agentic-annotations">
                    {vendors.some(v => v.status === 'RETRY') && (
                      <div className="agentic-annotation">
                        <span className="agentic-annotation__icon">→</span>
                        <span className="agentic-annotation__text">Auto rail-switch on failure</span>
                      </div>
                    )}
                    {vendors.some(v => v.escalation) && (
                      <div className="agentic-annotation">
                        <span className="agentic-annotation__icon">→</span>
                        <span className="agentic-annotation__text">Human-in-loop for Schedule H</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {currentStep === 'settle' && (
                <SettlementTab selectedVendors={selectedVendorsForPayment} />
              )}
              {currentStep === 'reconcile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                    <ReconciliationDashboard
                      metrics={metrics}
                      visibleRows={filteredReconciliationRows}
                      paginatedExceptions={paginatedRows}
                      currentPage={reconciliationPage}
                      totalPages={totalPages}
                      onPageChange={setReconciliationPage}
                      onReset={() => {
                        setFilteredReconciliationRows(RECONCILIATION_DATA);
                        setReconciliationPage(1);
                        addChatMessage('assistant', 'View reset to all transactions', 'info');
                      }}
                    />
                  </div>
                  <div style={{ width: '100%' }}>
                    <ChartsPanel
                      metrics={metrics}
                      rows={filteredReconciliationRows}
                      onStatusSelect={() => {}}
                      onHospitalSelect={() => {}}
                      onRailSelect={() => {}}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {activeTab === 'orders' && (
                <OrdersTab
                  invoices={invoices}
                  onGeneratePaymentLinks={handleGeneratePaymentLinks}
                  isLoading={isAutomating}
                />
              )}
              {activeTab === 'payments' && (
                <PaymentsTab
                  vendorNames={selectedVendorsForPayment}
                  vendorAmounts={{}}
                  onPaymentLinksGenerated={() => {}}
                />
              )}
              {activeTab === 'settlement' && (
                <SettlementTab selectedVendors={selectedVendorsForPayment} />
              )}
              {activeTab === 'reconciliation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px', width: '100%' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                    <ReconciliationDashboard
                      metrics={metrics}
                      visibleRows={filteredReconciliationRows}
                      paginatedExceptions={paginatedRows}
                      currentPage={reconciliationPage}
                      totalPages={totalPages}
                      onPageChange={setReconciliationPage}
                      onReset={() => {
                        setFilteredReconciliationRows(RECONCILIATION_DATA);
                        setReconciliationPage(1);
                        addChatMessage('assistant', 'View reset to all transactions', 'info');
                      }}
                    />
                  </div>
                  <div style={{ width: '100%' }}>
                    <ChartsPanel
                      metrics={metrics}
                      rows={filteredReconciliationRows}
                      onStatusSelect={() => {}}
                      onHospitalSelect={() => {}}
                      onRailSelect={() => {}}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* PRIYA Agent Chat Sidebar */}
        <div className="agentic-chat-sidebar">
          {/* Chat Header */}
          <div className="agentic-chat-header">
            <span className="agentic-chat-header__title">PRIYA AGENT</span>
            {showLogs ? (
              <button className="agentic-logs-toggle agentic-logs-toggle--active" onClick={() => setShowLogs(false)}>
                Hide Logs
              </button>
            ) : (
              <button className="agentic-logs-toggle" onClick={() => setShowLogs(true)}>
                Show Logs
              </button>
            )}
          </div>

          {/* Chat Messages or Logs */}
          {!showLogs ? (
            <div className="agentic-chat-messages">
              {chatHistory.length === 0 ? (
                <div className="agentic-chat-empty">
                  <div className="agentic-chat-empty__icon">💬</div>
                  <div className="agentic-chat-empty__text">
                    {activeTab === 'reconciliation' ? 'Try: "Show high-risk transactions"' : 'Select invoices on the Orders tab and I will orchestrate the entire payment workflow'}
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, idx) => (
                  <div key={idx} className={`agentic-chat-message agentic-chat-message--${msg.role} agentic-chat-message--${msg.level}`}>
                    <div className="agentic-chat-message__time">{msg.time}</div>
                    <div className="agentic-chat-message__content">{msg.content}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
          ) : (
            <div className="agentic-system-logs">
              {systemLogs.map((log, idx) => (
                <div key={idx} className="agentic-log-entry">
                  <span className="agentic-log-time">[{log.timestamp}]</span>
                  <span className="agentic-log-message">{log.message}</span>
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
              placeholder={activeTab === 'reconciliation' ? 'Query reconciliation data...' : 'Ask PRIYA to execute...'}
              disabled={isAutomating}
              className="agentic-chat-input__field"
            />
            <button
              onClick={handleChatSubmit}
              disabled={!chatInput.trim() || isAutomating}
              className="agentic-chat-input__send">
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
