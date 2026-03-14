import { create } from 'zustand';
import type {
  Persona,
  CanvasState,
  AgentStatus,
  VendorRow,
  ChatMessage,
  PipelineDot,
  PolicyGateData,
  QueryResult,
  RunSummary,
  WSEvent,
  LogEntry,
} from '../types';

interface PriyaStore {
  // Session
  runId: string | null;
  persona: Persona;
  agentStatus: AgentStatus;

  // Canvas
  canvasState: CanvasState;
  policyGateData: PolicyGateData | null;
  queryResult: QueryResult | null;

  // Run Board
  vendors: Map<string, VendorRow>;

  // Pipeline Strip
  pipelineDots: PipelineDot[];

  // Chat
  chatMessages: ChatMessage[];

  // Logs
  rawEvents: LogEntry[];
  logsExpanded: boolean;

  // Payment webhook waiting
  paymentAwaitingData: {
    total_payments: number;
    confirmed_count: number;
    failed_count: number;
    pending_count: number;
    elapsed_seconds: number;
    timeout_seconds: number;
    message: string;
  } | null;

  // Audit
  runSummary: RunSummary | null;

  // Actions
  setRunId: (id: string | null) => void;
  setPersona: (p: Persona) => void;
  setCanvasState: (state: CanvasState) => void;
  setAgentStatus: (status: AgentStatus) => void;
  addChatMessage: (message: ChatMessage) => void;
  setPolicyGateData: (data: PolicyGateData | null) => void;
  setQueryResult: (result: QueryResult | null) => void;
  upsertVendor: (vendor: VendorRow) => void;
  getVendor: (vendorId: string) => VendorRow | undefined;
  updatePipelineDot: (dot: PipelineDot) => void;
  addRawEvent: (event: WSEvent) => void;
  toggleLogsExpanded: () => void;
  setRunSummary: (summary: RunSummary | null) => void;
  handleWSEvent: (event: WSEvent) => void;
  reset: () => void;
}

export const usePriyaStore = create<PriyaStore>((set, get) => ({
  // Initial state
  runId: null,
  persona: 'hospital',
  agentStatus: 'idle',
  canvasState: 'workflow',
  policyGateData: null,
  queryResult: null,
  paymentAwaitingData: null,
  vendors: new Map(),
  pipelineDots: [],
  chatMessages: [],
  rawEvents: [],
  logsExpanded: false,
  runSummary: null,

  // Actions
  setRunId: (id) => set({ runId: id }),
  setPersona: (p) => set({ persona: p }),
  setCanvasState: (state) => set({ canvasState: state }),
  setAgentStatus: (status) => set({ agentStatus: status }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),

  setPolicyGateData: (data) => set({ policyGateData: data }),
  setQueryResult: (result) => set({ queryResult: result }),

  upsertVendor: (vendor) =>
    set((state) => {
      const newVendors = new Map(state.vendors);
      newVendors.set(vendor.vendor_id, vendor);
      return { vendors: newVendors };
    }),

  getVendor: (vendorId) => {
    const state = get();
    return state.vendors.get(vendorId);
  },

  updatePipelineDot: (dot) =>
    set((state) => {
      const existingIndex = state.pipelineDots.findIndex(
        (d) => d.vendor_id === dot.vendor_id && d.stage === dot.stage
      );

      if (existingIndex >= 0) {
        const newDots = [...state.pipelineDots];
        newDots[existingIndex] = dot;
        return { pipelineDots: newDots };
      }

      return {
        pipelineDots: [...state.pipelineDots, dot],
      };
    }),

  addRawEvent: (event) =>
    set((state) => {
      const ts = event.timestamp || event.ts || new Date().toISOString();
      return {
        rawEvents: [
          ...state.rawEvents,
          {
            timestamp: new Date(ts).toLocaleTimeString(),
            event,
          },
        ],
      };
    }),

  toggleLogsExpanded: () =>
    set((state) => ({
      logsExpanded: !state.logsExpanded,
    })),

  setRunSummary: (summary) => set({ runSummary: summary }),

  handleWSEvent: (event) => {

    // Always log raw event
    get().addRawEvent(event);

    // Helper: resolve field from payload-wrapped or flat event
    const f = (field: string) => event.payload?.[field] ?? event[field];
    const ts = event.timestamp || event.ts || new Date().toISOString();

    switch (event.type) {
      case 'CANVAS_STATE': {
        const state = f('state');
        if (state) set({ canvasState: state });
        break;
      }

      case 'AGENT_MESSAGE': {
        // Agent thinking / content messages -> show in chat
        let content = f('content') || f('text') || f('message') || '';
        // Truncate very long messages (e.g., tool call dumps) to keep chat readable
        if (content.length > 500) {
          // Extract first meaningful paragraph or line
          const lines = content.split('\n').filter((l: string) => l.trim());
          content = lines.slice(0, 5).join('\n');
          if (lines.length > 5) content += `\n... (${lines.length - 5} more lines)`;
        }
        if (content.trim()) {
          get().addChatMessage({
            timestamp: new Date(ts).toLocaleTimeString(),
            text: content,
            level: 'info',
          });
        }
        break;
      }

      case 'AGENT_NARRATION':
        // Backend uses "message" field, not "text"
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: f('message') || f('text') || '',
          level: f('level') || 'info',
        });
        break;

      case 'PIPELINE_STEP': {
        // Map step names to stage names used by PipelineDot
        const stepName = f('step') || f('stage') || '';
        const stage = mapStepToStage(stepName);
        const rawStatus = f('status') || 'started';
        get().updatePipelineDot({
          vendor_id: f('vendor_id') || 'all',
          stage,
          status: mapPipelineStatus(rawStatus),
        });
        break;
      }

      case 'VENDOR_STATE': {
        // Backend sends either a single vendor or an array of vendors
        const vendorsArr = f('vendors');
        if (Array.isArray(vendorsArr)) {
          vendorsArr.forEach((v: any) => {
            get().upsertVendor({
              vendor_id: v.vendor_id || v.name || `v-${Math.random().toString(36).slice(2, 8)}`,
              name: v.name || v.vendor_id || '',
              amount: v.amount || 0,
              rail: v.rail || v.priority_rail || 'neft',
              state: mapVendorState(v.state || v.action || 'CREATED'),
              pine_order_id: v.pine_order_id,
              payment_link: v.payment_link,
              attempt_number: v.attempt_number || 1,
            });
          });
        } else {
          // Single vendor
          get().upsertVendor({
            vendor_id: f('vendor_id') || f('name'),
            name: f('name') || f('vendor_id') || '',
            amount: f('amount') || 0,
            rail: f('rail') || 'neft',
            state: mapVendorState(f('state') || 'CREATED'),
            pine_order_id: f('pine_order_id'),
            attempt_number: f('attempt_number') || 1,
          });
        }
        break;
      }

      case 'POLICY_GATE': {
        // Backend sends vendors_summary (string) or vendors (array)
        // Parse vendors from ranked_vendors, vendors array, or build from summary
        const payload = event.payload ?? event;
        const vendorsArr = payload.vendors || payload.ranked_vendors;
        let parsedVendors: PolicyGateData['vendors'] = [];
        let total = 0;

        if (Array.isArray(vendorsArr)) {
          parsedVendors = vendorsArr.map((v: any) => ({
            vendor_id: v.vendor_id || v.name,
            name: v.name || v.vendor_id || '',
            amount: v.amount || 0,
            rail: v.rail || v.priority_rail || 'neft',
            priority_reason: v.priority_reason || v.reason || '',
            action: v.action || 'pay',
            priority_score: v.priority_score || v.score || 0,
            items: v.items || 0,
            invoice_number: v.invoice_number || '',
            due_date: v.due_date || '',
            drug_schedule: v.drug_schedule || '',
          }));
          total = parsedVendors.reduce((s, v) => s + v.amount, 0);
        } else {
          // Try to get vendors from existing store vendors
          const existingVendors = Array.from(get().vendors.values());
          if (existingVendors.length > 0) {
            parsedVendors = existingVendors.map(v => ({
              vendor_id: v.vendor_id,
              name: v.name,
              amount: v.amount,
              rail: v.rail,
              priority_reason: '',
              action: 'pay' as const,
              priority_score: 0,
            }));
            total = parsedVendors.reduce((s, v) => s + v.amount, 0);
          }
        }

        // Use backend-provided total if available, otherwise compute from vendors
        const finalTotal = payload.total || total;
        set({
          policyGateData: { vendors: parsedVendors, total: finalTotal },
          agentStatus: 'awaiting_approval',
        });

        // Also add the summary text to chat if available
        const summary = payload.vendors_summary || payload.summary;
        if (summary) {
          get().addChatMessage({
            timestamp: new Date(ts).toLocaleTimeString(),
            text: `Approval needed:\n${summary}`,
            level: 'warn',
          });
        }
        break;
      }

      case 'ESCALATION':
        {
          const vendorId = f('vendor_id');
          const vendor = get().getVendor(vendorId);
          if (vendor) {
            get().upsertVendor({
              ...vendor,
              escalation: {
                flag_type: f('flag_type') || f('type') || 'unknown',
                action_required: f('action_required') !== false,
                details: f('details') || f('message') || '',
              },
            });
          }
          set({ agentStatus: 'escalation' });
        }
        break;

      case 'RAIL_SWITCH':
        {
          const vendorId = f('vendor_id');
          const vendor = get().getVendor(vendorId);
          if (vendor) {
            const history = vendor.rail_history || [];
            get().upsertVendor({
              ...vendor,
              rail: f('to_rail'),
              rail_history: [
                ...history,
                {
                  from_rail: f('from_rail'),
                  to_rail: f('to_rail'),
                  reason: f('reason'),
                },
              ],
            });
          }
        }
        break;

      case 'RUN_COMPLETE':
        set({ agentStatus: 'complete' });
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: 'Run completed successfully!',
          level: 'info',
        });
        break;

      case 'RUN_FAILED':
        set({ agentStatus: 'partial' });
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: `Run failed: ${f('error') || 'unknown error'}`,
          level: 'error',
        });
        break;

      case 'APPROVAL_GRANTED':
        set({ agentStatus: 'running', policyGateData: null });
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: 'Payment plan approved! Executing...',
          level: 'info',
        });
        break;

      case 'RUN_SUMMARY': {
        const summaryData = event.payload ?? event;
        const failed = f('failed');
        set({
          runSummary: summaryData as RunSummary,
          agentStatus: failed > 0 ? 'partial' : 'complete',
        });
        break;
      }

      case 'PAYMENT_AWAITING': {
        const awaitData = event.payload ?? event;
        const pending = awaitData.pending_count ?? 0;
        set({
          paymentAwaitingData: {
            total_payments: awaitData.total_payments || 0,
            confirmed_count: awaitData.confirmed_count || 0,
            failed_count: awaitData.failed_count || 0,
            pending_count: pending,
            elapsed_seconds: awaitData.elapsed_seconds || 0,
            timeout_seconds: awaitData.timeout_seconds || 600,
            message: awaitData.message || '',
          },
        });
        // Clear when all resolved
        if (pending === 0 && (awaitData.confirmed_count || 0) > 0) {
          setTimeout(() => set({ paymentAwaitingData: null }), 2000);
        }
        break;
      }

      case 'QUERY_RESULT': {
        const queryData = event.payload ?? event;
        set({ queryResult: queryData as QueryResult });
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: `Query result: ${(queryData as QueryResult).row_count || 0} rows returned`,
          level: 'info',
        });
        break;
      }

      case 'AGENT_RESULT': {
        // Agent execution completed — show cost/duration
        const durationMs = f('duration_ms') || 0;
        const costUsd = f('total_cost_usd') || 0;
        if (durationMs > 0) {
          get().addChatMessage({
            timestamp: new Date(ts).toLocaleTimeString(),
            text: `Agent finished in ${(durationMs / 1000).toFixed(1)}s (cost: $${costUsd.toFixed(4)})`,
            level: 'info',
          });
        }
        break;
      }

      case 'AGENT_ERROR': {
        const error = f('error') || 'Unknown agent error';
        set({ agentStatus: 'partial' });
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: `Agent error: ${error}`,
          level: 'error',
        });
        break;
      }

      case 'ESCALATION_RESOLVED': {
        const vendorId = f('vendor_id');
        const decision = f('decision');
        const vendor = get().getVendor(vendorId);
        if (vendor) {
          get().upsertVendor({
            ...vendor,
            escalation: undefined,
          });
        }
        set({ agentStatus: 'running' });
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: `Escalation resolved: ${vendorId} — ${decision}`,
          level: 'info',
        });
        break;
      }
    }
  },

  reset: () =>
    set({
      runId: null,
      canvasState: 'workflow',
      policyGateData: null,
      queryResult: null,
      paymentAwaitingData: null,
      vendors: new Map(),
      pipelineDots: [],
      chatMessages: [],
      rawEvents: [],
      runSummary: null,
      agentStatus: 'idle',
    }),
}));

// Map step names from backend (LOAD, SCORE, APPROVE, etc.) to stage names used by PipelineDot
function mapStepToStage(step: string): 'order' | 'pay' | 'settle' | 'recon' {
  const s = step.toUpperCase();
  if (s === 'LOAD' || s === 'SCORE' || s === 'APPROVE' || s === 'ORDER' || s === 'AUTH') return 'order';
  if (s === 'PAY' || s === 'PAYMENT' || s === 'EXECUTE' || s === 'RETRY') return 'pay';
  if (s === 'SETTLE' || s === 'SETTLEMENT') return 'settle';
  if (s === 'RECON' || s === 'RECONCILE' || s === 'RECONCILIATION') return 'recon';
  return 'order';
}

// Map pipeline status strings to dot status
function mapPipelineStatus(status: string): 'pending' | 'in_progress' | 'done' | 'failed' {
  const s = status.toLowerCase();
  if (s === 'complete' || s === 'completed' || s === 'done' || s === 'processed') return 'done';
  if (s === 'started' || s === 'in_progress' || s === 'pending' || s === 'created' || s === 'authorized') return 'in_progress';
  if (s === 'failed' || s === 'cancelled' || s === 'error') return 'failed';
  return 'pending';
}

// Map vendor state strings from backend to VendorState type
function mapVendorState(state: string): 'CREATED' | 'PENDING' | 'AUTHORIZED' | 'PROCESSED' | 'FAILED' | 'CANCELLED' {
  const s = state.toUpperCase();
  if (s === 'PROCESSED' || s === 'DONE' || s === 'COMPLETE') return 'PROCESSED';
  if (s === 'PENDING' || s === 'QUEUED' || s === 'AWAITING_PAYMENT') return 'PENDING';
  if (s === 'AUTHORIZED' || s === 'AUTH') return 'AUTHORIZED';
  if (s === 'FAILED' || s === 'ERROR') return 'FAILED';
  if (s === 'CANCELLED') return 'CANCELLED';
  // scored, escalate, pay, defer etc. map to CREATED (pre-processing)
  return 'CREATED';
}
