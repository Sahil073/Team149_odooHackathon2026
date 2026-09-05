import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Notice } from '../../components/common/Notice';

const healthFlags = [
  { deal: 'Zenith Co · Q-1026', issue: 'No activity for 5 days', date: 'Aug 31', tone: 'red' },
  { deal: 'Beta Industries · Q-1037', issue: 'Discount anomaly vs. rep average', date: 'Aug 30', tone: 'orange' },
  { deal: 'Delta LLC · Q-1039', issue: 'Delivery date moved twice', date: 'Aug 29', tone: 'blue' },
];

export function DealHealthPage({ onOpenQuote, onNotify }: { onOpenQuote: () => void; onNotify: (message: string) => void }) {
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">GOVERNANCE / DEAL HEALTH</span>
          <h1>Deal health<span className="heading-period">.</span></h1>
          <p>Find stalled deals, discount anomalies, and delivery slippage before they become surprises.</p>
        </div>
        <span className="page-context"><AlertTriangle size={15} /> 3 active flags</span>
      </div>
      <div className="health-dashboard-grid">
        <div className="health-signal-card signal-red">
          <strong>1</strong>
          <span>Stalled deals</span>
          <small>No activity in 3+ days</small>
        </div>
        <div className="health-signal-card signal-orange">
          <strong>1</strong>
          <span>Discount anomalies</span>
          <small>Outside rep baseline</small>
        </div>
        <div className="health-signal-card signal-blue">
          <strong>1</strong>
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
                <th>Recommended action</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {healthFlags.map((flag) => (
                <tr key={flag.deal} onClick={onOpenQuote}>
                  <td>
                    <strong>{flag.deal}</strong>
                    <span>Needs attention</span>
                  </td>
                  <td>
                    <span className={`risk-label risk-${flag.tone}`}>
                      <span />{flag.issue}
                    </span>
                  </td>
                  <td>{flag.date}</td>
                  <td>
                    <button
                      className="table-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        onNotify(
                          flag.issue.includes('Discount')
                            ? 'Escalation sent to the approval owner.'
                            : 'Reminder sent to the quotation owner.'
                        );
                      }}
                    >
                      {flag.tone === 'orange' ? 'Escalate' : 'Nudge rep'}
                    </button>
                  </td>
                  <td><ArrowRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Notice>Flagged deals are generated from approval risk, rep activity, and delivery promise signals.</Notice>
    </div>
  );
}
