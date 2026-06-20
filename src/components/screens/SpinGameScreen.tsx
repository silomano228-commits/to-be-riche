'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, authFetch, refreshUser as globalRefreshUser } from '@/lib/store';
import { Header } from '@/components/shared';

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

export default function SpinGameScreen() {
  const { user, addToast } = useAppStore();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(3);
  const [paidSpinCost, setPaidSpinCost] = useState(0.50);
  const [totalWonToday, setTotalWonToday] = useState(0);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [lastResult, setLastResult] = useState<{ isWin: boolean; winAmount: number; label: string } | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/game/status');
      const data = await res.json();
      if (data.success) {
        setSegments(data.segments || []);
        setFreeSpinsRemaining(data.freeSpinsRemaining || 0);
        setPaidSpinCost(data.paidSpinCost || 0.50);
        setTotalWonToday(data.totalWonToday || 0);
        setHistory(data.todaySpins || []);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSpin = async (useFreeSpin: boolean) => {
    if (spinning) return;
    setSpinning(true);
    setLastResult(null);

    try {
      const res = await authFetch('/api/game/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useFreeSpin }),
      });
      const data = await res.json();

      if (data.success) {
        // Calculate target rotation
        const segmentAngle = 360 / segments.length;
        const targetSegment = data.segmentIdx;
        const targetAngle = 360 * 5 + (360 - targetSegment * segmentAngle - segmentAngle / 2); // 5 full spins + segment
        // Add random offset within segment
        const randomOffset = (Math.random() - 0.5) * (segmentAngle * 0.6);
        const finalRotation = rotation + targetAngle + randomOffset;

        // Normalize: keep accumulating but reset when too large
        setRotation(finalRotation);

        // Wait for spin animation to complete
        setTimeout(async () => {
          setLastResult({
            isWin: data.isWin,
            winAmount: data.winAmount,
            label: data.segment.label,
          });

          if (data.isWin) {
            addToast(`🎉 Gagné ! +$${data.winAmount.toFixed(2)}`, 'success');
          } else {
            addToast('Perdu ! Essayez encore.', 'info');
          }

          await globalRefreshUser();
          await loadStatus();
          setSpinning(false);
        }, 4500);
      } else {
        addToast(data.error || 'Erreur', 'error');
        setSpinning(false);
      }
    } catch {
      addToast('Erreur de connexion', 'error');
      setSpinning(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Roue" />
        <div className="flex-1 flex items-center justify-center" style={{ background: 'linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 100%)' }}>
          <div className="w-8 h-8 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }}></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Roue de la Fortune" />
      <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #312E81 50%, #1E1B4B 100%)' }}>
        {/* Hero */}
        <div className="px-4 pt-4 pb-2 text-center">
          <h2 className="text-[1.2rem] font-black text-white mb-0.5">🎡 Roue de la Fortune</h2>
          <p className="text-[0.7rem] text-white/60">Tournez et gagnez des récompenses !</p>
        </div>

        {/* Wheel */}
        <div className="flex justify-center px-4 py-4 relative">
          <div className="relative w-[280px] h-[280px]">
            {/* Pointer */}
            <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-20" style={{ width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '20px solid #F59E0B', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}></div>

            {/* Wheel SVG */}
            <div
              className="w-full h-full rounded-full relative"
              style={{
                transition: 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)',
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
                  const labelAngle = angle + sliceAngle / 2 - 90;
                  const labelRad = labelAngle * Math.PI / 180;
                  const labelR = 62;
                  const lx = cx + labelR * Math.cos(labelRad);
                  const ly = cy + labelR * Math.sin(labelRad);
                  return (
                    <g key={i}>
                      <path d={path} fill={seg.color} stroke="#FFFFFF" strokeWidth="1" opacity={seg.isWin ? 0.95 : 0.7} />
                      <text
                        x={lx} y={ly}
                        fill="#FFFFFF"
                        fontSize="9"
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${labelAngle + 90} ${lx} ${ly})`}
                        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
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

        {/* Last result */}
        {lastResult && (
          <div className="px-4 mb-3 text-center" style={{ animation: 'modalIn 0.4s ease-out' }}>
            <div className="inline-block px-5 py-2 rounded-full" style={{ background: lastResult.isWin ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.15)', border: `1px solid ${lastResult.isWin ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)'}` }}>
              <span className="text-[0.85rem] font-bold" style={{ color: lastResult.isWin ? '#22C55E' : '#F87171' }}>
                {lastResult.isWin ? `🎉 Gagné ${lastResult.label} !` : '😢 Perdu !'}
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-[0.55rem] uppercase tracking-wide font-semibold text-white/50">Tours gratuits</div>
              <div className="text-[1rem] font-black text-[#22C55E]">{freeSpinsRemaining}/3</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="text-[0.55rem] uppercase tracking-wide font-semibold text-white/50">Gagné aujourd'hui</div>
              <div className="text-[1rem] font-black text-[#F59E0B]">${totalWonToday.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Spin buttons */}
        <div className="px-4 mb-4 space-y-2">
          {freeSpinsRemaining > 0 ? (
            <button
              onClick={() => handleSpin(true)}
              disabled={spinning}
              className="w-full py-3.5 rounded-xl font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #22C55E, #14B8A6)', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}
            >
              {spinning ? 'Rotation en cours...' : `🎁 Tour gratuit (${freeSpinsRemaining} restant)`}
            </button>
          ) : (
            <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-[0.7rem] text-white/50">Tous vos tours gratuits sont utilisés</span>
            </div>
          )}

          <button
            onClick={() => handleSpin(false)}
            disabled={spinning}
            className="w-full py-3.5 rounded-xl font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', color: '#FFFFFF', boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
          >
            {spinning ? 'Rotation en cours...' : `💎 Tour payant ($${paidSpinCost.toFixed(2)})`}
          </button>
        </div>

        {/* Balance */}
        <div className="px-4 mb-4">
          <div className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span className="text-[0.72rem] font-semibold text-white/70">Votre solde</span>
            <span className="text-[0.95rem] font-black text-white">{formatMoney(user?.balance || 0)}</span>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="px-4 pb-4">
            <h3 className="text-[0.82rem] font-bold text-white mb-2">
              <i className="fas fa-history mr-1"></i>Historique du jour
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
                  • 3 tours gratuits par jour<br/>
                  • Tours supplémentaires: ${paidSpinCost.toFixed(2)} chacun<br/>
                  • Taux de gain: ~35%<br/>
                  • Récompenses: $0.10 à $1.00<br/>
                  • Les gains vont sur votre solde principal
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
