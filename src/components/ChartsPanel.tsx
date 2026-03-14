import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { DashboardMetrics, ReconciliationRow } from '../types';
import { buildTrend, groupByHospital, groupByRail } from '../lib/reconcile';

const COLORS = ['#0b6e4f', '#2b59c3', '#f4a259', '#d7263d'];

type ChartsPanelProps = {
  metrics: DashboardMetrics;
  rows: ReconciliationRow[];
  onStatusSelect: (status: 'reconciled' | 'unreconciled' | 'high-risk') => void;
  onHospitalSelect: (hospital: string) => void;
  onRailSelect: (rail: string) => void;
};

export function ChartsPanel({ metrics, rows, onStatusSelect, onHospitalSelect, onRailSelect }: ChartsPanelProps) {
  const statusData = [
    { name: 'Reconciled', value: metrics.reconciledCount, status: 'reconciled' as const },
    { name: 'Unreconciled', value: metrics.unreconciledCount, status: 'unreconciled' as const },
    { name: 'High Risk', value: metrics.highRiskCount, status: 'high-risk' as const }
  ];
  const hospitalData = groupByHospital(rows)
    .map((item) => ({
      hospital: item.hospital,
      unresolved: item.unreconciled + item.delayed + item.highRisk,
      delayed: item.delayed,
      unreconciled: item.unreconciled,
      highRisk: item.highRisk
    }))
    .sort((a, b) => b.unresolved - a.unresolved);
  const maxHospitalRisk = Math.max(...hospitalData.map((item) => item.unresolved), 1);
  const trendData = buildTrend(rows);
  const railData = groupByRail(rows);

  return (
    <section className="charts-grid">
      <article className="panel">
        <div className="panel__header">
          <h3>Status mix</h3>
          <p>Instant read on what share of the current view needs intervention.</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90}>
              {statusData.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[index % COLORS.length]}
                  onClick={() => onStatusSelect(entry.status)}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </article>

      <article className="panel">
        <div className="panel__header">
          <h3>Hospital risk profile</h3>
          <p>Horizontal bars show which hospitals are driving unresolved volume right now.</p>
        </div>
        <div className="risk-list">
          {hospitalData.map((item) => (
            <button
              type="button"
              key={item.hospital}
              className="risk-list__row risk-list__button"
              onClick={() => onHospitalSelect(item.hospital)}
            >
              <div className="risk-list__meta">
                <span className="risk-list__hospital">{item.hospital}</span>
                <span className="risk-list__count">{item.unresolved}</span>
              </div>
              <div className="risk-list__track">
                <div
                  className="risk-list__fill"
                  style={{ width: `${(item.unresolved / maxHospitalRisk) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>
      </article>

      <article className="panel panel--wide">
        <div className="panel__header">
          <h3>Value trend</h3>
          <p>Compare Pine Labs expected settlement value against bank credits over time.</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="pineLabs" stackId="1" stroke="#2b59c3" fill="#2b59c3" />
            <Area type="monotone" dataKey="bank" stackId="2" stroke="#0b6e4f" fill="#0b6e4f" />
          </AreaChart>
        </ResponsiveContainer>
      </article>

      <article className="panel">
        <div className="panel__header">
          <h3>Rail concentration</h3>
          <p>Shows which payment rail dominates the transactions in the current view.</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={railData}
            onClick={(state) => {
              const payload = state?.activePayload?.[0]?.payload as { rail?: string } | undefined;
              if (payload?.rail) onRailSelect(payload.rail);
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="rail" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#2b59c3" />
          </BarChart>
        </ResponsiveContainer>
      </article>

      <article className="panel">
        <div className="panel__header">
          <h3>Variance watch</h3>
          <p>Outlier variance highlights where the largest financial mismatches sit.</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={rows
              .filter((row) => row.status !== 'reconciled')
              .slice(0, 8)
              .map((row) => ({ orderId: row.orderId, variancePercent: row.variancePercent }))}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="orderId" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="variancePercent" stroke="#d7263d" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </article>
    </section>
  );
}
