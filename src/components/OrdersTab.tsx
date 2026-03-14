import { useState } from 'react';

export interface Invoice {
  id: string;
  vendorName: string;
  vendorType: 'pharma' | 'company';
  amount: number;
  dueDate: string;
  invoiceDate: string;
  invoiceNumber: string;
  status: 'pending' | 'partial' | 'overdue';
  items: number;
  notes?: string;
}

interface OrdersTabProps {
  invoices: Invoice[];
  onGeneratePaymentLinks: (selectedVendors: string[]) => void;
  isLoading?: boolean;
}

const KHATABOOK_INVOICES: Invoice[] = [
  {
    id: '1',
    vendorName: 'Ranbaxy Laboratories',
    vendorType: 'company',
    amount: 250000,
    dueDate: '2026-03-25',
    invoiceDate: '2026-03-01',
    invoiceNumber: 'RX-2026-001',
    status: 'pending',
    items: 15
  },
  {
    id: '2',
    vendorName: 'Mankind Pharma',
    vendorType: 'company',
    amount: 180000,
    dueDate: '2026-03-28',
    invoiceDate: '2026-03-05',
    invoiceNumber: 'MK-2026-042',
    status: 'pending',
    items: 12
  },
  {
    id: '3',
    vendorName: 'Sun Pharmaceutical',
    vendorType: 'company',
    amount: 320000,
    dueDate: '2026-03-20',
    invoiceDate: '2026-02-20',
    invoiceNumber: 'SUN-2026-108',
    status: 'overdue',
    items: 8
  },
  {
    id: '4',
    vendorName: 'Apollo Pharmacy',
    vendorType: 'pharma',
    amount: 95000,
    dueDate: '2026-03-22',
    invoiceDate: '2026-03-08',
    invoiceNumber: 'APL-2026-015',
    status: 'pending',
    items: 20
  },
  {
    id: '5',
    vendorName: 'Medicare Pharmacy',
    vendorType: 'pharma',
    amount: 67500,
    dueDate: '2026-03-26',
    invoiceDate: '2026-03-10',
    invoiceNumber: 'MED-2026-089',
    status: 'pending',
    items: 14
  },
  {
    id: '6',
    vendorName: 'PharmEasy',
    vendorType: 'pharma',
    amount: 125000,
    dueDate: '2026-03-18',
    invoiceDate: '2026-02-18',
    invoiceNumber: 'PE-2026-267',
    status: 'overdue',
    items: 25
  },
  {
    id: '7',
    vendorName: 'Cipla Ltd',
    vendorType: 'company',
    amount: 210000,
    dueDate: '2026-03-23',
    invoiceDate: '2026-03-03',
    invoiceNumber: 'CIP-2026-056',
    status: 'pending',
    items: 18
  },
  {
    id: '8',
    vendorName: 'Dr. Reddy\'s Labs',
    vendorType: 'company',
    amount: 295000,
    dueDate: '2026-03-29',
    invoiceDate: '2026-03-07',
    invoiceNumber: 'DRL-2026-134',
    status: 'pending',
    items: 11
  },
  {
    id: '9',
    vendorName: 'Lupin Pharma',
    vendorType: 'company',
    amount: 215000,
    dueDate: '2026-03-24',
    invoiceDate: '2026-02-28',
    invoiceNumber: 'LUP-2026-073',
    status: 'overdue',
    items: 16
  },
  {
    id: '10',
    vendorName: 'NetMeds',
    vendorType: 'pharma',
    amount: 89000,
    dueDate: '2026-03-30',
    invoiceDate: '2026-03-12',
    invoiceNumber: 'NM-2026-156',
    status: 'pending',
    items: 22
  },
  {
    id: '11',
    vendorName: 'Aurobindo Pharma',
    vendorType: 'company',
    amount: 275000,
    dueDate: '2026-03-27',
    invoiceDate: '2026-03-02',
    invoiceNumber: 'AUR-2026-089',
    status: 'partial',
    items: 13
  },
  {
    id: '12',
    vendorName: 'Medlife',
    vendorType: 'pharma',
    amount: 112000,
    dueDate: '2026-03-21',
    invoiceDate: '2026-02-21',
    invoiceNumber: 'ML-2026-234',
    status: 'overdue',
    items: 19
  },
  {
    id: '13',
    vendorName: 'Glaxo Smithkline',
    vendorType: 'company',
    amount: 340000,
    dueDate: '2026-03-31',
    invoiceDate: '2026-03-06',
    invoiceNumber: 'GSK-2026-045',
    status: 'pending',
    items: 9
  },
  {
    id: '14',
    vendorName: '1mg Pharmacy',
    vendorType: 'pharma',
    amount: 78500,
    dueDate: '2026-03-24',
    invoiceDate: '2026-03-09',
    invoiceNumber: '1MG-2026-198',
    status: 'pending',
    items: 17
  },
  {
    id: '15',
    vendorName: 'Alembic Pharma',
    vendorType: 'company',
    amount: 168000,
    dueDate: '2026-03-19',
    invoiceDate: '2026-02-22',
    invoiceNumber: 'ALB-2026-067',
    status: 'overdue',
    items: 10
  },
  {
    id: '16',
    vendorName: 'Care Pharmacy',
    vendorType: 'pharma',
    amount: 98000,
    dueDate: '2026-03-28',
    invoiceDate: '2026-03-11',
    invoiceNumber: 'CARE-2026-312',
    status: 'pending',
    items: 23
  },
  {
    id: '17',
    vendorName: 'Torrent Pharma',
    vendorType: 'company',
    amount: 238000,
    dueDate: '2026-03-26',
    invoiceDate: '2026-03-04',
    invoiceNumber: 'TOR-2026-091',
    status: 'pending',
    items: 14
  },
  {
    id: '18',
    vendorName: 'Healthkart',
    vendorType: 'pharma',
    amount: 145000,
    dueDate: '2026-03-22',
    invoiceDate: '2026-02-25',
    invoiceNumber: 'HK-2026-501',
    status: 'overdue',
    items: 28
  },
  {
    id: '19',
    vendorName: 'Divi\'s Laboratories',
    vendorType: 'company',
    amount: 285000,
    dueDate: '2026-03-30',
    invoiceDate: '2026-03-08',
    invoiceNumber: 'DIVI-2026-102',
    status: 'pending',
    items: 7
  },
  {
    id: '20',
    vendorName: 'Wellness Forever',
    vendorType: 'pharma',
    amount: 156000,
    dueDate: '2026-03-25',
    invoiceDate: '2026-02-28',
    invoiceNumber: 'WF-2026-445',
    status: 'overdue',
    items: 31
  }
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function getStatusColor(status: string): 'pending' | 'partial' | 'overdue' {
  return status as 'pending' | 'partial' | 'overdue';
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
  const today = new Date();
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
}

export function OrdersTab({ invoices: initialInvoices = [], onGeneratePaymentLinks, isLoading }: OrdersTabProps) {
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [currentPage, setCurrentPage] = useState(1);
  const [isSynced, setIsSynced] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const handleSync = async () => {
    // Simulate sync loading
    setIsSynced(false);
    await new Promise((resolve) => setTimeout(resolve, 800));
    setInvoices(KHATABOOK_INVOICES);
    setIsSynced(true);
    setCurrentPage(1);
  };

  const handleSelectVendor = (vendorName: string) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorName) ? prev.filter((v) => v !== vendorName) : [...prev, vendorName]
    );
  };

  const handleGenerateLinks = () => {
    if (selectedVendors.length > 0) {
      onGeneratePaymentLinks(selectedVendors);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = invoices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;
  const pendingCount = invoices.filter((inv) => inv.status === 'pending').length;

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
          <div className="summary-stat-card__label">Pending Payment</div>
          <div className="summary-stat-card__value">{pendingCount}</div>
        </div>
      </div>

      {/* Sync Button - Always Shown */}
      <div className="orders-header">
        {isSynced ? (
          <div className="sync-header-content">
            <div className="sync-status">
              <span className="sync-status__icon">✓</span>
              <span className="sync-status__text">Synced - {invoices.length} invoices loaded</span>
            </div>
            <button className="sync-button sync-button--resync" onClick={handleSync}>
              <span className="sync-button__text">Sync</span>
            </button>
          </div>
        ) : (
          <button className="sync-button" onClick={handleSync}>
            <span className="sync-button__text">Sync with Khatabook</span>
          </button>
        )}
      </div>

      {/* Invoices List */}
      {isSynced && invoices.length > 0 && (
        <div className="invoices-container">
          <div className="invoices-header">
            <div className="invoices-header__title">
              <span>Invoices</span>
              {selectedVendors.length > 0 && (
                <span className="invoices-header__count">{selectedVendors.length} selected</span>
              )}
            </div>
            <div className="invoices-header__pagination">
              <span className="pagination-info">
                Page {currentPage} of {totalPages}
              </span>
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
                  <div className="invoice-card__vendor-type">
                    {invoice.vendorType === 'pharma' ? '💊 Pharmacy' : '🏢 Pharmaceutical'}
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
                  <span className="invoice-card__value invoice-card__value--large">
                    {formatCurrency(invoice.amount)}
                  </span>
                </div>
                <div className="invoice-card__row">
                  <span className="invoice-card__label">Due Date</span>
                  <span className="invoice-card__value">{new Date(invoice.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="invoice-card__row">
                  <span className="invoice-card__label">Items</span>
                  <span className="invoice-card__value">{invoice.items} items</span>
                </div>
              </div>

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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="invoices-pagination">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                ← Previous
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
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generate Button */}
      {selectedVendors.length > 0 && (
        <div className="orders-footer">
          <div className="orders-footer__info">
            {selectedVendors.length} vendor{selectedVendors.length > 1 ? 's' : ''} selected for payment
          </div>
          <button
            className="orders-footer__generate-btn"
            onClick={handleGenerateLinks}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : `Generate Payment Links (${selectedVendors.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
