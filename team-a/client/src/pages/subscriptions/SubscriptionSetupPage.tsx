import { useState } from 'react';
import { ArrowRight, Plus, X } from 'lucide-react';
import { RepeatIcon } from '../../components/common/Icons';
import type { SubscriptionPlanItem } from '../../types';

interface SubscriptionSetupPageProps {
  plans?: SubscriptionPlanItem[];
  onCreatePlan?: (plan: { name: string; cycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY'; prorationRule?: string }) => Promise<void>;
  onNotify: (message: string) => void;
}

export function SubscriptionSetupPage({
  plans = [],
  onCreatePlan,
  onNotify,
}: SubscriptionSetupPageProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [cycle, setCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName.trim()) {
      onNotify('Please enter a plan name.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (onCreatePlan) {
        await onCreatePlan({ name: planName.trim(), cycle });
      }
      setPlanName('');
      setShowAddModal(false);
      onNotify(`Plan "${planName}" created successfully.`);
    } catch (err: any) {
      onNotify(err.message || 'Failed to create plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / RECURRING BILLING</span>
          <h1>Plan setup<span className="heading-period">.</span></h1>
          <p>Define recurring plans, proration, cancellation, and credit note rules.</p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={16} /> New plan
        </button>
      </div>

      {showAddModal && (
        <section className="panel" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Create Billing Plan</h3>
            <button type="button" onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleCreatePlan}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <label className="field" style={{ margin: 0 }}>
                <span>Plan Name</span>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Support"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  required
                />
              </label>
              <label className="field" style={{ margin: 0 }}>
                <span>Billing Frequency</span>
                <select value={cycle} onChange={(e) => setCycle(e.target.value as any)}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="button button-small" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              <button type="submit" className="button button-primary button-small" disabled={isSubmitting}>
                {isSubmitting ? 'Creating...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">RECURRING PLANS</span>
            <h2>Published billing plans</h2>
          </div>
          <span className="billing-source">{plans.length} active {plans.length === 1 ? 'plan' : 'plans'}</span>
        </div>
        <div className="plan-grid">
          {plans.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', padding: '1.5rem', textAlign: 'center' }}>
              No recurring plans defined yet.
            </p>
          ) : (
            plans.map((p) => (
              <div className="plan-card" key={p.id || p.name}>
                <span className="plan-card-icon">
                  <RepeatIcon />
                </span>
                <strong>{p.name}</strong>
                <small>{p.cycle ? p.cycle.toLowerCase() : 'monthly'} billing</small>
                <b>{p.cycle === 'YEARLY' ? 'Annual Cycle' : p.cycle === 'QUARTERLY' ? 'Quarterly Cycle' : 'Monthly Cycle'}</b>
                <button className="text-button" onClick={() => onNotify(`${p.name} details viewed.`)}>
                  Manage plan <ArrowRight size={13} />
                </button>
              </div>
            ))
          )}
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

