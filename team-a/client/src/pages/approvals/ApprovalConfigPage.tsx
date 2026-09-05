import { useState, useEffect } from 'react';
import { Filter, Save, ShieldCheck } from 'lucide-react';
import { getDiscountConfig, saveDiscountTier, saveCategoryDiscount, getApprovalChains } from '../../lib/api';
import type { ApprovalRule } from '../../types';

interface ApprovalConfigPageProps {
  onNotify: (message: string) => void;
}

export function ApprovalConfigPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [tiers, setTiers] = useState<Record<string, number>>({
    Bronze: 5,
    Silver: 10,
    Gold: 15,
  });
  const [categories, setCategories] = useState<Record<string, number>>({
    HARDWARE: 15,
    SERVICES: 10,
    SUBSCRIPTIONS: 8,
  });
  const [approvalRules, setApprovalRules] = useState<ApprovalRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [discountRes, chainsRes] = await Promise.all([
        getDiscountConfig().catch(() => null),
        getApprovalChains().catch(() => null),
      ]);

      if (discountRes?.data) {
        if (discountRes.data.discountTiers && discountRes.data.discountTiers.length > 0) {
          const tMap: Record<string, number> = { Bronze: 5, Silver: 10, Gold: 15 };
          discountRes.data.discountTiers.forEach((t) => {
            tMap[t.tierName] = t.maxDiscountPct;
          });
          setTiers(tMap);
        }
        if (discountRes.data.categoryLimits && discountRes.data.categoryLimits.length > 0) {
          const cMap: Record<string, number> = { HARDWARE: 15, SERVICES: 10, SUBSCRIPTIONS: 8 };
          discountRes.data.categoryLimits.forEach((c) => {
            cMap[c.category] = c.maxDiscountPct;
          });
          setCategories(cMap);
        }
      }

      if (chainsRes?.data && chainsRes.data.length > 0) {
        setApprovalRules(chainsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load approval config', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const promises: Promise<any>[] = [];
      for (const [tierName, pct] of Object.entries(tiers)) {
        promises.push(saveDiscountTier(tierName, Number(pct)));
      }
      for (const [cat, pct] of Object.entries(categories)) {
        promises.push(saveCategoryDiscount(cat, Number(pct)));
      }
      await Promise.all(promises);
      onNotify('Approval and discount configuration saved to database.');
    } catch (err: any) {
      onNotify(err.message || 'Failed to save configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / GOVERNANCE</span>
          <h1>Approval setup<span className="heading-period">.</span></h1>
          <p>Configure discount ceilings and the routing rules that keep risk with the right owner.</p>
        </div>
        <button className="button button-primary" onClick={handleSave} disabled={saving}>
          <Save size={15} /> {saving ? 'Saving...' : 'Save configuration'}
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
          {Object.entries(tiers).map(([tier, value]) => (
            <label className="config-row" key={tier}>
              <span>
                <strong>{tier}</strong>
                <small>Maximum blended discount</small>
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={value}
                onChange={(e) =>
                  setTiers((prev) => ({
                    ...prev,
                    [tier]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  }))
                }
              />
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
          {Object.entries(categories).map(([category, value]) => (
            <label className="config-row" key={category}>
              <span>
                <strong>{category.charAt(0) + category.slice(1).toLowerCase()}</strong>
                <small>Maximum category discount</small>
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={value}
                onChange={(e) =>
                  setCategories((prev) => ({
                    ...prev,
                    [category]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                  }))
                }
              />
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
          <span className="billing-source">
            {approvalRules.length > 0 ? `${approvalRules.length} active rules` : 'Default rules'}
          </span>
        </div>

        {approvalRules.length > 0 ? (
          approvalRules.map((rule, idx) => {
            const route =
              rule.requiresManager && rule.requiresFinance
                ? 'Sales Manager → Finance'
                : rule.requiresManager
                ? 'Sales Manager'
                : 'No approval required';
            const tone = rule.requiresFinance ? 'red' : rule.requiresManager ? 'orange' : 'green';
            return (
              <div className="routing-row" key={rule.id || idx}>
                <span className={`routing-tag tag-${tone}`}>
                  {rule.discountRangeMin}% – {rule.discountRangeMax}% discount
                </span>
                <span>{route}</span>
              </div>
            );
          })
        ) : (
          [
            ['Within configured limit (0 - 10%)', 'No approval required', 'green'],
            ['Over limit (11 - 15%) · medium risk', 'Sales Manager', 'orange'],
            ['Over limit (> 15%) · high risk', 'Sales Manager → Finance', 'red'],
          ].map(([rule, route, tone]) => (
            <div className="routing-row" key={rule}>
              <span className={`routing-tag tag-${tone}`}>{rule}</span>
              <span>{route}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

