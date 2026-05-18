'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';

export const LOGO_URL = 'https://z-cdn-media.chatglm.cn/files/1153c12e-46c2-4ff4-9bfb-9ee1ea9ad677.png?auth_key=1875725907-dba9b296a2b347a582e281f8c13d5dd1-0-abc6e2dfe8db025886d8c5cccb41f197';

export const INVEST_LEVELS = [
  { level: 1, name: 'Micro', color: '#B89B5E', bg: 'bg-[#161719]', border: 'border-[rgba(184,155,94,0.15)]', min: 2, max: 5, cycles: 35, rate: 5, icon: 'fa-seedling' },
  { level: 2, name: 'Standard', color: '#D4B87A', bg: 'bg-[#161719]', border: 'border-[rgba(184,155,94,0.15)]', min: 5.5, max: 10, cycles: 25, rate: 7.5, icon: 'fa-chart-line' },
  { level: 3, name: 'High Yield', color: '#B89B5E', bg: 'bg-[#161719]', border: 'border-[rgba(184,155,94,0.15)]', min: 10.5, max: 20, cycles: 20, rate: 9.5, icon: 'fa-fire' },
  { level: 4, name: 'Elite', color: '#D4B87A', bg: 'bg-[#161719]', border: 'border-[rgba(184,155,94,0.15)]', min: 20.5, max: 50, cycles: 20, rate: 12.5, icon: 'fa-crown' },
];

export const ENTERPRISE_TYPES = [
  { type: 'short', name: 'Court terme', days: 5, minRet: 15, maxRet: 28, color: '#B89B5E', icon: 'fa-bolt', risk: 'Faible', minAmount: 5 },
  { type: 'medium', name: 'Moyen terme', days: 10, minRet: 30, maxRet: 48, color: '#D4B87A', icon: 'fa-building', risk: 'Modéré', minAmount: 5 },
  { type: 'long', name: 'Long terme', days: 20, minRet: 50, maxRet: 68, color: '#B89B5E', icon: 'fa-industry', risk: 'Considéré', minAmount: 5 },
  { type: 'ultralong', name: 'Ultra long', days: 30, minRet: 70, maxRet: 95, color: '#D4B87A', icon: 'fa-rocket', risk: 'Élevé', minAmount: 5 },
];

export const AI_TIPS = [
  "Le marché tech est en hausse. Investissez maintenant.",
  "Volatilité détectée sur le marché. Prudence recommandée.",
  "L'Elite Investment offre 12.5%/cycle. Opportunité rare.",
  "Tendance haussière sur 3 jours. Le momentum est fort.",
  "Conseil IA: Diversifiez vos investissements entre les niveaux.",
  "Nouveau projet entreprise disponible. Rendement élevé possible.",
  "Le trading rapide peut être lucratif, mais restez prudent.",
  "Marché en correction. C'est le moment d'acheter bas.",
  "Les investisseurs élites gagnent 2x plus. Passez au niveau supérieur.",
  "Réclamez vos gains quotidiens pour maximiser vos profits.",
];

export const ENTERPRISE_NAMES = [
  'TechCorp Industries', 'GreenEnergy Ltd', 'AgroVista Holdings', 'FinancePlus Group',
  'Immobilier Royale', 'SantéGlobal Inc', 'CryptoVault Systems', 'AeroSpace Dynamics',
  'BioTech Solutions', 'DigitalMarket Pro', 'OceanTrade Corp', 'SolarPower SA',
];

// ==================== LOGO ====================
export function LogoImg({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img src={LOGO_URL} alt="Be Rich" className={className} style={{ objectFit: 'contain', ...style }}
      onError={(e) => { const t = e.target as HTMLImageElement; const p = t.parentElement; if (p) { const div = document.createElement('div'); div.className = `bg-[#B89B5E] rounded-[22px] flex items-center justify-center text-[#050506] font-black ${className}`; div.textContent = 'BR'; div.style.filter = t.style.filter; p.replaceChild(div, t); } }}
    />
  );
}

// ==================== TOASTS ====================
export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[3000] w-[88%] max-w-[360px] flex flex-col-reverse gap-1.5 pointer-events-none items-center">
      {toasts.map((t) => (
        <div key={t.id} className="bg-[#1A1B1F] text-[#EDEDEF] px-5 py-3 rounded-full text-center text-[0.8rem] shadow-[0_8px_40px_rgba(0,0,0,0.4)] pointer-events-auto font-medium flex items-center justify-center gap-2"
          style={{ animation: 'tIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', borderLeft: `4px solid ${t.type === 'success' ? '#B89B5E' : t.type === 'error' ? '#F87171' : '#B89B5E'}` }}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {esc(t.message)}
          <button onClick={() => removeToast(t.id)} className="ml-1 opacity-50 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}

// ==================== NOTIFICATIONS ====================
export function NotificationContainer() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);
  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 w-[92%] max-w-[390px] z-[2000] flex flex-col gap-1.5 pointer-events-none items-center">
      {notifications.map((n) => (
        <div key={n.id} className="bg-[#1A1B1F]/95 backdrop-blur-xl p-3 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.4)] flex items-center gap-2.5 pointer-events-auto w-full"
          style={{ animation: 'nIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', borderLeft: '3px solid #B89B5E' }}>
          <div className="flex-1 min-w-0 text-[0.78rem] text-[#EDEDEF]">{esc(n.text)}</div>
          <button onClick={() => removeNotification(n.id)} className="bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-1 text-[0.65rem]">✕</button>
        </div>
      ))}
    </div>
  );
}

// ==================== MODAL ====================
export function Modal({ title, text, okText = 'Confirmer', okClass = 'bg-[#B89B5E] text-[#050506] font-bold', onOk, onCancel }: {
  title: string; text: string; okText?: string; okClass?: string; onOk: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-[rgba(5,5,6,0.7)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={onCancel}>
      <div className="bg-[#0E0F11] rounded-2xl p-7 w-[88%] max-w-[320px] text-center border border-[rgba(255,255,255,0.06)] shadow-[0_20px_60px_rgba(0,0,0,0.5)]" style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#EDEDEF]">{title}</h3>
        <p className="text-[rgba(255,255,255,0.45)] text-[0.82rem] mb-5 leading-relaxed">{text}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-transparent text-[rgba(255,255,255,0.45)] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95">Annuler</button>
          <button onClick={onOk} className={`flex-1 py-3 rounded-xl text-[0.82rem] cursor-pointer transition-transform active:scale-95 ${okClass}`}>{okText}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== HEADER ====================
export function Header({ title, icon, iconColor, rightElement, leftElement }: { title: React.ReactNode; icon?: string; iconColor?: string; rightElement?: React.ReactNode; leftElement?: React.ReactNode }) {
  return (
    <header className="h-[58px] bg-[#0A0A0B]/90 backdrop-blur-2xl flex items-center justify-between px-[18px] sticky top-0 z-20 shrink-0 border-b border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2">
        {leftElement}
        <div className="text-[1rem] font-bold text-[#EDEDEF] flex items-center gap-2">
          {icon && <i className={`fas ${icon} text-[0.85rem]`} style={iconColor ? { color: iconColor } : { color: '#B89B5E' }} />}
          {title}
        </div>
      </div>
      {rightElement || null}
    </header>
  );
}
