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
const SPIN_COST = 0.20; // mirrors backend /api/game/status SPIN_COST export

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
  netResult: number; // winAmount - SPIN_COST (negative on loss)
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
  const [costToast, setCostToast] = useState<{ amount: number; key: number } | null>(null);
  const [jackpot, setJackpot] = useState(false); // true while the $10 JACKPOT celebration overlay is showing

  const spinsRemainingRef = useRef(spinsRemaining);
  const spinningRef = useRef(spinning);
  const triggerSpinRef = useRef<() => void>(() => {});
  const handleStopWheelRef = useRef<() => void>(() => {});
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

    // $10 grand-prize branch — special JACKPOT celebration overlay.
    if (data.isWin && data.winAmount >= 10) {
      setTotalWonToday((prev) => prev + (data.winAmount || 0));
      setJackpot(true);
      setCongratsData({
        show: true,
        type: 'win',
        title: 'JACKPOT ! 🎉',
        amount: data.winAmount,
        message: `Gros lot remporté : ${data.winAmount.toFixed(2)} $ ! Après coût de ${SPIN_COST.toFixed(2)} $, votre gain net est de ${data.netResult.toFixed(2)} $.`,
        onClose: () => { setCongratsData({ show: false, type: 'win' }); setJackpot(false); },
      });
    } else if (data.isWin) {
      setTotalWonToday((prev) => prev + (data.winAmount || 0));
      setCongratsData({
        show: true,
        type: 'win',
        amount: data.winAmount,
        message: `Vous avez gagné ${data.winAmount.toFixed(2)} $ ! Après coût de ${SPIN_COST.toFixed(2)} $, votre gain net est de ${data.netResult.toFixed(2)} $.`,
        onClose: () => setCongratsData({ show: false, type: 'win' }),
      });
    } else {
      setCongratsData({
        show: true,
        type: 'loss',
        message: `Perdu. Coût du tour : ${SPIN_COST.toFixed(2)} $. Résultat net : ${data.netResult.toFixed(2)} $.`,
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

    // Client-side balance precheck — saves a network round-trip when the user is broke.
    const available = (user?.balance || 0) + (user?.investBalance || 0);
    if (available < SPIN_COST) {
      addToast('Solde insuffisant (minimum 0,20 $)', 'error');
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
        // Backend has ALREADY decided the outcome + deducted the $0.20 cost.
        // Reveal a floating "-0,20 $" toast near the balance, then store the
        // pending result for later (used by both the 5s auto-stop and the
        // manual STOP button).
        setCostToast({ amount: -SPIN_COST, key: Date.now() });
        pendingResultRef.current = {
          segmentIdx: data.segmentIdx,
          isWin: data.isWin,
          winAmount: data.winAmount,
          netResult: typeof data.netResult === 'number' ? data.netResult : (data.isWin ? data.winAmount : 0) - SPIN_COST,
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

        // 5s auto-stop safety net — the user can stop earlier via the STOP
        // button (which calls handleStopWheelRef.current() and clears this
        // timer). handleStopWheel sets up its own short 850ms finish timer.
        spinTimeoutRef.current = window.setTimeout(() => {
          handleStopWheelRef.current();
        }, 5000);
      } else {
        if (data.insufficientBalance) {
          addToast(data.error || 'Solde insuffisant (minimum 0,20 $)', 'error');
        } else if (data.dailyLimitReached) {
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
  }, [rotation, segments.length, addToast, user?.balance, user?.investBalance]);

  // Manual STOP: redirect the wheel to land exactly on the backend-chosen
  // segment using a short 0.8s ease-out transition, then process the result.
  // Idempotent: if pendingResultRef is null (already processed or auto-stopped), no-op.
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
    handleStopWheelRef.current = handleStopWheel;
  }, [spinsRemaining, spinning, triggerSpin, handleStopWheel]);

  // Auto-dismiss the floating "-0,20 $" cost toast after 1.6s.
  useEffect(() => {
    if (!costToast) return;
    const t = setTimeout(() => setCostToast(null), 1600);
    return () => clearTimeout(t);
  }, [costToast]);

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
                  // $10 grand-prize segment — gold background, bolder + larger text.
                  const isJackpot = seg.isWin && seg.reward >= 10;
                  const fillColor = isJackpot ? '#FBBF24' : seg.color;
                  const fontSize = isJackpot ? 11 : 9;
                  const fontWeight = isJackpot ? 900 : 'bold';
                  return (
                    <g key={i}>
                      <path d={path} fill={fillColor} stroke="#FFFFFF" strokeWidth={isJackpot ? 1.5 : 1} opacity={seg.isWin ? 0.98 : 0.7} />
                      <text
                        x={lx} y={ly}
                        fill={isJackpot ? '#78350F' : '#FFFFFF'}
                        stroke={isJackpot ? '#FFFFFF' : '#0F172A'}
                        strokeWidth="0.35"
                        paintOrder="stroke"
                        fontSize={fontSize}
                        fontWeight={fontWeight}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${textRotation} ${lx} ${ly})`}
                        style={{ textShadow: isJackpot ? '0 1px 3px rgba(255,255,255,0.6)' : '0 1px 2px rgba(0,0,0,0.6)' }}
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
          {/* Spin cost badge — prominently displayed above the spin button */}
          <div className="flex items-center justify-center gap-2">
            <div className="rounded-full px-3 py-1 flex items-center gap-1.5" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)' }}>
              <i className="fas fa-coins text-[#FBBF24] text-[0.6rem]"></i>
              <span className="text-[0.65rem] font-bold text-[#FBBF24]">Coût : {SPIN_COST.toFixed(2).replace('.', ',')} $ / tour</span>
            </div>
          </div>

          {spinsRemaining > 0 ? (
            (() => {
              const available = (user?.balance || 0) + (user?.investBalance || 0);
              const insufficient = available < SPIN_COST;
              return (
                <>
                  <button
                    onClick={() => triggerSpin()}
                    disabled={spinning || insufficient}
                    className="w-full py-4 rounded-2xl font-black text-[1rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#FFFFFF', boxShadow: insufficient ? 'none' : '0 6px 20px rgba(245,158,11,0.5)' }}
                  >
                    {spinning ? (
                      <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }}></div>Rotation...</>
                    ) : insufficient ? (
                      <><i className="fas fa-ban"></i>Solde insuffisant (minimum 0,20 $)</>
                    ) : (
                      <><i className="fas fa-play"></i>Tourner la roue</>
                    )}
                  </button>
                  {insufficient && !spinning && (
                    <p className="text-[0.65rem] text-center text-[#FBBF24] font-medium">Solde principal + investissement inférieur à 0,20 $. Rechargez pour jouer.</p>
                  )}
                </>
              );
            })()
          ) : (
            <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <i className="fas fa-clock text-[#F59E0B] text-[1.2rem] mb-1"></i>
              <div className="text-[0.8rem] font-bold text-white">Tous vos tours sont utilisés !</div>
              <div className="text-[0.65rem] text-white/50 mt-0.5">Revenez demain pour 10 nouveaux tours</div>
            </div>
          )}

          {/* Manual STOP button — only visible while the wheel is spinning
              and the user hasn't already requested a stop. Large, pulsing,
              red/amber so it's impossible to miss. */}
          {spinning && !stopRequested && (
            <button
              onClick={handleStopWheel}
              className="w-full py-5 rounded-2xl font-black text-[1.05rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #EF4444, #F59E0B)',
                color: '#FFFFFF',
                boxShadow: '0 8px 24px rgba(239,68,68,0.6), 0 0 0 4px rgba(245,158,11,0.2)',
                border: '3px solid rgba(255,255,255,0.4)',
                animation: 'spinPulse 0.9s ease-in-out infinite',
                letterSpacing: '1px',
              }}
            >
              <i className="fas fa-hand-paper text-[1.1rem]"></i>ARRÊTER LA ROUE
            </button>
          )}
        </div>

        {/* Floating "-0,20 $" cost toast — positioned over the Solde cell. */}
        {costToast && (
          <div
            key={costToast.key}
            className="fixed left-1/2 -translate-x-1/2 z-[7000] pointer-events-none"
            style={{
              bottom: 'calc(50% - 120px)',
              animation: 'costFloat 1.6s ease-out forwards',
            }}
          >
            <div
              className="px-4 py-2 rounded-full font-black text-[0.95rem] flex items-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(245,158,11,0.95))',
                color: '#FFFFFF',
                boxShadow: '0 6px 20px rgba(239,68,68,0.5)',
                border: '2px solid rgba(255,255,255,0.4)',
              }}
            >
              <i className="fas fa-coins"></i>
              <span>-{SPIN_COST.toFixed(2).replace('.', ',')} $</span>
            </div>
          </div>
        )}

        {/* JACKPOT overlay — extra confetti burst behind the modal. */}
        {jackpot && (
          <div className="fixed inset-0 z-[7500] pointer-events-none overflow-hidden">
            {Array.from({ length: 80 }).map((_, i) => {
              const colors = ['#FBBF24', '#F59E0B', '#22C55E', '#FFFFFF', '#FCD34D', '#EF4444'];
              const color = colors[i % colors.length];
              const left = Math.random() * 100;
              const delay = Math.random() * 0.6;
              const duration = 2 + Math.random() * 2;
              const size = 8 + Math.random() * 10;
              return (
                <div
                  key={i}
                  className="absolute top-[-20px] rounded-sm"
                  style={{
                    left: `${left}%`,
                    width: `${size}px`,
                    height: `${size * 1.5}px`,
                    background: color,
                    animation: `jackpotFall ${duration}s ease-in ${delay}s forwards`,
                  }}
                />
              );
            })}
          </div>
        )}

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
                  • 10 tours par jour<br/>
                  • Coût : 0,20 $ par tour (débité du principal puis de l&apos;investissement)<br/>
                  • La roue se réinitialise à minuit<br/>
                  • Récompenses : 0,10 $ à 10,00 $ (segment doré = gros lot !)<br/>
                  • Les gains vont sur votre solde principal
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Local keyframes: cost-toast float-up + jackpot confetti fall + STOP-button pulse. */}
      <style>{`
        @keyframes costFloat {
          0% { transform: translate(-50%, 10px); opacity: 0; }
          15% { transform: translate(-50%, 0); opacity: 1; }
          80% { transform: translate(-50%, -40px); opacity: 1; }
          100% { transform: translate(-50%, -70px); opacity: 0; }
        }
        @keyframes jackpotFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(900deg); opacity: 0; }
        }
        @keyframes spinPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 8px 24px rgba(239,68,68,0.6), 0 0 0 4px rgba(245,158,11,0.2); }
          50% { transform: scale(1.04); box-shadow: 0 12px 32px rgba(239,68,68,0.8), 0 0 0 10px rgba(245,158,11,0); }
        }
      `}</style>

      <CongratulationsModal data={congratsData} />
    </>
  );
}
