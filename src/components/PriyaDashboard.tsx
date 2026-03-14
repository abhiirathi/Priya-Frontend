import { useState } from 'react';
import { usePriyaApi } from '../hooks/usePriyaApi';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePriyaStore } from '../store/priyaStore';
import { ReconciliationDashboard } from './ReconciliationDashboard';
import type { Persona, WSEvent } from '../types';

export function PriyaDashboard() {
  const api = usePriyaApi();
  const store = usePriyaStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [instruction, setInstruction] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WebSocket connection
  useWebSocket(store.runId, {
    onMessage: (event: WSEvent) => {
      console.log('[Dashboard] WS Event:', event.type);
      store.handleWSEvent(event);
    },
    onError: (error) => {
      console.error('[Dashboard] WS Error:', error);
      setError('WebSocket connection error');
    },
  });

  // Handle start run
  const handleStartRun = async () => {
    if (!selectedFile || !instruction.trim()) {
      setError('Please select a file and enter an instruction');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await api.startRun(store.persona, instruction, selectedFile);
      store.setRunId(response.run_id);
      store.setAgentStatus('running');

      // Clear form
      setInstruction('');
      setSelectedFile(null);

      console.log('[Dashboard] Run started:', response.run_id);
    } catch (err) {
      setError(`Failed to start run: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error('[Dashboard] Start run error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle approve policy gate
  const handleApprovePolicy = async () => {
    if (!store.runId) return;

    try {
      setIsLoading(true);
      await api.approvePolicyGate(store.runId);
      store.setAgentStatus('running');
      console.log('[Dashboard] Policy approved');
    } catch (err) {
      setError(`Failed to approve: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle escalation decision
  const handleEscalationDecision = async (vendorId: string, decision: 'capture' | 'cancel') => {
    if (!store.runId) return;

    try {
      setIsLoading(true);
      await api.escalationDecision(store.runId, vendorId, decision);
      console.log('[Dashboard] Escalation decision made:', decision);
    } catch (err) {
      setError(`Failed to make decision: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle submit query
  const handleSubmitQuery = async (question: string) => {
    if (!store.runId) return;

    try {
      setIsLoading(true);
      await api.submitQuery(store.runId, question);
      console.log('[Dashboard] Query submitted');
    } catch (err) {
      setError(`Failed to submit query: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle export
  const handleExport = async () => {
    if (!store.runId) return;

    try {
      setIsLoading(true);
      await api.exportAuditCsv(store.runId);
      console.log('[Dashboard] Export completed');
    } catch (err) {
      setError(`Failed to export: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="priya-dashboard">
      {/* Header */}
      <div className="priya-header">
        <div className="priya-header__left">
          <h1>PRIYA</h1>
          <div className="priya-persona-badge">{store.persona.toUpperCase()}</div>
          {store.runId && <div className="priya-run-id">Run: {store.runId}</div>}
        </div>
        <div className="priya-header__right">
          <div className={`priya-status-pill priya-status-${store.agentStatus}`}>
            {getStatusLabel(store.agentStatus)}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="priya-main">
        {/* Canvas area */}
        <div className="priya-canvas">
          {store.canvasState === 'policy_gate' && store.policyGateData && (
            <PolicyGatePanel data={store.policyGateData} onApprove={handleApprovePolicy} disabled={isLoading} />
          )}

          {store.canvasState === 'run_board' && (
            <RunBoardPanel
              vendors={Array.from(store.vendors.values())}
              onEscalationDecision={handleEscalationDecision}
              disabled={isLoading}
            />
          )}

          {store.canvasState === 'audit' && store.runSummary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
              <AuditPanel summary={store.runSummary} onExport={handleExport} disabled={isLoading} />
              <ReconciliationDashboard runId={store.runId ?? undefined} mode="run" />
            </div>
          )}

          {store.canvasState === 'query_result' && store.queryResult && (
            <QueryResultPanel result={store.queryResult} />
          )}

          {/* Start run form */}
          {!store.runId && (
            <StartRunPanel
              persona={store.persona}
              onPersonaChange={(p) => store.setPersona(p)}
              selectedFile={selectedFile}
              onFileSelect={setSelectedFile}
              instruction={instruction}
              onInstructionChange={setInstruction}
              onStartRun={handleStartRun}
              disabled={isLoading}
            />
          )}
        </div>

        {/* Chat panel */}
        <div className="priya-chat">
          <ChatPanel messages={store.chatMessages} onSubmitQuery={handleSubmitQuery} disabled={isLoading} />
          {store.logsExpanded && <LogsPanel events={store.rawEvents} />}
          <button className="priya-logs-toggle" onClick={() => store.toggleLogsExpanded()}>
            {store.logsExpanded ? 'Hide Logs' : 'Show Logs'}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="priya-error">
          <div className="priya-error__content">{error}</div>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
}

// ============= Sub-components =============

function StartRunPanel({
  persona,
  onPersonaChange,
  selectedFile,
  onFileSelect,
  instruction,
  onInstructionChange,
  onStartRun,
  disabled,
}: {
  persona: Persona;
  onPersonaChange: (p: Persona) => void;
  selectedFile: File | null;
  onFileSelect: (f: File) => void;
  instruction: string;
  onInstructionChange: (text: string) => void;
  onStartRun: () => void;
  disabled: boolean;
}) {
  return (
    <div className="priya-start-run">
      <h2>Start Payment Run</h2>

      <div className="priya-form-group">
        <label>Persona</label>
        <select value={persona} onChange={(e) => onPersonaChange(e.target.value as Persona)} disabled={disabled}>
          <option value="hospital">Hospital</option>
          <option value="kirana">Kirana</option>
        </select>
      </div>

      <div className="priya-form-group">
        <label>Upload CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
          disabled={disabled}
        />
        {selectedFile && <p className="priya-file-name">{selectedFile.name}</p>}
      </div>

      <div className="priya-form-group">
        <label>Instruction</label>
        <textarea
          value={instruction}
          onChange={(e) => onInstructionChange(e.target.value)}
          placeholder="e.g., Clear this week invoices"
          disabled={disabled}
          rows={4}
        />
      </div>

      <button onClick={onStartRun} disabled={disabled || !selectedFile || !instruction.trim()}>
        {disabled ? 'Starting...' : 'Start Run'}
      </button>
    </div>
  );
}

function PolicyGatePanel({
  data,
  onApprove,
  disabled,
}: {
  data: { vendors: any[]; total: number };
  onApprove: () => void;
  disabled: boolean;
}) {
  return (
    <div className="priya-policy-gate">
      <h2>Payment Approval</h2>

      <div className="priya-vendors-table">
        <div className="priya-table-header">
          <div>Vendor</div>
          <div>Amount</div>
          <div>Rail</div>
          <div>Action</div>
        </div>
        {data.vendors.map((v) => (
          <div key={v.vendor_id} className="priya-table-row">
            <div>{v.name}</div>
            <div>₹{v.amount.toLocaleString()}</div>
            <div>{v.rail.toUpperCase()}</div>
            <div>{v.action}</div>
          </div>
        ))}
      </div>

      <div className="priya-total">
        <strong>Total: ₹{data.total.toLocaleString()}</strong>
      </div>

      <button onClick={onApprove} disabled={disabled} className="priya-approve-btn">
        Approve Run
      </button>
    </div>
  );
}

function RunBoardPanel({
  vendors,
  onEscalationDecision,
  disabled,
}: {
  vendors: any[];
  onEscalationDecision: (vendorId: string, decision: 'capture' | 'cancel') => void;
  disabled: boolean;
}) {
  return (
    <div className="priya-run-board">
      <h2>Payment Run Board</h2>

      <div className="priya-vendors-table">
        <div className="priya-table-header">
          <div>Vendor</div>
          <div>Amount</div>
          <div>Rail</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {vendors.map((v) => (
          <div key={v.vendor_id} className={`priya-table-row priya-row-${v.state}`}>
            <div>{v.name}</div>
            <div>₹{v.amount.toLocaleString()}</div>
            <div>{v.rail.toUpperCase()}</div>
            <div>{v.state}</div>
            <div>
              {v.escalation && (
                <div className="priya-escalation-actions">
                  <button
                    onClick={() => onEscalationDecision(v.vendor_id, 'capture')}
                    disabled={disabled}
                    className="priya-btn-capture">
                    Authorize
                  </button>
                  <button
                    onClick={() => onEscalationDecision(v.vendor_id, 'cancel')}
                    disabled={disabled}
                    className="priya-btn-reject">
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuditPanel({
  summary,
  onExport,
  disabled,
}: {
  summary: any;
  onExport: () => void;
  disabled: boolean;
}) {
  return (
    <div className="priya-audit">
      <h2>Audit & Reconciliation</h2>

      <div className="priya-summary-cards">
        <div className="priya-card priya-card-success">
          <div className="priya-card__label">Paid</div>
          <div className="priya-card__value">{summary.paid}</div>
        </div>
        <div className="priya-card priya-card-warning">
          <div className="priya-card__label">Deferred</div>
          <div className="priya-card__value">{summary.deferred}</div>
        </div>
        <div className="priya-card priya-card-error">
          <div className="priya-card__label">Failed</div>
          <div className="priya-card__value">{summary.failed}</div>
        </div>
        {summary.float_saved > 0 && (
          <div className="priya-card priya-card-info">
            <div className="priya-card__label">Float Saved</div>
            <div className="priya-card__value">₹{summary.float_saved.toLocaleString()}</div>
          </div>
        )}
      </div>

      <button onClick={onExport} disabled={disabled} className="priya-export-btn">
        Export CSV
      </button>
    </div>
  );
}

function QueryResultPanel({ result }: { result: any }) {
  return (
    <div className="priya-query-result">
      <h2>Query Result</h2>
      <p className="priya-query-text">"{result.query_nl}"</p>

      {result.render_as === 'table' && (
        <div className="priya-result-table">
          <div className="priya-table-header">
            {result.columns.map((col: string) => (
              <div key={col}>{col}</div>
            ))}
          </div>
          {result.rows.map((row: any[], idx: number) => (
            <div key={idx} className="priya-table-row">
              {row.map((cell: any, cidx: number) => (
                <div key={cidx}>{cell}</div>
              ))}
            </div>
          ))}
        </div>
      )}

      {result.render_as === 'summary_card' && (
        <div className="priya-summary-card">
          <div className="priya-summary-card__value">{result.rows[0]?.[0]}</div>
          <div className="priya-summary-card__label">{result.query_nl}</div>
        </div>
      )}
    </div>
  );
}

function ChatPanel({
  messages,
  onSubmitQuery,
  disabled,
}: {
  messages: any[];
  onSubmitQuery: (q: string) => void;
  disabled: boolean;
}) {
  const [query, setQuery] = useState('');

  return (
    <div className="priya-chat-panel">
      <div className="priya-chat-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`priya-message priya-message-${msg.level}`}>
            <div className="priya-message__time">{msg.timestamp}</div>
            <div className="priya-message__text">{msg.text}</div>
          </div>
        ))}
      </div>

      <div className="priya-chat-input">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question..."
          disabled={disabled}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              onSubmitQuery(query);
              setQuery('');
            }
          }}
        />
        <button
          onClick={() => {
            if (query.trim()) {
              onSubmitQuery(query);
              setQuery('');
            }
          }}
          disabled={disabled || !query.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}

function LogsPanel({ events }: { events: any[] }) {
  return (
    <div className="priya-logs">
      {events.map((entry, idx) => (
        <div key={idx} className="priya-log-entry">
          <span className="priya-log-time">{entry.timestamp}</span>
          <span className="priya-log-type">{entry.event.type}</span>
        </div>
      ))}
    </div>
  );
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'running':
      return 'Running...';
    case 'awaiting_approval':
      return 'Awaiting Approval';
    case 'escalation':
      return 'Escalation';
    case 'complete':
      return 'Complete';
    case 'partial':
      return 'Partial';
    default:
      return 'Idle';
  }
}
