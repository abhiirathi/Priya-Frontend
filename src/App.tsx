import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { FileDrop } from './components/FileDrop';
import { ReconciliationDashboard } from './components/ReconciliationDashboard';
import { AnimatedBackground } from './components/AnimatedBackground';
import { TypingAnimation } from './components/TypingAnimation';
import { TabNavigation } from './components/TabNavigation';
import { OrdersTab } from './components/OrdersTab';
import { PaymentsTab } from './components/PaymentsTab';
import { SettlementTab } from './components/SettlementTab';
import { reconcileTransactions } from './lib/reconcile';
import type { BankTransaction, PineLabsTransaction } from './types';

async function parseCsvFile<T>(file: File): Promise<T[]> {
  const text = await file.text();
  const parsed = Papa.parse<T>(text, { header: true, dynamicTyping: true, skipEmptyLines: true });
  return parsed.data;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'orders' | 'payments' | 'settlement' | 'reconciliation'>('orders');
  const [selectedVendorsForPayment, setSelectedVendorsForPayment] = useState<string[]>([]);
  const [pineLabsRows, setPineLabsRows] = useState<PineLabsTransaction[]>([]);
  const [bankRows, setBankRows] = useState<BankTransaction[]>([]);
  const [hasReconciled, setHasReconciled] = useState(false);
  const [error, setError] = useState('');
  const [pineLabsFileName, setPineLabsFileName] = useState('');
  const [bankFileName, setBankFileName] = useState('');

  // Auto-load sample datasets on component mount
  useEffect(() => {
    const loadSampleData = async () => {
      try {
        const plResponse = await fetch('/datasets/pine_labs_hospital_payments.csv');
        const plText = await plResponse.text();
        const plParsed = Papa.parse<PineLabsTransaction>(plText, { header: true, dynamicTyping: true, skipEmptyLines: true });
        setPineLabsRows(plParsed.data);
        setPineLabsFileName('pine_labs_hospital_payments.csv');

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

  const handleReconcile = () => {
    if (pineLabsRows.length === 0 && bankRows.length === 0) {
      setError('Upload at least one dataset to run reconciliation.');
      return;
    }

    setError('');
    reconcileTransactions(
      pineLabsRows.length > 0 ? pineLabsRows : [],
      bankRows.length > 0 ? bankRows : []
    );
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
  };

  const clearBankUpload = () => {
    setBankRows([]);
    setBankFileName('');
    setHasReconciled(false);
  };

  const handleGeneratePaymentLinks = (vendorNames: string[]) => {
    setSelectedVendorsForPayment(vendorNames);
    setTimeout(() => {
      setActiveTab('payments');
    }, 300);
  };

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
          {/* Tab Navigation */}
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Tab Content Container */}
          <div className="tab-content-wrapper">
            {activeTab === 'orders' && (
              <OrdersTab
                invoices={[]}
                onGeneratePaymentLinks={handleGeneratePaymentLinks}
              />
            )}

            {activeTab === 'payments' && (
              <PaymentsTab
                vendorNames={selectedVendorsForPayment}
                vendorAmounts={{}}
              />
            )}

            {activeTab === 'settlement' && (
              <SettlementTab selectedVendors={selectedVendorsForPayment} />
            )}

            {activeTab === 'reconciliation' && (
              <ReconciliationDashboard />
            )}
          </div>
        </>
      )}
    </div>
  );
}
