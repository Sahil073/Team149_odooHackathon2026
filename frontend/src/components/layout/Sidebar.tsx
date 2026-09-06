import { useState } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  ClipboardList,
  ChevronDown,
  FileText,
  Globe2,
  History,
  Layers3,
  ReceiptText,
  Repeat2,
  LayoutDashboard,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import { BrandMark } from '../BrandMark';
import { getInitials } from '../../lib/utils';
import type { Screen } from '../../types';

type SidebarProps = {
  screen: Screen;
  open: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  role: Role;
  userName?: string;
};

import type { Role } from '../../types';

const navItems = [
  { label: 'Overview', icon: LayoutDashboard, screen: 'dashboard' as Screen, roles: ['sales-rep', 'manager', 'finance', 'admin'] as Role[] },
  { label: 'Quotations', icon: FileText, screen: 'quotations' as Screen, count: '12', roles: ['sales-rep', 'manager', 'finance', 'admin'] as Role[] },
  { label: 'Approvals', icon: ShieldCheck, screen: 'approvals' as Screen, count: '3', roles: ['sales-rep', 'manager', 'finance', 'admin'] as Role[] },
  { label: 'Fulfillment', icon: PackageCheck, screen: 'fulfillment' as Screen, count: '2', roles: ['sales-rep', 'manager', 'finance', 'admin'] as Role[] },
  { label: 'Subscriptions', icon: Repeat2, screen: 'subscriptions' as Screen, count: '18', roles: ['sales-rep', 'manager', 'finance', 'admin'] as Role[] },
  { label: 'Invoices', icon: ReceiptText, screen: 'invoices' as Screen, count: '4', roles: ['manager', 'finance', 'admin'] as Role[] },
  { label: 'Customer portal', icon: Globe2, screen: 'customer-portal' as Screen, roles: ['sales-rep', 'manager', 'finance', 'admin', 'customer'] as Role[] },
  { label: 'Deal health', icon: Activity, screen: 'deal-health' as Screen, roles: ['sales-rep', 'manager', 'admin'] as Role[] },
  { label: 'Reports', icon: BarChart3, screen: 'reports' as Screen, roles: ['sales-rep', 'manager', 'finance', 'admin'] as Role[] },
];

const upcomingItems = [
  { label: 'Product catalog', icon: Boxes, screen: 'products' as Screen, roles: ['admin'] as Role[] },
  { label: 'Approval setup', icon: SlidersHorizontal, screen: 'approval-config' as Screen, roles: ['manager', 'admin'] as Role[] },
  { label: 'Warehouse setup', icon: Warehouse, screen: 'warehouse-setup' as Screen, roles: ['finance', 'admin'] as Role[] },
  { label: 'Plan setup', icon: Layers3, screen: 'subscription-setup' as Screen, roles: ['admin'] as Role[] },
  { label: 'Audit trail', icon: History, screen: 'audit-trail' as Screen, roles: ['admin'] as Role[] },
];

const roleLabels: Record<Role, string> = {
  'sales-rep': 'Sales rep workspace',
  manager: 'Manager workspace',
  finance: 'Finance workspace',
  customer: 'Customer portal',
  admin: 'Admin workspace',
};

export function Sidebar({ screen, open, onClose, onNavigate, role, userName = 'Team' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('dealflow.sidebarCollapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('dealflow.sidebarCollapsed', String(next));
      return next;
    });
  };

  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));
  const visibleUpcomingItems = upcomingItems.filter((item) => item.roles.includes(role));
  const displayName = role === 'customer' ? 'Acme Corporation' : userName;
  const initials = getInitials(displayName);

  return (
    <>
      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''} ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
        <div className="sidebar-header">
          <BrandMark compact={isCollapsed} />
        </div>

        <div className="workspace-switcher" title={displayName}>
          <span className="avatar avatar-indigo">{initials}</span>
          {!isCollapsed && (
            <>
              <span className="workspace-info">
                <strong>{displayName}</strong>
                <small>{roleLabels[role]}</small>
              </span>
              <ChevronDown size={15} className="muted-icon" />
            </>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {!isCollapsed && <p className="nav-eyebrow">Workspace</p>}
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active =
              screen === item.screen ||
              (item.screen === 'approvals' && screen === 'approval-detail') ||
              (item.screen === 'fulfillment' && screen === 'fulfillment-detail');
            return (
              <button
                key={item.label}
                className={`sidebar-link ${active ? 'sidebar-link-active' : ''}`}
                title={item.label}
                onClick={() => {
                  onNavigate(item.screen);
                  onClose();
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.1 : 1.8} />
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && item.count && <span className="nav-count">{item.count}</span>}
              </button>
            );
          })}

          {!isCollapsed && <p className="nav-eyebrow nav-eyebrow-spaced">Operations</p>}
          {visibleUpcomingItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                className="sidebar-link sidebar-link-muted"
                title={item.label}
                onClick={() => {
                  if (item.screen) onNavigate(item.screen);
                  onClose();
                }}
              >
                <Icon size={18} strokeWidth={1.8} />
                {!isCollapsed && <span>{item.label}</span>}
                {!isCollapsed && <span className="nav-count nav-count-soft">→</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="sidebar-link sidebar-link-muted" title="Workspace settings">
            <Settings2 size={18} strokeWidth={1.8} />
            {!isCollapsed && <span>Workspace settings</span>}
          </button>
          <div className="sidebar-footer">
            <span className="avatar avatar-neutral">{initials}</span>
            {!isCollapsed && (
              <div>
                 <strong>{displayName}</strong>
                 <small>{roleLabels[role]}</small>
              </div>
            )}
            <button
              type="button"
              className="sidebar-collapse-btn"
              onClick={toggleCollapse}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <PanelLeftOpen size={17} className="muted-icon" />
              ) : (
                <PanelLeftClose size={17} className="muted-icon" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}