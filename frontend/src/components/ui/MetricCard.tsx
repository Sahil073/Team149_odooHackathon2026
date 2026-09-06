import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  positive?: boolean;
  icon: LucideIcon;
  iconTone: string;
  bars: number[];
};

export function MetricCard({ label, value, detail, trend, positive = true, icon: Icon, iconTone, bars }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-card-top">
        <div>
          <p className="metric-label">{label}</p>
          <p className="metric-value">{value}</p>
        </div>
        <span className={`metric-icon ${iconTone}`}>
          <Icon size={18} strokeWidth={2} />
        </span>
      </div>
      <div className="metric-card-bottom">
        <span className={`metric-trend ${positive ? 'trend-positive' : 'trend-negative'}`}>
          {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {trend}
        </span>
        <span className="metric-detail">{detail}</span>
        <div className="mini-bars" aria-hidden="true">
          {bars.map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </article>
  );
}