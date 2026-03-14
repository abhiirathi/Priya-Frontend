import { useState, useEffect, useRef } from 'react';
import { PolicyConfigPanel } from './PolicyConfigPanel';
import type { Persona } from '../types';

export interface Invoice {
  id: string;
  vendorName: string;
  vendorType: 'pharma' | 'company' | 'grocery' | 'fmcg';
  amount: number;
  dueDate: string;
  invoiceDate: string;
  invoiceNumber: string;
  status: 'pending' | 'partial' | 'overdue';
  items: number;
  drugSchedule?: string;
  notes?: string;
}

export interface OrdersTabState {
  syncState: 'idle' | 'syncing' | 'synced';
  invoiceCount: number;
  invoices: Invoice[];
  selectedVendors: string[];
  overdueCount: number;
  totalAmount: number;
  scheduleHCount: number;
  selectByFilter: (filter: (inv: Invoice) => boolean) => void;
}

interface OrdersTabProps {
  invoices: Invoice[];
  persona?: Persona;
  onGeneratePaymentLinks: (selectedVendors: string[]) => void;
  onSelectionChange?: (selectedVendors: string[]) => void;
  onSyncComplete?: (invoiceCount: number) => void;
  onStateChange?: (state: OrdersTabState) => void;
  isLoading?: boolean;
}

// Hospital persona invoices (pharma vendors)
const HOSPITAL_INVOICES: Invoice[] = [
  { id: '1', vendorName: 'Ranbaxy Laboratories', vendorType: 'company', amount: 250000, dueDate: '2026-03-25', invoiceDate: '2026-03-01', invoiceNumber: 'RX-2026-001', status: 'pending', items: 15, drugSchedule: 'H' },
  { id: '2', vendorName: 'Mankind Pharma', vendorType: 'company', amount: 180000, dueDate: '2026-03-28', invoiceDate: '2026-03-05', invoiceNumber: 'MK-2026-042', status: 'pending', items: 12 },
  { id: '3', vendorName: 'Sun Pharmaceutical', vendorType: 'company', amount: 320000, dueDate: '2026-03-20', invoiceDate: '2026-02-20', invoiceNumber: 'SUN-2026-108', status: 'overdue', items: 8, drugSchedule: 'H' },
  { id: '4', vendorName: 'Apollo Pharmacy', vendorType: 'pharma', amount: 95000, dueDate: '2026-03-22', invoiceDate: '2026-03-08', invoiceNumber: 'APL-2026-015', status: 'pending', items: 20 },
  { id: '5', vendorName: 'Medicare Pharmacy', vendorType: 'pharma', amount: 67500, dueDate: '2026-03-26', invoiceDate: '2026-03-10', invoiceNumber: 'MED-2026-089', status: 'pending', items: 14 },
  { id: '6', vendorName: 'PharmEasy', vendorType: 'pharma', amount: 125000, dueDate: '2026-03-18', invoiceDate: '2026-02-18', invoiceNumber: 'PE-2026-267', status: 'overdue', items: 25, drugSchedule: 'H' },
  { id: '7', vendorName: 'Cipla Ltd', vendorType: 'company', amount: 210000, dueDate: '2026-03-23', invoiceDate: '2026-03-03', invoiceNumber: 'CIP-2026-056', status: 'pending', items: 18 },
  { id: '8', vendorName: "Dr. Reddy's Labs", vendorType: 'company', amount: 295000, dueDate: '2026-03-29', invoiceDate: '2026-03-07', invoiceNumber: 'DRL-2026-134', status: 'pending', items: 11 },
  { id: '9', vendorName: 'Lupin Pharma', vendorType: 'company', amount: 215000, dueDate: '2026-02-28', invoiceDate: '2026-02-28', invoiceNumber: 'LUP-2026-073', status: 'overdue', items: 16 },
  { id: '10', vendorName: 'NetMeds', vendorType: 'pharma', amount: 89000, dueDate: '2026-03-30', invoiceDate: '2026-03-12', invoiceNumber: 'NM-2026-156', status: 'pending', items: 22 },
  { id: '11', vendorName: 'Aurobindo Pharma', vendorType: 'company', amount: 275000, dueDate: '2026-03-27', invoiceDate: '2026-03-02', invoiceNumber: 'AUR-2026-089', status: 'partial', items: 13, drugSchedule: 'H' },
  { id: '12', vendorName: 'Medlife', vendorType: 'pharma', amount: 112000, dueDate: '2026-03-21', invoiceDate: '2026-02-21', invoiceNumber: 'ML-2026-234', status: 'overdue', items: 19 },
  { id: '13', vendorName: 'Glaxo Smithkline', vendorType: 'company', amount: 340000, dueDate: '2026-03-31', invoiceDate: '2026-03-06', invoiceNumber: 'GSK-2026-045', status: 'pending', items: 9 },
  { id: '14', vendorName: '1mg Pharmacy', vendorType: 'pharma', amount: 78500, dueDate: '2026-03-24', invoiceDate: '2026-03-09', invoiceNumber: '1MG-2026-198', status: 'pending', items: 17 },
  { id: '15', vendorName: 'Alembic Pharma', vendorType: 'company', amount: 168000, dueDate: '2026-03-19', invoiceDate: '2026-02-22', invoiceNumber: 'ALB-2026-067', status: 'overdue', items: 10 },
  { id: '16', vendorName: 'Care Pharmacy', vendorType: 'pharma', amount: 98000, dueDate: '2026-03-28', invoiceDate: '2026-03-11', invoiceNumber: 'CARE-2026-312', status: 'pending', items: 23 },
  { id: '17', vendorName: 'Torrent Pharma', vendorType: 'company', amount: 238000, dueDate: '2026-03-26', invoiceDate: '2026-03-04', invoiceNumber: 'TOR-2026-091', status: 'pending', items: 14 },
  { id: '18', vendorName: 'Healthkart', vendorType: 'pharma', amount: 145000, dueDate: '2026-03-22', invoiceDate: '2026-02-25', invoiceNumber: 'HK-2026-501', status: 'overdue', items: 28 },
  { id: '19', vendorName: "Divi's Laboratories", vendorType: 'company', amount: 285000, dueDate: '2026-03-30', invoiceDate: '2026-03-08', invoiceNumber: 'DIVI-2026-102', status: 'pending', items: 7 },
  { id: '20', vendorName: 'Wellness Forever', vendorType: 'pharma', amount: 156000, dueDate: '2026-03-25', invoiceDate: '2026-02-28', invoiceNumber: 'WF-2026-445', status: 'overdue', items: 31 },
];

// Kirana persona invoices (FMCG & grocery vendors)
const KIRANA_INVOICES: Invoice[] = [
  { id: '1', vendorName: 'Hindustan Unilever', vendorType: 'fmcg', amount: 185000, dueDate: '2026-03-25', invoiceDate: '2026-03-01', invoiceNumber: 'HUL-2026-001', status: 'pending', items: 45 },
  { id: '2', vendorName: 'ITC Limited', vendorType: 'fmcg', amount: 142000, dueDate: '2026-03-28', invoiceDate: '2026-03-05', invoiceNumber: 'ITC-2026-042', status: 'pending', items: 38 },
  { id: '3', vendorName: 'Parle Products', vendorType: 'fmcg', amount: 78000, dueDate: '2026-03-20', invoiceDate: '2026-02-20', invoiceNumber: 'PAR-2026-108', status: 'overdue', items: 22 },
  { id: '4', vendorName: 'Amul Dairy', vendorType: 'grocery', amount: 95000, dueDate: '2026-03-22', invoiceDate: '2026-03-08', invoiceNumber: 'AML-2026-015', status: 'pending', items: 18 },
  { id: '5', vendorName: 'Britannia Industries', vendorType: 'fmcg', amount: 67500, dueDate: '2026-03-26', invoiceDate: '2026-03-10', invoiceNumber: 'BRT-2026-089', status: 'pending', items: 25 },
  { id: '6', vendorName: 'Dabur India', vendorType: 'fmcg', amount: 125000, dueDate: '2026-03-18', invoiceDate: '2026-02-18', invoiceNumber: 'DAB-2026-267', status: 'overdue', items: 32 },
  { id: '7', vendorName: 'Marico Ltd', vendorType: 'fmcg', amount: 92000, dueDate: '2026-03-23', invoiceDate: '2026-03-03', invoiceNumber: 'MAR-2026-056', status: 'pending', items: 20 },
  { id: '8', vendorName: 'Godrej Consumer', vendorType: 'fmcg', amount: 110000, dueDate: '2026-03-29', invoiceDate: '2026-03-07', invoiceNumber: 'GCP-2026-134', status: 'pending', items: 28 },
  { id: '9', vendorName: 'Haldiram Foods', vendorType: 'grocery', amount: 156000, dueDate: '2026-02-28', invoiceDate: '2026-02-15', invoiceNumber: 'HLD-2026-073', status: 'overdue', items: 15 },
  { id: '10', vendorName: 'Patanjali Ayurved', vendorType: 'fmcg', amount: 89000, dueDate: '2026-03-30', invoiceDate: '2026-03-12', invoiceNumber: 'PAT-2026-156', status: 'pending', items: 35 },
  { id: '11', vendorName: 'Nestle India', vendorType: 'fmcg', amount: 198000, dueDate: '2026-03-27', invoiceDate: '2026-03-02', invoiceNumber: 'NES-2026-089', status: 'partial', items: 42 },
  { id: '12', vendorName: 'P&G India', vendorType: 'fmcg', amount: 175000, dueDate: '2026-03-21', invoiceDate: '2026-02-21', invoiceNumber: 'PG-2026-234', status: 'overdue', items: 30 },
  { id: '13', vendorName: 'Tata Consumer', vendorType: 'fmcg', amount: 134000, dueDate: '2026-03-31', invoiceDate: '2026-03-06', invoiceNumber: 'TATA-2026-045', status: 'pending', items: 24 },
  { id: '14', vendorName: 'Mother Dairy', vendorType: 'grocery', amount: 62000, dueDate: '2026-03-24', invoiceDate: '2026-03-09', invoiceNumber: 'MD-2026-198', status: 'pending', items: 12 },
  { id: '15', vendorName: 'Bikaji Foods', vendorType: 'grocery', amount: 48000, dueDate: '2026-03-19', invoiceDate: '2026-02-22', invoiceNumber: 'BKJ-2026-067', status: 'overdue', items: 18 },
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
}

function getStatusColor(status: string): 'pending' | 'partial' | 'overdue' {
  return status as 'pending' | 'partial' | 'overdue';
}

function getVendorTag(vendorType: string): { label: string; color: string } {
  switch (vendorType) {
    case 'pharma': return { label: 'Pharmacy', color: '#22c55e' };
    case 'company': return { label: 'Pharma Co.', color: '#3b82f6' };
    case 'fmcg': return { label: 'FMCG', color: '#f59e0b' };
    case 'grocery': return { label: 'Grocery', color: '#10b981' };
    default: return { label: vendorType, color: '#6b7280' };
  }
}

// --- Line item generation for collapsible detail ---
interface LineItem {
  name: string;
  qty: number;
  unit: string;
  unitPrice: number;
  total: number;
}

const PHARMA_ITEMS = [
  'Amoxicillin 500mg', 'Paracetamol 650mg', 'Metformin 500mg', 'Atorvastatin 10mg', 'Omeprazole 20mg',
  'Azithromycin 250mg', 'Cetirizine 10mg', 'Pantoprazole 40mg', 'Losartan 50mg', 'Amlodipine 5mg',
  'Ciprofloxacin 500mg', 'Doxycycline 100mg', 'Ibuprofen 400mg', 'Ranitidine 150mg', 'Diclofenac 50mg',
  'Ceftriaxone 1g Inj', 'Insulin Glargine 100IU', 'Ondansetron 4mg', 'Metronidazole 400mg', 'Gabapentin 300mg',
  'Fluconazole 150mg', 'Salbutamol Inhaler', 'Prednisolone 5mg', 'Clopidogrel 75mg', 'Telmisartan 40mg',
  'Montelukast 10mg', 'Levofloxacin 500mg', 'Rabeprazole 20mg', 'Glimepiride 2mg', 'Rosuvastatin 10mg',
];

const FMCG_ITEMS = [
  'Surf Excel 1kg', 'Tata Salt 1kg', 'Maggi Noodles 12-pack', 'Parle-G Biscuits 800g', 'Amul Butter 500g',
  'Vim Dishwash 750ml', 'Red Label Tea 500g', 'Aashirvaad Atta 5kg', 'Colgate Maxfresh 150g', 'Dettol Soap 4-pack',
  'Fortune Oil 1L', 'Harpic Cleaner 1L', 'Lux Soap 3-pack', 'Clinic Plus 340ml', 'Bournvita 500g',
  'Good Day Biscuits 600g', 'Lifebuoy Handwash 190ml', 'Lay\'s Chips 52g x20', 'Haldiram Namkeen 1kg', 'Cadbury Dairy Milk 12-pack',
  'Pepsi 2L x6', 'Dove Shampoo 340ml', 'Nivea Cream 200ml', 'Closeup Toothpaste 150g', 'Whisper Ultra 30s',
  'Kurkure 90g x15', 'Ariel Detergent 2kg', 'Nescafe Classic 200g', 'Amul Milk 1L x12', 'Mother Dairy Curd 400g',
];

function generateLineItems(invoice: Invoice, isHospital: boolean): LineItem[] {
  const seed = invoice.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => ((seed * 9301 + 49297 + i * 1327) % 233280) / 233280;

  const pool = isHospital ? PHARMA_ITEMS : FMCG_ITEMS;
  const count = Math.min(invoice.items, pool.length);

  // Shuffle pool indices deterministically, then take first `count`
  const indices = pool.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng(i) * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const picked = indices.slice(0, count);

  const items: LineItem[] = [];
  let remaining = invoice.amount;

  for (let i = 0; i < count; i++) {
    const qty = Math.floor(rng(i * 3 + 100) * 48) + 2; // 2-50
    const isLast = i === count - 1;
    const itemTotal = isLast ? remaining : Math.round(remaining * (rng(i * 3 + 200) * 0.3 + 0.02));
    remaining -= itemTotal;
    if (remaining < 0) remaining = 0;

    items.push({
      name: pool[picked[i]],
      qty,
      unit: isHospital ? 'strips' : 'pcs',
      unitPrice: Math.round(itemTotal / qty),
      total: itemTotal,
    });
  }

  return items.sort((a, b) => b.total - a.total);
}

export function OrdersTab({ invoices: initialInvoices = [], persona = 'hospital', onGeneratePaymentLinks, onSelectionChange, onSyncComplete, onStateChange, isLoading }: OrdersTabProps) {
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [currentPage, setCurrentPage] = useState(1);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [syncProgress, setSyncProgress] = useState(0);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 10;

  // Lazy line-item cache — only generate when a card is expanded
  const lineItemsCache = useRef(new Map<string, LineItem[]>());
  const getLineItems = (invoice: Invoice): LineItem[] => {
    const key = `${invoice.id}_${persona}`;
    if (!lineItemsCache.current.has(key)) {
      lineItemsCache.current.set(key, generateLineItems(invoice, persona === 'hospital'));
    }
    return lineItemsCache.current.get(key)!;
  };

  const sourceName = 'Khatabook';

  const handleSync = async () => {
    setSyncState('syncing');
    setSyncProgress(0);
    setSelectedVendors([]);

    const data = persona === 'hospital' ? HOSPITAL_INVOICES : KIRANA_INVOICES;

    // Animate progress
    for (let i = 0; i <= 100; i += 8) {
      await new Promise(r => setTimeout(r, 40));
      setSyncProgress(Math.min(i, 100));
    }

    setInvoices(data);
    setSyncProgress(100);

    await new Promise(r => setTimeout(r, 300));
    setSyncState('synced');
    setCurrentPage(1);
    onSyncComplete?.(data.length);
  };

  const handleSelectVendor = (vendorName: string) => {
    setSelectedVendors((prev) => {
      const next = prev.includes(vendorName) ? prev.filter((v) => v !== vendorName) : [...prev, vendorName];
      onSelectionChange?.(next);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedVendors.length === invoices.length) {
      setSelectedVendors([]);
      onSelectionChange?.([]);
    } else {
      const all = invoices.map(i => i.vendorName);
      setSelectedVendors(all);
      onSelectionChange?.(all);
    }
  };

  const handleGenerateLinks = () => {
    if (selectedVendors.length > 0) {
      onGeneratePaymentLinks(selectedVendors);
    }
  };

  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = invoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;
  const pendingCount = invoices.filter((inv) => inv.status === 'pending').length;
  const scheduleHCount = invoices.filter((inv) => inv.drugSchedule === 'H').length;
  const selectedAmount = invoices.filter(inv => selectedVendors.includes(inv.vendorName)).reduce((s, inv) => s + inv.amount, 0);

  // Allow parent/chatbot to select vendors by filter
  const selectByFilter = (filter: (inv: Invoice) => boolean) => {
    const matching = invoices.filter(filter).map(inv => inv.vendorName);
    setSelectedVendors(matching);
    onSelectionChange?.(matching);
  };

  // Report state up to parent for chat context
  useEffect(() => {
    onStateChange?.({
      syncState,
      invoiceCount: invoices.length,
      invoices,
      selectedVendors,
      overdueCount,
      totalAmount,
      scheduleHCount,
      selectByFilter,
    });
  }, [syncState, invoices.length, selectedVendors, overdueCount, totalAmount, scheduleHCount]);

  return (
    <div className="orders-tab">
      {/* Summary Stats */}
      <div className="orders-summary">
        <div className="summary-stat-card">
          <div className="summary-stat-card__label">Total Invoices</div>
          <div className="summary-stat-card__value">{invoices.length}</div>
        </div>
        <div className="summary-stat-card">
          <div className="summary-stat-card__label">Total Amount</div>
          <div className="summary-stat-card__value">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="summary-stat-card summary-stat-card--warning">
          <div className="summary-stat-card__label">Overdue</div>
          <div className="summary-stat-card__value">{overdueCount}</div>
        </div>
        <div className="summary-stat-card">
          <div className="summary-stat-card__label">{persona === 'hospital' ? 'Pending Payment' : 'Credit Due'}</div>
          <div className="summary-stat-card__value">{pendingCount}</div>
        </div>
        {persona === 'hospital' && scheduleHCount > 0 && (
          <div className="summary-stat-card" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div className="summary-stat-card__label">Schedule H</div>
            <div className="summary-stat-card__value" style={{ color: '#f59e0b' }}>{scheduleHCount}</div>
          </div>
        )}
      </div>

      {/* Sync Section */}
      <div className="orders-header">
        {syncState === 'idle' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', width: '100%', padding: '32px 0' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 800, color: '#a78bfa',
            }}>K</div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: '320px' }}>
              Import {persona === 'hospital' ? 'pharma vendor' : 'FMCG supplier'} invoices from {sourceName}
            </div>
            <button className="sync-button" onClick={handleSync} style={{
              minWidth: '240px', padding: '12px 32px', fontSize: '14px', fontWeight: 600,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
              border: 'none', borderRadius: '10px', cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
              transition: 'all 0.2s ease',
            }}>
              <span className="sync-button__text">Sync with {sourceName}</span>
            </button>
            <PolicyConfigPanel persona={persona} />
          </div>
        )}

        {syncState === 'syncing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', padding: '28px 0' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'spin 1.5s linear infinite',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round">
                <path d="M21 12a9 9 0 11-6.219-8.56" />
              </svg>
            </div>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
              Syncing {persona === 'hospital' ? 'hospital vendor' : 'kirana supplier'} invoices...
            </div>
            <div style={{ width: '280px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{
                width: `${syncProgress}%`, height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
                borderRadius: '2px', transition: 'width 0.15s ease',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontVariantNumeric: 'tabular-nums' }}>{syncProgress}%</div>
          </div>
        )}

        {syncState === 'synced' && (
          <div className="sync-header-content">
            <div className="sync-status">
              <span className="sync-status__icon" style={{ color: '#22c55e' }}>&#10003;</span>
              <span className="sync-status__text">
                Synced &mdash; {invoices.length} {persona === 'hospital' ? 'pharma' : 'supplier'} invoices loaded
              </span>
            </div>
            <button className="sync-button sync-button--resync" onClick={handleSync}>
              <span className="sync-button__text">Re-sync</span>
            </button>
          </div>
        )}
      </div>

      {/* Invoices List */}
      {syncState === 'synced' && invoices.length > 0 && (
        <div className="invoices-container">
          <div className="invoices-header">
            <div className="invoices-header__title">
              <span>Invoices</span>
              {selectedVendors.length > 0 && (
                <span className="invoices-header__count">{selectedVendors.length} selected ({formatCurrency(selectedAmount)})</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={handleSelectAll}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.7)', padding: '4px 12px', borderRadius: '4px',
                  cursor: 'pointer', fontSize: '12px',
                }}
              >
                {selectedVendors.length === invoices.length ? 'Deselect All' : 'Select All'}
              </button>
              <div className="invoices-header__pagination">
                <span className="pagination-info">Page {currentPage} of {totalPages}</span>
              </div>
            </div>
          </div>

          <div className="invoices-grid">
            {paginatedInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className={`invoice-card ${selectedVendors.includes(invoice.vendorName) ? 'invoice-card--selected' : ''}`}
                onClick={() => handleSelectVendor(invoice.vendorName)}
              >
                <div className="invoice-card__header">
                  <div className="invoice-card__vendor-info">
                    <div className="invoice-card__vendor-name">{invoice.vendorName}</div>
                    <div className="invoice-card__vendor-type" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 600,
                        background: `${getVendorTag(invoice.vendorType).color}20`,
                        color: getVendorTag(invoice.vendorType).color,
                        border: `1px solid ${getVendorTag(invoice.vendorType).color}40`,
                      }}>
                        {getVendorTag(invoice.vendorType).label}
                      </span>
                      {invoice.drugSchedule && (
                        <span style={{
                          padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 700,
                          background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                          border: '1px solid rgba(245,158,11,0.3)',
                        }}>
                          Sch-{invoice.drugSchedule}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`invoice-card__status invoice-card__status--${getStatusColor(invoice.status)}`}>
                    {invoice.status === 'overdue' ? `${getDaysOverdue(invoice.dueDate)}d overdue` : invoice.status}
                  </div>
                </div>

                <div className="invoice-card__content">
                  <div className="invoice-card__row">
                    <span className="invoice-card__label">Invoice #</span>
                    <span className="invoice-card__value">{invoice.invoiceNumber}</span>
                  </div>
                  <div className="invoice-card__row">
                    <span className="invoice-card__label">Amount</span>
                    <span className="invoice-card__value invoice-card__value--large">{formatCurrency(invoice.amount)}</span>
                  </div>
                  <div className="invoice-card__row">
                    <span className="invoice-card__label">Due Date</span>
                    <span className="invoice-card__value">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="invoice-card__row" style={{ cursor: 'pointer' }} onClick={(e) => {
                    e.stopPropagation();
                    setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id);
                  }}>
                    <span className="invoice-card__label">Items</span>
                    <span className="invoice-card__value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {invoice.items} items
                      <span style={{
                        display: 'inline-block', transition: 'transform 0.2s ease',
                        transform: expandedInvoice === invoice.id ? 'rotate(180deg)' : 'rotate(0deg)',
                        fontSize: '10px', color: 'rgba(255,255,255,0.4)',
                      }}>&#9660;</span>
                    </span>
                  </div>
                </div>

                {/* Collapsible Line Items */}
                {expandedInvoice === invoice.id && (
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    maxHeight: '220px', overflowY: 'auto',
                    background: 'rgba(0,0,0,0.15)',
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, background: '#15171e', zIndex: 1 }}>
                          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>#</th>
                          <th style={{ padding: '6px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Item</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Qty</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Rate</th>
                          <th style={{ padding: '6px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.45)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getLineItems(invoice).map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.3)', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</td>
                            <td style={{ padding: '5px 10px', color: 'rgba(255,255,255,0.75)' }}>{item.name}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontVariantNumeric: 'tabular-nums' }}>{item.qty} {item.unit}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.unitPrice)}</td>
                            <td style={{ padding: '5px 10px', textAlign: 'right', color: 'rgba(255,255,255,0.8)', fontFamily: 'monospace', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="invoice-card__footer">
                  <input
                    type="checkbox"
                    className="invoice-card__checkbox"
                    checked={selectedVendors.includes(invoice.vendorName)}
                    onChange={() => handleSelectVendor(invoice.vendorName)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="invoice-card__checkbox-label">Select for payment</span>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="invoices-pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                &larr; Previous
              </button>
              <div className="pagination-indicator">
                <span className="pagination-page-input">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>
              </div>
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Next &rarr;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      {selectedVendors.length > 0 && (
        <div className="orders-footer">
          <div className="orders-footer__info">
            {selectedVendors.length} vendor{selectedVendors.length > 1 ? 's' : ''} selected &mdash; {formatCurrency(selectedAmount)}
          </div>
          <button
            className="orders-footer__generate-btn"
            onClick={handleGenerateLinks}
            disabled={isLoading}
          >
            {isLoading ? 'Starting...' : `Generate Payment Links (${selectedVendors.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
