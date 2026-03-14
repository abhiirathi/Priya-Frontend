import { useState } from 'react';

export interface Settlement {
  id: string;
  vendorName: string;
  vendorType: 'pharma' | 'company';
  transactionId: string;
  amount: number;
  settlementDate: string;
  status: 'settled' | 'pending' | 'failed';
  paymentMethod: 'neft' | 'rtgs' | 'imps' | 'upi';
  bankAccount: string;
  remarks?: string;
}

interface SettlementTabProps {
  selectedVendors?: string[];
}

const SETTLEMENT_DATA: Settlement[] = [
  {
    id: '1',
    vendorName: 'Ranbaxy Laboratories',
    vendorType: 'company',
    transactionId: 'TXN-2026-001',
    amount: 250000,
    settlementDate: '2026-03-10',
    status: 'settled',
    paymentMethod: 'neft',
    bankAccount: 'HDFC...8901',
    remarks: 'Settled successfully'
  },
  {
    id: '2',
    vendorName: 'Mankind Pharma',
    vendorType: 'company',
    transactionId: 'TXN-2026-002',
    amount: 180000,
    settlementDate: '2026-03-11',
    status: 'settled',
    paymentMethod: 'rtgs',
    bankAccount: 'ICIC...4567',
    remarks: 'Settled successfully'
  },
  {
    id: '3',
    vendorName: 'Sun Pharmaceutical',
    vendorType: 'company',
    transactionId: 'TXN-2026-003',
    amount: 320000,
    settlementDate: '2026-03-12',
    status: 'settled',
    paymentMethod: 'neft',
    bankAccount: 'AXIS...2234',
    remarks: 'Settled successfully'
  },
  {
    id: '4',
    vendorName: 'Apollo Pharmacy',
    vendorType: 'pharma',
    transactionId: 'TXN-2026-004',
    amount: 95000,
    settlementDate: '2026-03-13',
    status: 'pending',
    paymentMethod: 'imps',
    bankAccount: 'KOTAK...5678',
    remarks: 'In processing'
  },
  {
    id: '5',
    vendorName: 'Medicare Pharmacy',
    vendorType: 'pharma',
    transactionId: 'TXN-2026-005',
    amount: 67500,
    settlementDate: '2026-03-14',
    status: 'settled',
    paymentMethod: 'upi',
    bankAccount: 'PayTM...9876',
    remarks: 'Settled successfully'
  },
  {
    id: '6',
    vendorName: 'PharmEasy',
    vendorType: 'pharma',
    transactionId: 'TXN-2026-006',
    amount: 125000,
    settlementDate: '2026-03-15',
    status: 'failed',
    paymentMethod: 'neft',
    bankAccount: 'HDFC...1122',
    remarks: 'Account mismatch - retry pending'
  },
  {
    id: '7',
    vendorName: 'Cipla Ltd',
    vendorType: 'company',
    transactionId: 'TXN-2026-007',
    amount: 210000,
    settlementDate: '2026-03-16',
    status: 'settled',
    paymentMethod: 'rtgs',
    bankAccount: 'ICIC...3344',
    remarks: 'Settled successfully'
  },
  {
    id: '8',
    vendorName: 'Dr. Reddy\'s Labs',
    vendorType: 'company',
    transactionId: 'TXN-2026-008',
    amount: 295000,
    settlementDate: '2026-03-17',
    status: 'settled',
    paymentMethod: 'neft',
    bankAccount: 'AXIS...5566',
    remarks: 'Settled successfully'
  },
  {
    id: '9',
    vendorName: 'Lupin Pharma',
    vendorType: 'company',
    transactionId: 'TXN-2026-009',
    amount: 215000,
    settlementDate: '2026-03-18',
    status: 'pending',
    paymentMethod: 'imps',
    bankAccount: 'KOTAK...7788',
    remarks: 'Awaiting verification'
  },
  {
    id: '10',
    vendorName: 'NetMeds',
    vendorType: 'pharma',
    transactionId: 'TXN-2026-010',
    amount: 89000,
    settlementDate: '2026-03-19',
    status: 'settled',
    paymentMethod: 'upi',
    bankAccount: 'GooglePay...99',
    remarks: 'Settled successfully'
  },
  {
    id: '11',
    vendorName: 'Aurobindo Pharma',
    vendorType: 'company',
    transactionId: 'TXN-2026-011',
    amount: 275000,
    settlementDate: '2026-03-20',
    status: 'settled',
    paymentMethod: 'neft',
    bankAccount: 'HDFC...6677',
    remarks: 'Settled successfully'
  },
  {
    id: '12',
    vendorName: 'Medlife',
    vendorType: 'pharma',
    transactionId: 'TXN-2026-012',
    amount: 112000,
    settlementDate: '2026-03-21',
    status: 'settled',
    paymentMethod: 'rtgs',
    bankAccount: 'ICIC...8899',
    remarks: 'Settled successfully'
  }
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'settled':
      return 'settled';
    case 'pending':
      return 'pending';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN');
}

export function SettlementTab({ selectedVendors = [] }: SettlementTabProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Filter settlements by selected vendors if provided
  const filteredSettlements = selectedVendors.length > 0
    ? SETTLEMENT_DATA.filter((s) => selectedVendors.includes(s.vendorName))
    : SETTLEMENT_DATA;

  const totalPages = Math.ceil(filteredSettlements.length / ITEMS_PER_PAGE);
  const paginatedSettlements = filteredSettlements.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const settledAmount = filteredSettlements
    .filter((s) => s.status === 'settled')
    .reduce((sum, s) => sum + s.amount, 0);

  const pendingAmount = filteredSettlements
    .filter((s) => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);

  const failedAmount = filteredSettlements
    .filter((s) => s.status === 'failed')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalAmount = filteredSettlements.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="settlement-tab">
      {/* Summary Stats */}
      <div className="settlement-summary">
        <div className="settlement-stat-card">
          <div className="settlement-stat-card__label">Total Amount</div>
          <div className="settlement-stat-card__value">{formatCurrency(totalAmount)}</div>
        </div>
        <div className="settlement-stat-card settlement-stat-card--success">
          <div className="settlement-stat-card__label">Settled</div>
          <div className="settlement-stat-card__value">{formatCurrency(settledAmount)}</div>
        </div>
        <div className="settlement-stat-card settlement-stat-card--warning">
          <div className="settlement-stat-card__label">Pending</div>
          <div className="settlement-stat-card__value">{formatCurrency(pendingAmount)}</div>
        </div>
        <div className="settlement-stat-card settlement-stat-card--error">
          <div className="settlement-stat-card__label">Failed</div>
          <div className="settlement-stat-card__value">{formatCurrency(failedAmount)}</div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="settlement-table-container">
        <div className="settlement-table-header">
          <h2 className="settlement-table-header__title">Settlement Records</h2>
          <div className="settlement-pagination-info">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        <div className="settlement-table">
          <div className="settlement-table__header-row">
            <div className="settlement-table__header-cell settlement-table__header-cell--vendor">Vendor</div>
            <div className="settlement-table__header-cell settlement-table__header-cell--transaction">Transaction ID</div>
            <div className="settlement-table__header-cell settlement-table__header-cell--amount">Amount</div>
            <div className="settlement-table__header-cell settlement-table__header-cell--date">Settlement Date</div>
            <div className="settlement-table__header-cell settlement-table__header-cell--status">Status</div>
            <div className="settlement-table__header-cell settlement-table__header-cell--method">Method</div>
            <div className="settlement-table__header-cell settlement-table__header-cell--account">Account</div>
            <div className="settlement-table__header-cell settlement-table__header-cell--remarks">Remarks</div>
          </div>

          {paginatedSettlements.map((settlement) => (
            <div key={settlement.id} className="settlement-table__row">
              <div className="settlement-table__cell settlement-table__cell--vendor">
                <div className="settlement-vendor-info">
                  <div className="settlement-vendor-name">{settlement.vendorName}</div>
                  <div className="settlement-vendor-type">
                    {settlement.vendorType === 'pharma' ? '💊 Pharmacy' : '🏢 Pharma'}
                  </div>
                </div>
              </div>
              <div className="settlement-table__cell settlement-table__cell--transaction">
                <span className="settlement-txn-id">{settlement.transactionId}</span>
              </div>
              <div className="settlement-table__cell settlement-table__cell--amount">
                <span className="settlement-amount">{formatCurrency(settlement.amount)}</span>
              </div>
              <div className="settlement-table__cell settlement-table__cell--date">
                {formatDate(settlement.settlementDate)}
              </div>
              <div className="settlement-table__cell settlement-table__cell--status">
                <span className={`settlement-status settlement-status--${getStatusColor(settlement.status)}`}>
                  {settlement.status === 'settled' && '✓ Settled'}
                  {settlement.status === 'pending' && '⏳ Pending'}
                  {settlement.status === 'failed' && '✕ Failed'}
                </span>
              </div>
              <div className="settlement-table__cell settlement-table__cell--method">
                <span className="settlement-method">{settlement.paymentMethod.toUpperCase()}</span>
              </div>
              <div className="settlement-table__cell settlement-table__cell--account">
                <span className="settlement-account">{settlement.bankAccount}</span>
              </div>
              <div className="settlement-table__cell settlement-table__cell--remarks">
                <span className="settlement-remarks">{settlement.remarks || '-'}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="settlement-pagination">
            <button
              className="settlement-pagination__btn"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              ← Previous
            </button>
            <div className="settlement-pagination__info">
              <span>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>
            </div>
            <button
              className="settlement-pagination__btn"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
