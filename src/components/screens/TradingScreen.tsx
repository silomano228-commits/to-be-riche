'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

/* Generate a pseudo-random but deterministic chart path for a given trade */
function generateChartPath(tradeId: string, direction: 'up' | 'down', elapsed: number, width: number, height: number): string {
  const points: string[] = [];
  const steps = 30;
  const stepW = width / steps;
  let y = height * 0.5;
  let seed = 0;
  for (let i = 0; i < tradeId.length; i++) seed = ((seed << 5) - seed + tradeId.charCodeAt(i)) | 0;
  const rand = () => { seed = (seed * 16807 + 0) % 2147483647; return (seed & 0x7fffffff) / 0x7fffffff; };

  const progress = Math.min(1, elapsed / 600);
  const visibleSteps = Math.max(2, Math.floor(steps * Math.min(1, progress * 3 + 0.15)));

  for (let i = 0; i <= visibleSteps; i++) {
    const x = i * stepW;
    const bias = direction === 'up' ? -0.3 : 0.3;
    const move = (rand() - 0.5 + bias) * (height * 0.12);
    y = Math.max(height * 0.1, Math.min(height * 0.9, y + move));
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

export default function TradingScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [duration, setDuration] = useState(60);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [chartTick, setChartTick] = useState(0);

  useEffect(() => { const t = setInterval(() => setChartTick(c => c + 1), 2000); return () => clearInterval(t); }, []);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadTrades = useCallback(async () => {
    try {
      const res = await authFetch('/api/trade/active');
      const data = await res.json();
      if (data.success) setActiveTrades(data.trades || []);
    } catch { /* */ }
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  useEffect(() => {
    activeTrades.forEach((trade) => {
      if (new Date(trade.endsAt).getTime() <= now && !trade.resolved) {
        authFetch('/api/trade/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId: trade.id }) })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              addToast(data.result === 'win' ? `Gagné ! +${formatMoney(data.profit)}` : data.result === 'lose' ? 'Perdu !' : 'Match nul', data.result === 'win' ? 'success' : data.result === 'lose' ? 'error' : 'info');
              loadTrades();
              fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
            }
          })
          .catch(() => { /* */ });
      }
    });
  }, [now, activeTrades]);

  const handleCreateTrade = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1 || amt > 5) { addToast('Montant: 1-5 $', 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/trade/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, direction, durationSec: duration }) });
      const data = await res.json();
      if (data.success) { addToast('Trade lancé !', 'success'); setAmount(''); loadTrades(); fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); }); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  if (!user) return null;
  const durations = [{ sec: 60, label: '1 min' }, { sec: 180, label: '3 min' }, { sec: 300, label: '5 min' }, { sec: 600, label: '10 min' }];

  return (
    <>
      <style>{`
        @keyframes tradeCardGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(184,155,94,0); }
          50% { box-shadow: 0 0 20px rgba(184,155,94,0.08); }
        }
        @keyframes chartLineMove {
          0% { stroke-dashoffset: 200; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes countBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .live-dot {
          animation: liveDot 1.2s ease-in-out infinite;
        }
        .timer-colon-blink {
          animation: countBlink 1s step-end infinite;
        }
        .trade-card-glow {
          animation: tradeCardGlow 2s ease-in-out infinite;
        }
        .chart-svg-line {
          stroke-dasharray: 200;
          animation: chartLineMove 2s ease-out forwards;
        }
      `}</style>
      <Header title="Ultra Market" icon="fa-bolt" iconColor="#B89B5E" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto bg-[#050506]">
        {/* Balance - Dark card with gold accent */}
        <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 mb-4 relative overflow-hidden">
          <div className="absolute top-3 right-4 text-[0.65rem] text-[rgba(255,255,255,0.15)] font-mono">TRADE·HUB</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[rgba(184,155,94,0.12)] flex items-center justify-center">
              <i className="fas fa-bolt text-[0.85rem] text-[#B89B5E]"></i>
            </div>
            <div className="text-[0.7rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[1.5px]">Compte de Trading</div>
          </div>
          <div className="text-[2rem] font-black text-[#B89B5E] mb-2 tracking-tight">{formatMoney(user.tradeBalance)}</div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="flex items-center gap-1.5 text-[0.75rem] text-[#B89B5E] font-semibold bg-[rgba(184,155,94,0.1)] hover:bg-[rgba(184,155,94,0.15)] transition-colors py-1.5 px-3 rounded-lg border border-[rgba(184,155,94,0.15)]">
            <i className="fas fa-plus text-[0.65rem]"></i>Verser des fonds
          </button>
        </div>

        {/* Trade Form - Dark themed */}
        <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-[#B89B5E]"></div>
            <h4 className="text-[0.88rem] font-bold text-[#EDEDEF]">Nouveau trade</h4>
          </div>

          {/* Amount input */}
          <div className="relative mb-4">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[0.75rem] font-bold text-[rgba(255,255,255,0.35)]">$</div>
            <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1 - 5" className="w-full py-3.5 pl-8 pr-4 bg-[rgba(255,255,255,0.04)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[1rem] font-semibold outline-none focus:border-[#B89B5E] focus:ring-[3px] focus:ring-[rgba(184,155,94,0.1)] transition-all text-[#EDEDEF] placeholder:text-[rgba(255,255,255,0.2)]" />
          </div>

          {/* Direction */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button onClick={() => setDirection('up')} className={`py-4 rounded-xl font-bold text-[0.95rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${direction === 'up' ? 'bg-[rgba(184,155,94,0.15)] text-[#B89B5E] border border-[rgba(184,155,94,0.2)]' : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.06)]'}`}>
              <i className="fas fa-arrow-trend-up text-[1rem]"></i>
              <span>HAUT</span>
            </button>
            <button onClick={() => setDirection('down')} className={`py-4 rounded-xl font-bold text-[0.95rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${direction === 'down' ? 'bg-[rgba(248,113,113,0.15)] text-[#F87171] border border-[rgba(248,113,113,0.2)]' : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.06)]'}`}>
              <i className="fas fa-arrow-trend-down text-[1rem]"></i>
              <span>BAS</span>
            </button>
          </div>

          {/* Duration - gold selected state */}
          <div className="mb-4">
            <div className="text-[0.7rem] font-semibold text-[rgba(255,255,255,0.4)] uppercase tracking-[0.5px] mb-2">Durée</div>
            <div className="grid grid-cols-4 gap-2">
              {durations.map((d) => (
                <button key={d.sec} onClick={() => setDuration(d.sec)} className={`py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all active:scale-[0.97] ${duration === d.sec ? 'bg-[rgba(184,155,94,0.15)] text-[#B89B5E] ring-2 ring-[rgba(184,155,94,0.15)]' : 'bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.06)]'}`}>{d.label}</button>
              ))}
            </div>
          </div>

          {/* Gain/Loss info */}
          <div className="flex items-center justify-center gap-4 mb-4 py-2.5 bg-[rgba(255,255,255,0.03)] rounded-xl border border-[rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#4ADE80]"></div>
              <span className="text-[0.72rem] font-semibold text-[#4ADE80]">Gain: +85%</span>
            </div>
            <div className="w-[1px] h-3 bg-[rgba(255,255,255,0.08)]"></div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#F87171]"></div>
              <span className="text-[0.72rem] font-semibold text-[#F87171]">Perte: -100%</span>
            </div>
          </div>

          <button onClick={handleCreateTrade} disabled={creating} className="w-full py-4 rounded-xl bg-[#B89B5E] text-[#050506] font-bold text-[0.92rem] border-none cursor-pointer disabled:opacity-60 hover:bg-[#D4B87A] transition-colors flex items-center justify-center gap-2">
            <i className="fas fa-bolt"></i>
            <span>{creating ? 'Chargement...' : 'Lancer le trade'}</span>
          </button>
        </div>

        {/* Active Trades - Dark themed */}
        {activeTrades.filter(t => !t.resolved).length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#EDEDEF] mb-2.5">Trades en cours</h3>
            {activeTrades.filter(t => !t.resolved).map((trade) => {
              const remaining = new Date(trade.endsAt).getTime() - now;
              const totalDuration = trade.durationSec * 1000;
              const elapsed = totalDuration - remaining;
              const progress = Math.min(1, elapsed / totalDuration);
              const mins = Math.max(0, Math.floor(remaining / 60000));
              const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));
              const isUp = trade.direction === 'up';
              const lineColor = isUp ? '#B89B5E' : '#F87171';
              const fillColor = isUp ? 'rgba(184,155,94,0.08)' : 'rgba(248,113,113,0.08)';

              return (
                <div key={trade.id} className="trade-card-glow bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 mb-2.5" style={{ animation: 'slideUp 0.3s ease-out' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isUp ? 'bg-[rgba(184,155,94,0.12)]' : 'bg-[rgba(248,113,113,0.12)]'}`}>
                        <i className={`fas fa-arrow-trend-${isUp ? 'up' : 'down'} text-[0.95rem]`} style={{ color: lineColor }}></i>
                      </div>
                      <div>
                        <div className="text-[0.85rem] font-bold text-[#EDEDEF] flex items-center gap-2">
                          {isUp ? 'HAUT' : 'BAS'}
                          <span className="live-dot inline-block w-2 h-2 rounded-full bg-[#B89B5E]"></span>
                        </div>
                        <div className="text-[0.68rem] text-[rgba(255,255,255,0.45)]">{formatMoney(trade.amount)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.6rem] text-[rgba(255,255,255,0.35)] uppercase tracking-[0.5px] mb-0.5">Temps restant</div>
                      <div className="text-[1.4rem] font-mono font-black tracking-wide text-[#EDEDEF]">
                        {mins}<span className="timer-colon-blink">:</span>{secs.toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Animated chart */}
                  <div className="relative h-[60px] rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] overflow-hidden mb-3">
                    <div className="absolute inset-0 flex flex-col justify-between py-1.5">
                      <div className="border-t border-[rgba(255,255,255,0.03)]"></div>
                      <div className="border-t border-[rgba(255,255,255,0.03)]"></div>
                      <div className="border-t border-[rgba(255,255,255,0.03)]"></div>
                    </div>
                    <svg className="w-full h-full" viewBox="0 0 280 60" preserveAspectRatio="none">
                      <path
                        d={generateChartPath(trade.id, trade.direction, elapsed, 280, 60)}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="chart-svg-line"
                        key={chartTick}
                      />
                      <path
                        d={(() => {
                          const linePath = generateChartPath(trade.id, trade.direction, elapsed, 280, 60);
                          if (!linePath) return '';
                          const lastX = linePath.split(',').slice(-2).join(',').replace(/[^0-9.,]/g, '');
                          const parts = lastX.split(',');
                          const x = parts[0] || '280';
                          return `${linePath} L${x},60 L0,60 Z`;
                        })()}
                        fill={fillColor}
                      />
                    </svg>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-[3px] bg-[rgba(255,255,255,0.06)] rounded-full">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${lineColor}, ${lineColor}88)` }}></div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* No active trades */}
        {activeTrades.filter(t => !t.resolved).length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-[rgba(184,155,94,0.08)] flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-chart-area text-[1.5rem] text-[#B89B5E]"></i>
            </div>
            <p className="text-[0.85rem] text-[rgba(255,255,255,0.6)] font-medium">Aucun trade actif</p>
            <p className="text-[0.72rem] text-[rgba(255,255,255,0.35)]">Lancez-en un pour commencer !</p>
          </div>
        )}
      </div>
    </>
  );
}
