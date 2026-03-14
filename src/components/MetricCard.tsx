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
      className={`metric-card ${tone !== 'default' ? `tone--${tone}` : ''} ${active ? 'active' : ''}`}
      onClick={onClick}
      disabled={!onClick}
    >
      <h4>{label}</h4>
      <strong>{value}</strong>
    </button>
  );
}
