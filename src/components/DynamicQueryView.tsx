import { useMemo } from 'react';
import {
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
  YAxis,
} from 'recharts';
import type { QueryResult } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

function formatValue(val: any): string {
  if (val == null) return '—';
  if (typeof val === 'number') {
    if (Math.abs(val) >= 100000) {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
    }
    if (Number.isInteger(val)) return val.toLocaleString('en-IN');
    return val.toFixed(2);
  }
  return String(val);
}

type RenderMode = 'table' | 'bar_chart' | 'pie_chart' | 'line_chart' | 'summary_card';

function autoDetectRenderMode(result: QueryResult): RenderMode {
  // Trust backend hint if it's not 'table' (table is the safe default)
  if (result.render_as && result.render_as !== 'table') {
    // Validate the hint makes sense for the data shape
    const { columns, rows } = result;
    if (result.render_as === 'bar_chart' || result.render_as === 'pie_chart') {
      // Charts need >=2 rows and a clear label+value structure (not many columns per row)
      if (!rows || rows.length < 2 || columns.length > 4) return 'table';
    }
    return result.render_as as RenderMode;
  }

  const { columns, rows } = result;
  if (!rows || rows.length === 0) return 'summary_card';

  // Single row, 1-2 columns → summary card
  if (rows.length === 1 && columns.length <= 2) return 'summary_card';

  // Single row with many columns → table (detail view, not a chart)
  if (rows.length === 1) return 'table';

  // Find numeric columns
  const numericCols = columns.map((_, i) =>
    rows.every(r => r[i] == null || typeof r[i] === 'number')
  );
  const numericCount = numericCols.filter(Boolean).length;
  const labelCount = columns.length - numericCount;

  // Many columns (>4) → table regardless (it's a detail listing)
  if (columns.length > 4) return 'table';

  // 1 label + 1 numeric, 2-15 rows → bar chart
  if (labelCount >= 1 && numericCount === 1 && rows.length >= 2 && rows.length <= 15) return 'bar_chart';
  // 1 label + 1 numeric, 2-8 rows → pie chart
  if (labelCount === 1 && numericCount === 1 && rows.length >= 2 && rows.length <= 8) return 'pie_chart';
  // Many rows with dates → line chart
  if (rows.length > 5 && columns.some(c => /date|time|day|month|week/i.test(c)) && numericCount >= 1) return 'line_chart';

  return 'table';
}

function buildChartData(result: QueryResult) {
  return (result.rows || []).map(row => {
    const obj: Record<string, any> = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

function SummaryCard({ result }: { result: QueryResult }) {
  const firstRow = result.rows?.[0];
  const value = firstRow?.[result.columns.length - 1] ?? firstRow?.[0] ?? '—';
  const label = result.columns.length > 1 && firstRow
    ? `${firstRow[0]}`
    : result.query_nl;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 32px', background: 'rgba(59,130,246,0.08)', borderRadius: '16px',
      border: '1px solid rgba(59,130,246,0.15)',
    }}>
      <div style={{ fontSize: '48px', fontWeight: 800, color: '#60a5fa', lineHeight: 1.2 }}>
        {formatValue(value)}
      </div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '8px', textAlign: 'center' }}>
        {label}
      </div>
    </div>
  );
}

function DataTable({ result }: { result: QueryResult }) {
  if (!result.rows?.length) return <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px' }}>No data</div>;
  return (
    <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse', fontSize: '13px',
      }}>
        <thead>
          <tr>
            {result.columns.map(col => (
              <th key={col} style={{
                padding: '10px 14px', textAlign: 'left', fontWeight: 600,
                color: 'rgba(255,255,255,0.7)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                position: 'sticky', top: 0, background: '#12141a',
                fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: '8px 14px', color: 'rgba(255,255,255,0.8)',
                  fontFamily: typeof cell === 'number' ? 'monospace' : 'inherit',
                }}>
                  {formatValue(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DynamicBarChart({ result }: { result: QueryResult }) {
  if (!result.rows?.length) return null;
  const data = buildChartData(result);
  const numericCols = result.columns.filter((_, i) =>
    result.rows.every(r => r[i] == null || typeof r[i] === 'number')
  );
  const labelCol = result.columns.find((_, i) =>
    result.rows.some(r => r[i] != null && typeof r[i] !== 'number')
  ) || result.columns[0];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey={labelCol} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
        <Tooltip
          contentStyle={{
            background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.9)',
          }}
        />
        {numericCols.length > 1 && <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />}
        {numericCols.map((col, idx) => (
          <Bar key={col} dataKey={col} radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[(idx + i) % COLORS.length]} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function DynamicPieChart({ result }: { result: QueryResult }) {
  if (!result.rows?.length) return null;
  const data = buildChartData(result);
  const labelCol = result.columns.find((_, i) =>
    result.rows.some(r => r[i] != null && typeof r[i] !== 'number')
  ) || result.columns[0];
  const valueCol = result.columns.find((_, i) =>
    result.rows.every(r => r[i] == null || typeof r[i] === 'number')
  ) || result.columns[1];

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey={valueCol} nameKey={labelCol} innerRadius={60} outerRadius={100} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.9)',
          }}
        />
        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function DynamicLineChart({ result }: { result: QueryResult }) {
  if (!result.rows?.length) return null;
  const data = buildChartData(result);
  const dateCol = result.columns.find(c => /date|time|day|month|week/i.test(c)) || result.columns[0];
  const numericCols = result.columns.filter((c, i) =>
    c !== dateCol && result.rows.every(r => r[i] == null || typeof r[i] === 'number')
  );

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey={dateCol} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
        <YAxis tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="rgba(255,255,255,0.1)" />
        <Tooltip
          contentStyle={{
            background: '#1a1d24', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px', color: 'rgba(255,255,255,0.9)',
          }}
        />
        {numericCols.length > 1 && <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />}
        {numericCols.map((col, idx) => (
          <Line key={col} type="monotone" dataKey={col} stroke={COLORS[idx % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DynamicQueryView({ result, onDismiss }: { result: QueryResult; onDismiss?: () => void }) {
  // Guard against malformed result
  if (!result || !result.columns) return null;
  if (!result.rows) result = { ...result, rows: [] };
  const mode = useMemo(() => autoDetectRenderMode(result), [result]);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
            Query Result
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
            "{result.query_nl}" — {result.row_count} row{result.row_count !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '10px', padding: '3px 8px', borderRadius: '4px',
            background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
            textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px',
          }}>
            {mode.replace('_', ' ')}
          </span>
          {onDismiss && (
            <button onClick={onDismiss} style={{
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: '18px', padding: '0 4px',
            }}>
              x
            </button>
          )}
        </div>
      </div>

      {/* SQL preview */}
      {result.sql && (
        <div style={{
          padding: '8px 20px', background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <code style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
            {result.sql}
          </code>
        </div>
      )}

      {/* Visualization */}
      <div style={{ padding: '20px' }}>
        {mode === 'summary_card' && <SummaryCard result={result} />}
        {mode === 'table' && <DataTable result={result} />}
        {mode === 'bar_chart' && <DynamicBarChart result={result} />}
        {mode === 'pie_chart' && <DynamicPieChart result={result} />}
        {mode === 'line_chart' && <DynamicLineChart result={result} />}
      </div>
    </div>
  );
}
