import { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Package, Plus, Save, Send, Settings2, Sparkles, TrendingUp, X } from 'lucide-react';
import { Notice } from '../../components/common/Notice';

const builderProducts = [
  { id: 'laptop', name: 'Laptop Pro 14', category: 'Hardware', price: 1140, unit: 'each' },
  { id: 'dock', name: 'Docking Station', category: 'Hardware', price: 180, unit: 'each' },
  { id: 'setup', name: 'Onsite Setup', category: 'Services', price: 450, unit: 'session' },
  { id: 'care', name: 'Care Plan 2yr', category: 'Subscriptions', price: 46, unit: 'month' },
];

type BuilderLine = { id: string; name: string; category: string; price: number; quantity: number; discount: number; unit: string };

export function QuotationBuilderPage({ onBack, onSave, onSubmit, onConfirm }: { onBack: () => void; onSave: () => void; onSubmit: () => void; onConfirm: () => void }) {
  const [lines, setLines] = useState<BuilderLine[]>([
    { ...builderProducts[0], quantity: 2, discount: 0 },
    { ...builderProducts[2], quantity: 1, discount: 10 },
  ]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity * (1 - line.discount / 100), 0) * (1 - orderDiscount / 100);
  const margin = Math.max(8, 32 - orderDiscount - lines.reduce((sum, line) => sum + line.discount, 0) / Math.max(lines.length, 1));

  function addProduct(id: string) {
    const product = builderProducts.find((item) => item.id === id);
    if (!product) return;
    setLines((current) => current.some((line) => line.id === id)
      ? current.map((line) => line.id === id ? { ...line, quantity: line.quantity + 1 } : line)
      : [...current, { ...product, quantity: 1, discount: 0 }]);
  }

  function updateLine(id: string, field: 'quantity' | 'discount', value: number) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, [field]: Math.max(0, value) } : line));
  }

  return (
    <div className="content-container builder-page">
      <button className="back-link" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to quotations</button>
      <div className="page-heading detail-heading">
        <div><span className="eyebrow">SALES WORKSPACE / QUOTATION BUILDER</span><h1>Build a quotation<span className="heading-period">.</span></h1><p>Draft terms for Acme Corporation and see pricing, margin, and risk update live.</p></div>
        <span className="draft-pill"><span /> Draft · Q-1043</span>
      </div>
      <div className="builder-layout">
        <section className="panel builder-catalog">
          <div className="panel-heading"><div><span className="eyebrow">PRODUCT CATALOG</span><h2>Add products and services</h2></div><button className="icon-button" aria-label="Catalog settings"><Settings2 size={17} /></button></div>
          <div className="catalog-list">{builderProducts.map((product) => <button className="catalog-item" key={product.id} onClick={() => addProduct(product.id)}><span className="catalog-icon"><Package size={16} /></span><span><strong>{product.name}</strong><small>{product.category} · ${product.price.toLocaleString()} / {product.unit}</small></span><Plus size={16} /></button>)}</div>
          <div className="suggestion-card"><div className="suggestion-heading"><span className="suggestion-icon"><Sparkles size={15} /></span><div><span className="eyebrow">UPSELL SUGGESTION</span><strong>Pair a Docking Station</strong></div></div><p>Customers buying Laptop Pro 14 add this accessory 64% of the time. Adds <b>$180</b> and keeps margin above 20%.</p><div><button className="button button-small" onClick={() => addProduct('dock')}><Plus size={14} /> Add to quote</button><button className="text-button">Dismiss</button></div></div>
        </section>
        <section className="panel builder-lines">
          <div className="panel-heading"><div><span className="eyebrow">QUOTE LINES · {lines.length}</span><h2>Acme Corporation</h2></div><span className={`margin-badge ${margin < 15 ? 'margin-warning' : ''}`}><TrendingUp size={14} /> {margin.toFixed(1)}% margin</span></div>
          <div className="builder-line-table"><div className="builder-line-head"><span>Product</span><span>Qty</span><span>Discount</span><span>Net amount</span><span /></div>{lines.map((line) => <div className="builder-line-row" key={line.id}><span><strong>{line.name}</strong><small>{line.category}</small></span><span className="stepper"><button onClick={() => updateLine(line.id, 'quantity', line.quantity - 1)} aria-label={`Decrease ${line.name}`}>−</button><b>{line.quantity}</b><button onClick={() => updateLine(line.id, 'quantity', line.quantity + 1)} aria-label={`Increase ${line.name}`}>+</button></span><label className="compact-input"><input type="number" min="0" max="100" value={line.discount} onChange={(event) => updateLine(line.id, 'discount', Number(event.target.value))} /><span>%</span></label><strong>${(line.price * line.quantity * (1 - line.discount / 100)).toLocaleString()}</strong><button className="icon-button compact-remove" onClick={() => setLines((current) => current.filter((item) => item.id !== line.id))} aria-label={`Remove ${line.name}`}><X size={14} /></button></div>)}</div>
          <div className="builder-summary"><span>Subtotal</span><strong>${lines.reduce((sum, line) => sum + line.price * line.quantity * (1 - line.discount / 100), 0).toLocaleString()}</strong><label>Order discount <span><input type="number" min="0" max="100" value={orderDiscount} onChange={(event) => setOrderDiscount(Number(event.target.value))} />%</span></label><span className="builder-total-label">Total</span><strong className="builder-total">${total.toLocaleString()}</strong></div>
          {lines.some((line) => line.discount > 10) && <div className="risk-callout"><AlertTriangle size={15} /><span>One or more line discounts exceed the Gold customer tier limit. This quote will route for approval.</span></div>}
          <div className="builder-actions"><button className="button" onClick={onSave}><Save size={15} /> Save draft</button><button className="button button-primary" onClick={onSubmit}><Send size={15} /> Submit for approval</button><button className="button button-success" onClick={onConfirm}><Check size={15} /> Confirm & fulfill</button></div>
        </section>
      </div>
      <Notice>Save a draft at any time. Quotes under the configured discount ceilings can be confirmed directly into fulfillment.</Notice>
    </div>
  );
}
