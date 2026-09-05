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
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import { BrandMark } from '../BrandMark';
import type { Screen } from '../../types';

type SidebarProps = {
  screen: Screen;
  open: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen) => void;
  role: Role;
  userName: string;
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

export function Sidebar({ screen, open, onClose, onNavigate, role, userName }: SidebarProps) {
  const visibleNavItems = navItems.filter((item) => item.roles.includes(role));
  const visibleUpcomingItems = upcomingItems.filter((item) => item.roles.includes(role));
  return (
    <>
      {open && <button className="sidebar-scrim" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <BrandMark />
          <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="avatar avatar-indigo">{getInitials(userName)}</span>
          <span className="workspace-info">
            <strong>{role === 'customer' ? 'Acme Corporation' : userName}</strong>
            <small>{roleLabels[role]}</small>
          </span>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <p className="nav-eyebrow">Workspace</p>
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
                onClick={() => {
                  onNavigate(item.screen);
                  onClose();
                }}
              >
                <Icon size={18} strokeWidth={active ? 2.1 : 1.8} />
                <span>{item.label}</span>
                {item.count && <span className="nav-count">{item.count}</span>}
              </button>
            );
          })}

          <p className="nav-eyebrow nav-eyebrow-spaced">Operations</p>
          {visibleUpcomingItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className="sidebar-link sidebar-link-muted" onClick={() => {
                if (item.screen) onNavigate(item.screen);
                onClose();
              }}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                <span className="nav-count nav-count-soft">→</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="sidebar-link sidebar-link-muted">
            <Settings2 size={18} strokeWidth={1.8} />
            <span>Workspace settings</span>
          </button>
          <div className="sidebar-footer">
            <span className="avatar avatar-neutral">{getInitials(userName)}</span>
            <div>
               <strong>{role === 'customer' ? 'Acme Corporation' : userName}</strong>
               <small>{roleLabels[role]}</small>
            </div>
            <PanelLeftClose size={16} className="muted-icon" />
          </div>
        </div>
      </aside>
    </>
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