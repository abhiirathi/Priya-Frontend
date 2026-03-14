type MetricCardProps = {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warn' | 'danger';
  active?: boolean;
  onClick?: () => void;
};

export function MetricCard({ label, value, tone = 'default', active = false, onClick }: MetricCardProps) {
  return (
    <button
      type="button"
      className={`metric-card metric-card--${tone} ${active ? 'metric-card--active' : ''} ${onClick ? 'metric-card--interactive' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}
