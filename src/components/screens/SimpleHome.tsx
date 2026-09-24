'use client';

import { useAppStore, formatCfa } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import {
  useSimpleStore, DAILY_IMAGE_LIMIT, LOAN_AMOUNT,
  LOAN_BALANCE_THRESHOLD, CAUTION_REQUIRED, REFERRAL_REQUIRED,
} from '@/lib/simple-store';

/* ================================================================
   ACCUEIL (épuré) — salutation · 4 stats · objectif du mois
   ================================================================ */

export default function SimpleHome() {
  const { user, setPage, addToast } = useAppStore();
  const s = useSimpleStore();
  if (!user) return null;

  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'vous';
  const restSubs = Math.max(0, DAILY_IMAGE_LIMIT - s.submissionsToday);
  const pctObjective = Math.min(100, Math.round((s.balance / LOAN_BALANCE_THRESHOLD) * 100));
  const balanceOk = s.balance >= LOAN_BALANCE_THRESHOLD;
  const cautionOk = s.cautionBalance >= CAUTION_REQUIRED;
  const referralOk = s.referralCount >= REFERRAL_REQUIRED;
  const eligible = balanceOk && cautionOk && referralOk;

  const cond = (ok: boolean, label: string, sub: string) => (
    <div className="flex items-start gap-2.5 py-1.5">
      <i className={`fas ${ok ? 'fa-check-circle text-[#22C55E]' : 'fa-circle text-[#CBD5E1]'} text-[0.75rem] w-4 text-center shrink-0 mt-1`}></i>
      <div className="flex-1 min-w-0">
        <div className={`text-[0.72rem] font-bold ${ok ? 'text-[#1F2937]' : 'text-[#64748B]'}`}>{label}</div>
        <div className="text-[0.58rem] text-[#94A3B8] leading-snug">{sub}</div>
      </div>
    </div>
  );

  const handleLoan = () => {
    if (s.loanRequested) { addToast('Demande de prêt déjà envoyée ✓', 'info'); return; }
    if (!cautionOk && balanceOk) {
      if (s.payCaution()) addToast(`Caution de ${formatCfa(CAUTION_REQUIRED)} versée et verrouillée`, 'success');
      else addToast('Solde insuffisant pour verser la caution', 'error');
      return;
    }
    const r = s.requestLoan();
    if (r.ok) addToast(`Prêt de ${formatCfa(LOAN_AMOUNT)} débloqué ! 🎉`, 'success');
    else addToast(r.reason || 'Conditions non remplies', 'error');
  };

  return (
    <>
      <Header
        title={<><LogoImg className="w-[26px] h-[26px] rounded-md" /> <span className="text-[#1F2937] font-black">Jeune Élan</span></>}
        rightElement={
          <button onClick={() => setPage('profile')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none">
            <i className="far fa-user-circle text-[1.05rem]"></i>
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Salutation */}
        <div className="mb-4">
          <div className="text-[1.25rem] font-black text-[#1F2937]">Bonjour, {firstName} 👋</div>
          <div className="text-[0.72rem] text-[#64748B] mt-0.5">Toute ton activité aujourd’hui.</div>
        </div>

        {/* 4 cartes stats (cliquables → leur suite logique) */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <button onClick={() => setPage('wallet')} className="bg-white rounded-2xl p-3.5 text-left border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.97]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(34,197,94,0.1)]"><i className="fas fa-wallet text-[0.7rem] text-[#22C55E]"></i></div>
            <div className="text-[0.56rem] text-[#94A3B8] font-bold uppercase tracking-wide">Solde disponible</div>
            <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{formatCfa(s.balance)}</div>
          </button>
          <button onClick={() => setPage('wallet')} className="bg-white rounded-2xl p-3.5 text-left border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.97]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(245,158,11,0.1)]"><i className="fas fa-coins text-[0.7rem] text-[#F59E0B]"></i></div>
            <div className="text-[0.56rem] text-[#94A3B8] font-bold uppercase tracking-wide">Gain aujourd’hui</div>
            <div className="text-[1.05rem] font-black text-[#22C55E] mt-0.5">+{formatCfa(s.todayEarned)}</div>
          </button>
          <button onClick={() => setPage('missions')} className="bg-white rounded-2xl p-3.5 text-left border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.97]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(168,85,247,0.1)]"><i className="fas fa-thumbtack text-[0.7rem] text-[#A855F7]"></i></div>
            <div className="text-[0.56rem] text-[#94A3B8] font-bold uppercase tracking-wide">Mission réservée</div>
            <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{s.reservedMissionIds.length}</div>
          </button>
          <button onClick={() => setPage('missions')} className="bg-white rounded-2xl p-3.5 text-left border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.97]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 bg-[rgba(59,130,246,0.1)]"><i className="fas fa-layer-group text-[0.7rem] text-[#3B82F6]"></i></div>
            <div className="text-[0.56rem] text-[#94A3B8] font-bold uppercase tracking-wide">File active</div>
            <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{s.submissionsToday} / {DAILY_IMAGE_LIMIT}</div>
            <div className="w-full h-1.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${(s.submissionsToday / DAILY_IMAGE_LIMIT) * 100}%` }} />
            </div>
            <div className="text-[0.52rem] text-[#94A3B8] mt-1">{restSubs} restante{restSubs > 1 ? 's' : ''} aujourd’hui</div>
          </button>
        </div>

        {/* Objectif du mois : prêt de 5 000 F */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(34,197,94,0.15)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className="fas fa-bullseye text-[#22C55E] text-[0.8rem]"></i>
              <div className="text-[0.82rem] font-bold text-[#1F2937]">Objectif du mois</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(34,197,94,0.1)] text-[#22C55E]">Tâche à atteindre</span>
          </div>
          <div className="text-[0.72rem] font-semibold text-[#1F2937] mb-1">🎯 Obtenir un prêt de {formatCfa(LOAN_AMOUNT)}</div>
          <div className="text-[0.58rem] text-[#64748B] mb-3 leading-relaxed">
            Chaque image validée augmente votre solde et vous rapproche de l’objectif.
          </div>

          <div className="flex justify-between items-end mb-1.5">
            <div className="text-[0.88rem] font-black text-[#1F2937]">{formatCfa(Math.min(s.balance, LOAN_BALANCE_THRESHOLD))} <span className="text-[#94A3B8] font-semibold text-[0.62rem]">/ {formatCfa(LOAN_BALANCE_THRESHOLD)} de solde</span></div>
            <div className="text-[0.7rem] font-black text-[#22C55E]">{pctObjective} %</div>
          </div>
          <div className="w-full h-3 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${pctObjective}%` }} />
          </div>

          <div className="text-[0.6rem] font-black text-[#1F2937] uppercase tracking-wide mb-0.5">Les conditions</div>
          <div className="rounded-xl bg-[rgba(0,0,0,0.02)] p-2.5 mb-3">
            {cond(balanceOk, `Solde — ${formatCfa(s.balance)} / ${formatCfa(LOAN_BALANCE_THRESHOLD)}`, 'Alimenté par vos gains journaliers (images validées).')}
            {cond(cautionOk, `Caution — ${formatCfa(s.cautionBalance)} / ${formatCfa(CAUTION_REQUIRED)}`, `Garantie = la MOITIÉ de la somme empruntée (${formatCfa(CAUTION_REQUIRED)} pour ${formatCfa(LOAN_AMOUNT)}). Verrouillée, non retirable.`)}
            {cond(referralOk, `Parrainages — ${s.referralCount} / ${REFERRAL_REQUIRED}`, 'Invitez vos amis avec votre code de parrainage.')}
          </div>

          <button
            onClick={handleLoan}
            className={`w-full py-2.5 rounded-xl text-white font-semibold text-[0.75rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-[0.97] ${s.loanRequested ? 'bg-[#94A3B8]' : 'bg-gradient-to-r from-[#22C55E] to-[#16A34A]'}`}
          >
            {s.loanRequested ? 'Prêt déjà obtenu ✓' : eligible ? 'Demander le prêt' : cautionOk ? 'Demander le prêt' : balanceOk ? `Verser la caution (${formatCfa(CAUTION_REQUIRED)})` : 'Continuer à gagner'}
          </button>
        </div>
      </div>
    </>
  );
}
