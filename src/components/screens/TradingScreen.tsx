'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, formatMoney, esc, authFetch, refreshUser } from '@/lib/store';
import { Header } from '@/components/shared';

// ==================== MARKET DATA ====================
const MARKETS = [
  { id: 'BTC', name: 'Bitcoin', pair: 'BTC/USD', icon: 'fa-bitcoin-sign', color: '#F7931A', bg: 'rgba(247,147,26,0.12)', base: 67500, vol: 800, dec: 2 },
  { id: 'ETH', name: 'Ethereum', pair: 'ETH/USD', icon: 'fa-ethereum', color: '#627EEA', bg: 'rgba(98,126,234,0.12)', base: 3450, vol: 120, dec: 2 },
  { id: 'EUR', name: 'Euro', pair: 'EUR/USD', icon: 'fa-euro-sign', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', base: 1.085, vol: 0.008, dec: 4 },
  { id: 'GOLD', name: 'Or', pair: 'GOLD/USD', icon: 'fa-coins', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', base: 2340, vol: 35, dec: 2 },
  { id: 'AAPL', name: 'Apple', pair: 'AAPL', icon: 'fa-apple-whole', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', base: 192, vol: 4, dec: 2 },
  { id: 'TSLA', name: 'Tesla', pair: 'TSLA', icon: 'fa-car', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', base: 245, vol: 8, dec: 2 },
] as const;

type MarketId = typeof MARKETS[number]['id'];

// ==================== LIVE PRICE SIMULATION ====================
function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, { current: number; history: number[]; change: number }>>(() => {
    const init: Record<string, { current: number; history: number[]; change: number }> = {};
    MARKETS.forEach(m => {
      const start = m.base + (Math.random() - 0.5) * m.vol * 0.5;
      const hist: number[] = [];
      let p = start;
      for (let i = 0; i < 60; i++) {
        p += (Math.random() - 0.48) * m.vol * 0.02;
        p = Math.max(m.base - m.vol, Math.min(m.base + m.vol, p));
        hist.push(p);
      }
      init[m.id] = { current: p, history: hist, change: ((p - start) / start) * 100 };
    });
    return init;
  });

  useEffect(() => {
    const iv = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        MARKETS.forEach(m => {
          const cur = next[m.id];
          if (!cur) return;
          const tick = (Math.random() - 0.48) * m.vol * 0.015;
          const newP = Math.max(m.base - m.vol, Math.min(m.base + m.vol, cur.current + tick));
          const newHist = [...cur.history.slice(-59), newP];
          const first = newHist[0];
          const ch = ((newP - first) / first) * 100;
          next[m.id] = { current: newP, history: newHist, change: ch };
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return prices;
}

// ==================== CHART GENERATION ====================
function generateSVGPath(history: number[], w: number, h: number, pad = 4): string {
  if (history.length < 2) return '';
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (history.length - 1);
  return history.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

function generateAreaPath(history: number[], w: number, h: number, pad = 4): string {
  const line = generateSVGPath(history, w, h, pad);
  if (!line) return '';
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (history.length - 1);
  const lastX = pad + (history.length - 1) * stepX;
  const lastY = pad + (1 - (history[history.length - 1] - min) / range) * (h - pad * 2);
  return `${line} L${lastX.toFixed(1)},${h} L${pad},${h} Z`;
}

// ==================== AI ANALYSIS ====================
function generateAIAnalysis(marketId: string, change: number): { signal: string; confidence: number; rsi: number; macd: string; ma: string; sentiment: string; advice: string } {
  // Simulated technical indicators - looks real but ultimately 65% lose
  const rsi = 25 + Math.random() * 50; // 25-75 range
  const macdVal = (Math.random() - 0.5) * 2;
  const macdSignal = macdVal > 0.2 ? 'Haussier' : macdVal < -0.2 ? 'Baissier' : 'Neutre';
  const ma20above = Math.random() > 0.5;

  let signal: string;
  let confidence: number;
  let advice: string;

  // The AI analysis looks convincing but doesn't actually help
  if (change > 1) {
    signal = 'ACHAT';
    confidence = 55 + Math.floor(Math.random() * 25);
    advice = `Forte dynamique haussière sur ${marketId}. Le momentum reste positif avec une pression acheteuse confirmée.`;
  } else if (change < -1) {
    signal = 'VENTE';
    confidence = 55 + Math.floor(Math.random() * 25);
    advice = `Pression vendeuse détectée sur ${marketId}. Une correction technique est en cours.`;
  } else {
    signal = 'NEUTRE';
    confidence = 40 + Math.floor(Math.random() * 20);
    advice = `Marché indécis sur ${marketId}. Attendre une cassure de niveau pour entrer.`;
  }

  return {
    signal,
    confidence,
    rsi: Math.round(rsi),
    macd: macdSignal,
    ma: ma20above ? 'Au-dessus MA20' : 'Sous MA20',
    sentiment: change > 0.5 ? 'Bullish' : change < -0.5 ? 'Bearish' : 'Mixed',
    advice,
  };
}

// ==================== MINI CHART COMPONENT ====================
function MiniChart({ history, color, width = 80, height = 32 }: { history: number[]; color: string; width?: number; height?: number }) {
  const linePath = generateSVGPath(history, width, height, 2);
  const areaPath = generateAreaPath(history, width, height, 2);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`ag-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#ag-${color.replace('#', '')})`} />}
      {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

// ==================== FULL CHART COMPONENT ====================
function FullChart({ history, color, assetId }: { history: number[]; color: string; assetId: string }) {
  const w = 340, h = 180, pad = 8;
  const linePath = generateSVGPath(history, w, h, pad);
  const areaPath = generateAreaPath(history, w, h, pad);
  const min = Math.min(...history);
  const max = Math.max(...history);

  // Grid lines
  const gridLines = [0.25, 0.5, 0.75].map(f => pad + f * (h - pad * 2));
  const gridPrices = [0.25, 0.5, 0.75].map(f => max - f * (max - min));

  return (
    <div className="relative bg-[rgba(0,0,0,0.03)] rounded-xl border border-[rgba(0,0,0,0.06)] overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} className="overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`fg-${assetId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <filter id={`glow-${assetId}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* Grid */}
        {gridLines.map((y, i) => (
          <g key={i}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={w - pad - 2} y={y - 2} fontSize="7" fill="rgba(0,0,0,0.3)" textAnchor="end" fontFamily="monospace">
              {gridPrices[i].toFixed(2)}
            </text>
          </g>
        ))}
        {/* Area fill */}
        {areaPath && <path d={areaPath} fill={`url(#fg-${assetId})`} />}
        {/* Glow line */}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${assetId})`} opacity="0.4" />}
        {/* Main line */}
        {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
        {/* Current price dot */}
        {history.length > 0 && (() => {
          const lastVal = history[history.length - 1];
          const range = max - min || 1;
          const lastY = pad + (1 - (lastVal - min) / range) * (h - pad * 2);
          const lastX = pad + (history.length - 1) / (history.length - 1) * (w - pad * 2);
          return (
            <g>
              <circle cx={lastX} cy={lastY} r="4" fill={color} opacity="0.3">
                <animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx={lastX} cy={lastY} r="3" fill={color} />
            </g>
          );
        })()}
      </svg>
      {/* Live badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1 bg-[rgba(0,0,0,0.7)] rounded-full px-2 py-0.5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] animate-pulse" />
        <span className="text-[0.55rem] text-white font-bold tracking-wide">LIVE</span>
      </div>
    </div>
  );
}

// ==================== MAIN SCREEN ====================
export default function TradingScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [selectedMarket, setSelectedMarket] = useState<MarketId>('BTC');
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [duration, setDuration] = useState(60);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [showAI, setShowAI] = useState(false);
  const prices = useLivePrices();
  const [aiAnalysis, setAiAnalysis] = useState<ReturnType<typeof generateAIAnalysis> | null>(null);
  const [winPercent, setWinPercent] = useState(() => 75 + Math.floor(Math.random() * 11)); // 75-85%
  const resolvingRef = useRef<Set<string>>(new Set());

  // Tick every second
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  // Vary win percentage every 15-30 seconds
  useEffect(() => {
    const vary = () => setWinPercent(75 + Math.floor(Math.random() * 11));
    const delay = 15000 + Math.random() * 15000;
    const t = setTimeout(() => { vary(); const iv = setInterval(vary, 15000 + Math.random() * 15000); return () => clearInterval(iv); }, delay);
    return () => clearTimeout(t);
  }, []);

  // Load active trades
  const loadTrades = useCallback(async () => {
    try {
      const res = await authFetch('/api/trade/active');
      const data = await res.json();
      if (data.success) {
        setActiveTrades(data.trades || []);
        resolvingRef.current.clear();
      }
    } catch { /* */ }
  }, []);
  useEffect(() => { loadTrades(); }, [loadTrades]);

  // Resolve finished trades
  useEffect(() => {
    activeTrades.forEach((trade) => {
      if (new Date(trade.endsAt).getTime() <= now && !trade.resolved && !resolvingRef.current.has(trade.id)) {
        resolvingRef.current.add(trade.id);
        authFetch('/api/trade/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId: trade.id }) })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              addToast(data.result === 'win' ? `Gagné ! +${formatMoney(data.profit)}` : data.result === 'lose' ? 'Perdu !' : 'Match nul', data.result === 'win' ? 'success' : data.result === 'lose' ? 'error' : 'info');
              loadTrades();
              refreshUser();
            }
          })
          .catch(() => { /* */ })
          .finally(() => { resolvingRef.current.delete(trade.id); });
      }
    });
  }, [now, activeTrades]);

  // Update AI analysis every 5 seconds
  useEffect(() => {
    const updateAI = () => {
      const m = MARKETS.find(m => m.id === selectedMarket);
      const p = prices[selectedMarket];
      if (m && p) setAiAnalysis(generateAIAnalysis(m.id, p.change));
    };
    updateAI();
    const iv = setInterval(updateAI, 5000);
    return () => clearInterval(iv);
  }, [selectedMarket, prices]);

  const handleCreateTrade = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1 || amt > 5) { addToast('Montant: 1-5 $', 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/trade/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, direction, durationSec: duration, asset: selectedMarket }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Trade lancé !', 'success');
        setAmount('');
        loadTrades();
        refreshUser();
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  if (!user) return null;
  const market = MARKETS.find(m => m.id === selectedMarket) || MARKETS[0];
  const priceData = prices[selectedMarket];
  const durations = [{ sec: 60, label: '1 min' }, { sec: 180, label: '3 min' }, { sec: 300, label: '5 min' }, { sec: 600, label: '10 min' }];

  return (
    <>
      <style>{`
        @keyframes tradeCardGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(248,113,113,0); }
          50% { box-shadow: 0 0 20px rgba(248,113,113,0.1); }
        }
        @keyframes liveDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes countBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes chartPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        @keyframes signalGlow {
          0%, 100% { box-shadow: 0 0 8px rgba(34,197,94,0.2); }
          50% { box-shadow: 0 0 16px rgba(34,197,94,0.4); }
        }
        @keyframes slideRight {
          from { transform: translateX(-8px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .live-dot { animation: liveDot 1.2s ease-in-out infinite; }
        .timer-colon-blink { animation: countBlink 1s step-end infinite; }
        .trade-card-glow { animation: tradeCardGlow 2s ease-in-out infinite; }
        .chart-pulse { animation: chartPulse 2s ease-in-out infinite; }
        .signal-glow { animation: signalGlow 2s ease-in-out infinite; }
        .slide-right { animation: slideRight 0.3s ease-out; }
      `}</style>

      <Header
        title={<span className="flex items-center gap-2"><i className="fas fa-chart-line text-[0.85rem]" style={{ color: market.color }} /> Ultra Market</span>}
        icon="fa-bolt"
        iconColor={market.color}
        leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>}
      />

      <div className="px-[14px] py-3 flex-1 w-full overflow-y-auto min-h-0 bg-[#F8F9FA]">

        {/* ===== MARKET SELECTOR ===== */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {MARKETS.map(m => {
            const p = prices[m.id];
            const isSelected = selectedMarket === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMarket(m.id as MarketId)}
                className={`shrink-0 rounded-xl p-2.5 border-none cursor-pointer transition-all active:scale-95 min-w-[100px] ${isSelected ? 'bg-[#FFFFFF] shadow-[0_2px_12px_rgba(0,0,0,0.08)]' : 'bg-[rgba(255,255,255,0.5)]'}`}
                style={{ borderTop: isSelected ? `2px solid ${m.color}` : '2px solid transparent' }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: m.bg }}>
                    <i className={`fas ${m.icon} text-[0.55rem]`} style={{ color: m.color }}></i>
                  </div>
                  <span className="text-[0.65rem] font-bold text-[#1F2937]">{m.id}</span>
                </div>
                {p && <MiniChart history={p.history.slice(-20)} color={m.color} width={72} height={22} />}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[0.6rem] font-mono font-bold text-[#1F2937]">{p ? p.current.toFixed(m.dec) : '—'}</span>
                  <span className={`text-[0.55rem] font-bold ${(p?.change || 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                    {(p?.change || 0) >= 0 ? '+' : ''}{(p?.change || 0).toFixed(2)}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* ===== MAIN CHART ===== */}
        <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-3 mb-3 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: market.bg }}>
                <i className={`fas ${market.icon} text-[0.85rem]`} style={{ color: market.color }}></i>
              </div>
              <div>
                <div className="text-[0.85rem] font-bold text-[#1F2937]">{market.pair}</div>
                <div className="text-[0.58rem] text-[rgba(0,0,0,0.4)]">{market.name}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[1.1rem] font-mono font-black text-[#1F2937]">
                {priceData ? priceData.current.toFixed(market.dec) : '—'}
              </div>
              <div className={`text-[0.7rem] font-bold ${(priceData?.change || 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {(priceData?.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(priceData?.change || 0).toFixed(2)}%
              </div>
            </div>
          </div>
          <FullChart history={priceData?.history || []} color={market.color} assetId={market.id} />
        </div>

        {/* ===== AI ANALYSIS ===== */}
        {aiAnalysis && (
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[rgba(139,92,246,0.12)] flex items-center justify-center border border-[rgba(139,92,246,0.15)]">
                  <i className="fas fa-brain text-[0.8rem] text-[#8B5CF6]"></i>
                </div>
                <div>
                  <div className="text-[0.78rem] font-bold text-[#1F2937]">Analyse IA</div>
                  <div className="text-[0.55rem] text-[rgba(0,0,0,0.4)]">Mise à jour en temps réel</div>
                </div>
              </div>
              <div className={`px-2.5 py-1 rounded-lg text-[0.7rem] font-black tracking-wide signal-glow ${
                aiAnalysis.signal === 'ACHAT' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E] border border-[rgba(34,197,94,0.2)]' :
                aiAnalysis.signal === 'VENTE' ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] border border-[rgba(239,68,68,0.2)]' :
                'bg-[rgba(245,158,11,0.15)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]'
              }`}>
                {aiAnalysis.signal === 'ACHAT' ? '📈 ACHAT' : aiAnalysis.signal === 'VENTE' ? '📉 VENTE' : '⏸ NEUTRE'}
              </div>
            </div>

            {/* Indicators grid */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-[rgba(0,0,0,0.03)] rounded-lg p-2 text-center border border-[rgba(0,0,0,0.04)]">
                <div className="text-[0.5rem] text-[rgba(0,0,0,0.4)] font-semibold uppercase mb-0.5">RSI</div>
                <div className={`text-[0.85rem] font-black ${aiAnalysis.rsi > 70 ? 'text-[#EF4444]' : aiAnalysis.rsi < 30 ? 'text-[#22C55E]' : 'text-[#1F2937]'}`}>{aiAnalysis.rsi}</div>
              </div>
              <div className="bg-[rgba(0,0,0,0.03)] rounded-lg p-2 text-center border border-[rgba(0,0,0,0.04)]">
                <div className="text-[0.5rem] text-[rgba(0,0,0,0.4)] font-semibold uppercase mb-0.5">MACD</div>
                <div className={`text-[0.7rem] font-bold ${aiAnalysis.macd === 'Haussier' ? 'text-[#22C55E]' : aiAnalysis.macd === 'Baissier' ? 'text-[#EF4444]' : 'text-[rgba(0,0,0,0.6)]'}`}>{aiAnalysis.macd}</div>
              </div>
              <div className="bg-[rgba(0,0,0,0.03)] rounded-lg p-2 text-center border border-[rgba(0,0,0,0.04)]">
                <div className="text-[0.5rem] text-[rgba(0,0,0,0.4)] font-semibold uppercase mb-0.5">MA 20</div>
                <div className={`text-[0.65rem] font-bold ${aiAnalysis.ma === 'Au-dessus MA20' ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>{aiAnalysis.ma === 'Au-dessus MA20' ? '↑ Au-dessus' : '↓ En-dessous'}</div>
              </div>
              <div className="bg-[rgba(0,0,0,0.03)] rounded-lg p-2 text-center border border-[rgba(0,0,0,0.04)]">
                <div className="text-[0.5rem] text-[rgba(0,0,0,0.4)] font-semibold uppercase mb-0.5">Confiance</div>
                <div className="text-[0.85rem] font-black text-[#8B5CF6]">{aiAnalysis.confidence}%</div>
              </div>
            </div>

            {/* Sentiment bar */}
            <div className="mb-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[0.6rem] text-[rgba(0,0,0,0.4)] font-semibold">Sentiment du marché</span>
                <span className={`text-[0.6rem] font-bold ${aiAnalysis.sentiment === 'Bullish' ? 'text-[#22C55E]' : aiAnalysis.sentiment === 'Bearish' ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>{aiAnalysis.sentiment}</span>
              </div>
              <div className="w-full h-[6px] bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${aiAnalysis.confidence}%`,
                    background: aiAnalysis.sentiment === 'Bullish' ? 'linear-gradient(90deg, #22C55E, #4ADE80)' : aiAnalysis.sentiment === 'Bearish' ? 'linear-gradient(90deg, #EF4444, #F87171)' : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                  }}
                />
              </div>
            </div>

            {/* AI Advice */}
            <div className="bg-[rgba(139,92,246,0.06)] rounded-lg p-2.5 border border-[rgba(139,92,246,0.1)]">
              <div className="flex items-start gap-2">
                <i className="fas fa-robot text-[0.7rem] text-[#8B5CF6] mt-0.5"></i>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.65)] leading-relaxed">{aiAnalysis.advice}</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== TRADE FORM ===== */}
        <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 rounded-full" style={{ background: market.color }}></div>
              <h4 className="text-[0.85rem] font-bold text-[#1F2937]">Nouveau trade</h4>
            </div>
            <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.04)] rounded-lg px-2.5 py-1">
              <i className={`fas ${market.icon} text-[0.6rem]`} style={{ color: market.color }}></i>
              <span className="text-[0.65rem] font-bold text-[#1F2937]">{market.pair}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="relative mb-3">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[0.75rem] font-bold text-[rgba(0,0,0,0.4)]">$</div>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="1 - 5"
              className="w-full py-3 pl-8 pr-4 bg-[rgba(0,0,0,0.04)] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1rem] font-semibold outline-none focus:border-[#8B5CF6] focus:ring-[3px] focus:ring-[rgba(139,92,246,0.1)] transition-all text-[#1F2937] placeholder:text-[rgba(0,0,0,0.3)]"
            />
          </div>

          {/* Direction */}
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            <button onClick={() => setDirection('up')} className={`py-3.5 rounded-xl font-bold text-[0.92rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${direction === 'up' ? 'bg-[rgba(34,197,94,0.15)] text-[#22C55E] ring-2 ring-[rgba(34,197,94,0.15)]' : 'bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]'}`}>
              <i className="fas fa-arrow-trend-up text-[1rem]"></i>
              <span>HAUT</span>
            </button>
            <button onClick={() => setDirection('down')} className={`py-3.5 rounded-xl font-bold text-[0.92rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${direction === 'down' ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444] ring-2 ring-[rgba(239,68,68,0.15)]' : 'bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]'}`}>
              <i className="fas fa-arrow-trend-down text-[1rem]"></i>
              <span>BAS</span>
            </button>
          </div>

          {/* Duration */}
          <div className="mb-3">
            <div className="text-[0.65rem] font-semibold text-[rgba(0,0,0,0.45)] uppercase tracking-[0.5px] mb-1.5">Durée</div>
            <div className="grid grid-cols-4 gap-1.5">
              {durations.map((d) => (
                <button key={d.sec} onClick={() => setDuration(d.sec)} className={`py-2 rounded-xl text-[0.75rem] font-semibold border-none cursor-pointer transition-all active:scale-[0.97] ${duration === d.sec ? 'text-white' : 'bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]'}`} style={duration === d.sec ? { background: market.color } : {}}>{d.label}</button>
              ))}
            </div>
          </div>

          {/* Gain/Loss info */}
          <div className="flex items-center justify-center gap-3 mb-3 py-2 bg-[rgba(0,0,0,0.03)] rounded-xl border border-[rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]"></div>
              <span className="text-[0.68rem] font-semibold text-[#22C55E]">Gain: +{winPercent}%</span>
            </div>
            <div className="w-[1px] h-3 bg-[rgba(0,0,0,0.1)]"></div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#EF4444]"></div>
              <span className="text-[0.68rem] font-semibold text-[#EF4444]">Perte: -100%</span>
            </div>
          </div>

          {/* Launch button */}
          <button onClick={handleCreateTrade} disabled={creating} className="w-full py-3.5 rounded-xl text-white font-bold text-[0.92rem] border-none cursor-pointer disabled:opacity-60 transition-all active:scale-[0.97] flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,0,0,0.12)]" style={{ background: `linear-gradient(135deg, ${market.color}, ${market.color}dd)` }}>
            <i className="fas fa-bolt"></i>
            <span>{creating ? 'Chargement...' : `Trader ${market.pair}`}</span>
          </button>
        </div>

        {/* ===== BALANCE QUICK VIEW ===== */}
        <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[rgba(248,113,113,0.12)] flex items-center justify-center">
              <i className="fas fa-bolt text-[0.85rem] text-[#F87171]"></i>
            </div>
            <div>
              <div className="text-[0.6rem] text-[rgba(0,0,0,0.4)] font-semibold uppercase tracking-[1px]">Solde Trading</div>
              <div className="text-[1.1rem] font-black text-[#1F2937]">{formatMoney(user.tradeBalance)}</div>
            </div>
          </div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#8B5CF6] bg-[rgba(139,92,246,0.1)] hover:bg-[rgba(139,92,246,0.15)] transition-colors py-2 px-3 rounded-xl border border-[rgba(139,92,246,0.15)]">
            <i className="fas fa-plus text-[0.6rem]"></i>Verser
          </button>
        </div>

        {/* ===== ACTIVE TRADES ===== */}
        {activeTrades.filter(t => !t.resolved).length > 0 && (
          <>
            <h3 className="text-[0.85rem] font-bold text-[#1F2937] mb-2">Trades en cours</h3>
            {activeTrades.filter(t => !t.resolved).map((trade) => {
              const remaining = new Date(trade.endsAt).getTime() - now;
              const totalDuration = trade.durationSec * 1000;
              const elapsed = totalDuration - remaining;
              const progress = Math.min(1, elapsed / totalDuration);
              const mins = Math.max(0, Math.floor(remaining / 60000));
              const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));
              const isUp = trade.direction === 'up';
              const tradeMarket = MARKETS.find(m => m.id === (trade.asset || 'BTC')) || MARKETS[0];
              const lineColor = isUp ? '#22C55E' : '#EF4444';
              const tradePriceData = prices[tradeMarket.id];
              const tradeHist = tradePriceData ? tradePriceData.history.slice(-30) : [];

              return (
                <div key={trade.id} className="trade-card-glow bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3.5 mb-2.5 slide-right">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: tradeMarket.bg }}>
                        <i className={`fas ${tradeMarket.icon} text-[0.75rem]`} style={{ color: tradeMarket.color }}></i>
                      </div>
                      <div>
                        <div className="text-[0.8rem] font-bold text-[#1F2937] flex items-center gap-1.5">
                          {tradeMarket.pair}
                          <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]' : 'bg-[rgba(239,68,68,0.12)] text-[#EF4444]'}`}>
                            {isUp ? '↑ HAUT' : '↓ BAS'}
                          </span>
                          <span className="live-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: lineColor }}></span>
                        </div>
                        <div className="text-[0.62rem] text-[rgba(0,0,0,0.5)]">{formatMoney(trade.amount)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[0.55rem] text-[rgba(0,0,0,0.4)] uppercase">Restant</div>
                      <div className="text-[1.2rem] font-mono font-black text-[#1F2937]">
                        {mins}<span className="timer-colon-blink">:</span>{secs.toString().padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  {/* Live mini chart */}
                  {tradeHist.length > 2 && (
                    <div className="h-[50px] mb-2 rounded-lg bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.04)] overflow-hidden">
                      <MiniChart history={tradeHist} color={lineColor} width={300} height={50} />
                    </div>
                  )}

                  {/* Progress */}
                  <div className="w-full h-[3px] bg-[rgba(0,0,0,0.06)] rounded-full">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${progress * 100}%`, background: `linear-gradient(90deg, ${tradeMarket.color}, ${lineColor})` }}></div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* No active trades */}
        {activeTrades.filter(t => !t.resolved).length === 0 && (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-[rgba(139,92,246,0.1)] flex items-center justify-center mx-auto mb-3">
              <i className="fas fa-chart-area text-[1.3rem] text-[#8B5CF6]"></i>
            </div>
            <p className="text-[0.82rem] text-[rgba(0,0,0,0.6)] font-medium">Aucun trade actif</p>
            <p className="text-[0.68rem] text-[rgba(0,0,0,0.4)]">Choisissez un marché et lancez un trade !</p>
          </div>
        )}
      </div>
    </>
  );
}
