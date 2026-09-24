'use client';

import { useAppStore, formatCfa } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import {
  useSimpleStore, levelFor, LEVELS, LOAN_TIERS, INVEST_BOOST_REFERRALS, REFERRAL_BONUS,
} from '@/lib/simple-store';

/* ================================================================
   PROFIL — identité + niveau + parrainage valorisé (+100 F/filleul,
   booster 7 % à 10 filleuls) + déconnexion.
   ================================================================ */

export default function SimpleProfile() {
  const { user, clearUser, addToast, setPage } = useAppStore();
  const s = useSimpleStore();
  if (!user) return null;

  const { level, index, next, toNext } = levelFor(s.xp);
  const tier = LOAN_TIERS[Math.min(s.loansTaken, LOAN_TIERS.length - 1)];

  const copyCode = () => {
    const code = user.referralCode || 'JE-XXXX';
    try { navigator.clipboard.writeText(code); } catch { /* silencieux */ }
    addToast('Code de parrainage copié ✓', 'success');
  };

  return (
    <>
      <Header
        title="Profil"
        leftElement={
          <button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#64748B] cursor-pointer border-none mr-1">
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-6">

        <div className="flex flex-col items-center mb-5">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ background: level.color + '15' }}>
            <i className={`fas ${level.icon} text-[1.5rem]`} style={{ color: level.color }}></i>
          </div>
          <div className="text-[1rem] font-black text-[#1F2937]">{user.name}</div>
          <div className="text-[0.65rem] text-[#94A3B8]">{user.email}</div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
            <span className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-black" style={{ background: level.color + '15', color: level.color }}>
              <i className={`fas ${level.icon} mr-1`}></i>Niveau {level.name}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(34,197,94,0.1)] text-[#22C55E]"><i className="fas fa-check-circle mr-1"></i>Vérifié</span>
            {user.role === 'ADMIN' && <span className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(239,68,68,0.1)] text-[#EF4444]"><i className="fas fa-shield-halved mr-1"></i>Admin</span>}
          </div>
        </div>

        {/* Niveau + XP */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-center mb-2">
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide">Progression</div>
            <div className="text-[0.6rem] text-[#94A3B8]"><strong className="text-[#1F2937]">{s.xp} XP</strong>{next ? ` · ${toNext} jusqu’à ${next.name}` : ' · niveau max'}</div>
          </div>
          <div className="w-full h-2.5 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mb-3">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: next ? `${Math.min(100, Math.round(((s.xp - level.min) / (next.min - level.min)) * 100))}%` : '100%', background: `linear-gradient(90deg, ${level.color}, ${next?.color || level.color})` }} />
          </div>
          <div className="flex gap-1.5">
            {LEVELS.map((l, i) => (
              <div key={l.name} className={`flex-1 py-1.5 rounded-lg text-center border text-[0.52rem] font-black ${i <= index ? 'bg-white border-[rgba(0,0,0,0.1)]' : 'bg-[rgba(0,0,0,0.02)] border-[rgba(0,0,0,0.04)] text-[#94A3B8]'}`} style={i <= index ? { color: l.color } : {}}>
                {l.name}
              </div>
            ))}
          </div>
          <div className="text-[0.58rem] text-[#64748B] mt-2.5 leading-relaxed">
            Avantage actuel : <strong>{level.perk}</strong>. Gagnez de l’XP : images validées (+10), parrainages (+50), dépôts (+20), régularité.
          </div>
        </div>

        {/* Parrainage : +100 F par filleul + booster */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(168,85,247,0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-user-plus text-[#A855F7] text-[0.8rem]"></i>
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide">Parrainage</div>
          </div>
          <div className="text-[0.6rem] text-[#64748B] mb-3 leading-relaxed">
            Chaque filleul validé : <strong className="text-[#A855F7]">+{REFERRAL_BONUS} F</strong> immédiatement.
            À <strong>{INVEST_BOOST_REFERRALS} filleuls</strong> : taux d’investissement boosté à <strong>7 %/jour</strong>.
            Et les parrainages comptent pour le prêt (palier {tier.id} : {tier.referrals} requis).
          </div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex-1 py-2.5 px-4 rounded-xl bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] text-[0.8rem] font-black text-[#1F2937] tracking-wider">
              {user.referralCode || 'JE-XXXX'}
            </div>
            <button onClick={copyCode} className="px-4 py-2.5 rounded-xl bg-[rgba(168,85,247,0.1)] text-[#7C3AED] font-bold text-[0.7rem] border border-[rgba(168,85,247,0.2)] cursor-pointer transition-transform active:scale-95">
              <i className="fas fa-copy mr-1"></i>Copier
            </button>
          </div>
          <div className="w-full h-2 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-gradient-to-r from-[#A855F7] to-[#7C3AED] rounded-full" style={{ width: `${Math.min(100, (s.referralCount / INVEST_BOOST_REFERRALS) * 100)}%` }} />
          </div>
          <div className="text-[0.6rem] text-[#64748B]">{s.referralCount} / {INVEST_BOOST_REFERRALS} filleuls pour le booster 7 % · {s.referralCount} / {tier.referrals} pour le prêt</div>
        </div>

        {/* Solde rapide */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <LogoImg className="w-9 h-9 rounded-xl" />
          <div className="flex-1">
            <div className="text-[0.6rem] text-[#94A3B8] font-bold uppercase">Solde disponible</div>
            <div className="text-[0.95rem] font-black text-[#1F2937]">{formatCfa(s.balance)}</div>
          </div>
          <button onClick={() => setPage('wallet')} className="px-4 py-2 rounded-xl bg-[rgba(34,197,94,0.1)] text-[#16A34A] font-bold text-[0.65rem] border border-[rgba(34,197,94,0.15)] cursor-pointer transition-transform active:scale-95">Portefeuille</button>
        </div>

        {/* Déconnexion */}
        <button onClick={clearUser} className="w-full py-3 rounded-xl bg-white text-[#EF4444] font-bold text-[0.78rem] border border-[rgba(239,68,68,0.2)] cursor-pointer transition-transform active:scale-[0.98]">
          <i className="fas fa-right-from-bracket mr-1.5"></i>Déconnexion
        </button>
      </div>
    </>
  );
}
