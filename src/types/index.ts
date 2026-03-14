export type PineLabsTransaction = {
  order_id: string;
  utr: string;
  hospital_id: string;
  hospital_name: string;
  patient_id: string;
  invoice_id: string;
  payment_date: string;
  expected_settlement_date: string;
  amount: number;
  status: string;
  rail: string;
  fee_amount: number;
  net_amount: number;
};

export type BankTransaction = {
  bank_txn_id: string;
  utr: string;
  hospital_id: string;
  hospital_name: string;
  credit_date: string;
  amount_credited: number;
  narration: string;
  settlement_reference: string;
};

export type ReconciliationRow = {
  orderId: string;
  utr: string;
  hospitalId: string;
  hospitalName: string;
  pineLabsAmount: number;
  bankAmount: number;
  variance: number;
  variancePercent: number;
  expectedSettlementDate: string;
  actualCreditDate: string | null;
  status: 'reconciled' | 'unreconciled' | 'delayed' | 'high-risk';
  rail: string;
};

export type DashboardMetrics = {
  totalTransactions: number;
  reconciledCount: number;
  unreconciledCount: number;
  delayedCount: number;
  highRiskCount: number;
  reconciledPercent: number;
  unreconciledPercent: number;
  delayedPercent: number;
  totalPineLabsVolume: number;
  totalBankVolume: number;
};
