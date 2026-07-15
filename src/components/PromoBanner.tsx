'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';

interface PromoItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  label: string;
  gradientFrom: string;
  gradientTo: string;
  gradientMid: string;
  accentColor: string;
  actionPage: string;
  badge?: 'Nouveau' | 'Hot';
}

const PROMOS: PromoItem[] = [
  {
    id: 'video-daily',
    icon: 'fa-video',
    title: '🔥 Faites vos 5 vidéos quotidiennes et gagnez jusqu\'à 1 $ par jour !',
    subtitle: 'Regardez des vidéos d\'entreprises et encaissez chaque jour',
    label: 'Vidéos',
    gradientFrom: '#0D9488',
    gradientTo: '#065F46',
    gradientMid: '#14B8A6',
    accentColor: '#2DD4BF',
    actionPage: 'videos',
    badge: undefined,
  },
  {
    id: 'invest-daily',
    icon: 'fa-coins',
    title: '💰 Déposez sur votre compte Investissement et recevez 5 % chaque jour',
    subtitle: 'Investissez et laissez votre argent travailler pour vous',
    label: 'Investissement',
    gradientFrom: '#059669',
    gradientTo: '#065F46',
    gradientMid: '#10B981',
    accentColor: '#34D399',
    actionPage: 'invest',
    badge: undefined,
  },
  {
    id: 'wheel-fortune',
    icon: 'fa-dice',
    title: '🎰 Tournez la roue de la fortune — 10 tours gratuits par jour !',
    subtitle: 'Tentez votre chance et gagnez des prix chaque jour',
    label: 'Jeu',
    gradientFrom: '#D97706',
    gradientTo: '#92400E',
    gradientMid: '#F59E0B',
    accentColor: '#FBBF24',
    actionPage: 'game',
    badge: 'Hot',
  },
  {
    id: 'referral',
    icon: 'fa-user-group',
    title: '👥 Parrainez vos amis et gagnez 5 % de leurs gains d\'investissement',
    subtitle: 'Plus de parrainages = plus de revenus passifs',
    label: 'Parrainage',
    gradientFrom: '#7C3AED',
    gradientTo: '#5B21B6',
    gradientMid: '#8B5CF6',
    accentColor: '#A78BFA',
    actionPage: 'referral',
    badge: undefined,
  },
  {
    id: 'long-term',
    icon: 'fa-chart-line',
    title: '📈 L\'investissement à long terme est la clé de la richesse',
    subtitle: 'Commencez petit, restez régulier, et regardez votre fortune grandir',
    label: 'Investissement',
    gradientFrom: '#059669',
    gradientTo: '#064E3B',
    gradientMid: '#10B981',
    accentColor: '#6EE7B7',
    actionPage: 'invest',
    badge: undefined,
  },
  {
    id: 'video-goals',
    icon: 'fa-bullseye',
    title: '🎯 Chaque vidéo regardée vous rapproche de vos objectifs',
    subtitle: '5 vidéos par jour = un pas de plus vers la liberté financière',
    label: 'Vidéos',
    gradientFrom: '#0D9488',
    gradientTo: '#115E59',
    gradientMid: '#14B8A6',
    accentColor: '#5EEAD4',
    actionPage: 'videos',
    badge: undefined,
  },
  {
    id: 'elite-level',
    icon: 'fa-crown',
    title: '⭐ Niveau Élite débloqué à 25 parrainages — investissez jusqu\'à 3 000 $ !',
    subtitle: 'Parrainez 25 amis pour débloquer les investissements Élite',
    label: 'Parrainage',
    gradientFrom: '#B45309',
    gradientTo: '#78350F',
    gradientMid: '#F59E0B',
    accentColor: '#FCD34D',
    actionPage: 'referral',
    badge: 'Nouveau',
  },
];

export default function PromoBanner({ compact = false }: { compact?: boolean }) {
  const { setPage } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('left');
  const [isSliding, setIsSliding] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const goToSlide = useCallback((index: number, direction?: 'left' | 'right') => {
    if (isSliding) return;
    setIsSliding(true);
    setSlideDirection(direction || (index > currentIndex ? 'left' : 'right'));
    setTimeout(() => {
      setCurrentIndex(index);
      setIsSliding(false);
    }, 300);
  }, [isSliding, currentIndex]);

  const goNext = useCallback(() => {
    goToSlide((currentIndex + 1) % PROMOS.length, 'left');
  }, [currentIndex, goToSlide]);

  const goPrev = useCallback(() => {
    goToSlide((currentIndex - 1 + PROMOS.length) % PROMOS.length, 'right');
  }, [currentIndex, goToSlide]);

  // Auto-rotate every 6 seconds, pause on hover
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(goNext, 6000);
    return () => clearInterval(interval);
  }, [goNext, isPaused]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const promo = PROMOS[currentIndex];

  // Slide transition style
  const slideStyle = {
    transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease',
    transform: isSliding
      ? slideDirection === 'left'
        ? 'translateX(-30px)'
        : 'translateX(30px)'
      : 'translateX(0)',
    opacity: isSliding ? 0 : 1,
  };

  if (compact) {
    return (
      <div
        ref={containerRef}
        className="rounded-xl overflow-hidden mb-4 cursor-pointer relative"
        style={{
          backgroundImage: `linear-gradient(135deg, ${promo.gradientFrom}15, ${promo.gradientTo}10)`,
          border: `1px solid ${promo.accentColor}25`,
        }}
        onClick={() => setPage(promo.actionPage)}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Shimmer overlay */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.15) 45%, rgba(255,255,255,0.05) 50%, transparent 55%)',
              animation: 'promoShimmer 3s ease-in-out infinite',
            }}
          />
        </div>
        <div className="flex items-center gap-2.5 p-3" style={slideStyle}>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${promo.accentColor}20` }}
          >
            <i className={`fas ${promo.icon} text-[0.75rem]`} style={{ color: promo.gradientFrom }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="text-[0.72rem] font-bold truncate" style={{ color: '#1F2937' }}>{promo.title}</div>
              {promo.badge && (
                <span
                  className="shrink-0 text-[0.45rem] font-black uppercase px-1.5 py-[1px] rounded-full"
                  style={{
                    background: promo.badge === 'Hot' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                    color: promo.badge === 'Hot' ? '#EF4444' : '#22C55E',
                    animation: 'badgePulse 2s ease-in-out infinite',
                  }}
                >
                  {promo.badge}
                </span>
              )}
            </div>
            <div className="text-[0.58rem] truncate" style={{ color: 'rgba(0,0,0,0.45)' }}>{promo.subtitle}</div>
          </div>
          <div className="flex gap-1 shrink-0">
            {PROMOS.map((_, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full flex items-center justify-center text-[0.4rem] font-bold transition-all duration-300"
                style={{
                  background: i === currentIndex ? promo.gradientFrom : 'rgba(0,0,0,0.08)',
                  color: i === currentIndex ? '#FFFFFF' : 'rgba(0,0,0,0.3)',
                  transform: i === currentIndex ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Fix React warning: use separate backgroundColor and backgroundImage instead of shorthand background
  const bannerStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(135deg, ${promo.gradientFrom}, ${promo.gradientMid}, ${promo.gradientTo})`,
    backgroundSize: '200% 200%',
    animation: 'gradientShift 6s ease infinite',
    boxShadow: `0 6px 28px ${promo.gradientFrom}35`,
  };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl overflow-hidden mb-4 relative"
      style={bannerStyle}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative elements */}
      <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
      <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

      {/* Shimmer overlay */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.2) 45%, rgba(255,255,255,0.08) 50%, transparent 55%)',
            animation: 'promoShimmer 3s ease-in-out infinite',
          }}
        />
      </div>

      {/* Sparkle particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-3 left-[20%] w-1 h-1 rounded-full bg-white/40" style={{ animation: 'sparkle 2s ease-in-out infinite' }} />
        <div className="absolute top-8 left-[60%] w-1.5 h-1.5 rounded-full bg-white/30" style={{ animation: 'sparkle 2.5s ease-in-out infinite 0.5s' }} />
        <div className="absolute bottom-12 right-[25%] w-1 h-1 rounded-full bg-white/35" style={{ animation: 'sparkle 3s ease-in-out infinite 1s' }} />
        <div className="absolute bottom-6 left-[40%] w-1.5 h-1.5 rounded-full bg-white/25" style={{ animation: 'sparkle 2.2s ease-in-out infinite 1.5s' }} />
        <div className="absolute top-14 right-[15%] w-1 h-1 rounded-full bg-white/30" style={{ animation: 'sparkle 2.8s ease-in-out infinite 0.8s' }} />
      </div>

      {/* Left/Right navigation arrows */}
      <button
        onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-all hover:scale-110 active:scale-95"
        style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.9)' }}
      >
        <i className="fas fa-chevron-left text-[0.5rem]"></i>
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center border-none cursor-pointer transition-all hover:scale-110 active:scale-95"
        style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', color: 'rgba(255,255,255,0.9)' }}
      >
        <i className="fas fa-chevron-right text-[0.5rem]"></i>
      </button>

      <div className="relative p-5" style={slideStyle}>
        {/* Icon and type badge */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
          >
            <i className={`fas ${promo.icon} text-[1.1rem] text-white`}></i>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-[0.6rem] font-bold uppercase tracking-[1px] px-2.5 py-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)' }}
            >
              {promo.label}
            </span>
            {promo.badge && (
              <span
                className="text-[0.5rem] font-black uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: promo.badge === 'Hot' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                  animation: 'badgePulse 2s ease-in-out infinite',
                }}
              >
                🔥 {promo.badge}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-[1rem] font-black text-white mb-1 leading-tight">{promo.title}</h3>
        <p className="text-[0.75rem] text-white/75 mb-4">{promo.subtitle}</p>

        {/* Action button and dot indicators */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPage(promo.actionPage)}
            className="px-5 py-2.5 rounded-xl text-[0.8rem] font-bold border-none cursor-pointer flex items-center gap-2 transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: promo.gradientFrom,
              boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
              animation: 'btnPulse 2.5s ease-in-out infinite',
            }}
          >
            Découvrir <i className="fas fa-arrow-right text-[0.65rem]"></i>
          </button>

          {/* Numbered dot indicators */}
          <div className="flex gap-1.5 ml-auto">
            {PROMOS.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goToSlide(i); }}
                className="w-5 h-5 rounded-full border-none cursor-pointer flex items-center justify-center text-[0.45rem] font-bold transition-all duration-300"
                style={{
                  background: i === currentIndex ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                  color: i === currentIndex ? promo.gradientFrom : 'rgba(255,255,255,0.7)',
                  transform: i === currentIndex ? 'scale(1.2)' : 'scale(1)',
                  padding: 0,
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-rotation progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
        <div
          className="h-full bg-white/50 rounded-full"
          style={{
            width: isPaused ? '0%' : '100%',
            transition: isPaused ? 'none' : 'width 6s linear',
          }}
        />
      </div>

      {/* CSS keyframes */}
      <style jsx global>{`
        @keyframes promoShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes btnPulse {
          0%, 100% { box-shadow: 0 2px 12px rgba(0,0,0,0.15); }
          50% { box-shadow: 0 4px 20px rgba(0,0,0,0.25), 0 0 0 4px rgba(255,255,255,0.15); }
        }
      `}</style>
    </div>
  );
}
