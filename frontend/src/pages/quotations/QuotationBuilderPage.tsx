import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ArrowRight, Check, Package, Plus, Save, Send, Sparkles, TrendingUp, X } from 'lucide-react';
import { Notice } from '../../components/common/Notice';
import { DealWinRateCard } from '../../components/ui/DealWinRateCard';
import { predictWinProbability, type WinPredictionResponse } from '../../lib/api';
import type { Customer, Product } from '../../types';

type BuilderLine = {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  discount: number;
  unit: string;
};

export function QuotationBuilderPage({
  productsList = [],
  customersList = [],
  onBack,
  onSave,
  onSubmit,
  onConfirm,
}: {
  productsList?: Product[];
  customersList?: Customer[];
  onBack: () => void;
  onSave: (customerId: string, lines: Array<{ productId: string; qty: number; discountPct: number }>) => void;
  onSubmit: (customerId: string, lines: Array<{ productId: string; qty: number; discountPct: number }>) => void;
  onConfirm: (customerId: string, lines: Array<{ productId: string; qty: number; discountPct: number }>) => void;
}) {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customersList[0]?.id || '');
  const [lines, setLines] = useState<BuilderLine[]>(() => {
    if (productsList.length > 0) {
      return [
        {
          id: productsList[0].id,
          name: productsList[0].name,
          category: productsList[0].category,
          price: productsList[0].numericPrice,
          quantity: 2,
          discount: 0,
          unit: productsList[0].unit,
        },
      ];
    }
    return [];
  });
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [aiWinData, setAiWinData] = useState<WinPredictionResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const selectedCustomer = customersList.find((c) => c.id === selectedCustomerId) || customersList[0];

  const total =
    lines.reduce((sum, line) => sum + line.price * line.quantity * (1 - line.discount / 100), 0) *
    (1 - orderDiscount / 100);
  const margin = Math.max(
    8,
    32 - orderDiscount - lines.reduce((sum, line) => sum + line.discount, 0) / Math.max(lines.length, 1)
  );

  const avgDiscountPct = lines.length
    ? lines.reduce((sum, l) => sum + l.discount, 0) / lines.length + orderDiscount
    : orderDiscount;

  const fetchAiPrediction = useCallback(async () => {
    try {
      setAiLoading(true);
      const tier = selectedCustomer?.tier || 'SILVER';
      const result = await predictWinProbability({
        customerTier: tier,
        totalRevenue: total,
        avgDiscountPct: Math.round(avgDiscountPct),
        itemCount: lines.length,
        riskScore: lines.some((l) => l.discount > 10) ? 0.45 : 0.12,
      });
      setAiWinData(result);
    } catch (err) {
      console.error('Failed to fetch win prediction:', err);
    } finally {
      setAiLoading(false);
    }
  }, [selectedCustomer?.tier, total, avgDiscountPct, lines.length]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAiPrediction();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchAiPrediction]);

  function addProduct(product: Product) {
    setLines((current) =>
      current.some((line) => line.id === product.id)
        ? current.map((line) => (line.id === product.id ? { ...line, quantity: line.quantity + 1 } : line))
        : [
            ...current,
            {
              id: product.id,
              name: product.name,
              category: product.category,
              price: product.numericPrice,
              quantity: 1,
              discount: 0,
              unit: product.unit,
            },
          ]
    );
  }

  function updateLine(id: string, field: 'quantity' | 'discount', value: number) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, [field]: Math.max(0, value) } : line))
    );
  }

  function getLinesPayload() {
    return lines.map((l) => ({
      productId: l.id,
      qty: l.quantity,
      discountPct: l.discount,
    }));
  }

  const effectiveCustomerId = selectedCustomerId || customersList[0]?.id || '';

  return (
    <div className="content-container builder-page">
      <button className="back-link" onClick={onBack}>
        <ArrowRight size={15} className="back-arrow" /> Back to quotations
      </button>
      <div className="page-heading detail-heading">
        <div>
          <span className="eyebrow">SALES WORKSPACE / QUOTATION BUILDER</span>
          <h1>
            Build a quotation<span className="heading-period">.</span>
          </h1>
          <p>Draft quotation terms from database catalog and see pricing and risk update live.</p>
        </div>
        <span className="draft-pill">
          <span /> New Database Draft
        </span>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ fontWeight: 600, fontSize: '0.9rem' }}>Customer Account:</label>
        <select
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            border: '1px solid var(--border-color, #e2e8f0)',
            background: 'var(--card-bg, #fff)',
            fontSize: '0.9rem',
          }}
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
        >
          {customersList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.tier} Tier) - {c.email}
            </option>
          ))}
        </select>
      </div>

      <div className="builder-layout">
        <section className="panel builder-catalog">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">DATABASE CATALOG</span>
              <h2>Add products and services</h2>
            </div>
            <span className="catalog-count-badge">{productsList.length} products available</span>
          </div>
          <div className="catalog-list">
            {productsList.map((product) => (
              <button className="catalog-item" key={product.id} onClick={() => addProduct(product)}>
                <span className="catalog-icon">
                  <Package size={16} />
                </span>
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.category} · {product.price} / {product.unit} (In stock: {product.quantityOnHand})
                  </small>
                </span>
                <Plus size={16} />
              </button>
            ))}
            {!productsList.length && (
              <div className="empty-table">No products found in the database.</div>
            )}
          </div>
          {productsList.length > 1 && (
            <div className="suggestion-card">
              <div className="suggestion-heading">
                <span className="suggestion-icon">
                  <Sparkles size={15} />
                </span>
                <div>
                  <span className="eyebrow">UPSELL RECOMMENDATION</span>
                  <strong>{productsList[1].name}</strong>
                </div>
              </div>
              <p>
                Frequently paired with primary orders. Adds <b>{productsList[1].price}</b> and maintains healthy blended
                margin.
              </p>
              <div>
                <button className="button button-small" onClick={() => addProduct(productsList[1])}>
                  <Plus size={14} /> Add to quote
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="panel builder-lines">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">QUOTE LINES · {lines.length}</span>
              <h2>{selectedCustomer?.name || 'Customer'}</h2>
            </div>
            <span className={`margin-badge ${margin < 15 ? 'margin-warning' : ''}`}>
              <TrendingUp size={14} /> {margin.toFixed(1)}% margin
            </span>
          </div>
          <div className="builder-line-table">
            <div className="builder-line-head">
              <span>Product</span>
              <span>Qty</span>
              <span>Discount</span>
              <span>Net amount</span>
              <span />
            </div>
            {lines.map((line) => (
              <div className="builder-line-row" key={line.id}>
                <span>
                  <strong>{line.name}</strong>
                  <small>{line.category}</small>
                </span>
                <span className="stepper">
                  <button
                    onClick={() => updateLine(line.id, 'quantity', line.quantity - 1)}
                    aria-label={`Decrease ${line.name}`}
                  >
                    −
                  </button>
                  <b>{line.quantity}</b>
                  <button
                    onClick={() => updateLine(line.id, 'quantity', line.quantity + 1)}
                    aria-label={`Increase ${line.name}`}
                  >
                    +
                  </button>
                </span>
                <label className="compact-input">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={line.discount}
                    onChange={(event) => updateLine(line.id, 'discount', Number(event.target.value))}
                  />
                  <span>%</span>
                </label>
                <strong>${(line.price * line.quantity * (1 - line.discount / 100)).toLocaleString()}</strong>
                <button
                  className="icon-button compact-remove"
                  onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                  aria-label={`Remove ${line.name}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {!lines.length && (
              <div className="empty-table">No line items added yet. Click a product on the left to add it.</div>
            )}
          </div>
          <div className="builder-summary">
            <span>Subtotal</span>
            <strong>
              {(() => {
                const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity * (1 - line.discount / 100), 0);
                return `₹${subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
              })()}
            </strong>
            <label>
              Order discount{' '}
              <span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={orderDiscount}
                  onChange={(event) => setOrderDiscount(Number(event.target.value))}
                />
                %
              </span>
            </label>
            <span className="builder-total-label">Total</span>
            <strong className="builder-total">₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
          </div>
          {lines.some((line) => line.discount > 10) && (
            <div className="risk-callout">
              <AlertTriangle size={15} />
              <span>One or more line discounts exceed standard tier limit. This quote will route for approval.</span>
            </div>
          )}

          {/* AI Win-Rate ML Predictor Widget */}
          <DealWinRateCard
            data={aiWinData}
            loading={aiLoading}
            onRefresh={fetchAiPrediction}
          />

          <div className="builder-actions">
            <button
              className="button"
              onClick={() => onSave(effectiveCustomerId, getLinesPayload())}
              disabled={!lines.length}
            >
              <Save size={15} /> Save draft
            </button>
            <button
              className="button button-primary"
              onClick={() => onSubmit(effectiveCustomerId, getLinesPayload())}
              disabled={!lines.length}
            >
              <Send size={15} /> Submit for approval
            </button>
            <button
              className="button button-success"
              onClick={() => onConfirm(effectiveCustomerId, getLinesPayload())}
              disabled={!lines.length}
            >
              <Check size={15} /> Confirm & fulfill
            </button>
          </div>
        </section>
      </div>
      <Notice>
        Quotes are saved directly to the database. Lines with discounts exceeding tier ceilings trigger automatic approval routing.
      </Notice>
    </div>
  );
}

