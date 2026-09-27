'use client';

import { useState } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import { YasModal } from '@/components/yas-modal';
import {
  useSimpleStore, investRateFor, INVEST_BOOST_REFERRALS, REFERRAL_BONUS, SUPPORT_PROJECTS,
} from '@/lib/simple-store';

/* ================================================================
   INVESTIR — l'ancienne présentation, adaptée à Yas :
   carte info + étapes 1-2-3 + montant + projets à soutenir,
   dépôt vérifié par l'admin, gains journaliers réclamables,
   booster 7 % à 10 filleuls.
   ================================================================ */

const PRESETS = [1000, 3000, 5000, 10000];

export default function SimpleInvest({ onBack }: { onBack?: () => void }) {
  const { addToast, setPage } = useAppStore();
  const s = useSimpleStore();
  const [amount, setAmount] = useState('');
  const [yasDeposit, setYasDeposit] = useState(false);
  const [yasWithdraw, setYasWithdraw] = useState(false);

  const inv = s.invest;
  const rate = investRateFor(s.referralCount);
  const ratePct = Math.round(rate * 100);
  const dailyGain = Math.round(inv.invested * rate);
  const value = parseInt(amount, 10) || 0;

  /* Projection temps réel pour le montant saisi */
  const projDaily = Math.round(value * rate);
  const projMonthly = projDaily * 30;

  const pendingDeposit = s.yasTransfers.find((t) => t.project === 'invest' && t.kind === 'deposit' && t.status === 'pending');

  const backBtn = onBack ? (
    <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#64748B] cursor-pointer border-none mr-1">
      <i className="fas fa-arrow-left text-[0.8rem]"></i>
    </button>
  ) : undefined;

  const handleClaim = () => {
    const r = s.claimDailyGains();
    if (r.ok) addToast(`+${formatCfa(r.gain || 0)} crédités sur votre solde ✓ (+5 XP)`, 'success');
    else addToast(r.reason || 'Impossible', 'info');
  };

  const openYasDeposit = () => {
    if (value < 1000) { addToast('Choisissez un montant (min. 1 000 F)', 'error'); return; }
    setYasDeposit(true);
  };

  return (
    <>
      <Header title="Investir" icon="fa-chart-line" leftElement={backBtn} />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ===== Carte info (comme avant) ===== */}
        <div className="rounded-xl p-3.5 flex items-start gap-3 mb-3 bg-[#EFF6FF] border-l-[3px] border-[#2962FF]">
          <i className="fas fa-circle-info text-[#1E40AF] mt-0.5 shrink-0 text-[0.85rem]"></i>
          <div>
            <h4 className="text-[0.78rem] mb-0.5 font-bold text-[#1E40AF]">Dépôt via Yas (mobile money)</h4>
            <p className="text-[0.62rem] leading-relaxed text-[#1E3A5F]">
              Envoyez le montant au compte Yas de la plateforme. L&apos;administrateur vérifie le paiement, puis votre argent est crédité.
              Vous réclamez vos <strong>gains journaliers ({ratePct} %)</strong> chaque jour et vous pouvez retirer à tout moment.
            </p>
          </div>
        </div>

        {/* ===== Étapes (comme avant) ===== */}
        <div className="flex gap-2 mb-4">
          {['Montant', 'Numéro Yas', 'Envoyer'].map((label, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.62rem] font-bold ${i === 0 ? 'bg-[#2962FF] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>{i + 1}</div>
              <span className="text-[0.55rem] text-[#94A3B8] font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* ===== Montant (comme avant) ===== */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Montant à investir</div>
          <div className="relative mb-3">
            <input
              type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
              placeholder="Min. 1 000 F"
              className="w-full py-3 px-4 pr-14 rounded-xl bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] text-[0.85rem] font-bold text-[#1F2937] outline-none focus:bg-white focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.08)]"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.65rem] font-bold text-[#94A3B8]">FCFA</span>
          </div>
          <div className="flex gap-1.5 mb-3">
            {PRESETS.map((v) => (
              <button key={v} onClick={() => setAmount(String(v))} className={`flex-1 py-2.5 rounded-lg text-[0.65rem] font-bold text-center cursor-pointer border-[1.5px] transition-all active:scale-95 ${amount === String(v) ? 'border-[rgba(41,98,255,0.4)] bg-[rgba(41,98,255,0.06)] text-[#2962FF]' : 'border-[rgba(0,0,0,0.06)] bg-white text-[#1A2332]'}`}>
                {v.toLocaleString('fr-FR')} F
              </button>
            ))}
          </div>

          {/* Projection temps réel */}
          {value > 0 && (
            <div className="flex items-center gap-3 py-3 px-3.5 rounded-xl bg-[rgba(20,184,166,0.06)] border border-[rgba(20,184,166,0.15)] mb-3" style={{ animation: 'tIn 0.25s ease' }}>
              <i className="fas fa-chart-simple text-[#0D9488] text-[0.8rem]"></i>
              <div className="flex-1 min-w-0">
                <div className="text-[0.62rem] font-bold text-[#1F2937]">Si vous investissez {formatCfa(value)} :</div>
                <div className="text-[0.58rem] text-[#64748B]">+{formatCfa(projDaily)} chaque jour · +{formatCfa(projMonthly)} par mois</div>
              </div>
              <div className="text-[0.72rem] font-black text-[#0D9488] shrink-0">+{ratePct} %/j</div>
            </div>
          )}

          <button onClick={openYasDeposit} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-bold text-[0.82rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] transition-transform active:scale-[0.97] flex items-center justify-center gap-2">
            <i className="fas fa-paper-plane"></i> Déposer via Yas
          </button>

          {pendingDeposit && (
            <div className="flex items-center gap-2 mt-3 py-2.5 px-3 rounded-xl bg-[#FEF3C7] border border-[rgba(245,158,11,0.3)]">
              <i className="fas fa-hourglass-half text-[#F59E0B] text-[0.7rem]" style={{ animation: 'pulse 1.5s infinite' }}></i>
              <div className="text-[0.6rem] text-[#92400E] flex-1">Dépôt de {formatCfa(pendingDeposit.amount)} en attente de vérification…</div>
              <button onClick={() => setYasDeposit(true)} className="text-[0.58rem] font-black text-[#B45309] bg-transparent border-none cursor-pointer underline">Suivre</button>
            </div>
          )}
        </div>

        {/* ===== Projets à soutenir (comme avant) ===== */}
        <div className="flex justify-between items-center mb-2.5 mt-1">
          <h3 className="text-[0.8rem] font-bold text-[#1F2937]">Projets à soutenir</h3>
        </div>
        {SUPPORT_PROJECTS.map((p) => (
          <div key={p.id} className="flex gap-3 p-3.5 bg-white rounded-2xl mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] items-center border border-[rgba(0,0,0,0.04)]">
            <img src={p.img} className="w-[50px] h-[50px] rounded-lg object-cover shrink-0" loading="lazy" alt={p.name} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[0.8rem] mb-0.5 text-[#1A2332]">{p.name}</div>
              <div className="text-[0.62rem] text-[#94A3B8] font-medium">{p.sector} · {p.description}</div>
            </div>
            <button onClick={() => setAmount(String(p.suggested))} className="text-[0.62rem] py-2 px-3 bg-[#00C853] text-white rounded-lg border-none cursor-pointer font-bold whitespace-nowrap shrink-0 transition-transform active:scale-95">+{p.suggested.toLocaleString('fr-FR')} F</button>
          </div>
        ))}

        {/* ===== Carte investissement (solde actif) ===== */}
        <div className="bg-gradient-to-br from-[#0F766E] via-[#14B8A6] to-[#0D9488] text-white rounded-2xl p-4 mb-3 relative overflow-hidden mt-3">
          <div className="absolute -top-10 -right-10 w-[130px] h-[130px] bg-[radial-gradient(circle,rgba(255,255,255,0.15),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="text-[0.58rem] text-white/70 font-bold uppercase tracking-wide mb-1">Montant investi</div>
            <div className="text-[1.6rem] font-black leading-none">{formatCfa(inv.invested)}</div>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <div className="text-[0.55rem] text-white/60 font-bold uppercase">Gains du jour</div>
                <div className="text-[0.85rem] font-black text-[#FBBF24]">+{formatCfa(dailyGain)}</div>
              </div>
              <div>
                <div className="text-[0.55rem] text-white/60 font-bold uppercase">Total gagné</div>
                <div className="text-[0.85rem] font-black">+{formatCfa(inv.totalEarned)}</div>
              </div>
              <div>
                <div className="text-[0.55rem] text-white/60 font-bold uppercase">Votre taux</div>
                <div className="text-[0.85rem] font-black">{ratePct} %/jour</div>
              </div>
            </div>
            <button
              onClick={handleClaim}
              disabled={inv.claimedToday || inv.invested <= 0}
              className={`w-full mt-4 py-2.5 rounded-xl font-bold text-[0.75rem] border-none cursor-pointer transition-transform active:scale-[0.97] ${inv.claimedToday || inv.invested <= 0 ? 'bg-white/15 text-white/50 cursor-not-allowed' : 'bg-white text-[#0D9488] shadow-[0_2px_10px_rgba(0,0,0,0.15)]'}`}
            >
              {inv.invested <= 0 ? 'Déposez pour commencer à gagner' : inv.claimedToday ? 'Gains du jour déjà réclamés ✓' : `Réclamer mes gains du jour (+${dailyGain} F)`}
            </button>
          </div>
        </div>

        {/* ===== Booster 7 % : verrouillé à 10 filleuls ===== */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(245,158,11,0.3)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <i className="fas fa-bolt text-[#F59E0B] text-[0.85rem]"></i>
              <div className="text-[0.78rem] font-bold text-[#1F2937]">Booster 7 %/jour</div>
            </div>
            {s.referralCount >= INVEST_BOOST_REFERRALS
              ? <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-black bg-[rgba(34,197,94,0.1)] text-[#22C55E]">DÉBLOQUÉ</span>
              : <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-black bg-[rgba(245,158,11,0.1)] text-[#B45309]"><i className="fas fa-lock mr-1"></i>VERROUILLÉ</span>}
          </div>
          <div className="text-[0.6rem] text-[#64748B] mb-2 leading-relaxed">
            Passez de 5 % à <strong>7 % de gains quotidiens</strong> en invitant <strong>{INVEST_BOOST_REFERRALS} filleuls validés</strong>.
            Et chaque filleul validé vous rapporte <strong>+{REFERRAL_BONUS} F</strong> immédiatement.
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-2 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (s.referralCount / INVEST_BOOST_REFERRALS) * 100)}%` }} />
            </div>
            <div className="text-[0.6rem] font-black text-[#B45309] shrink-0">{s.referralCount}/{INVEST_BOOST_REFERRALS}</div>
            <button onClick={() => setPage('profile')} className="px-3 py-1.5 rounded-lg bg-[rgba(245,158,11,0.1)] text-[#B45309] font-black text-[0.58rem] border border-[rgba(245,158,11,0.2)] cursor-pointer shrink-0 transition-transform active:scale-95">Inviter</button>
          </div>
        </div>

        {/* ===== Retraits ===== */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Retirer mon investissement</div>
          <div className="text-[0.6rem] text-[#64748B] mb-3 leading-relaxed">
            Retrait interne instantané vers votre solde, ou <strong>retrait réel via Yas</strong> vers votre compte mobile money (vérifié par l&apos;administrateur).
            {s.withdrawalsDone === 0 && s.referralCount < 1 && <span className="text-[#B45309] font-bold"> Premier retrait : 1 filleul requis.</span>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (value <= 0) { addToast('Choisissez un montant à retirer', 'error'); return; }
                if (value > inv.invested) { addToast('Montant investi insuffisant', 'error'); return; }
                s.withdraw(value);
                addToast(`${formatCfa(value)} retirés vers votre solde`, 'success');
                setAmount('');
              }}
              className="flex-1 py-3 rounded-xl bg-[rgba(0,0,0,0.04)] text-[#475569] font-bold text-[0.75rem] border border-[rgba(0,0,0,0.05)] cursor-pointer transition-transform active:scale-95"
            >
              Vers mon solde
            </button>
            <button onClick={() => setYasWithdraw(true)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#2962FF] to-[#1D4ED8] text-white font-bold text-[0.75rem] border-none cursor-pointer transition-transform active:scale-95">
              Via Yas ({formatCfa(inv.invested)})
            </button>
          </div>
        </div>
      </div>

      <YasModal open={yasDeposit} kind="deposit" project="invest" onClose={() => setYasDeposit(false)} />
      <YasModal open={yasWithdraw} kind="withdrawal" project="invest" onClose={() => setYasWithdraw(false)} />
    </>
  );
}
