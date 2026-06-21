'use client';

import { useEffect } from 'react';
import type { AdItem, AdLayout } from '@/lib/ads';

interface TabChangeAdProps {
  ad: AdItem | null;
  onClose: () => void;
}

export function TabChangeAd({ ad, onClose }: TabChangeAdProps) {
  // Close on Escape key
  useEffect(() => {
    if (!ad) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [ad, onClose]);

  if (!ad) return null;

  return (
    <div
      className="fixed inset-0 z-[7000] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        animation: 'adFadeIn 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes adFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes adSlideUp { 0% { transform: translateY(40px) scale(0.95); opacity: 0; } 100% { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes adPop { 0% { transform: scale(0.8) rotate(-3deg); opacity: 0; } 60% { transform: scale(1.05) rotate(1deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }
        @keyframes adSlideLeft { 0% { transform: translateX(40px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes adExpand { 0% { transform: scaleX(0.3); opacity: 0; } 100% { transform: scaleX(1); opacity: 1; } }
      `}</style>

      <AdCard ad={ad} onClose={onClose} />
    </div>
  );
}

function AdCard({ ad, onClose }: { ad: AdItem; onClose: () => void }) {
  const layout: AdLayout = ad.layout;

  const containerBase = {
    className: 'relative w-full max-w-[380px] rounded-3xl overflow-hidden',
    style: {
      animation: 'adSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    },
  };

  const TopBar = (
    <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <span className="text-[0.6rem] uppercase tracking-widest font-bold text-white/70">
        <i className="fas fa-bullhorn mr-1"></i>Publicité
      </span>
      <button
        onClick={onClose}
        aria-label="Fermer la publicité"
        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90"
        style={{ background: 'rgba(255,255,255,0.9)', color: '#1F2937', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
      >
        <i className="fas fa-times text-[0.8rem]"></i>
      </button>
    </div>
  );

  const CtaButton = (
    <button
      onClick={onClose}
      className="w-full py-2.5 rounded-xl font-bold text-[0.82rem] cursor-pointer transition-all active:scale-95"
      style={{ background: 'rgba(255,255,255,0.95)', color: '#1F2937' }}
    >
      {ad.cta} <i className="fas fa-arrow-right ml-1 text-[0.7rem]"></i>
    </button>
  );

  // ===== HERO layout: big centered icon =====
  if (layout === 'hero') {
    return (
      <div {...containerBase} onClick={(e) => e.stopPropagation()}>
        {TopBar}
        <div className="p-6 text-center text-white" style={{ background: ad.gradient }}>
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', animation: 'adPop 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <i className={`fas ${ad.icon} text-[2rem]`}></i>
          </div>
          <h3 className="text-[1.5rem] font-black mb-1">{ad.company}</h3>
          <p className="text-[0.95rem] font-bold mb-1">{ad.headline}</p>
          <p className="text-[0.75rem] opacity-90 mb-3">{ad.subheadline}</p>
          <div className="inline-block px-3 py-1 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <span className="text-[0.65rem] font-semibold">{ad.tagline}</span>
          </div>
          {CtaButton}
        </div>
      </div>
    );
  }

  // ===== SPLIT layout: icon left, text right =====
  if (layout === 'split') {
    return (
      <div {...containerBase} onClick={(e) => e.stopPropagation()}>
        {TopBar}
        <div className="flex text-white" style={{ background: ad.gradient }}>
          <div className="w-[40%] flex items-center justify-center p-5" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', animation: 'adPop 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <i className={`fas ${ad.icon} text-[2.2rem]`}></i>
            </div>
          </div>
          <div className="flex-1 p-5" style={{ animation: 'adSlideLeft 0.5s ease-out 0.2s both' }}>
            <h3 className="text-[1.3rem] font-black mb-1">{ad.company}</h3>
            <p className="text-[0.85rem] font-bold mb-1">{ad.headline}</p>
            <p className="text-[0.7rem] opacity-90 mb-2 leading-relaxed">{ad.subheadline}</p>
            <div className="inline-block px-2.5 py-0.5 rounded-full mb-3" style={{ background: ad.accent + '40' }}>
              <span className="text-[0.6rem] font-bold">{ad.tagline}</span>
            </div>
            {CtaButton}
          </div>
        </div>
      </div>
    );
  }

  // ===== BANNER layout: wide top icon bar =====
  if (layout === 'banner') {
    return (
      <div {...containerBase} onClick={(e) => e.stopPropagation()}>
        {TopBar}
        <div className="text-white" style={{ background: ad.gradient }}>
          <div className="px-6 pt-5 pb-3 flex items-center gap-3" style={{ animation: 'adExpand 0.5s ease-out' }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.25)' }}>
              <i className={`fas ${ad.icon} text-[1.8rem]`}></i>
            </div>
            <div>
              <div className="text-[0.6rem] uppercase tracking-widest font-bold opacity-80">{ad.tagline}</div>
              <h3 className="text-[1.4rem] font-black leading-tight">{ad.company}</h3>
            </div>
          </div>
          <div className="px-6 pb-5">
            <p className="text-[0.95rem] font-bold mb-1">{ad.headline}</p>
            <p className="text-[0.72rem] opacity-90 mb-4 leading-relaxed">{ad.subheadline}</p>
            {CtaButton}
          </div>
        </div>
      </div>
    );
  }

  // ===== CARD layout: product-card style =====
  if (layout === 'card') {
    return (
      <div {...containerBase} onClick={(e) => e.stopPropagation()}>
        {TopBar}
        <div className="text-white" style={{ background: ad.gradient }}>
          <div className="h-28 flex items-center justify-center relative" style={{ background: 'rgba(0,0,0,0.18)' }}>
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', animation: 'adPop 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <i className={`fas ${ad.icon} text-[2.4rem]`}></i>
            </div>
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full" style={{ background: ad.accent }}>
              <span className="text-[0.55rem] font-black text-black">{ad.tagline}</span>
            </div>
          </div>
          <div className="p-5">
            <h3 className="text-[1.35rem] font-black mb-0.5">{ad.company}</h3>
            <p className="text-[0.88rem] font-bold mb-1">{ad.headline}</p>
            <p className="text-[0.72rem] opacity-90 mb-4 leading-relaxed">{ad.subheadline}</p>
            {CtaButton}
          </div>
        </div>
      </div>
    );
  }

  // ===== QUOTE layout: big slogan style =====
  if (layout === 'quote') {
    return (
      <div {...containerBase} onClick={(e) => e.stopPropagation()}>
        {TopBar}
        <div className="p-7 text-center text-white relative" style={{ background: ad.gradient }}>
          <i className="fas fa-quote-left text-[1.5rem] opacity-30 absolute top-3 left-4"></i>
          <div className="w-14 h-14 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', animation: 'adPop 0.6s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <i className={`fas ${ad.icon} text-[1.6rem]`}></i>
          </div>
          <p className="text-[1.15rem] font-black italic mb-2 leading-snug">"{ad.headline}"</p>
          <h3 className="text-[1rem] font-bold mb-1" style={{ color: ad.accent }}>— {ad.company}</h3>
          <p className="text-[0.7rem] opacity-80 mb-4">{ad.subheadline}</p>
          {CtaButton}
          <i className="fas fa-quote-right text-[1.5rem] opacity-30 absolute bottom-16 right-4"></i>
        </div>
      </div>
    );
  }

  // ===== STATS layout: number highlight style =====
  // layout === 'stats'
  return (
    <div {...containerBase} onClick={(e) => e.stopPropagation()}>
      {TopBar}
      <div className="p-6 text-center text-white" style={{ background: ad.gradient }}>
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <i className={`fas ${ad.icon} text-[1.5rem]`}></i>
          </div>
          <h3 className="text-[1.4rem] font-black">{ad.company}</h3>
        </div>
        <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(0,0,0,0.2)', border: `1px solid ${ad.accent}50` }}>
          <div className="text-[1.8rem] font-black mb-0.5" style={{ color: ad.accent }}>{ad.tagline}</div>
          <div className="text-[0.7rem] uppercase tracking-wide font-semibold opacity-80">{ad.headline}</div>
        </div>
        <p className="text-[0.75rem] opacity-90 mb-4 leading-relaxed">{ad.subheadline}</p>
        {CtaButton}
      </div>
    </div>
  );
}
