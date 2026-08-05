import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon } from '@heroicons/react/24/outline';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/notificationService';

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationBell({ accent = 'violet' }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      // silent — notifications are a non-critical enhancement
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotification = async (n) => {
    if (!n.read) {
      await markNotificationRead(n._id);
      fetchNotifications();
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    await markAllNotificationsRead();
    fetchNotifications();
  };

  const dot = accent === 'amber' ? 'bg-amber-500' : 'bg-emerald-700';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className={`absolute top-1 right-1 w-2 h-2 rounded-full ${dot} ring-2 ring-white`} />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200/70 z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="font-semibold text-sm text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-emerald-700 font-medium hover:text-emerald-900">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No notifications yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <button
                  key={n._id}
                  onClick={() => handleOpenNotification(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-emerald-50/40' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />}
                    <div className={n.read ? 'pl-3.5' : ''}>
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      {n.message && <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>}
                      <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
