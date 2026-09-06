import { useState, useRef } from 'react';
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  X,
  CheckCircle2,
  Calendar,
  Layers,
  Filter,
} from 'lucide-react';
import type { Quote } from '../../types';

type ReportsPageProps = {
  onNotify: (message: string) => void;
  quotes?: Quote[];
};

export function ReportsPage({ onNotify, quotes = [] }: ReportsPageProps) {
  const [period, setPeriod] = useState('This month');
  const [team, setTeam] = useState('All sales teams');
  const [approvalStatusFilter, setApprovalStatusFilter] = useState('All statuses');
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isExporting, setIsExporting] = useState<'pdf' | 'xls' | null>(null);

  // Return filtered quote rows for report
  function getReportData() {
    if (quotes && quotes.length > 0) {
      let filtered = quotes;
      if (approvalStatusFilter === 'Approved') {
        filtered = quotes.filter((q) => q.status === 'Approved' || q.status === 'Confirmed');
      } else if (approvalStatusFilter === 'Pending') {
        filtered = quotes.filter((q) => q.status === 'Pending approval');
      }
      return filtered.length > 0 ? filtered : quotes;
    }
    return [
      {
        id: 'QT-2026-001',
        customer: 'Acme Corporation',
        amount: '$142,500.00',
        status: 'Pending approval',
        owner: 'Pawan Kumar',
        updated: '2 hours ago',
      },
      {
        id: 'QT-2026-002',
        customer: 'Nexus Logistics',
        amount: '$68,200.00',
        status: 'Approved',
        owner: 'Aisha Khan',
        updated: 'Yesterday',
      },
      {
        id: 'QT-2026-003',
        customer: 'Global Hypermarket',
        amount: '$312,000.00',
        status: 'Confirmed',
        owner: 'Maya Shah',
        updated: '3 days ago',
      },
      {
        id: 'QT-2026-004',
        customer: 'Starlight Media',
        amount: '$24,000.00',
        status: 'Draft',
        owner: 'Rahul Kapoor',
        updated: 'Today',
      },
      {
        id: 'QT-2026-005',
        customer: 'Vanguard Retail',
        amount: '$85,400.00',
        status: 'Negotiation',
        owner: 'Vikram Malhotra',
        updated: 'Yesterday',
      },
    ];
  }

  const reportRows = getReportData();

  // Generate printable HTML document content
  function generateReportHtml() {
    const dateFormatted = new Date().toLocaleString();
    const rows = reportRows;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>DealFlow360 - Sales Performance Report (${period})</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            padding: 36px 44px;
            margin: 0;
            background: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .brand {
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #0f172a;
          }
          .brand span { color: #0070f3; }
          .report-title {
            font-size: 15px;
            color: #475569;
            margin-top: 5px;
            font-weight: 500;
          }
          .meta-info {
            text-align: right;
            font-size: 12px;
            color: #64748b;
            line-height: 1.6;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 30px;
          }
          .kpi-card {
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 16px 18px;
            background: #fafbfc;
          }
          .kpi-label {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .kpi-value {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            margin: 6px 0 4px;
          }
          .kpi-trend {
            font-size: 11px;
            font-weight: 600;
            color: #16a34a;
          }
          .kpi-trend.violet { color: #7c3aed; }
          .section-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 30px;
          }
          th {
            background: #f8fafc;
            color: #334155;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 700;
            padding: 10px 12px;
            text-align: left;
            border-bottom: 1px solid #cbd5e1;
            border-top: 1px solid #e2e8f0;
          }
          td {
            padding: 11px 12px;
            border-bottom: 1px solid #e2e8f0;
            color: #1e293b;
          }
          .status-badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 12px;
            font-size: 10px;
            font-weight: 600;
          }
          .status-green { background: #dcfce7; color: #15803d; }
          .status-amber { background: #fef3c7; color: #b45309; }
          .status-blue { background: #dbeafe; color: #1d4ed8; }
          .status-orange { background: #ffedd5; color: #c2410c; }
          .status-violet { background: #ede9fe; color: #6d28d9; }
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none !important; }
            @page { margin: 1.5cm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">DealFlow<span>360</span></div>
            <div class="report-title">Sales Operations &amp; Quotation Performance Report</div>
          </div>
          <div class="meta-info">
            <div><strong>Generated:</strong> ${dateFormatted}</div>
            <div><strong>Period:</strong> ${period}</div>
            <div><strong>Team Scope:</strong> ${team}</div>
            <div><strong>Status Filter:</strong> ${approvalStatusFilter}</div>
          </div>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Quotes Created</div>
            <div class="kpi-value">${rows.length > 5 ? rows.length : 42}</div>
            <div class="kpi-trend">+18.4% vs previous period</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Avg. Turnaround</div>
            <div class="kpi-value">4.2h</div>
            <div class="kpi-trend violet">38.2% faster than last month</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Top Upsell Product</div>
            <div class="kpi-value">Docking Station</div>
            <div class="kpi-trend">64% laptop attachment rate</div>
          </div>
        </div>

        <div class="section-title">Quotation Pipeline &amp; Performance Breakdown</div>
        <table>
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Customer</th>
              <th>Deal Value</th>
              <th>Status</th>
              <th>Owner</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (q: any) => `
              <tr>
                <td><strong>${q.id}</strong></td>
                <td>${q.customer}</td>
                <td><strong>${q.amount}</strong></td>
                <td>
                  <span class="status-badge ${
                    q.status === 'Confirmed'
                      ? 'status-green'
                      : q.status === 'Pending approval'
                      ? 'status-amber'
                      : q.status === 'Approved'
                      ? 'status-blue'
                      : 'status-orange'
                  }">
                    ${q.status}
                  </span>
                </td>
                <td>${q.owner || 'Sales Rep'}</td>
                <td>${q.updated || 'Recent'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>DealFlow360 Performance &amp; Governance Telemetry</div>
          <div>Confidential — For Internal Operations Use Only</div>
        </div>
      </body>
      </html>
    `;
  }

  // Print directly using hidden iframe (zero popup-block risk)
  function triggerPrint() {
    const html = generateReportHtml();
    const existingIframe = document.getElementById('dealflow-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'dealflow-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print trigger failed:', err);
      }
    }, 400);
  }

  // Export PDF: opens preview modal AND triggers print dialog
  function handleExportPDF() {
    setIsExporting('pdf');
    setShowPdfModal(true);
    triggerPrint();
    onNotify('Executive PDF Report ready. Print / Save as PDF triggered.');
    setTimeout(() => setIsExporting(null), 800);
  }

  // Export XLS: downloads formatted Microsoft Excel workbook (.xls)
  function handleExportXLS() {
    setIsExporting('xls');
    const timestamp = new Date().toISOString().slice(0, 10);
    const dateFormatted = new Date().toLocaleString();
    const rows = reportRows;

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Sales Performance</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; font-size: 11pt; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; height: 36px; vertical-align: middle; }
          .meta { color: #64748b; font-size: 10pt; height: 20px; }
          .kpi-hdr { font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1; }
          .kpi-val { font-size: 13pt; font-weight: bold; color: #0070f3; border: 1px solid #cbd5e1; }
          th { background-color: #0f172a; color: #ffffff; font-weight: bold; text-align: left; padding: 7px 10px; border: 1px solid #cbd5e1; }
          td { padding: 6px 10px; border: 1px solid #e2e8f0; }
          .section-title { font-weight: bold; font-size: 12pt; background-color: #e2e8f0; padding: 6px 10px; }
          .amount { text-align: right; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr>
            <td colspan="6" class="title">DealFlow360 &mdash; Sales Operations &amp; Quotation Performance Report</td>
          </tr>
          <tr>
            <td colspan="6" class="meta">Generated: ${dateFormatted} | Period: ${period} | Team: ${team} | Filter: ${approvalStatusFilter}</td>
          </tr>
          <tr><td colspan="6"></td></tr>
          <tr>
            <td colspan="6" class="section-title">EXECUTIVE BENCHMARKS</td>
          </tr>
          <tr>
            <td class="kpi-hdr">Quotes Created</td>
            <td class="kpi-val">${rows.length > 5 ? rows.length : 42}</td>
            <td class="kpi-hdr">Avg Turnaround</td>
            <td class="kpi-val">4.2 hours</td>
            <td class="kpi-hdr">Top Upsell</td>
            <td class="kpi-val">Docking Station</td>
          </tr>
          <tr><td colspan="6"></td></tr>
          <tr>
            <td colspan="6" class="section-title">QUOTATION PIPELINE DETAILS</td>
          </tr>
          <thead>
            <tr>
              <th>Quote ID</th>
              <th>Customer</th>
              <th>Deal Value</th>
              <th>Status</th>
              <th>Sales Owner</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r: any) => `
              <tr>
                <td><strong>${r.id}</strong></td>
                <td>${r.customer}</td>
                <td class="amount">${r.amount}</td>
                <td>${r.status}</td>
                <td>${r.owner || 'Sales Rep'}</td>
                <td>${r.updated || 'Recent'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `dealflow360-sales-report-${period.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.xls`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1200);

    onNotify(`XLS spreadsheet downloaded successfully (${fileName}).`);
    setTimeout(() => setIsExporting(null), 800);
  }

  // Download raw HTML document for archival
  function handleDownloadHtml() {
    const html = generateReportHtml();
    const timestamp = new Date().toISOString().slice(0, 10);
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dealflow360-report-${timestamp}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    onNotify('HTML executive report archive downloaded.');
  }

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">REPORTING / PERFORMANCE</span>
          <h1>
            Reports<span className="heading-period">.</span>
          </h1>
          <p>Understand quote velocity, approval time, and the products moving your pipeline.</p>
        </div>
        <div className="page-heading-actions">
          <button
            type="button"
            className={`button ${isExporting === 'pdf' ? 'loading' : ''}`}
            onClick={handleExportPDF}
            title="Export executive PDF report for printing or saving"
          >
            <Download size={15} /> Export PDF
          </button>
          <button
            type="button"
            className={`button ${isExporting === 'xls' ? 'loading' : ''}`}
            onClick={handleExportXLS}
            title="Export tabular data to XLS / Excel spreadsheet"
          >
            <Download size={15} /> Export XLS
          </button>
        </div>
      </div>

      <div className="report-filters">
        <label>
          <span>Period</span>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option>Today</option>
            <option>This week</option>
            <option>This month</option>
            <option>Custom range</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <span>Sales team</span>
          <select value={team} onChange={(event) => setTeam(event.target.value)}>
            <option>All sales teams</option>
            <option>Enterprise</option>
            <option>Commercial</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <label>
          <span>Approval status</span>
          <select
            value={approvalStatusFilter}
            onChange={(event) => setApprovalStatusFilter(event.target.value)}
          >
            <option>All statuses</option>
            <option>Approved</option>
            <option>Pending</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>

      {/* KPI Cards Grid */}
      <div className="report-card-grid">
        <div className="report-card">
          <span>Quotes created</span>
          <strong>{reportRows.length > 5 ? reportRows.length : 42}</strong>
          <small>+18.4% vs previous period</small>
          <div className="report-bars">
            {[35, 48, 40, 64, 58, 73, 88].map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="report-card">
          <span>Avg. approval time</span>
          <strong>4.2h</strong>
          <small>38.2% faster than last month</small>
          <div className="report-bars violet">
            {[78, 62, 67, 50, 44, 42, 31].map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <div className="report-card">
          <span>Top upsell product</span>
          <strong>Docking Station</strong>
          <small>Added to 64% of laptop quotes</small>
          <div className="report-bars green">
            {[20, 35, 42, 58, 62, 70, 84].map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Quotation Pipeline Breakdown Table */}
      <div className="report-table-card">
        <div className="report-table-header">
          <div className="report-table-title">
            <h3>Quotation Pipeline &amp; Performance Breakdown</h3>
            <p>Displaying {reportRows.length} quotes filtered by {period} &bull; {team} &bull; {approvalStatusFilter}</p>
          </div>
          <div className="report-table-actions">
            <button
              type="button"
              className="button button-small"
              onClick={handleExportPDF}
            >
              <Printer size={13} /> Print / PDF
            </button>
            <button
              type="button"
              className="button button-small"
              onClick={handleExportXLS}
            >
              <FileSpreadsheet size={13} /> Export XLS
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="dealflow-data-table">
            <thead>
              <tr>
                <th>Quote ID</th>
                <th>Customer</th>
                <th>Deal Amount</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((quote: any) => (
                <tr key={quote.id}>
                  <td>
                    <span className="font-mono font-bold text-slate-800">{quote.id}</span>
                  </td>
                  <td>
                    <strong>{quote.customer}</strong>
                  </td>
                  <td>
                    <strong>{quote.amount}</strong>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        quote.status === 'Confirmed'
                          ? 'status-green'
                          : quote.status === 'Pending approval'
                          ? 'status-amber'
                          : quote.status === 'Approved'
                          ? 'status-blue'
                          : 'status-orange'
                      }`}
                    >
                      {quote.status}
                    </span>
                  </td>
                  <td>{quote.owner || 'Sales Rep'}</td>
                  <td className="text-muted">{quote.updated || 'Recent'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Executive PDF Report Preview Modal */}
      {showPdfModal && (
        <div className="report-modal-backdrop" onClick={() => setShowPdfModal(false)}>
          <div className="report-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="report-modal-header">
              <div className="report-modal-title">
                <FileText size={20} className="text-blue-500" />
                <div>
                  <h4>Executive Performance Report</h4>
                  <span>Ready for Export / Print</span>
                </div>
              </div>
              <div className="report-modal-actions">
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={triggerPrint}
                  title="Open system print dialog to Save as PDF"
                >
                  <Printer size={14} /> Print / Save as PDF
                </button>
                <button
                  type="button"
                  className="button button-small"
                  onClick={handleDownloadHtml}
                  title="Download standalone HTML report"
                >
                  <Download size={14} /> Download HTML
                </button>
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPdfModal(false)}
                  title="Close Preview"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Sheet Preview */}
            <div className="report-modal-body">
              <div className="report-sheet">
                <div className="sheet-header">
                  <div>
                    <div className="sheet-brand">
                      DealFlow<span style={{ color: '#0070f3' }}>360</span>
                    </div>
                    <div className="sheet-subtitle">
                      Executive Sales Operations &amp; Quotation Performance Report
                    </div>
                  </div>
                  <div className="sheet-meta">
                    <div><strong>Date:</strong> {new Date().toLocaleDateString()}</div>
                    <div><strong>Period:</strong> {period}</div>
                    <div><strong>Scope:</strong> {team}</div>
                  </div>
                </div>

                <div className="sheet-kpis">
                  <div className="sheet-kpi-box">
                    <div className="kpi-box-label">Quotes Created</div>
                    <div className="kpi-box-val">{reportRows.length > 5 ? reportRows.length : 42}</div>
                    <div className="kpi-box-sub text-green">+18.4% velocity</div>
                  </div>
                  <div className="sheet-kpi-box">
                    <div className="kpi-box-label">Avg Approval</div>
                    <div className="kpi-box-val">4.2h</div>
                    <div className="kpi-box-sub text-violet">38.2% faster</div>
                  </div>
                  <div className="sheet-kpi-box">
                    <div className="kpi-box-label">Top Upsell</div>
                    <div className="kpi-box-val">Docking Station</div>
                    <div className="kpi-box-sub text-green">64% attach rate</div>
                  </div>
                </div>

                <div className="sheet-section-title">Quotation Pipeline Breakdown</div>
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th>Quote ID</th>
                      <th>Customer</th>
                      <th>Deal Value</th>
                      <th>Status</th>
                      <th>Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportRows.map((row: any) => (
                      <tr key={row.id}>
                        <td><strong>{row.id}</strong></td>
                        <td>{row.customer}</td>
                        <td><strong>{row.amount}</strong></td>
                        <td>{row.status}</td>
                        <td>{row.owner || 'Sales Rep'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="sheet-footer">
                  <span>DealFlow360 Executive Report Engine</span>
                  <span>Confidential &bull; Operations Telemetry</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
