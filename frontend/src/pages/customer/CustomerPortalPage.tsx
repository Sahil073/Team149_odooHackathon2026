import { useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, MessageCircle, RotateCcw, Send, Sparkles } from 'lucide-react';
import { BrandMark } from '../../components/BrandMark';
import type { ApiQuotation } from '../../lib/api';
import { formatINR } from '../../lib/utils';

type ChatMessage = {
  id: number;
  author: 'customer' | 'account-team';
  name: string;
  text: string;
  time: string;
};

interface Props {
  quotations: ApiQuotation[];
  confirmedIds: Set<string>;
  onSubmitNegotiation: (quotationId: string, discount: number, notes: string) => Promise<void>;
  onConfirmQuotation: (quotationId: string) => Promise<void>;
  /** Legacy single-quotation compat props */
  status?: 'Under negotiation' | 'Confirmed';
  onSubmitRequest?: (discount: number, date: string, message: string) => void;
  onConfirm?: () => void;
}

export function CustomerPortalPage({
  quotations = [],
  confirmedIds = new Set(),
  onSubmitNegotiation,
  onConfirmQuotation,
  status: legacyStatus,
  onSubmitRequest,
  onConfirm,
}: Props) {
  const [activeQuotationId, setActiveQuotationId] = useState<string | null>(
    quotations.length > 0 ? quotations[0].id : null
  );
  const [counterDiscount, setCounterDiscount] = useState('10');
  const [message, setMessage] = useState('');
  const [activeView, setActiveView] = useState<'quotation' | 'messages'>('quotation');
  const [chatDraft, setChatDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      author: 'account-team',
      name: 'Nikhil Sharma',
      text: 'Namaskar! I have shared the latest quotation. Feel free to raise any queries or propose changes.',
      time: '10:14 AM',
    },
    {
      id: 2,
      author: 'customer',
      name: 'You',
      text: 'Can we get a better discount for bulk hardware order?',
      time: '10:22 AM',
    },
    {
      id: 3,
      author: 'account-team',
      name: 'Nikhil Sharma',
      text: 'Noted! Let me check with my manager. I will revert by end of day.',
      time: '10:28 AM',
    },
  ]);

  const activeQuotation = quotations.find((q) => q.id === activeQuotationId) ?? quotations[0] ?? null;
  const lines = activeQuotation?.lines ?? [];

  // Compute totals
  const totalAmount = lines.reduce((sum, line) => {
    const price = Number(line.unitPrice) || 0;
    const disc = line.discountPct || 0;
    return sum + price * line.qty * (1 - disc / 100);
  }, 0);

  const isConfirmed = activeQuotation
    ? confirmedIds.has(activeQuotation.id) || activeQuotation.status === 'FULFILLED' || activeQuotation.status === 'CLOSED'
    : legacyStatus === 'Confirmed';

  async function handleSubmitNegotiation(e: React.FormEvent) {
    e.preventDefault();
    if (!activeQuotation) {
      // Legacy fallback
      const discountVal = Number(counterDiscount) || 0;
      onSubmitRequest?.(discountVal, '', message);
      return;
    }
    setSubmitting(true);
    try {
      await onSubmitNegotiation(activeQuotation.id, Number(counterDiscount) || 0, message);
      setMessage('');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm() {
    if (!activeQuotation) {
      onConfirm?.();
      return;
    }
    setConfirming(activeQuotation.id);
    try {
      await onConfirmQuotation(activeQuotation.id);
    } finally {
      setConfirming(null);
    }
  }

  function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    const text = chatDraft.trim();
    if (!text) return;
    setChatMessages((current) => [
      ...current,
      { id: Date.now(), author: 'customer', name: 'You', text, time: 'Just now' },
    ]);
    setChatDraft('');
  }

  const customerName = activeQuotation?.customer?.name || 'Your Company';
  const customerInitials = customerName
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="portal-shell">
      <div className="portal-header">
        <BrandMark />
        <div className="portal-nav">
          <button
            className={activeView === 'quotation' ? 'portal-nav-active' : ''}
            onClick={() => setActiveView('quotation')}
          >
            My Quotation{quotations.length > 1 ? `s (${quotations.length})` : ''}
          </button>
          <button
            className={activeView === 'messages' ? 'portal-nav-active' : ''}
            onClick={() => setActiveView('messages')}
          >
            Messages{' '}
            <span className="portal-message-count">
              {chatMessages.filter((m) => m.author === 'account-team').length}
            </span>
          </button>
          <button>Profile</button>
        </div>
        <span className="avatar avatar-indigo portal-avatar">{customerInitials}</span>
      </div>

      <div className="portal-content">
        <div className="portal-heading">
          <span className="eyebrow">{customerName.toUpperCase()} / CUSTOMER PORTAL</span>
          <h1>
            Review &amp; Negotiate Quotation<span className="heading-period">.</span>
          </h1>
          <p>
            Review your quotation live, submit counter proposals in ₹ INR, or confirm your order — no back-and-forth
            emails needed.
          </p>
        </div>

        {/* Quotation selector if multiple */}
        {quotations.length > 1 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {quotations.map((q) => (
              <button
                key={q.id}
                className={`button ${activeQuotationId === q.id ? 'button-primary' : ''}`}
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => setActiveQuotationId(q.id)}
              >
                {q.id.slice(0, 16)}… · {q.status}
              </button>
            ))}
          </div>
        )}

        <div className="portal-status">
          <span
            className={`portal-status-dot ${isConfirmed ? 'portal-status-confirmed' : ''}`}
          />
          <span>Status: {isConfirmed ? 'Confirmed ✔' : 'Under negotiation'}</span>
          {activeQuotation && (
            <span className="portal-quote-id">
              {activeQuotation.id.slice(0, 20)} · {activeQuotation.status}
            </span>
          )}
        </div>

        {activeView === 'messages' ? (
          <section className="panel portal-chat-panel">
            <div className="portal-chat-header">
              <div>
                <span className="eyebrow">DIRECT CONVERSATION</span>
                <h2>
                  <MessageCircle size={18} /> Account team
                </h2>
                <p>Discuss your quotation with Nikhil Sharma, Sales Rep.</p>
              </div>
              <button className="back-link portal-back-button" onClick={() => setActiveView('quotation')}>
                <ArrowLeft size={15} /> Back to quotation
              </button>
            </div>
            <div className="portal-chat-messages" aria-live="polite">
              {chatMessages.map((chatMessage) => (
                <div
                  className={`portal-chat-message portal-chat-${chatMessage.author}`}
                  key={chatMessage.id}
                >
                  <div className="portal-chat-bubble">
                    <strong>{chatMessage.name}</strong>
                    <p>{chatMessage.text}</p>
                    <small>{chatMessage.time}</small>
                  </div>
                </div>
              ))}
            </div>
            <form className="portal-chat-compose" onSubmit={handleSendMessage}>
              <label htmlFor="portal-chat-input">Message your account team</label>
              <div>
                <input
                  id="portal-chat-input"
                  value={chatDraft}
                  onChange={(event) => setChatDraft(event.target.value)}
                  placeholder="Write a message..."
                />
                <button className="button button-primary" type="submit" disabled={!chatDraft.trim()}>
                  <Send size={15} /> Send
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="portal-grid">
            {/* Quotation Lines Panel */}
            <section className="panel portal-lines-panel">
              <div className="panel-heading">
                <div>
                  <span className="eyebrow">QUOTATION LINES</span>
                  <h2>{customerName} · {activeQuotation?.id?.slice(0, 16) || 'Q—'}</h2>
                </div>
                <span className="portal-amount">{formatINR(totalAmount)}</span>
              </div>

              <div className="portal-line-table">
                <div className="portal-line-head">
                  <span>Line Item</span>
                  <span>Qty &amp; Pricing (₹ INR)</span>
                </div>

                {lines.length === 0 ? (
                  <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
                    {activeQuotation ? 'No line items in this quotation yet.' : 'No quotation available. Contact your sales rep.'}
                  </div>
                ) : (
                  lines.map((line) => {
                    const unitPrice = Number(line.unitPrice) || 0;
                    const disc = line.discountPct || 0;
                    const lineTotal = unitPrice * line.qty * (1 - disc / 100);
                    return (
                      <div className="portal-line-row" key={line.id}>
                        <span>
                          <strong>
                            {line.product?.name || 'Product'} (×{line.qty})
                          </strong>
                          <small>
                            {line.product?.category || 'Item'} · {formatINR(unitPrice)} each
                            {disc > 0 ? ` · ${disc}% disc.` : ''}
                          </small>
                        </span>
                        <span style={{ fontWeight: 600 }}>{formatINR(lineTotal)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="portal-total">
                <span>Total (incl. discounts)</span>
                <strong>{formatINR(totalAmount)}</strong>
              </div>
            </section>

            {/* Request Change / Confirm Panel */}
            <section className="panel portal-request-panel">
              <div>
                <span className="eyebrow">REQUEST A CHANGE</span>
                <h2>Submit Counter Proposal</h2>
              </div>

              <form onSubmit={handleSubmitNegotiation} style={{ marginTop: '16px' }}>
                <label className="field portal-field">
                  <span>Counter discount proposal (%)</span>
                  <input
                    value={counterDiscount}
                    onChange={(event) => setCounterDiscount(event.target.value)}
                    placeholder="e.g. 12"
                    type="number"
                    min="0"
                    max="100"
                    disabled={isConfirmed}
                  />
                </label>

                <label className="field portal-field">
                  <span>Message to your account team</span>
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Add context, ask about delivery timelines, volume benefits..."
                    rows={4}
                    disabled={isConfirmed}
                  />
                </label>

                <div className="portal-request-actions">
                  <button
                    className="button"
                    type="submit"
                    disabled={isConfirmed || submitting || !activeQuotation}
                  >
                    <RotateCcw size={15} /> {submitting ? 'Submitting…' : 'Submit Counter Proposal'}
                  </button>

                  <button
                    type="button"
                    className={`button ${isConfirmed ? 'button-success' : 'button-success'}`}
                    disabled={isConfirmed || confirming === activeQuotation?.id || !activeQuotation}
                    onClick={handleConfirm}
                    style={{ gap: '6px' }}
                  >
                    {isConfirmed ? (
                      <>
                        <CheckCircle2 size={16} style={{ color: '#22c55e' }} />
                        Quotation Confirmed ✔
                      </>
                    ) : confirming === activeQuotation?.id ? (
                      <>
                        <Check size={15} /> Confirming…
                      </>
                    ) : (
                      <>
                        <Check size={15} /> Confirm &amp; Accept Quote
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        <div className="operations-note portal-note" style={{ marginTop: '20px' }}>
          <Sparkles size={15} />
          <span>
            Automated Governance: Counter proposals above your tier discount ceiling (&gt;15% for Gold,
            &gt;10% for Silver, &gt;5% for Bronze) automatically trigger manager &amp; finance re-approval.
            All amounts are in Indian Rupees (₹ INR).
          </span>
        </div>
      </div>
    </div>
  );
}
