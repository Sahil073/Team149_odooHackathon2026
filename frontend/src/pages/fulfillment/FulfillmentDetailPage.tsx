import { AlertTriangle, ArrowRight, Check, Package } from 'lucide-react';
import type { FulfillmentOrder } from '../../types';

export function FulfillmentDetailPage({ order, onBack, onAccept, onManualOverride }: { order: FulfillmentOrder; onBack: () => void; onAccept: () => void; onManualOverride: () => void }) {
  const isReady = order.status === 'Ready';
  return (
    <div className="content-container fulfillment-detail-page">
      <button className="back-link" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to fulfillment</button>
      <div className="page-heading detail-heading"><div><span className="eyebrow">FULFILLMENT DETAIL</span><h1>{order.id} <span className="detail-customer">({order.customer})</span></h1><p>Recommended split based on live stock availability and shipment cost.</p></div><span className={`fulfillment-status fulfillment-${order.status.toLowerCase().replace(' ', '-')}`}>{order.status}</span></div>
      <section className="panel split-panel">
        <div className="panel-heading"><div><span className="eyebrow">RECOMMENDED WAREHOUSE SPLIT</span><h2>Ship {order.items} units across the network</h2></div><span className="sync-label"><span /> Live stock</span></div>
        <div className="split-table-wrap"><table className="risk-table split-table"><thead><tr><th>Warehouse</th><th>Qty fulfilled</th><th>Est. shipments</th><th>Shipping cost</th></tr></thead><tbody>{order.stockRows.map((row) => <tr key={row.warehouse}><td><strong>{row.warehouse}</strong></td><td>{row.quantity}</td><td>{row.shipments}</td><td>{row.cost}</td></tr>)}</tbody></table></div>
        <div className="split-total"><span>Estimated total shipping</span><strong>$71</strong></div>
      </section>
      <div className="fulfillment-callout"><AlertTriangle size={16} /><span>{isReady ? 'Suggested split accepted. The order is ready for release.' : 'Consolidate remaining backorder automatically once East Depot restocks.'}</span></div>
      <div className="detail-actions fulfillment-actions"><button className="button button-primary" disabled={isReady} onClick={onAccept}><Check size={16} /> {isReady ? 'Split accepted' : 'Accept suggested split'}</button><button className="button" onClick={onManualOverride}>Manual override <ArrowRight size={15} /></button></div>
      <div className="split-visual"><div className="split-warehouse"><span className="warehouse-icon"><Package size={17} /></span><div><strong>Main Warehouse</strong><small>{order.stockRows[0]?.quantity ?? '—'} · 1 shipment</small></div></div><ArrowRight size={18} /><div className="split-warehouse"><span className="warehouse-icon warehouse-east"><Package size={17} /></span><div><strong>East Depot</strong><small>{order.stockRows[1]?.quantity ?? '—'} · 1 shipment</small></div></div><div className="split-visual-line" /></div>
    </div>
  );
}
