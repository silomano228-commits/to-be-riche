'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

const REQUIRED_REFERRALS = 10;

// Daily spin limit (kept in sync with /api/game/status)
const DAILY_SPINS = 10;

interface GameStats {
  spinsUsed: number;
  spinsRemaining: number;
  dailySpins: number;
  totalWonToday: number;
}

export default function ProfileScreen() {
  const { user, clearUser, setPage, addToast } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showReferrals, setShowReferrals] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [worldLink, setWorldLink] = useState<string | null>(null);
  const [worldLinkSeen, setWorldLinkSeen] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  // shareUrl is only the window origin — safe to compute lazily on the client.
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : 'https://beriche.duckdns.org';

  const loadReferrals = async () => {
    try {
      const res = await authFetch('/api/referral/list');
      const data = await res.json();
      if (data.success) { setReferrals(data.referrals || []); setShowReferrals(true); }
    } catch { /* */ }
  };

  // Fetch world link if user has 10+ referrals
  useEffect(() => {
    if (!user) return;
    const referralCount = user.referralCount || 0;
    if (referralCount < REQUIRED_REFERRALS) return;

    authFetch('/api/user/world-link')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data?.link) {
          setWorldLink(data.data.link);
          setWorldLinkSeen(data.data.seen || false);
        }
      })
      .catch(() => { /* */ });
  }, [user]);

  // Fetch wheel game stats (spins used / total won today)
  useEffect(() => {
    if (!user) return;
    authFetch('/api/game/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setGameStats({
            spinsUsed: data.spinsUsed ?? 0,
            spinsRemaining: data.spinsRemaining ?? DAILY_SPINS,
            dailySpins: data.dailySpins ?? DAILY_SPINS,
            totalWonToday: data.totalWonToday || 0,
          });
        }
      })
      .catch(() => { /* */ });
  }, [user?.id]);

  const referralLink = `${shareUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://beriche.duckdns.org')}/?ref=${user?.referralCode || ''}`;

  const buildShareText = () =>
    `Rejoins Be Rich et gagne de l'argent ! Utilise mon code: ${user?.referralCode || ''}. Inscris-toi: ${referralLink}`;

  const handleCopyCode = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      addToast('Code copié !', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = user.referralCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      addToast('Code copié !', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!user?.referralCode) return;
    const shareData = {
      title: 'Be Rich',
      text: buildShareText(),
      url: referralLink,
    };
    // Try native share sheet first (mostly mobile)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
        return;
      } catch (err: any) {
        // If the user explicitly cancelled, do NOT show the fallback
        if (err && err.name === 'AbortError') return;
        // For any other error, fall through to custom sheet
      }
    }
    // Fallback custom share sheet (desktop / unsupported browsers)
    setShareSheetOpen(true);
  };

  // Open a share URL in a new tab and give feedback
  const openShareUrl = (url: string, label: string) => {
    try {
      if (url.startsWith('sms:') || url.startsWith('mailto:')) {
        // Use window.open with _self to navigate on the same tab for SMS / mail
        window.open(url, '_self');
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      addToast(`Partage via ${label} ouvert`, 'success');
    } catch {
      addToast(`Impossible d'ouvrir ${label}`, 'error');
    }
  };

  const handleShareVia = (platform: string) => {
    if (!user?.referralCode) return;
    const text = buildShareText();
    const url = referralLink;
    const enc = encodeURIComponent;

    switch (platform) {
      case 'whatsapp':
        openShareUrl(`https://wa.me/?text=${enc(text)}`, 'WhatsApp');
        break;
      case 'whatsapp_business':
        openShareUrl(`https://api.whatsapp.com/send?text=${enc(text)}`, 'WhatsApp Business');
        break;
      case 'telegram':
        openShareUrl(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, 'Telegram');
        break;
      case 'facebook':
        openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}`, 'Facebook');
        break;
      case 'sms':
        openShareUrl(`sms:?&body=${enc(text)}`, 'SMS');
        break;
      case 'tiktok':
      case 'instagram':
      case 'snapchat':
        // These platforms have no direct share URL — copy link + open the app/site
        copyLinkThenOpen(platform);
        break;
      case 'copy':
        copyLinkOnly();
        break;
      default:
        break;
    }
    setShareSheetOpen(false);
  };

  const copyLinkOnly = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* */ }
      document.body.removeChild(ta);
    }
    setShared(true);
    addToast('Lien copié !', 'success');
    setTimeout(() => setShared(false), 2000);
  };

  const copyLinkThenOpen = async (platform: string) => {
    const target: Record<string, { url: string; label: string }> = {
      tiktok: { url: 'https://www.tiktok.com/', label: 'TikTok' },
      instagram: { url: 'https://www.instagram.com/', label: 'Instagram' },
      snapchat: { url: 'https://www.snapchat.com/', label: 'Snapchat' },
    };
    const t = target[platform];
    if (!t) return;
    // Copy the referral link first, then open the app/site so the user can paste
    try {
      await navigator.clipboard.writeText(referralLink);
      addToast(`Lien copié — collez-le sur ${t.label}`, 'success');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* */ }
      document.body.removeChild(ta);
      addToast(`Lien copié — collez-le sur ${t.label}`, 'success');
    }
    setTimeout(() => window.open(t.url, '_blank', 'noopener,noreferrer'), 300);
  };

  const handleWorldLinkClick = async () => {
    if (!worldLink) return;
    try {
      await authFetch('/api/user/world-link', { method: 'POST' });
      setWorldLinkSeen(true);
    } catch { /* */ }
    window.open(worldLink, '_blank', 'noopener');
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout'); } catch { /* */ }
    clearUser();
    addToast('Déconnecté', 'info');
  };

  if (!user) return null;

  const requiredReferrals = user.requiredReferrals || 0;
  const currentReferrals = user.referralCount || 0;
  const needsMore = Math.max(0, requiredReferrals - currentReferrals);
  const referralProgress = requiredReferrals > 0 ? Math.min(100, (currentReferrals / requiredReferrals) * 100) : 100;

  // Determine investment level based on unlockedLevel
  const investLevelIdx = Math.max(0, Math.min(INVEST_LEVELS.length - 1, (user.unlockedLevel || 1) - 1));
  const currentInvestLevel = INVEST_LEVELS[investLevelIdx];
  const nextInvestLevel = investLevelIdx < INVEST_LEVELS.length - 1 ? INVEST_LEVELS[investLevelIdx + 1] : null;

  // Referral next level
  const referralNextLevel = INVEST_LEVELS.find(l => (user.referralCount || 0) < l.requiredReferrals);
  const referralRemaining = referralNextLevel ? referralNextLevel.requiredReferrals - (user.referralCount || 0) : 0;

  // Wheel game helpers
  const spinsRemaining = gameStats?.spinsRemaining ?? (DAILY_SPINS - (user.gameSpinsUsed ?? 0));
  const spinsUsed = gameStats?.spinsUsed ?? (user.gameSpinsUsed ?? 0);
  const dailySpins = gameStats?.dailySpins ?? DAILY_SPINS;
  const totalWonToday = gameStats?.totalWonToday ?? 0;
  const spinsProgress = dailySpins > 0 ? Math.min(100, (spinsRemaining / dailySpins) * 100) : 0;

  return (
    <>
      <style>{`
        @keyframes avatarBreathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 25px 6px rgba(34,197,94,0.18); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressShine {
          from { background-position: -200% center; }
          to { background-position: 200% center; }
        }
      `}</style>

      <Header title="Profil" icon="fa-user" iconColor="#22C55E" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none mr-1" style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.55)' }}><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0" style={{ background: '#F8F9FA' }}>

        {/* User Card — impressive gradient header */}
        <div
          className="relative overflow-hidden rounded-2xl p-6 mb-4"
          style={{
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 40%, #15803D 100%)',
          }}
        >
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}></div>
          <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}></div>
          <div className="absolute top-2 right-2 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}></div>

          <div className="flex items-center gap-4 mb-5 relative">
            {/* Larger avatar with stronger glow */}
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-[1.6rem]"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  border: '3px solid rgba(255,255,255,0.3)',
                  boxShadow: '0 0 30px rgba(255,255,255,0.15)',
                  animation: 'avatarBreathe 3s ease-in-out infinite',
                }}
              >
                {esc(user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2))}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full" style={{ background: '#4ADE80', border: '3px solid #22C55E' }}></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[1.2rem] font-black text-white truncate">{esc(user.name)}</div>
              <div className="text-[0.78rem] text-white/70">{esc(user.email)}</div>
              <div className="flex items-center gap-2 mt-1.5">
                {user.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 text-[0.6rem] px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white">
                    <i className="fas fa-shield-alt text-[0.5rem]"></i>Admin
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[0.6rem] px-2 py-0.5 rounded-full font-semibold bg-white/20 text-white">
                  <i className="fas fa-star text-[0.5rem]"></i>{currentInvestLevel.name}
                </span>
              </div>
            </div>
          </div>

          {/* Account grid on gradient background */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <div className="text-[0.6rem] uppercase text-white/60">Principal</div>
              <div className="text-[0.95rem] font-black text-white">{formatMoney(user.balance)}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <div className="text-[0.6rem] uppercase text-white/60">Jeu</div>
              <div className="text-[0.95rem] font-black text-white">{formatMoney(user.gameTotalWon ?? 0)}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}>
              <div className="text-[0.6rem] uppercase text-white/60">Projet</div>
              <div className="text-[0.95rem] font-black text-white">{formatMoney(user.projectBalance)}</div>
            </div>
          </div>
        </div>

        {/* Niveau d'Investissement Section */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.12)' }}>
              <i className={`fas ${currentInvestLevel.icon} text-[0.75rem]`} style={{ color: currentInvestLevel.color }}></i>
            </div>
            <div className="flex-1">
              <h4 className="text-[0.88rem] font-bold" style={{ color: '#1F2937' }}>Niveau d'Investissement</h4>
              <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>Votre niveau actuel de placement</div>
            </div>
            <span
              className="text-[0.75rem] font-bold px-3 py-1 rounded-full"
              style={{ background: `${currentInvestLevel.color}20`, color: currentInvestLevel.color }}
            >
              {currentInvestLevel.name}
            </span>
          </div>

          {/* Progress bar to next level */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.68rem]" style={{ color: 'rgba(0,0,0,0.4)' }}>Niveau {currentInvestLevel.level}/{INVEST_LEVELS.length}</span>
              {nextInvestLevel && (
                <span className="text-[0.68rem] font-semibold" style={{ color: nextInvestLevel.color }}>→ {nextInvestLevel.name}</span>
              )}
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(currentInvestLevel.level / INVEST_LEVELS.length) * 100}%`,
                  background: `linear-gradient(90deg, ${currentInvestLevel.color}, ${nextInvestLevel?.color || currentInvestLevel.color})`,
                }}
              ></div>
            </div>
            <div className="flex justify-between mt-1.5">
              {INVEST_LEVELS.map((lvl, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: i <= investLevelIdx ? lvl.color : 'rgba(0,0,0,0.15)',
                      boxShadow: i <= investLevelIdx ? `0 0 4px ${lvl.color}40` : 'none',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {nextInvestLevel && nextInvestLevel.requiredReferrals > (user.referralCount || 0) && (
            <div className="mt-3 rounded-lg p-2.5 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.03)' }}>
              <i className="fas fa-info-circle text-[0.6rem]" style={{ color: nextInvestLevel.color }}></i>
              <span className="text-[0.62rem]" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Encore <strong>{nextInvestLevel.requiredReferrals - (user.referralCount || 0)}</strong> parrainé{nextInvestLevel.requiredReferrals - (user.referralCount || 0) > 1 ? 's' : ''} ou frais de {nextInvestLevel.unlockFee}$ pour débloquer {nextInvestLevel.name}
              </span>
            </div>
          )}
        </div>

        {/* Niveau de Jeu / Jeu de Roue Section */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248,113,113,0.12)' }}>
              <i className="fas fa-circle-notch text-[0.75rem]" style={{ color: '#F87171' }}></i>
            </div>
            <div className="flex-1">
              <h4 className="text-[0.88rem] font-bold" style={{ color: '#1F2937' }}>Jeu de Roue</h4>
              <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>Vos parties de roue quotidienne</div>
            </div>
            <span
              className="text-[0.75rem] font-bold px-3 py-1 rounded-full"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#F87171' }}
            >
              {spinsRemaining}/{dailySpins}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.08)' }}>
              <div className="text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Parties jouées</div>
              <div className="text-[1rem] font-black" style={{ color: '#F87171' }}>{spinsUsed}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.08)' }}>
              <div className="text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Gagné aujourd'hui</div>
              <div className="text-[1rem] font-black" style={{ color: '#22C55E' }}>{formatMoney(totalWonToday)}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.08)' }}>
              <div className="text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Total cumulé</div>
              <div className="text-[1rem] font-black" style={{ color: '#6366F1' }}>{formatMoney(user.gameTotalWon ?? 0)}</div>
            </div>
          </div>

          {/* Progress bar: tours restants aujourd'hui */}
          <div className="relative mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[0.68rem]" style={{ color: 'rgba(0,0,0,0.4)' }}>Tours restants aujourd'hui</span>
              <span className="text-[0.68rem] font-semibold" style={{ color: '#F87171' }}>{spinsRemaining}/{dailySpins}</span>
            </div>
            <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${spinsProgress}%`,
                  background: 'linear-gradient(90deg, #F87171, #EF4444)',
                  maxWidth: '100%',
                }}
              ></div>
            </div>
          </div>

          <button
            onClick={() => setPage('game')}
            className="w-full py-2.5 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #F87171, #EF4444)',
              color: '#FFFFFF',
              boxShadow: '0 2px 12px rgba(248,113,113,0.25)',
            }}
          >
            <i className="fas fa-play text-[0.6rem]"></i>
            {spinsRemaining > 0 ? 'Jouer maintenant' : 'Voir le jeu'}
          </button>
        </div>

        {/* Referral Stats — prominent section */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <i className="fas fa-gift" style={{ color: '#F59E0B' }}></i>
            <h4 className="text-[0.88rem] font-bold" style={{ color: '#1F2937' }}>Parrainage</h4>
            <span
              className="ml-auto text-[0.7rem] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: (user.referralCount || 0) >= REQUIRED_REFERRALS ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                color: (user.referralCount || 0) >= REQUIRED_REFERRALS ? '#22C55E' : '#F59E0B',
              }}
            >
              {user.referralCount || 0}/{REQUIRED_REFERRALS}
            </span>
          </div>

          {/* Referral Code — light bg, gold accent */}
          <div
            className="rounded-xl p-3 mb-3 flex items-center justify-between"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.1)',
            }}
          >
            <div>
              <div className="text-[0.68rem] mb-0.5" style={{ color: 'rgba(0,0,0,0.45)' }}>Votre code</div>
              <div className="text-[1.1rem] font-mono font-black" style={{ color: '#F59E0B' }}>{user.referralCode}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="w-10 h-10 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all"
                style={{
                  background: shared ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)',
                  color: shared ? '#22C55E' : '#22C55E',
                  boxShadow: shared ? 'none' : '0 2px 12px rgba(34,197,94,0.15)',
                }}
                title="Partager le lien"
              >
                <i className={`fas ${shared ? 'fa-check' : 'fa-share-alt'} text-[0.85rem]`}></i>
              </button>
              <button
                onClick={handleCopyCode}
                className="w-10 h-10 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all"
                style={{
                  background: copied ? 'rgba(245,158,11,0.3)' : '#F59E0B',
                  color: copied ? '#F59E0B' : '#050506',
                  boxShadow: copied ? 'none' : '0 2px 12px rgba(245,158,11,0.25)',
                }}
                title="Copier le code"
              >
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-[0.85rem]`}></i>
              </button>
            </div>
          </div>

          {/* Referral Progress — prominent */}
          {requiredReferrals > 0 && (
            <div
              className="rounded-xl p-3 mb-3"
              style={{
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.72rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>Progrès pour retrait</span>
                <span className="text-[0.72rem] font-bold" style={{ color: '#F59E0B' }}>{currentReferrals}/{requiredReferrals}</span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(0,0,0,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${referralProgress}%`,
                    background: referralProgress >= 100
                      ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                      : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                  }}
                ></div>
              </div>
              {needsMore > 0 ? (
                <p className="text-[0.65rem]" style={{ color: 'rgba(34,197,94,0.7)' }}>
                  <i className="fas fa-info-circle mr-1"></i>Encore <strong>{needsMore}</strong> parrainé{needsMore > 1 ? 's' : ''} requis pour le retrait
                </p>
              ) : (
                <p className="text-[0.65rem]" style={{ color: '#22C55E' }}>
                  <i className="fas fa-check-circle mr-1"></i>Condition de parrainage remplie !
                </p>
              )}
            </div>
          )}

          {/* Referral stats row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.08)' }}>
              <div className="text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Parrainés actifs</div>
              <div className="text-[1rem] font-black" style={{ color: '#F59E0B' }}>{user.referralCount || 0}</div>
            </div>
            <div className="rounded-lg p-2.5 text-center" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.08)' }}>
              <div className="text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Prochain niveau</div>
              <div className="text-[1rem] font-black" style={{ color: referralNextLevel ? '#8B5CF6' : '#22C55E' }}>
                {referralNextLevel ? `+${referralRemaining}` : '✓'}
              </div>
            </div>
          </div>

          <button
            onClick={loadReferrals}
            className="w-full py-2.5 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(245,158,11,0.1)',
              color: '#F59E0B',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <i className="fas fa-list mr-1"></i>Voir mes parrainés
          </button>
        </div>

        {/* World Link Section — shown when 10+ referrals */}
        {(user.referralCount || 0) >= REQUIRED_REFERRALS && worldLink && (
          <div
            className="rounded-2xl p-4 mb-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(59,130,246,0.06))',
              border: '1px solid rgba(139,92,246,0.12)',
            }}
          >
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: 'rgba(139,92,246,0.05)' }} />
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.12)' }}>
                <i className="fas fa-globe text-[0.75rem]" style={{ color: '#8B5CF6' }}></i>
              </div>
              <div className="flex-1">
                <h4 className="text-[0.85rem] font-bold" style={{ color: '#8B5CF6' }}>Un nouvel horizon</h4>
                <div className="text-[0.6rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>Accès exclusif pour les membres fidèles</div>
              </div>
            </div>
            <p className="text-[0.65rem] mb-3" style={{ color: 'rgba(0,0,0,0.5)' }}>
              Découvrez des opportunités étendues réservées aux parrains les plus actifs.
            </p>
            <button
              onClick={handleWorldLinkClick}
              className="w-full py-2.5 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                color: '#FFFFFF',
                boxShadow: '0 2px 12px rgba(139,92,246,0.3)',
              }}
            >
              <i className="fas fa-external-link-alt text-[0.6rem]"></i>
              Découvrir
            </button>
          </div>
        )}

        {/* Referral List — white cards */}
        {showReferrals && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <h4 className="text-[0.82rem] font-bold mb-2" style={{ color: '#1F2937' }}>Mes parrainés ({referrals.length})</h4>
            {referrals.length === 0 ? (
              <p className="text-[0.75rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Aucun parrainé pour le moment.</p>
            ) : referrals.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: i < referrals.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
              >
                <div>
                  <div className="text-[0.78rem] font-semibold" style={{ color: '#1F2937' }}>{esc(r.name)}</div>
                  <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>{esc(r.email)}</div>
                </div>
                <span
                  className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: r.hasInvested ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)',
                    color: r.hasInvested ? '#22C55E' : 'rgba(239,68,68,0.6)',
                  }}
                >
                  {r.hasInvested ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Button — white bg with gold icon */}
        <button
          onClick={() => setPage('analytics')}
          className="w-full py-3.5 rounded-xl font-bold text-[0.88rem] border-none cursor-pointer mb-3 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
          style={{
            background: '#FFFFFF',
            color: '#1F2937',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
            <i className="fas fa-chart-bar text-[0.75rem]" style={{ color: '#6366F1' }}></i>
          </div>
          Analyses
        </button>

        {/* Admin Button — white bg with gold icon */}
        {user.role === 'admin' && (
          <button
            onClick={() => setPage('admin')}
            className="w-full py-3.5 rounded-xl font-bold text-[0.88rem] border-none cursor-pointer mb-3 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{
              background: '#FFFFFF',
              color: '#1F2937',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <i className="fas fa-shield-alt text-[0.75rem]" style={{ color: '#6366F1' }}></i>
            </div>
            Panneau Admin
          </button>
        )}

        {/* Logout — light bg with subtle red text */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3.5 rounded-xl font-semibold text-[0.88rem] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(0,0,0,0.04)',
            border: '1.5px solid rgba(239,68,68,0.12)',
            color: 'rgba(239,68,68,0.6)',
          }}
        >
          <i className="fas fa-sign-out-alt"></i> Déconnexion
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[6000] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="rounded-2xl p-7 w-[88%] max-w-[320px] text-center"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              animation: 'modalIn 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-[1.05rem] font-extrabold" style={{ color: '#1F2937' }}>Déconnexion</h3>
            <p className="text-[0.82rem] mb-5 leading-relaxed" style={{ color: 'rgba(0,0,0,0.55)' }}>Voulez-vous vous déconnecter ?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95"
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  color: 'rgba(0,0,0,0.55)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95"
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#F87171',
                }}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Share Sheet — fallback when navigator.share is unavailable */}
      {shareSheetOpen && (
        <div
          className="fixed inset-0 z-[7000] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShareSheetOpen(false)}
        >
          <div
            className="w-full sm:w-[420px] max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5"
            style={{
              background: '#FFFFFF',
              boxShadow: '0 -8px 30px rgba(0,0,0,0.18)',
              animation: 'slideUp 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[1rem] font-extrabold" style={{ color: '#1F2937' }}>Partager Be Rich</h3>
              <button
                onClick={() => setShareSheetOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer"
                style={{ background: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.55)' }}
                aria-label="Fermer"
              >
                <i className="fas fa-times text-[0.85rem]"></i>
              </button>
            </div>
            <p className="text-[0.72rem] mb-4" style={{ color: 'rgba(0,0,0,0.5)' }}>
              Partage ton code <strong style={{ color: '#F59E0B' }}>{user?.referralCode}</strong> et invite tes amis à rejoindre Be Rich.
            </p>

            {/* Referral link preview */}
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.12)' }}
            >
              <i className="fas fa-link text-[0.8rem]" style={{ color: '#F59E0B' }}></i>
              <span className="flex-1 text-[0.72rem] truncate font-mono" style={{ color: 'rgba(0,0,0,0.7)' }} title={referralLink}>{referralLink}</span>
            </div>

            {/* Platform grid */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { id: 'whatsapp', label: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366' },
                { id: 'whatsapp_business', label: 'WhatsApp Business', icon: 'fab fa-whatsapp', color: '#0B5A3E' },
                { id: 'telegram', label: 'Telegram', icon: 'fab fa-telegram-plane', color: '#0088CC' },
                { id: 'facebook', label: 'Facebook', icon: 'fab fa-facebook-f', color: '#1877F2' },
                { id: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok', color: '#000000' },
                { id: 'instagram', label: 'Instagram', icon: 'fab fa-instagram', color: '#E1306C' },
                { id: 'snapchat', label: 'Snapchat', icon: 'fab fa-snapchat-ghost', color: '#FFFC00' },
                { id: 'sms', label: 'SMS', icon: 'fas fa-comment-sms', color: '#22C55E' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleShareVia(p.id)}
                  className="flex flex-col items-center gap-1.5 cursor-pointer border-none bg-transparent"
                  title={p.label}
                >
                  <span
                    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform"
                    style={{ background: `${p.color}1A`, color: p.color }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  >
                    <i className={`${p.icon} text-[1.1rem]`}></i>
                  </span>
                  <span className="text-[0.62rem] text-center leading-tight" style={{ color: 'rgba(0,0,0,0.6)' }}>{p.label}</span>
                </button>
              ))}
            </div>

            {/* Copy link action */}
            <button
              onClick={() => handleShareVia('copy')}
              className="w-full mt-4 py-3 rounded-xl font-semibold text-[0.85rem] cursor-pointer transition-all active:scale-[0.98] flex items-center justify-center gap-2 border-none"
              style={{
                background: shared ? 'rgba(34,197,94,0.15)' : 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                color: shared ? '#22C55E' : '#0F172A',
              }}
            >
              <i className={`fas ${shared ? 'fa-check' : 'fa-copy'} text-[0.85rem]`}></i>
              {shared ? 'Lien copié !' : 'Copier le lien'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
