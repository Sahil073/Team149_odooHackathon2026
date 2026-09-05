import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, MessageCircle, RotateCcw, Send, Sparkles } from 'lucide-react';
import { BrandMark } from '../../components/BrandMark';

type ChatMessage = {
  id: number;
  author: 'customer' | 'account-team';
  name: string;
  text: string;
  time: string;
};

export function CustomerPortalPage({
  status,
  onSubmitRequest,
  onConfirm,
}: {
  status: 'Under negotiation' | 'Confirmed';
  onSubmitRequest: (discount: number, date: string, message: string) => void;
  onConfirm: () => void;
}) {
  const [counterDiscount, setCounterDiscount] = useState('18');
  const [deliveryDate, setDeliveryDate] = useState('2026-10-15');
  const [message, setMessage] = useState('We need an 18% volume discount to finalize this order this quarter.');
  const [activeView, setActiveView] = useState<'quotation' | 'messages'>('quotation');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, author: 'account-team', name: 'Maya Shah', text: 'Hi Acme team, I have shared the latest quotation and can help with any questions.', time: '10:14 AM' },
    { id: 2, author: 'customer', name: 'You', text: 'Can we move the deployment date to October?', time: '10:18 AM' },
    { id: 3, author: 'account-team', name: 'Maya Shah', text: 'Yes, October 15 is available. I have noted it on the counter proposal.', time: '10:21 AM' },
  ]);
  const confirmed = status === 'Confirmed';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const discountVal = Number(counterDiscount) || 0;
    onSubmitRequest(discountVal, deliveryDate, message);
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

  return (
    <div className="portal-shell">
      <div className="portal-header">
        <BrandMark />
        <div className="portal-nav">
          <button className={activeView === 'quotation' ? 'portal-nav-active' : ''} onClick={() => setActiveView('quotation')}>
            My quotation
          </button>
          <button className={activeView === 'messages' ? 'portal-nav-active' : ''} onClick={() => setActiveView('messages')}>
            Messages <span className="portal-message-count">{chatMessages.filter((item) => item.author === 'account-team').length}</span>
          </button>
          <button>Profile</button>
        </div>
        <span className="avatar avatar-indigo portal-avatar">AC</span>
      </div>

      <div className="portal-content">
        <div className="portal-heading">
          <span className="eyebrow">ACME CORPORATION / CUSTOMER PORTAL</span>
          <h1>
            Review &amp; Negotiate Quotation<span className="heading-period">.</span>
          </h1>
          <p>
            Review terms live, submit counter proposals, or confirm your order directly without back-and-forth email delay.
          </p>
        </div>

        <div className="portal-status">
          <span
            className={`portal-status-dot ${
              confirmed ? 'portal-status-confirmed' : ''
            }`}
          />
          <span>Status: {confirmed ? 'Confirmed' : 'Under negotiation'}</span>
          <span className="portal-quote-id">Q-1042 · Valid until Sep 30</span>
        </div>

        {activeView === 'messages' ? (
          <section className="panel portal-chat-panel">
            <div className="portal-chat-header">
              <div>
                <span className="eyebrow">DIRECT CONVERSATION</span>
                <h2><MessageCircle size={18} /> Acme account team</h2>
                <p>Discuss quotation Q-1042 with Maya Shah.</p>
              </div>
              <button className="back-link portal-back-button" onClick={() => setActiveView('quotation')}>
                <ArrowLeft size={15} /> Back to quotation
              </button>
            </div>
            <div className="portal-chat-messages" aria-live="polite">
              {chatMessages.map((chatMessage) => (
                <div className={`portal-chat-message portal-chat-${chatMessage.author}`} key={chatMessage.id}>
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
                <input id="portal-chat-input" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} placeholder="Write a message..." />
                <button className="button button-primary" type="submit" disabled={!chatDraft.trim()}><Send size={15} /> Send</button>
              </div>
            </form>
          </section>
        ) : <div className="portal-grid">
          {/* Quotation Lines Panel */}
          <section className="panel portal-lines-panel">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">QUOTATION LINES</span>
                <h2>Acme Corp · Q-1042</h2>
              </div>
              <span className="portal-amount">$12,400</span>
            </div>

            <div className="portal-line-table">
              <div className="portal-line-head">
                <span>Line Item</span>
                <span>Line Discussion &amp; Notes</span>
              </div>
              <div className="portal-line-row">
                <span>
                  <strong>Laptop Pro 14 (x8)</strong>
                  <small>Hardware · $1,140 each</small>
                </span>
                <span>Can we increase discount from 5% to 15%?</span>
              </div>
              <div className="portal-line-row">
                <span>
                  <strong>Onsite Setup (x2)</strong>
                  <small>Services · $450 each</small>
                </span>
                <span>Can deployment date be moved to October?</span>
              </div>
            </div>

            <div className="portal-total">
              <span>Current Quote Total</span>
              <strong>$12,400</strong>
            </div>
          </section>

          {/* Request Change Form Panel */}
          <section className="panel portal-request-panel">
            <div>
              <span className="eyebrow">REQUEST A CHANGE</span>
              <h2>Submit Counter Proposal</h2>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
              <label className="field portal-field">
                <span>Counter discount proposal %</span>
                <input
                  value={counterDiscount}
                  onChange={(event) => setCounterDiscount(event.target.value)}
                  placeholder="e.g. 18"
                  type="number"
                  min="0"
                  max="100"
                />
              </label>

              <label className="field portal-field">
                <span>Requested delivery date</span>
                <input
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  type="date"
                />
              </label>

              <label className="field portal-field">
                <span>Message to your account team</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Add context or questions for your sales rep..."
                  rows={4}
                />
              </label>

              <div className="portal-request-actions">
                <button className="button" type="submit">
                  <RotateCcw size={15} /> Submit Counter Proposal
                </button>
                <button
                  type="button"
                  className="button button-success"
                  disabled={confirmed}
                  onClick={onConfirm}
                >
                  <Check size={15} />{' '}
                  {confirmed ? 'Quotation confirmed' : 'Confirm & Accept Quote'}
                </button>
              </div>
            </form>
          </section>
        </div>}

        <div className="operations-note portal-note" style={{ marginTop: '20px' }}>
          <Sparkles size={15} />
          <span>
            Automated Governance: Counter proposal discounts above customer tier thresholds (&gt;15%) will automatically trigger manager &amp; finance re-approval.
          </span>
        </div>
      </div>
    </div>
  );
}
