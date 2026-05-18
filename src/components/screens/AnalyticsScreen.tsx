'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser, type Transaction } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES, AI_TIPS } from '@/components/shared';

function SectionHeader({ icon, title, color }: { icon: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '18' }}>
        <i className={`fas ${icon} text-[0.65rem]`} style={{ color }}></i>
      </div>
      <h3 className="text-[0.82rem] font-bold text-[#1A2332]">{title}</h3>
    </div>
  );
}

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

  // Prepare recent transactions for bar chart (last 7)
  const recentTxns = useMemo(() => {
    const txns = (user?.transactions || []).slice(0, 7);
    if (txns.length === 0) return [];
    const maxAbs = Math.max(...txns.map((t: Transaction) => Math.abs(t.amount)), 1);
    return txns.map((t: Transaction) => ({
      ...t,
      heightPct: (Math.abs(t.amount) / maxAbs) * 100,
      isPositive: t.amount >= 0,
    }));
  }, [user?.transactions]);

  // Pick a stable AI tip (use index from current minute to avoid random re-renders)
  const aiTipIndex = useMemo(() => {
    return Math.floor(Date.now() / 60000) % AI_TIPS.length;
  }, []);

  if (!user) return null;

  const a = analytics || {};

  // Compute net
  const netProfit = (user.totalProfit || 0) - (user.totalLoss || 0);

  return (
    <>
      <Header title="Analyses" icon="fa-chart-bar" iconColor="#3B82F6" leftElement={<button onClick={() => setPage('profile')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Account Balances Section */}
        <SectionHeader icon="fa-wallet" title="Comptes" color="#F97316" />
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[#F1F5F9] flex items-center justify-center"><i className="fas fa-coins text-[0.45rem] text-[#64748B]"></i></div>
              <div className="text-[0.62rem] text-[#64748B] uppercase font-semibold">Principal</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#1A2332]">{formatMoney(user.balance)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[#00C853]/10 flex items-center justify-center"><i className="fas fa-chart-line text-[0.45rem] text-[#00C853]"></i></div>
              <div className="text-[0.62rem] text-[#64748B] uppercase font-semibold">Investissement</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#009624]">{formatMoney(user.investBalance)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[#3B82F6]/10 flex items-center justify-center"><i className="fas fa-bolt text-[0.45rem] text-[#3B82F6]"></i></div>
              <div className="text-[0.62rem] text-[#64748B] uppercase font-semibold">Trading</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#2563EB]">{formatMoney(user.tradeBalance)}</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[#F97316]/10 flex items-center justify-center"><i className="fas fa-building text-[0.45rem] text-[#F97316]"></i></div>
              <div className="text-[0.62rem] text-[#64748B] uppercase font-semibold">Projet</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#EA580C]">{formatMoney(user.projectBalance)}</div>
          </div>
        </div>

        {/* Profit/Loss Section */}
        <SectionHeader icon="fa-scale-balanced" title="Résultats" color="#00C853" />
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <div className="bg-gradient-to-br from-[#DCFCE7] to-[#BBF7D0] rounded-xl p-4 border border-[#86EFAC]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-[#00C853]/20 flex items-center justify-center"><i className="fas fa-arrow-trend-up text-[0.5rem] text-[#00C853]"></i></div>
              <div className="text-[0.62rem] text-[#166534] uppercase font-semibold">Profit total</div>
            </div>
            <div className="text-[1.2rem] font-black text-[#009624]">{formatMoney(a.totalProfit || user.totalProfit)}</div>
          </div>
          <div className="bg-gradient-to-br from-[#FEE2E2] to-[#FECACA] rounded-xl p-4 border border-[#FCA5A5]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-[#EF4444]/20 flex items-center justify-center"><i className="fas fa-arrow-trend-down text-[0.5rem] text-[#EF4444]"></i></div>
              <div className="text-[0.62rem] text-[#991B1B] uppercase font-semibold">Pertes totales</div>
            </div>
            <div className="text-[1.2rem] font-black text-[#EF4444]">{formatMoney(a.totalLoss || user.totalLoss)}</div>
          </div>
        </div>

        {/* Net */}
        <div className={`rounded-2xl p-4 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border ${
          netProfit >= 0 ? 'bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border-[#86EFAC]' : 'bg-gradient-to-br from-[#FEF2F2] to-[#FEE2E2] border-[#FCA5A5]'
        }`}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-[#00C853]/15' : 'bg-[#EF4444]/15'}`}>
              <i className={`fas ${netProfit >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-[0.5rem]`} style={{ color: netProfit >= 0 ? '#00C853' : '#EF4444' }}></i>
            </div>
            <div className="text-[0.7rem] text-[#64748B] uppercase font-semibold">Bénéfice net</div>
          </div>
          <div className={`text-[1.8rem] font-black ${netProfit >= 0 ? 'text-[#00C853]' : 'text-[#EF4444]'}`}>
            {netProfit >= 0 ? '+' : ''}{formatMoney(netProfit)}
          </div>
        </div>

        {/* Stats Grid Section */}
        <SectionHeader icon="fa-chart-pie" title="Statistiques" color="#3B82F6" />
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Investissements', value: a.activeInvestments ?? '-', icon: 'fa-chart-line', color: '#00C853' },
            { label: 'Win Rate Trading', value: a.tradeWinRate ? `${a.tradeWinRate}%` : '-', icon: 'fa-bolt', color: '#3B82F6' },
            { label: 'Entreprises', value: a.activeEnterprises ?? '-', icon: 'fa-building', color: '#F97316' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
              <div className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center" style={{ backgroundColor: s.color + '18' }}>
                <i className={`fas ${s.icon} text-[0.8rem]`} style={{ color: s.color }}></i>
              </div>
              <div className="text-[0.95rem] font-bold text-[#1A2332]">{s.value}</div>
              <div className="text-[0.56rem] text-[#94A3B8] uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Transactions Bar Chart */}
        {recentTxns.length > 0 && (
          <>
            <SectionHeader icon="fa-clock-rotate-left" title="Transactions récentes" color="#8B5CF6" />
            <div className="bg-white rounded-2xl p-4 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
              <div className="flex items-end gap-1.5 h-28">
                {recentTxns.map((t: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[0.5rem] font-semibold" style={{ color: t.isPositive ? '#00C853' : '#EF4444' }}>
                      {t.isPositive ? '+' : ''}{Math.abs(t.amount).toFixed(0)}
                    </div>
                    <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                      <div
                        className="w-full max-w-[24px] rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(t.heightPct, 8)}%`,
                          background: t.isPositive
                            ? 'linear-gradient(180deg, #00E676, #00C853)'
                            : 'linear-gradient(180deg, #F87171, #EF4444)',
                        }}
                      ></div>
                    </div>
                    <div className="text-[0.45rem] text-[#94A3B8] truncate w-full text-center">
                      {t.type?.slice(0, 3).toUpperCase() || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* AI Recommendation */}
        <SectionHeader icon="fa-robot" title="Recommandation IA" color="#60A5FA" />
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 border border-[rgba(59,130,246,0.2)] shadow-[0_4px_24px_rgba(59,130,246,0.1)]">
          {/* Decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[#3B82F6]/10 blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-[#60A5FA]/8 blur-xl pointer-events-none"></div>

          <div className="flex items-center gap-2.5 mb-3 relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#2563EB] flex items-center justify-center shadow-[0_4px_16px_rgba(59,130,246,0.3)]">
              <i className="fas fa-brain text-[0.9rem]"></i>
            </div>
            <div>
              <span className="text-[0.82rem] font-bold">Assistant IA</span>
              <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)]">Analyse en temps réel</div>
            </div>
          </div>
          <p className="text-[0.85rem] leading-relaxed text-[rgba(255,255,255,0.85)] relative">{AI_TIPS[aiTipIndex]}</p>
        </div>

        {loading && <div className="text-center py-4"><div className="w-6 h-6 border-2 border-gray-200 border-t-[#3B82F6] rounded-full mx-auto" style={{ animation: 'spin 0.7s linear infinite' }} /></div>}
      </div>
    </>
  );
}
