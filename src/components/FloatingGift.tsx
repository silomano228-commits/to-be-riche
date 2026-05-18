'use client';

import { useState, useEffect } from 'react';
import { useAppStore, esc } from '@/lib/store';

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
  const { user } = useAppStore();
  const [open, setOpen] = useState(false);
  const [animClass, setAnimClass] = useState('');
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setPulse(p => p + 1), 4000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;

  const referralCount = user.referralCount || 0;
  const progress = Math.min(referralCount / REQUIRED_REFERRALS, 1);
  const stage = STAGE_MESSAGES.filter(s => referralCount >= s.min).pop() || STAGE_MESSAGES[0];
  const isComplete = referralCount >= REQUIRED_REFERRALS;
  const remaining = Math.max(0, REQUIRED_REFERRALS - referralCount);

  return (
    <>
      {/* Floating Gift Button */}
      <button
        onClick={() => { setOpen(true); setAnimClass('giftModalIn'); }}
        className="fixed z-[100] cursor-pointer border-none bg-transparent p-0"
        style={{ bottom: '80px', right: '18px' }}
      >
        <div className="relative">
          {/* Gold glow ring — subtle */}
          <div className="absolute inset-0 w-[52px] h-[52px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(184,155,94,0.25) 0%, transparent 70%)',
              animation: 'giftGlow 3s ease-in-out infinite',
              transform: 'scale(1.4)',
            }}
          />
          {/* Main circle — dark with gold border */}
          <div
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center transition-all duration-300"
            style={{
              background: '#0E0F11',
              border: '1.5px solid rgba(184,155,94,0.3)',
              boxShadow: isComplete
                ? '0 0 20px rgba(184,155,94,0.25), 0 4px 16px rgba(0,0,0,0.4)'
                : '0 4px 16px rgba(0,0,0,0.4)',
              animation: pulse % 2 === 0 ? 'giftFloat 3s ease-in-out infinite' : 'giftBreathe 4s ease-in-out infinite',
            }}
          >
            <span className="text-[1.3rem]">{stage.emoji}</span>
          </div>
          {/* Referral count badge — gold */}
          {referralCount > 0 && !isComplete && (
            <div
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[0.55rem] font-bold px-1"
              style={{
                background: '#B89B5E',
                color: '#050506',
                boxShadow: '0 2px 8px rgba(184,155,94,0.4)',
              }}
            >
              {referralCount}
            </div>
          )}
          {isComplete && (
            <div
              className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full flex items-center justify-center text-[0.55rem] font-bold"
              style={{
                background: '#B89B5E',
                color: '#050506',
                boxShadow: '0 2px 8px rgba(184,155,94,0.4)',
              }}
            >
              ✓
            </div>
          )}
        </div>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-[rgba(5,5,6,0.7)] backdrop-blur-sm" />
          <div
            className={`relative w-[88%] max-w-[340px] shadow-2xl overflow-hidden ${animClass}`}
            style={{
              background: '#0E0F11',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '1rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Subtle gold line at top instead of gradient header */}
            <div className="h-[2px] w-full" style={{
              background: 'linear-gradient(90deg, transparent, #B89B5E, transparent)',
              opacity: isComplete ? 0.8 : 0.4,
            }} />

            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer border-none text-[0.7rem] transition-colors"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              ✕
            </button>

            {/* Gift animation area */}
            <div className="pt-8 pb-2 px-6">
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="text-[3rem]" style={{
                    filter: isComplete ? 'drop-shadow(0 0 16px rgba(184,155,94,0.35))' : 'none',
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
                <div className="text-[0.92rem] font-bold mb-1" style={{ color: '#EDEDEF' }}>{stage.msg}</div>
                <div className="text-[0.65rem] tracking-wide" style={{ color: 'rgba(255,255,255,0.25)' }}>{stage.sub}</div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-6 pt-2">
              {/* Progress section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[0.72rem] font-semibold" style={{ color: 'rgba(255,255,255,0.45)' }}>Progression</span>
                  <span className="text-[0.72rem] font-bold" style={{ color: '#B89B5E' }}>{referralCount}/{REQUIRED_REFERRALS}</span>
                </div>
                {/* Progress bar — gold gradient on dark track */}
                <div className="relative">
                  <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress * 100}%`,
                        background: 'linear-gradient(90deg, #B89B5E, #D4B87A)',
                      }}
                    />
                  </div>
                  {/* Milestone dots */}
                  <div className="absolute inset-0 flex items-center justify-between px-0.5">
                    {Array.from({ length: REQUIRED_REFERRALS }).map((_, i) => (
                      <div key={i}
                        className="w-[6px] h-[6px] rounded-full transition-all duration-300"
                        style={{
                          background: i < referralCount ? '#B89B5E' : 'rgba(255,255,255,0.08)',
                          boxShadow: i < referralCount ? '0 0 4px rgba(184,155,94,0.4)' : 'none',
                          transform: i < referralCount ? 'scale(1.2)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Remaining message — dark card with subtle gold text */}
              {!isComplete && remaining > 0 && (
                <div
                  className="rounded-xl p-3.5 mb-4 flex items-center gap-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(184,155,94,0.1)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(184,155,94,0.12)' }}
                  >
                    <i className="fas fa-users text-[0.65rem]" style={{ color: '#B89B5E' }}></i>
                  </div>
                  <div>
                    <div className="text-[0.7rem] font-semibold" style={{ color: '#D4B87A' }}>
                      {remaining === 1
                        ? "Plus qu'une personne..."
                        : `${remaining} personnes restantes`
                      }
                    </div>
                    <div className="text-[0.58rem]" style={{ color: 'rgba(255,255,255,0.25)' }}>
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
                    background: 'rgba(184,155,94,0.08)',
                    border: '1px solid rgba(184,155,94,0.15)',
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(184,155,94,0.15)' }}
                  >
                    <i className="fas fa-crown text-[0.65rem]" style={{ color: '#D4B87A' }}></i>
                  </div>
                  <div>
                    <div className="text-[0.7rem] font-bold" style={{ color: '#D4B87A' }}>
                      Horizons débloqués
                    </div>
                    <div className="text-[0.58rem]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Un monde d'opportunités étendues vous attend
                    </div>
                  </div>
                </div>
              )}

              {/* Referral code — dark bg, gold copy button */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="text-[0.62rem] mb-2 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>Votre code de parrainage</div>
                <div
                  className="text-center text-[1rem] font-black tracking-[3px] font-mono mb-3"
                  style={{ color: '#EDEDEF' }}
                >
                  {user.referralCode || '—'}
                </div>
                <button
                  onClick={() => {
                    if (user.referralCode) {
                      navigator.clipboard?.writeText(user.referralCode);
                      useAppStore.getState().addToast('Code copié !', 'success');
                    }
                  }}
                  className="w-full py-2.5 rounded-lg text-[0.75rem] font-semibold border-none cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{
                    background: '#B89B5E',
                    color: '#050506',
                    boxShadow: '0 2px 12px rgba(184,155,94,0.25)',
                  }}
                >
                  <i className="fas fa-copy text-[0.6rem]"></i>
                  Copier le code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes giftFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes giftBreathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes giftGlow {
          0%, 100% { opacity: 0.4; transform: scale(1.4); }
          50% { opacity: 0.8; transform: scale(1.6); }
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
