import {
  AlertTriangle,
  ArrowRight,
  Check,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  MessageCircle,
  Package,
  Plus,
  TrendingUp,
} from 'lucide-react';
import { MetricCard } from '../../components/ui/MetricCard';
import { MoreHorizontalIcon } from '../../components/common/Icons';
import type { AuditLogItem, DealHealthFlagItem, Quote, QuoteStatus, Screen } from '../../types';

type DashboardProps = {
  quotes?: Quote[];
  dealHealthFlags?: DealHealthFlagItem[];
  auditLogs?: AuditLogItem[];
  userName?: string;
  onNavigate: (screen: Screen) => void;
  onOpenQuote: (quote: Quote) => void;
  onNewQuotation: () => void;
};

const stageDefs: Array<{ label: QuoteStatus; tone: string }> = [
  { label: 'Draft', tone: 'blue' },
  { label: 'Pending approval', tone: 'amber' },
  { label: 'Approved', tone: 'violet' },
  { label: 'Negotiation', tone: 'orange' },
  { label: 'Confirmed', tone: 'green' },
];

export function Dashboard({
  quotes = [],
  dealHealthFlags = [],
  auditLogs = [],
  userName = 'Team',
  onNavigate,
  onOpenQuote,
  onNewQuotation,
}: DashboardProps) {
  const openQuotes = quotes.filter((q) => q.status !== 'Confirmed');
  const totalPipeline = quotes.reduce((sum, q) => sum + (q.numericAmount || 0), 0);
  const confirmedCount = quotes.filter((q) => q.status === 'Confirmed').length;
  const winRate = quotes.length ? ((confirmedCount / quotes.length) * 100).toFixed(1) : '0';

  const todayStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).toUpperCase();

  return (
    <div className="content-container">
      <div className="page-heading page-heading-dashboard">
        <div>
          <span className="eyebrow">{todayStr}</span>
          <h1>
            Good day, {userName}<span className="heading-period">.</span>
          </h1>
          <p>Here&apos;s live telemetry from your database across all deals, stock, and orders.</p>
        </div>
        <button className="button button-primary" onClick={onNewQuotation}>
          <Plus size={17} /> New quotation
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Open quotations"
          value={String(openQuotes.length)}
          detail={`Total deals: ${quotes.length}`}
          trend={`${openQuotes.length > 0 ? '+' : ''}${openQuotes.length}`}
          icon={FileCheck2}
          iconTone="icon-blue"
          bars={[35, 52, 42, 64, 54, 74, 82]}
        />
        <MetricCard
          label="Pipeline value"
          value={`$${(totalPipeline / 1000).toFixed(1)}k`}
          detail={`$${totalPipeline.toLocaleString()} total`}
          trend="+16.8%"
          icon={CircleDollarSign}
          iconTone="icon-violet"
          bars={[40, 38, 54, 50, 68, 62, 86]}
        />
        <MetricCard
          label="Active flags"
          value={String(dealHealthFlags.length)}
          detail="Deal health flags"
          trend={`${dealHealthFlags.length} flags`}
          positive={dealHealthFlags.length === 0}
          icon={Clock3}
          iconTone="icon-amber"
          bars={[78, 68, 62, 58, 50, 44, 37]}
        />
        <MetricCard
          label="Win rate"
          value={`${winRate}%`}
          detail={`${confirmedCount} deals closed`}
          trend="+10.1%"
          icon={TrendingUp}
          iconTone="icon-green"
          bars={[35, 40, 49, 52, 64, 70, 84]}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel pipeline-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">DEAL PIPELINE</span>
              <h2>Quotation flow</h2>
            </div>
            <button className="link-button" onClick={() => onNavigate('quotations')}>
              View all <ArrowRight size={15} />
            </button>
          </div>
          <div className="pipeline-summary">
            <div className="pipeline-total">
              <strong>${totalPipeline.toLocaleString()}</strong>
              <span>Total pipeline value</span>
            </div>
            <span className="pipeline-health">
              <span /> Database synced
            </span>
          </div>
          <div className="pipeline-bars">
            {stageDefs.map((stage) => {
              const stageQuotes = quotes.filter((quote) => quote.status === stage.label);
              const count = stageQuotes.length;
              const total = stageQuotes.reduce((sum, quote) => sum + quote.numericAmount, 0);
              return (
                <button
                  className="pipeline-stage"
                  key={stage.label}
                  onClick={() => onNavigate('quotations')}
                >
                  <div className="pipeline-stage-top">
                    <span>{stage.label}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className={`pipeline-bar pipeline-bar-${stage.tone}`}>
                    <span style={{ width: `${Math.max(15, count * 25)}%` }} />
                  </div>
                  <span className="pipeline-amount">${total.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel health-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">DEAL HEALTH</span>
              <h2>Needs attention</h2>
            </div>
            <span className="health-alert-count">{dealHealthFlags.length} alerts</span>
          </div>
          <div className="health-list">
            {dealHealthFlags.slice(0, 3).map((flag) => {
              const matchedQuote = quotes.find((q) => q.id === flag.quotationId);
              return (
                <button
                  className="health-item"
                  key={flag.id}
                  onClick={() => {
                    if (matchedQuote) onOpenQuote(matchedQuote);
                    else onNavigate('deal-health');
                  }}
                >
                  <span className={`health-item-icon health-icon-${flag.tone}`}>
                    {flag.tone === 'red' ? (
                      <AlertTriangle size={17} />
                    ) : flag.tone === 'orange' ? (
                      <Clock3 size={17} />
                    ) : (
                      <MessageCircle size={17} />
                    )}
                  </span>
                  <span>
                    <strong>{flag.deal}</strong>
                    <small>{flag.issue}</small>
                  </span>
                  <ArrowRight size={16} />
                </button>
              );
            })}
            {!dealHealthFlags.length && (
              <div className="empty-table" style={{ padding: '20px 0' }}>
                All deals are healthy. No active flags raised.
              </div>
            )}
          </div>
          <button
            className="panel-footer-link"
            onClick={() => onNavigate('deal-health')}
          >
            Open deal health <ArrowRight size={14} />
          </button>
        </section>
      </div>

      <div className="dashboard-grid dashboard-grid-bottom">
        <section className="panel activity-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">WORKSPACE ACTIVITY</span>
              <h2>Recent activity</h2>
            </div>
            <button className="icon-button" aria-label="Activity options">
              <MoreHorizontalIcon />
            </button>
          </div>
          <div className="activity-list">
            {auditLogs.slice(0, 4).map((activity) => (
              <div className="activity-item" key={activity.id}>
                <span className="activity-icon activity-blue">
                  <Check size={15} />
                </span>
                <div>
                  <strong>{activity.user}: {activity.action}</strong>
                  <span>{activity.entity} · {activity.reason} ({activity.timestamp})</span>
                </div>
                <ArrowRight size={15} className="activity-arrow" />
              </div>
            ))}
            {!auditLogs.length && (
              <div className="empty-table" style={{ padding: '20px 0' }}>
                No recent activity recorded yet.
              </div>
            )}
          </div>
        </section>
        <section className="panel focus-panel">
          <div className="focus-gradient" />
          <div className="focus-content">
            <span className="eyebrow eyebrow-light">DATABASE LIVE</span>
            <h2>
              Live Pipeline<br />
              Connected.
            </h2>
            <p>{openQuotes.length} active quotations in the database pipeline.</p>
            <button
              className="button button-white"
              onClick={() => onNavigate('quotations')}
            >
              Review quotations <ArrowRight size={16} />
            </button>
          </div>
          <div className="focus-orb focus-orb-one" />
          <div className="focus-orb focus-orb-two" />
        </section>
      </div>
    </div>
  );
}

