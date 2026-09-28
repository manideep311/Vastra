import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';

const POLL_MS = 60_000;

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationBell({ role }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const panelId = useId();
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications(role);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // non-critical — the bell simply keeps its last known state
    }
  }, [role]);

  // Poll only while the tab is visible; refresh as soon as it's shown again.
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchNotifications();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && fetchNotifications();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const handleOpenNotification = async (n) => {
    setOpen(false);
    if (!n.read) {
      setNotifications((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      markNotificationRead(n._id, role).catch(() => {});
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    setNotifications((list) => list.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
    markAllNotificationsRead(role).catch(fetchNotifications);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls={panelId}
        className={`icon-btn relative ${open ? 'bg-surface-2 text-ink' : ''}`}
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-canvas" />}
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-panel-in overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_48px_-20px_rgba(22,33,28,0.35)]"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-sm font-semibold text-ink">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllRead} className="text-xs font-semibold text-brand hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-muted">You're all caught up. Order and quote updates will show here.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {notifications.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2 ${n.read ? '' : 'bg-brand-soft/40'}`}
                  >
                    <span className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-accent'}`} aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{n.title}</span>
                      {n.message && <span className="mt-0.5 block text-xs leading-relaxed text-muted">{n.message}</span>}
                      <span className="mt-1 block text-[11px] text-muted/80">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
