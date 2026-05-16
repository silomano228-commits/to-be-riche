'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES, AI_TIPS } from '@/components/shared';

export default function AnalyticsScreen() {
  const { user, setPage } = useAppStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/analytics').then(r => r.json()).then(data => {
      if (data.success) setAnalytics(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!user) return null;

  const a = analytics || {};

  return (
    <>
      <Header title="Analyses" icon="fa-chart-bar" iconColor="#3B82F6" leftElement={<button onClick={() => setPage('profile')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Account Balances */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="text-[0.68rem] text-[#64748B] uppercase font-semibold mb-1">Compte Principal</div>
            <div className="text-[1.1rem] font-black text-[#1A2332]">{formatMoney(user.balance)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="text-[0.68rem] text-[#64748B] uppercase font-semibold mb-1">Compte d&apos;Investissement</div>
            <div className="text-[1.1rem] font-black text-[#009624]">{formatMoney(user.investBalance)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="text-[0.68rem] text-[#64748B] uppercase font-semibold mb-1">Compte de Trading</div>
            <div className="text-[1.1rem] font-black text-[#2563EB]">{formatMoney(user.tradeBalance)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="text-[0.68rem] text-[#64748B] uppercase font-semibold mb-1">Compte de Projet</div>
            <div className="text-[1.1rem] font-black text-[#EA580C]">{formatMoney(user.projectBalance)}</div>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-[#F0FDF4] rounded-xl p-4 border border-[#86EFAC]"><div className="text-[0.68rem] text-[#166534] uppercase font-semibold mb-1">Profit total</div><div className="text-[1.2rem] font-black text-[#009624]">{formatMoney(a.totalProfit || user.totalProfit)}</div></div>
          <div className="bg-[#FEF2F2] rounded-xl p-4 border border-[#FCA5A5]"><div className="text-[0.68rem] text-[#991B1B] uppercase font-semibold mb-1">Pertes totales</div><div className="text-[1.2rem] font-black text-[#EF4444]">{formatMoney(a.totalLoss || user.totalLoss)}</div></div>
        </div>

        {/* Net */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="text-[0.7rem] text-[#64748B] uppercase font-semibold mb-1">Bénéfice net</div>
          <div className={`text-[1.8rem] font-black ${(user.totalProfit - user.totalLoss) >= 0 ? 'text-[#00C853]' : 'text-[#EF4444]'}`}>{formatMoney(user.totalProfit - user.totalLoss)}</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Investissements', value: a.activeInvestments ?? '-', icon: 'fa-chart-line', color: '#00C853' },
            { label: 'Win Rate Trading', value: a.tradeWinRate ? `${a.tradeWinRate}%` : '-', icon: 'fa-bolt', color: '#3B82F6' },
            { label: 'Entreprises', value: a.activeEnterprises ?? '-', icon: 'fa-building', color: '#F97316' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
              <div className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center" style={{ backgroundColor: s.color + '15' }}><i className={`fas ${s.icon} text-[0.75rem]`} style={{ color: s.color }}></i></div>
              <div className="text-[0.9rem] font-bold text-[#1A2332]">{s.value}</div>
              <div className="text-[0.56rem] text-[#94A3B8] uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(59,130,246,0.15)]">
          <div className="flex items-center gap-2 mb-2"><i className="fas fa-robot text-[#60A5FA]"></i><span className="text-[0.78rem] font-semibold">Recommandation IA</span></div>
          <p className="text-[0.82rem] leading-relaxed text-[rgba(255,255,255,0.8)]">{AI_TIPS[Math.floor(Math.random() * AI_TIPS.length)]}</p>
        </div>

        {loading && <div className="text-center py-4"><div className="w-6 h-6 border-2 border-gray-200 border-t-[#3B82F6] rounded-full mx-auto" style={{ animation: 'spin 0.7s linear infinite' }} /></div>}
      </div>
    </>
  );
}
