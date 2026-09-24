'use client';

import { useState } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import {
  useSimpleStore, investRateFor, INVEST_BOOST_REFERRALS, REFERRAL_BONUS,
} from '@/lib/simple-store';

/* ================================================================
   INVESTIR — convaincant :
   projection temps réel, taux boosté via parrainages (recrutement),
   gains journaliers réclamables une fois par jour.
   ================================================================ */

const PRESETS = [500, 1000, 2500];

export default function SimpleInvest() {
  const { addToast, setPage } = useAppStore();
  const s = useSimpleStore();
  const [amount, setAmount] = useState('');
  const inv = s.invest;
  const rate = investRateFor(s.referralCount);
  const ratePct = Math.round(rate * 100);
  const dailyGain = Math.round(inv.invested * rate);
  const value = parseInt(amount, 10) || 0;

  /* Projection temps réel pour le montant saisi */
  const projDaily = Math.round(value * rate);
  const projMonthly = projDaily * 30;

  const handleDeposit = () => {
    if (value <= 0) { addToast('Choisissez un montant à déposer', 'error'); return; }
    if (value > s.balance) { addToast('Solde disponible insuffisant', 'error'); return; }
    s.deposit(value);
    addToast(`${formatCfa(value)} déposés — +${Math.round(value * rate)} F dès demain (+20 XP)`, 'success');
    setAmount('');
  };

  const handleWithdraw = () => {
    if (value <= 0) { addToast('Choisissez un montant à retirer', 'error'); return; }
    if (value > inv.invested) { addToast('Montant investi insuffisant', 'error'); return; }
    s.withdraw(value);
    addToast(`${formatCfa(value)} retirés vers votre solde`, 'success');
    setAmount('');
  };

  const handleClaim = () => {
    const r = s.claimDailyGains();
    if (r.ok) addToast(`+${formatCfa(r.gain || 0)} crédités sur votre solde ✓ (+5 XP)`, 'success');
    else addToast(r.reason || 'Impossible', 'info');
  };

  return (
    <>
      <Header title="Investir" icon="fa-chart-line" />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* Carte investissement */}
        <div className="bg-gradient-to-br from-[#0F766E] via-[#14B8A6] to-[#0D9488] text-white rounded-2xl p-4 mb-3 relative overflow-hidden">
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

        {/* Règle simple */}
        <div className="bg-white rounded-2xl p-3.5 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-start gap-2.5">
          <i className="fas fa-circle-info text-[#14B8A6] text-[0.8rem] mt-0.5"></i>
          <div className="text-[0.65rem] text-[#475569] leading-relaxed flex-1">
            Déposez de l’argent depuis votre solde : il vous rapporte <strong>{ratePct} % chaque jour</strong>.
            Les gains sont ajoutés à votre solde et visibles dans votre portefeuille. Vous pouvez retirer votre investissement à tout moment.
          </div>
        </div>

        {/* Booster 7 % : verrouillé à 10 filleuls (moteur de recrutement) */}
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

        {/* Déposer / Retirer + projection */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Déposer / Retirer</div>
          <div className="text-[0.55rem] text-[#94A3B8] mb-2">Solde disponible : <strong className="text-[#16A34A]">{formatCfa(s.balance)}</strong></div>
          <div className="flex gap-2 mb-3">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => setAmount(String(p))} className={`flex-1 py-2 rounded-lg text-[0.65rem] font-bold border cursor-pointer transition-all active:scale-95 ${amount === String(p) ? 'bg-[rgba(20,184,166,0.1)] border-[rgba(20,184,166,0.4)] text-[#0D9488]' : 'bg-[rgba(0,0,0,0.03)] border-[rgba(0,0,0,0.04)] text-[#64748B]'}`}>
                {p.toLocaleString('fr-FR')} F
              </button>
            ))}
          </div>
          <input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant en FCFA"
            className="w-full py-3 px-4 rounded-xl bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] text-[0.8rem] font-bold text-[#1F2937] outline-none focus:border-[rgba(20,184,166,0.5)] mb-3"
          />

          {/* Projection temps réel */}
          {value > 0 && (
            <div className="flex items-center gap-3 py-3 px-3.5 rounded-xl bg-[rgba(20,184,166,0.06)] border border-[rgba(20,184,166,0.15)] mb-3" style={{ animation: 'tIn 0.25s ease' }}>
              <i className="fas fa-chart-simple text-[#0D9488] text-[0.8rem]"></i>
              <div className="flex-1 min-w-0">
                <div className="text-[0.62rem] font-bold text-[#1F2937]">Si vous déposez {formatCfa(value)} :</div>
                <div className="text-[0.58rem] text-[#64748B]">+{formatCfa(projDaily)} chaque jour · +{formatCfa(projMonthly)} par mois</div>
              </div>
              <div className="text-[0.72rem] font-black text-[#0D9488] shrink-0">+{ratePct} %/j</div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleDeposit} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#14B8A6] to-[#0D9488] text-white font-bold text-[0.78rem] border-none cursor-pointer transition-transform active:scale-95">
              Déposer
            </button>
            <button onClick={handleWithdraw} className="flex-1 py-3 rounded-xl bg-[rgba(0,0,0,0.04)] text-[#475569] font-bold text-[0.78rem] border border-[rgba(0,0,0,0.05)] cursor-pointer transition-transform active:scale-95">
              Retirer
            </button>
          </div>
        </div>

        {/* Historique invest (compact) */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Historique</div>
          {s.transactions.filter((t) => t.kind === 'invest' || t.kind === 'daily').length === 0 && (
            <div className="text-center text-[0.65rem] text-[#94A3B8] py-5">Aucune opération d’investissement pour l’instant. Déposez pour démarrer vos gains journaliers.</div>
          )}
          {s.transactions.filter((t) => t.kind === 'invest' || t.kind === 'daily').slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 py-2 border-b border-[rgba(0,0,0,0.04)] last:border-0">
              <i className={`fas ${t.amount > 0 ? 'fa-arrow-trend-up text-[#14B8A6]' : 'fa-arrow-trend-down text-[#F59E0B]'} text-[0.72rem] w-5 text-center shrink-0`}></i>
              <div className="flex-1 min-w-0">
                <div className="text-[0.68rem] font-semibold text-[#1F2937] truncate">{t.label}</div>
                <div className="text-[0.55rem] text-[#94A3B8]">{t.date}</div>
              </div>
              <div className={`text-[0.72rem] font-black shrink-0 ${t.amount > 0 ? 'text-[#14B8A6]' : 'text-[#F59E0B]'}`}>
                {t.amount > 0 ? '+' : '−'}{formatCfa(Math.abs(t.amount))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
