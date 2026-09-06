import { ArrowRight, Check, MessageCircle, Package, TrendingUp, X } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import type { Quote } from '../../types';

export function QuoteDrawer({
  quote,
  onClose,
  onOpenQuotation,
}: {
  quote: Quote;
  onClose: () => void;
  onOpenQuotation?: (quote: Quote) => void;
}) {
  const products = quote.products || [];

  return (
    <div className="drawer-layer">
      <button className="drawer-scrim" onClick={onClose} aria-label="Close quotation detail" />
      <aside className="quote-drawer">
        <div className="drawer-header">
          <div>
            <span className="eyebrow">QUOTATION DETAIL</span>
            <h2>{quote.id}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close detail">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-customer">
          <span className="avatar avatar-large avatar-cyan">{quote.initials}</span>
          <div>
            <h3>{quote.customer}</h3>
            <span>
              {quote.owner} · {quote.updated}
            </span>
          </div>
        </div>
        <div className="drawer-status-row">
          <span>Current status</span>
          <StatusBadge status={quote.status} />
        </div>
        <div className="drawer-value-card">
          <span>Quotation value</span>
          <strong>{quote.amount}</strong>
          <span>
            <TrendingUp size={14} /> 18.4% margin
          </span>
        </div>

        {/* Quoted Products Summary Table inside Drawer */}
        {products.length > 0 && (
          <div className="drawer-section">
            <div className="drawer-products-header">
              <span className="eyebrow">QUOTED PRODUCTS ({products.length})</span>
            </div>
            <div className="drawer-products-table-wrap">
              <table className="drawer-products-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <div className="drawer-prod-cell">
                          <Package size={13} className="drawer-prod-icon" />
                          <div>
                            <strong>{item.name}</strong>
                            <small>{item.specifications}</small>
                          </div>
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td><strong>${item.totalPrice.toLocaleString()}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="drawer-section">
          <span className="eyebrow">DEAL HEALTH</span>
          <div className="drawer-health">
            <span className="health-check">
              <Check size={14} />
            </span>
            <div>
              <strong>{quote.health}</strong>
              <small>Pricing and timeline are on track</small>
            </div>
          </div>
        </div>

        <div className="drawer-section">
          <span className="eyebrow">NEXT ACTION</span>
          <div className="next-action">
            <span className="next-action-icon">
              <MessageCircle size={16} />
            </span>
            <div>
              <strong>
                {quote.status === 'Pending approval'
                  ? 'Review approval request'
                  : 'Follow up with customer'}
              </strong>
              <small>Suggested next step for this deal</small>
            </div>
            <ArrowRight size={16} />
          </div>
        </div>

        <button
          className="button button-primary drawer-cta"
          onClick={() => {
            if (onOpenQuotation) {
              onOpenQuotation(quote);
            }
            onClose();
          }}
        >
          Open quotation <ArrowRight size={16} />
        </button>
      </aside>
    </div>
  );
}
