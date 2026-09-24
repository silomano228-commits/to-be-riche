'use client';

import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import { useSimpleStore, levelFor, LOAN_TIERS } from '@/lib/simple-store';

/* ================================================================
   PORTEFEUILLE DE MISSION (épuré) — le portefeuille du « gagné » :
   gains missions + investissements + revenus journaliers.
   ================================================================ */

export default function SimpleWallet() {
  const s = useSimpleStore();
  const { user } = useAppStore();
  if (!user) return null;

  const { level } = levelFor(s.xp);
  const total = s.balance + s.invest.invested;

  const rows = [
    { icon: 'fa-image', color: '#22C55E', label: 'Gains des images validées', value: s.missionTotalEarned },
    { icon: 'fa-chart-line', color: '#14B8A6', label: 'Investissements', value: s.invest.invested },
    { icon: 'fa-calendar-day', color: '#F59E0B', label: 'Revenus journaliers (investir)', value: s.invest.totalEarned },
  ];

  return (
    <>
      <Header title="Portefeuille" icon="fa-wallet" />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Total */}
        <div className="bg-gradient-to-br from-[#16A34A] to-[#15803D] text-white rounded-2xl p-4 mb-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-[130px] h-[130px] bg-[radial-gradient(circle,rgba(255,255,255,0.15),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="text-[0.58rem] text-white/70 font-bold uppercase tracking-wide mb-1">Valeur totale</div>
            <div className="text-[1.6rem] font-black leading-none">{formatCfa(total)}</div>
            <div className="text-[0.6rem] text-white/70 mt-2">Solde disponible : {formatCfa(s.balance)} · Investi : {formatCfa(s.invest.invested)}</div>
            <div className="text-[0.55rem] text-white/60 mt-1"><i className={`fas ${level.icon} mr-1`}></i>Niveau {level.name} · {level.perk} · série {s.streak} jours</div>
            {s.cautionBalance > 0 && (
              <div className="text-[0.58rem] text-[#FBBF24] mt-1.5 flex items-center gap-1.5">
                <i className="fas fa-lock"></i> Caution verrouillée : {formatCfa(s.cautionBalance)} / {formatCfa(LOAN_TIERS[Math.min(s.loansTaken, LOAN_TIERS.length - 1)].caution)}
              </div>
            )}
          </div>
        </div>

        {/* Répartition */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">D’où vient votre argent</div>
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 last:pb-0">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: r.color + '15' }}>
                <i className={`fas ${r.icon} text-[0.75rem]`} style={{ color: r.color }}></i>
              </div>
              <div className="text-[0.7rem] text-[#475569] flex-1">{r.label}</div>
              <div className="text-[0.82rem] font-black text-[#1F2937] shrink-0">{formatCfa(r.value)}</div>
            </div>
          ))}
        </div>

        {/* Historique complet */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Historique</div>
          {s.transactions.length === 0 && <div className="text-center text-[0.65rem] text-[#94A3B8] py-5">Aucune opération pour l’instant.</div>}
          {s.transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 last:pb-0">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.amount > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)' }}>
                <i className={`fas ${t.kind === 'mission' ? 'fa-image' : t.kind === 'daily' ? 'fa-calendar-day' : t.kind === 'invest' ? 'fa-chart-line' : t.kind === 'loan' ? 'fa-hand-holding-dollar' : 'fa-lock'} text-[0.7rem]`} style={{ color: t.amount > 0 ? '#22C55E' : '#F59E0B' }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.68rem] font-semibold text-[#1F2937] truncate">{t.label}</div>
                <div className="text-[0.55rem] text-[#94A3B8]">{t.date}</div>
              </div>
              <div className={`text-[0.75rem] font-black shrink-0 ${t.amount > 0 ? 'text-[#22C55E]' : 'text-[#F59E0B]'}`}>
                {t.amount > 0 ? '+' : '−'}{formatCfa(Math.abs(t.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
