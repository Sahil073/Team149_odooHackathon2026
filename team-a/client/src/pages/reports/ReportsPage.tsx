import { useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';

export function ReportsPage({ onNotify }: { onNotify: (message: string) => void }) {
  const [period, setPeriod] = useState('This month');
  const [team, setTeam] = useState('All sales teams');
  return (
    <div className="content-container operations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">REPORTING / PERFORMANCE</span>
          <h1>Reports<span className="heading-period">.</span></h1>
          <p>Understand quote velocity, approval time, and the products moving your pipeline.</p>
        </div>
        <div className="page-heading-actions">
          <button className="button" onClick={() => onNotify('PDF report prepared for download.')}>
            <Download size={15} /> Export PDF
          </button>
          <button className="button" onClick={() => onNotify('XLS report prepared for download.')}>
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
          <select>
            <option>All statuses</option>
            <option>Approved</option>
            <option>Pending</option>
          </select>
          <ChevronDown size={14} />
        </label>
      </div>
      <div className="report-card-grid">
        <div className="report-card">
          <span>Quotes created</span>
          <strong>42</strong>
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
    </div>
  );
}
