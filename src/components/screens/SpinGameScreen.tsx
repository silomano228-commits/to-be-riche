'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, formatMoney, authFetch, refreshUser as globalRefreshUser } from '@/lib/store';
import { Header } from '@/components/shared';
import { CongratulationsModal, type CongratulationsData } from '@/components/CongratulationsModal';

interface Segment {
  label: string;
  reward: number;
  isWin: boolean;
  color: string;
}

interface SpinHistory {
  betAmount: number;
  winAmount: number;
  result: string;
  spunAt: string;
}

interface FakeWinner {
  name: string;
  amount: number;
  flag: string;
}

const DAILY_LIMIT = 10;

const FAKE_NAMES = ['Aminata', 'Kwame', 'Fatou', 'Mamadou', 'Awa', 'Ibrahim', 'Rokia', 'Seydou', 'Kadiatou', 'Ousmane', 'Bintou', 'Lassina'];
const FLAGS = ['🇨🇮', '🇲🇱', '🇧🇫', '🇸🇳', '🇬🇳', '🇳🇪', '🇹🇬', '🇧🇯'];

function generateFakeWinner(): FakeWinner {
  return {
    name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
    amount: 0.10 + Math.random() * 0.90,
    flag: FLAGS[Math.floor(Math.random() * FLAGS.length)],
  };
}

interface PendingSpinResult {
  segmentIdx: number;
  isWin: boolean;
  winAmount: number;
  spinsRemaining?: number;
}

const LONG_TRANSITION = 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)';
const SHORT_TRANSITION = 'transform 0.8s ease-out';

export default function SpinGameScreen() {
  const { user, addToast } = useAppStore();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinsRemaining, setSpinsRemaining] = useState(DAILY_LIMIT);
  const [spinsUsed, setSpinsUsed] = useState(0);
  const [totalWonToday, setTotalWonToday] = useState(0);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [congratsData, setCongratsData] = useState<CongratulationsData>({ show: false, type: 'win' });
  const [winners, setWinners] = useState(() =>
    Array.from({ length: 4 }, () => generateFakeWinner()),
  );
  const [stopRequested, setStopRequested] = useState(false);
  const [transitionStyle, setTransitionStyle] = useState<string>(LONG_TRANSITION);

  const spinsRemainingRef = useRef(spinsRemaining);
  const spinningRef = useRef(spinning);
  const triggerSpinRef = useRef<() => void>(() => {});
  const pendingResultRef = useRef<PendingSpinResult | null>(null);
  const spinTimeoutRef = useRef<number | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/game/status');
      const data = await res.json();
      if (data.success) {
        setSegments(data.segments || []);
        setSpinsRemaining(data.spinsRemaining ?? DAILY_LIMIT);
        setSpinsUsed(data.spinsUsed ?? 0);
        setTotalWonToday(data.totalWonToday || 0);
        setHistory(data.todaySpins || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await authFetch('/api/game/status');
        const data = await res.json();
        if (cancelled || !data.success) return;
        setSegments(data.segments || []);
        setSpinsRemaining(data.spinsRemaining ?? DAILY_LIMIT);
        setSpinsUsed(data.spinsUsed ?? 0);
        setTotalWonToday(data.totalWonToday || 0);
        setHistory(data.todaySpins || []);
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  // Fake winners ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setWinners((prev) => [generateFakeWinner(), ...prev.slice(0, 3)]);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const processResult = useCallback(async () => {
    const data = pendingResultRef.current;
    if (!data) return;
    spinTimeoutRef.current = null;

    const newRemaining = data.spinsRemaining ?? Math.max(0, spinsRemainingRef.current - 1);
    setSpinsRemaining(newRemaining);
    setSpinsUsed((prev) => prev + 1);

    if (data.isWin) {
      setTotalWonToday((prev) => prev + (data.winAmount || 0));
      setCongratsData({
        show: true,
        type: 'win',
        amount: data.winAmount,
        message: `Vous avez gagné $${data.winAmount.toFixed(2)} à la roue !`,
        onClose: () => setCongratsData({ show: false, type: 'win' }),
      });
    } else {
      setCongratsData({
        show: true,
        type: 'loss',
        message: 'Vous n\'avez pas gagné cette fois-ci.',
        showRetry: newRemaining > 0,
        onClose: () => setCongratsData({ show: false, type: 'loss' }),
        onRetry: () => {
          setCongratsData({ show: false, type: 'loss' });
          setTimeout(() => triggerSpinRef.current(), 200);
        },
      });
    }

    pendingResultRef.current = null;
    await globalRefreshUser();
    await loadStatus();
    setSpinning(false);
    setStopRequested(false);
    setTransitionStyle(LONG_TRANSITION);
  }, [loadStatus]);

  const triggerSpin = useCallback(async () => {
    if (spinningRef.current) return;
    if (spinsRemainingRef.current <= 0) {
      addToast('Plus de tours disponibles. Revenez demain !', 'info');
      return;
    }

    setSpinning(true);
    setStopRequested(false);
    setTransitionStyle(LONG_TRANSITION);

    try {
      const res = await authFetch('/api/game/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (data.success) {
        // Backend has ALREADY decided the outcome. Store it for later
        // (used by both the 4.5s auto-finish and the manual STOP button).
        pendingResultRef.current = {
          segmentIdx: data.segmentIdx,
          isWin: data.isWin,
          winAmount: data.winAmount,
          spinsRemaining: data.spinsRemaining,
        };

        const segCount = segments.length || 20;
        const segmentAngle = 360 / segCount;
        const targetSegment = data.segmentIdx;
        const currentMod = ((rotation % 360) + 360) % 360;
        const targetMod = ((360 - targetSegment * segmentAngle - segmentAngle / 2) % 360 + 360) % 360;
        const additionalNeeded = (targetMod - currentMod + 360) % 360;
        const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.6;
        const finalRotation = rotation + 5 * 360 + additionalNeeded + randomOffset;

        setRotation(finalRotation);

        spinTimeoutRef.current = window.setTimeout(() => {
          processResult();
        }, 4500);
      } else {
        if (data.dailyLimitReached) {
          setSpinsRemaining(0);
          addToast(data.error || 'Limite quotidienne atteinte. Revenez demain !', 'info');
        } else {
          addToast(data.error || 'Erreur lors du tour', 'error');
        }
        setSpinning(false);
      }
    } catch {
      addToast('Erreur de connexion', 'error');
      setSpinning(false);
    }
  }, [rotation, segments.length, addToast, processResult]);

  // Manual STOP: redirect the wheel to land exactly on the backend-chosen
  // segment using a short 0.8s ease-out transition, then process the result.
  const handleStopWheel = useCallback(() => {
    if (!pendingResultRef.current) return;
    if (spinTimeoutRef.current !== null) {
      clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
    setStopRequested(true);

    const segCount = segments.length || 20;
    const segmentAngle = 360 / segCount;
    const targetSegment = pendingResultRef.current.segmentIdx;
    const targetMod = ((360 - targetSegment * segmentAngle - segmentAngle / 2) % 360 + 360) % 360;
    const currentMod = ((rotation % 360) + 360) % 360;
    let delta = (targetMod - currentMod + 360) % 360;
    if (delta < 45) delta += 360; // ensure at least a visible final sweep
    const newRotation = rotation + delta;

    setTransitionStyle(SHORT_TRANSITION);
    setRotation(newRotation);

    spinTimeoutRef.current = window.setTimeout(() => {
      processResult();
    }, 850);
  }, [rotation, segments.length, processResult]);

  // Cleanup any pending spin timeout on unmount.
  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    spinsRemainingRef.current = spinsRemaining;
    spinningRef.current = spinning;
    triggerSpinRef.current = triggerSpin;
  }, [spinsRemaining, spinning, triggerSpin]);

  if (loading) {
    return (
      <>
        <Header title="Roue" />
        <div className="flex-1 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 100%)' }}>
          <div className="w-8 h-8 border-[2.5px] border-white/20 border-t-[#F59E0B] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }}></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Roue de la Fortune" />
      <div className="flex-1 overflow-y-auto pb-6" style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%)' }}>
        {/* Hero */}
        <div className="px-4 pt-4 pb-2 text-center">
          <h2 className="text-[1.3rem] font-black text-white mb-0.5">🎡 Roue de la Fortune</h2>
          <p className="text-[0.72rem] text-white/60">Tournez et gagnez des récompenses !</p>
        </div>

        {/* Winners ticker */}
        <div className="px-4 mb-3">
          <div className="rounded-xl p-2 overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="text-[0.55rem] uppercase tracking-wide font-bold text-[#F59E0B] mb-1">
              <i className="fas fa-fire mr-1"></i>Gagnants récents
            </div>
            <div className="flex gap-3 overflow-hidden">
              {winners.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 whitespace-nowrap" style={{ opacity: 1 - i * 0.2 }}>
                  <span className="text-[0.6rem]">{w.flag}</span>
                  <span className="text-[0.65rem] font-semibold text-white/80">{w.name}</span>
                  <span className="text-[0.65rem] font-bold text-[#22C55E]">+${w.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wheel */}
        <div className="flex justify-center px-4 py-4 relative">
          <div className="relative w-[300px] max-w-[calc(100vw-2.5rem)] aspect-square">
            {/* Pointer */}
            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-20" style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #F59E0B', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}></div>

            {/* Wheel SVG */}
            <div
              className="w-full h-full rounded-full relative"
              style={{
                transition: transitionStyle,
                transform: `rotate(${rotation}deg)`,
                boxShadow: '0 0 40px rgba(245,158,11,0.3), 0 0 0 8px rgba(245,158,11,0.15)',
              }}
            >
              <svg viewBox="0 0 200 200" className="w-full h-full">
                {segments.map((seg, i) => {
                  const angle = (360 / segments.length) * i;
                  const sliceAngle = 360 / segments.length;
                  const startRad = (angle - 90) * Math.PI / 180;
                  const endRad = (angle + sliceAngle - 90) * Math.PI / 180;
                  const r = 95;
                  const cx = 100, cy = 100;
                  const x1 = cx + r * Math.cos(startRad);
                  const y1 = cy + r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad);
                  const y2 = cy + r * Math.sin(endRad);
                  const largeArc = sliceAngle > 180 ? 1 : 0;
                  const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  // SVG-frame angle of the spoke that bisects this segment.
                  const labelAngle = angle + sliceAngle / 2 - 90;
                  const labelRad = labelAngle * Math.PI / 180;
                  const labelR = 60;
                  const lx = cx + labelR * Math.cos(labelRad);
                  const ly = cy + labelR * Math.sin(labelRad);
                  // Radial text: align the text baseline with the spoke.
                  // Flip 180° on the lower half so the text is never upside-down.
                  const normalizedAngle = ((labelAngle % 360) + 360) % 360;
                  const textRotation = (normalizedAngle > 90 && normalizedAngle < 270)
                    ? labelAngle + 180
                    : labelAngle;
                  return (
                    <g key={i}>
                      <path d={path} fill={seg.color} stroke="#FFFFFF" strokeWidth="1" opacity={seg.isWin ? 0.95 : 0.7} />
                      <text
                        x={lx} y={ly}
                        fill="#FFFFFF"
                        stroke="#0F172A"
                        strokeWidth="0.35"
                        paintOrder="stroke"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation} ${lx} ${ly})`}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                      >
                        {seg.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', border: '3px solid #FFFFFF', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              <i className="fas fa-coins text-white text-[0.9rem]"></i>
            </div>
          </div>
        </div>

        {/* Spin button + manual STOP button */}
        <div className="px-4 mb-3 space-y-2">
          {spinsRemaining > 0 ? (
            <button
              onClick={() => triggerSpin()}
              disabled={spinning}
              className="w-full py-4 rounded-2xl font-black text-[1rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#FFFFFF', boxShadow: '0 6px 20px rgba(245,158,11,0.5)' }}
            >
              {spinning ? (
                <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }}></div>Rotation...</>
              ) : (
                <><i className="fas fa-play"></i>Tourner la roue</>
              )}
            </button>
          ) : (
            <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <i className="fas fa-clock text-[#F59E0B] text-[1.2rem] mb-1"></i>
              <div className="text-[0.8rem] font-bold text-white">Tous vos tours sont utilisés !</div>
              <div className="text-[0.65rem] text-white/50 mt-0.5">Revenez demain pour 10 nouveaux tours</div>
            </div>
          )}

          {/* Manual STOP button — only visible while the wheel is spinning
              and the user hasn't already requested a stop. */}
          {spinning && !stopRequested && (
            <button
              onClick={handleStopWheel}
              className="w-full py-3 rounded-2xl font-black text-[0.92rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #EF4444, #B91C1C)',
                color: '#FFFFFF',
                boxShadow: '0 6px 18px rgba(239,68,68,0.5)',
                border: '2px solid rgba(255,255,255,0.25)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            >
              <i className="fas fa-hand-paper"></i>ARRÊTER LA ROUE
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-[0.5rem] uppercase tracking-wide font-semibold text-white/50">Tours restants</div>
              <div className="text-[1.1rem] font-black text-[#22C55E]">{spinsRemaining}/{DAILY_LIMIT}</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-[0.5rem] uppercase tracking-wide font-semibold text-white/50">Gagné aujourd'hui</div>
              <div className="text-[1.1rem] font-black text-[#F59E0B]">${totalWonToday.toFixed(2)}</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-[0.5rem] uppercase tracking-wide font-semibold text-white/50">Solde</div>
              <div className="text-[1.1rem] font-black text-white">{formatMoney(user?.balance || 0)}</div>
            </div>
          </div>
        </div>

        {/* Promo banner */}
        <div className="px-4 mb-4">
          <div className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.15))', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
              <i className="fas fa-gift text-white text-[1rem]"></i>
            </div>
            <div className="flex-1">
              <div className="text-[0.75rem] font-bold text-white">Plus de tours = plus de gains !</div>
              <div className="text-[0.6rem] text-white/60">La persistance paie toujours. Continuez à tourner !</div>
            </div>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="px-4 mb-4">
            <h3 className="text-[0.82rem] font-bold text-white mb-2">
              <i className="fas fa-history mr-1"></i>Historique du jour ({history.length})
            </h3>
            <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="rounded-lg p-2 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: h.result === 'win' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)' }}>
                      <i className={`fas ${h.result === 'win' ? 'fa-trophy' : 'fa-times'} text-[0.6rem]`} style={{ color: h.result === 'win' ? '#22C55E' : '#F87171' }}></i>
                    </div>
                    <div>
                      <div className="text-[0.68rem] font-semibold text-white">{h.result === 'win' ? 'Gagné' : 'Perdu'}</div>
                      <div className="text-[0.55rem] text-white/40">{new Date(h.spunAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <div className="text-[0.78rem] font-bold" style={{ color: h.result === 'win' ? '#22C55E' : '#F87171' }}>
                    {h.result === 'win' ? `+$${h.winAmount.toFixed(2)}` : '$0.00'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="px-4 pb-6">
          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle text-[#F59E0B] text-[0.8rem] mt-0.5"></i>
              <div>
                <div className="text-[0.72rem] font-bold mb-0.5 text-white">Règles du jeu</div>
                <div className="text-[0.65rem] leading-relaxed text-white/60">
                  • 10 tours gratuits par jour<br/>
                  • La roue se réinitialise à minuit<br/>
                  • Récompenses: $0.10 à $1.00<br/>
                  • Les gains vont sur votre solde principal
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CongratulationsModal data={congratsData} />
    </>
  );
}
