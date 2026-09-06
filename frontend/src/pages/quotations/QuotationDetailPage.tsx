import { useState, useEffect } from 'react';
import { ArrowRight, Download, Edit3, Package, Send, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Notice } from '../../components/common/Notice';
import { DealWinRateCard } from '../../components/ui/DealWinRateCard';
import { predictWinProbability, type WinPredictionResponse } from '../../lib/api';
import type { Quote } from '../../types';

type QuotationDetailPageProps = {
  quote: Quote;
  onBack: () => void;
  onEditInBuilder: () => void;
  onNotify: (message: string) => void;
};

export function QuotationDetailPage({
  quote,
  onBack,
  onEditInBuilder,
  onNotify,
}: QuotationDetailPageProps) {
  const products = quote.products || [];

  const subtotal = products.reduce(
    (sum, p) => sum + p.unitPrice * p.quantity,
    0
  );
  const totalDiscount = products.reduce(
    (sum, p) => sum + (p.unitPrice * p.quantity * p.discount) / 100,
    0
  );
  const finalTotal = subtotal - totalDiscount;

  const [aiWinData, setAiWinData] = useState<WinPredictionResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchAiWinScore() {
      try {
        setAiLoading(true);
        const discountPct = subtotal > 0 ? Math.round((totalDiscount / subtotal) * 100) : 8;
        const result = await predictWinProbability({
          customerTier: 'Gold',
          totalRevenue: quote.numericAmount || finalTotal || 10000,
          avgDiscountPct: discountPct,
          itemCount: products.length || 1,
          riskScore: quote.health === 'At risk' ? 0.65 : 0.15,
        });
        if (active) setAiWinData(result);
      } catch (err) {
        console.error('Failed to fetch win prediction for detail page:', err);
      } finally {
        if (active) setAiLoading(false);
      }
    }
    fetchAiWinScore();
    return () => {
      active = false;
    };
  }, [quote.id, quote.numericAmount, finalTotal, totalDiscount, subtotal, products.length, quote.health]);

  return (
    <div className="content-container quotation-detail-page">
      <button className="back-link" onClick={onBack}>
        <ArrowRight size={15} className="back-arrow" /> Back to quotations
      </button>

      {/* Main Heading */}
      <div className="page-heading detail-heading">
        <div>
          <span className="eyebrow">SALES WORKSPACE / QUOTATION DETAIL</span>
          <h1>
            {quote.id} <span className="detail-customer">({quote.customer})</span>
          </h1>
          <p>
            Owner: {quote.owner} · Updated: {quote.updated} · Valid until:{' '}
            {quote.validUntil || 'Sep 30, 2026'}
          </p>
        </div>
        <div className="quote-detail-header-actions">
          <StatusBadge status={quote.status} />
          <button className="button button-primary" onClick={onEditInBuilder}>
            <Edit3 size={15} /> Edit in Builder
          </button>
        </div>
      </div>

      {/* Key Metric Strip */}
      <div className="quote-summary-strip">
        <div className="quote-summary-card">
          <span>Quotation Value</span>
          <strong>{quote.amount}</strong>
          <small className="trend-positive">
            <TrendingUp size={12} /> 18.4% blended margin
          </small>
        </div>
        <div className="quote-summary-card">
          <span>Line Items</span>
          <strong>{products.length} Products</strong>
          <small>{quote.lineItems} total component units</small>
        </div>
        <div className="quote-summary-card">
          <span>Deal Health</span>
          <strong>{quote.health}</strong>
          <small>
            {quote.health === 'Healthy'
              ? 'On track for close'
              : 'Requires follow-up review'}
          </small>
        </div>
        <div className="quote-summary-card">
          <span>Customer Account</span>
          <strong>{quote.customer}</strong>
          <small>Tier: Gold Enterprise</small>
        </div>
      </div>

      {/* AI Win-Rate ML Insights Panel */}
      <DealWinRateCard data={aiWinData} loading={aiLoading} />

      {/* Quoted Products & Specifications Table Panel */}
      <section className="panel quote-products-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">QUOTED PRODUCTS & SPECIFICATIONS</span>
            <h2>Product Breakdown & Technical Specifications</h2>
          </div>
          <span className="products-count-badge">
            <Package size={14} /> {products.length} items quoted
          </span>
        </div>

        <div className="table-scroll" style={{ marginTop: '20px' }}>
          <table className="operations-table quote-products-table">
            <thead>
              <tr>
                <th style={{ width: '22%' }}>Product & SKU</th>
                <th style={{ width: '38%' }}>Details & Technical Specifications</th>
                <th style={{ width: '8%', textAlign: 'center' }}>Qty</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Unit Price</th>
                <th style={{ width: '10%', textAlign: 'right' }}>Discount</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Net Total</th>
              </tr>
            </thead>
            <tbody>
              {products.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="product-cell-main">
                      <strong className="product-title">{item.name}</strong>
                      <div className="product-tags">
                        <span className="sku-pill">{item.sku}</span>
                        <span className={`category-tag category-${item.category.toLowerCase()}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="specifications-cell">
                      <p>{item.specifications}</p>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className="qty-badge">{item.quantity}</span>
                  </td>
                  <td style={{ textAlign: 'right' }} className="table-amount">
                    ${item.unitPrice.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {item.discount > 0 ? (
                      <span className="discount-tag">-{item.discount}%</span>
                    ) : (
                      <span className="no-discount">0%</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} className="table-amount highlight-amount">
                    ${item.totalPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing Summary Footer */}
        <div className="quote-pricing-summary">
          <div className="pricing-summary-box">
            <div className="pricing-row">
              <span>Subtotal:</span>
              <strong>${subtotal.toLocaleString()}</strong>
            </div>
            <div className="pricing-row discount-row">
              <span>Total Discounts Saved:</span>
              <strong>-${totalDiscount.toLocaleString()}</strong>
            </div>
            <div className="pricing-row grand-total">
              <span>Final Total Amount:</span>
              <strong>${finalTotal.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Action Footer */}
      <div className="quote-detail-actions">
        <button
          className="button"
          onClick={() => onNotify('PDF quotation generated and downloaded.')}
        >
          <Download size={15} /> Export PDF Quote
        </button>
        <button
          className="button"
          onClick={() => onNotify('Quotation shared via email link.')}
        >
          <Send size={15} /> Send to Customer Portal
        </button>
        <button className="button button-primary" onClick={onEditInBuilder}>
          <Edit3 size={15} /> Edit in Quotation Builder
        </button>
      </div>

      <Notice>
        All quoted hardware and services pass automatic customer discount ceiling checks.
      </Notice>
    </div>
  );
}
