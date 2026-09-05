import { type QuoteStatus, statusColors } from '../../types';

type StatusBadgeProps = {
  status: QuoteStatus;
  dot?: boolean;
};

export function StatusBadge({ status, dot = true }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${statusColors[status]}`}>
      {dot && <span className="status-dot" />}
      {status}
    </span>
  );
}