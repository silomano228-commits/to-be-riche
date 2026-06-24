'use client';

import { useState, useEffect } from 'react';
import { useAppStore, authFetch } from '@/lib/store';

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationBell({ dark = false }: { dark?: boolean }) {
  const { user, setPage } = useAppStore();
  const [notifications, setNotifications] = useState<Notif[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notif | null>(null);

  // Poll for unread count every 15 seconds
  useEffect(() => {
    let active = true;
    const poll = async () => {
      if (!user || !active) return;
      try {
        const res = await authFetch('/api/notifications?unreadOnly=true');
        const data = await res.json();
        if (data.success && active) {
          setUnreadCount(data.unreadCount);
        }
      } catch { /* */ }
    };
    poll();
    const interval = setInterval(poll, 15000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  // Fetch all when dropdown opens
  useEffect(() => {
    if (!open || !user) return;
    let active = true;
    const load = async () => {
      try {
        const res = await authFetch('/api/notifications');
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
      await authFetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { /* */ }
  };

  const handleNotifClick = async (notif: Notif) => {
    if (!notif.read) {
      try {
        await authFetch('/api/notifications', {
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
    switch (type) {
      case 'deposit_approved': return 'fa-check-circle';
      case 'deposit_rejected': return 'fa-times-circle';
      case 'withdrawal_approved': return 'fa-check-circle';
      case 'withdrawal_executed': return 'fa-money-bill-wave';
      case 'withdrawal_rejected': return 'fa-times-circle';
      case 'new_message': return 'fa-comment-dots';
      case 'referral_new': return 'fa-user-plus';
      default: return 'fa-bell';
    }
  };

  const getColor = (type: string) => {
    if (type.includes('approved') || type.includes('executed')) return '#22C55E';
    if (type.includes('rejected')) return '#F87171';
    if (type.includes('message')) return '#3B82F6';
    if (type.includes('referral')) return '#F59E0B';
    return '#6B7280';
  };

  // Extract the sentence containing "actualisez" (case-insensitive) so we can
  // surface it as a prominent refresh callout in the detail modal.
  const REFRESH_REGEX = /actualisez/i;
  const getRefreshSentence = (msg: string): string | null => {
    if (!msg || !REFRESH_REGEX.test(msg)) return null;
    // Grab the surrounding sentence (delimited by . ! ? or end of string).
    const m = msg.match(/[^.!?]*actualisez[^.!?]*[.!?]*/i);
    return m ? m[0].trim() : 'Actualisez votre page pour voir les changements.';
  };

  if (!user) return null;

  const btnClass = dark
    ? 'w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 relative'
    : 'w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.6)] backdrop-blur-sm text-[rgba(0,0,0,0.55)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 relative';

  return (
    <div className="relative">
      {/* Bell button */}
      <button onClick={() => setOpen(!open)} className={btnClass}>
        <i className="fas fa-bell" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#F87171] text-white text-[0.55rem] font-bold rounded-full flex items-center justify-center" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && !selectedNotif && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-[4999]" onClick={() => setOpen(false)} />
          
          <div
            className="absolute right-0 top-11 w-[300px] max-h-[400px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.08)] z-[5000] overflow-hidden"
            style={{ animation: 'modalIn 0.2s ease-out' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-[rgba(0,0,0,0.06)]">
              <span className="text-[0.82rem] font-bold text-[#1F2937]">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[0.65rem] text-[#22C55E] font-semibold bg-transparent border-none cursor-pointer">
                  Tout marquer lu
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[340px]">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <i className="fas fa-bell-slash text-[1.5rem] text-[rgba(0,0,0,0.15)] mb-2"></i>
                  <p className="text-[0.75rem] text-[rgba(0,0,0,0.35)]">Aucune notification</p>
                </div>
              ) : (
                notifications.map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className="w-full text-left p-3 flex items-start gap-2.5 border-b border-[rgba(0,0,0,0.04)] cursor-pointer transition-colors hover:bg-[rgba(0,0,0,0.02)] bg-transparent border-x-0 border-t-0"
                    style={{ borderLeftWidth: n.read ? '0' : '3px', borderLeftColor: getColor(n.type) }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${getColor(n.type)}15` }}
                    >
                      <i className={`fas ${getIcon(n.type)} text-[0.7rem]`} style={{ color: getColor(n.type) }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.75rem] font-semibold text-[#1F2937] leading-tight">{n.title}</div>
                      <div className="text-[0.68rem] text-[rgba(0,0,0,0.5)] leading-snug mt-0.5 line-clamp-2">{n.message}</div>
                      <div className="text-[0.58rem] text-[rgba(0,0,0,0.3)] mt-1">
                        {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0 mt-2"></div>
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
          <div className="fixed inset-0 bg-black/50 z-[5999]" onClick={() => setSelectedNotif(null)} />
          <div
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[380px] bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.2)] z-[6000] overflow-hidden"
            style={{ animation: 'modalIn 0.25s ease-out' }}
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 p-4 border-b border-[rgba(0,0,0,0.06)]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${getColor(selectedNotif.type)}20` }}
              >
                <i className={`fas ${getIcon(selectedNotif.type)} text-[0.9rem]`} style={{ color: getColor(selectedNotif.type) }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.85rem] font-bold text-[#1F2937]">{selectedNotif.title}</div>
                <div className="text-[0.62rem] text-[rgba(0,0,0,0.35)]">
                  {new Date(selectedNotif.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.05)] border-none cursor-pointer text-[rgba(0,0,0,0.4)] text-[0.7rem] shrink-0 hover:bg-[rgba(0,0,0,0.1)] transition-colors"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            {/* Modal body - full message */}
            <div className="p-4 max-h-[50vh] overflow-y-auto">
              {/* Refresh callout — shown when the notification message asks the user to refresh. */}
              {(() => {
                const sentence = getRefreshSentence(selectedNotif.message);
                if (!sentence) return null;
                return (
                  <div
                    className="rounded-lg p-3 mb-3 flex items-start gap-2.5"
                    style={{
                      background: '#FFFBEB', // amber-50
                      border: '2px solid #FCD34D', // amber-300
                    }}
                  >
                    <i className="fas fa-sync-alt text-[0.85rem] mt-0.5 shrink-0" style={{ color: '#B45309', animation: 'spin 2.5s linear infinite' }} />
                    <div>
                      <div className="text-[0.72rem] font-black mb-0.5" style={{ color: '#92400E' }}>
                        🔄 Actualisez votre page
                      </div>
                      <div className="text-[0.7rem] font-bold leading-snug" style={{ color: '#78350F' }}>
                        {sentence}
                      </div>
                    </div>
                  </div>
                );
              })()}
              <p className="text-[0.8rem] text-[rgba(0,0,0,0.7)] leading-relaxed whitespace-pre-wrap">{selectedNotif.message}</p>
            </div>

            {/* Modal footer */}
            <div className="p-3 border-t border-[rgba(0,0,0,0.06)] flex gap-2">
              <button
                onClick={() => setSelectedNotif(null)}
                className="flex-1 py-2.5 rounded-xl text-[0.78rem] font-semibold bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.6)] border-none cursor-pointer hover:bg-[rgba(0,0,0,0.1)] transition-colors"
              >
                Fermer
              </button>
              {selectedNotif.link && (
                <button
                  onClick={() => {
                    setPage(selectedNotif.link!);
                    setSelectedNotif(null);
                    setOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl text-[0.78rem] font-semibold bg-[#22C55E] text-white border-none cursor-pointer hover:bg-[#16A34A] transition-colors"
                >
                  Voir
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
