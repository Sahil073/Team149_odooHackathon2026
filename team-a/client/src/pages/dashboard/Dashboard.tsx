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
import { activities, pipelineStages, quotes } from '../../data/demoData';
import type { Quote, Screen } from '../../types';

type DashboardProps = {
  onNavigate: (screen: Screen) => void;
  onOpenQuote: (quote: Quote) => void;
  onNewQuotation: () => void;
  userName: string;
};

export function Dashboard({ onNavigate, onOpenQuote, onNewQuotation, userName }: DashboardProps) {
  return (
    <div className="content-container">
      <div className="page-heading page-heading-dashboard">
        <div>
          <span className="eyebrow">SATURDAY, SEPTEMBER 05, 2026</span>
          <h1>
            Good morning, {userName}<span className="heading-period">.</span>
          </h1>
          <p>Here&apos;s what&apos;s happening across your sales workspace.</p>
        </div>
        <button className="button button-primary" onClick={onNewQuotation}>
          <Plus size={17} /> New quotation
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard
          label="Open quotations"
          value="12"
          detail="vs. 9 last month"
          trend="+33.3%"
          icon={FileCheck2}
          iconTone="icon-blue"
          bars={[35, 52, 42, 64, 54, 74, 82]}
        />
        <MetricCard
          label="Pipeline value"
          value="$184.6k"
          detail="vs. $158k last month"
          trend="+16.8%"
          icon={CircleDollarSign}
          iconTone="icon-violet"
          bars={[40, 38, 54, 50, 68, 62, 86]}
        />
        <MetricCard
          label="Avg. approval time"
          value="4.2h"
          detail="vs. 6.8h last month"
          trend="-38.2%"
          positive={true}
          icon={Clock3}
          iconTone="icon-amber"
          bars={[78, 68, 62, 58, 50, 44, 37]}
        />
        <MetricCard
          label="Win rate"
          value="68.4%"
          detail="vs. 62.1% last month"
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
              <strong>$184,650</strong>
              <span>Total pipeline value</span>
            </div>
            <span className="pipeline-health">
              <span /> Healthy pipeline
            </span>
          </div>
          <div className="pipeline-bars">
            {pipelineStages.map((stage) => {
              const stageQuotes = quotes.filter((quote) => quote.status === stage.label);
              const total = stageQuotes.reduce(
                (sum, quote) => sum + quote.numericAmount,
                0
              );
              return (
                <button
                  className="pipeline-stage"
                  key={stage.label}
                  onClick={() => onNavigate('quotations')}
                >
                  <div className="pipeline-stage-top">
                    <span>{stage.label}</span>
                    <strong>{stage.count}</strong>
                  </div>
                  <div className={`pipeline-bar pipeline-bar-${stage.tone}`}>
                    <span style={{ width: `${Math.max(25, stage.count * 35)}%` }} />
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
            <span className="health-alert-count">3 alerts</span>
          </div>
          <div className="health-list">
            <button className="health-item" onClick={() => onOpenQuote(quotes[2])}>
              <span className="health-item-icon health-icon-orange">
                <AlertTriangle size={17} />
              </span>
              <span>
                <strong>Beta Industries</strong>
                <small>Approval waiting · 2d</small>
              </span>
              <ArrowRight size={16} />
            </button>
            <button className="health-item" onClick={() => onOpenQuote(quotes[4])}>
              <span className="health-item-icon health-icon-red">
                <Clock3 size={17} />
              </span>
              <span>
                <strong>Zenith Co</strong>
                <small>No activity · 5d</small>
              </span>
              <ArrowRight size={16} />
            </button>
            <button className="health-item" onClick={() => onOpenQuote(quotes[1])}>
              <span className="health-item-icon health-icon-blue">
                <MessageCircle size={17} />
              </span>
              <span>
                <strong>Delta LLC</strong>
                <small>Customer reply needed</small>
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
          <button
            className="panel-footer-link"
            onClick={() => onNavigate('quotations')}
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
            {activities.map((activity) => (
              <div className="activity-item" key={activity.title}>
                <span className={`activity-icon activity-${activity.tone}`}>
                  {activity.icon === 'check' ? (
                    <Check size={15} />
                  ) : activity.icon === 'message' ? (
                    <MessageCircle size={15} />
                  ) : activity.icon === 'package' ? (
                    <Package size={15} />
                  ) : (
                    <AlertTriangle size={15} />
                  )}
                </span>
                <div>
                  <strong>{activity.title}</strong>
                  <span>{activity.detail}</span>
                </div>
                <ArrowRight size={15} className="activity-arrow" />
              </div>
            ))}
          </div>
        </section>
        <section className="panel focus-panel">
          <div className="focus-gradient" />
          <div className="focus-content">
            <span className="eyebrow eyebrow-light">YOUR FOCUS TODAY</span>
            <h2>
              Keep momentum<br />
              on your best deals.
            </h2>
            <p>2 quotations are waiting for your next action.</p>
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
