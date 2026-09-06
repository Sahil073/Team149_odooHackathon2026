import { AlertTriangle, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import type { ApprovalItem } from '../../types';

export function ApprovalDetailPage({
  approval,
  canDecide = true,
  onBack,
  onApprove,
  onReturn,
  onReject,
}: {
  approval: ApprovalItem;
  canDecide?: boolean;
  onBack: () => void;
  onApprove: () => void;
  onReturn: () => void;
  onReject: () => void;
}) {
  const isApproved = approval.status === 'Approved';
  const isClosed = approval.status === 'Approved' || approval.status === 'Rejected';
  return (
    <div className="content-container approval-detail-page">
      <button className="back-link" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to approvals</button>
      <div className="page-heading detail-heading">
        <div><span className="eyebrow">APPROVAL DETAIL</span><h1>{approval.id} <span className="detail-customer">({approval.customer})</span></h1><p>Submitted by J. Rao · {approval.submitted} · {approval.customerTier} customer tier</p></div>
        <span className={`risk-banner risk-banner-${approval.risk.toLowerCase()}`}><span /> Blended risk: {approval.risk}</span>
      </div>
      <div className="detail-grid">
        <section className="panel risk-panel">
          <div className="panel-heading"><div><span className="eyebrow">WHY THIS QUOTE WAS FLAGGED</span><h2>Discount risk breakdown</h2></div><span className="tier-badge">Customer tier: {approval.customerTier}</span></div>
          <div className="risk-table-wrap">
            <table className="risk-table"><thead><tr><th>Line</th><th>Discount given</th><th>Limit allowed</th><th>Over by</th></tr></thead>
              <tbody><tr><td><strong>Laptop</strong><span>Hardware</span></td><td>12%</td><td>15%</td><td><span className="risk-ok">0 pt · OK</span></td></tr><tr><td><strong>Setup Service</strong><span>Services</span></td><td>18%</td><td>10%</td><td><span className="risk-over">8 pt OVER</span></td></tr></tbody>
            </table>
          </div>
          <div className="risk-callout"><AlertTriangle size={15} /><span>One line is 8 points over its limit, so the blended score requires manager review.</span></div>
        </section>
        <section className="panel approval-step-panel">
        <div className="panel-heading"><div><span className="eyebrow">APPROVAL PATH</span><h2>Decision progress</h2></div><span className={`approval-status approval-${approval.status.toLowerCase()}`}>{approval.status}</span></div>
          <div className="approval-steps">
            {[
              { label: 'Submitted', detail: 'J. Rao · Aug 20', state: 'complete' },
              { label: 'Sales Manager', detail: approval.stage === 'Sales Manager' ? 'Waiting for review' : 'M. Shah · Complete', state: approval.stage === 'Sales Manager' && !isApproved ? 'current' : 'complete' },
              { label: 'Finance', detail: approval.stage === 'Finance' ? 'Waiting for review' : approval.stage === 'Auto-approved' ? 'Not required' : 'Next step', state: approval.stage === 'Finance' && !isApproved ? 'current' : approval.stage === 'Auto-approved' ? 'skipped' : 'upcoming' },
              { label: 'Confirmed', detail: isApproved ? 'Released to fulfillment' : 'Awaiting decision', state: isApproved ? 'complete' : 'upcoming' },
            ].map((step, index) => (
              <div className="approval-step" key={step.label}><span className={`approval-step-dot approval-step-${step.state}`}>{step.state === 'complete' ? <Check size={12} /> : index + 1}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div>{index < 3 && <span className={`approval-step-line ${step.state === 'complete' ? 'line-complete' : ''}`} />}</div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel audit-panel">
        <div className="panel-heading"><div><span className="eyebrow">AUDIT TRAIL</span><h2>Decision history</h2></div><span className="audit-count">3 events</span></div>
        <div className="audit-list">
          <div className="audit-row"><span className="avatar avatar-small avatar-indigo">JR</span><div><strong>J. Rao <span>submitted quotation</span></strong><small>Initial 12% discount · Aug 20, 09:42</small></div><span className="audit-action audit-submitted">Submitted</span></div>
          <div className="audit-row"><span className="avatar avatar-small avatar-neutral">MS</span><div><strong>M. Shah <span>requested more context</span></strong><small>Requested margin justification · Aug 21, 14:18</small></div><span className="audit-action audit-returned">Returned</span></div>
          <div className="audit-row"><span className="avatar avatar-small avatar-cyan">JR</span><div><strong>J. Rao <span>updated quotation</span></strong><small>Added margin note and resubmitted · Aug 22, 10:06</small></div><span className="audit-action audit-submitted">Resubmitted</span></div>
        </div>
      </section>
      {canDecide ? <div className="detail-actions">
        <button className="button button-success" disabled={isClosed} onClick={onApprove}><Check size={16} /> {isApproved ? 'Approved' : 'Approve'}</button>
        <button className="button button-warning" disabled={isClosed} onClick={onReturn}>Return for revision</button>
        <button className="button button-danger" disabled={isClosed} onClick={onReject}>{approval.status === 'Rejected' ? 'Rejected' : 'Reject'}</button>
      </div> : <div className="view-only-note"><ShieldCheck size={15} /><span>Sales rep view only. This decision is owned by {approval.assignedTo === '—' ? 'the approval chain' : approval.assignedTo}.</span></div>}
    </div>
  );
}
