import { Bell, Check, CheckCheck, LogOut, Menu, Plus, RefreshCw, Settings2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BrandMark } from '../BrandMark';
import type { Role, Screen } from '../../types';

type Notification = {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
  type: 'approval' | 'fulfillment' | 'invoice' | 'system';
};

const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    title: 'Approval required',
    body: 'Q-1042 (Acme Corp) exceeds the Gold discount ceiling and needs your review.',
    time: '2 min ago',
    read: false,
    type: 'approval',
  },
  {
    id: 'n2',
    title: 'Fulfillment ready',
    body: 'FO-0031 has been split and is ready to release to warehouse.',
    time: '18 min ago',
    read: false,
    type: 'fulfillment',
  },
  {
    id: 'n3',
    title: 'Invoice overdue',
    body: 'INV-1007 for TechStart Inc. is 14 days past due — $12,400.',
    time: '1 hr ago',
    read: false,
    type: 'invoice',
  },
  {
    id: 'n4',
    title: 'New subscription',
    body: 'GlobalTech signed up for the Enterprise plan — renewal set to Jan 2025.',
    time: '3 hr ago',
    read: true,
    type: 'system',
  },
  {
    id: 'n5',
    title: 'Deal health alert',
    body: 'Q-1039 margin has dropped below 12%. Review recommended before confirming.',
    time: 'Yesterday',
    read: true,
    type: 'approval',
  },
];

const TYPE_COLORS: Record<Notification['type'], string> = {
  approval: '#6366f1',
  fulfillment: '#0ea5e9',
  invoice: '#f59e0b',
  system: '#10b981',
};

type TopbarProps = {
  screen: Screen;
  onOpenMenu: () => void;
  onNewQuotation: () => void;
  onReloadData: () => void;
  onNavigateToBackend: () => void;
  onLogout: () => void;
  role: Role;
  userName: string;
};

export function Topbar({
  screen,
  onOpenMenu,
  onNewQuotation,
  onReloadData,
  onNavigateToBackend,
  onLogout,
  role,
  userName,
}: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(INITIAL_NOTIFICATIONS);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [notifOpen]);

  function markRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }

  function clearAll() {
    setNotifications([]);
    setNotifOpen(false);
  }

  const screenLabels: Record<Screen, string> = {
    dashboard: 'Overview',
    quotations: 'Quotations',
    'quotation-detail': 'Quotation detail',
    approvals: 'Approvals',
    'approval-detail': 'Approval detail',
    fulfillment: 'Fulfillment',
    'fulfillment-detail': 'Fulfillment detail',
    subscriptions: 'Subscriptions',
    'subscription-detail': 'Billing detail',
    invoices: 'Invoices',
    'invoice-detail': 'Invoice detail',
    'customer-portal': 'Customer portal',
    'quotation-builder': 'Quotation builder',
    'deal-health': 'Deal health',
    reports: 'Reports',
    products: 'Products',
    'product-detail': 'Product detail',
    'approval-config': 'Approval setup',
    'warehouse-setup': 'Warehouse setup',
    'subscription-setup': 'Plan setup',
    'audit-trail': 'Audit trail',
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-button mobile-menu-button"
          onClick={onOpenMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <div className="mobile-brand">
          <BrandMark compact />
        </div>
        <div className="breadcrumb">
          <span>Workspace</span>
          <span className="breadcrumb-slash">/</span>
          <strong>{screenLabels[screen]}</strong>
        </div>
      </div>

      <div className="topbar-actions">
        {/* Reload Data Button */}
        <button
          className="icon-button"
          onClick={onReloadData}
          title="Reload Data (Refresh pricing, stock, & approvals)"
        >
          <RefreshCw size={17} />
        </button>

        {/* Go to Back-end Button */}
        {role !== 'customer' && (
          <button
            className="icon-button"
            onClick={onNavigateToBackend}
            title="Go to Back-end Configuration"
          >
            <Settings2 size={17} />
          </button>
        )}

        {/* Notification Button + Panel */}
        <div className="notif-wrapper">
          <button
            ref={buttonRef}
            id="notification-bell-button"
            className={`icon-button notification-button ${notifOpen ? 'icon-button-active' : ''}`}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
            aria-expanded={notifOpen}
            aria-haspopup="true"
            onClick={() => setNotifOpen((v) => !v)}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-dot" aria-hidden="true">
                {unreadCount > 9 ? '9+' : unreadCount > 1 ? unreadCount : ''}
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              ref={panelRef}
              className="notif-panel"
              role="dialog"
              aria-label="Notifications"
            >
              {/* Header */}
              <div className="notif-panel-header">
                <div>
                  <span className="notif-panel-title">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="notif-unread-badge">{unreadCount} new</span>
                  )}
                </div>
                <div className="notif-header-actions">
                  {unreadCount > 0 && (
                    <button
                      className="notif-text-btn"
                      onClick={markAllRead}
                      title="Mark all as read"
                    >
                      <CheckCheck size={13} />
                      Mark all read
                    </button>
                  )}
                  <button
                    className="icon-button notif-close-btn"
                    onClick={() => setNotifOpen(false)}
                    aria-label="Close notifications"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="notif-list" role="list">
                {notifications.length === 0 ? (
                  <div className="notif-empty">
                    <Bell size={28} strokeWidth={1.4} />
                    <p>You're all caught up!</p>
                    <small>No new notifications</small>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`notif-item ${n.read ? 'notif-item-read' : ''}`}
                      role="listitem"
                      onClick={() => markRead(n.id)}
                    >
                      <span
                        className="notif-type-dot"
                        style={{ background: TYPE_COLORS[n.type] }}
                        aria-hidden="true"
                      />
                      <div className="notif-content">
                        <div className="notif-item-header">
                          <strong className="notif-item-title">{n.title}</strong>
                          <span className="notif-time">{n.time}</span>
                        </div>
                        <p className="notif-body">{n.body}</p>
                      </div>
                      <div className="notif-item-actions">
                        {!n.read && (
                          <button
                            className="notif-icon-btn"
                            title="Mark as read"
                            onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                          >
                            <Check size={12} />
                          </button>
                        )}
                        <button
                          className="notif-icon-btn notif-dismiss-btn"
                          title="Dismiss"
                          onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="notif-panel-footer">
                  <button className="notif-text-btn notif-clear-btn" onClick={clearAll}>
                    Clear all notifications
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <span className="topbar-divider" />

        {role !== 'customer' && (
          <button
            className="button button-primary button-small"
            onClick={onNewQuotation}
          >
            <Plus size={16} />
            <span>New quotation</span>
          </button>
        )}

        {/* Logout Button */}
        <button
          className="icon-button"
          onClick={onLogout}
          title="Close Workspace (End Session)"
        >
          <LogOut size={17} />
        </button>

        <span className="topbar-avatar avatar avatar-indigo">{getInitials(userName)}</span>
      </div>
    </header>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}
