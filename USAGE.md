# How to Use the PRIYA Dashboard

## Quick Start

### Import the Component

```typescript
import { PriyaDashboard } from './components/PriyaDashboard';

function App() {
  return <PriyaDashboard />;
}
```

### That's it! The component is self-contained and handles:
- ✅ WebSocket connections
- ✅ API calls
- ✅ State management
- ✅ Error handling
- ✅ UI rendering

## Workflow

### 1. Start a Payment Run

1. Select **Persona**: Hospital or Kirana
2. **Upload CSV** with vendor/invoice data
3. **Enter Instruction**: e.g., "Clear this week invoices"
4. Click **Start Run**

The system connects to WebSocket and streams events.

### 2. Policy Gate (Approval)

When PRIYA finishes prioritizing vendors:

1. **Review vendor list** with amounts, rails, priority scores
2. **Check priorities**: Why is each vendor being paid?
3. Click **Approve Run** to proceed

The system begins executing payments.

### 3. Payment Run Board

As payments process, watch real-time updates:

- **● Green dots**: Payments completed successfully
- **◐ Blue dots**: Processing in progress
- **✕ Red dots**: Payment failed
- **⚠ Amber rows**: Schedule H (requires approval)

#### Schedule H Escalation (Restricted Drugs)

For vendors flagged with Schedule H:
1. Row pulses red
2. Two buttons appear: **[Authorize]** or **[Reject]**
3. Click to approve drug release or block transaction
4. Status updates in real-time

### 4. Reconciliation & Audit

After all payments complete:

1. **Summary cards** show:
   - Paid count (green)
   - Deferred count (blue)
   - Failed count (red)
   - Float saved amount (for Kirana)

2. **Click "Export CSV"** to download full audit trail with:
   - Vendor names and amounts
   - Payment methods used
   - UTR numbers and settlement dates
   - MDR charges and variance analysis
   - Agent reasoning notes

### 5. Natural Language Queries

At any time, type questions in the chat input:

```
"Which vendors weren't paid?"
"Total fees paid last month?"
"Show me failed payments"
"Variance analysis by rail"
```

Results render as:
- **Table** - Tabular data
- **Bar Chart** - Comparative metrics
- **Summary Card** - Single value with context

## State Indicators

### Agent Status Pill (Top Right)

| Status | Meaning |
|--------|---------|
| **Running...** (blue pulsing) | Agent actively processing |
| **Awaiting Approval** (amber pulsing) | Policy gate pending your action |
| **Escalation** (red pulsing) | Schedule H decision needed |
| **Complete** (green) | Run finished successfully |
| **Partial** (yellow) | Run finished with some failures |

### Vendor Row States

| Status | Color | Meaning |
|--------|-------|---------|
| CREATED | Grey | Just created, not yet processed |
| PENDING | Blue pulsing | In progress |
| AUTHORIZED | Yellow pulsing | Approved for payment, awaiting capture |
| PROCESSED | Green + ✓ | Payment completed successfully |
| FAILED | Red + ✕ | Payment failed (may retry on different rail) |
| CANCELLED | Grey + ✕ | Rejected or cancelled by user |

### Rail Column

Shows payment method used:
- **NEFT** - Bank transfer (2-4 hours)
- **RTGS** - Real-time gross settlement
- **IMPS** - Instant payment (30 mins)
- **UPI** - Mobile payment (instant)
- **UPI Intent** - Mobile via app (fallback)

When NEFT fails, auto-retries with `~~NEFT~~ → UPI Intent`

## Chat Panel

### Message Levels

```
[10:23] Loaded hospital persona. 6 invoices fetched.              [info]
[10:24] ⚠ MedChem Pharma — Schedule H. Pre-auth=true.             [warn]
[10:25] ✕ Surgical Supplies — NEFT FAILED. Switching rails.       [error]
```

- **info** (white) - General updates
- **warn** (amber) - Important but non-blocking
- **error** (red) - Failures or critical issues

### View Raw Events

Click **"Show Logs"** to see WebSocket events:

```
[10:24:30] PIPELINE_STEP { stage: "order", vendor_id: "...", status: "CREATED" }
[10:24:31] VENDOR_STATE { vendor_id: "...", state: "CREATED", rail: "neft", ... }
[10:24:35] PIPELINE_STEP { stage: "pay", vendor_id: "...", status: "PROCESSED" }
```

Useful for debugging or auditing system behavior.

## Error Handling

### "Failed to start run"

- Check CSV file has required columns
- Ensure file is less than 10MB
- Verify backend is running on `http://localhost:8000`

### WebSocket Connection Errors

- System auto-reconnects every 3 seconds
- Check browser console for connection URL
- Verify backend WebSocket is enabled
- Check `.env.local` configuration

### API Failures

- 400: Invalid request (check parameters)
- 401: Unauthorized (check authentication)
- 500: Server error (check backend logs)
- Network: Backend unreachable (restart backend)

## Tips & Tricks

### Multiple Runs

1. Each run gets unique `run_id` (e.g., `run_20250114_001`)
2. You can start new runs one after another
3. Each run is independent with separate WebSocket
4. View run history: Click run ID or switch persona

### Export Workflow

1. Run completes → Audit dashboard visible
2. Click **"Export CSV"** button
3. Browser downloads `audit_run_20250114_001.csv`
4. Import into Excel, Sheets, or accounting software
5. Share with CA for compliance review

### Schedule H Best Practices

1. Pre-configure allowed Schedule H drugs in hospital system
2. When escalation appears, **quickly review** vendor
3. Compare with hospital authorization records
4. Authorize if pre-approved, Reject if not in system
5. System resumes payment on decision

### Float Optimization (Kirana)

For Kirana persona with credit terms:
1. System automatically defers low-priority suppliers
2. Watch "Float Saved" metric in audit
3. Deferred vendors can be paid later manually
4. Reduces daily cash requirement

### Query Examples

```
"How much did we pay NEFT vs UPI?"
"Which vendors need reconciliation?"
"Show MDR breakdown"
"List all escalated vendors"
"What was the highest variance?"
"Total failed payment attempts"
```

## Performance Notes

- Dashboard updates in real-time as events arrive
- Chat scrolls automatically to newest message
- Vendor table renders 6-20 vendors smoothly
- Export files are compressed (~100KB typical)
- WebSocket reconnect is invisible to user

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit query or instruction |
| `Shift+Enter` | Multiline query (if not capturing) |
| `Esc` | Clear error message |

## Troubleshooting

### Dashboard looks blank

- Check browser DevTools (F12) for errors
- Verify `VITE_API_BASE` in `.env.local`
- Ensure backend server is running
- Try hard refresh (Cmd+Shift+R on Mac)

### Can't see WebSocket messages

- Open DevTools → Network → WS tab
- Look for `ws://localhost:8000/ws/run_...`
- If not connected, check error message in Console
- If connecting but no messages, backend may not be sending events

### Chat panel not scrolling

- This is auto-scrolling to newest message
- If stuck at old message, click in chat area
- Should jump to bottom

### Export button doesn't work

- Backend may not have permissions to create files
- Check `/tmp` or backend download directory
- Try browser console (F12) → Download logs

### Performance degradation

- Very long runs (1000+ vendors) may be slow
- Try clearing logs: Click **Hide Logs** button
- Close unnecessary browser tabs
- Restart dev server if it crashes

## Advanced Usage

### Integrate with Existing App

```typescript
import { PriyaDashboard } from './components/PriyaDashboard';
import { TabNavigation, OrdersTab } from './components';

function AppWithToggle() {
  const [view, setView] = useState<'dashboard' | 'historical'>('dashboard');

  return (
    <>
      <nav>
        <button onClick={() => setView('dashboard')}>Operational</button>
        <button onClick={() => setView('historical')}>Historical</button>
      </nav>
      {view === 'dashboard' && <PriyaDashboard />}
      {view === 'historical' && (
        <>
          <TabNavigation />
          <OrdersTab />
        </>
      )}
    </>
  );
}
```

### Custom Event Handling

```typescript
import { usePriyaStore } from './store/priyaStore';

function CustomMonitor() {
  const { handleWSEvent, runId, chatMessages } = usePriyaStore();

  // Can access store in custom component
  useEffect(() => {
    console.log(`Current run: ${runId}`);
    console.log(`Messages so far: ${chatMessages.length}`);
  }, [runId, chatMessages]);

  return <div>Monitoring run {runId}</div>;
}
```

### Accessing Store Directly

```typescript
import { usePriyaStore } from './store/priyaStore';

const store = usePriyaStore();
console.log('Run ID:', store.runId);
console.log('Status:', store.agentStatus);
console.log('Vendor count:', store.vendors.size);
console.log('Chat messages:', store.chatMessages.length);
```

## Support & Questions

1. **Check Logs**: Open DevTools → Console
2. **Read Docs**: See `PRIYA_INTEGRATION.md` for technical details
3. **Review Types**: Check `src/types/index.ts` for data structures
4. **Monitor Events**: Use Logs panel to see raw WebSocket events
5. **Backend Logs**: Check backend server logs for errors

---

**Happy automating! PRIYA turns vendor payments into a single sentence.** 🚀
