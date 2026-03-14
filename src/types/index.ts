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

// ======================== PRIYA Backend Types ========================

// Personas
export type Persona = 'hospital' | 'kirana';

// Canvas States
export type CanvasState = 'workflow' | 'policy_gate' | 'run_board' | 'audit' | 'query_result';

// Agent Status
export type AgentStatus = 'idle' | 'running' | 'awaiting_approval' | 'escalation' | 'complete' | 'partial';

// Vendor States
export type VendorState = 'CREATED' | 'PENDING' | 'AUTHORIZED' | 'PROCESSED' | 'FAILED' | 'CANCELLED';

// Payment Rails
export type PaymentRail = 'neft' | 'rtgs' | 'imps' | 'upi' | 'upi_intent' | 'hosted_checkout' | 'payment_link';

// Vendor in Run Board
export interface VendorRow {
  vendor_id: string;
  name: string;
  amount: number;
  rail: PaymentRail;
  state: VendorState;
  pine_order_id?: string;
  attempt_number: number;
  escalation?: {
    flag_type: string;
    action_required: boolean;
    details: string;
  };
  rail_history?: Array<{
    from_rail: PaymentRail;
    to_rail: PaymentRail;
    reason: string;
  }>;
}

// Chat Message
export interface ChatMessage {
  timestamp: string;
  text: string;
  level: 'info' | 'warn' | 'error';
}

// Pipeline Dot
export interface PipelineDot {
  vendor_id: string;
  stage: 'order' | 'pay' | 'settle' | 'recon';
  status: 'pending' | 'in_progress' | 'done' | 'failed';
}

// Policy Gate Data
export interface PolicyGateData {
  vendors: Array<{
    vendor_id: string;
    name: string;
    amount: number;
    rail: PaymentRail;
    priority_reason: string;
    action: 'pay' | 'defer' | 'escalate' | 'queue';
    priority_score: number;
  }>;
  total: number;
}

// Query Result
export interface QueryResult {
  query_nl: string;
  sql: string;
  columns: string[];
  rows: any[][];
  row_count: number;
  render_as: 'table' | 'bar_chart' | 'summary_card';
}

// Run Summary
export interface RunSummary {
  paid: number;
  deferred: number;
  failed: number;
  float_saved: number;
  total: number;
  vendors_processed: number;
}

// Run Info
export interface RunInfo {
  run_id: string;
  persona: Persona;
  status: 'started' | 'running' | 'complete' | 'failed';
  instruction: string;
  total_vendors: number;
  total_amount: number;
  paid_amount: number;
  started_at: string;
}

// WebSocket Event (generic)
export interface WSEvent {
  type: string;
  payload: Record<string, any>;
  run_id: string;
  timestamp: string;
}

// Raw Log Entry
export interface LogEntry {
  timestamp: string;
  event: WSEvent;
}
