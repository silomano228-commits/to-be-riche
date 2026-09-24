'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import {
  useSimpleStore, levelFor, LOAN_TIERS, LEVELS, LIVE_FEED, TOP_CREATORS,
  CHALLENGE_TARGET, CHALLENGE_REWARD, MAX_REWARD_PER_IMAGE,
} from '@/lib/simple-store';

/* ================================================================
   ACCUEIL — version engageante
   Salutation + niveau · potentiel · 4 stats · bonus du jour ·
   objectif du mois (paliers de prêt) · communauté en direct.
   ================================================================ */

export default function SimpleHome() {
  const { user, setPage, addToast } = useAppStore();
  const s = useSimpleStore();
  const [feedIndex, setFeedIndex] = useState(0);

  /* Nouveau jour : série active, bonus fidélité, reset quotidien */
  useEffect(() => {
    const res = s.processNewDay();
    res.messages.forEach((m) => addToast(m, 'info'));
  }, []);

  /* Rotation du flux d'activité live */
  useEffect(() => {
    const t = setInterval(() => setFeedIndex((i) => (i + 1) % LIVE_FEED.length), 4000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;

  const firstName = (user.name || '').trim().split(/\s+/)[0] || 'vous';
  const { level, next, toNext } = levelFor(s.xp);
  const quota = level.quota;
  const restSubs = Math.max(0, quota - s.submissionsToday);

  /* Objectif du mois = palier de prêt en cours */
  const tierIndex = Math.min(s.loansTaken, LOAN_TIERS.length - 1);
  const tier = LOAN_TIERS[tierIndex];
  const loanDone = s.loansTaken >= LOAN_TIERS.length;
  const cautionOk = s.cautionBalance >= tier.caution;
  /* Le solde exigé prouve la capacité d'épargne : atteint si le solde
     couvre la caution, ou si la caution (issue du solde) est verrouillée. */
  const soldeOk = cautionOk || s.balance >= tier.caution;
  const referralOk = s.referralCount >= tier.referrals;
  const levelOk = LEVELS.indexOf(level) >= tier.levelMin;
  const eligible = cautionOk && referralOk && levelOk;
  const pctObjective = cautionOk ? 100 : Math.min(100, Math.round((s.balance / tier.caution) * 100));

  /* Potentiel réel dans les règles actuelles */
  const dayPotential = quota * MAX_REWARD_PER_IMAGE;

  /* Bonus du jour */
  const challengeReady = s.todayValidated >= CHALLENGE_TARGET && !s.challengeClaimed;
  const daysToStreakBonus = s.streak % 7 === 0 ? 7 : 7 - (s.streak % 7);
  const feed = LIVE_FEED[feedIndex];

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
    if (loanDone) { addToast('Tous les paliers de prêt sont déjà obtenus 🏆', 'info'); return; }
    if (!cautionOk && s.balance >= tier.caution) {
      if (s.payCaution()) addToast(`Caution de ${formatCfa(tier.caution)} versée et verrouillée`, 'success');
      else addToast('Solde insuffisant pour verser la caution', 'error');
      return;
    }
    const r = s.requestLoan();
    if (r.ok) addToast(`Prêt de ${formatCfa(tier.amount)} débloqué ! 🎉`, 'success');
    else addToast(r.reason || 'Conditions non remplies', 'error');
  };

  const handleChallenge = () => {
    const r = s.claimDailyChallenge();
    if (r.ok) addToast(`Bonus du jour reçu : +${CHALLENGE_REWARD} F 🎉`, 'success');
    else addToast(r.reason || 'Non disponible', 'error');
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

        {/* Salutation + niveau */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[1.25rem] font-black text-[#1F2937]">Bonjour, {firstName} 👋</div>
            <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-black flex items-center gap-1" style={{ background: level.color + '15', color: level.color }}>
              <i className={`fas ${level.icon} text-[0.55rem]`}></i>{level.name}
            </span>
          </div>
          <div className="text-[0.72rem] text-[#64748B] mt-0.5">Toute ton activité aujourd’hui.</div>
          {/* Barre XP */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[0.55rem] text-[#94A3B8] mb-1">
              <span><strong className="text-[#1F2937]">{s.xp} pts</strong> d’expérience</span>
              {next ? <span>{level.name} → <strong style={{ color: next.color }}>{next.name}</strong> · {toNext} pts</span> : <span>Niveau max atteint 🏆</span>}
            </div>
            <div className="w-full h-2 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: next ? `${Math.min(100, Math.round(((s.xp - level.min) / (next.min - level.min)) * 100))}%` : '100%', background: `linear-gradient(90deg, ${level.color}, ${next?.color || level.color})` }} />
            </div>
          </div>
        </div>

        {/* Potentiel (dans les règles : quota × 30 F) */}
        <div className="rounded-2xl p-3.5 mb-3 text-white relative overflow-hidden bg-gradient-to-r from-[#16A34A] to-[#15803D]">
          <div className="flex items-center gap-3 relative z-[1]">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0"><i className="fas fa-fire text-[1rem] text-[#FBBF24]"></i></div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.78rem] font-black leading-tight">Jusqu’à {formatCfa(dayPotential)} aujourd’hui</div>
              <div className="text-[0.58rem] text-white/75 mt-0.5">{quota} images × 30 F max — soit {formatCfa(dayPotential * 30)} par mois. Chaque image validée compte.</div>
            </div>
            <button onClick={() => setPage('missions')} className="px-3.5 py-2 rounded-xl bg-white text-[#15803D] font-black text-[0.65rem] border-none cursor-pointer shrink-0 transition-transform active:scale-95">Gagner</button>
          </div>
        </div>

        {/* 4 cartes stats */}
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
            <div className="text-[1.05rem] font-black text-[#1F2937] mt-0.5">{s.submissionsToday} / {quota}</div>
            <div className="w-full h-1.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mt-1.5">
              <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${(s.submissionsToday / quota) * 100}%` }} />
            </div>
            <div className="text-[0.52rem] text-[#94A3B8] mt-1">{restSubs} restante{restSubs > 1 ? 's' : ''} aujourd’hui</div>
          </button>
        </div>

        {/* Bonus du jour : série active + défi (raison de revenir) */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(245,158,11,0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className="fas fa-gift text-[#F59E0B] text-[0.8rem]"></i>
              <div className="text-[0.82rem] font-bold text-[#1F2937]">Bonus du jour</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(245,158,11,0.1)] text-[#F59E0B]">Chaque jour compte</span>
          </div>

          {/* Série active */}
          <div className="flex items-center gap-3 py-2 border-b border-[rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-1.5">
              <i className="fas fa-fire text-[#EF4444] text-[0.9rem]"></i>
              <div className="text-[1.05rem] font-black text-[#1F2937]">{s.streak} j</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.68rem] font-semibold text-[#1F2937]">Série active</div>
              <div className="text-[0.56rem] text-[#94A3B8]">Prochain bonus fidélité (+5 F) dans {daysToStreakBonus} jour{daysToStreakBonus > 1 ? 's' : ''} — un jour manqué = série perdue.</div>
            </div>
          </div>

          {/* Défi du jour */}
          <div className="flex items-center gap-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <i className="fas fa-bullseye text-[#3B82F6] text-[0.85rem]"></i>
              <div className="text-[0.95rem] font-black text-[#1F2937]">{Math.min(s.todayValidated, CHALLENGE_TARGET)}/{CHALLENGE_TARGET}</div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.68rem] font-semibold text-[#1F2937]">Validez {CHALLENGE_TARGET} images aujourd’hui</div>
              <div className="text-[0.56rem] text-[#94A3B8]">Récompense : +{CHALLENGE_REWARD} F sur votre solde.</div>
            </div>
            {s.challengeClaimed ? (
              <span className="px-2.5 py-1.5 rounded-lg bg-[rgba(34,197,94,0.1)] text-[#16A34A] font-black text-[0.58rem] shrink-0"><i className="fas fa-check mr-1"></i>Reçu</span>
            ) : (
              <button onClick={handleChallenge} disabled={!challengeReady} className={`px-3 py-1.5 rounded-lg font-black text-[0.6rem] border-none cursor-pointer shrink-0 transition-transform active:scale-95 ${challengeReady ? 'bg-gradient-to-r from-[#F59E0B] to-[#D97706] text-white' : 'bg-[rgba(0,0,0,0.04)] text-[#94A3B8] cursor-not-allowed'}`}>
                {challengeReady ? `+${CHALLENGE_REWARD} F` : 'En cours'}
              </button>
            )}
          </div>
        </div>

        {/* Objectif du mois : palier de prêt en cours */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(34,197,94,0.15)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <i className="fas fa-bullseye text-[#22C55E] text-[0.8rem]"></i>
              <div className="text-[0.82rem] font-bold text-[#1F2937]">Objectif du mois</div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(34,197,94,0.1)] text-[#22C55E]">Tâche à atteindre</span>
          </div>

          {/* Échelle des paliers */}
          <div className="flex gap-1.5 mb-3">
            {LOAN_TIERS.map((t) => {
              const done = s.loansTaken >= t.id;
              const current = t.id === tierIndex + 1 && !loanDone;
              return (
                <div key={t.id} className={`flex-1 py-1.5 rounded-lg text-center text-[0.55rem] font-black border ${done ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E] border-[rgba(34,197,94,0.25)]' : current ? 'bg-[rgba(245,158,11,0.08)] text-[#B45309] border-[rgba(245,158,11,0.3)]' : 'bg-[rgba(0,0,0,0.02)] text-[#94A3B8] border-[rgba(0,0,0,0.04)]'}`}>
                  {done ? '✓ ' : ''}{(t.amount / 1000)}k F
                </div>
              );
            })}
          </div>

          {!loanDone ? (
            <>
              <div className="text-[0.72rem] font-semibold text-[#1F2937] mb-1">🎯 Palier {tier.id} : obtenir un prêt de {formatCfa(tier.amount)}</div>
              <div className="text-[0.58rem] text-[#64748B] mb-3 leading-relaxed">
                Chaque image validée augmente votre solde et vous rapproche de l’objectif.
                Remboursement transparent : <strong>{formatCfa(tier.repay)} en {tier.days} jours</strong>.
              </div>

              <div className="flex justify-between items-end mb-1.5">
                <div className="text-[0.88rem] font-black text-[#1F2937]">{formatCfa(cautionOk ? tier.caution : Math.min(s.balance, tier.caution))} <span className="text-[#94A3B8] font-semibold text-[0.62rem]">/ {formatCfa(tier.caution)} d’épargne</span></div>
                <div className="text-[0.7rem] font-black text-[#22C55E]">{pctObjective} %</div>
              </div>
              <div className="w-full h-3 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${pctObjective}%` }} />
              </div>

              <div className="text-[0.6rem] font-black text-[#1F2937] uppercase tracking-wide mb-0.5">Les conditions</div>
              <div className="rounded-xl bg-[rgba(0,0,0,0.02)] p-2.5 mb-3">
                {cond(soldeOk, `Épargne — ${cautionOk ? 'caution couverte ✓' : `${formatCfa(s.balance)} / ${formatCfa(tier.caution)}`}`, 'Votre solde prouve votre capacité d’épargne — il finance ensuite la caution.')}
                {cond(cautionOk, `Caution — ${formatCfa(s.cautionBalance)} / ${formatCfa(tier.caution)}`, 'Garantie = la MOITIÉ de la somme empruntée, verrouillée pendant le prêt.')}
                {cond(referralOk, `Parrainages — ${s.referralCount} / ${tier.referrals}`, `Chaque filleul validé vous rapporte aussi +100 F.`)}
                {cond(levelOk, `Niveau ${LEVELS[tier.levelMin].name} requis — vous êtes ${level.name}`, `Gagnez de l’expérience : images validées, parrainages, régularité.`)}
              </div>

              <button
                onClick={handleLoan}
                className="w-full py-2.5 rounded-xl text-white font-semibold text-[0.75rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-[0.97] bg-gradient-to-r from-[#22C55E] to-[#16A34A]"
              >
                {eligible ? `Demander le prêt de ${formatCfa(tier.amount)}` : cautionOk ? 'Demander le prêt' : s.balance >= tier.caution ? `Verser la caution (${formatCfa(tier.caution)})` : 'Continuer à gagner'}
              </button>
            </>
          ) : (
            <div className="text-center py-3">
              <div className="text-[1.3rem] mb-1">🏆</div>
              <div className="text-[0.78rem] font-black text-[#22C55E]">Tous les paliers de prêt obtenus !</div>
              <div className="text-[0.6rem] text-[#64748B] mt-1">Vous gérez maintenant vos remboursements depuis votre portefeuille.</div>
            </div>
          )}
        </div>

        {/* Communauté en direct + top créateurs */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-2 h-2 rounded-full bg-[#22C55E]" style={{ animation: 'pulse 1.5s infinite' }}></div>
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide">En direct</div>
            <button onClick={() => setPage('chat')} className="ml-auto text-[0.58rem] font-bold text-[#22C55E] bg-transparent border-none cursor-pointer">Communauté <i className="fas fa-chevron-right text-[0.5rem]"></i></button>
          </div>
          <div key={feedIndex} className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl bg-[rgba(34,197,94,0.04)] border border-[rgba(34,197,94,0.08)] mb-3" style={{ animation: 'tIn 0.3s ease' }}>
            <div className="w-7 h-7 rounded-full bg-[rgba(34,197,94,0.12)] text-[#16A34A] flex items-center justify-center shrink-0 font-black text-[0.55rem]">
              {feed.name.split(' ').map((w) => w[0]).join('')}
            </div>
            <div className="text-[0.65rem] text-[#475569] flex-1 min-w-0"><strong className="text-[#1F2937]">{feed.name}</strong> {feed.action}{feed.amount > 0 && <span className="text-[#22C55E] font-black"> (+{feed.amount} F)</span>}</div>
            <div className="text-[0.52rem] text-[#94A3B8] shrink-0">{feed.when}</div>
          </div>
          <div className="text-[0.6rem] font-black text-[#1F2937] uppercase tracking-wide mb-1.5">Top créateurs de la semaine</div>
          {TOP_CREATORS.map((c, i) => (
            <div key={c.name} className="flex items-center gap-2.5 py-1.5">
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-[0.55rem] font-black shrink-0 ${i === 0 ? 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]' : i === 1 ? 'bg-[rgba(148,163,184,0.15)] text-[#64748B]' : 'bg-[rgba(180,83,9,0.1)] text-[#B45309]'}`}>{i + 1}</div>
              <div className="text-[0.68rem] font-semibold text-[#1F2937] flex-1">{c.name}</div>
              <div className="text-[0.58rem] text-[#94A3B8]"><i className="fas fa-fire text-[#EF4444] mr-1"></i>{c.streak} j</div>
              <div className="text-[0.65rem] font-black text-[#22C55E]">{formatCfa(c.earned)}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
