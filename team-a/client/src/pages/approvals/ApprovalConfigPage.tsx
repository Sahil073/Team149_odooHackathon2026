import { Filter, Save, ShieldCheck } from 'lucide-react';

export function ApprovalConfigPage({ onNotify }: { onNotify: (message: string) => void }) {
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / GOVERNANCE</span>
          <h1>Approval setup<span className="heading-period">.</span></h1>
          <p>Configure discount ceilings and the routing rules that keep risk with the right owner.</p>
        </div>
        <button className="button button-primary" onClick={() => onNotify('Approval configuration saved.')}>
          <Save size={15} /> Save configuration
        </button>
      </div>
      <div className="config-grid">
        <section className="panel config-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CUSTOMER TIERS</span>
              <h2>Discount ceilings</h2>
            </div>
            <ShieldCheck size={19} className="muted-icon" />
          </div>
          {[
            ['Bronze', '5%'],
            ['Silver', '10%'],
            ['Gold', '15%'],
          ].map(([tier, value]) => (
            <label className="config-row" key={tier}>
              <span>
                <strong>{tier}</strong>
                <small>Maximum blended discount</small>
              </span>
              <input defaultValue={value.replace('%', '')} type="number" />
              <b>%</b>
            </label>
          ))}
        </section>
        <section className="panel config-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">CATEGORY LIMITS</span>
              <h2>Line-level ceilings</h2>
            </div>
            <Filter size={18} className="muted-icon" />
          </div>
          {[
            ['Hardware', '15%'],
            ['Services', '10%'],
            ['Subscriptions', '8%'],
          ].map(([category, value]) => (
            <label className="config-row" key={category}>
              <span>
                <strong>{category}</strong>
                <small>Maximum category discount</small>
              </span>
              <input defaultValue={value.replace('%', '')} type="number" />
              <b>%</b>
            </label>
          ))}
        </section>
      </div>
      <section className="panel routing-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">ROUTING RULES</span>
            <h2>Risk to approval chain</h2>
          </div>
          <span className="billing-source">3 active rules</span>
        </div>
        {[
          ['Within configured limit', 'No approval required', 'green'],
          ['Over limit · medium risk', 'Sales Manager', 'orange'],
          ['Over limit · high risk', 'Sales Manager → Finance', 'red'],
        ].map(([rule, route, tone]) => (
          <div className="routing-row" key={rule}>
            <span className={`routing-tag tag-${tone}`}>{rule}</span>
            <span>{route}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
