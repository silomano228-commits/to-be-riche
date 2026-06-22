'use client';

import { useEffect, useState } from 'react';

export interface CongratulationsData {
  show: boolean;
  type: 'win' | 'loss' | 'collect' | 'video' | 'generic';
  title?: string;
  message?: string;
  amount?: number;
  onClose?: () => void;
  onRetry?: () => void;
  showRetry?: boolean;
}

const MOTIVATIONAL_TIPS = [
  'La chance sourit à ceux qui persistent !',
  'Chaque tentative vous rapproche de la victoire !',
  'Ne lâchez rien, le prochain tour est le bon !',
  'Les grands gagnants n\'ont jamais abandonné !',
  'Votre chance tourne bientôt, réessayez !',
  'L\'échec est juste un détour vers le succès !',
  'Restez focus, la réussite est au coin !',
  'Un perdant ne perd jamais s\'il réessaie !',
];

export function CongratulationsModal({ data }: { data: CongratulationsData }) {
  const [tip, setTip] = useState(MOTIVATIONAL_TIPS[0]);
  const [showConfetti, setShowConfetti] = useState(false);

  // Defensive fallback: if parent forgot to pass onClose, treat it as a no-op
  // so the OK button / backdrop click never becomes a dead button.
  const handleClose = data.onClose ?? (() => {});

  useEffect(() => {
    if (data.show) {
      setTip(MOTIVATIONAL_TIPS[Math.floor(Math.random() * MOTIVATIONAL_TIPS.length)]);
      if (data.type !== 'loss') {
        setShowConfetti(true);
        const t = setTimeout(() => setShowConfetti(false), 3000);
        return () => clearTimeout(t);
      }
    }
  }, [data.show, data.type]);

  if (!data.show) return null;

  const isLoss = data.type === 'loss';
  const defaultTitle = isLoss ? 'Presque !' : 'Félicitations !';
  const title = data.title || defaultTitle;

  const defaultMessage = isLoss
    ? 'Vous n\'avez pas gagné cette fois-ci.'
    : 'Vous avez gagné !';
  const message = data.message || defaultMessage;

  return (
    <div
      className="fixed inset-0 z-[8000] flex items-center justify-center p-4"
      style={{
        background: isLoss
          ? 'linear-gradient(135deg, rgba(30,27,75,0.85), rgba(49,46,129,0.85))'
          : 'linear-gradient(135deg, rgba(34,197,94,0.85), rgba(20,184,166,0.85))',
        backdropFilter: 'blur(6px)',
        animation: 'modalIn 0.3s ease-out',
      }}
      onClick={handleClose}
    >
      {/* Confetti */}
      {showConfetti && !isLoss && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => {
            const colors = ['#F59E0B', '#22C55E', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444'];
            const color = colors[i % colors.length];
            const left = Math.random() * 100;
            const delay = Math.random() * 0.5;
            const duration = 2 + Math.random() * 1.5;
            const size = 6 + Math.random() * 6;
            return (
              <div
                key={i}
                className="absolute top-[-20px] rounded-sm"
                style={{
                  left: `${left}%`,
                  width: `${size}px`,
                  height: `${size * 1.5}px`,
                  background: color,
                  animation: `confettiFall ${duration}s ease-in ${delay}s forwards`,
                }}
              />
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(720deg); opacity: 0; }
        }
        @keyframes modalPop {
          0% { transform: scale(0.5) rotate(-5deg); opacity: 0; }
          60% { transform: scale(1.05) rotate(2deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes trophyBounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-8px) scale(1.08); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>

      <div
        className="relative w-full max-w-[340px] rounded-3xl p-6 text-center"
        style={{
          background: '#FFFFFF',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          animation: isLoss ? 'shake 0.5s ease-in-out, modalPop 0.4s ease-out' : 'modalPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className="w-20 h-20 mx-auto -mt-16 mb-3 rounded-full flex items-center justify-center"
          style={{
            background: isLoss
              ? 'linear-gradient(135deg, #EF4444, #F59E0B)'
              : 'linear-gradient(135deg, #22C55E, #14B8A6)',
            boxShadow: isLoss
              ? '0 8px 24px rgba(239,68,68,0.4)'
              : '0 8px 24px rgba(34,197,94,0.4)',
            border: '4px solid #FFFFFF',
            animation: 'trophyBounce 1.5s ease-in-out infinite',
          }}
        >
          <i
            className={`fas ${isLoss ? 'fa-redo' : 'fa-trophy'} text-[2rem] text-white`}
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}
          ></i>
        </div>

        {/* Title */}
        <h2
          className="text-[1.5rem] font-black mb-1"
          style={{ color: isLoss ? '#EF4444' : '#16A34A' }}
        >
          {title}
        </h2>

        {/* Amount (if win/collect) */}
        {typeof data.amount === 'number' && data.amount > 0 && !isLoss && (
          <div className="my-3">
            <div
              className="inline-block px-6 py-2 rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(245,158,11,0.1))',
                border: '2px solid rgba(34,197,94,0.2)',
              }}
            >
              <div className="text-[0.6rem] uppercase tracking-widest font-bold text-[rgba(0,0,0,0.4)]">Gain</div>
              <div
                className="text-[2rem] font-black leading-none"
                style={{
                  background: 'linear-gradient(135deg, #22C55E, #F59E0B)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                +${data.amount.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        <p className="text-[0.85rem] text-[rgba(0,0,0,0.6)] mb-4 leading-relaxed px-2">
          {message}
        </p>

        {/* Motivational tip for losses */}
        {isLoss && (
          <div
            className="rounded-xl p-3 mb-4"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            <div className="flex items-start gap-2">
              <i className="fas fa-lightbulb text-[#F59E0B] text-[0.85rem] mt-0.5"></i>
              <p className="text-[0.72rem] text-[rgba(0,0,0,0.7)] font-medium text-left leading-relaxed">
                {tip}
              </p>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          {isLoss && data.showRetry && data.onRetry && (
            <button
              onClick={data.onRetry}
              className="flex-1 py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                color: '#FFFFFF',
                boxShadow: '0 4px 16px rgba(34,197,94,0.3)',
              }}
            >
              <i className="fas fa-redo mr-1.5"></i>Réessayer
            </button>
          )}
          <button
            onClick={handleClose}
            className={`py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer transition-all active:scale-95 ${
              isLoss && data.showRetry && data.onRetry ? 'flex-1' : 'w-full'
            }`}
            style={{
              background: isLoss
                ? 'linear-gradient(135deg, #6B7280, #4B5563)'
                : 'linear-gradient(135deg, #22C55E, #14B8A6)',
              color: '#FFFFFF',
              boxShadow: isLoss
                ? '0 4px 16px rgba(107,114,128,0.3)'
                : '0 4px 16px rgba(34,197,94,0.3)',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
