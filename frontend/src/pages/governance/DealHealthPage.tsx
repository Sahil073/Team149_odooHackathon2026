import { AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { Notice } from '../../components/common/Notice';
import type { DealHealthFlagItem } from '../../types';

export function DealHealthPage({
  dealHealthFlags = [],
  onOpenQuote,
  onNotify,
  onTriggerScan,
}: {
  dealHealthFlags?: DealHealthFlagItem[];
  onOpenQuote: (quotationId?: string) => void;
  onNotify: (message: string) => void;
  onTriggerScan?: () => void;
}) {
  const stalledCount = dealHealthFlags.filter((f) => f.tone === 'red').length;
  const anomalyCount = dealHealthFlags.filter((f) => f.tone === 'orange').length;
  const slippageCount = dealHealthFlags.filter((f) => f.tone === 'blue').length;

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">GOVERNANCE / DEAL HEALTH</span>
          <h1>
            Deal health<span className="heading-period">.</span>
          </h1>
          <p>Live health telemetry from PostgreSQL database identifying anomalies and stalled deals.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onTriggerScan && (
            <button className="button button-secondary" onClick={onTriggerScan}>
              <RefreshCw size={15} /> Run scan
            </button>
          )}
          <span className="page-context">
            <AlertTriangle size={15} /> {dealHealthFlags.length} active flags
          </span>
        </div>
      </div>
      <div className="health-dashboard-grid">
        <div className="health-signal-card signal-red">
          <strong>{stalledCount}</strong>
          <span>Stalled deals</span>
          <small>No activity in 3+ days</small>
        </div>
        <div className="health-signal-card signal-orange">
          <strong>{anomalyCount}</strong>
          <span>Discount anomalies</span>
          <small>Outside rep baseline</small>
        </div>
        <div className="health-signal-card signal-blue">
          <strong>{slippageCount}</strong>
          <span>Delivery slippage</span>
          <small>Promise date moved</small>
        </div>
      </div>
      <div className="operations-table-panel standalone-table">
        <div className="table-scroll">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Issue</th>
                <th>Flagged</th>
                <th>Severity</th>
                <th>Recommended action</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {dealHealthFlags.map((flag) => (
                <tr key={flag.id} onClick={() => onOpenQuote(flag.quotationId)}>
                  <td>
                    <strong>{flag.deal}</strong>
                    <span>Database flag</span>
                  </td>
                  <td>
                    <span className={`risk-label risk-${flag.tone}`}>
                      <span />
                      {flag.issue}
                    </span>
                  </td>
                  <td>{flag.date}</td>
                  <td>
                    <span className="table-muted" style={{ textTransform: 'capitalize' }}>
                      {flag.severity.toLowerCase()}
                    </span>
                  </td>
                  <td>
                    <button
                      className="table-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        onNotify(
                          flag.issue.includes('Discount')
                            ? `Escalation dispatched for ${flag.deal}.`
                            : `Notification sent to sales owner for ${flag.deal}.`
                        );
                      }}
                    >
                      {flag.tone === 'orange' ? 'Escalate' : 'Nudge rep'}
                    </button>
                  </td>
                  <td>
                    <ArrowRight size={16} />
                  </td>
                </tr>
              ))}
              {!dealHealthFlags.length && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    All quotations in the database are currently healthy.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Notice>
        Flagged deals are computed directly from database quotation line discounts, activity dates, and warehouse split statuses.
      </Notice>
    </div>
  );
}

