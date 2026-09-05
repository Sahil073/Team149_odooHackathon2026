import { ArrowRight, ChevronDown, Filter, Search, Sparkles } from 'lucide-react';
import { ShieldIcon } from '../../components/common/Icons';
import type { ApprovalItem, ApprovalStatus } from '../../types';

type ApprovalsPageProps = {
  approvals: ApprovalItem[];
  filter: 'All' | ApprovalStatus;
  search: string;
  onFilter: (filter: 'All' | ApprovalStatus) => void;
  onSearch: (value: string) => void;
  onOpen: (approval: ApprovalItem) => void;
};

export function ApprovalsPage({ approvals: rows, filter, search, onFilter, onSearch, onOpen }: ApprovalsPageProps) {
  const filteredRows = rows.filter((row) => {
    const query = search.toLowerCase().trim();
    return (filter === 'All' || row.status === filter) &&
      (!query || row.customer.toLowerCase().includes(query) || row.id.toLowerCase().includes(query));
  });
  const pending = rows.filter((row) => row.status === 'Pending').length;
  const returned = rows.filter((row) => row.status === 'Returned').length;
  const approved = rows.filter((row) => row.status === 'Approved').length;

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SALES WORKSPACE / APPROVALS</span>
          <h1>Approvals<span className="heading-period">.</span></h1>
          <p>Review the deals that need a clear decision before they move forward.</p>
        </div>
        <span className="page-context"><ShieldIcon /> {pending} decisions waiting</span>
      </div>
      <div className="summary-strip">
        <button className={`summary-chip chip-amber ${filter === 'Pending' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Pending')}>
          <strong>{pending}</strong>
          <span>Pending</span>
        </button>
        <button className={`summary-chip chip-red ${filter === 'Returned' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Returned')}>
          <strong>{returned}</strong>
          <span>Returned</span>
        </button>
        <button className={`summary-chip chip-green ${filter === 'Approved' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('Approved')}>
          <strong>{approved}</strong>
          <span>Approved</span>
        </button>
        <button className={`summary-chip chip-neutral ${filter === 'All' ? 'summary-chip-active' : ''}`} onClick={() => onFilter('All')}>
          <strong>{rows.length}</strong>
          <span>All reviews</span>
        </button>
      </div>
      <div className="operations-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search by quotation or customer..." />
        </label>
        <div className="filter-select">
          <Filter size={15} />
          <select value={filter} onChange={(event) => onFilter(event.target.value as 'All' | ApprovalStatus)}>
            <option value="All">All approvals</option>
            <option value="Pending">Pending only</option>
            <option value="Returned">Returned</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown size={14} />
        </div>
      </div>
      <div className="operations-table-panel">
        <div className="table-scroll">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Quotation</th>
                <th>Customer</th>
                <th>Blended risk</th>
                <th>Stage</th>
                <th>Assigned to</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.id} onClick={() => onOpen(row)}>
                  <td>
                    <strong>{row.id}</strong>
                    <span>{row.submitted}</span>
                  </td>
                  <td>
                    <span className="table-customer">
                      <span className="avatar avatar-small avatar-cyan">{row.initials}</span>
                      {row.customer}
                    </span>
                  </td>
                  <td>
                    <span className={`risk-label risk-${row.risk.toLowerCase()}`}>
                      <span />{row.risk}
                    </span>
                  </td>
                  <td>{row.stage}</td>
                  <td>{row.assignedTo}</td>
                  <td>
                    <span className={`approval-status approval-${row.status.toLowerCase()}`}>
                      {row.status}
                    </span>
                  </td>
                  <td><ArrowRight size={16} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredRows.length && <div className="empty-table">No approval records match these filters.</div>}
        </div>
      </div>
      <div className="operations-note">
        <Sparkles size={15} />
        <span>Select any row to open the full risk breakdown, approval steps, and audit trail.</span>
      </div>
    </div>
  );
}
