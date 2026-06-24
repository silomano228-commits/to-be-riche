'use client';

import { useEffect, useState } from 'react';
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

const REFRESH_REGEX = /actualisez/i;
const STORAGE_KEY = 'beRich.refreshBanner.dismissedAt';
const DISMISS_COOLDOWN_MS = 60_000; // re-show after 60s if new refresh notifs arrive
const POLL_INTERVAL_MS = 30_000;

/**
 * RefreshReminderBanner
 *
 * Shows a sticky amber banner at the top of the page whenever the user has
 * UNREAD notifications whose message contains the word "actualisez"
 * (case-insensitive). The banner reminds the user to refresh the page to
 * see their updated balance — the backend's "funds_released", "referral_reward",
 * "deposit_approved" etc. notifications all include this hint.
 *
 * Dismissable via a small ✕ button (hidden for ~60s, then re-appears if the
 * poll still finds unread refresh notifications). The "Actualiser" button
 * hard-reloads the page so the new balance is fetched.
 */
export default function RefreshReminderBanner() {
  const { user } = useAppStore();
  const [show, setShow] = useState(false);
  const [lastSeenId, setLastSeenId] = useState<string | null>(null);

  useEffect(() => {
    // Banner visibility for logged-out users is handled in render (returns null).
    if (!user) return;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        const res = await authFetch('/api/notifications?unreadOnly=true');
        const data = await res.json();
        if (!active || !data?.success) return;
        const notifs: Notif[] = data.notifications || [];
        const refreshNotifs = notifs.filter(n => REFRESH_REGEX.test(n.message || ''));
        if (refreshNotifs.length === 0) {
          setShow(false);
          return;
        }
        // Re-show if a new refresh notification has arrived since last dismiss.
        const newestId = refreshNotifs[0]?.id;
        const dismissedAt = Number(sessionStorage.getItem(STORAGE_KEY) || 0);
        const dismissedRecently = Date.now() - dismissedAt < DISMISS_COOLDOWN_MS;
        if (dismissedRecently && lastSeenId === newestId) {
          // Stay hidden — same notification, recently dismissed.
          return;
        }
        setLastSeenId(newestId ?? null);
        setShow(true);
      } catch {
        /* ignore — banner is non-critical */
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, lastSeenId]);

  const handleDismiss = () => {
    try { sessionStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* ignore */ }
    setShow(false);
  };

  const handleRefresh = () => {
    // Clear dismissed flag so banner can reappear after reload if needed.
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    if (typeof window !== 'undefined') window.location.reload();
  };

  if (!user || !show) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] px-3 py-2 flex items-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
      style={{
        background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
        color: '#1F2937',
        animation: 'refreshBannerIn 0.3s ease-out',
      }}
      role="status"
      aria-live="polite"
    >
      <i className="fas fa-sync-alt text-[0.85rem] shrink-0" style={{ animation: 'spin 2s linear infinite' }} />
      <div className="flex-1 min-w-0 text-[0.7rem] font-bold leading-tight">
        🔄 Vous avez des opérations en cours — actualisez la page pour voir votre solde à jour.
      </div>
      <button
        onClick={handleRefresh}
        className="shrink-0 px-3 py-1.5 rounded-full text-[0.7rem] font-black cursor-pointer border-none active:scale-95 transition-transform"
        style={{ background: '#050506', color: '#FBBF24' }}
      >
        Actualiser
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer border-none text-[0.7rem] bg-transparent"
        style={{ color: 'rgba(31,41,55,0.7)' }}
      >
        ✕
      </button>
      <style>{`
        @keyframes refreshBannerIn {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
