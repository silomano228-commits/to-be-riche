'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

// Polyfill for roundRect on older browsers
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x: number, y: number, w: number, h: number, r: number | number[]) {
    const radii = typeof r === 'number' ? [r, r, r, r] : r;
    this.moveTo(x + radii[0], y);
    this.lineTo(x + w - radii[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + radii[1]);
    this.lineTo(x + w, y + h - radii[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - radii[2], y + h);
    this.lineTo(x + radii[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - radii[3]);
    this.lineTo(x, y + radii[0]);
    this.quadraticCurveTo(x, y, x + radii[0], y);
    this.closePath();
    return this;
  };
}

// ==================== TYPES ====================
interface ChartPoint {
  time: number;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PremiumChartProps {
  data: ChartPoint[];
  mode: 'line' | 'candle';
  color?: string;
  height?: number;
  accentColor?: string;
  showVolume?: boolean;
  animate?: boolean;
}

// ==================== MATH UTILS ====================

/** Catmull-Rom spline → cubic bezier control points for smooth curves */
function catmullRomToBezier(p0: number, p1: number, p2: number, p3: number, tension = 0.3) {
  const d1 = (p2 - p0) * tension;
  const d2 = (p3 - p1) * tension;
  return { cp1: p1 + d1, cp2: p2 - d2 };
}

/** Generate smooth SVG path using Catmull-Rom interpolation */
function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

  let path = `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = catmullRomToBezier(p0.y, p1.y, p2.y, p3.y).cp1;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = catmullRomToBezier(p0.y, p1.y, p2.y, p3.y).cp2;

    path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }

  return path;
}

/** Generate area fill path (smooth curve + bottom closing) */
function generateAreaPath(points: { x: number; y: number }[], height: number): string {
  if (points.length < 2) return '';
  const linePath = generateSmoothPath(points);
  return `${linePath} L${points[points.length - 1].x.toFixed(2)},${height} L${points[0].x.toFixed(2)},${height} Z`;
}

/** Simple moving average */
function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) { result.push(data[i]); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += data[j];
    result.push(sum / period);
  }
  return result;
}

/** Format price with appropriate decimals */
function fmtPrice(v: number): string {
  if (v >= 1000) return v.toFixed(0);
  if (v >= 100) return v.toFixed(1);
  if (v >= 10) return v.toFixed(2);
  return v.toFixed(3);
}

/** Format time */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// ==================== CANVAS CHART ====================
export default function PremiumChart({
  data,
  mode,
  color = '#3B82F6',
  height = 280,
  accentColor,
  showVolume = true,
  animate = true,
}: PremiumChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const dataRef = useRef<ChartPoint[]>(data);
  const prevDataRef = useRef<ChartPoint[]>(data);
  const transitionRef = useRef(1);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchRef = useRef(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; price: number; time: number; idx: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 600, h: height });

  const upColor = '#00E676';
  const downColor = '#EF4444';
  const lineColor = accentColor || color;
  const gridColor = 'rgba(255,255,255,0.04)';
  const gridColorStrong = 'rgba(255,255,255,0.07)';
  const textColor = 'rgba(255,255,255,0.3)';
  const textMuted = 'rgba(255,255,255,0.18)';

  // Compute chart dimensions
  const PADDING = useMemo(() => ({ top: 12, right: 58, bottom: 28, left: 8 }), []);
  const chartW = canvasSize.w - PADDING.left - PADDING.right;
  const chartH = canvasSize.h - PADDING.top - PADDING.bottom - (showVolume ? 40 : 0);
  const volH = showVolume ? 36 : 0;

  // Update data ref and trigger transition
  useEffect(() => {
    if (dataRef.current !== data) {
      prevDataRef.current = dataRef.current;
      dataRef.current = data;
      if (animate) transitionRef.current = 0;
    }
  }, [data, animate]);

  // Responsive resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setCanvasSize({ w: Math.max(300, Math.floor(width)), h: height });
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, [height]);

  // Mouse/touch handlers
  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      isTouchRef.current = true;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const dpr = window.devicePixelRatio || 1;
    const x = (clientX - rect.left);
    const y = (clientY - rect.top);

    // Find closest data point
    const plotX = x - PADDING.left;
    const idx = Math.round((plotX / chartW) * (data.length - 1));
    if (idx < 0 || idx >= data.length) { setTooltip(null); return; }

    const point = data[idx];
    const px = PADDING.left + (idx / (data.length - 1)) * chartW;

    // Price range for Y
    const prices = data.map(d => mode === 'line' ? d.price : d.high);
    const lows = data.map(d => mode === 'line' ? d.price : d.low);
    const minP = Math.min(...lows);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;
    const py = PADDING.top + chartH - ((point.price - minP) / range) * chartH;

    setTooltip({ x: px, y: py, price: point.price, time: point.time, idx });
    mouseRef.current = { x, y };
  }, [data, mode, PADDING, chartW, chartH]);

  const handlePointerLeave = useCallback(() => {
    setTooltip(null);
    mouseRef.current = null;
  }, []);

  // ==================== RENDER LOOP ====================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.w * dpr;
    canvas.height = canvasSize.h * dpr;
    ctx.scale(dpr, dpr);

    const currentData = dataRef.current;
    if (currentData.length < 2) return;

    // Price range
    const allPrices = mode === 'line'
      ? currentData.map(d => d.price)
      : currentData.flatMap(d => [d.high, d.low]);
    let minP = Math.min(...allPrices);
    let maxP = Math.max(...allPrices);
    const padding = (maxP - minP) * 0.08 || 1;
    minP -= padding;
    maxP += padding;
    const range = maxP - minP || 1;

    const maxVol = Math.max(...currentData.map(d => d.volume), 1);

    // Transition animation
    if (transitionRef.current < 1) {
      transitionRef.current = Math.min(1, transitionRef.current + 0.08);
    }
    const t = transitionRef.current;

    // Coordinate helpers
    const xForIdx = (i: number) => PADDING.left + (i / (currentData.length - 1)) * chartW;
    const yForPrice = (p: number) => PADDING.top + chartH - ((p - minP) / range) * chartH;

    // ==================== CLEAR ====================
    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h);

    // ==================== GRID ====================
    ctx.save();
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = PADDING.top + (i / gridSteps) * chartH;
      const price = maxP - (i / gridSteps) * range;

      // Grid line
      ctx.strokeStyle = i === 0 || i === gridSteps ? gridColorStrong : gridColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash(i === 0 || i === gridSteps ? [] : [2, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = textColor;
      ctx.font = '10px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(fmtPrice(price), PADDING.left + chartW + 6, y + 3);
    }

    // Time labels
    const timeSteps = Math.min(6, currentData.length);
    for (let i = 0; i < timeSteps; i++) {
      const idx = Math.round((i / (timeSteps - 1)) * (currentData.length - 1));
      const x = xForIdx(idx);
      const time = currentData[idx].time;

      // Vertical grid line
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, PADDING.top + chartH);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = textMuted;
      ctx.font = '9px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmtTime(time), x, canvasSize.h - 6);
    }
    ctx.restore();

    // ==================== MODE: LINE ====================
    if (mode === 'line') {
      const points = currentData.map((d, i) => ({ x: xForIdx(i), y: yForPrice(d.price) }));
      // SMA line
      const smaData = sma(currentData.map(d => d.price), 7);
      const smaPoints = smaData.map((p, i) => ({ x: xForIdx(i), y: yForPrice(p) }));

      ctx.save();

      // ---- Area gradient fill ----
      const areaGrad = ctx.createLinearGradient(0, PADDING.top, 0, PADDING.top + chartH);
      areaGrad.addColorStop(0, lineColor + '28');
      areaGrad.addColorStop(0.4, lineColor + '12');
      areaGrad.addColorStop(0.8, lineColor + '04');
      areaGrad.addColorStop(1, 'transparent');

      ctx.beginPath();
      // Draw smooth area
      const smoothPath = generateSmoothPath(points);
      const areaPath = new Path2D(generateAreaPath(points, PADDING.top + chartH));
      ctx.clip(areaPath, undefined);
      ctx.fillStyle = areaGrad;
      ctx.fillRect(PADDING.left, PADDING.top, chartW, chartH);
      ctx.restore();

      // ---- Glow layer ----
      ctx.save();
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = lineColor + '40';
      ctx.lineWidth = 4;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const glowPath = new Path2D(smoothPath);
      ctx.stroke(glowPath);
      ctx.restore();

      // ---- Main line ----
      ctx.save();
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const mainPath = new Path2D(smoothPath);
      ctx.stroke(mainPath);
      ctx.restore();

      // ---- SMA line (subtle) ----
      if (smaPoints.length >= 2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251,191,36,0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.lineJoin = 'round';
        const smaPath = new Path2D(generateSmoothPath(smaPoints));
        ctx.stroke(smaPath);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // ---- Live dot ----
      const lastPt = points[points.length - 1];
      const lastPrice = currentData[currentData.length - 1].price;

      // Outer pulse
      ctx.save();
      const pulseRadius = 6 + Math.sin(Date.now() / 400) * 3;
      const pulseGrad = ctx.createRadialGradient(lastPt.x, lastPt.y, 0, lastPt.x, lastPt.y, pulseRadius);
      pulseGrad.addColorStop(0, lineColor + '40');
      pulseGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = pulseGrad;
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, pulseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Inner dot
      ctx.save();
      ctx.fillStyle = lineColor;
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Live price label on right
      ctx.save();
      const labelY = lastPt.y;
      ctx.fillStyle = lineColor;
      const lw = 52;
      const lh = 18;
      const lx = PADDING.left + chartW + 2;
      const ly = labelY - lh / 2;
      ctx.beginPath();
      ctx.roundRect(lx, ly, lw, lh, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmtPrice(lastPrice), lx + lw / 2, labelY + 3);
      ctx.restore();

      // ---- Dashed line from dot to Y axis ----
      ctx.save();
      ctx.strokeStyle = lineColor + '30';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(lastPt.x, lastPt.y);
      ctx.lineTo(PADDING.left + chartW, lastPt.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // ---- Volume bars (line mode) ----
      if (showVolume) {
        const barW = Math.max(1, chartW / currentData.length * 0.5);
        const volBase = PADDING.top + chartH + volH;
        ctx.save();
        currentData.forEach((d, i) => {
          const x = xForIdx(i) - barW / 2;
          const h = (d.volume / maxVol) * volH;
          const prevClose = i > 0 ? currentData[i - 1].close : d.close;
          const isUp = d.close >= prevClose;
          ctx.fillStyle = isUp ? upColor + '18' : downColor + '18';
          ctx.fillRect(x, volBase - h, barW, h);
        });
        ctx.restore();
      }
    }

    // ==================== MODE: CANDLESTICK ====================
    if (mode === 'candle') {
      const gap = chartW / currentData.length;
      const candleW = Math.max(2, gap * 0.55);

      // SMA overlay
      const smaData = sma(currentData.map(d => d.close), 7);
      const smaPoints = smaData.map((p, i) => ({ x: xForIdx(i), y: yForPrice(p) }));

      // ---- Volume bars ----
      if (showVolume) {
        const volBase = PADDING.top + chartH + volH;
        ctx.save();
        currentData.forEach((d, i) => {
          const x = xForIdx(i) - candleW / 2;
          const h = (d.volume / maxVol) * volH;
          const isUp = d.close >= d.open;
          const volGrad = ctx.createLinearGradient(0, volBase - h, 0, volBase);
          if (isUp) {
            volGrad.addColorStop(0, upColor + '25');
            volGrad.addColorStop(1, upColor + '08');
          } else {
            volGrad.addColorStop(0, downColor + '25');
            volGrad.addColorStop(1, downColor + '08');
          }
          ctx.fillStyle = volGrad;
          ctx.beginPath();
          ctx.roundRect(x, volBase - h, candleW, h, 1);
          ctx.fill();
        });
        ctx.restore();
      }

      // ---- Candles ----
      ctx.save();
      currentData.forEach((d, i) => {
        const x = xForIdx(i);
        const isUp = d.close >= d.open;
        const c = isUp ? upColor : downColor;

        const bodyTop = yForPrice(Math.max(d.open, d.close));
        const bodyBot = yForPrice(Math.min(d.open, d.close));
        const wickTop = yForPrice(d.high);
        const wickBot = yForPrice(d.low);
        const bodyH = Math.max(1, bodyBot - bodyTop);

        // Wick
        ctx.strokeStyle = c + '90';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, wickTop);
        ctx.lineTo(x, wickBot);
        ctx.stroke();

        // Body with gradient
        const bodyGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyBot);
        if (isUp) {
          bodyGrad.addColorStop(0, c);
          bodyGrad.addColorStop(1, c + 'cc');
        } else {
          bodyGrad.addColorStop(0, c);
          bodyGrad.addColorStop(1, c + 'cc');
        }
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(x - candleW / 2, bodyTop, candleW, bodyH, 1);
        ctx.fill();

        // Subtle glow on body
        if (i === currentData.length - 1) {
          ctx.shadowColor = c;
          ctx.shadowBlur = 6;
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.roundRect(x - candleW / 2, bodyTop, candleW, bodyH, 1);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      ctx.restore();

      // ---- SMA line ----
      if (smaPoints.length >= 2) {
        ctx.save();
        ctx.strokeStyle = 'rgba(251,191,36,0.4)';
        ctx.lineWidth = 1.2;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const smaPath = new Path2D(generateSmoothPath(smaPoints));
        ctx.stroke(smaPath);
        ctx.restore();
      }

      // ---- Live price label ----
      const lastCandle = currentData[currentData.length - 1];
      const lastY = yForPrice(lastCandle.close);
      const lastX = xForIdx(currentData.length - 1);
      const isUpLast = lastCandle.close >= lastCandle.open;
      const lastColor = isUpLast ? upColor : downColor;

      ctx.save();
      const lw = 52;
      const lh = 18;
      const lx = PADDING.left + chartW + 2;
      const ly = lastY - lh / 2;
      ctx.fillStyle = lastColor;
      ctx.beginPath();
      ctx.roundRect(lx, ly, lw, lh, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmtPrice(lastCandle.close), lx + lw / 2, lastY + 3);
      ctx.restore();

      // Dashed line to label
      ctx.save();
      ctx.strokeStyle = lastColor + '30';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(PADDING.left + chartW, lastY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // ==================== CROSSHAIR & TOOLTIP ====================
    if (tooltip && currentData.length > 1) {
      const { x, y, price, time, idx } = tooltip;
      const d = currentData[idx];

      // Vertical crosshair
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x, PADDING.top);
      ctx.lineTo(x, PADDING.top + chartH + (showVolume ? volH : 0));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Horizontal crosshair
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PADDING.left, y);
      ctx.lineTo(PADDING.left + chartW, y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Highlight dot
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lineColor;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Price tag on Y axis
      ctx.save();
      const tagW = 52;
      const tagH = 18;
      const tagX = PADDING.left + chartW + 2;
      const tagY = y - tagH / 2;
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 9px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmtPrice(price), tagX + tagW / 2, y + 3);
      ctx.restore();

      // Time tag on X axis
      ctx.save();
      const ttagW = 42;
      const ttagH = 16;
      const ttagX = x - ttagW / 2;
      const ttagY = PADDING.top + chartH + (showVolume ? volH : 0) + 2;
      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(ttagX, ttagY, ttagW, ttagH, 3);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px ui-monospace, SFMono-Regular, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(fmtTime(time), x, ttagY + 11);
      ctx.restore();
    }

  }, [data, mode, canvasSize, tooltip, lineColor, PADDING, chartW, chartH, volH, showVolume, upColor, downColor, gridColor, gridColorStrong, textColor, textMuted]);

  // Animate: request animation frame loop for pulse effect
  useEffect(() => {
    let running = true;
    const tick = () => {
      if (!running) return;
      // Trigger re-render by setting tooltip (if mouse is over)
      // We use a simpler approach: just redraw on interval
      animFrameRef.current = requestAnimationFrame(tick);
    };
    // We don't need continuous rendering unless animating
    // Just re-render on data changes (handled by useEffect above)
    return () => { running = false; cancelAnimationFrame(animFrameRef.current); };
  }, []);

  // Periodic pulse animation for live dot
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 800);
    return () => clearInterval(t);
  }, []);

  return (
    <div ref={containerRef} className="w-full relative select-none" style={{ height: canvasSize.h }}>
      <canvas
        ref={canvasRef}
        className="w-full"
        style={{ height: canvasSize.h, cursor: 'crosshair' }}
        onMouseMove={handlePointerMove}
        onTouchMove={handlePointerMove}
        onMouseLeave={handlePointerLeave}
        onTouchEnd={handlePointerLeave}
      />

      {/* Floating tooltip info box */}
      {tooltip && data.length > tooltip.idx && (
        <div
          className="absolute pointer-events-none z-10 bg-[rgba(11,17,32,0.92)] backdrop-blur-md rounded-lg px-3 py-2 border border-[rgba(255,255,255,0.08)] shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          style={{
            left: tooltip.x > canvasSize.w / 2 ? tooltip.x - 160 : tooltip.x + 12,
            top: Math.max(4, tooltip.y - 50),
            minWidth: 140,
          }}
        >
          <div className="text-[0.72rem] font-bold text-white mb-1">
            {data[tooltip.idx].close >= data[tooltip.idx].open ? (
              <span className="text-[#00E676]">▲</span>
            ) : (
              <span className="text-[#EF4444]">▼</span>
            )}
            {' '}{fmtPrice(data[tooltip.idx].price)}
          </div>
          {mode === 'candle' && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[0.6rem]">
              <span className="text-[rgba(255,255,255,0.4)]">O</span><span className="text-white font-mono">{fmtPrice(data[tooltip.idx].open)}</span>
              <span className="text-[rgba(255,255,255,0.4)]">H</span><span className="text-[#00E676] font-mono">{fmtPrice(data[tooltip.idx].high)}</span>
              <span className="text-[rgba(255,255,255,0.4)]">L</span><span className="text-[#EF4444] font-mono">{fmtPrice(data[tooltip.idx].low)}</span>
              <span className="text-[rgba(255,255,255,0.4)]">C</span><span className="text-white font-mono">{fmtPrice(data[tooltip.idx].close)}</span>
            </div>
          )}
          <div className="text-[0.55rem] text-[rgba(255,255,255,0.3)] mt-1">
            {fmtTime(data[tooltip.idx].time)} · Vol: {data[tooltip.idx].volume?.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
