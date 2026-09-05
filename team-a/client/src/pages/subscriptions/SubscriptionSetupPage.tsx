import { ArrowRight, Plus } from 'lucide-react';
import { RepeatIcon } from '../../components/common/Icons';

export function SubscriptionSetupPage({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / RECURRING BILLING</span>
          <h1>Plan setup<span className="heading-period">.</span></h1>
          <p>Define recurring plans, proration, cancellation, and credit note rules.</p>
        </div>
        <button className="button button-primary" onClick={() => onNotify('New plan form opened.')}>
          <Plus size={16} /> New plan
        </button>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RECURRING PLANS</span>
            <h2>Published billing plans</h2>
          </div>
          <span className="billing-source">3 active plans</span>
        </div>
        <div className="plan-grid">
          {[
            ['Care Plan 1yr', 'Yearly', '$780 / year'],
            ['Care Plan 2yr', 'Monthly', '$46 / month'],
            ['Support SLA', 'Quarterly', '$300 / quarter'],
          ].map(([name, cycle, amount]) => (
            <div className="plan-card" key={name}>
              <span className="plan-card-icon">
                <RepeatIcon />
              </span>
              <strong>{name}</strong>
              <small>{cycle} billing</small>
              <b>{amount}</b>
              <button className="text-button" onClick={() => onNotify(`${name} editor opened.`)}>
                Manage plan <ArrowRight size={13} />
              </button>
            </div>
          ))}
        </div>
      </section>
      <div className="config-grid">
        <section className="panel config-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">PRORATION</span>
              <h2>Mid-cycle changes</h2>
            </div>
          </div>
          <label className="toggle-row">
            <span>
              <strong>Calculate partial period credits</strong>
              <small>Apply on quantity or plan changes</small>
            </span>
            <button className="toggle toggle-on">
              <span />
            </button>
          </label>
        </section>
        <section className="panel config-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CANCELLATION</span>
              <h2>Refund policy</h2>
            </div>
          </div>
          <label className="field">
            <span>Credit unused days</span>
            <select defaultValue="Automatic">
              <option>Automatic</option>
              <option>Manual review</option>
              <option>Never</option>
            </select>
          </label>
        </section>
      </div>
    </div>
  );
}
