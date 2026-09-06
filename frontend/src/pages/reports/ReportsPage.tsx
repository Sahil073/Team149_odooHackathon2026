import { useState } from 'react';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import type { ApprovalItem, Invoice, Product, Quote, Subscription } from '../../types';

type ReportsPageProps = {
  onNotify: (message: string) => void;
  quotes: Quote[];
  approvals: ApprovalItem[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  products: Product[];
};

// ─── XLS / CSV Export ─────────────────────────────────────────────────────────

function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportXls(
  quotes: Quote[],
  approvals: ApprovalItem[],
  subscriptions: Subscription[],
  invoices: Invoice[],
  products: Product[],
  period: string,
  team: string,
) {
  const now = new Date().toLocaleDateString('en-GB');
  let csv = `DealFlow360 — Detailed Report\r\nGenerated: ${now}   Period: ${period}   Team: ${team}\r\n\r\n`;

  // Quotations
  csv += 'QUOTATIONS\r\n';
  if (quotes.length > 0) {
    csv += buildCsv(
      ['Quote ID', 'Customer', 'Amount', 'Status', 'Owner', 'Line Items', 'Health', 'Last Updated'],
      quotes.map((q) => [q.id, q.customer, q.amount, q.status, q.owner, q.lineItems, q.health, q.updated]),
    );
  } else {
    csv += 'No quotation data available.\r\n';
  }

  csv += '\r\n\r\nAPPROVALS\r\n';
  if (approvals.length > 0) {
    csv += buildCsv(
      ['Quote ID', 'Customer', 'Risk', 'Stage', 'Assigned To', 'Status', 'Discount', 'Customer Tier', 'Submitted'],
      approvals.map((a) => [a.id, a.customer, a.risk, a.stage, a.assignedTo, a.status, a.discount, a.customerTier, a.submitted]),
    );
  } else {
    csv += 'No approval data available.\r\n';
  }

  csv += '\r\n\r\nSUBSCRIPTIONS\r\n';
  if (subscriptions.length > 0) {
    csv += buildCsv(
      ['Subscription ID', 'Customer', 'Plan', 'Cycle', 'Amount', 'Status', 'Next Bill'],
      subscriptions.map((s) => [s.id, s.customer, s.plan, s.cycle, s.amount, s.status, s.nextBill]),
    );
  } else {
    csv += 'No subscription data available.\r\n';
  }

  csv += '\r\n\r\nINVOICES\r\n';
  if (invoices.length > 0) {
    csv += buildCsv(
      ['Invoice ID', 'Customer', 'Amount', 'Status', 'Due Date', 'Source'],
      invoices.map((i) => [i.id, i.customer, i.amount, i.status, i.dueDate, i.source]),
    );
  } else {
    csv += 'No invoice data available.\r\n';
  }

  csv += '\r\n\r\nPRODUCTS\r\n';
  if (products.length > 0) {
    csv += buildCsv(
      ['Product ID', 'Name', 'Category', 'Price', 'Unit', 'Tax', 'Status', 'Qty on Hand'],
      products.map((p) => [p.id, p.name, p.category, p.price, p.unit, p.tax, p.status, p.quantityOnHand]),
    );
  } else {
    csv += 'No product data available.\r\n';
  }

  downloadFile(csv, `dealflow360-report-${now.replace(/\//g, '-')}.csv`, 'text/csv;charset=utf-8;');
}

// ─── PDF Export (print-based) ──────────────────────────────────────────────────

function exportPdf(
  quotes: Quote[],
  approvals: ApprovalItem[],
  subscriptions: Subscription[],
  invoices: Invoice[],
  products: Product[],
  period: string,
  team: string,
) {
  const now = new Date().toLocaleDateString('en-GB');

  const tableHtml = (headers: string[], rows: (string | number)[][]) => `
    <table>
      <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>DealFlow360 Report — ${period}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #0f172a; padding: 32px 40px; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
    .report-brand { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .report-meta { text-align: right; color: #475569; font-size: 10px; line-height: 1.6; }
    .report-meta strong { display: block; font-size: 13px; color: #0f172a; margin-bottom: 2px; }
    .section { margin-bottom: 28px; page-break-inside: avoid; }
    .section-title { font-size: 11px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #f8fafc; }
    th { text-align: left; padding: 6px 8px; font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid #e2e8f0; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; font-size: 10.5px; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .empty { color: #94a3b8; font-style: italic; padding: 8px; font-size: 10px; }
    .summary-row { display: flex; gap: 20px; margin-bottom: 20px; }
    .summary-card { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .summary-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
    .summary-card .value { font-size: 22px; font-weight: 700; color: #0f172a; margin: 4px 0 2px; }
    .summary-card .sub { font-size: 9.5px; color: #64748b; }
    @media print {
      body { padding: 20px 28px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div class="report-brand">DealFlow360</div>
    <div class="report-meta">
      <strong>Performance Report</strong>
      Period: ${period} &nbsp;·&nbsp; Team: ${team}<br/>
      Generated: ${now}
    </div>
  </div>

  <div class="summary-row">
    <div class="summary-card">
      <div class="label">Total Quotes</div>
      <div class="value">${quotes.length}</div>
      <div class="sub">${quotes.filter(q => q.status === 'Confirmed').length} confirmed</div>
    </div>
    <div class="summary-card">
      <div class="label">Pending Approvals</div>
      <div class="value">${approvals.filter(a => a.status === 'Pending').length}</div>
      <div class="sub">${approvals.length} total approvals</div>
    </div>
    <div class="summary-card">
      <div class="label">Active Subscriptions</div>
      <div class="value">${subscriptions.filter(s => s.status === 'Active').length}</div>
      <div class="sub">${subscriptions.length} total</div>
    </div>
    <div class="summary-card">
      <div class="label">Unpaid Invoices</div>
      <div class="value">${invoices.filter(i => i.status === 'Unpaid').length}</div>
      <div class="sub">${invoices.length} total invoices</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Quotations</div>
    ${quotes.length > 0
      ? tableHtml(
          ['Quote ID', 'Customer', 'Amount', 'Status', 'Owner', 'Items', 'Health', 'Updated'],
          quotes.map(q => [q.id, q.customer, q.amount, q.status, q.owner, q.lineItems, q.health, q.updated]),
        )
      : '<p class="empty">No quotation data available.</p>'}
  </div>

  <div class="section">
    <div class="section-title">Approvals</div>
    ${approvals.length > 0
      ? tableHtml(
          ['Quote ID', 'Customer', 'Risk', 'Stage', 'Assigned To', 'Status', 'Discount', 'Tier', 'Submitted'],
          approvals.map(a => [a.id, a.customer, a.risk, a.stage, a.assignedTo, a.status, a.discount, a.customerTier, a.submitted]),
        )
      : '<p class="empty">No approval data available.</p>'}
  </div>

  <div class="section">
    <div class="section-title">Subscriptions</div>
    ${subscriptions.length > 0
      ? tableHtml(
          ['ID', 'Customer', 'Plan', 'Cycle', 'Amount', 'Status', 'Next Bill'],
          subscriptions.map(s => [s.id, s.customer, s.plan, s.cycle, s.amount, s.status, s.nextBill]),
        )
      : '<p class="empty">No subscription data available.</p>'}
  </div>

  <div class="section">
    <div class="section-title">Invoices</div>
    ${invoices.length > 0
      ? tableHtml(
          ['Invoice ID', 'Customer', 'Amount', 'Status', 'Due Date', 'Source'],
          invoices.map(i => [i.id, i.customer, i.amount, i.status, i.dueDate, i.source]),
        )
      : '<p class="empty">No invoice data available.</p>'}
  </div>

  <div class="section">
    <div class="section-title">Products</div>
    ${products.length > 0
      ? tableHtml(
          ['ID', 'Name', 'Category', 'Price', 'Unit', 'Tax', 'Status', 'Qty on Hand'],
          products.map(p => [p.id, p.name, p.category, p.price, p.unit, p.tax, p.status, p.quantityOnHand]),
        )
      : '<p class="empty">No product data available.</p>'}
  </div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Please allow popups to export PDF.'); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the new window time to render then trigger print dialog
  setTimeout(() => {
    win.print();
  }, 400);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ReportsPage({ onNotify, quotes, approvals, subscriptions, invoices, products }: ReportsPageProps) {
  const [period, setPeriod] = useState('This month');
  const [team, setTeam] = useState('All sales teams');
  const [exporting, setExporting] = useState<'pdf' | 'xls' | null>(null);

  function handleExportXls() {
    setExporting('xls');
    try {
      exportXls(quotes, approvals, subscriptions, invoices, products, period, team);
      onNotify('XLS report downloaded — open the .csv file in Excel.');
    } finally {
      setExporting(null);
    }
  }

  function handleExportPdf() {
    setExporting('pdf');
    try {
      exportPdf(quotes, approvals, subscriptions, invoices, products, period, team);
      onNotify('PDF report opened — use your browser\'s print dialog to save as PDF.');
    } finally {
      setExporting(null);
    }
  }

  // Summary stats for the UI cards
  const totalRevenue = invoices
    .filter((i) => i.status === 'Paid')
    .reduce((sum, i) => sum + parseFloat(i.amount.replace(/[^0-9.]/g, '') || '0'), 0);

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">REPORTING / PERFORMANCE</span>
          <h1>Reports<span className="heading-period">.</span></h1>
          <p>Understand quote velocity, approval time, and the products moving your pipeline.</p>
        </div>
        <div className="page-heading-actions">
          <button
            id="export-pdf-button"
            className="button"
            onClick={handleExportPdf}
            disabled={exporting === 'pdf'}
            title="Export full report as PDF"
          >
            <FileText size={15} />
            {exporting === 'pdf' ? 'Preparing…' : 'Export PDF'}
          </button>
          <button
            id="export-xls-button"
            className="button"
            onClick={handleExportXls}
            disabled={exporting === 'xls'}
            title="Export full report as Excel / CSV"
          >
            <FileSpreadsheet size={15} />
            {exporting === 'xls' ? 'Preparing…' : 'Export XLS'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="report-filters">
        <label>
          <span>Period</span>
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option>Today</option>
            <option>This week</option>
            <option>This month</option>
            <option>This quarter</option>
            <option>This year</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <span>Sales team</span>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option>All sales teams</option>
            <option>Enterprise</option>
            <option>Commercial</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <span>Approval status</span>
          <select>
            <option>All statuses</option>
            <option>Approved</option>
            <option>Pending</option>
            <option>Rejected</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      {/* KPI Cards */}
      <div className="report-card-grid">
        <div className="report-card">
          <span>Quotes created</span>
          <strong>{quotes.length || 42}</strong>
          <small>
            {quotes.filter((q) => q.status === 'Confirmed').length} confirmed
            {quotes.length === 0 && ' · demo data'}
          </small>
          <div className="report-bars">
            {[35, 48, 40, 64, 58, 73, 88].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="report-card">
          <span>Avg. approval time</span>
          <strong>4.2h</strong>
          <small>
            {approvals.filter((a) => a.status === 'Pending').length} pending approvals
          </small>
          <div className="report-bars violet">
            {[78, 62, 67, 50, 44, 42, 31].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="report-card">
          <span>Revenue collected</span>
          <strong>
            {totalRevenue > 0
              ? `$${totalRevenue.toLocaleString()}`
              : `$${(84200).toLocaleString()}`}
          </strong>
          <small>
            {invoices.filter((i) => i.status === 'Unpaid').length} invoice{invoices.filter(i => i.status === 'Unpaid').length !== 1 ? 's' : ''} unpaid
          </small>
          <div className="report-bars green">
            {[20, 35, 42, 58, 62, 70, 84].map((height, i) => (
              <i key={i} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Data preview tables */}
      <div className="report-tables">
        {/* Quotations preview */}
        {quotes.length > 0 && (
          <div className="report-table-section">
            <div className="report-table-header">
              <span className="report-table-title">Recent Quotations</span>
              <span className="report-table-count">{quotes.length} total</span>
            </div>
            <div className="report-table-wrap">
              <table className="report-data-table">
                <thead>
                  <tr>
                    <th>Quote ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Owner</th>
                    <th>Health</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.slice(0, 8).map((q) => (
                    <tr key={q.id}>
                      <td className="report-td-mono">{q.id}</td>
                      <td>{q.customer}</td>
                      <td className="report-td-amount">{q.amount}</td>
                      <td>
                        <span className={`report-status-badge report-status-${q.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {q.status}
                        </span>
                      </td>
                      <td>{q.owner}</td>
                      <td>
                        <span className={`report-health report-health-${q.health.toLowerCase().replace(/\s+/g, '-')}`}>
                          {q.health}
                        </span>
                      </td>
                      <td className="report-td-muted">{q.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Invoices preview */}
        {invoices.length > 0 && (
          <div className="report-table-section">
            <div className="report-table-header">
              <span className="report-table-title">Invoices</span>
              <span className="report-table-count">{invoices.length} total · {invoices.filter(i => i.status === 'Unpaid').length} unpaid</span>
            </div>
            <div className="report-table-wrap">
              <table className="report-data-table">
                <thead>
                  <tr>
                    <th>Invoice ID</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.slice(0, 6).map((inv) => (
                    <tr key={inv.id}>
                      <td className="report-td-mono">{inv.id}</td>
                      <td>{inv.customer}</td>
                      <td className="report-td-amount">{inv.amount}</td>
                      <td>
                        <span className={`report-status-badge report-status-${inv.status.toLowerCase()}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="report-td-muted">{inv.dueDate}</td>
                      <td className="report-td-muted">{inv.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {(quotes.length === 0 && invoices.length === 0) && (
        <div className="report-offline-note">
          <Download size={18} />
          <span>Connect to the backend to load live data. The export will include all available records.</span>
        </div>
      )}
    </div>
  );
}
