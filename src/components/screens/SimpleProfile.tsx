'use client';

import { useAppStore, formatCfa } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import {
  useSimpleStore, levelFor, LEVELS, LOAN_TIERS, INVEST_BOOST_REFERRALS, REFERRAL_BONUS,
} from '@/lib/simple-store';

/* ================================================================
   PROFIL — identité + niveau (parrainages OBLIGATOIRES pour monter)
   + crédibilité (téléphone à vérifier) + parrainage valorisé
   (+100 F/filleul, booster 7 % à 10 filleuls) + déconnexion.
   ================================================================ */

export default function SimpleProfile() {
  const { user, clearUser, addToast, setPage } = useAppStore();
  const s = useSimpleStore();
  if (!user) return null;

  const { level, index, next, toNext } = levelFor(s.xp, s.referralCount);
  const tier = LOAN_TIERS[Math.min(s.loansTaken, LOAN_TIERS.length - 1)];

  const copyCode = () => {
    const code = user.referralCode || 'BR-XXXX';
    try { navigator.clipboard.writeText(code); } catch { /* silencieux */ }
    addToast('Code de parrainage copié ✓', 'success');
  };

  const verifyPhone = () => {
    if (s.phoneVerified) return;
    s.markPhoneVerified();
    addToast('Numéro vérifié — crédibilité +20 pts ✓', 'success');
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
          <div className="text-[0.65rem] text-[#94A3B8]">{user.email}{user.phone ? ` · ${user.phone}` : ''}</div>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap justify-center">
            <span className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-black" style={{ background: level.color + '15', color: level.color }}>
              <i className={`fas ${level.icon} mr-1`}></i>Niveau {level.name}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[0.55rem] font-bold ${s.phoneVerified ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]' : 'bg-[rgba(245,158,11,0.1)] text-[#B45309]'}`}>
              <i className={`fas ${s.phoneVerified ? 'fa-check-circle' : 'fa-circle-exclamation'} mr-1`}></i>{s.phoneVerified ? 'Vérifié' : 'Téléphone à vérifier'}
            </span>
            {user.role === 'ADMIN' && <span className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(239,68,68,0.1)] text-[#EF4444]"><i className="fas fa-shield-halved mr-1"></i>Admin</span>}
          </div>
        </div>

        {/* Vérification du téléphone (crédibilité +20) */}
        {!s.phoneVerified && (
          <button onClick={verifyPhone} className="w-full bg-white rounded-2xl p-4 mb-3 border border-[rgba(245,158,11,0.3)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(245,158,11,0.1)] shrink-0"><i className="fas fa-phone text-[#F59E0B] text-[0.85rem]"></i></div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.72rem] font-bold text-[#1F2937]">Vérifier mon numéro de téléphone</div>
                <div className="text-[0.56rem] text-[#64748B] leading-snug">Un numéro unique par compte — +20 pts de crédibilité (prêt débloqué plus vite).</div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-[rgba(245,158,11,0.12)] text-[#B45309] font-black text-[0.55rem] shrink-0">+20</span>
            </div>
          </button>
        )}

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
            Avantage actuel : <strong>{level.perk}</strong>. Monter de niveau exige <strong>de l’XP ET des parrainages</strong> (obligatoire) : Argent 1 filleul, Or 3, Diamant 5.
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
            <strong>Obligatoire</strong> pour monter de niveau et pour le <strong>premier retrait</strong>.
            À <strong>{INVEST_BOOST_REFERRALS} filleuls</strong> : taux boosté à <strong>7 %/jour</strong>.
            Et les parrainages comptent pour le prêt (palier {tier.id} : {tier.referrals} requis).
          </div>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="flex-1 py-2.5 px-4 rounded-xl bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] text-[0.8rem] font-black text-[#1F2937] tracking-wider">
              {user.referralCode || 'BR-XXXX'}
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
