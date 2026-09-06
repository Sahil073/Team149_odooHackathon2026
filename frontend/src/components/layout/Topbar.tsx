import { useState } from 'react';
import { Bell, LogOut, Menu, Plus, RefreshCw, Search, Settings2 } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { getInitials } from '../../lib/utils';
import { NotificationsPopover, type NotificationItem } from '../common/NotificationsPopover';
import { SessionTimer } from '../common/SessionTimer';
import type { Role, Screen } from '../../types';

type TopbarProps = {
  screen: Screen;
  onOpenMenu: () => void;
  onNewQuotation: () => void;
  onReloadData: () => void;
  onNavigateToBackend: () => void;
  onLogout: () => void;
  role: Role;
  userName?: string;
  onNavigate?: (screen: Screen) => void;
  initialNotifications?: NotificationItem[];
};

export function Topbar({
  screen,
  onOpenMenu,
  onNewQuotation,
  onReloadData,
  onNavigateToBackend,
  onLogout,
  role,
  userName = 'Team',
  onNavigate,
  initialNotifications = [],
}: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [prevInitial, setPrevInitial] = useState<NotificationItem[]>(initialNotifications);

  // Sync when parent passes new dynamic notifications (prepend unseen ones)
  if (initialNotifications !== prevInitial) {
    setPrevInitial(initialNotifications);
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const newOnes = initialNotifications.filter((n) => !existingIds.has(n.id));
      return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
    });
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleDismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };
  const displayName = role === 'customer' ? userName || 'Portal User' : userName;
  const initials = getInitials(displayName);
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
        {/* Reload Data Button (B1) */}
        <button
          className="icon-button"
          onClick={onReloadData}
          title="Reload Data (Refresh pricing, stock, & approvals)"
        >
          <RefreshCw size={17} />
        </button>

        {/* Go to Back-end Button (B1) */}
        {role !== 'customer' && (
          <button
            className="icon-button"
            onClick={onNavigateToBackend}
            title="Go to Back-end Configuration"
          >
            <Settings2 size={17} />
          </button>
        )}

        <div className="notification-container">
          <button
            className={`icon-button notification-button ${showNotifications ? 'active' : ''}`}
            onClick={() => setShowNotifications((prev) => !prev)}
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-dot" />}
          </button>

          <NotificationsPopover
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
            onNavigate={onNavigate}
            notifications={notifications}
            onMarkAsRead={handleMarkAsRead}
            onMarkAllAsRead={handleMarkAllAsRead}
            onDismiss={handleDismiss}
            onClearAll={handleClearAll}
          />
        </div>

        {/* Live Session Countdown & Warning Timer */}
        <SessionTimer onLogout={onLogout} />

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

        {/* Close Workspace / Logout Button (B1) */}
        <button
          className="icon-button"
          onClick={onLogout}
          title="Close Workspace (End Session)"
        >
          <LogOut size={17} />
        </button>

        <span className="topbar-avatar avatar avatar-indigo" title={displayName}>
          {initials}
        </span>
      </div>
    </header>
  );
}
