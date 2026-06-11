'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, formatMoney, authFetch, refreshUser } from '@/lib/store';

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
const QUICK_AMOUNTS = [1, 5, 10, 25, 50, 100];
const MIN_BALANCE = 5;
const MIN_AMOUNT = 1;
const ZOOM_MIN = 0.3;
const ZOOM_MAX = 4.0;

// ==================== MT4 COLORS ====================
const C = {
  bg: '#0a0e17',
  bgLight: '#0f1520',
  card: '#131a27',
  cardHover: '#1a2235',
  border: '#1e2a3a',
  borderLight: '#2a3a4e',
  textPrimary: '#e8edf5',
  textSecondary: '#6b7a8d',
  textMuted: '#3d4f63',
  green: '#00E676',
  greenDark: '#00a844',
  red: '#FF3D00',
  redDark: '#d50032',
  blue: '#2979ff',
  blueDark: '#1565c0',
  orange: '#ff9100',
  purple: '#b388ff',
  yellow: '#ffd600',
  cyan: '#00e5ff',
  greenBg: 'rgba(0,200,83,0.12)',
  redBg: 'rgba(255,23,68,0.12)',
  blueBg: 'rgba(41,121,255,0.12)',
};

// ==================== TYPES ====================
interface PriceData {
  asset: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  basePrice: number;
  change: number;
  changePercent: number;
  decimals: number;
  high24h: number;
  low24h: number;
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

interface DrawingLine {
  id: string;
  price: number;
}

// ==================== TECHNICAL INDICATORS ====================
function calcSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(NaN); continue; }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  return result;
}

function calcEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);
  let ema = data[0];
  for (let i = 0; i < data.length; i++) {
    if (i === 0) { result.push(data[0]); continue; }
    ema = data[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i === 0) { result.push(50); continue; }
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
    
    if (i < period) { result.push(50); continue; }
    
    const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - (100 / (1 + rs)));
  }
  return result;
}

function calcMACD(closes: number[]): { macd: number[]; signal: number[]; histogram: number[] } {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = calcEMA(macd, 9);
  const histogram = macd.map((v, i) => v - signal[i]);
  return { macd, signal, histogram };
}

function calcBollingerBands(closes: number[], period: number = 20, mult: number = 2): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calcSMA(closes, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(middle[i])) { upper.push(NaN); lower.push(NaN); continue; }
    const slice = closes.slice(Math.max(0, i - period + 1), i + 1);
    const std = Math.sqrt(slice.reduce((s, v) => s + Math.pow(v - middle[i], 2), 0) / slice.length);
    upper.push(middle[i] + mult * std);
    lower.push(middle[i] - mult * std);
  }
  return { upper, middle, lower };
}

// ==================== PROFESSIONAL CHART ====================
function ProChart({
  candles,
  width,
  height,
  showMA,
  showBB,
  showVolume,
  bidPrice,
  askPrice,
  zoomLevel,
  panOffset,
  onZoomChange,
  onPanChange,
  onHover,
  crosshairIndex,
  drawingLines,
  drawingMode,
  onDrawingClick,
}: {
  candles: Candle[];
  width: number;
  height: number;
  showMA: boolean;
  showBB: boolean;
  showVolume: boolean;
  bidPrice?: number;
  askPrice?: number;
  zoomLevel: number;
  panOffset: number;
  onZoomChange: (z: number) => void;
  onPanChange: (o: number) => void;
  onHover: (index: number | null) => void;
  crosshairIndex: number | null;
  drawingLines: DrawingLine[];
  drawingMode: boolean;
  onDrawingClick: (price: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const pinchDist = useRef(0);
  const pinchZoom = useRef(1);

  // Calculate visible range based on zoom
  const visibleCount = Math.max(5, Math.min(15, Math.round(candles.length / zoomLevel)));
  const maxOffset = Math.max(0, candles.length - visibleCount);
  const startIdx = Math.min(Math.max(0, panOffset), maxOffset);
  const endIdx = Math.min(startIdx + visibleCount, candles.length);
  const visibleCandles = candles.slice(startIdx, endIdx);

  const volHeight = showVolume ? 40 : 0;
  const chartHeight = height - volHeight;
  const pad = { top: 10, right: 60, bottom: volHeight > 0 ? 0 : 5, left: 5 };
  const chartW = width - pad.left - pad.right;
  const mainH = chartHeight - pad.top - pad.bottom;

  const closes = visibleCandles.map(c => c.close);
  const allHighs = visibleCandles.map(c => c.high);
  const allLows = visibleCandles.map(c => c.low);
  const maxPrice = Math.max(...allHighs, 0);
  const minPrice = Math.min(...allLows, 0);
  const priceRange = maxPrice - minPrice || 1;
  const pricePad = priceRange * 0.06;
  const yMax = maxPrice + pricePad;
  const yMin = minPrice - pricePad;
  const yRange = yMax - yMin;

  const candleSpacing = visibleCandles.length > 0 ? chartW / visibleCandles.length : 1;
  const candleWidth = Math.max(4, Math.min(55, candleSpacing * 0.88));
  const wickWidth = Math.max(1.5, candleWidth * 0.3);

  const toX = (i: number) => pad.left + i * candleSpacing + candleSpacing / 2;
  const toY = (price: number) => pad.top + (1 - (price - yMin) / yRange) * mainH;
  const fromY = (y: number) => yMin + (1 - (y - pad.top) / mainH) * yRange;

  const decimals = maxPrice > 100 ? 2 : maxPrice > 10 ? 3 : 5;

  // Grid lines
  const gridCount = 6;
  const gridPrices = Array.from({ length: gridCount }, (_, i) => yMin + (yRange * i) / (gridCount - 1));

  // Indicators
  const ma7 = showMA ? calcSMA(closes, 7) : [];
  const ma25 = showMA ? calcSMA(closes, 25) : [];
  const ma99 = showMA ? calcSMA(closes, Math.min(99, visibleCandles.length)) : [];
  const bb = showBB ? calcBollingerBands(closes) : null;

  // Volume
  const maxVol = Math.max(...visibleCandles.map(c => c.volume), 1);

  // Time labels
  const timeLabels: { x: number; label: string }[] = [];
  const labelInterval = Math.max(1, Math.floor(visibleCandles.length / 6));
  for (let i = 0; i < visibleCandles.length; i += labelInterval) {
    const d = new Date(visibleCandles[i].time * 1000);
    timeLabels.push({ x: toX(i), label: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}` });
  }

  // Polyline helper
  const toPath = (data: number[]) => {
    const points = data.map((v, i) => (!isNaN(v) && v >= yMin && v <= yMax) ? `${toX(i)},${toY(v)}` : null).filter(Boolean);
    return points.length > 1 ? `M${points.join('L')}` : '';
  };

  // Mouse/wheel handlers (plain functions - no useCallback needed for SVG event handlers)
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomLevel + delta));
    onZoomChange(Math.round(newZoom * 100) / 100);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (drawingMode) return;
    if (zoomLevel > 1.05) {
      isDragging.current = true;
      dragStartX.current = e.clientX;
      dragStartOffset.current = panOffset;
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // Crosshair
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const cx = relX - pad.left;
      const idx = Math.round((cx - candleSpacing / 2) / candleSpacing);
      if (idx >= 0 && idx < visibleCandles.length) {
        onHover(startIdx + idx);
      } else {
        onHover(null);
      }
    }

    // Drag to pan
    if (isDragging.current && zoomLevel > 1.05) {
      const dx = e.clientX - dragStartX.current;
      const candlesPerPx = visibleCandles.length / chartW;
      const deltaCandles = Math.round(-dx * candlesPerPx);
      const newOffset = Math.max(0, Math.min(maxOffset, dragStartOffset.current + deltaCandles));
      onPanChange(newOffset);
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseLeave = () => {
    isDragging.current = false;
    onHover(null);
  };

  // Click for drawing
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!drawingMode) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    if (relY >= pad.top && relY <= pad.top + mainH) {
      const price = fromY(relY);
      onDrawingClick(price);
    }
  };

  // Touch handlers for pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchDist.current = Math.sqrt(dx * dx + dy * dy);
      pinchZoom.current = zoomLevel;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.sqrt(dx * dx + dy * dy);
      if (pinchDist.current > 0) {
        const ratio = newDist / pinchDist.current;
        const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchZoom.current * ratio));
        onZoomChange(Math.round(newZoom * 100) / 100);
      }
    }
  };

  // Crosshair position
  const crosshairLocalIdx = crosshairIndex !== null ? crosshairIndex - startIdx : null;
  const crosshairCandle = crosshairLocalIdx !== null && crosshairLocalIdx >= 0 && crosshairLocalIdx < visibleCandles.length
    ? visibleCandles[crosshairLocalIdx] : null;
  const crosshairX = crosshairLocalIdx !== null && crosshairLocalIdx >= 0 && crosshairLocalIdx < visibleCandles.length
    ? toX(crosshairLocalIdx) : null;

  if (candles.length === 0) return null;

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      style={{ cursor: drawingMode ? 'crosshair' : zoomLevel > 1.05 ? 'grab' : 'default' }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <defs>
        <linearGradient id="bbFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.blue} stopOpacity="0.06" />
          <stop offset="50%" stopColor={C.blue} stopOpacity="0.03" />
          <stop offset="100%" stopColor={C.blue} stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridPrices.map((price, i) => {
        const y = toY(price);
        return (
          <g key={`g${i}`}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={C.border} strokeWidth="0.5" />
            <text x={width - pad.right + 4} y={y + 3} fontSize="8.5" fill={C.textSecondary} fontFamily="'JetBrains Mono',monospace">
              {price.toFixed(decimals)}
            </text>
          </g>
        );
      })}

      {/* Time labels */}
      {timeLabels.map((tl, i) => (
        <text key={`t${i}`} x={tl.x} y={chartHeight + 12} fontSize="8" fill={C.textMuted} fontFamily="monospace" textAnchor="middle">
          {tl.label}
        </text>
      ))}

      {/* Bollinger Bands */}
      {bb && (
        <g>
          <path d={toPath(bb.upper)} fill="none" stroke={C.blue} strokeWidth="0.8" opacity="0.4" />
          <path d={toPath(bb.lower)} fill="none" stroke={C.blue} strokeWidth="0.8" opacity="0.4" />
          <path d={toPath(bb.middle)} fill="none" stroke={C.blue} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.3" />
          {(() => {
            const upperPts = bb.upper.map((v, i) => (!isNaN(v) ? `${toX(i)},${toY(v)}` : null)).filter(Boolean);
            const lowerPts = bb.lower.map((v, i) => (!isNaN(v) ? `${toX(i)},${toY(v)}` : null)).filter(Boolean);
            if (upperPts.length > 1 && lowerPts.length > 1) {
              return <path d={`M${upperPts.join('L')}L${lowerPts.reverse().join('L')}Z`} fill="url(#bbFill)" />;
            }
            return null;
          })()}
        </g>
      )}

      {/* Moving Averages */}
      {showMA && (
        <g>
          {ma7.length > 0 && <path d={toPath(ma7)} fill="none" stroke={C.yellow} strokeWidth="1" opacity="0.7" />}
          {ma25.length > 0 && <path d={toPath(ma25)} fill="none" stroke={C.blue} strokeWidth="1" opacity="0.7" />}
          {ma99.length > 0 && <path d={toPath(ma99)} fill="none" stroke={C.purple} strokeWidth="1" opacity="0.5" />}
        </g>
      )}

      {/* Candles */}
      {visibleCandles.map((candle, i) => {
        const isUp = candle.close >= candle.open;
        const color = isUp ? C.green : C.red;
        const cx = toX(i);
        const bodyTop = toY(Math.max(candle.open, candle.close));
        const bodyBottom = toY(Math.min(candle.open, candle.close));
        const bodyHeight = Math.max(1, bodyBottom - bodyTop);
        const wickTop = toY(candle.high);
        const wickBottom = toY(candle.low);

        return (
          <g key={`c${i}`}>
            <line x1={cx} y1={wickTop} x2={cx} y2={wickBottom} stroke={color} strokeWidth={wickWidth} />
            <rect
              x={cx - candleWidth / 2} y={bodyTop}
              width={candleWidth} height={bodyHeight}
              fill={isUp ? C.green : C.red}
              stroke={color} strokeWidth="0.5"
              rx="0.3"
              opacity={1}
            />
          </g>
        );
      })}

      {/* Drawing Lines (horizontal price lines) */}
      {drawingLines.map((line) => {
        if (line.price < yMin || line.price > yMax) return null;
        const y = toY(line.price);
        return (
          <g key={line.id}>
            <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={C.cyan} strokeWidth="1" strokeDasharray="6,3" opacity="0.7" />
            <rect x={width - pad.right} y={y - 6} width={pad.right} height={12} fill={C.cyan} rx="2" opacity="0.8" />
            <text x={width - pad.right + 3} y={y + 3} fontSize="6.5" fill={C.bg} fontFamily="'JetBrains Mono',monospace" fontWeight="bold">
              {line.price.toFixed(decimals)}
            </text>
          </g>
        );
      })}

      {/* Bid/Ask lines */}
      {bidPrice && bidPrice > yMin && bidPrice < yMax && (
        <line x1={pad.left} y1={toY(bidPrice)} x2={width - pad.right} y2={toY(bidPrice)} stroke={C.green} strokeWidth="0.5" strokeDasharray="4,2" opacity="0.6" />
      )}
      {askPrice && askPrice > yMin && askPrice < yMax && (
        <line x1={pad.left} y1={toY(askPrice)} x2={width - pad.right} y2={toY(askPrice)} stroke={C.red} strokeWidth="0.5" strokeDasharray="4,2" opacity="0.6" />
      )}

      {/* Pulsing glow at last candle's close price */}
      {visibleCandles.length > 0 && (() => {
        const lastCandle = visibleCandles[visibleCandles.length - 1];
        const lastCx = toX(visibleCandles.length - 1);
        const lastCy = toY(lastCandle.close);
        const isUp = lastCandle.close >= lastCandle.open;
        if (lastCy < pad.top || lastCy > mainH + pad.top) return null;
        return (
          <g>
            <circle cx={lastCx} cy={lastCy} r={8} fill={isUp ? C.green : C.red} opacity="0.15">
              <animate attributeName="r" values="6;14;6" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={lastCx} cy={lastCy} r={4} fill={isUp ? C.green : C.red} opacity="0.6">
              <animate attributeName="r" values="3;6;3" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        );
      })()}

      {/* Current price label */}
      {visibleCandles.length > 0 && (() => {
        const lastClose = visibleCandles[visibleCandles.length - 1].close;
        const y = toY(lastClose);
        const isUp = visibleCandles[visibleCandles.length - 1].close >= visibleCandles[visibleCandles.length - 1].open;
        if (y < pad.top || y > mainH + pad.top) return null;
        return (
          <g>
            <rect x={width - pad.right} y={y - 8} width={pad.right} height={16} fill={isUp ? C.green : C.red} rx="2" />
            <text x={width - pad.right + 4} y={y + 4} fontSize="9" fill="#fff" fontFamily="'JetBrains Mono',monospace" fontWeight="bold">
              {lastClose.toFixed(decimals)}
            </text>
          </g>
        );
      })()}

      {/* Crosshair */}
      {crosshairX !== null && crosshairCandle && (
        <g>
          {/* Vertical line */}
          <line x1={crosshairX} y1={pad.top} x2={crosshairX} y2={pad.top + mainH} stroke={C.textMuted} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6" />
          {/* Horizontal line */}
          {(() => {
            const midPrice = crosshairCandle.close;
            const hy = toY(midPrice);
            return (
              <line x1={pad.left} y1={hy} x2={width - pad.right} y2={hy} stroke={C.textMuted} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6" />
            );
          })()}
          {/* OHLCV tooltip */}
          <g>
            <rect x={pad.left + 2} y={pad.top + 2} width={110} height={54} fill={C.card} stroke={C.border} strokeWidth="0.5" rx="3" opacity="0.92" />
            <text x={pad.left + 6} y={pad.top + 14} fontSize="8" fill={C.textSecondary} fontFamily="monospace">
              O: <tspan fill={C.textPrimary}>{crosshairCandle.open.toFixed(decimals)}</tspan>
            </text>
            <text x={pad.left + 6} y={pad.top + 26} fontSize="8" fill={C.textSecondary} fontFamily="monospace">
              H: <tspan fill={C.green}>{crosshairCandle.high.toFixed(decimals)}</tspan>
            </text>
            <text x={pad.left + 6} y={pad.top + 38} fontSize="8" fill={C.textSecondary} fontFamily="monospace">
              L: <tspan fill={C.red}>{crosshairCandle.low.toFixed(decimals)}</tspan>
            </text>
            <text x={pad.left + 6} y={pad.top + 50} fontSize="8" fill={C.textSecondary} fontFamily="monospace">
              C: <tspan fill={crosshairCandle.close >= crosshairCandle.open ? C.green : C.red}>{crosshairCandle.close.toFixed(decimals)}</tspan>
              <tspan fill={C.textMuted}> V:{crosshairCandle.volume.toFixed(0)}</tspan>
            </text>
          </g>
        </g>
      )}

      {/* Volume bars */}
      {showVolume && visibleCandles.map((candle, i) => {
        const isUp = candle.close >= candle.open;
        const barH = (candle.volume / maxVol) * volHeight * 0.8;
        return (
          <rect
            key={`v${i}`}
            x={toX(i) - candleWidth / 2}
            y={height - barH}
            width={candleWidth}
            height={barH}
            fill={isUp ? C.green : C.red}
            opacity="0.3"
          />
        );
      })}
    </svg>
  );
}

// ==================== RSI INDICATOR ====================
function RSIChart({ candles, width, height, crosshairIndex, startIdx }: { candles: Candle[]; width: number; height: number; crosshairIndex: number | null; startIdx: number }) {
  const closes = candles.map(c => c.close);
  const rsi = calcRSI(closes);
  const pad = { top: 5, right: 60, bottom: 12, left: 5 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const candleSpacing = chartW / closes.length;
  const toX = (i: number) => pad.left + i * candleSpacing + candleSpacing / 2;
  const toY = (v: number) => pad.top + (1 - v / 100) * chartH;

  const rsiPath = rsi.map((v, i) => (!isNaN(v) ? `${toX(i)},${toY(v)}` : null)).filter(Boolean).join('L');

  const localIdx = crosshairIndex !== null ? crosshairIndex - startIdx : null;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Overbought/Oversold zones */}
      <rect x={pad.left} y={toY(100)} width={chartW} height={toY(70) - toY(100)} fill="rgba(255,23,68,0.05)" />
      <rect x={pad.left} y={toY(30)} width={chartW} height={toY(0) - toY(30)} fill="rgba(0,200,83,0.05)" />
      
      {/* Lines */}
      <line x1={pad.left} y1={toY(70)} x2={width - pad.right} y2={toY(70)} stroke={C.red} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4" />
      <line x1={pad.left} y1={toY(30)} x2={width - pad.right} y2={toY(30)} stroke={C.green} strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4" />
      <line x1={pad.left} y1={toY(50)} x2={width - pad.right} y2={toY(50)} stroke={C.border} strokeWidth="0.5" strokeDasharray="2,4" />

      {/* Labels */}
      <text x={width - pad.right + 4} y={toY(70) + 3} fontSize="7" fill={C.red} fontFamily="monospace" opacity="0.6">70</text>
      <text x={width - pad.right + 4} y={toY(30) + 3} fontSize="7" fill={C.green} fontFamily="monospace" opacity="0.6">30</text>
      <text x={pad.left} y={pad.top + 9} fontSize="7" fill={C.orange} fontFamily="monospace" fontWeight="bold">RSI(14)</text>

      {/* RSI Line */}
      {rsiPath && <path d={`M${rsiPath}`} fill="none" stroke={C.orange} strokeWidth="1.2" />}

      {/* Current RSI value */}
      {rsi.length > 0 && !isNaN(rsi[rsi.length - 1]) && (
        <text x={width - pad.right + 4} y={toY(rsi[rsi.length - 1]) + 3} fontSize="7" fill={C.orange} fontFamily="monospace" fontWeight="bold">
          {rsi[rsi.length - 1].toFixed(1)}
        </text>
      )}

      {/* Crosshair vertical line */}
      {localIdx !== null && localIdx >= 0 && localIdx < closes.length && (
        <line x1={toX(localIdx)} y1={pad.top} x2={toX(localIdx)} y2={pad.top + chartH} stroke={C.textMuted} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6" />
      )}
    </svg>
  );
}

// ==================== MACD INDICATOR ====================
function MACDChart({ candles, width, height, crosshairIndex, startIdx }: { candles: Candle[]; width: number; height: number; crosshairIndex: number | null; startIdx: number }) {
  const closes = candles.map(c => c.close);
  const { macd, signal, histogram } = calcMACD(closes);
  const pad = { top: 8, right: 60, bottom: 12, left: 5 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const candleSpacing = chartW / closes.length;
  const toX = (i: number) => pad.left + i * candleSpacing + candleSpacing / 2;

  // Find y range for MACD values (centered on 0)
  const allValues = [...macd, ...signal, ...histogram].filter(v => !isNaN(v));
  const maxVal = Math.max(...allValues.map(Math.abs), 0.0001);
  const yMax = maxVal * 1.15;
  const yMin = -yMax;
  const yRange = yMax - yMin;
  const toY = (v: number) => pad.top + (1 - (v - yMin) / yRange) * chartH;
  const zeroY = toY(0);

  const localIdx = crosshairIndex !== null ? crosshairIndex - startIdx : null;

  const macdPath = macd.map((v, i) => (!isNaN(v) ? `${toX(i)},${toY(v)}` : null)).filter(Boolean).join('L');
  const signalPath = signal.map((v, i) => (!isNaN(v) ? `${toX(i)},${toY(v)}` : null)).filter(Boolean).join('L');

  const barWidth = Math.max(1, Math.min(6, candleSpacing * 0.5));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {/* Zero line */}
      <line x1={pad.left} y1={zeroY} x2={width - pad.right} y2={zeroY} stroke={C.border} strokeWidth="0.5" />

      {/* Histogram bars */}
      {histogram.map((v, i) => {
        if (isNaN(v)) return null;
        const isPositive = v >= 0;
        const barH = Math.abs(toY(v) - zeroY);
        return (
          <rect
            key={`h${i}`}
            x={toX(i) - barWidth / 2}
            y={isPositive ? toY(v) : zeroY}
            width={barWidth}
            height={Math.max(0.5, barH)}
            fill={isPositive ? C.green : C.red}
            opacity="0.5"
          />
        );
      })}

      {/* MACD Line */}
      {macdPath && <path d={`M${macdPath}`} fill="none" stroke={C.blue} strokeWidth="1" />}

      {/* Signal Line */}
      {signalPath && <path d={`M${signalPath}`} fill="none" stroke={C.orange} strokeWidth="1" />}

      {/* Labels */}
      <text x={pad.left} y={pad.top + 9} fontSize="7" fill={C.blue} fontFamily="monospace" fontWeight="bold">MACD(12,26,9)</text>

      {/* Current values */}
      {macd.length > 0 && !isNaN(macd[macd.length - 1]) && (
        <text x={width - pad.right + 4} y={toY(macd[macd.length - 1]) + 3} fontSize="6.5" fill={C.blue} fontFamily="monospace" fontWeight="bold">
          {macd[macd.length - 1].toFixed(decimalsForValue(macd[macd.length - 1]))}
        </text>
      )}
      {signal.length > 0 && !isNaN(signal[signal.length - 1]) && (
        <text x={width - pad.right + 4} y={toY(signal[signal.length - 1]) + 3} fontSize="6.5" fill={C.orange} fontFamily="monospace" fontWeight="bold">
          {signal[signal.length - 1].toFixed(decimalsForValue(signal[signal.length - 1]))}
        </text>
      )}

      {/* Crosshair vertical line */}
      {localIdx !== null && localIdx >= 0 && localIdx < closes.length && (
        <line x1={toX(localIdx)} y1={pad.top} x2={toX(localIdx)} y2={pad.top + chartH} stroke={C.textMuted} strokeWidth="0.5" strokeDasharray="2,2" opacity="0.6" />
      )}
    </svg>
  );
}

// Helper to determine decimal places for small MACD values
function decimalsForValue(v: number): number {
  const abs = Math.abs(v);
  if (abs === 0) return 2;
  if (abs >= 100) return 2;
  if (abs >= 1) return 3;
  if (abs >= 0.01) return 4;
  return 5;
}

// ==================== MAIN COMPONENT ====================
export default function TradingArenaScreen() {
  const { user, addToast } = useAppStore();
  const [selectedAsset, setSelectedAsset] = useState('EUR/USD');
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartBid, setChartBid] = useState<number>(0);
  const [chartAsk, setChartAsk] = useState<number>(0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentClosed, setRecentClosed] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'history' | 'leaderboard'>('positions');
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [historyTrades, setHistoryTrades] = useState<HistoryPosition[]>([]);
  const [historySummary, setHistorySummary] = useState({ totalTrades: 0, winCount: 0, lossCount: 0, totalPL: 0 });
  const [historyPage, setHistoryPage] = useState(1);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Chart options
  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  // Zoom & Pan (keyed by asset+timeframe so they reset when either changes)
  const [chartZoomPan, setChartZoomPan] = useState({ asset: 'EUR/USD', tf: '1m', zoom: 3.5, pan: 0 });
  const zoomLevel = chartZoomPan.asset === selectedAsset && chartZoomPan.tf === timeframe ? chartZoomPan.zoom : 3.5;
  const panOffset = chartZoomPan.asset === selectedAsset && chartZoomPan.tf === timeframe ? chartZoomPan.pan : 0;

  // Crosshair
  const [crosshairIndex, setCrosshairIndex] = useState<number | null>(null);

  // Drawing tools
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawingLines, setDrawingLines] = useState<DrawingLine[]>([]);

  // One-click trading
  const [oneClickTrading, setOneClickTrading] = useState(false);

  // Chart sizing
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(360);
  const mainChartHeight = 550;
  const rsiHeight = 60;
  const macdHeight = 70;

  // Computed visible range for passing to sub-charts
  const visibleCount = Math.max(5, Math.min(15, Math.round(candles.length / zoomLevel)));
  const maxPanOffset = Math.max(0, candles.length - visibleCount);
  const chartStartIdx = Math.min(Math.max(0, panOffset), maxPanOffset);

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



  // ===== FETCH PRICES (every 1s for fast updates) =====
  const fetchPrices = useCallback(async () => {
    try {
      const res = await authFetch('/api/trading/prices');
      const data = await res.json();
      if (data.success) setPrices(data.prices);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchPrices, 0);
    const iv = setInterval(fetchPrices, 1000);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [fetchPrices]);

  // ===== FETCH CHART (every 1.5s for live candle updates) =====
  const fetchChart = useCallback(async () => {
    try {
      const res = await authFetch(`/api/trading/chart?asset=${encodeURIComponent(selectedAsset)}&timeframe=${timeframe}&count=80`);
      const data = await res.json();
      if (data.success) {
        setCandles(data.candles || []);
        setChartBid(data.bid || 0);
        setChartAsk(data.ask || 0);
      }
    } catch { /* */ }
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    const t = setTimeout(fetchChart, 0);
    const iv = setInterval(fetchChart, 1500);
    return () => { clearTimeout(t); clearInterval(iv); };
  }, [fetchChart]);

  // ===== FETCH POSITIONS (every 3s) =====
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
    const iv = setInterval(fetchPositions, 3000);
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
      if (data.success) setLeaderboard(data.leaderboard || []);
    } catch { /* */ }
  }, []);

  useEffect(() => {
    if (activeTab === 'leaderboard') setTimeout(fetchLeaderboard, 0);
  }, [activeTab, fetchLeaderboard]);

  // ===== OPEN POSITION =====
  const handleOpenPosition = async (direction: 'BUY' | 'SELL') => {
    if (!user) return;
    if (user.tradeBalance < MIN_BALANCE) { setShowInsufficientModal(true); return; }
    const amt = parseFloat(amount);
    if (!amt || amt < MIN_AMOUNT) { addToast(`Minimum: $${MIN_AMOUNT}`, 'error'); return; }
    if (amt > user.tradeBalance) { addToast('Solde insuffisant', 'error'); return; }
    setOpening(true);
    try {
      const body: any = { asset: selectedAsset, direction, amount: amt };
      // Convert price-level SL/TP to percentages for API
      const currentPrice = getCurrentPrice(selectedAsset)?.price;
      if (stopLoss && currentPrice) {
        const slPrice = parseFloat(stopLoss);
        if (!isNaN(slPrice) && slPrice > 0 && currentPrice > 0) {
          const slPercent = Math.abs((currentPrice - slPrice) / currentPrice) * 100;
          if (slPercent > 0 && slPercent <= 50) body.stopLoss = parseFloat(slPercent.toFixed(2));
        }
      }
      if (takeProfit && currentPrice) {
        const tpPrice = parseFloat(takeProfit);
        if (!isNaN(tpPrice) && tpPrice > 0 && currentPrice > 0) {
          const tpPercent = Math.abs((tpPrice - currentPrice) / currentPrice) * 100;
          if (tpPercent > 0 && tpPercent <= 200) body.takeProfit = parseFloat(tpPercent.toFixed(2));
        }
      }
      const res = await authFetch('/api/trading/open-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Ordre ${direction} exécuté`, 'success');
        setAmount(''); setStopLoss(''); setTakeProfit('');
        fetchPositions(); refreshUser();
      } else { addToast(data.error || 'Erreur', 'error'); }
    } catch { addToast('Erreur réseau', 'error'); }
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
        addToast(pl >= 0 ? `Fermeture: +${formatMoney(pl)}` : `Fermeture: ${formatMoney(pl)}`, pl >= 0 ? 'success' : 'error');
        fetchPositions(); refreshUser();
      } else { addToast(data.error || 'Erreur', 'error'); }
    } catch { addToast('Erreur réseau', 'error'); }
    setClosing(null);
  };

  // ===== DRAWING HANDLER =====
  const handleDrawingClick = useCallback((price: number) => {
    setDrawingLines(prev => [...prev, { id: `line_${Date.now()}`, price }]);
  }, []);

  const removeDrawingLine = useCallback((id: string) => {
    setDrawingLines(prev => prev.filter(l => l.id !== id));
  }, []);

  // ===== ZOOM HANDLERS =====
  const handleZoomIn = useCallback(() => {
    setChartZoomPan(prev => ({ ...prev, zoom: Math.min(ZOOM_MAX, Math.round((prev.zoom + 0.3) * 100) / 100) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setChartZoomPan(prev => ({ ...prev, zoom: Math.max(ZOOM_MIN, Math.round((prev.zoom - 0.3) * 100) / 100) }));
  }, []);

  const handleZoomReset = useCallback(() => {
    setChartZoomPan(prev => ({ ...prev, zoom: 3.5, pan: 0 }));
  }, []);

  // ===== HELPERS =====
  const getCurrentPrice = (assetId: string) => prices.find(p => p.asset === assetId);
  const getAssetInfo = (assetId: string) => ASSETS.find(a => a.id === assetId) || ASSETS[0];
  const formatPrice = (price: number, assetId: string) => price.toFixed(getAssetInfo(assetId).dec);

  if (!user) return null;

  const currentPriceData = getCurrentPrice(selectedAsset);
  const tradeBalance = user.tradeBalance || 0;
  const parsedAmount = parseFloat(amount) || 0;
  const totalOpenPL = positions.reduce((sum, p) => sum + p.profitLoss, 0);
  const assetDec = getAssetInfo(selectedAsset).dec;
  const currentMidPrice = currentPriceData?.price || 0;

  // SL/TP percentage helpers
  const slPrice = parseFloat(stopLoss);
  const slPercent = !isNaN(slPrice) && currentMidPrice > 0 ? Math.abs((currentMidPrice - slPrice) / currentMidPrice) * 100 : null;
  const tpPrice = parseFloat(takeProfit);
  const tpPercent = !isNaN(tpPrice) && currentMidPrice > 0 ? Math.abs((tpPrice - currentMidPrice) / currentMidPrice) * 100 : null;

  // Visible candles for RSI/MACD (same slice as ProChart)
  const visibleCandlesForSub = candles.slice(chartStartIdx, chartStartIdx + visibleCount);

  return (
    <>
      <style>{`
        @keyframes pulse-live { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes flash-green { 0% { color: ${C.green}; } 100% { color: ${C.textPrimary}; } }
        @keyframes flash-red { 0% { color: ${C.red}; } 100% { color: ${C.textPrimary}; } }
        @keyframes candle-glow { 0%, 100% { r: 4; opacity: 0.8; } 50% { r: 7; opacity: 0.3; } }
        @keyframes candle-glow-ring { 0%, 100% { r: 8; opacity: 0.4; } 50% { r: 12; opacity: 0.1; } }
        .live-dot { animation: pulse-live 1s ease-in-out infinite; }
        .sb::-webkit-scrollbar { width: 3px; height: 3px; }
        .sb::-webkit-scrollbar-track { background: ${C.bg}; }
        .sb::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      {/* ===== HEADER ===== */}
      <header className="h-[48px] flex items-center justify-between px-3 sticky top-0 z-20 shrink-0" style={{ background: C.card, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-2">
          <button onClick={() => useAppStore.getState().setPage('home')} className="w-7 h-7 rounded flex items-center justify-center border-none cursor-pointer" style={{ background: 'rgba(255,255,255,0.04)', color: C.textSecondary }}>
            <i className="fas fa-arrow-left text-[0.7rem]"></i>
          </button>
          <div className="flex items-center gap-1.5">
            <i className="fas fa-chart-line text-[0.75rem]" style={{ color: C.blue }}></i>
            <span className="text-[0.85rem] font-bold" style={{ color: C.textPrimary }}>Trading</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-[0.5rem] uppercase tracking-wider font-semibold" style={{ color: C.textMuted }}>Solde</div>
            <div className="text-[0.8rem] font-bold font-mono" style={{ color: C.blue }}>{formatMoney(tradeBalance)}</div>
          </div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="px-2 py-1 rounded text-[0.6rem] font-bold border-none cursor-pointer" style={{ background: C.blueBg, color: C.blue, border: `1px solid rgba(41,121,255,0.3)` }}>
            <i className="fas fa-plus mr-0.5 text-[0.5rem]"></i>Verser
          </button>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 w-full overflow-y-auto min-h-0 sb" style={{ background: C.bg }}>

        {/* ===== ASSET SELECTOR ===== */}
        <div className="flex gap-1 px-2 py-1.5 overflow-x-auto" style={{ borderBottom: `1px solid ${C.border}`, scrollbarWidth: 'none' }}>
          {ASSETS.map(asset => {
            const pd = getCurrentPrice(asset.id);
            const sel = selectedAsset === asset.id;
            const chg = pd?.changePercent || 0;
            const up = chg >= 0;
            return (
              <button key={asset.id} onClick={() => setSelectedAsset(asset.id)} className="shrink-0 rounded px-2 py-1.5 border-none cursor-pointer transition-all min-w-[72px]" style={{ background: sel ? C.card : 'transparent', borderBottom: sel ? `2px solid ${C.blue}` : '2px solid transparent' }}>
                <div className="text-[0.55rem] font-bold" style={{ color: sel ? C.textPrimary : C.textSecondary }}>{asset.label}</div>
                <div className="text-[0.65rem] font-mono font-bold" style={{ color: C.textPrimary }}>{pd ? formatPrice(pd.price, asset.id) : '—'}</div>
                <div className="text-[0.5rem] font-bold" style={{ color: up ? C.green : C.red }}>{up ? '▲' : '▼'} {Math.abs(chg).toFixed(2)}%</div>
              </button>
            );
          })}
        </div>

        {/* ===== PRICE BAR ===== */}
        <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3">
            <span className="text-[0.9rem] font-bold" style={{ color: C.textPrimary }}>{selectedAsset}</span>
            <div className="flex items-center gap-1 px-1 py-0.5 rounded" style={{ background: 'rgba(0,200,83,0.1)' }}>
              <div className="w-1.5 h-1.5 rounded-full live-dot" style={{ background: C.green }}></div>
              <span className="text-[0.45rem] font-bold" style={{ color: C.green }}>LIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Bid */}
            <div className="text-right">
              <div className="text-[0.45rem] uppercase font-bold" style={{ color: C.textMuted }}>BID</div>
              <div className="text-[0.8rem] font-mono font-bold" style={{ color: C.red }}>{currentPriceData ? formatPrice(currentPriceData.bid, selectedAsset) : '—'}</div>
            </div>
            {/* Ask */}
            <div className="text-right">
              <div className="text-[0.45rem] uppercase font-bold" style={{ color: C.textMuted }}>ASK</div>
              <div className="text-[0.8rem] font-mono font-bold" style={{ color: C.green }}>{currentPriceData ? formatPrice(currentPriceData.ask, selectedAsset) : '—'}</div>
            </div>
            {/* Spread */}
            <div className="text-right">
              <div className="text-[0.45rem] uppercase font-bold" style={{ color: C.textMuted }}>SPREAD</div>
              <div className="text-[0.65rem] font-mono font-bold" style={{ color: C.textSecondary }}>{currentPriceData?.spread || 0} pips</div>
            </div>
          </div>
        </div>

        {/* ===== CHART TOOLBAR ===== */}
        <div className="flex items-center justify-between px-2 py-1" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex gap-0.5 items-center">
            {TIMEFRAMES.map(tf => (
              <button key={tf} onClick={() => setTimeframe(tf)} className="px-1.5 py-0.5 rounded text-[0.55rem] font-bold border-none cursor-pointer" style={{ background: timeframe === tf ? C.blueBg : 'transparent', color: timeframe === tf ? C.blue : C.textMuted, border: timeframe === tf ? `1px solid rgba(41,121,255,0.3)` : '1px solid transparent' }}>
                {tf}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 items-center">
            {/* Zoom controls */}
            <button onClick={handleZoomOut} className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold border-none cursor-pointer" style={{ background: C.bgLight, color: zoomLevel <= ZOOM_MIN ? C.textMuted : C.textSecondary, border: `1px solid ${C.border}` }}>
              −
            </button>
            <button onClick={handleZoomReset} className="px-1 py-0.5 rounded text-[0.45rem] font-bold border-none cursor-pointer min-w-[32px] text-center" style={{ background: C.bgLight, color: C.textSecondary, border: `1px solid ${C.border}` }}>
              {zoomLevel.toFixed(1)}x
            </button>
            <button onClick={handleZoomIn} className="px-1.5 py-0.5 rounded text-[0.6rem] font-bold border-none cursor-pointer" style={{ background: C.bgLight, color: zoomLevel >= ZOOM_MAX ? C.textMuted : C.textSecondary, border: `1px solid ${C.border}` }}>
              +
            </button>

            {/* Separator */}
            <div className="w-px h-4 mx-0.5" style={{ background: C.border }}></div>

            {/* Drawing tool */}
            <button onClick={() => setDrawingMode(!drawingMode)} className="px-1.5 py-0.5 rounded text-[0.5rem] font-bold border-none cursor-pointer" style={{ background: drawingMode ? `${C.cyan}15` : 'transparent', color: drawingMode ? C.cyan : C.textMuted, border: drawingMode ? `1px solid ${C.cyan}40` : '1px solid transparent' }}>
              <i className="fas fa-minus text-[0.4rem] mr-0.5"></i>Ligne
            </button>

            {[
              { key: 'MA', val: showMA, set: () => setShowMA(!showMA), color: C.yellow },
              { key: 'BB', val: showBB, set: () => setShowBB(!showBB), color: C.blue },
              { key: 'VOL', val: showVolume, set: () => setShowVolume(!showVolume), color: C.textSecondary },
              { key: 'RSI', val: showRSI, set: () => setShowRSI(!showRSI), color: C.orange },
              { key: 'MACD', val: showMACD, set: () => setShowMACD(!showMACD), color: C.purple },
            ].map(ind => (
              <button key={ind.key} onClick={ind.set} className="px-1.5 py-0.5 rounded text-[0.5rem] font-bold border-none cursor-pointer" style={{ background: ind.val ? `${ind.color}15` : 'transparent', color: ind.val ? ind.color : C.textMuted, border: ind.val ? `1px solid ${ind.color}40` : '1px solid transparent' }}>
                {ind.key}
              </button>
            ))}
          </div>
        </div>

        {/* ===== Drawing lines indicator ===== */}
        {drawingLines.length > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 overflow-x-auto" style={{ borderBottom: `1px solid ${C.border}`, scrollbarWidth: 'none' }}>
            <span className="text-[0.45rem] font-bold shrink-0" style={{ color: C.cyan }}>Lignes:</span>
            {drawingLines.map(line => (
              <button key={line.id} onClick={() => removeDrawingLine(line.id)} className="shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[0.45rem] font-bold border-none cursor-pointer" style={{ background: `${C.cyan}15`, color: C.cyan, border: `1px solid ${C.cyan}30` }}>
                {line.price.toFixed(assetDec)}
                <i className="fas fa-times text-[0.35rem]"></i>
              </button>
            ))}
          </div>
        )}

        {/* ===== CHART AREA ===== */}
        <div ref={chartRef} className="px-1 overflow-hidden">
          <ProChart
            candles={candles}
            width={chartWidth - 8}
            height={mainChartHeight}
            showMA={showMA}
            showBB={showBB}
            showVolume={showVolume}
            bidPrice={chartBid}
            askPrice={chartAsk}
            zoomLevel={zoomLevel}
            panOffset={panOffset}
            onZoomChange={(z) => setChartZoomPan(prev => ({ ...prev, zoom: z }))}
            onPanChange={(o) => setChartZoomPan(prev => ({ ...prev, pan: o }))}
            onHover={(idx) => setCrosshairIndex(idx)}
            crosshairIndex={crosshairIndex}
            drawingLines={drawingLines}
            drawingMode={drawingMode}
            onDrawingClick={handleDrawingClick}
          />
          {showRSI && <RSIChart candles={visibleCandlesForSub} width={chartWidth - 8} height={rsiHeight} crosshairIndex={crosshairIndex} startIdx={chartStartIdx} />}
          {showMACD && <MACDChart candles={visibleCandlesForSub} width={chartWidth - 8} height={macdHeight} crosshairIndex={crosshairIndex} startIdx={chartStartIdx} />}
        </div>

        {/* ===== 24H STATS ===== */}
        <div className="flex items-center justify-between px-3 py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
          <div className="flex gap-4">
            <div>
              <span className="text-[0.5rem] uppercase font-bold mr-1" style={{ color: C.textMuted }}>H24</span>
              <span className="text-[0.65rem] font-mono font-bold" style={{ color: C.green }}>{currentPriceData ? formatPrice(currentPriceData.high24h, selectedAsset) : '—'}</span>
            </div>
            <div>
              <span className="text-[0.5rem] uppercase font-bold mr-1" style={{ color: C.textMuted }}>B24</span>
              <span className="text-[0.65rem] font-mono font-bold" style={{ color: C.red }}>{currentPriceData ? formatPrice(currentPriceData.low24h, selectedAsset) : '—'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.5rem] font-bold" style={{ color: C.textMuted }}>Chg:</span>
            <span className="text-[0.65rem] font-bold" style={{ color: (currentPriceData?.changePercent || 0) >= 0 ? C.green : C.red }}>
              {(currentPriceData?.changePercent || 0) >= 0 ? '+' : ''}{(currentPriceData?.changePercent || 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* ===== OPEN POSITIONS (compact) ===== */}
        {positions.length > 0 && (
          <div className="mx-2 my-1.5 rounded-lg overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
              <span className="text-[0.65rem] font-bold" style={{ color: C.textSecondary }}>
                Positions <span style={{ color: C.blue }}>({positions.length})</span>
                {totalOpenPL !== 0 && <span className="ml-2" style={{ color: totalOpenPL >= 0 ? C.green : C.red }}>{totalOpenPL >= 0 ? '+' : ''}{formatMoney(totalOpenPL)}</span>}
              </span>
            </div>
            <div className="max-h-32 overflow-y-auto sb">
              {positions.map(pos => {
                const isBuy = pos.direction === 'BUY';
                const isProfit = pos.profitLoss >= 0;
                return (
                  <div key={pos.id} className="flex items-center justify-between px-2.5 py-1.5" style={{ borderBottom: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-2">
                      <span className="px-1 py-0.5 rounded text-[0.45rem] font-black" style={{ background: isBuy ? C.greenBg : C.redBg, color: isBuy ? C.green : C.red }}>{isBuy ? 'B' : 'S'}</span>
                      <div>
                        <span className="text-[0.65rem] font-bold" style={{ color: C.textPrimary }}>{pos.asset}</span>
                        <span className="text-[0.5rem] ml-1" style={{ color: C.textMuted }}>{formatMoney(pos.amount)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[0.7rem] font-mono font-bold" style={{ color: isProfit ? C.green : C.red }}>
                        {isProfit ? '+' : ''}{formatMoney(pos.profitLoss)}
                      </span>
                      <button onClick={() => handleClosePosition(pos.id)} disabled={closing === pos.id} className="w-5 h-5 rounded flex items-center justify-center border-none cursor-pointer" style={{ background: C.redBg, color: C.red }}>
                        {closing === pos.id ? <div className="w-2.5 h-2.5 border rounded-full" style={{ borderColor: `${C.red}40`, borderTopColor: C.red, animation: 'spin 0.5s linear infinite' }}></div> : <i className="fas fa-times text-[0.45rem]"></i>}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== TRADING PANEL ===== */}
        <div className="mx-2 my-1.5 rounded-lg p-2.5" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {/* One-click trading toggle + Amount */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.5rem] uppercase font-bold" style={{ color: C.textMuted }}>Montant ($)</span>
              <div className="flex items-center gap-2">
                <span className="text-[0.5rem] font-mono" style={{ color: C.textMuted }}>Dispo: {formatMoney(tradeBalance)}</span>
                {/* One-click trading toggle */}
                <div className="flex items-center gap-1">
                  <span className="text-[0.4rem] font-bold" style={{ color: oneClickTrading ? C.green : C.textMuted }}>1-Click</span>
                  <button
                    onClick={() => setOneClickTrading(!oneClickTrading)}
                    className="relative w-7 h-4 rounded-full border-none cursor-pointer transition-all"
                    style={{ background: oneClickTrading ? C.green : C.border }}
                  >
                    <div
                      className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                      style={{ left: oneClickTrading ? '14px' : '2px', background: oneClickTrading ? '#fff' : C.textMuted }}
                    />
                  </button>
                </div>
              </div>
            </div>
            <input type="number" step="0.01" min={MIN_AMOUNT} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="w-full py-2 px-3 rounded text-[0.9rem] font-bold outline-none" style={{ background: C.bgLight, border: `1px solid ${C.border}`, color: C.textPrimary }} />
          </div>

          {/* Quick Amounts */}
          <div className="grid grid-cols-6 gap-1 mb-2">
            {QUICK_AMOUNTS.map(qa => (
              <button key={qa} onClick={() => setAmount(String(qa))} className="py-1 rounded text-[0.55rem] font-bold border-none cursor-pointer" style={{ background: parseFloat(amount) === qa ? C.blueBg : C.bgLight, color: parseFloat(amount) === qa ? C.blue : C.textSecondary, border: parseFloat(amount) === qa ? `1px solid rgba(41,121,255,0.3)` : `1px solid ${C.border}` }}>
                ${qa}
              </button>
            ))}
          </div>

          {/* SL / TP - Price Level Inputs */}
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <span className="text-[0.45rem] uppercase font-bold block mb-0.5" style={{ color: C.textMuted }}>Stop Loss (Prix)</span>
              <input
                type="number"
                step={assetDec === 5 ? '0.00001' : assetDec === 4 ? '0.0001' : assetDec === 3 ? '0.001' : '0.01'}
                value={stopLoss}
                onChange={e => setStopLoss(e.target.value)}
                placeholder={currentMidPrice ? (currentMidPrice * 0.95).toFixed(assetDec) : '—'}
                className="w-full py-1.5 px-2 rounded text-[0.75rem] font-semibold outline-none"
                style={{ background: `${C.red}08`, border: `1px solid ${C.red}20`, color: C.textPrimary }}
              />
              {slPercent !== null && slPrice > 0 && (
                <span className="text-[0.4rem] font-mono block mt-0.5" style={{ color: C.red }}>
                  −{slPercent.toFixed(2)}% du prix actuel
                </span>
              )}
              {currentMidPrice > 0 && !stopLoss && (
                <span className="text-[0.4rem] font-mono block mt-0.5" style={{ color: C.textMuted }}>
                  Actuel: {currentMidPrice.toFixed(assetDec)}
                </span>
              )}
            </div>
            <div>
              <span className="text-[0.45rem] uppercase font-bold block mb-0.5" style={{ color: C.textMuted }}>Take Profit (Prix)</span>
              <input
                type="number"
                step={assetDec === 5 ? '0.00001' : assetDec === 4 ? '0.0001' : assetDec === 3 ? '0.001' : '0.01'}
                value={takeProfit}
                onChange={e => setTakeProfit(e.target.value)}
                placeholder={currentMidPrice ? (currentMidPrice * 1.05).toFixed(assetDec) : '—'}
                className="w-full py-1.5 px-2 rounded text-[0.75rem] font-semibold outline-none"
                style={{ background: `${C.green}08`, border: `1px solid ${C.green}20`, color: C.textPrimary }}
              />
              {tpPercent !== null && tpPrice > 0 && (
                <span className="text-[0.4rem] font-mono block mt-0.5" style={{ color: C.green }}>
                  +{tpPercent.toFixed(2)}% du prix actuel
                </span>
              )}
              {currentMidPrice > 0 && !takeProfit && (
                <span className="text-[0.4rem] font-mono block mt-0.5" style={{ color: C.textMuted }}>
                  Actuel: {currentMidPrice.toFixed(assetDec)}
                </span>
              )}
            </div>
          </div>

          {/* BUY / SELL */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleOpenPosition('BUY')} disabled={opening} className="py-3 rounded-lg text-[0.85rem] font-black border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5" style={{ background: `linear-gradient(135deg, ${C.green}, ${C.greenDark})`, color: '#0a0e17', boxShadow: `0 2px 12px ${C.green}30` }}>
              {opening ? <div className="w-3.5 h-3.5 border-2 rounded-full" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#0a0e17', animation: 'spin 0.5s linear infinite' }}></div> : <><i className="fas fa-arrow-up text-[0.65rem]"></i> ACHETER</>}
            </button>
            <button onClick={() => handleOpenPosition('SELL')} disabled={opening} className="py-3 rounded-lg text-[0.85rem] font-black border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5" style={{ background: `linear-gradient(135deg, ${C.red}, ${C.redDark})`, color: '#fff', boxShadow: `0 2px 12px ${C.red}30` }}>
              {opening ? <div className="w-3.5 h-3.5 border-2 rounded-full" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff', animation: 'spin 0.5s linear infinite' }}></div> : <><i className="fas fa-arrow-down text-[0.65rem]"></i> VENDRE</>}
            </button>
          </div>
        </div>

        {/* ===== BOTTOM TABS ===== */}
        <div className="mx-2 my-1.5 mb-4 rounded-lg overflow-hidden" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          {/* Tab Headers */}
          <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
            {[
              { key: 'positions' as const, label: 'Positions', icon: 'fa-layer-group' },
              { key: 'history' as const, label: 'Historique', icon: 'fa-clock-rotate-left' },
              { key: 'leaderboard' as const, label: 'Classement', icon: 'fa-trophy' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} className="flex-1 py-2 flex items-center justify-center gap-1 border-none cursor-pointer" style={{ background: activeTab === tab.key ? `${C.blue}08` : 'transparent', borderBottom: activeTab === tab.key ? `2px solid ${C.blue}` : '2px solid transparent' }}>
                <i className={`fas ${tab.icon} text-[0.5rem]`} style={{ color: activeTab === tab.key ? C.blue : C.textMuted }}></i>
                <span className="text-[0.6rem] font-bold" style={{ color: activeTab === tab.key ? C.blue : C.textMuted }}>{tab.label}</span>
                {tab.key === 'positions' && positions.length > 0 && (
                  <span className="text-[0.45rem] font-bold px-1 rounded" style={{ background: C.blueBg, color: C.blue }}>{positions.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-2.5 max-h-64 overflow-y-auto sb">
            {/* POSITIONS TAB */}
            {activeTab === 'positions' && (
              <>
                {positions.length === 0 && recentClosed.length === 0 ? (
                  <div className="text-center py-6">
                    <i className="fas fa-chart-line text-[1.2rem] mb-2" style={{ color: C.textMuted }}></i>
                    <p className="text-[0.7rem]" style={{ color: C.textSecondary }}>Aucune position ouverte</p>
                    <p className="text-[0.55rem] mt-0.5" style={{ color: C.textMuted }}>Placez un ordre ACHETER ou VENDRE</p>
                  </div>
                ) : (
                  <>
                    {positions.map(pos => {
                      const isBuy = pos.direction === 'BUY';
                      const isProfit = pos.profitLoss >= 0;
                      return (
                        <div key={pos.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded text-[0.5rem] font-black" style={{ background: isBuy ? C.greenBg : C.redBg, color: isBuy ? C.green : C.red }}>{isBuy ? 'BUY' : 'SELL'}</span>
                            <div>
                              <div className="text-[0.7rem] font-bold" style={{ color: C.textPrimary }}>{pos.asset}</div>
                              <div className="text-[0.5rem]" style={{ color: C.textMuted }}>{formatMoney(pos.amount)} @ {formatPrice(pos.entryPrice, pos.asset)}</div>
                              {pos.stopLoss && <div className="text-[0.45rem]" style={{ color: C.red }}>SL: −{pos.stopLoss}%</div>}
                              {pos.takeProfit && <div className="text-[0.45rem]" style={{ color: C.green }}>TP: +{pos.takeProfit}%</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-[0.75rem] font-mono font-bold" style={{ color: isProfit ? C.green : C.red }}>{isProfit ? '+' : ''}{formatMoney(pos.profitLoss)}</div>
                              <div className="text-[0.5rem] font-semibold" style={{ color: isProfit ? C.green : C.red }}>{isProfit ? '+' : ''}{pos.plPercent.toFixed(2)}%</div>
                            </div>
                            <button onClick={() => handleClosePosition(pos.id)} disabled={closing === pos.id} className="px-2 py-1 rounded text-[0.55rem] font-bold border-none cursor-pointer" style={{ background: C.redBg, color: C.red }}>
                              Fermer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {recentClosed.slice(0, 3).map(pos => (
                      <div key={pos.id} className="flex items-center justify-between py-1.5 opacity-60" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[0.5rem] font-black" style={{ background: pos.direction === 'BUY' ? C.greenBg : C.redBg, color: pos.direction === 'BUY' ? C.green : C.red }}>{pos.direction === 'BUY' ? 'BUY' : 'SELL'}</span>
                          <span className="text-[0.65rem] font-bold" style={{ color: C.textSecondary }}>{pos.asset}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[0.65rem] font-mono font-bold" style={{ color: pos.result === 'win' ? C.green : C.red }}>{pos.result === 'win' ? '+' : ''}{formatMoney(pos.profitLoss)}</span>
                          <span className="text-[0.45rem] px-1 py-0.5 rounded" style={{ background: pos.result === 'win' ? C.greenBg : C.redBg, color: pos.result === 'win' ? C.green : C.red }}>{pos.closeReason}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            )}

            {/* HISTORY TAB */}
            {activeTab === 'history' && (
              <>
                {/* Summary */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 rounded" style={{ background: C.bgLight }}>
                    <div className="text-[0.45rem] uppercase font-bold" style={{ color: C.textMuted }}>Trades</div>
                    <div className="text-[0.8rem] font-bold font-mono" style={{ color: C.textPrimary }}>{historySummary.totalTrades}</div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ background: C.bgLight }}>
                    <div className="text-[0.45rem] uppercase font-bold" style={{ color: C.textMuted }}>Gagnés</div>
                    <div className="text-[0.8rem] font-bold font-mono" style={{ color: C.green }}>{historySummary.winCount}</div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ background: C.bgLight }}>
                    <div className="text-[0.45rem] uppercase font-bold" style={{ color: C.textMuted }}>Perdus</div>
                    <div className="text-[0.8rem] font-bold font-mono" style={{ color: C.red }}>{historySummary.lossCount}</div>
                  </div>
                  <div className="text-center p-2 rounded" style={{ background: C.bgLight }}>
                    <div className="text-[0.45rem] uppercase font-bold" style={{ color: C.textMuted }}>P/L</div>
                    <div className="text-[0.8rem] font-bold font-mono" style={{ color: historySummary.totalPL >= 0 ? C.green : C.red }}>{historySummary.totalPL >= 0 ? '+' : ''}{formatMoney(historySummary.totalPL)}</div>
                  </div>
                </div>
                {historyTrades.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-[0.7rem]" style={{ color: C.textSecondary }}>Aucun historique</p>
                  </div>
                ) : (
                  historyTrades.map(trade => {
                    const isWin = trade.result === 'win';
                    return (
                      <div key={trade.id} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: isWin ? C.greenBg : C.redBg }}>
                            <i className={`fas ${isWin ? 'fa-check' : 'fa-times'} text-[0.5rem]`} style={{ color: isWin ? C.green : C.red }}></i>
                          </div>
                          <div>
                            <div className="text-[0.65rem] font-bold" style={{ color: C.textPrimary }}>{trade.asset} <span style={{ color: isWin ? C.green : C.red }}>{trade.direction}</span></div>
                            <div className="text-[0.45rem]" style={{ color: C.textMuted }}>{formatMoney(trade.amount)} · {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : ''}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[0.7rem] font-mono font-bold" style={{ color: isWin ? C.green : C.red }}>{isWin ? '+' : ''}{formatMoney(trade.profitLoss)}</div>
                          <div className="text-[0.45rem]" style={{ color: C.textMuted }}>{trade.closeReason}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-[0.7rem]" style={{ color: C.textSecondary }}>Aucun classement</p>
                  </div>
                ) : (
                  leaderboard.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-black" style={{ background: idx === 0 ? '#ffd60030' : idx === 1 ? '#c0c0c030' : idx === 2 ? '#cd7f3230' : C.bgLight, color: idx === 0 ? '#ffd600' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : C.textSecondary }}>
                          {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : entry.rank}
                        </div>
                        <div>
                          <div className="text-[0.65rem] font-bold" style={{ color: C.textPrimary }}>{entry.name}</div>
                          <div className="text-[0.45rem]" style={{ color: C.textMuted }}>{entry.totalTrades} trades · {entry.winRate.toFixed(0)}% win</div>
                        </div>
                      </div>
                      <div className="text-[0.75rem] font-mono font-bold" style={{ color: entry.totalProfit >= 0 ? C.green : C.red }}>{entry.totalProfit >= 0 ? '+' : ''}{formatMoney(entry.totalProfit)}</div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== INSUFFICIENT BALANCE MODAL ===== */}
      {showInsufficientModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="mx-6 p-5 rounded-xl text-center" style={{ background: C.card, border: `1px solid ${C.border}`, maxWidth: 320 }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: C.redBg }}>
              <i className="fas fa-exclamation-triangle text-[1rem]" style={{ color: C.red }}></i>
            </div>
            <h3 className="text-[0.95rem] font-bold mb-1" style={{ color: C.textPrimary }}>Solde insuffisant</h3>
            <p className="text-[0.75rem] mb-4" style={{ color: C.textSecondary }}>Minimum ${MIN_BALANCE} requis sur le compte de trading</p>
            <div className="flex gap-2">
              <button onClick={() => setShowInsufficientModal(false)} className="flex-1 py-2.5 rounded-lg text-[0.75rem] font-bold border-none cursor-pointer" style={{ background: C.bgLight, color: C.textSecondary }}>Fermer</button>
              <button onClick={() => { setShowInsufficientModal(false); useAppStore.getState().setPage('wallet'); }} className="flex-1 py-2.5 rounded-lg text-[0.75rem] font-bold border-none cursor-pointer" style={{ background: C.blue, color: '#fff' }}>Verser</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
