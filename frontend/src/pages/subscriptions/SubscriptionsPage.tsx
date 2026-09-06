import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import type { Subscription, SubscriptionStatus } from '../../types';

type SubscriptionsPageProps = {
  subscriptions: Subscription[];
  filter: 'All' | SubscriptionStatus;
  onFilter: (filter: 'All' | SubscriptionStatus) => void;
  onOpen: (subscription: Subscription) => void;
  onNewPlan: () => void;
};

export function SubscriptionsPage({ subscriptions: rows, filter, onFilter, onOpen, onNewPlan }: SubscriptionsPageProps) {
  const filteredRows = filter === 'All' ? rows : rows.filter((row) => row.status === filter);
  const active = rows.filter((row) => row.status === 'Active').length;
  const paused = rows.filter((row) => row.status === 'Paused').length;
  const cancelled = rows.filter((row) => row.status === 'Cancelled').length;
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">BILLING / SUBSCRIPTIONS</span>
          <h1>Subscriptions<span className="heading-period">.</span></h1>
          <p>Every recurring plan across every customer, in one view.</p>
        </div>
        <button className="button button-primary" onClick={onNewPlan}>
          <Plus size={16} /> New plan <span className="button-meta">Admin</span>
        </button>
      </div>
      <div className="summary-strip">
        <button className={`summary-chip chip-green ${filter === 'Active' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Active')}>
          <strong>{active}</strong>
          <span>Active</span>
        </button>
        <button className={`summary-chip chip-amber ${filter === 'Paused' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Paused')}>
          <strong>{paused}</strong>
          <span>Paused</span>
        </button>
        <button className={`summary-chip chip-red ${filter === 'Cancelled' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Cancelled')}>
          <strong>{cancelled}</strong>
          <span>Cancelled</span>
        </button>
        <button className={`summary-chip chip-neutral ${filter === 'All' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('All')}>
          <strong>{rows.length}</strong>
          <span>All plans</span>
        </button>
      </div>
      <div className="operations-table-panel standalone-table">
        <div className="table-scroll">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Plan</th>
                <th>Cycle</th>
                <th>Next bill</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} onClick={() => onOpen(row)}>
                  <td>
                    <span className="table-customer">
                      <span className="avatar avatar-small avatar-cyan">{row.initials}</span>
                      <span>
                        <strong>{row.customer}</strong>
                        <small>{row.id}</small>
                      </span>
                    </span>
                  </td>
                  <td>{row.plan}</td>
                  <td>{row.cycle}</td>
                  <td>{row.nextBill}</td>
                  <td className="table-amount">{row.amount}</td>
                  <td>
                    <span className={`subscription-status subscription-${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                  </td>
                  <td><ArrowRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredRows.length && <div className="empty-table">No subscriptions match this filter.</div>}
        </div>
      </div>
      <div className="operations-note">
        <Sparkles size={15} />
        <span>Click a subscription to open billing detail, proration history, and controls.</span>
      </div>
    </div>
  );
}
