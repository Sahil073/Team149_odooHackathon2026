import { useState } from 'react';
import { ArrowRight, Check, CheckCircle2, Download, ReceiptText } from 'lucide-react';
import { Notice } from '../../components/common/Notice';
import type { Invoice } from '../../types';

export function InvoiceDetailPage({ invoice, onBack, onRecordPayment }: { invoice: Invoice; onBack: () => void; onRecordPayment: () => void }) {
  const [paid, setPaid] = useState(invoice.status === 'Paid');
  return (
    <div className="content-container invoice-detail-page">
      <button className="back-link" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to invoices</button>
      <div className="page-heading detail-heading"><div><span className="eyebrow">FINANCE / INVOICE DETAIL</span><h1>{invoice.id} <span className="detail-customer">({invoice.customer})</span></h1><p>{invoice.source} · Due {invoice.dueDate}</p></div><span className={`invoice-status invoice-${paid ? 'paid' : 'unpaid'}`}>{paid ? 'Paid' : 'Unpaid'}</span></div>
      <div className="detail-grid">
        <section className="panel invoice-summary-panel"><div className="panel-heading"><div><span className="eyebrow">AMOUNT DUE</span><h2>{invoice.amount}</h2></div><ReceiptText size={20} className="muted-icon" /></div><div className="invoice-meta-grid"><div><span>Customer</span><strong>{invoice.customer}</strong></div><div><span>Due date</span><strong>{invoice.dueDate}</strong></div><div><span>Payment terms</span><strong>Net 30</strong></div><div><span>Origin</span><strong>{invoice.source.split(' · ')[0]}</strong></div></div><div className="invoice-actions"><button className="button button-primary" disabled={paid} onClick={() => { setPaid(true); onRecordPayment(); }}><CheckCircle2 size={15} /> {paid ? 'Payment recorded' : 'Record payment'}</button><button className="button"><Download size={15} /> Download invoice</button></div></section>
        <section className="panel"><div className="panel-heading"><div><span className="eyebrow">RECONCILIATION</span><h2>Invoice timeline</h2></div></div><div className="timeline-list">{['Order confirmed', 'Shipped', 'Invoiced', 'Paid'].map((step, index) => <div className={`timeline-row ${paid || index < 3 ? 'timeline-complete' : ''}`} key={step}><span>{paid || index < 3 ? <Check size={12} /> : index + 1}</span><div><strong>{step}</strong><small>{paid || index < 3 ? ['Aug 22 · Q-1042', 'Aug 24 · Main Warehouse', `Aug 25 · ${invoice.id}`, 'Awaiting payment'][index] : 'Waiting for payment'}</small></div></div>)}</div></section>
      </div>
      <Notice>Payment and delivery status stay linked so Finance can reconcile the full order lifecycle.</Notice>
    </div>
  );
}
