import { useState, useEffect, useRef, useCallback } from 'react';
import type { Persona } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:8000';

// Policy shape matching our YAML files — compliance is now a dynamic Record
interface ComplianceRule {
  action: string;
  pre_auth?: boolean;
}

interface PolicyConfig {
  persona?: string;
  display_name: string;
  mdr_rate_contracted: number;
  preferred_rails: {
    default: string;
    fallback_chain: string[];
  };
  priority_rules: {
    category_scores: Record<string, number>;
    overdue_bonus_per_day?: number;
    vendor_type_scores: Record<string, number>;
    credit_rules?: {
      cod_bonus: number;
      expired_credit_bonus: number;
      defer_if_credit_remaining: boolean;
    };
  };
  compliance?: Record<string, ComplianceRule>;
  payment_rules?: {
    max_amount_per_vendor: number;
    require_approval_above: number;
  };
  float_optimization?: {
    enabled: boolean;
    metric_name: string;
  };
}

const HOSPITAL_FALLBACK: PolicyConfig = {
  display_name: 'City Hospital',
  mdr_rate_contracted: 0.018,
  preferred_rails: { default: 'neft', fallback_chain: ['upi_intent', 'hosted_checkout', 'payment_link'] },
  priority_rules: {
    category_scores: { critical_supply: 50, surgical_equipment: 40, pharma_general: 20, consumables: 10, standard: 5 },
    overdue_bonus_per_day: 10,
    vendor_type_scores: { critical: 30, established: 0, new: -10 },
  },
  compliance: {
    schedule_h: { action: 'escalate', pre_auth: true },
    schedule_x: { action: 'queue' },
  },
  payment_rules: { max_amount_per_vendor: 500000, require_approval_above: 100000 },
};

const KIRANA_FALLBACK: PolicyConfig = {
  display_name: 'Sharma General Store',
  mdr_rate_contracted: 0.015,
  preferred_rails: { default: 'upi', fallback_chain: ['upi_intent', 'payment_link'] },
  priority_rules: {
    category_scores: { dairy: 20, goods: 10, beverages: 5, standard: 3 },
    vendor_type_scores: { critical: 20, new: 10 },
    credit_rules: { cod_bonus: 40, expired_credit_bonus: 30, defer_if_credit_remaining: true },
  },
  float_optimization: { enabled: true, metric_name: 'float_saved' },
};

const RAIL_OPTIONS = ['neft', 'rtgs', 'imps', 'upi', 'upi_intent', 'hosted_checkout', 'payment_link'];
const COMPLIANCE_ACTIONS = ['escalate', 'queue', 'block', 'allow'];

const st = {
  panel: {
    marginTop: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px',
    border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden',
    width: '100%', maxWidth: '680px', margin: '24px auto 0',
  } as React.CSSProperties,
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
  } as React.CSSProperties,
  headerLeft: { display: 'flex', alignItems: 'center', gap: '10px' } as React.CSSProperties,
  headerIcon: {
    width: '28px', height: '28px', borderRadius: '8px',
    background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  } as React.CSSProperties,
  headerTitle: { fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.3px' } as React.CSSProperties,
  chevron: (open: boolean) => ({
    fontSize: '12px', color: 'rgba(255,255,255,0.3)',
    transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
  }) as React.CSSProperties,
  body: { padding: '16px 20px 20px', display: 'flex', flexDirection: 'column' as const, gap: '20px' } as React.CSSProperties,
  section: { display: 'flex', flexDirection: 'column' as const, gap: '10px' } as React.CSSProperties,
  sectionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  } as React.CSSProperties,
  sectionLabel: {
    fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase' as const, letterSpacing: '1px',
  } as React.CSSProperties,
  row: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 12px', background: 'rgba(255,255,255,0.025)', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.04)',
  } as React.CSSProperties,
  label: { fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 } as React.CSSProperties,
  input: {
    width: '80px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#fff',
    fontFamily: 'monospace', textAlign: 'right' as const, outline: 'none',
  } as React.CSSProperties,
  textInput: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#fff', outline: 'none',
  } as React.CSSProperties,
  select: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', padding: '4px 8px', fontSize: '12px', color: '#fff', outline: 'none', cursor: 'pointer',
  } as React.CSSProperties,
  railChip: (active: boolean) => ({
    padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s ease',
    border: active ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
    background: active ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
    color: active ? '#a78bfa' : 'rgba(255,255,255,0.4)',
  }) as React.CSSProperties,
  toggle: (on: boolean) => ({
    width: '36px', height: '20px', borderRadius: '10px',
    background: on ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)',
    position: 'relative' as const, cursor: 'pointer', transition: 'background 0.2s ease',
    border: 'none', padding: 0,
  }),
  toggleDot: (on: boolean) => ({
    width: '16px', height: '16px', borderRadius: '50%',
    background: on ? '#a78bfa' : 'rgba(255,255,255,0.3)',
    position: 'absolute' as const, top: '2px', left: on ? '18px' : '2px',
    transition: 'left 0.2s ease, background 0.2s ease',
  }),
  scoreBar: (score: number, max: number) => ({
    height: '4px', borderRadius: '2px', background: 'rgba(99,102,241,0.5)',
    width: `${Math.min(100, (Math.abs(score) / max) * 100)}%`, transition: 'width 0.3s ease',
  }),
  addBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
    background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)',
    color: '#a78bfa', cursor: 'pointer', transition: 'all 0.15s ease',
  } as React.CSSProperties,
  removeBtn: {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)',
    cursor: 'pointer', fontSize: '14px', padding: '0 4px', lineHeight: 1,
    transition: 'color 0.15s ease',
  } as React.CSSProperties,
  syncBadge: (synced: boolean) => ({
    fontSize: '9px', fontWeight: 700, letterSpacing: '0.5px',
    padding: '2px 6px', borderRadius: '4px',
    background: synced ? 'rgba(34,197,94,0.12)' : 'rgba(251,191,36,0.12)',
    color: synced ? '#4ade80' : '#fbbf24',
  }) as React.CSSProperties,
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);
}

export function PolicyConfigPanel({ persona }: { persona: Persona }) {
  const [open, setOpen] = useState(false);
  const [policy, setPolicy] = useState<PolicyConfig>(persona === 'hospital' ? HOSPITAL_FALLBACK : KIRANA_FALLBACK);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'synced' | 'saving' | 'error'>('idle');
  const [addingRule, setAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersonaRef = useRef(persona);

  // Load from backend
  useEffect(() => {
    setSyncStatus('loading');
    fetch(`${API_BASE}/api/policy/${persona}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setPolicy(data);
        setSyncStatus('synced');
      })
      .catch(() => {
        setPolicy(persona === 'hospital' ? HOSPITAL_FALLBACK : KIRANA_FALLBACK);
        setSyncStatus('idle');
      });
    lastPersonaRef.current = persona;
  }, [persona]);

  // Save to backend (debounced)
  const saveToBackend = useCallback((p: PolicyConfig) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSyncStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      fetch(`${API_BASE}/api/policy/${lastPersonaRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
        .then(r => r.ok ? setSyncStatus('synced') : setSyncStatus('error'))
        .catch(() => setSyncStatus('error'));
    }, 800);
  }, []);

  const update = (path: string, value: any) => {
    setPolicy(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      saveToBackend(next);
      return next;
    });
  };

  const addComplianceRule = () => {
    const name = newRuleName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return;
    setPolicy(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (!next.compliance) next.compliance = {};
      if (next.compliance[name]) return prev; // already exists
      next.compliance[name] = { action: 'escalate' };
      saveToBackend(next);
      return next;
    });
    setNewRuleName('');
    setAddingRule(false);
  };

  const removeComplianceRule = (name: string) => {
    setPolicy(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      if (next.compliance) delete next.compliance[name];
      saveToBackend(next);
      return next;
    });
  };

  const maxCatScore = Math.max(...Object.values(policy.priority_rules?.category_scores || { x: 1 }), 1);
  const complianceEntries = Object.entries(policy.compliance || {});

  return (
    <div style={st.panel}>
      <div style={st.header} onClick={() => setOpen(!open)}>
        <div style={st.headerLeft}>
          <div style={st.headerIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <span style={st.headerTitle}>Payment Policy — {policy.display_name}</span>
          <span style={st.syncBadge(syncStatus === 'synced')}>
            {syncStatus === 'loading' ? 'LOADING' : syncStatus === 'saving' ? 'SAVING...' : syncStatus === 'synced' ? 'SYNCED' : syncStatus === 'error' ? 'ERROR' : 'LOCAL'}
          </span>
        </div>
        <span style={st.chevron(open)}>&#9662;</span>
      </div>

      {open && (
        <div style={st.body}>

          {/* MDR Rate */}
          <div style={st.section}>
            <div style={st.sectionLabel}>MDR Rate (Contracted)</div>
            <div style={st.row}>
              <span style={st.label}>Rate</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <input style={st.input} type="number" step="0.001" min="0" max="0.1"
                  value={policy.mdr_rate_contracted}
                  onChange={e => update('mdr_rate_contracted', parseFloat(e.target.value) || 0)}
                />
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                  ({(policy.mdr_rate_contracted * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Payment Rails */}
          <div style={st.section}>
            <div style={st.sectionLabel}>Payment Rails</div>
            <div style={st.row}>
              <span style={st.label}>Default Rail</span>
              <select style={st.select} value={policy.preferred_rails.default}
                onChange={e => update('preferred_rails.default', e.target.value)}>
                {RAIL_OPTIONS.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={{ ...st.row, flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
              <span style={st.label}>Fallback Chain</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {RAIL_OPTIONS.filter(r => r !== policy.preferred_rails.default).map(rail => {
                  const active = policy.preferred_rails.fallback_chain.includes(rail);
                  return (
                    <span key={rail} style={st.railChip(active)} onClick={() => {
                      const chain = active
                        ? policy.preferred_rails.fallback_chain.filter(r => r !== rail)
                        : [...policy.preferred_rails.fallback_chain, rail];
                      update('preferred_rails.fallback_chain', chain);
                    }}>
                      {active && <span style={{ marginRight: '4px' }}>&#10003;</span>}
                      {rail.toUpperCase()}
                    </span>
                  );
                })}
              </div>
              {policy.preferred_rails.fallback_chain.length > 0 && (
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                  {policy.preferred_rails.default.toUpperCase()} {' -> '}
                  {policy.preferred_rails.fallback_chain.map(r => r.toUpperCase()).join(' -> ')}
                </div>
              )}
            </div>
          </div>

          {/* Category Priority Scores */}
          <div style={st.section}>
            <div style={st.sectionLabel}>Category Priority Scores</div>
            {Object.entries(policy.priority_rules?.category_scores || {}).map(([cat, score]) => (
              <div key={cat} style={{ ...st.row, gap: '12px' }}>
                <span style={{ ...st.label, flex: 1, textTransform: 'capitalize' }}>{cat.replace(/_/g, ' ')}</span>
                <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)' }}>
                    <div style={st.scoreBar(score, maxCatScore)} />
                  </div>
                  <input style={{ ...st.input, width: '50px' }} type="number" min="0" max="100" value={score}
                    onChange={e => {
                      const newScores = { ...policy.priority_rules.category_scores, [cat]: parseInt(e.target.value) || 0 };
                      update('priority_rules.category_scores', newScores);
                    }}
                  />
                </div>
              </div>
            ))}
            {policy.priority_rules?.overdue_bonus_per_day != null && (
              <div style={st.row}>
                <span style={st.label}>Overdue bonus / day</span>
                <input style={{ ...st.input, width: '50px' }} type="number" min="0"
                  value={policy.priority_rules.overdue_bonus_per_day}
                  onChange={e => update('priority_rules.overdue_bonus_per_day', parseInt(e.target.value) || 0)}
                />
              </div>
            )}
          </div>

          {/* Vendor Type Scores */}
          <div style={st.section}>
            <div style={st.sectionLabel}>Vendor Type Scores</div>
            {Object.entries(policy.priority_rules?.vendor_type_scores || {}).map(([type, score]) => (
              <div key={type} style={st.row}>
                <span style={{ ...st.label, textTransform: 'capitalize' }}>{type}</span>
                <input style={{ ...st.input, width: '50px' }} type="number" value={score}
                  onChange={e => {
                    const newScores = { ...policy.priority_rules.vendor_type_scores, [type]: parseInt(e.target.value) || 0 };
                    update('priority_rules.vendor_type_scores', newScores);
                  }}
                />
              </div>
            ))}
          </div>

          {/* ── Compliance Rules (dynamic, addable) ── */}
          <div style={st.section}>
            <div style={st.sectionHeader}>
              <div style={st.sectionLabel}>Compliance Rules</div>
              <button style={st.addBtn} onClick={() => setAddingRule(true)}>
                <span style={{ fontSize: '13px', lineHeight: 1 }}>+</span> Add Rule
              </button>
            </div>

            {complianceEntries.map(([name, rule]) => (
              <div key={name} style={st.row}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <button
                    style={st.removeBtn}
                    onClick={() => removeComplianceRule(name)}
                    title={`Remove ${name}`}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
                  >x</button>
                  <span style={st.label}>
                    {name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                  {rule.pre_auth !== undefined && (
                    <span style={{
                      fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                      background: 'rgba(239,68,68,0.15)', color: '#f87171', fontWeight: 700,
                    }}>BLOCKING</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select style={st.select} value={rule.action}
                    onChange={e => update(`compliance.${name}.action`, e.target.value)}>
                    {COMPLIANCE_ACTIONS.map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>)}
                  </select>
                  {rule.pre_auth !== undefined && (
                    <>
                      <button style={st.toggle(!!rule.pre_auth)}
                        onClick={() => update(`compliance.${name}.pre_auth`, !rule.pre_auth)}>
                        <div style={st.toggleDot(!!rule.pre_auth)} />
                      </button>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Pre-Auth</span>
                    </>
                  )}
                </div>
              </div>
            ))}

            {complianceEntries.length === 0 && !addingRule && (
              <div style={{ ...st.row, justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px' }}>
                No compliance rules configured
              </div>
            )}

            {/* Add Rule inline form */}
            {addingRule && (
              <div style={{ ...st.row, gap: '8px' }}>
                <input
                  style={{ ...st.textInput, flex: 1 }}
                  placeholder="Rule name (e.g. schedule_h1)"
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addComplianceRule(); if (e.key === 'Escape') setAddingRule(false); }}
                  autoFocus
                />
                <button
                  style={{ ...st.addBtn, opacity: newRuleName.trim() ? 1 : 0.4 }}
                  onClick={addComplianceRule}
                  disabled={!newRuleName.trim()}
                >Add</button>
                <button
                  style={{ ...st.removeBtn, fontSize: '12px' }}
                  onClick={() => { setAddingRule(false); setNewRuleName(''); }}
                >Cancel</button>
              </div>
            )}
          </div>

          {/* Payment Rules (Hospital) */}
          {policy.payment_rules && (
            <div style={st.section}>
              <div style={st.sectionLabel}>Payment Limits</div>
              <div style={st.row}>
                <span style={st.label}>Max per vendor</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input style={{ ...st.input, width: '100px' }} type="number" step="10000" min="0"
                    value={policy.payment_rules.max_amount_per_vendor}
                    onChange={e => update('payment_rules.max_amount_per_vendor', parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                    {formatCurrency(policy.payment_rules.max_amount_per_vendor)}
                  </span>
                </div>
              </div>
              <div style={st.row}>
                <span style={st.label}>Approval required above</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input style={{ ...st.input, width: '100px' }} type="number" step="10000" min="0"
                    value={policy.payment_rules.require_approval_above}
                    onChange={e => update('payment_rules.require_approval_above', parseInt(e.target.value) || 0)}
                  />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
                    {formatCurrency(policy.payment_rules.require_approval_above)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Credit Rules (Kirana) */}
          {policy.priority_rules?.credit_rules && (
            <div style={st.section}>
              <div style={st.sectionLabel}>Credit Rules</div>
              <div style={st.row}>
                <span style={st.label}>COD Bonus</span>
                <input style={{ ...st.input, width: '50px' }} type="number"
                  value={policy.priority_rules.credit_rules.cod_bonus}
                  onChange={e => update('priority_rules.credit_rules.cod_bonus', parseInt(e.target.value) || 0)}
                />
              </div>
              <div style={st.row}>
                <span style={st.label}>Expired Credit Bonus</span>
                <input style={{ ...st.input, width: '50px' }} type="number"
                  value={policy.priority_rules.credit_rules.expired_credit_bonus}
                  onChange={e => update('priority_rules.credit_rules.expired_credit_bonus', parseInt(e.target.value) || 0)}
                />
              </div>
              <div style={st.row}>
                <span style={st.label}>Defer if credit remaining</span>
                <button style={st.toggle(policy.priority_rules.credit_rules.defer_if_credit_remaining)}
                  onClick={() => update('priority_rules.credit_rules.defer_if_credit_remaining', !policy.priority_rules.credit_rules!.defer_if_credit_remaining)}>
                  <div style={st.toggleDot(policy.priority_rules.credit_rules.defer_if_credit_remaining)} />
                </button>
              </div>
            </div>
          )}

          {/* Float Optimization (Kirana) */}
          {policy.float_optimization && (
            <div style={st.section}>
              <div style={st.sectionLabel}>Float Optimization</div>
              <div style={st.row}>
                <span style={st.label}>Enabled</span>
                <button style={st.toggle(policy.float_optimization.enabled)}
                  onClick={() => update('float_optimization.enabled', !policy.float_optimization!.enabled)}>
                  <div style={st.toggleDot(policy.float_optimization.enabled)} />
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
