import { ArrowRight, ChevronDown, Filter, LayoutGrid, List, Plus, Search } from 'lucide-react';
import { QuoteCard } from '../../components/ui/QuoteCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import type { Quote, QuoteStatus } from '../../types';

const statusFilters: Array<'All' | QuoteStatus> = ['All', 'Draft', 'Pending approval', 'Approved', 'Negotiation', 'Confirmed'];

type QuotationsPageProps = {
  quotes: Quote[];
  allQuotes?: Quote[];
  search: string;
  statusFilter: 'All' | QuoteStatus;
  listView: 'board' | 'table';
  onSearch: (value: string) => void;
  onStatusFilter: (value: 'All' | QuoteStatus) => void;
  onListView: (value: 'board' | 'table') => void;
  onOpenQuote: (quote: Quote) => void;
  onNewQuotation: () => void;
};

export function QuotationsPage({
  quotes: visibleQuotes,
  allQuotes,
  search,
  statusFilter,
  listView,
  onSearch,
  onStatusFilter,
  onListView,
  onOpenQuote,
  onNewQuotation,
}: QuotationsPageProps) {
  const columns: QuoteStatus[] = ['Draft', 'Pending approval', 'Approved', 'Negotiation', 'Confirmed'];
  return (
    <div className="content-container quotations-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SALES WORKSPACE / QUOTATIONS</span>
          <h1>Quotations<span className="heading-period">.</span></h1>
          <p>Track every quote from first draft to confirmed deal.</p>
        </div>
        <button className="button button-primary" onClick={onNewQuotation}>
          <Plus size={17} /> New quotation
        </button>
      </div>
      <div className="quote-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search quotations..."
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="toolbar-actions">
          <div className="filter-select">
            <Filter size={15} />
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilter(event.target.value as 'All' | QuoteStatus)}
            >
              {statusFilters.map((filter) => (
                <option key={filter} value={filter}>
                  {filter === 'All' ? 'All statuses' : filter}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <div className="view-toggle" role="group" aria-label="View mode">
            <button
              className={listView === 'board' ? 'view-active' : ''}
              onClick={() => onListView('board')}
              aria-label="Board view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={listView === 'table' ? 'view-active' : ''}
              onClick={() => onListView('table')}
              aria-label="Table view"
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>
      <div className="quote-filter-row">
        <div className="filter-tabs">
          {statusFilters.map((filter) => {
            const pool = allQuotes || visibleQuotes;
            const count = filter === 'All' ? pool.length : pool.filter((quote) => quote.status === filter).length;
            return (
              <button
                key={filter}
                className={statusFilter === filter ? 'filter-tab-active' : ''}
                onClick={() => onStatusFilter(filter)}
              >
                {filter}
                <span>{count}</span>
              </button>
            );
          })}
        </div>
        <span className="results-count">
          {visibleQuotes.length} of {(allQuotes || visibleQuotes).length} quotations
        </span>
      </div>
      {listView === 'board' ? (
        <div className="quote-board">
          {columns.map((column) => {
            const columnQuotes = visibleQuotes.filter((quote) => quote.status === column);
            return (
              <section className="quote-column" key={column}>
                <div className="quote-column-header">
                  <span
                    className={`column-marker marker-${column.toLowerCase().replace(' ', '-')}`}
                  />
                  <h2>{column}</h2>
                  <span className="column-count">{columnQuotes.length}</span>
                </div>
                <div className="quote-column-cards">
                  {columnQuotes.length ? (
                    columnQuotes.map((quote) => (
                      <QuoteCard key={quote.id} quote={quote} onOpen={onOpenQuote} />
                    ))
                  ) : (
                    <div className="empty-column">No quotations here</div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Quotation</th>
                  <th>Customer</th>
                  <th>Owner</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleQuotes.map((quote) => (
                  <tr key={quote.id} onClick={() => onOpenQuote(quote)}>
                    <td>
                      <strong>{quote.id}</strong>
                      <span>{quote.lineItems} line items</span>
                    </td>
                    <td>
                      <span className="table-customer">
                        <span className="avatar avatar-small avatar-cyan">{quote.initials}</span>
                        {quote.customer}
                      </span>
                    </td>
                    <td>{quote.owner}</td>
                    <td className="table-amount">{quote.amount}</td>
                    <td>
                      <StatusBadge status={quote.status} />
                    </td>
                    <td className="table-muted">{quote.updated}</td>
                    <td>
                      <ArrowRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visibleQuotes.length && (
              <div className="empty-table">No quotations match these filters.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
