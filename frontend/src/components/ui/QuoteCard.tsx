import { ArrowUpRight, Clock3, MoreHorizontal } from 'lucide-react';
import type { Quote } from '../../types';
import { StatusBadge } from './StatusBadge';

type QuoteCardProps = {
  quote: Quote;
  onOpen: (quote: Quote) => void;
};

export function QuoteCard({ quote, onOpen }: QuoteCardProps) {
  return (
    <button className="quote-card" onClick={() => onOpen(quote)}>
      <div className="quote-card-top">
        <span className="quote-id">{quote.id}</span>
        <span className="quote-more">
          <MoreHorizontal size={16} />
        </span>
      </div>
      <div className="quote-customer">
        <span className="avatar avatar-small avatar-cyan">{quote.initials}</span>
        <span>{quote.customer}</span>
      </div>
      <div className="quote-card-value">
        <strong>{quote.amount}</strong>
        <span><ArrowUpRight size={14} /> {quote.lineItems} line items</span>
      </div>
      <div className="quote-card-footer">
        <span><Clock3 size={13} /> {quote.updated}</span>
        <StatusBadge status={quote.status} dot={false} />
      </div>
    </button>
  );
}