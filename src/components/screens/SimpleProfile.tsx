'use client';

import { useAppStore, formatCfa } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import { useSimpleStore, REFERRAL_REQUIRED } from '@/lib/simple-store';

/* ================================================================
   PROFIL (épuré) — identité, code de parrainage, déconnexion.
   ================================================================ */

export default function SimpleProfile() {
  const { user, clearUser, addToast, setPage } = useAppStore();
  const s = useSimpleStore();
  if (!user) return null;

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

        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-3">
            <i className="fas fa-user text-[#22C55E] text-[1.6rem]"></i>
          </div>
          <div className="text-[1rem] font-black text-[#1F2937]">{user.name}</div>
          <div className="text-[0.65rem] text-[#94A3B8]">{user.email}</div>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(34,197,94,0.1)] text-[#22C55E]"><i className="fas fa-check-circle mr-1"></i>Compte vérifié</span>
            {user.role === 'ADMIN' && <span className="px-2.5 py-0.5 rounded-full text-[0.55rem] font-bold bg-[rgba(239,68,68,0.1)] text-[#EF4444]"><i className="fas fa-shield-halved mr-1"></i>Admin</span>}
          </div>
        </div>

        {/* Parrainage */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Parrainage</div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex-1 py-2.5 px-4 rounded-xl bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] text-[0.8rem] font-black text-[#1F2937] tracking-wider">
              {user.referralCode || 'JE-XXXX'}
            </div>
            <button onClick={copyCode} className="px-4 py-2.5 rounded-xl bg-[rgba(168,85,247,0.1)] text-[#7C3AED] font-bold text-[0.7rem] border border-[rgba(168,85,247,0.2)] cursor-pointer transition-transform active:scale-95">
              <i className="fas fa-copy mr-1"></i>Copier
            </button>
          </div>
          <div className="w-full h-2 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden mb-1.5">
            <div className="h-full bg-gradient-to-r from-[#A855F7] to-[#7C3AED] rounded-full" style={{ width: `${(s.referralCount / REFERRAL_REQUIRED) * 100}%` }} />
          </div>
          <div className="text-[0.6rem] text-[#64748B]">{s.referralCount} / {REFERRAL_REQUIRED} parrainages — condition pour le prêt de 5 000 F.</div>
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
