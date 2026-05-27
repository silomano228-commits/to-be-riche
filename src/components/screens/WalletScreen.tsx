'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney } from '@/lib/store';
import { Header, PROJECTS } from '@/components/shared';

export default function WalletScreen() {
  const { user, setPage, setUser, addToast, addNotification } = useAppStore();
  const [flashBal, setFlashBal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fake notifications — intervals: 7, 10, 13, 15 secondes
  useEffect(() => {
    if (!user) return;
    const fakeIds: string[] = [];
    for (let i = 0; i < 30; i++) fakeIds.push(String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0'));
    const intervals = [7000, 10000, 13000, 15000];
    let idx = 0;
    const showNotif = () => {
      const id = fakeIds[Math.floor(Math.random() * fakeIds.length)];
      const amt = Math.round(Math.random() * 27 + 3);
      addNotification(id, `a retiré ${formatMoney(amt)}`);
      const next = intervals[idx % intervals.length];
      idx++;
      setTimeout(showNotif, next);
    };
    const t = setTimeout(showNotif, 5000);
    return () => clearTimeout(t);
  }, [user]);

  // Flash balance on mount
  useEffect(() => {
    setTimeout(() => setFlashBal(true), 100);
    setTimeout(() => setFlashBal(false), 700);
  }, []);

  // Refresh wallet
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        addToast('Solde mis à jour', 'success');
      }
    } catch { addToast('Erreur', 'error'); }
    setRefreshing(false);
  };

  if (!user) return null;
  const investBalance = user.investBalance || 0;
  const totalProfit = user.totalProfit || 0;
  const totalPotentialGain = user.totalPotentialGain || 0;
  const projects = user.projects || [];
  const canWithdraw = user.canWithdraw;
  const hoursUntilWithdrawal = user.hoursUntilWithdrawal || 0;

  return (
    <>
      <Header title="Portefeuille" icon="fa-wallet" iconColor="#00C853" rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('profile')}><i className="far fa-user-circle"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* Balance Card — Two accounts */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-[18px] relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.1),transparent_65%)]" />
          <div className="absolute -bottom-10 -left-8 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(251,191,36,0.06),transparent_65%)]" />
          <div className="relative z-[1]">
            {/* Total + Refresh */}
            <div className="flex items-center justify-between mb-1">
              <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px]">Portefeuille</div>
              <button onClick={handleRefresh} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(255,255,255,0.08)] border-none text-white cursor-pointer transition-transform active:scale-90" title="Rafraîchir">
                <i className="fas fa-sync-alt text-[0.7rem]" style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}}></i>
              </button>
            </div>
            <div className={`text-[2rem] font-black tracking-[-1px] mb-4 ${flashBal ? 'text-[#BBF7D0]' : 'text-white'}`} style={{ transition: 'color 0.6s, transform 0.6s', transform: flashBal ? 'scale(1.04)' : 'scale(1)' }}>{formatMoney(user.balance)}</div>

            {/* Two accounts */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3.5 border border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-[rgba(59,130,246,0.2)] flex items-center justify-center text-[0.5rem]"><i className="fas fa-shield-alt text-[#60A5FA]"></i></div>
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[0.5px]">Principal</span>
                </div>
                <div className="text-[1.05rem] font-black text-white">{formatMoney(user.balance)}</div>
              </div>
              <div className="bg-[rgba(0,200,83,0.08)] rounded-xl p-3.5 border border-[rgba(0,200,83,0.12)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-[rgba(0,200,83,0.2)] flex items-center justify-center text-[0.5rem]"><i className="fas fa-chart-line text-[#00E676]"></i></div>
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[0.5px]">Gains</span>
                </div>
                <div className="text-[1.05rem] font-black text-[#86EFAC]">{formatMoney(totalProfit)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none font-[Inter] transition-transform active:scale-95 bg-[rgba(0,200,83,0.15)] text-[#86EFAC]" onClick={() => setPage('invest')}><i className="fas fa-arrow-down"></i> Déposer</button>
              <button className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none font-[Inter] transition-transform active:scale-95 bg-[rgba(251,191,36,0.15)] text-[#FDE68A]" onClick={() => setPage('withdraw')}><i className="fas fa-arrow-up"></i> Retirer</button>
            </div>
          </div>
        </div>

        {/* Daily Gains Overview Card */}
        {user.hasInvested && projects.length > 0 && (
          <div className="rounded-2xl p-5 mb-[18px] border bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border-[#86EFAC]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00C853]">
                <i className="fas fa-gift text-[1rem] text-white"></i>
              </div>
              <div className="flex-1">
                <h4 className="text-[0.88rem] font-bold text-[#1A2332]">Gains journaliers</h4>
                <p className="text-[0.68rem] text-[#64748B]">Réclamez vos gains par projet</p>
              </div>
            </div>

            {/* Show potential gain */}
            <div className="bg-white rounded-xl p-3.5 mb-3 border border-[rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[0.68rem] text-[#64748B] font-medium">Gain potentiel total</span>
                <span className="text-[0.68rem] text-[#00C853] font-bold">{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
              </div>
              <div className="text-[1.4rem] font-black text-[#009624]">{formatMoney(totalPotentialGain)}</div>
            </div>

            <button onClick={() => setPage('projects')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2">
              <i className="fas fa-briefcase"></i> Voir mes projets
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { icon: 'fa-chart-line', color: 'bg-[#DCFCE7] text-[#166534]', val: formatMoney(totalProfit), label: 'Gains' },
            { icon: 'fa-hand-holding-usd', color: 'bg-[#DBEAFE] text-[#1E40AF]', val: formatMoney(investBalance), label: 'Investi' },
            { icon: 'fa-percentage', color: 'bg-[#FEF3C7] text-[#92400E]', val: '7-15%', label: 'Rendement' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mx-auto mb-1.5 text-[0.85rem] ${s.color}`}><i className={`fas ${s.icon}`}></i></div>
              <div className="font-extrabold text-[0.84rem] text-[#1A2332] tracking-[-0.2px]">{s.val}</div>
              <div className="text-[0.56rem] text-[#94A3B8] mt-0.5 font-medium uppercase tracking-[0.4px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Status */}
        {!user.hasInvested && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FFFBEB] border-l-[3px] border-[#F59E0B]">
            <i className="fas fa-exclamation-circle text-[#B45309] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#B45309]">Compte Limité</h4>
              <p className="text-[0.78rem] leading-relaxed text-[#92400E]">Faites un premier dépôt de 10 $ pour commencer à gagner.</p>
            </div>
            <button className="py-2.5 px-4 text-[0.76rem] bg-gradient-to-r from-[#00E676] to-[#00C853] text-white rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(0,200,83,0.2)] shrink-0" onClick={() => setPage('invest')}><i className="fas fa-rocket mr-1"></i>Investir</button>
          </div>
        )}

        {/* 48h Withdrawal Info */}
        {user.hasInvested && !canWithdraw && hoursUntilWithdrawal > 0 && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#EFF6FF] border-l-[3px] border-[#3B82F6]">
            <i className="fas fa-clock text-[#2563EB] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#1E40AF]">Premier retrait dans {hoursUntilWithdrawal}h</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#3B82F6]">Vous pourrez retirer vos gains 48h après votre premier dépôt.</p>
            </div>
          </div>
        )}
        {user.hasInvested && canWithdraw && !user.needsReferral && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#F0FDF4] border-l-[3px] border-[#00C853]">
            <i className="fas fa-check-circle text-[#166534] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#166534]">Retrait disponible</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#15803D]">Vous pouvez retirer vos gains vers votre wallet TRX.</p>
            </div>
            <button className="py-2.5 px-4 text-[0.76rem] bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(251,191,36,0.2)] shrink-0" onClick={() => setPage('withdraw')}><i className="fas fa-arrow-up mr-1"></i>Retirer</button>
          </div>
        )}

        {/* Referral Required Warning */}
        {user.needsReferral && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FEF3C7] border-l-[3px] border-[#F59E0B]">
            <i className="fas fa-user-friends text-[#92400E] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#92400E]">Parrainage requis</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#92400E]">Vous devez parrainer au moins {user.requiredReferrals} personne{user.requiredReferrals && user.requiredReferrals > 1 ? 's' : ''} pour retirer. Actuel : {user.referralCount || 0}. Partagez votre code <strong className="font-mono">{user.referralCode}</strong></p>
            </div>
            <button className="py-2.5 px-3 text-[0.72rem] bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(251,191,36,0.2)] shrink-0" onClick={() => setPage('referral')}><i className="fas fa-share-alt mr-1"></i>Parrainer</button>
          </div>
        )}

        {/* Popular Projects */}
        <div className="flex justify-between items-center mb-2.5 mt-5">
          <h3 className="text-[0.9rem] font-bold text-[#1A2332]">Projets Populaires</h3>
          <span className="text-[0.68rem] text-[#00C853] font-semibold cursor-pointer">Voir tout</span>
        </div>
        {PROJECTS.map((p, i) => (
          <div key={i} className="flex gap-3 p-3.5 bg-white rounded-xl mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] items-center border border-[rgba(0,0,0,0.03)]">
            <img src={p.img} className="w-[50px] h-[50px] rounded-lg object-cover shrink-0" loading="lazy" alt={p.n} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[0.85rem] mb-0.5 text-[#1A2332]">{p.n}</div>
              <div className="text-[0.68rem] text-[#94A3B8] font-medium">{p.s}</div>
            </div>
            <i className="fas fa-chevron-right text-gray-300 text-[0.65rem]"></i>
          </div>
        ))}
        <button onClick={() => window.location.href = '/trx-guide'} className="w-full py-3.5 rounded-xl border-[1.5px] border-[rgba(0,200,83,0.15)] bg-[rgba(0,200,83,0.04)] text-[#009624] font-semibold text-[0.82rem] cursor-pointer font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 mt-4 mb-4">
          <i className="fas fa-question-circle"></i> Comment trouver l&apos;adresse TRX ?
        </button>
      </div>
    </>
  );
}
