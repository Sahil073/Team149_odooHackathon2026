import { Bell, LogOut, Menu, Plus, RefreshCw, Search, Settings2 } from 'lucide-react';
import { BrandMark } from '../BrandMark';
import type { Role, Screen } from '../../types';

type TopbarProps = {
  screen: Screen;
  onOpenMenu: () => void;
  onNewQuotation: () => void;
  onReloadData: () => void;
  onNavigateToBackend: () => void;
  onLogout: () => void;
  role: Role;
};

export function Topbar({
  screen,
  onOpenMenu,
  onNewQuotation,
  onReloadData,
  onNavigateToBackend,
  onLogout,
  role,
}: TopbarProps) {
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

        <button className="icon-button notification-button" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>

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

        <span className="topbar-avatar avatar avatar-indigo">AK</span>
      </div>
    </header>
  );
}
