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

      case 'AGENT_NARRATION':
        get().addChatMessage({
          timestamp: new Date(ts).toLocaleTimeString(),
          text: f('text'),
          level: f('level'),
        });
        break;

      case 'PIPELINE_STEP':
        get().updatePipelineDot({
          vendor_id: f('vendor_id'),
          stage: f('stage'),
          status: mapStatusToDotStatus(f('status')),
        });
        break;

      case 'VENDOR_STATE':
        get().upsertVendor({
          vendor_id: f('vendor_id'),
          name: f('name'),
          amount: f('amount'),
          rail: f('rail'),
          state: f('state'),
          pine_order_id: f('pine_order_id'),
          attempt_number: f('attempt_number'),
        });
        break;

      case 'POLICY_GATE': {
        const gateData = event.payload ?? event;
        set({
          policyGateData: gateData as PolicyGateData,
          agentStatus: 'awaiting_approval',
        });
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
                flag_type: f('flag_type'),
                action_required: f('action_required'),
                details: f('details'),
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

      case 'RUN_SUMMARY': {
        const summaryData = event.payload ?? event;
        const failed = f('failed');
        set({
          runSummary: summaryData as RunSummary,
          agentStatus: failed > 0 ? 'partial' : 'complete',
        });
        break;
      }

      case 'QUERY_RESULT': {
        const queryData = event.payload ?? event;
        set({ queryResult: queryData as QueryResult });
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
      vendors: new Map(),
      pipelineDots: [],
      chatMessages: [],
      rawEvents: [],
      runSummary: null,
      agentStatus: 'idle',
    }),
}));

// Helper function to map pipeline status to dot status
function mapStatusToDotStatus(
  status: 'CREATED' | 'PENDING' | 'PROCESSED' | 'FAILED' | 'CANCELLED' | 'AUTHORIZED'
): 'pending' | 'in_progress' | 'done' | 'failed' {
  switch (status) {
    case 'CREATED':
    case 'PENDING':
      return 'in_progress';
    case 'PROCESSED':
      return 'done';
    case 'FAILED':
    case 'CANCELLED':
      return 'failed';
    case 'AUTHORIZED':
      return 'in_progress';
    default:
      return 'pending';
  }
}
