'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';

export const LOGO_URL = 'https://z-cdn-media.chatglm.cn/files/1153c12e-46c2-4ff4-9bfb-9ee1ea9ad677.png?auth_key=1875725907-dba9b296a2b347a582e281f8c13d5dd1-0-abc6e2dfe8db025886d8c5cccb41f197';

export const INVEST_LEVELS = [
  { level: 1, name: 'Débutant', color: '#22C55E', bg: 'bg-[rgba(34,197,94,0.12)]', border: 'border-[rgba(34,197,94,0.15)]', min: 5,    max: 15,   cycles: 0, rate: 5, totalReturn: 0, profit: 0, icon: 'fa-seedling',   requiredReferrals: 0,  unlockFee: 0, category: 'petit', unlimited: true },
  { level: 2, name: 'Business',  color: '#14B8A6', bg: 'bg-[rgba(20,184,166,0.12)]', border: 'border-[rgba(20,184,166,0.15)]', min: 65,   max: 250,  cycles: 0, rate: 5, totalReturn: 0, profit: 0, icon: 'fa-chart-line', requiredReferrals: 12, unlockFee: 0, category: 'gros', unlimited: true },
  { level: 3, name: 'Elite',     color: '#F59E0B', bg: 'bg-[rgba(245,158,11,0.12)]', border: 'border-[rgba(245,158,11,0.15)]', min: 500,  max: 3000, cycles: 0, rate: 5, totalReturn: 0, profit: 0, icon: 'fa-crown',      requiredReferrals: 25, unlockFee: 0, category: 'gros', unlimited: true },
];

export const ENTERPRISE_TYPES = [
  { type: 'starter', name: 'Starter', days: 30, minRet: 150, maxRet: 150, color: '#22C55E', icon: 'fa-seedling', risk: 'Faible', minAmount: 10 },
  { type: 'growth', name: 'Growth', days: 45, minRet: 200, maxRet: 200, color: '#3B82F6', icon: 'fa-chart-line', risk: 'Modéré', minAmount: 10 },
  { type: 'premium', name: 'Premium', days: 60, minRet: 275, maxRet: 275, color: '#8B5CF6', icon: 'fa-crown', risk: 'Considéré', minAmount: 10 },
  { type: 'elite', name: 'Elite', days: 75, minRet: 350, maxRet: 350, color: '#F59E0B', icon: 'fa-gem', risk: 'Élevé', minAmount: 10 },
  { type: 'vip', name: 'VIP', days: 90, minRet: 450, maxRet: 450, color: '#EF4444', icon: 'fa-rocket', risk: 'Très élevé', minAmount: 10 },
];

export const AI_TIPS = [
  "Le niveau Débutant est libre d'accès. Commencez dès maintenant !",
  "Investissement : 5% de gains quotidiens sur vos investissements !",
  "Débloquez le niveau Business avec 12 parrainés actifs.",
  "Gros investissement : 5%/jour à partir de 65 $ !",
  "Le niveau Elite (500 $ - 3000 $) nécessite 25 parrainés.",
  "Nouveau projet entreprise disponible. Rendement élevé possible.",
  "Le trading rapide peut être lucratif, mais restez prudent.",
  "Marché en correction. C'est le moment d'acheter bas.",
  "Parrainez des amis pour débloquer les niveaux supérieurs gratuitement !",
  "Réclamez vos gains quotidiens pour maximiser vos profits.",
];

export const ENTERPRISE_NAMES = [
  'TechCorp Industries', 'GreenEnergy Ltd', 'AgroVista Holdings', 'FinancePlus Group',
  'Immobilier Royale', 'SantéGlobal Inc', 'CryptoVault Systems', 'AeroSpace Dynamics',
  'BioTech Solutions', 'DigitalMarket Pro', 'OceanTrade Corp', 'SolarPower SA',
];

// ==================== LOGO ====================
export function LogoImg({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className={`bg-[#22C55E] rounded-[22px] flex items-center justify-center text-[#050506] font-black ${className}`} style={style}>BR</div>;
  }
  return (
    <img src={LOGO_URL} alt="Be Rich" className={className} style={{ objectFit: 'contain', ...style }}
      onError={() => setFailed(true)}
    />
  );
}

// ==================== TOASTS ====================
export function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] w-[88%] max-w-[360px] flex flex-col-reverse gap-1.5 pointer-events-none items-center">
      {toasts.map((t) => (
        <div key={t.id} className="bg-[#F3F4F6] text-[#1F2937] px-5 py-3 rounded-full text-center text-[0.8rem] shadow-[0_2px_8px_rgba(0,0,0,0.06)] pointer-events-auto font-medium flex items-center justify-center gap-2"
          style={{ animation: 'tIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', borderLeft: `4px solid ${t.type === 'success' ? '#22C55E' : t.type === 'error' ? '#F87171' : '#3B82F6'}` }}>
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
        <div key={n.id} className="bg-[#F3F4F6]/95 backdrop-blur-xl p-3 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-2.5 pointer-events-auto w-full"
          style={{ animation: 'nIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', borderLeft: '3px solid #22C55E' }}>
          <div className="flex-1 min-w-0 text-[0.78rem] text-[#1F2937]">{esc(n.text)}</div>
          <button onClick={() => removeNotification(n.id)} className="bg-transparent border-none text-[rgba(0,0,0,0.35)] cursor-pointer p-1 text-[0.65rem]">✕</button>
        </div>
      ))}
    </div>
  );
}

// ==================== MODAL ====================
export function Modal({ title, text, okText = 'Confirmer', okClass = 'bg-[#22C55E] text-[#050506] font-bold', onOk, onCancel }: {
  title: string; text: string; okText?: string; okClass?: string; onOk: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.3)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={onCancel}>
      <div className="bg-[#FFFFFF] rounded-2xl p-7 w-[88%] max-w-[320px] text-center border border-[rgba(0,0,0,0.08)] shadow-[0_8px_24px_rgba(0,0,0,0.1)]" style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#1F2937]">{title}</h3>
        <p className="text-[rgba(0,0,0,0.55)] text-[0.82rem] mb-5 leading-relaxed">{text}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-[rgba(0,0,0,0.1)] bg-transparent text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95">Annuler</button>
          <button onClick={onOk} className={`flex-1 py-3 rounded-xl text-[0.82rem] cursor-pointer transition-transform active:scale-95 ${okClass}`}>{okText}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== HEADER ====================
export function Header({ title, icon, iconColor, rightElement, leftElement }: { title: React.ReactNode; icon?: string; iconColor?: string; rightElement?: React.ReactNode; leftElement?: React.ReactNode }) {
  return (
    <header className="h-[58px] bg-white/80 backdrop-blur-2xl flex items-center justify-between px-[18px] sticky top-0 z-20 shrink-0 border-b border-[rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        {leftElement}
        <div className="text-[1rem] font-black text-[#1F2937] flex items-center gap-2">
          {icon && <i className={`fas ${icon} text-[0.85rem]`} style={iconColor ? { color: iconColor } : { color: '#22C55E' }} />}
          {title}
        </div>
      </div>
      {rightElement || null}
    </header>
  );
}
