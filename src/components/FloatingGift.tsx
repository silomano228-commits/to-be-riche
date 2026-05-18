'use client';

import { useState, useEffect } from 'react';
import { useAppStore, esc } from '@/lib/store';

const REQUIRED_REFERRALS = 10;

// Subtle messages that change based on referral count
const STAGE_MESSAGES = [
  { min: 0, msg: "Certains chemins mènent à des horizons insoupçonnés...", emoji: '🎁', sub: "Chaque connexion compte" },
  { min: 1, msg: "Une première étincelle... l'histoire commence.", emoji: '✨', sub: "Le voyage démarre" },
  { min: 2, msg: "Deux lumière brillent déjà. Le chemin s'éclaire.", emoji: '💫', sub: "L'élan se construit" },
  { min: 3, msg: "Le cercle grandit. Quelque chose de spécial se prépare.", emoji: '🌟', sub: "Ça prend forme" },
  { min: 4, msg: "Presque à mi-chemin... la suite promet d'être intéressante.", emoji: '🔮', sub: "Perspectives en vue" },
  { min: 5, msg: "La moitié du chemin ! Un tournant s'approche.", emoji: '🌙', sub: "Mi-parcours atteint" },
  { min: 6, msg: "L'horizon se rapproche. Continuez sur cette lancée.", emoji: '🌅', sub: "Direction claire" },
  { min: 7, msg: "Bientôt... un monde nouveau s'ouvrira.", emoji: '⭐', sub: "Presque là" },
  { min: 8, msg: "Les portes d'un univers plus vaste sont à portée.", emoji: '🚪', sub: "À deux doigts" },
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

  // Gift box open animation percentage (0-100%)
  const openPercent = Math.min(100, (referralCount / REQUIRED_REFERRALS) * 100);

  return (
    <>
      {/* Floating Gift Button */}
      <button
        onClick={() => { setOpen(true); setAnimClass('giftModalIn'); }}
        className="fixed z-[100] cursor-pointer border-none bg-transparent p-0"
        style={{ bottom: '80px', right: '18px' }}
      >
        <div className="relative">
          {/* Glow ring */}
          <div className="absolute inset-0 w-[52px] h-[52px] rounded-full"
            style={{
              background: isComplete
                ? 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
              animation: 'giftGlow 3s ease-in-out infinite',
              transform: 'scale(1.3)',
            }}
          />
          {/* Main circle */}
          <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
            isComplete
              ? 'bg-gradient-to-br from-[#FBBF24] to-[#F59E0B]'
              : 'bg-gradient-to-br from-[#8B5CF6] to-[#7C3AED]'
          }`} style={{
            animation: pulse % 2 === 0 ? 'giftBounce 2s ease-in-out infinite' : 'giftFloat 3s ease-in-out infinite',
            boxShadow: isComplete
              ? '0 4px 20px rgba(251,191,36,0.4)'
              : '0 4px 20px rgba(139,92,246,0.3)',
          }}>
            <span className="text-[1.3rem]">{stage.emoji}</span>
          </div>
          {/* Referral count badge */}
          {!isComplete && referralCount > 0 && (
            <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#EF4444] text-white text-[0.55rem] font-bold flex items-center justify-center border-2 border-white">
              {referralCount}
            </div>
          )}
          {isComplete && (
            <div className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#00C853] text-white text-[0.55rem] font-bold flex items-center justify-center border-2 border-white">
              ✓
            </div>
          )}
        </div>
      </button>

      {/* Modal Overlay */}
      {open && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-[rgba(6,10,20,0.5)] backdrop-blur-sm" />
          <div
            className={`relative bg-white rounded-2xl w-[88%] max-w-[340px] shadow-2xl overflow-hidden ${animClass}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top gradient header */}
            <div className={`relative p-5 pb-4 ${isComplete
              ? 'bg-gradient-to-br from-[#FBBF24] via-[#F59E0B] to-[#D97706]'
              : 'bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6D28D9]'
            }`}>
              {/* Close button */}
              <button
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[rgba(255,255,255,0.2)] text-white flex items-center justify-center cursor-pointer border-none text-[0.7rem]"
              >
                ✕
              </button>

              {/* Gift box animation */}
              <div className="flex justify-center mb-3">
                <div className="relative">
                  <div className="text-[3rem]" style={{
                    filter: isComplete ? 'drop-shadow(0 0 20px rgba(251,191,36,0.5))' : 'none',
                    animation: isComplete ? 'giftSpin 2s ease-in-out infinite' : 'giftWiggle 3s ease-in-out infinite',
                  }}>
                    {isComplete ? '🎉' : '🎁'}
                  </div>
                  {/* Sparkles */}
                  {(referralCount > 0 || isComplete) && (
                    <>
                      <div className="absolute -top-1 -left-2 text-[0.7rem]" style={{ animation: 'sparkle 2s ease-in-out infinite' }}>✨</div>
                      <div className="absolute -top-2 right-0 text-[0.6rem]" style={{ animation: 'sparkle 2s ease-in-out infinite 0.7s' }}>⭐</div>
                      {isComplete && <div className="absolute bottom-0 -right-3 text-[0.7rem]" style={{ animation: 'sparkle 2s ease-in-out infinite 1.3s' }}>💫</div>}
                    </>
                  )}
                </div>
              </div>

              {/* Main message */}
              <div className="text-center text-white">
                <div className="text-[0.95rem] font-black mb-1">{stage.msg}</div>
                <div className="text-[0.65rem] text-[rgba(255,255,255,0.7)]">{stage.sub}</div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 pt-4">
              {/* Progress section */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[0.72rem] font-bold text-[#1A2332]">Progression</span>
                  <span className="text-[0.72rem] font-bold text-[#7C3AED]">{referralCount}/{REQUIRED_REFERRALS}</span>
                </div>
                {/* Progress bar with gift boxes */}
                <div className="relative">
                  <div className="w-full h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${progress * 100}%`,
                        background: isComplete
                          ? 'linear-gradient(90deg, #FBBF24, #F59E0B)'
                          : 'linear-gradient(90deg, #8B5CF6, #7C3AED)',
                      }}
                    />
                  </div>
                  {/* Milestone dots */}
                  <div className="absolute inset-0 flex items-center justify-between px-0.5">
                    {Array.from({ length: REQUIRED_REFERRALS }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full border transition-all duration-300 ${
                        i < referralCount
                          ? isComplete
                            ? 'bg-[#FBBF24] border-[#F59E0B] scale-125'
                            : 'bg-white border-[#7C3AED]'
                          : 'bg-[#E2E8F0] border-[#CBD5E1]'
                      }`} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Remaining message */}
              {!isComplete && remaining > 0 && (
                <div className="bg-[#F5F3FF] rounded-xl p-3 mb-4 border border-[rgba(124,58,237,0.1)]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center shrink-0">
                      <i className="fas fa-users text-white text-[0.65rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-[#4C1D95] font-semibold">
                        {remaining === 1
                          ? "Plus qu'une personne..."
                          : `${remaining} personnes restantes`
                        }
                      </div>
                      <div className="text-[0.58rem] text-[#6D28D9]/70">
                        Et un univers plus vaste s'ouvrira à vous
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Completed message */}
              {isComplete && (
                <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FFFBEB] rounded-xl p-3 mb-4 border border-[#FDE047]">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FBBF24] flex items-center justify-center shrink-0">
                      <i className="fas fa-crown text-white text-[0.65rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.68rem] text-[#92400E] font-bold">
                        Horizons débloqués !
                      </div>
                      <div className="text-[0.58rem] text-[#A16207]">
                        Un monde d'opportunités étendues vous attend
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Referral code */}
              <div className="bg-[#F8FAFC] rounded-xl p-3 border border-[rgba(0,0,0,0.04)]">
                <div className="text-[0.62rem] text-[#94A3B8] mb-1.5 text-center">Votre code de parrainage</div>
                <div className="text-center text-[0.95rem] font-black text-[#1A2332] tracking-[2px] font-mono">
                  {user.referralCode || '—'}
                </div>
                <button
                  onClick={() => {
                    if (user.referralCode) {
                      navigator.clipboard?.writeText(user.referralCode);
                      useAppStore.getState().addToast('Code copié !', 'success');
                    }
                  }}
                  className="w-full mt-2 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white text-[0.72rem] font-semibold border-none cursor-pointer flex items-center justify-center gap-1.5"
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
          50% { transform: translateY(-6px); }
        }
        @keyframes giftBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.05); }
        }
        @keyframes giftGlow {
          0%, 100% { opacity: 0.5; transform: scale(1.3); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes giftWiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes giftSpin {
          0% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(10deg) scale(1.1); }
          50% { transform: rotate(0deg) scale(1); }
          75% { transform: rotate(-10deg) scale(1.1); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        .giftModalIn {
          animation: giftModalIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
        }
        @keyframes giftModalIn {
          from { opacity: 0; transform: scale(0.8) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  );
}
