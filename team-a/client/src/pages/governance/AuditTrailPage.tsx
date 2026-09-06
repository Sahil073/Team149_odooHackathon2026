import { useState, useMemo } from 'react';
import { ChevronDown, FileText, Filter } from 'lucide-react';
import type { AuditLogItem } from '../../types';

interface AuditTrailPageProps {
  auditLogs?: AuditLogItem[];
}

export function AuditTrailPage({ auditLogs = [] }: AuditTrailPageProps) {
  const [filterQuery, setFilterQuery] = useState('');
  const [activityType, setActivityType] = useState('All activity');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const query = filterQuery.trim().toLowerCase();
      const matchesText =
        !query ||
        log.user.toLowerCase().includes(query) ||
        log.entity.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.reason.toLowerCase().includes(query);

      if (!matchesText) return false;

      if (activityType === 'User actions') {
        return log.user.toLowerCase() !== 'system';
      }
      if (activityType === 'System actions') {
        return log.user.toLowerCase() === 'system';
      }
      return true;
    });
  }, [auditLogs, filterQuery, activityType]);

  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMIN / AUDIT TRAIL</span>
          <h1>Audit trail<span className="heading-period">.</span></h1>
          <p>A complete record of user actions, entity changes, and system decisions.</p>
        </div>
        <span className="page-context">
          <FileText size={15} /> {filteredLogs.length} events
        </span>
      </div>
      <div className="operations-toolbar">
        <label className="search-field">
          <Filter size={16} />
          <input
            placeholder="Filter by user, entity, or action..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
        </label>
        <div className="filter-select">
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value)}
          >
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
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No audit records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row) => (
                  <tr key={row.id || `${row.user}-${row.entity}-${row.timestamp}`}>
                    <td><strong>{row.user}</strong></td>
                    <td>{row.entity}</td>
                    <td>{row.action}</td>
                    <td>{row.reason}</td>
                    <td className="table-muted">{row.timestamp}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

