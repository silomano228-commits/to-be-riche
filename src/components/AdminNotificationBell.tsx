'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore, authFetch } from '@/lib/store';

interface AdminNotif {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  ticketId: string | null;
  userId: string | null;
  depositId: string | null;
  withdrawalId: string | null;
  createdAt: string;
}

/**
 * AdminNotificationBell
 *
 * Task 7 — Investment approval flow:
 *   - Shows a bell icon with a badge containing the count of UNREAD admin
 *     notifications (new deposit/withdrawal requests, support tickets, etc.).
 *   - Polls /api/admin/notifications every 15s and refreshes the badge.
 *   - Uses the Web Notifications API to fire a desktop notification whenever
 *     a NEW admin notification arrives — so the admin is alerted even if the
 *     site is not in focus (works on desktop PWA + Android).
 *   - Clicking the bell opens a dropdown with the latest admin notifications
 *     and a "Tout marquer lu" button.
 */
export default function AdminNotificationBell({ dark = false }: { dark?: boolean }) {
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AdminNotif | null>(null);

  // Track which notification IDs we've already announced with a desktop
  // notification, so we don't re-fire them on every poll.
  const announcedRef = useRef<Set<string>>(new Set());
  // Track the highest seen createdAt so we only fire desktop notifications
  // for notifications newer than what we've already seen.
  const lastSeenTsRef = useRef<number>(0);
  // Track the previous unread count so we know when it goes UP (new notif).
  const prevUnreadRef = useRef<number>(0);

  // Fire a desktop notification via the Web Notifications API. Safe to call
  // from inside an effect — guards against missing permission / unsupported
  // browsers. Declared before the polling effect so it can be referenced.
  const fireDesktopNotification = (n: AdminNotif) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification('Be Rich — Admin', {
        body: `${n.title}\n${n.message}`,
        icon: '/logo.png',
        tag: n.id,
      });
    } catch { /* */ }
  };

  // Request desktop notification permission on mount (admin only).
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { Notification.requestPermission(); } catch { /* */ }
    }
  }, [user]);

  // Poll /api/admin/notifications for unread count + fire desktop notifs.
  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await authFetch('/api/admin/notifications?unreadOnly=true');
        const data = await res.json();
        if (!data.success || !active) return;

        const newCount: number = data.unreadCount || 0;
        const prevCount = prevUnreadRef.current;
        setUnreadCount(newCount);

        // Fire desktop notifications only when the count has INCREASED
        // (i.e. a brand-new admin notification has arrived).
        if (newCount > prevCount && prevCount !== 0) {
          // Fetch the latest unread notifications to find the new ones.
          try {
            const resAll = await authFetch('/api/admin/notifications?unreadOnly=true');
            const dataAll = await resAll.json();
            if (dataAll.success && Array.isArray(dataAll.notifications)) {
              const newNotifs: AdminNotif[] = dataAll.notifications.filter(
                (n: AdminNotif) => !announcedRef.current.has(n.id) && new Date(n.createdAt).getTime() > lastSeenTsRef.current
              );
              newNotifs.forEach((n) => {
                announcedRef.current.add(n.id);
                const ts = new Date(n.createdAt).getTime();
                if (ts > lastSeenTsRef.current) lastSeenTsRef.current = ts;
                fireDesktopNotification(n);
              });
            }
          } catch { /* */ }
        } else if (prevCount === 0 && newCount > 0) {
          // First poll with notifications — seed the announced set so we
          // don't fire a flood of desktop notifications on initial load.
          try {
            const resAll = await authFetch('/api/admin/notifications?unreadOnly=true');
            const dataAll = await resAll.json();
            if (dataAll.success && Array.isArray(dataAll.notifications)) {
              dataAll.notifications.forEach((n: AdminNotif) => {
                announcedRef.current.add(n.id);
                const ts = new Date(n.createdAt).getTime();
                if (ts > lastSeenTsRef.current) lastSeenTsRef.current = ts;
              });
            }
          } catch { /* */ }
        }
        prevUnreadRef.current = newCount;
      } catch { /* */ }
    };

    poll();
    const interval = setInterval(poll, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  // Fetch all admin notifications when the dropdown opens.
  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    const load = async () => {
      try {
        const res = await authFetch('/api/admin/notifications');
        const data = await res.json();
        if (data.success && active) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch { /* */ }
    };
    load();
    return () => { active = false; };
  }, [open, user]);

  const markAllRead = async () => {
    try {
      await authFetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* */ }
  };

  const handleNotifClick = async (notif: AdminNotif) => {
    if (!notif.read) {
      try {
        await authFetch('/api/admin/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notificationId: notif.id }),
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* */ }
    }
    setSelectedNotif(notif);
  };

  const getIcon = (type: string) => {
    if (type === 'investment_deposit_request') return 'fa-chart-line';
    if (type === 'investment_withdrawal_request') return 'fa-money-bill-transfer';
    if (type === 'deposit_request') return 'fa-coins';
    if (type === 'withdrawal_request') return 'fa-money-bill-wave';
    if (type === 'support_ticket') return 'fa-life-ring';
    if (type === 'new_message') return 'fa-comment-dots';
    if (type === 'referral_new') return 'fa-user-plus';
    return 'fa-bell';
  };

  const getColor = (type: string) => {
    if (type.includes('investment')) return '#22C55E';
    if (type.includes('withdrawal')) return '#14B8A6';
    if (type.includes('deposit')) return '#6366F1';
    if (type.includes('message')) return '#3B82F6';
    if (type.includes('ticket') || type.includes('support')) return '#F59E0B';
    return '#8B5CF6';
  };

  // Navigate the admin to the right tab based on the notification type
  const navigateFromNotif = (notif: AdminNotif) => {
    // The admin screen reads the active tab from its own state, so we can't
    // switch tabs directly. Instead, we close the dropdown and let the admin
    // navigate manually. (A future enhancement could use a global store.)
    setSelectedNotif(null);
    setOpen(false);
    void notif;
  };

  if (!user || user.role !== 'admin') return null;

  const btnClass = dark
    ? 'w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.55)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 relative'
    : 'w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.6)] backdrop-blur-sm text-[rgba(0,0,0,0.55)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 relative';

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className={btnClass}
        title="Notifications admin"
      >
        <i className="fas fa-shield-halved" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#F87171] text-white text-[0.55rem] font-bold rounded-full flex items-center justify-center"
            style={{ animation: 'pulse 2s ease-in-out infinite' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && !selectedNotif && (
        <>
          <div className="fixed inset-0 z-[4999]" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-11 w-[320px] max-h-[440px] bg-[#0E0F11] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] z-[5000] overflow-hidden"
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[rgba(255,255,255,0.06)]">
              <span className="text-[0.82rem] font-bold text-[#EDEDEF] flex items-center gap-1.5">
                <i className="fas fa-shield-halved text-[0.7rem]" style={{ color: '#6366F1' }}></i>
                Notifications admin
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[0.65rem] text-[#4ADE80] font-semibold bg-transparent border-none cursor-pointer"
                >
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[380px]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <i className="fas fa-bell-slash text-[1.5rem] text-[rgba(255,255,255,0.15)] mb-2"></i>
                  <p className="text-[0.75rem] text-[rgba(255,255,255,0.3)]">Aucune notification admin</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full text-left p-3 flex items-start gap-2.5 border-b border-[rgba(255,255,255,0.04)] cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.03)] bg-transparent border-x-0 border-t-0"
                    style={{ borderLeftWidth: n.read ? '0' : '3px', borderLeftColor: getColor(n.type) }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${getColor(n.type)}1A` }}
                    >
                      <i className={`fas ${getIcon(n.type)} text-[0.7rem]`} style={{ color: getColor(n.type) }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.75rem] font-semibold text-[#EDEDEF] leading-tight">{n.title}</div>
                      <div className="text-[0.68rem] text-[rgba(255,255,255,0.5)] leading-snug mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[0.58rem] text-[rgba(255,255,255,0.3)] mt-1">
                        {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#6366F1] shrink-0 mt-2"></div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* Full notification detail modal */}
      {selectedNotif && (
        <>
          <div className="fixed inset-0 bg-black/60 z-[5999]" onClick={() => setSelectedNotif(null)} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[380px] bg-[#0E0F11] rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.08)] z-[6000] overflow-hidden"
            style={{ animation: 'modalIn 0.25s ease-out' }}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 p-4 border-b border-[rgba(255,255,255,0.06)]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${getColor(selectedNotif.type)}20` }}
              >
                <i className={`fas ${getIcon(selectedNotif.type)} text-[0.9rem]`} style={{ color: getColor(selectedNotif.type) }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] font-bold text-[#EDEDEF]">{selectedNotif.title}</div>
                <div className="text-[0.62rem] text-[rgba(255,255,255,0.4)]">
                  {new Date(selectedNotif.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] border-none cursor-pointer text-[rgba(255,255,255,0.55)] text-[0.7rem] shrink-0 hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Modal body */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              <p className="text-[0.8rem] text-[rgba(255,255,255,0.75)] leading-relaxed whitespace-pre-wrap">{selectedNotif.message}</p>
            </div>

            {/* Modal footer */}
            <div className="p-3 border-t border-[rgba(255,255,255,0.06)] flex gap-2">
              <button
                onClick={() => setSelectedNotif(null)}
                className="flex-1 py-2.5 rounded-xl text-[0.78rem] font-semibold bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.6)] border-none cursor-pointer hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => navigateFromNotif(selectedNotif)}
                className="flex-1 py-2.5 rounded-xl text-[0.78rem] font-semibold bg-[#6366F1] text-white border-none cursor-pointer hover:bg-[#4F46E5] transition-colors"
              >
                <i className="fas fa-shield-alt mr-1.5 text-[0.7rem]"></i>Voir l'admin
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
