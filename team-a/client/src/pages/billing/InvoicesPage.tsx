import { ArrowRight, Sparkles } from 'lucide-react';
import { ReceiptIcon } from '../../components/common/Icons';
import type { Invoice, InvoiceStatus } from '../../types';

export function InvoicesPage({
  invoices = [],
  filter,
  onFilter,
  onOpen,
}: {
  invoices?: Invoice[];
  filter: 'All' | InvoiceStatus;
  onFilter: (filter: 'All' | InvoiceStatus) => void;
  onOpen: (invoice: Invoice) => void;
}) {
  const filteredRows = filter === 'All' ? invoices : invoices.filter((invoice) => invoice.status === filter);
  const unpaid = invoices.filter((invoice) => invoice.status === 'Unpaid').length;
  const paid = invoices.filter((invoice) => invoice.status === 'Paid').length;
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div><span className="eyebrow">BILLING / INVOICES</span><h1>Invoices<span className="heading-period">.</span></h1><p>Every invoice generated from one-time and recurring orders.</p></div>
        <span className="page-context"><ReceiptIcon /> {unpaid} payments need attention</span>
      </div>
      <div className="summary-strip">
        <button className={`summary-chip chip-red ${filter === 'Unpaid' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Unpaid')}><strong>{unpaid}</strong><span>Unpaid</span></button>
        <button className={`summary-chip chip-green ${filter === 'Paid' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Paid')}><strong>{paid}</strong><span>Paid</span></button>
        <button className={`summary-chip chip-neutral ${filter === 'All' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('All')}><strong>{invoices.length}</strong><span>All invoices</span></button>
      </div>
      <div className="operations-table-panel standalone-table">
        <div className="table-scroll"><table className="operations-table"><thead><tr><th>Invoice #</th><th>Customer</th><th>Amount</th><th>Status</th><th>Due date</th><th>Source</th><th /></tr></thead><tbody>
          {filteredRows.map((invoice) => <tr key={invoice.id} onClick={() => onOpen(invoice)}><td><strong>{invoice.id}</strong><span>Generated invoice</span></td><td>{invoice.customer}</td><td className="table-amount">{invoice.amount}</td><td><span className={`invoice-status invoice-${invoice.status.toLowerCase()}`}>{invoice.status}</span></td><td>{invoice.dueDate}</td><td className="table-muted">{invoice.source}</td><td><ArrowRight size={16} /></td></tr>)}
        </tbody></table>{!filteredRows.length && <div className="empty-table">No invoices match this filter.</div>}</div>
      </div>
      <div className="operations-note"><Sparkles size={15} /><span>Click an invoice to open payment and delivery reconciliation detail.</span></div>
    </div>
  );
}
