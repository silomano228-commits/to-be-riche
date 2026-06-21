'use client';

import { useEffect } from 'react';
import type { AdItem } from '@/lib/ads';

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
        @keyframes adFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes adSlideUp {
          0% { transform: translateY(40px) scale(0.95); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="relative w-full max-w-[380px] rounded-3xl overflow-hidden"
        style={{
          animation: 'adSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar with Publicité label and X close button */}
        <div className="flex items-center justify-between px-4 py-2" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <span className="text-[0.6rem] uppercase tracking-widest font-bold text-white/70">Publicité</span>
          <button
            onClick={onClose}
            aria-label="Fermer la publicité"
            className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.9)', color: '#1F2937', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
          >
            <i className="fas fa-times text-[0.8rem]"></i>
          </button>
        </div>

        {/* Ad content with gradient background */}
        <div className="p-6 text-center text-white" style={{ background: ad.gradient }}>
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
            <i className={`fas ${ad.icon} text-[2rem]`}></i>
          </div>

          {/* Company name */}
          <h3 className="text-[1.5rem] font-black mb-1">{ad.company}</h3>

          {/* Headline */}
          <p className="text-[0.95rem] font-bold mb-1">{ad.headline}</p>

          {/* Subheadline */}
          <p className="text-[0.75rem] opacity-90 mb-3">{ad.subheadline}</p>

          {/* Tagline pill */}
          <div className="inline-block px-3 py-1 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <span className="text-[0.65rem] font-semibold">{ad.tagline}</span>
          </div>

          {/* CTA button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl font-bold text-[0.82rem] cursor-pointer transition-all active:scale-95"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#1F2937' }}
          >
            {ad.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
