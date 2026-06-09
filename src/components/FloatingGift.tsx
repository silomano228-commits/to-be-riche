'use client';

import { useState, useEffect } from 'react';
import { useAppStore, esc, authFetch } from '@/lib/store';

const REQUIRED_REFERRALS = 10;

// Mysterious, enticing stage messages — like a slow reveal
const STAGE_MESSAGES = [
  { min: 0, msg: "Certains chemins mènent à des horizons insoupçonnés...", emoji: '🎁', sub: "Chaque connexion compte" },
  { min: 1, msg: "Une première étincelle... quelque chose s'éveille.", emoji: '✨', sub: "Le voyage commence" },
  { min: 2, msg: "Deux lueurs dans le noir. Le chemin s'éclaire.", emoji: '💫', sub: "L'élan se dessine" },
  { min: 3, msg: "Le cercle grandit. L'inattendu se prépare.", emoji: '🌟', sub: "Ça prend forme" },
  { min: 4, msg: "Presque à mi-chemin... la suite promet.", emoji: '🔮', sub: "Perspectives en vue" },
  { min: 5, msg: "La moitié du chemin. Un tournant approche.", emoji: '🌙', sub: "Mi-parcours atteint" },
  { min: 6, msg: "L'horizon se précise. Continuez.", emoji: '🌅', sub: "Direction claire" },
  { min: 7, msg: "Un monde nouveau se dessine.", emoji: '⭐', sub: "Presque là" },
  { min: 8, msg: "Les portes d'un univers plus vaste sont proches.", emoji: '🚪', sub: "À deux doigts" },
  { min: 9, msg: "Un dernier pas... et tout change.", emoji: '🔑', sub: "Le moment est proche" },
  { min: 10, msg: "Un nouveau monde s'offre à vous !", emoji: '🎉', sub: "Horizon débloqué" },
];

export default function FloatingGift() {
  const { user, addToast } = useAppStore();
  const [open, setOpen] = useState(false);
  const [animClass, setAnimClass] = useState('');
  const [pulse, setPulse] = useState(0);
  const [worldLink, setWorldLink] = useState<string | null>(null);
  const [worldLinkSeen, setWorldLinkSeen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => p + 1), 4000);
    return () => clearInterval(t);
  }, []);

  // Fetch world link when modal opens and user has 10+ referrals
  useEffect(() => {
    if (!open || !user) return;
    const referralCount = user.referralCount || 0;
    if (referralCount < REQUIRED_REFERRALS) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await authFetch('/api/user/world-link');
        const data = await res.json();
        if (!cancelled && data.success && data.data?.link) {
          setWorldLink(data.data.link);
          setWorldLinkSeen(data.data.seen || false);
        }
      } catch { /* */ }
    };
    load();
    return () => { cancelled = true; };
  }, [open, user]);

  if (!user) return null;

  const referralCount = user.referralCount || 0;
  const progress = Math.min(referralCount / REQUIRED_REFERRALS, 1);
  const stage = STAGE_MESSAGES.filter(s => referralCount >= s.min).pop() || STAGE_MESSAGES[0];
  const isComplete = referralCount >= REQUIRED_REFERRALS;
  const remaining = Math.max(0, REQUIRED_REFERRALS - referralCount);

  const handleWorldLinkClick = async () => {
    if (!worldLink) return;
    // Mark as seen
    try {
      await authFetch('/api/user/world-link', { method: 'POST' });
      setWorldLinkSeen(true);
    } catch { /* */ }
    // Open link
    window.open(worldLink, '_blank', 'noopener');
  };

  return (
    <>
      {/* Floating Gift Button + Parrainez Banner */}
      <div
        className="fixed z-[100] cursor-pointer"
        style={{ bottom: '80px', right: '18px' }}
        onClick={() => { setOpen(true); setAnimClass('giftModalIn'); }}
      >
        <div className="flex items-center gap-2">
          {/* Parrainez Banner — visible when not complete */}
          {!isComplete && (
            <div
              className="px-3 py-1.5 rounded-full text-[0.6rem] font-bold whitespace-nowrap"
              style={{
                background: 'linear-gradient(135deg, #F59E0B, #FBBF24)',
                color: '#050506',
                boxShadow: '0 2px 12px rgba(245,158,11,0.35)',
                animation: 'bannerPulse 2.5s ease-in-out infinite',
              }}
            >
              <i className="fas fa-gift mr-1 text-[0.5rem]"></i>
              Parrainez !
            </div>
          )}

          {/* Main button */}
          <div className="relative">
            {/* Prominent pulsing glow ring — larger */}
            <div className="absolute inset-0 w-[64px] h-[64px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(245,158,11,0.35) 0%, transparent 70%)',
                animation: 'giftGlow 2.5s ease-in-out infinite',
                transform: 'scale(1.8)',
              }}
            />
            {/* Second glow ring for extra prominence */}
            <div className="absolute inset-0 w-[64px] h-[64px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 60%)',
                animation: 'giftGlowOuter 3s ease-in-out infinite 0.5s',
                transform: 'scale(2.4)',
              }}
            />
            {/* Main circle — 64px with gold border */}
            <div
              className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                background: '#FFFFFF',
                border: '2px solid rgba(245,158,11,0.4)',
                boxShadow: isComplete
                  ? '0 0 24px rgba(245,158,11,0.35), 0 2px 8px rgba(0,0,0,0.08)'
                  : '0 2px 8px rgba(0,0,0,0.08)',
                animation: pulse % 2 === 0 ? 'giftFloat 3s ease-in-out infinite' : 'giftBreathe 4s ease-in-out infinite',
              }}
            >
              <span className="text-[1.6rem]">{stage.emoji}</span>
            </div>
            {/* Referral count badge — gold */}
            {referralCount > 0 && !isComplete && (
              <div
                className="absolute -top-1 -right-1 min-w-[20px] h-[20px] rounded-full flex items-center justify-center text-[0.6rem] font-bold px-1"
                style={{
                  background: '#F59E0B',
                  color: '#050506',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                }}
              >
                {referralCount}
              </div>
            )}
            {isComplete && (
              <div
                className="absolute -top-1 -right-1 w-[20px] h-[20px] rounded-full flex items-center justify-center text-[0.6rem] font-bold"
                style={{
                  background: '#F59E0B',
                  color: '#050506',
                  boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                }}
              >
                ✓
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.3)] backdrop-blur-sm" />
          <div
            className={`relative w-[88%] max-w-[340px] shadow-2xl overflow-hidden ${animClass}`}
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle gold line at top instead of gradient header */}
            <div className="h-[2px] w-full" style={{
              background: 'linear-gradient(90deg, transparent, #F59E0B, transparent)',
              opacity: isComplete ? 0.8 : 0.4,
            }} />

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none text-[0.7rem] transition-colors"
              style={{
                background: 'rgba(0,0,0,0.06)',
                color: 'rgba(0,0,0,0.55)',
              }}
            >
              ✕
            </button>

            {/* Gift animation area */}
            <div className="pt-8 pb-2 px-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="text-[3rem]" style={{
                    filter: isComplete ? 'drop-shadow(0 0 16px rgba(245,158,11,0.35))' : 'none',
                    animation: isComplete ? 'giftCelebrate 3s ease-in-out infinite' : 'giftWiggle 4s ease-in-out infinite',
                  }}>
                    {isComplete ? '🎉' : '🎁'}
                  </div>
                  {/* Subtle sparkles */}
                  {referralCount > 0 && !isComplete && (
                    <>
                      <div className="absolute -top-1 -left-2 text-[0.6rem] opacity-60" style={{ animation: 'sparkle 3s ease-in-out infinite' }}>✨</div>
                    </>
                  )}
                  {isComplete && (
                    <>
                      <div className="absolute -top-1 -left-2 text-[0.65rem] opacity-70" style={{ animation: 'sparkle 2.5s ease-in-out infinite' }}>✨</div>
                      <div className="absolute -top-2 right-0 text-[0.55rem] opacity-50" style={{ animation: 'sparkle 2.5s ease-in-out infinite 0.8s' }}>⭐</div>
                      <div className="absolute bottom-0 -right-3 text-[0.6rem] opacity-60" style={{ animation: 'sparkle 2.5s ease-in-out infinite 1.5s' }}>💫</div>
                    </>
                  )}
                </div>
              </div>

              {/* Main message */}
              <div className="text-center mb-1">
                <div className="text-[0.92rem] font-bold mb-1" style={{ color: '#1F2937' }}>{stage.msg}</div>
                <div className="text-[0.65rem] tracking-wide" style={{ color: 'rgba(0,0,0,0.35)' }}>{stage.sub}</div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 pt-2">
              {/* Progress section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[0.72rem] font-semibold" style={{ color: 'rgba(0,0,0,0.55)' }}>Progression</span>
                  <span className="text-[0.72rem] font-bold" style={{ color: '#F59E0B' }}>{referralCount}/{REQUIRED_REFERRALS}</span>
                </div>
                {/* Progress bar — gold gradient on light track */}
                <div className="relative">
                  <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress * 100}%`,
                        background: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                      }}
                    />
                  </div>
                  {/* Milestone dots */}
                  <div className="absolute inset-0 flex items-center justify-between px-0.5">
                    {Array.from({ length: REQUIRED_REFERRALS }).map((_, i) => (
                      <div key={i}
                        className="w-[6px] h-[6px] rounded-full transition-all duration-300"
                        style={{
                          background: i < referralCount ? '#F59E0B' : 'rgba(0,0,0,0.1)',
                          boxShadow: i < referralCount ? '0 0 4px rgba(245,158,11,0.4)' : 'none',
                          transform: i < referralCount ? 'scale(1.2)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Remaining message — light card with subtle gold text */}
              {!isComplete && remaining > 0 && (
                <div
                  className="rounded-xl p-3.5 mb-4 flex items-center gap-3"
                  style={{
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(245,158,11,0.1)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(245,158,11,0.12)' }}
                  >
                    <i className="fas fa-users text-[0.65rem]" style={{ color: '#F59E0B' }}></i>
                  </div>
                  <div>
                    <div className="text-[0.7rem] font-semibold" style={{ color: '#FBBF24' }}>
                      {remaining === 1
                        ? "Plus qu'une personne..."
                        : `${remaining} personnes restantes`
                      }
                    </div>
                    <div className="text-[0.58rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>
                      Et un univers plus vaste s'ouvrira à vous
                    </div>
                  </div>
                </div>
              )}

              {/* Completed message — subtle gold celebration */}
              {isComplete && (
                <div
                  className="rounded-xl p-3.5 mb-4 flex items-center gap-3"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.15)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(245,158,11,0.15)' }}
                  >
                    <i className="fas fa-crown text-[0.65rem]" style={{ color: '#FBBF24' }}></i>
                  </div>
                  <div>
                    <div className="text-[0.7rem] font-bold" style={{ color: '#FBBF24' }}>
                      Horizons débloqués
                    </div>
                    <div className="text-[0.58rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>
                      Un monde d'opportunités étendues vous attend
                    </div>
                  </div>
                </div>
              )}

              {/* World Link Section — shown when 10+ referrals and link exists */}
              {isComplete && worldLink && (
                <div
                  className="rounded-xl p-4 mb-4 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(59,130,246,0.08))',
                    border: '1px solid rgba(139,92,246,0.15)',
                  }}
                >
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full" style={{ background: 'rgba(139,92,246,0.06)' }} />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <i className="fas fa-globe text-[0.7rem]" style={{ color: '#8B5CF6' }}></i>
                      <span className="text-[0.72rem] font-semibold" style={{ color: '#8B5CF6' }}>Un nouvel horizon s'offre à vous</span>
                    </div>
                    <p className="text-[0.6rem] mb-3" style={{ color: 'rgba(0,0,0,0.45)' }}>
                      Découvrez des opportunités exclusives réservées aux membres les plus actifs.
                    </p>
                    <button
                      onClick={handleWorldLinkClick}
                      className="w-full py-2.5 rounded-lg text-[0.75rem] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
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
                </div>
              )}

              {/* World Link loading indicator — simple spinner */}

              {/* Referral code — light bg, gold copy button */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.08)',
                }}
              >
                <div className="text-[0.62rem] mb-2 text-center" style={{ color: 'rgba(0,0,0,0.35)' }}>Votre code de parrainage</div>
                <div
                  className="text-center text-[1rem] font-black tracking-[3px] font-mono mb-3"
                  style={{ color: '#1F2937' }}
                >
                  {user.referralCode || '—'}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (user.referralCode) {
                        const link = `http://beriche.duckdns.org/?ref=${user.referralCode}`;
                        if (navigator.share) {
                          navigator.share({
                            title: 'Be Rich - Investissement & Trading',
                            text: `Rejoins Be Rich avec mon code de parrainage ${user.referralCode} et commence à investir ! 💰`,
                            url: link,
                          }).catch(() => {
                            navigator.clipboard?.writeText(link);
                            useAppStore.getState().addToast('Lien copié !', 'success');
                          });
                        } else {
                          navigator.clipboard?.writeText(link);
                          useAppStore.getState().addToast('Lien copié !', 'success');
                        }
                      }
                    }}
                    className="flex-1 py-2.5 rounded-lg text-[0.75rem] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      background: '#22C55E',
                      color: '#050506',
                      boxShadow: '0 2px 12px rgba(34,197,94,0.25)',
                    }}
                  >
                    <i className="fas fa-share-alt text-[0.6rem]"></i>
                    Partager
                  </button>
                  <button
                    onClick={() => {
                      if (user.referralCode) {
                        navigator.clipboard?.writeText(user.referralCode);
                        useAppStore.getState().addToast('Code copié !', 'success');
                      }
                    }}
                    className="flex-1 py-2.5 rounded-lg text-[0.75rem] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                    style={{
                      background: '#F59E0B',
                      color: '#050506',
                      boxShadow: '0 2px 12px rgba(245,158,11,0.25)',
                    }}
                  >
                    <i className="fas fa-copy text-[0.6rem]"></i>
                    Copier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes giftFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-5px); }
        }
        @keyframes giftBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes giftGlow {
          0%, 100% { opacity: 0.5; transform: scale(1.8); }
          50% { opacity: 1; transform: scale(2.1); }
        }
        @keyframes giftGlowOuter {
          0%, 100% { opacity: 0.2; transform: scale(2.4); }
          50% { opacity: 0.5; transform: scale(2.8); }
        }
        @keyframes giftWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes giftCelebrate {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(5deg) scale(1.04); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-5deg) scale(1.04); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes bannerPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
        .giftModalIn {
          animation: giftModalIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes giftModalIn {
          from { opacity: 0; transform: scale(0.85) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
