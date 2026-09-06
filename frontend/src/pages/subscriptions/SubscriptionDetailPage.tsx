import { ArrowRight, Sparkles } from 'lucide-react';
import { Settings2Icon } from '../../components/common/Icons';
import type { Subscription } from '../../types';

export function SubscriptionDetailPage({ subscription, onBack, onCancel, onModify }: { subscription: Subscription; onBack: () => void; onCancel: () => void; onModify: () => void }) {
  const isCancelled = subscription.status === 'Cancelled';
  return (
    <div className="content-container subscription-detail-page">
      <button className="back-link" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to subscriptions</button>
      <div className="page-heading detail-heading">
        <div><span className="eyebrow">BILLING DETAIL</span><h1>{subscription.customer} <span className="detail-customer">— {subscription.plan}</span></h1><p>{subscription.id} · {subscription.cycle} billing · {subscription.status.toLowerCase()} account</p></div>
        <span className={`subscription-status subscription-${subscription.status.toLowerCase()}`}>{subscription.status}</span>
      </div>
      <section className="panel billing-panel">
        <div className="panel-heading"><div><span className="eyebrow">ONE-TIME LINES</span><h2>From originating order</h2></div><span className="billing-source">Q-1042</span></div>
        <div className="table-scroll"><table className="risk-table billing-table"><thead><tr><th>Product</th><th>Qty</th><th>Amount</th></tr></thead><tbody><tr><td><strong>Laptop Pro 14</strong></td><td>2</td><td>$2,280</td></tr><tr><td><strong>Onsite Setup</strong></td><td>1</td><td>$450</td></tr></tbody></table></div>
      </section>
      <section className="panel billing-panel recurring-panel">
        <div className="panel-heading"><div><span className="eyebrow">RECURRING LINES</span><h2>Upcoming billing schedule</h2></div><span className="billing-total">{subscription.amount} / {subscription.cycle.toLowerCase()}</span></div>
        <div className="table-scroll"><table className="risk-table billing-table"><thead><tr><th>Plan</th><th>Cycle</th><th>Next bill date</th><th>Amount</th></tr></thead><tbody><tr><td><strong>{subscription.plan}</strong></td><td>{subscription.cycle}</td><td>{subscription.nextBill}</td><td>$46</td></tr><tr><td><strong>Support SLA</strong></td><td>Quarterly</td><td>Nov 1</td><td>$300</td></tr></tbody></table></div>
      </section>
      <div className="detail-actions billing-actions"><button className="button" onClick={onModify}><Settings2Icon /> Modify subscription</button><button className="button button-danger" disabled={isCancelled} onClick={onCancel}>{isCancelled ? 'Subscription cancelled' : 'Cancel subscription'}</button></div>
      <div className="operations-note"><Sparkles size={15} /><span>Changes to quantity or plan will calculate proration and any applicable credit automatically.</span></div>
    </div>
  );
}
