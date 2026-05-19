'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser, type Transaction } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES, AI_TIPS } from '@/components/shared';

function SectionHeader({ icon, title }: { icon: string; title: string; color?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[rgba(99,102,241,0.12)]">
        <i className={`fas ${icon} text-[0.65rem] text-[#6366F1]`}></i>
      </div>
      <h3 className="text-[0.82rem] font-bold text-[#1F2937]">{title}</h3>
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
      <Header
        title="Analyses"
        icon="fa-chart-bar"
        iconColor="#6366F1"
        leftElement={
          <button
            onClick={() => setPage('profile')}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1"
          >
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
      />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Account Balances Section */}
        <SectionHeader icon="fa-wallet" title="Comptes" />
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
                <i className="fas fa-coins text-[0.45rem] text-[#6366F1]"></i>
              </div>
              <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold">Principal</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#1F2937]">{formatMoney(user.balance)}</div>
          </div>
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
                <i className="fas fa-chart-line text-[0.45rem] text-[#6366F1]"></i>
              </div>
              <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold">Investissement</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#4ADE80]">{formatMoney(user.investBalance)}</div>
          </div>
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
                <i className="fas fa-bolt text-[0.45rem] text-[#6366F1]"></i>
              </div>
              <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold">Trading</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#818CF8]">{formatMoney(user.tradeBalance)}</div>
          </div>
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-5 h-5 rounded-md bg-[rgba(99,102,241,0.12)] flex items-center justify-center">
                <i className="fas fa-building text-[0.45rem] text-[#6366F1]"></i>
              </div>
              <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold">Projet</div>
            </div>
            <div className="text-[1.1rem] font-black text-[#818CF8]">{formatMoney(user.projectBalance)}</div>
          </div>
        </div>

        {/* Profit/Loss Section */}
        <SectionHeader icon="fa-scale-balanced" title="Résultats" />
        <div className="grid grid-cols-2 gap-2.5 mb-2.5">
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-[rgba(74,222,128,0.12)] flex items-center justify-center">
                <i className="fas fa-arrow-trend-up text-[0.5rem] text-[#4ADE80]"></i>
              </div>
              <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold">Profit total</div>
            </div>
            <div className="text-[1.2rem] font-black text-[#4ADE80]">{formatMoney(a.totalProfit || user.totalProfit)}</div>
          </div>
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-[rgba(248,113,113,0.12)] flex items-center justify-center">
                <i className="fas fa-arrow-trend-down text-[0.5rem] text-[#F87171]"></i>
              </div>
              <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold">Pertes totales</div>
            </div>
            <div className="text-[1.2rem] font-black text-[#F87171]">{formatMoney(a.totalLoss || user.totalLoss)}</div>
          </div>
        </div>

        {/* Net */}
        <div className={`rounded-2xl p-4 mb-5 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF]`}>
          <div className="flex items-center gap-1.5 mb-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${netProfit >= 0 ? 'bg-[rgba(74,222,128,0.12)]' : 'bg-[rgba(248,113,113,0.12)]'}`}>
              <i className={`fas ${netProfit >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} text-[0.5rem]`} style={{ color: netProfit >= 0 ? '#4ADE80' : '#F87171' }}></i>
            </div>
            <div className="text-[0.7rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold">Bénéfice net</div>
          </div>
          <div className={`text-[1.8rem] font-black ${netProfit >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
            {netProfit >= 0 ? '+' : ''}{formatMoney(netProfit)}
          </div>
        </div>

        {/* Stats Grid Section */}
        <SectionHeader icon="fa-chart-pie" title="Statistiques" />
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Investissements', value: a.activeInvestments ?? '-', icon: 'fa-chart-line' },
            { label: 'Win Rate Trading', value: a.tradeWinRate ? `${a.tradeWinRate}%` : '-', icon: 'fa-bolt' },
            { label: 'Entreprises', value: a.activeEnterprises ?? '-', icon: 'fa-building' },
          ].map((s, i) => (
            <div key={i} className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-3 text-center">
              <div className="w-9 h-9 rounded-xl mx-auto mb-1.5 flex items-center justify-center bg-[rgba(99,102,241,0.12)]">
                <i className={`fas ${s.icon} text-[0.8rem] text-[#6366F1]`}></i>
              </div>
              <div className="text-[0.95rem] font-bold text-[#1F2937]">{s.value}</div>
              <div className="text-[0.56rem] text-[rgba(0,0,0,0.35)] uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Transactions Bar Chart */}
        {recentTxns.length > 0 && (
          <>
            <SectionHeader icon="fa-clock-rotate-left" title="Transactions récentes" />
            <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-5">
              <div className="flex items-end gap-1.5 h-28">
                {recentTxns.map((t: any, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[0.5rem] font-semibold" style={{ color: t.isPositive ? '#4ADE80' : '#F87171' }}>
                      {t.isPositive ? '+' : ''}{Math.abs(t.amount).toFixed(0)}
                    </div>
                    <div className="w-full flex items-end justify-center" style={{ height: '72px' }}>
                      <div
                        className="w-full max-w-[24px] rounded-t-md transition-all duration-500"
                        style={{
                          height: `${Math.max(t.heightPct, 8)}%`,
                          background: t.isPositive
                            ? 'linear-gradient(180deg, #22C55E, rgba(34,197,94,0.5))'
                            : 'linear-gradient(180deg, #F87171, rgba(248,113,113,0.5))',
                        }}
                      ></div>
                    </div>
                    <div className="text-[0.45rem] text-[rgba(0,0,0,0.35)] truncate w-full text-center">
                      {t.type?.slice(0, 3).toUpperCase() || '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* AI Recommendation */}
        <SectionHeader icon="fa-robot" title="Recommandation IA" />
        <div className="relative overflow-hidden bg-[#FFFFFF] text-[#1F2937] rounded-2xl p-5 mb-4 border border-[rgba(99,102,241,0.15)]">
          {/* Decorative glow */}
          <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[rgba(99,102,241,0.1)] blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-[rgba(99,102,241,0.08)] blur-xl pointer-events-none"></div>

          <div className="flex items-center gap-2.5 mb-3 relative">
            <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center border border-[rgba(99,102,241,0.2)]">
              <i className="fas fa-brain text-[0.9rem] text-[#6366F1]"></i>
            </div>
            <div>
              <span className="text-[0.82rem] font-bold text-[#1F2937]">Assistant IA</span>
              <div className="text-[0.6rem] text-[rgba(0,0,0,0.5)]">Analyse en temps réel</div>
            </div>
          </div>
          <p className="text-[0.85rem] leading-relaxed text-[rgba(0,0,0,0.65)] relative">{AI_TIPS[aiTipIndex]}</p>
        </div>

        {loading && (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-[rgba(0,0,0,0.1)] border-t-[#6366F1] rounded-full mx-auto" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        )}
      </div>
    </>
  );
}
