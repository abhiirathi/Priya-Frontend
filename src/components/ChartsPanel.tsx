import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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

const STATUS_COLORS = {
  reconciled: '#10b981',
  unreconciled: '#dc2626',
  'high-risk': '#f59e0b'
};

const RAIL_COLORS = ['#3b82f6', '#0ea5e9', '#06b6d4', '#10b981', '#f59e0b'];

type ChartsPanelProps = {
  metrics: DashboardMetrics;
  rows: ReconciliationRow[];
  onStatusSelect: (status: 'reconciled' | 'unreconciled' | 'high-risk') => void;
  onHospitalSelect: (hospital: string) => void;
  onRailSelect: (rail: string) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
}

export function ChartsPanel({ metrics, rows, onStatusSelect, onHospitalSelect, onRailSelect }: ChartsPanelProps) {
  const statusData = [
    { name: 'Reconciled', value: metrics.reconciledCount, status: 'reconciled' as const, color: STATUS_COLORS.reconciled },
    { name: 'Unreconciled', value: metrics.unreconciledCount, status: 'unreconciled' as const, color: STATUS_COLORS.unreconciled },
    { name: 'High Risk', value: metrics.highRiskCount, status: 'high-risk' as const, color: STATUS_COLORS['high-risk'] }
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

  const trendData = buildTrend(rows);
  const railData = groupByRail(rows);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div
          style={{
            background: '#ffffff',
            padding: '12px 16px',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
            {payload[0].payload.date || payload[0].payload.name || payload[0].payload.hospital || payload[0].name}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: '4px 0', fontSize: '0.8rem', color: entry.color }}>
              <strong>{entry.name}:</strong> {typeof entry.value === 'number' && entry.value > 1000 ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="charts-grid">
      {/* Status Mix - Pie Chart */}
      <div className="chart-panel">
        <div className="chart-header">
          <h3 className="chart-title">
            <span className="chart-icon">📊</span>
            Reconciliation Status
          </h3>
          <p className="chart-description">Overview of transaction statuses. Click any segment to filter the dashboard.</p>
        </div>
        <div className="chart-container pie-chart-wrapper">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
              >
                {statusData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    onClick={() => onStatusSelect(entry.status)}
                    style={{ cursor: 'pointer', filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))' }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pie-legend">
          {statusData.map((item) => (
            <div key={item.name} className="legend-item" onClick={() => onStatusSelect(item.status)}>
              <div className="legend-dot" style={{ background: item.color }}></div>
              <div>
                <div className="legend-label">{item.name}</div>
                <div className="legend-value">{item.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hospital Risk Profile */}
      <div className="chart-panel">
        <div className="chart-header">
          <h3 className="chart-title">
            <span className="chart-icon">🏥</span>
            Hospital Risk Profile
          </h3>
          <p className="chart-description">Unresolved transactions per hospital. Click to filter and investigate.</p>
        </div>
        <div className="chart-container">
          <div className="hospital-risk-list">
            {hospitalData.slice(0, 5).map((item) => {
              const maxValue = Math.max(...hospitalData.map((h) => h.unresolved), 1);
              const percentage = (item.unresolved / maxValue) * 100;
              return (
                <div key={item.hospital} className="risk-item" onClick={() => onHospitalSelect(item.hospital)}>
                  <div className="risk-item-header">
                    <span className="risk-item-name">{item.hospital}</span>
                    <span className="risk-item-count">{item.unresolved}</span>
                  </div>
                  <div className="risk-bar-track">
                    <div className="risk-bar-fill" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Value Trend - Area Chart */}
      <div className="chart-panel panel--wide">
        <div className="chart-header">
          <h3 className="chart-title">
            <span className="chart-icon">📈</span>
            Settlement Value Trend
          </h3>
          <p className="chart-description">Compare expected Pine Labs amounts vs actual bank credits over time. Gaps indicate processing delays or variances.</p>
        </div>
        <div className="chart-container area-chart-wrapper">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={trendData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorPineLabs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorBank" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Area
                type="monotone"
                dataKey="pineLabs"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorPineLabs)"
                name="Expected (Pine Labs)"
              />
              <Area
                type="monotone"
                dataKey="bank"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorBank)"
                name="Credited (Bank)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="stats-row">
          <div className="stat-box">
            <div className="stat-label">Pine Labs Total</div>
            <div className="stat-value">{formatCurrency(metrics.totalPineLabsVolume)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Bank Credited</div>
            <div className="stat-value">{formatCurrency(metrics.totalBankVolume)}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Variance</div>
            <div className="stat-value">{formatCurrency(metrics.totalPineLabsVolume - metrics.totalBankVolume)}</div>
          </div>
        </div>
      </div>

      {/* Payment Rail Distribution */}
      <div className="chart-panel">
        <div className="chart-header">
          <h3 className="chart-title">
            <span className="chart-icon">🚀</span>
            Payment Rail Distribution
          </h3>
          <p className="chart-description">Transaction count by payment method. UPI dominates modern payments.</p>
        </div>
        <div className="chart-container bar-chart-wrapper">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={railData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="rail" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} onClick={(state) => {
                const payload = state?.activePayload?.[0]?.payload as { rail?: string } | undefined;
                if (payload?.rail) onRailSelect(payload.rail);
              }}>
                {railData.map((_, index: number) => (
                  <Cell key={`cell-${index}`} fill={RAIL_COLORS[index % RAIL_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Variance Watch */}
      <div className="chart-panel">
        <div className="chart-header">
          <h3 className="chart-title">
            <span className="chart-icon">⚠️</span>
            Variance Watch
          </h3>
          <p className="chart-description">Tracks % difference between expected and credited amounts for unreconciled items.</p>
        </div>
        <div className="chart-container line-chart-wrapper">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={rows
                .filter((row) => row.status !== 'reconciled')
                .slice(0, 8)
                .map((row) => ({ orderId: row.orderId, variancePercent: row.variancePercent }))}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="orderId" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="variancePercent"
                stroke="#dc2626"
                strokeWidth={3}
                dot={{ fill: '#dc2626', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
