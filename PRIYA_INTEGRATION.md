# PRIYA Backend Integration Guide

## Overview

The frontend has been integrated with the PRIYA backend APIs and WebSocket events as specified in the backend documentation. The application now supports:

- Real-time WebSocket event streaming
- Policy gate approvals
- Schedule H escalation handling
- Natural language queries
- Audit export functionality
- Full vendor payment tracking

## Architecture

### New Files Added

```
src/
├── types/index.ts                    # TypeScript types for backend contracts
├── hooks/
│   ├── useWebSocket.ts               # WebSocket connection management
│   └── usePriyaApi.ts                # REST API calls
├── store/
│   └── priyaStore.ts                 # Zustand store for state management
├── components/
│   └── PriyaDashboard.tsx            # New PRIYA operational dashboard
├── styles-priya.css                  # Dashboard styling
├── vite-env.d.ts                     # Vite environment types
├── .env.local                        # Environment configuration
└── vite.config.ts                    # Updated with type references
```

## Configuration

### Environment Variables

Set in `.env.local`:

```
VITE_API_BASE=http://localhost:8000
VITE_API_HOST=localhost:8000
```

Adjust the URLs based on your backend deployment:
- Local development: `http://localhost:8000`
- Production: Update with your backend URL

## Usage

### Starting a Run

```typescript
// Using the API hook
const api = usePriyaApi();

const response = await api.startRun(
  'hospital',                              // persona
  'Clear this week invoices',               // instruction
  csvFile                                   // File object
);

const { run_id } = response;
```

### WebSocket Connection

The `useWebSocket` hook automatically connects when a `run_id` is available:

```typescript
useWebSocket(runId, {
  onMessage: (event: WSEvent) => {
    // Handle events: CANVAS_STATE, AGENT_NARRATION, etc.
  },
  onOpen: () => console.log('Connected'),
  onError: (error) => console.error('WS Error:', error),
  onClose: () => console.log('Disconnected'),
});
```

### State Management

The Zustand store handles all state updates from backend events:

```typescript
import { usePriyaStore } from './store/priyaStore';

const store = usePriyaStore();

// Get current state
const runId = store.runId;
const vendors = Array.from(store.vendors.values());
const chatMessages = store.chatMessages;

// Dispatch actions
store.setRunId('run_20250114_001');
store.addChatMessage({ timestamp: '10:23', text: '...', level: 'info' });
store.handleWSEvent(event);  // Central event dispatcher
```

## Event Handling

### Supported Events

The store automatically handles these WebSocket event types:

| Event | Handler | Effect |
|-------|---------|--------|
| `CANVAS_STATE` | Updates canvas view | Switches UI render (workflow, policy_gate, run_board, audit, query_result) |
| `AGENT_NARRATION` | Adds chat message | Streams agent reasoning to chat panel |
| `PIPELINE_STEP` | Updates progress dot | Shows stage completion in pipeline strip |
| `VENDOR_STATE` | Upserts vendor | Updates vendor row with new status/rail |
| `POLICY_GATE` | Shows approval overlay | Sets status to "awaiting_approval" |
| `ESCALATION` | Marks vendor escalated | Shows authorization buttons on vendor row |
| `RAIL_SWITCH` | Updates payment rail | Shows retry with different payment method |
| `RUN_SUMMARY` | Displays audit metrics | Shows paid/deferred/failed counts |
| `QUERY_RESULT` | Shows query response | Renders table/chart/summary based on result type |

### Example: Handling a Policy Gate Event

```typescript
// Backend sends:
{
  type: "POLICY_GATE",
  payload: {
    vendors: [
      {
        vendor_id: "vnd_001",
        name: "Insulin Depot",
        amount: 45000,
        rail: "neft",
        priority_reason: "Critical supply, 2 days overdue",
        action: "pay",
        priority_score: 70
      }
    ],
    total: 144000
  },
  run_id: "run_20250114_001",
  timestamp: "2025-01-14T10:23:45.000Z"
}

// Frontend automatically:
1. Sets canvasState to "policy_gate"
2. Updates policyGateData with vendor list
3. Sets agentStatus to "awaiting_approval"
4. Renders approval overlay
```

## API Methods

### REST Endpoints

All methods are available through `usePriyaApi()`:

```typescript
const api = usePriyaApi();

// Start a payment run
const { run_id } = await api.startRun(persona, instruction, csvFile);

// Approve policy gate
const { approved } = await api.approvePolicyGate(runId);

// Handle escalation decision
const { ok } = await api.escalationDecision(runId, vendorId, 'capture' | 'cancel');

// Submit NL query
const { query_id } = await api.submitQuery(runId, 'Which vendors weren\'t paid?');

// List all runs
const runs = await api.listRuns();

// Get run details
const runData = await api.getRun(runId);

// Export audit CSV
await api.exportAuditCsv(runId);  // Triggers browser download

// Upload CSV file
const { file_path, vendor_count } = await api.uploadCsv(csvFile);
```

## Integration with Existing UI

The existing tab-based interface (Orders, Payments, Settlement, Reconciliation) remains **fully functional** and **unchanged**. The new PRIYA dashboard is a separate component that can be:

1. **Added to a new route** - e.g., `/dashboard`
2. **Toggled between views** - Switch between operational dashboard and historical data tabs
3. **Coexist side-by-side** - Display both interfaces depending on use case

### Example: Adding to App

```typescript
import { PriyaDashboard } from './components/PriyaDashboard';

function App() {
  const [view, setView] = useState<'dashboard' | 'tabs'>('dashboard');

  return (
    <>
      {view === 'dashboard' && <PriyaDashboard />}
      {view === 'tabs' && <ExistingTabInterface />}
    </>
  );
}
```

## Error Handling

All API calls include error handling:

```typescript
try {
  const { run_id } = await api.startRun(persona, instruction, file);
  store.setRunId(run_id);
} catch (error) {
  console.error('Failed to start run:', error);
  // Display error to user
}
```

WebSocket errors are caught and logged:

```typescript
useWebSocket(runId, {
  onError: (error) => {
    console.error('[WS] Error:', error);
    // Automatic reconnection attempt after 3 seconds
  },
});
```

## Type Safety

All events and API responses are fully typed:

```typescript
import type {
  Persona,
  CanvasState,
  AgentStatus,
  VendorRow,
  ChatMessage,
  PolicyGateData,
  QueryResult,
  RunSummary,
  WSEvent,
} from './types';
```

## Performance Considerations

1. **WebSocket Reconnection**: Automatically reconnects after 3 seconds on disconnect
2. **Message Logging**: All WS events stored for audit trail (can be toggled via UI)
3. **State Persistence**: Zustand store persists in memory during session
4. **Event Dispatching**: Central `handleWSEvent` method prevents duplicate handling

## Testing

### Mock Events (for development without backend)

```typescript
const mockEvent: WSEvent = {
  type: 'AGENT_NARRATION',
  payload: {
    text: 'Loaded hospital persona. 6 invoices fetched.',
    level: 'info',
  },
  run_id: 'run_20250114_001',
  timestamp: new Date().toISOString(),
};

store.handleWSEvent(mockEvent);
```

### Monitoring

Check browser console for debug logs:

```
[API] Start run response: { run_id: '...' }
[WS] Connected
[WS] Received: AGENT_NARRATION {...}
[Dashboard] WS Event: POLICY_GATE
```

## Troubleshooting

### WebSocket Connection Issues

**Problem**: WebSocket fails to connect
**Solution**:
- Check backend is running on configured host/port
- Verify CORS is enabled for frontend origin
- Check `.env.local` settings

```
VITE_API_HOST=localhost:8000  # Should match backend server
```

### API Request Failures

**Problem**: "Failed to start run"
**Solution**:
- Verify CSV file format matches backend expectations
- Check API_BASE URL in `.env.local`
- Ensure backend is responding to REST calls

### Type Errors

**Problem**: TypeScript compilation errors
**Solution**:
- Regenerate vite-env.d.ts if environment variables change
- Clear `node_modules` and reinstall: `npm ci`
- Check that all types in `/types/index.ts` match backend spec

## Future Enhancements

1. **Offline Mode**: Cache events for offline replay
2. **Real-time Notifications**: Toast notifications for key events
3. **Export Capabilities**: Export chat history, pipeline screenshots
4. **Analytics**: Track run metrics, success rates, performance
5. **Multi-user**: Support multiple concurrent runs with user tracking

## Support

For questions or issues:
1. Check backend API specification in `/backend/OPENAPI.md`
2. Review event logs in browser DevTools → Console
3. Check `.env.local` configuration
4. Verify backend is running and accessible
