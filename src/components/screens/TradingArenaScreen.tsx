'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, formatMoney, esc, authFetch, refreshUser } from '@/lib/store';
import { Header } from '@/components/shared';

// ==================== CONSTANTS ====================
const ASSETS = [
  { id: 'EUR/USD', label: 'EUR/USD', icon: 'fa-euro-sign', base: 1.085, vol: 0.008, dec: 5 },
  { id: 'GBP/USD', label: 'GBP/USD', icon: 'fa-sterling-sign', base: 1.27, vol: 0.012, dec: 5 },
  { id: 'BTC/USD', label: 'BTC/USD', icon: 'fa-bitcoin-sign', base: 67500, vol: 800, dec: 2 },
  { id: 'ETH/USD', label: 'ETH/USD', icon: 'fa-ethereum', base: 3450, vol: 120, dec: 2 },
  { id: 'GOLD/USD', label: 'GOLD/USD', icon: 'fa-coins', base: 2340, vol: 35, dec: 2 },
  { id: 'SILVER/USD', label: 'SILVER/USD', icon: 'fa-gem', base: 29.5, vol: 0.8, dec: 4 },
] as const;

const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1D'] as const;
const QUICK_AMOUNTS = [1, 5, 10, 25];
const MIN_BALANCE = 5;
const MIN_AMOUNT = 1;

// ==================== COLORS ====================
const C = {
  bg: '#0d1117',
  card: '#161b22',
  border: '#30363d',
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  green: '#3fb950',
  red: '#f85149',
  accent: '#58a6ff',
  purple: '#bc8cff',
  greenBg: 'rgba(63,185,80,0.15)',
  redBg: 'rgba(248,81,73,0.15)',
  greenBorder: 'rgba(63,185,80,0.3)',
  redBorder: 'rgba(248,81,73,0.3)',
};

// ==================== TYPES ====================
interface PriceData {
  asset: string;
  price: number;
  basePrice: number;
  change: number;
  changePercent: number;
  decimals: number;
}

interface Position {
  id: string;
  asset: string;
  direction: string;
  amount: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  profitLoss: number;
  plPercent: number;
  status: string;
  openedAt: string;
}

interface HistoryPosition {
  id: string;
  asset: string;
  direction: string;
  amount: number;
  entryPrice: number;
  closePrice: number | null;
  profitLoss: number;
  plPercent: number;
  result: string;
  closeReason: string;
  openedAt: string;
  closedAt: string | null;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  totalProfit: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ==================== CANDLESTICK CHART ====================
function CandlestickChart({
  candles,
  width,
  height,
}: {
  candles: Candle[];
  width: number;
  height: number;
}) {
  if (candles.length === 0) return null;

  const pad = { top: 20, right: 55, bottom: 25, left: 8 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const allHighs = candles.map((c) => c.high);
  const allLows = candles.map((c) => c.low);
  const maxPrice = Math.max(...allHighs);
  const minPrice = Math.min(...allLows);
  const priceRange = maxPrice - minPrice || 1;
  const pricePad = priceRange * 0.08;
  const yMax = maxPrice + pricePad;
  const yMin = minPrice - pricePad;
  const yRange = yMax - yMin;

  const candleSpacing = chartW / candles.length;
  const candleWidth = Math.max(2, candleSpacing * 0.65);
  const wickWidth = Math.max(1, candleWidth * 0.15);

  const toX = (i: number) => pad.left + i * candleSpacing + candleSpacing / 2;
  const toY = (price: number) => pad.top + (1 - (price - yMin) / yRange) * chartH;

  // Grid lines
  const gridCount = 5;
  const gridPrices = Array.from({ length: gridCount }, (_, i) => yMin + (yRange * i) / (gridCount - 1));

  // Determine decimals from price magnitude
  const decimals = maxPrice > 100 ? 2 : maxPrice > 10 ? 3 : 5;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {/* Grid lines */}
      {gridPrices.map((price, i) => {
        const y = toY(price);
        return (
          <g key={i}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={C.border} strokeWidth="0.5" strokeDasharray="3,3" />
            <text x={width - pad.right + 5} y={y + 3} fontSize="8" fill={C.textSecondary} fontFamily="monospace">
              {price.toFixed(decimals)}
            </text>
          </g>
        );
      })}

      {/* Candles */}
      {candles.map((candle, i) => {
        const isUp = candle.close >= candle.open;
        const color = isUp ? C.green : C.red;
        const cx = toX(i);
        const bodyTop = toY(Math.max(candle.open, candle.close));
        const bodyBottom = toY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        const wickTop = toY(candle.high);
        const wickBottom = toY(candle.low);

        return (
          <g key={i}>
            {/* Wick */}
            <line x1={cx} y1={wickTop} x2={cx} y2={wickBottom} stroke={color} strokeWidth={wickWidth} />
            {/* Body */}
            <rect
              x={cx - candleWidth / 2}
              y={bodyTop}
              width={candleWidth}
              height={bodyHeight}
              fill={isUp ? color : color}
              stroke={color}
              strokeWidth="0.5"
              rx="0.5"
              opacity={isUp ? 0.95 : 0.85}
            />
          </g>
        );
      })}
    </svg>
  );
}

// ==================== MAIN COMPONENT ====================
export default function TradingArenaScreen() {
  const { user, addToast } = useAppStore();
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState<string>('5m');
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentClosed, setRecentClosed] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'leaderboard'>('positions');
  const [positionsCollapsed, setPositionsCollapsed] = useState(false);

  // History state
  const [historyTrades, setHistoryTrades] = useState<HistoryPosition[]>([]);
  const [historySummary, setHistorySummary] = useState({ totalTrades: 0, winCount: 0, lossCount: 0, totalPL: 0 });
  const [historyPage, setHistoryPage] = useState(1);

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Insufficient balance modal
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);

  // Chart width tracking
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(340);
  const chartHeight = 260;

  // Price animation key
  const [priceTick, setPriceTick] = useState(0);

  // Observe chart width
  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChartWidth(Math.floor(entry.contentRect.width));
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // ===== FETCH PRICES (every 3s) =====
  const fetchPrices = useCallback(async () => {
    try {
      const res = await authFetch('/api/trading/prices');
      const data = await res.json();
      if (data.success) {
        setPrices(data.prices);
        setPriceTick((t) => t + 1);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchPrices, 0);
    const iv = setInterval(fetchPrices, 3000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [fetchPrices]);

  // ===== FETCH CHART =====
  const fetchChart = useCallback(async () => {
    try {
      const res = await authFetch(`/api/trading/chart?asset=${encodeURIComponent(selectedAsset)}&timeframe=${timeframe}&count=60`);
      const data = await res.json();
      if (data.success) {
        setCandles(data.candles || []);
      }
    } catch { /* */ }
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    const t = setTimeout(fetchChart, 0);
    const iv = setInterval(fetchChart, 10000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [fetchChart]);

  // ===== FETCH POSITIONS (every 5s) =====
  const fetchPositions = useCallback(async () => {
    try {
      const res = await authFetch('/api/trading/positions');
      const data = await res.json();
      if (data.success) {
        setPositions(data.openPositions || []);
        setRecentClosed(data.recentClosed || []);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchPositions, 0);
    const iv = setInterval(fetchPositions, 5000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [fetchPositions]);

  // ===== FETCH HISTORY =====
  const fetchHistory = useCallback(async (page: number = 1) => {
    try {
      const res = await authFetch(`/api/trading/history?page=${page}`);
      const data = await res.json();
      if (data.success) {
        setHistoryTrades(data.positions || []);
        setHistorySummary(data.summary || { totalTrades: 0, winCount: 0, lossCount: 0, totalPL: 0 });
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'history') setTimeout(() => fetchHistory(historyPage), 0);
  }, [activeTab, historyPage, fetchHistory]);

  // ===== FETCH LEADERBOARD =====
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await authFetch('/api/trading/leaderboard');
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') setTimeout(fetchLeaderboard, 0);
  }, [activeTab, fetchLeaderboard]);

  // ===== OPEN POSITION =====
  const handleOpenPosition = async (direction: 'BUY' | 'SELL') => {
    if (!user) return;
    if (user.tradeBalance < MIN_BALANCE) {
      setShowInsufficientModal(true);
      return;
    }
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_AMOUNT) {
      addToast(`Montant minimum: $${MIN_AMOUNT}`, 'error');
      return;
    }
    if (amt > user.tradeBalance) {
      addToast('Solde insuffisant', 'error');
      return;
    }
    setOpening(true);
    try {
      const body: any = { asset: selectedAsset, direction, amount: amt };
      if (stopLoss) body.stopLoss = parseFloat(stopLoss);
      if (takeProfit) body.takeProfit = parseFloat(takeProfit);

      const res = await authFetch('/api/trading/open-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Position ${direction} ouverte !`, 'success');
        setAmount('');
        setStopLoss('');
        setTakeProfit('');
        fetchPositions();
        refreshUser();
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setOpening(false);
  };

  // ===== CLOSE POSITION =====
  const handleClosePosition = async (positionId: string) => {
    setClosing(positionId);
    try {
      const res = await authFetch('/api/trading/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId }),
      });
      const data = await res.json();
      if (data.success) {
        const pl = data.position?.profitLoss || 0;
        addToast(
          pl >= 0 ? `Position fermée: +${formatMoney(pl)}` : `Position fermée: ${formatMoney(pl)}`,
          pl >= 0 ? 'success' : 'error'
        );
        fetchPositions();
        refreshUser();
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setClosing(null);
  };

  // ===== HELPERS =====
  const getCurrentPrice = (assetId: string): PriceData | undefined => {
    return prices.find((p) => p.asset === assetId);
  };

  const getAssetInfo = (assetId: string) => {
    return ASSETS.find((a) => a.id === assetId) || ASSETS[0];
  };

  const formatPrice = (price: number, assetId: string): string => {
    const info = getAssetInfo(assetId);
    return price.toFixed(info.dec);
  };

  if (!user) return null;

  const currentPriceData = getCurrentPrice(selectedAsset);
  const tradeBalance = user.tradeBalance || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const potentialGain = parsedAmount * 0.8; // ~80% potential gain
  const potentialLoss = parsedAmount; // 100% loss

  return (
    <>
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @keyframes glow-green {
          0%, 100% { text-shadow: 0 0 4px rgba(63,185,80,0.4); }
          50% { text-shadow: 0 0 12px rgba(63,185,80,0.8); }
        }
        @keyframes glow-red {
          0%, 100% { text-shadow: 0 0 4px rgba(248,81,73,0.4); }
          50% { text-shadow: 0 0 12px rgba(248,81,73,0.8); }
        }
        @keyframes price-flash-up {
          0% { background: rgba(63,185,80,0.25); }
          100% { background: transparent; }
        }
        @keyframes price-flash-down {
          0% { background: rgba(248,81,73,0.25); }
          100% { background: transparent; }
        }
        .live-pulse { animation: pulse-live 1.2s ease-in-out infinite; }
        .glow-green { animation: glow-green 2s ease-in-out infinite; }
        .glow-red { animation: glow-red 2s ease-in-out infinite; }
        .scrollbar-dark::-webkit-scrollbar { width: 4px; height: 4px; }
        .scrollbar-dark::-webkit-scrollbar-track { background: ${C.card}; }
        .scrollbar-dark::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        .scrollbar-dark::-webkit-scrollbar-thumb:hover { background: ${C.textSecondary}; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* ===== TOP HEADER ===== */}
      <header
        className="h-[56px] flex items-center justify-between px-4 sticky top-0 z-20 shrink-0"
        style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => useAppStore.getState().setPage('home')}
            className="w-8 h-8 rounded-lg flex items-center justify-center border-none cursor-pointer transition-transform active:scale-90"
            style={{ background: 'rgba(255,255,255,0.06)', color: C.textSecondary }}
          >
            <i className="fas fa-arrow-left text-[0.75rem]"></i>
          </button>
          <div className="flex items-center gap-2">
            <i className="fas fa-chart-candlestick text-[0.85rem]" style={{ color: C.accent }}></i>
            <span className="text-[0.95rem] font-black" style={{ color: C.textPrimary }}>
              Trading Arena
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-1">
            <div className="text-[0.55rem] uppercase tracking-wider font-semibold" style={{ color: C.textSecondary }}>
              Solde Trading
            </div>
            <div className="text-[0.85rem] font-bold font-mono" style={{ color: C.accent }}>
              {formatMoney(tradeBalance)}
            </div>
          </div>
          <button
            onClick={() => useAppStore.getState().setPage('wallet')}
            className="px-3 py-1.5 rounded-lg text-[0.65rem] font-bold border-none cursor-pointer transition-transform active:scale-95"
            style={{ background: 'rgba(88,166,255,0.15)', color: C.accent, border: `1px solid rgba(88,166,255,0.3)` }}
          >
            <i className="fas fa-plus mr-1 text-[0.55rem]"></i>Verser
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div
        className="flex-1 w-full overflow-y-auto min-h-0 scrollbar-dark"
        style={{ background: C.bg }}
      >
        {/* ===== ASSET SELECTOR ===== */}
        <div
          className="flex gap-2 px-3 py-2.5 overflow-x-auto scrollbar-dark"
          style={{ borderBottom: `1px solid ${C.border}`, scrollbarWidth: 'none' }}
        >
          {ASSETS.map((asset) => {
            const pd = getCurrentPrice(asset.id);
            const isSelected = selectedAsset === asset.id;
            const changePercent = pd?.changePercent || 0;
            const isUp = changePercent >= 0;

            return (
              <button
                key={asset.id}
                onClick={() => setSelectedAsset(asset.id)}
                className="shrink-0 rounded-lg p-2 border-none cursor-pointer transition-all active:scale-95 min-w-[88px]"
                style={{
                  background: isSelected ? 'rgba(88,166,255,0.12)' : C.card,
                  border: isSelected ? `1px solid rgba(88,166,255,0.3)` : `1px solid ${C.border}`,
                }}
              >
                <div className="flex items-center gap-1 mb-1">
                  <i className={`fas ${asset.icon} text-[0.55rem]`} style={{ color: isSelected ? C.accent : C.textSecondary }}></i>
                  <span
                    className="text-[0.6rem] font-bold"
                    style={{ color: isSelected ? C.textPrimary : C.textSecondary }}
                  >
                    {asset.label}
                  </span>
                </div>
                <div className="text-[0.72rem] font-mono font-bold" style={{ color: C.textPrimary }}>
                  {pd ? formatPrice(pd.price, asset.id) : '—'}
                </div>
                <div
                  className="text-[0.55rem] font-bold"
                  style={{ color: isUp ? C.green : C.red }}
                >
                  {isUp ? '▲' : '▼'} {Math.abs(changePercent).toFixed(2)}%
                </div>
              </button>
            );
          })}
        </div>

        {/* ===== CHART AREA ===== */}
        <div
          className="mx-3 mt-2.5 rounded-xl overflow-hidden relative"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {/* Price Header */}
          <div className="flex items-center justify-between px-3 pt-3 pb-1">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[0.85rem] font-bold" style={{ color: C.textPrimary }}>
                  {selectedAsset}
                </span>
                <div
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(248,81,73,0.15)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full live-pulse" style={{ background: C.red }}></div>
                  <span className="text-[0.5rem] font-bold" style={{ color: C.red }}>
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span
                  className="text-[1.35rem] font-mono font-black"
                  style={{
                    color: (currentPriceData?.changePercent || 0) >= 0 ? C.green : C.red,
                  }}
                >
                  {currentPriceData ? formatPrice(currentPriceData.price, selectedAsset) : '—'}
                </span>
                <span
                  className="text-[0.7rem] font-bold"
                  style={{
                    color: (currentPriceData?.changePercent || 0) >= 0 ? C.green : C.red,
                  }}
                >
                  {(currentPriceData?.changePercent || 0) >= 0 ? '+' : ''}
                  {(currentPriceData?.changePercent || 0).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-1 px-3 pb-2">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className="px-2 py-1 rounded text-[0.6rem] font-bold border-none cursor-pointer transition-all active:scale-95"
                style={{
                  background: timeframe === tf ? 'rgba(88,166,255,0.15)' : 'transparent',
                  color: timeframe === tf ? C.accent : C.textSecondary,
                  border: timeframe === tf ? '1px solid rgba(88,166,255,0.3)' : '1px solid transparent',
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Candlestick Chart */}
          <div ref={chartRef} className="px-1 pb-2 overflow-hidden">
            <CandlestickChart candles={candles} width={chartWidth - 8} height={chartHeight} />
          </div>
        </div>

        {/* ===== OPEN POSITIONS (collapsible) ===== */}
        {positions.length > 0 && (
          <div
            className="mx-3 mt-2.5 rounded-xl overflow-hidden"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <button
              onClick={() => setPositionsCollapsed(!positionsCollapsed)}
              className="w-full flex items-center justify-between px-3 py-2.5 border-none cursor-pointer"
              style={{ background: 'transparent' }}
            >
              <div className="flex items-center gap-2">
                <i className="fas fa-layer-group text-[0.65rem]" style={{ color: C.accent }}></i>
                <span className="text-[0.75rem] font-bold" style={{ color: C.textPrimary }}>
                  Positions ouvertes
                </span>
                <span
                  className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(88,166,255,0.15)', color: C.accent }}
                >
                  {positions.length}
                </span>
              </div>
              <i
                className={`fas fa-chevron-${positionsCollapsed ? 'down' : 'up'} text-[0.6rem]`}
                style={{ color: C.textSecondary }}
              ></i>
            </button>

            {!positionsCollapsed && (
              <div className="px-3 pb-3 max-h-64 overflow-y-auto scrollbar-dark">
                {positions.map((pos) => {
                  const isBuy = pos.direction === 'BUY';
                  const isProfit = pos.profitLoss >= 0;
                  return (
                    <div
                      key={pos.id}
                      className="flex items-center justify-between py-2 border-b last:border-b-0"
                      style={{ borderColor: C.border }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="px-1.5 py-0.5 rounded text-[0.55rem] font-black"
                          style={{
                            background: isBuy ? C.greenBg : C.redBg,
                            color: isBuy ? C.green : C.red,
                            border: `1px solid ${isBuy ? C.greenBorder : C.redBorder}`,
                          }}
                        >
                          {isBuy ? 'BUY' : 'SELL'}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="text-[0.7rem] font-bold truncate"
                            style={{ color: C.textPrimary }}
                          >
                            {pos.asset}
                          </div>
                          <div className="text-[0.55rem]" style={{ color: C.textSecondary }}>
                            {formatMoney(pos.amount)} @ {formatPrice(pos.entryPrice, pos.asset)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div
                            className={`text-[0.75rem] font-bold font-mono ${isProfit ? 'glow-green' : 'glow-red'}`}
                            style={{ color: isProfit ? C.green : C.red }}
                          >
                            {isProfit ? '+' : ''}{formatMoney(pos.profitLoss)}
                          </div>
                          <div
                            className="text-[0.55rem] font-semibold"
                            style={{ color: isProfit ? C.green : C.red }}
                          >
                            {isProfit ? '+' : ''}{pos.plPercent.toFixed(2)}%
                          </div>
                        </div>
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          disabled={closing === pos.id}
                          className="w-7 h-7 rounded-md flex items-center justify-center border-none cursor-pointer transition-transform active:scale-90 disabled:opacity-50"
                          style={{ background: C.redBg, color: C.red }}
                        >
                          {closing === pos.id ? (
                            <div
                              className="w-3 h-3 border-[1.5px] rounded-full"
                              style={{
                                borderColor: 'rgba(248,81,73,0.3)',
                                borderTopColor: C.red,
                                animation: 'spin 0.6s linear infinite',
                              }}
                            ></div>
                          ) : (
                            <i className="fas fa-times text-[0.6rem]"></i>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ===== TRADING PANEL ===== */}
        <div
          className="mx-3 mt-2.5 rounded-xl p-3"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full" style={{ background: C.accent }}></div>
            <span className="text-[0.8rem] font-bold" style={{ color: C.textPrimary }}>
              Nouvel ordre
            </span>
            <span className="text-[0.6rem] font-mono" style={{ color: C.textSecondary }}>
              {selectedAsset}
            </span>
          </div>

          {/* Amount Input */}
          <div className="mb-2.5">
            <label className="text-[0.6rem] font-semibold uppercase tracking-wider mb-1 block" style={{ color: C.textSecondary }}>
              Montant
            </label>
            <div className="relative">
              <div
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[0.8rem] font-bold"
                style={{ color: C.textSecondary }}
              >
                $
              </div>
              <input
                type="number"
                step="0.01"
                min={MIN_AMOUNT}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${MIN_AMOUNT}`}
                className="w-full py-2.5 pl-7 pr-4 rounded-lg text-[0.95rem] font-semibold outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${C.border}`,
                  color: C.textPrimary,
                }}
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {QUICK_AMOUNTS.map((qa) => (
              <button
                key={qa}
                onClick={() => setAmount(String(qa))}
                className="py-1.5 rounded-lg text-[0.7rem] font-bold border-none cursor-pointer transition-all active:scale-95"
                style={{
                  background: parseFloat(amount) === qa ? 'rgba(88,166,255,0.15)' : 'rgba(255,255,255,0.04)',
                  color: parseFloat(amount) === qa ? C.accent : C.textSecondary,
                  border: `1px solid ${parseFloat(amount) === qa ? 'rgba(88,166,255,0.3)' : C.border}`,
                }}
              >
                ${qa}
              </button>
            ))}
          </div>

          {/* Stop Loss / Take Profit Row */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[0.55rem] font-semibold uppercase tracking-wider mb-1 block" style={{ color: C.textSecondary }}>
                Stop Loss (%)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="50"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Optionnel"
                className="w-full py-2 px-3 rounded-lg text-[0.8rem] font-semibold outline-none transition-all"
                style={{
                  background: 'rgba(248,81,73,0.06)',
                  border: `1px solid rgba(248,81,73,0.15)`,
                  color: C.textPrimary,
                }}
              />
            </div>
            <div>
              <label className="text-[0.55rem] font-semibold uppercase tracking-wider mb-1 block" style={{ color: C.textSecondary }}>
                Take Profit (%)
              </label>
              <input
                type="number"
                step="1"
                min="1"
                max="200"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder="Optionnel"
                className="w-full py-2 px-3 rounded-lg text-[0.8rem] font-semibold outline-none transition-all"
                style={{
                  background: 'rgba(63,185,80,0.06)',
                  border: `1px solid rgba(63,185,80,0.15)`,
                  color: C.textPrimary,
                }}
              />
            </div>
          </div>

          {/* Potential Gain/Loss */}
          {parsedAmount > 0 && (
            <div
              className="flex items-center justify-center gap-4 mb-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: C.green }}></div>
                <span className="text-[0.65rem] font-semibold" style={{ color: C.green }}>
                  Gain: +{formatMoney(potentialGain)}
                </span>
              </div>
              <div
                className="w-px h-3"
                style={{ background: C.border }}
              ></div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: C.red }}></div>
                <span className="text-[0.65rem] font-semibold" style={{ color: C.red }}>
                  Perte: -{formatMoney(potentialLoss)}
                </span>
              </div>
            </div>
          )}

          {/* BUY / SELL Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleOpenPosition('BUY')}
              disabled={opening}
              className="py-3.5 rounded-xl text-[0.9rem] font-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${C.green}, #2ea043)`,
                color: '#0d1117',
                boxShadow: `0 4px 16px rgba(63,185,80,0.25)`,
              }}
            >
              {opening ? (
                <div
                  className="w-4 h-4 border-2 rounded-full"
                  style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#0d1117', animation: 'spin 0.6s linear infinite' }}
                ></div>
              ) : (
                <>
                  <i className="fas fa-arrow-trend-up text-[0.8rem]"></i>
                  BUY
                </>
              )}
            </button>
            <button
              onClick={() => handleOpenPosition('SELL')}
              disabled={opening}
              className="py-3.5 rounded-xl text-[0.9rem] font-black border-none cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${C.red}, #da3633)`,
                color: '#0d1117',
                boxShadow: `0 4px 16px rgba(248,81,73,0.25)`,
              }}
            >
              {opening ? (
                <div
                  className="w-4 h-4 border-2 rounded-full"
                  style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#0d1117', animation: 'spin 0.6s linear infinite' }}
                ></div>
              ) : (
                <>
                  <i className="fas fa-arrow-trend-down text-[0.8rem]"></i>
                  SELL
                </>
              )}
            </button>
          </div>
        </div>

        {/* ===== BOTTOM TABS ===== */}
        <div
          className="mx-3 mt-2.5 mb-4 rounded-xl overflow-hidden"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          {/* Tab Headers */}
          <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
            {[
              { key: 'positions' as const, label: 'Positions', icon: 'fa-layer-group' },
              { key: 'history' as const, label: 'Historique', icon: 'fa-clock-rotate-left' },
              { key: 'leaderboard' as const, label: 'Classement', icon: 'fa-trophy' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 py-2.5 flex items-center justify-center gap-1.5 border-none cursor-pointer transition-all"
                style={{
                  background: activeTab === tab.key ? 'rgba(88,166,255,0.08)' : 'transparent',
                  borderBottom: activeTab === tab.key ? `2px solid ${C.accent}` : '2px solid transparent',
                }}
              >
                <i
                  className={`fas ${tab.icon} text-[0.6rem]`}
                  style={{ color: activeTab === tab.key ? C.accent : C.textSecondary }}
                ></i>
                <span
                  className="text-[0.65rem] font-bold"
                  style={{ color: activeTab === tab.key ? C.accent : C.textSecondary }}
                >
                  {tab.label}
                </span>
                {tab.key === 'positions' && positions.length > 0 && (
                  <span
                    className="text-[0.5rem] font-bold px-1 py-0.5 rounded"
                    style={{ background: 'rgba(88,166,255,0.15)', color: C.accent }}
                  >
                    {positions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-3 max-h-72 overflow-y-auto scrollbar-dark">
            {/* ===== POSITIONS TAB ===== */}
            {activeTab === 'positions' && (
              <>
                {positions.length === 0 && recentClosed.length === 0 && (
                  <div className="text-center py-6">
                    <div
                      className="w-12 h-12 rounded-xl mx-auto mb-2 flex items-center justify-center"
                      style={{ background: 'rgba(88,166,255,0.1)' }}
                    >
                      <i className="fas fa-chart-line text-[1rem]" style={{ color: C.accent }}></i>
                    </div>
                    <p className="text-[0.75rem]" style={{ color: C.textSecondary }}>
                      Aucune position ouverte
                    </p>
                    <p className="text-[0.6rem] mt-1" style={{ color: C.textSecondary }}>
                      Placez un ordre BUY ou SELL pour commencer
                    </p>
                  </div>
                )}
                {positions.map((pos) => {
                  const isBuy = pos.direction === 'BUY';
                  const isProfit = pos.profitLoss >= 0;
                  return (
                    <div
                      key={pos.id}
                      className="flex items-center justify-between py-2.5 border-b last:border-b-0"
                      style={{ borderColor: C.border }}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className="px-1.5 py-0.5 rounded text-[0.55rem] font-black"
                          style={{
                            background: isBuy ? C.greenBg : C.redBg,
                            color: isBuy ? C.green : C.red,
                          }}
                        >
                          {isBuy ? 'BUY' : 'SELL'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[0.72rem] font-bold truncate" style={{ color: C.textPrimary }}>
                            {pos.asset}
                          </div>
                          <div className="text-[0.55rem]" style={{ color: C.textSecondary }}>
                            {formatMoney(pos.amount)} @ {formatPrice(pos.entryPrice, pos.asset)}
                          </div>
                          {pos.stopLoss && (
                            <div className="text-[0.5rem]" style={{ color: C.red }}>
                              SL: -{pos.stopLoss}%
                            </div>
                          )}
                          {pos.takeProfit && (
                            <div className="text-[0.5rem]" style={{ color: C.green }}>
                              TP: +{pos.takeProfit}%
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div
                            className={`text-[0.78rem] font-bold font-mono ${isProfit ? 'glow-green' : 'glow-red'}`}
                            style={{ color: isProfit ? C.green : C.red }}
                          >
                            {isProfit ? '+' : ''}{formatMoney(pos.profitLoss)}
                          </div>
                          <div
                            className="text-[0.55rem] font-semibold"
                            style={{ color: isProfit ? C.green : C.red }}
                          >
                            {isProfit ? '+' : ''}{pos.plPercent.toFixed(2)}%
                          </div>
                        </div>
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          disabled={closing === pos.id}
                          className="px-2 py-1 rounded-lg text-[0.6rem] font-bold border-none cursor-pointer transition-all active:scale-90 disabled:opacity-50"
                          style={{ background: C.redBg, color: C.red, border: `1px solid ${C.redBorder}` }}
                        >
                          {closing === pos.id ? '...' : 'Fermer'}
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Recent Closed (in positions tab) */}
                {recentClosed.length > 0 && positions.length > 0 && (
                  <div className="mt-3 pt-2" style={{ borderTop: `1px solid ${C.border}` }}>
                    <div className="text-[0.6rem] font-semibold uppercase tracking-wider mb-2" style={{ color: C.textSecondary }}>
                      Récemment fermées
                    </div>
                    {recentClosed.slice(0, 5).map((pos: any) => {
                      const isBuy = pos.direction === 'BUY';
                      const isProfit = pos.profitLoss >= 0;
                      return (
                        <div
                          key={pos.id}
                          className="flex items-center justify-between py-1.5 opacity-70"
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[0.5rem] font-bold px-1 py-0.5 rounded"
                              style={{
                                background: isBuy ? C.greenBg : C.redBg,
                                color: isBuy ? C.green : C.red,
                              }}
                            >
                              {isBuy ? 'B' : 'S'}
                            </span>
                            <span className="text-[0.65rem]" style={{ color: C.textSecondary }}>
                              {pos.asset}
                            </span>
                          </div>
                          <span
                            className="text-[0.65rem] font-bold font-mono"
                            style={{ color: isProfit ? C.green : C.red }}
                          >
                            {isProfit ? '+' : ''}{formatMoney(pos.profitLoss)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* ===== HISTORY TAB ===== */}
            {activeTab === 'history' && (
              <>
                {/* Summary Stats */}
                <div
                  className="grid grid-cols-3 gap-2 mb-3 p-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}
                >
                  <div className="text-center">
                    <div className="text-[0.5rem] uppercase tracking-wider font-semibold" style={{ color: C.textSecondary }}>
                      Total
                    </div>
                    <div className="text-[0.85rem] font-black" style={{ color: C.textPrimary }}>
                      {historySummary.totalTrades}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[0.5rem] uppercase tracking-wider font-semibold" style={{ color: C.textSecondary }}>
                      Victoires
                    </div>
                    <div className="text-[0.85rem] font-black" style={{ color: C.green }}>
                      {historySummary.winCount}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-[0.5rem] uppercase tracking-wider font-semibold" style={{ color: C.textSecondary }}>
                      P/L Total
                    </div>
                    <div
                      className="text-[0.85rem] font-black"
                      style={{ color: historySummary.totalPL >= 0 ? C.green : C.red }}
                    >
                      {historySummary.totalPL >= 0 ? '+' : ''}{formatMoney(historySummary.totalPL)}
                    </div>
                  </div>
                </div>

                {historyTrades.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-clock-rotate-left text-[1rem] mb-2" style={{ color: C.textSecondary }}></i>
                    <p className="text-[0.75rem]" style={{ color: C.textSecondary }}>
                      Aucun historique de trade
                    </p>
                  </div>
                ) : (
                  historyTrades.map((trade) => {
                    const isBuy = trade.direction === 'BUY';
                    const isWin = trade.result === 'win';
                    return (
                      <div
                        key={trade.id}
                        className="flex items-center justify-between py-2.5 border-b last:border-b-0"
                        style={{ borderColor: C.border }}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{ background: isWin ? C.greenBg : C.redBg }}
                          >
                            <i
                              className={`fas ${isWin ? 'fa-check' : 'fa-times'} text-[0.5rem]`}
                              style={{ color: isWin ? C.green : C.red }}
                            ></i>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[0.7rem] font-bold" style={{ color: C.textPrimary }}>
                                {trade.asset}
                              </span>
                              <span
                                className="text-[0.5rem] font-bold px-1 py-0.5 rounded"
                                style={{
                                  background: isBuy ? C.greenBg : C.redBg,
                                  color: isBuy ? C.green : C.red,
                                }}
                              >
                                {isBuy ? 'BUY' : 'SELL'}
                              </span>
                            </div>
                            <div className="text-[0.5rem]" style={{ color: C.textSecondary }}>
                              {formatMoney(trade.amount)} · {trade.closeReason || 'manual'}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-[0.75rem] font-bold font-mono"
                            style={{ color: isWin ? C.green : C.red }}
                          >
                            {trade.profitLoss >= 0 ? '+' : ''}{formatMoney(trade.profitLoss)}
                          </div>
                          <div className="text-[0.5rem]" style={{ color: C.textSecondary }}>
                            {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Pagination */}
                {historySummary.totalTrades > 20 && (
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <button
                      onClick={() => setHistoryPage(Math.max(1, historyPage - 1))}
                      disabled={historyPage <= 1}
                      className="px-3 py-1.5 rounded-lg text-[0.6rem] font-bold border-none cursor-pointer disabled:opacity-30"
                      style={{ background: 'rgba(255,255,255,0.06)', color: C.textSecondary }}
                    >
                      Préc.
                    </button>
                    <span className="text-[0.6rem]" style={{ color: C.textSecondary }}>
                      Page {historyPage}
                    </span>
                    <button
                      onClick={() => setHistoryPage(historyPage + 1)}
                      className="px-3 py-1.5 rounded-lg text-[0.6rem] font-bold border-none cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.06)', color: C.textSecondary }}
                    >
                      Suiv.
                    </button>
                  </div>
                )}
              </>
            )}

            {/* ===== LEADERBOARD TAB ===== */}
            {activeTab === 'leaderboard' && (
              <>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-trophy text-[1rem] mb-2" style={{ color: C.textSecondary }}></i>
                    <p className="text-[0.75rem]" style={{ color: C.textSecondary }}>
                      Aucun classement disponible
                    </p>
                  </div>
                ) : (
                  leaderboard.map((entry, idx) => {
                    const isTop3 = entry.rank <= 3;
                    const medalColors = ['#F59E0B', '#94A3B8', '#CD7F32'];
                    const medalIcons = ['fa-crown', 'fa-medal', 'fa-award'];
                    return (
                      <div
                        key={entry.rank}
                        className="flex items-center justify-between py-2.5 border-b last:border-b-0"
                        style={{ borderColor: C.border }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              background: isTop3 ? `${medalColors[idx]}15` : 'rgba(255,255,255,0.04)',
                              border: isTop3 ? `1px solid ${medalColors[idx]}30` : `1px solid ${C.border}`,
                            }}
                          >
                            {isTop3 ? (
                              <i
                                className={`fas ${medalIcons[idx]} text-[0.6rem]`}
                                style={{ color: medalColors[idx] }}
                              ></i>
                            ) : (
                              <span className="text-[0.65rem] font-bold" style={{ color: C.textSecondary }}>
                                {entry.rank}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-[0.72rem] font-bold truncate" style={{ color: C.textPrimary }}>
                              {esc(entry.name)}
                            </div>
                            <div className="text-[0.5rem]" style={{ color: C.textSecondary }}>
                              {entry.totalTrades} trades · {entry.winningTrades} victoires
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-[0.75rem] font-bold font-mono"
                            style={{ color: entry.totalProfit >= 0 ? C.green : C.red }}
                          >
                            {entry.totalProfit >= 0 ? '+' : ''}{formatMoney(entry.totalProfit)}
                          </div>
                          <div className="text-[0.5rem] font-semibold" style={{ color: C.accent }}>
                            {entry.winRate.toFixed(0)}% win
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== INSUFFICIENT BALANCE MODAL ===== */}
      {showInsufficientModal && (
        <div
          className="fixed inset-0 z-[6000] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowInsufficientModal(false)}
        >
          <div
            className="rounded-2xl p-6 w-[88%] max-w-[320px] text-center"
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center"
              style={{ background: C.redBg }}
            >
              <i className="fas fa-exclamation-triangle text-[1.3rem]" style={{ color: C.red }}></i>
            </div>
            <h3 className="mb-2 text-[1.05rem] font-extrabold" style={{ color: C.textPrimary }}>
              Solde insuffisant
            </h3>
            <p className="text-[0.82rem] mb-5 leading-relaxed" style={{ color: C.textSecondary }}>
              Votre solde de trading est inférieur à ${MIN_BALANCE}. Veuillez verser des fonds pour accéder au Trading Arena.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowInsufficientModal(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95"
                style={{ background: 'rgba(255,255,255,0.06)', color: C.textSecondary, border: `1px solid ${C.border}` }}
              >
                Fermer
              </button>
              <button
                onClick={() => {
                  setShowInsufficientModal(false);
                  useAppStore.getState().setPage('wallet');
                }}
                className="flex-1 py-3 rounded-xl font-bold text-[0.82rem] cursor-pointer transition-transform active:scale-95"
                style={{ background: C.accent, color: '#0d1117' }}
              >
                <i className="fas fa-plus mr-1 text-[0.7rem]"></i>Verser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
