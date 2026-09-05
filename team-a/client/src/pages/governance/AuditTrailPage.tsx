import { ChevronDown, FileText, Filter } from 'lucide-react';

export function AuditTrailPage() {
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / AUDIT TRAIL</span>
          <h1>Audit trail<span className="heading-period">.</span></h1>
          <p>A complete record of user actions, entity changes, and system decisions.</p>
        </div>
        <span className="page-context"><FileText size={15} /> 1,248 events</span>
      </div>
      <div className="operations-toolbar">
        <label className="search-field">
          <Filter size={16} />
          <input placeholder="Filter by user, entity, or action..." />
        </label>
        <div className="filter-select">
          <select defaultValue="All activity">
            <option>All activity</option>
            <option>User actions</option>
            <option>System actions</option>
          </select>
          <ChevronDown size={14} />
        </div>
      </div>
      <div className="operations-table-panel standalone-table">
        <div className="table-scroll">
          <table className="operations-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Entity</th>
                <th>Action</th>
                <th>Reason</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Pawan Kumar', 'Q-1042', 'Submitted for approval', 'Discount over Gold ceiling', 'Today · 10:06'],
                ['M. Shah', 'Q-1037', 'Returned quotation', 'Margin justification needed', 'Yesterday · 14:18'],
                ['System', 'SUB-174', 'Paused billing', 'Payment retry limit reached', 'Yesterday · 09:42'],
                ['R. Iyer', 'INV-1042', 'Viewed reconciliation', 'Finance review', 'Aug 30 · 16:20'],
              ].map((row) => (
                <tr key={`${row[0]}-${row[1]}`}>
                  <td><strong>{row[0]}</strong></td>
                  <td>{row[1]}</td>
                  <td>{row[2]}</td>
                  <td>{row[3]}</td>
                  <td className="table-muted">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
