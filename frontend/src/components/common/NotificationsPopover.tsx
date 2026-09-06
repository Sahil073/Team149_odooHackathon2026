import { useState, useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  PackageCheck,
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { Screen } from '../../types';

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'approval' | 'health' | 'fulfillment' | 'billing' | 'system';
  screen?: Screen;
};

type NotificationsPopoverProps = {
  open: boolean;
  onClose: () => void;
  onNavigate?: (screen: Screen) => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
};

export function NotificationsPopover({
  open,
  onClose,
  onNavigate,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDismiss,
  onClearAll,
}: NotificationsPopoverProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredList =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  const getTypeIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'approval':
        return <ShieldCheck size={16} className="notif-icon-approval" />;
      case 'health':
        return <AlertTriangle size={16} className="notif-icon-health" />;
      case 'fulfillment':
        return <PackageCheck size={16} className="notif-icon-fulfillment" />;
      case 'billing':
        return <Receipt size={16} className="notif-icon-billing" />;
      default:
        return <Sparkles size={16} className="notif-icon-system" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.read) {
      onMarkAsRead(item.id);
    }
    if (item.screen && onNavigate) {
      onNavigate(item.screen);
      onClose();
    }
  };

  return (
    <div className="notifications-popover" ref={popoverRef} role="dialog" aria-label="Notifications">
      <div className="notif-header">
        <div className="notif-title-row">
          <div className="notif-title-wrap">
            <Bell size={17} className="notif-bell-icon" />
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <span className="notif-unread-pill">{unreadCount} new</span>
            )}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button
                className="notif-action-btn"
                onClick={onMarkAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
            <button
              className="notif-close-btn"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="notif-tabs">
          <button
            className={`notif-tab ${filter === 'all' ? 'notif-tab-active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>
          <button
            className={`notif-tab ${filter === 'unread' ? 'notif-tab-active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>
      </div>

      <div className="notif-body">
        {filteredList.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <Check size={22} />
            </div>
            <strong>All caught up!</strong>
            <p>
              {filter === 'unread'
                ? 'No unread notifications at the moment.'
                : 'You have no active notifications.'}
            </p>
          </div>
        ) : (
          <div className="notif-list">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className={`notif-item ${!item.read ? 'notif-item-unread' : ''} ${
                  item.screen ? 'notif-item-clickable' : ''
                }`}
                onClick={() => handleNotificationClick(item)}
              >
                <div className={`notif-icon-circle notif-type-${item.type}`}>
                  {getTypeIcon(item.type)}
                </div>

                <div className="notif-content">
                  <div className="notif-item-head">
                    <span className="notif-item-title">{item.title}</span>
                    <span className="notif-time">{item.timestamp}</span>
                  </div>
                  <p className="notif-desc">{item.message}</p>
                  {item.screen && (
                    <span className="notif-target-badge">
                      Jump to {item.screen.replace('-', ' ')} →
                    </span>
                  )}
                </div>

                <div className="notif-item-actions" onClick={(e) => e.stopPropagation()}>
                  {!item.read && <span className="notif-blue-dot" />}
                  <button
                    className="notif-dismiss-btn"
                    onClick={() => onDismiss(item.id)}
                    title="Dismiss"
                    aria-label="Dismiss notification"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="notif-footer">
          <button className="notif-footer-btn" onClick={onClearAll}>
            <Trash2 size={13} />
            <span>Clear all</span>
          </button>
        </div>
      )}
    </div>
  );
}
