'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import {
  useSimpleStore, levelFor, investRateFor, LIKE_REWARD, LIKE_ROUNDS_MAX, LIKE_VIP_REWARD,
  MAX_REWARD_PER_IMAGE,
} from '@/lib/simple-store';
import SimpleLikes from './SimpleLikes';
import SimpleMissions from './SimpleMissions';
import SimpleInvest from './SimpleInvest';

/* ================================================================
   GAGNER — le hub des trois projets financiers :
   1. Lives Likes (coeurs)  2. Missions images  3. Investir.
   Les trois ne sont plus dans la barre du bas : ils vivent ici,
   chacun avec ses dépôts / retraits Yas.
   ================================================================ */

export type EarnSub = 'hub' | 'likes' | 'missions' | 'invest';

export default function SimpleEarn({ initial = 'hub' }: { initial?: EarnSub }) {
  const { addToast } = useAppStore();
  const s = useSimpleStore();
  const [sub, setSub] = useState<EarnSub>(initial);

  /* Re-clic sur l'onglet « Gagner » -> retour au hub */
  useEffect(() => {
    const h = () => setSub('hub');
    window.addEventListener('berich:earn-home', h);
    return () => window.removeEventListener('berich:earn-home', h);
  }, []);

  /* ---------- Sous-écrans ---------- */
  if (sub === 'likes') return <SimpleLikes onBack={() => setSub('hub')} />;
  if (sub === 'missions') return <SimpleMissions onBack={() => setSub('hub')} />;
  if (sub === 'invest') return <SimpleInvest onBack={() => setSub('hub')} />;

  /* ---------- Le hub ---------- */
  const { level } = levelFor(s.xp, s.referralCount);
  const quota = level.quota;
  const vip = s.likes.cagnotte >= 1000;
  const likeReward = vip ? LIKE_VIP_REWARD : LIKE_REWARD;
  const likePotential = (LIKE_ROUNDS_MAX - s.likes.roundsToday) * likeReward;
  const missionPotential = (quota - s.submissionsToday) * MAX_REWARD_PER_IMAGE;
  const investDaily = Math.round(s.invest.invested * investRateFor(s.referralCount));
  const rate = investRateFor(s.referralCount);
  const dayPotential = likePotential + missionPotential + investDaily;

  const projects = [
    {
      id: 'likes' as const,
      icon: 'fa-heart',
      color: '#EC4899',
      name: 'Lives Likes',
      tagline: `+${likeReward} F par session`,
      detail: `${LIKE_ROUNDS_MAX - s.likes.roundsToday} session(s) restante(s) · 100 coeurs en 45 s`,
      earned: s.likes.totalEarned,
      badge: vip ? 'VIP ×2' : undefined,
      progress: Math.min(100, (s.likes.roundsToday / LIKE_ROUNDS_MAX) * 100),
    },
    {
      id: 'missions' as const,
      icon: 'fa-bullhorn',
      color: '#22C55E',
      name: 'Missions images',
      tagline: `jusqu'à ${MAX_REWARD_PER_IMAGE} F / image`,
      detail: `${quota - s.submissionsToday} soumission(s) restante(s) · niveau ${level.name}`,
      earned: s.missionTotalEarned,
      badge: undefined,
      progress: Math.min(100, (s.submissionsToday / quota) * 100),
    },
    {
      id: 'invest' as const,
      icon: 'fa-chart-line',
      color: '#14B8A6',
      name: 'Investir',
      tagline: `${Math.round(rate * 100)} % / jour`,
      detail: s.invest.invested > 0 ? `${formatCfa(s.invest.invested)} investis · +${formatCfa(investDaily)} aujourd'hui` : 'Déposez pour gagner chaque jour',
      earned: s.invest.totalEarned,
      badge: s.referralCount >= 10 ? '7 % boosté' : undefined,
      progress: s.invest.invested > 0 ? 100 : 0,
    },
  ];

  return (
    <>
      <Header title="Gagner" icon="fa-sack-dollar" iconColor="#F59E0B" />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Potentiel restant du jour (les 3 projets) */}
        <div className="rounded-2xl p-3.5 mb-3 text-white relative overflow-hidden bg-gradient-to-r from-[#B45309] to-[#92400E]">
          <div className="flex items-center gap-3 relative z-[1]">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><i className="fas fa-sack-dollar text-[1rem] text-[#FCD34D]"></i></div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.78rem] font-black leading-tight">Encore {formatCfa(dayPotential)} à prendre aujourd&apos;hui</div>
              <div className="text-[0.58rem] text-white/75 mt-0.5">Lives + missions images + gains d&apos;investissement. Demain, tout se recharge.</div>
            </div>
          </div>
        </div>

        {/* Les trois projets */}
        <div className="space-y-2.5">
          {projects.map((p) => (
            <button key={p.id} onClick={() => setSub(p.id)} className="w-full bg-white rounded-2xl p-3.5 text-left border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.98]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: p.color + '15' }}>
                  <i className={`fas ${p.icon} text-[1.05rem]`} style={{ color: p.color }}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[0.85rem] font-black text-[#1F2937]">{p.name}</div>
                    {p.badge && <span className="px-1.5 py-0.5 rounded-md text-[0.48rem] font-black" style={{ background: p.color + '15', color: p.color }}>{p.badge}</span>}
                  </div>
                  <div className="text-[0.62rem] font-bold" style={{ color: p.color }}>{p.tagline}</div>
                  <div className="text-[0.56rem] text-[#94A3B8] truncate">{p.detail}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[0.62rem] font-black text-[#1F2937]">{formatCfa(p.earned)}</div>
                  <div className="text-[0.48rem] text-[#94A3B8] font-bold uppercase">gagné ici</div>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.2)] text-[0.6rem] mt-1"></i>
                </div>
              </div>
              <div className="h-1.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p.progress}%`, background: p.color }} />
              </div>
            </button>
          ))}
        </div>

        {/* Note dépôts / retraits */}
        <div className="bg-white rounded-2xl p-3.5 mt-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-start gap-2.5">
          <i className="fas fa-building-columns text-[#3B82F6] text-[0.8rem] mt-0.5"></i>
          <div className="text-[0.62rem] text-[#475569] leading-relaxed flex-1">
            Chaque projet accepte les <strong>dépôts et retraits via Yas</strong> (mobile money), vérifiés par l&apos;administrateur.
            {s.withdrawalsDone === 0 && s.referralCount < 1 && <span className="text-[#B45309] font-bold"> Premier retrait : 1 filleul requis.</span>}
          </div>
        </div>

        {/* Relance série */}
        <button onClick={() => addToast(`Série active : ${s.streak} jours — un jour manqué = série perdue 🔥`, 'info')} className="w-full bg-[rgba(239,68,68,0.06)] rounded-2xl p-3 mt-3 border border-[rgba(239,68,68,0.12)] cursor-pointer flex items-center gap-2.5 text-left">
          <i className="fas fa-fire text-[#EF4444] text-[0.85rem]"></i>
          <div className="flex-1 text-[0.62rem] text-[#7F1D1D] leading-snug">
            Série active : <strong>{s.streak} jours</strong> — restez actif chaque jour, la fidélité paie (bonus tous les 7 jours).
          </div>
        </button>
      </div>
    </>
  );
}
