'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function ProfileScreen() {
  const { user, clearUser, setPage, addToast } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showReferrals, setShowReferrals] = useState(false);

  const loadReferrals = async () => {
    try {
      const res = await authFetch('/api/referral/list');
      const data = await res.json();
      if (data.success) { setReferrals(data.referrals || []); setShowReferrals(true); }
    } catch { /* */ }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout'); } catch { /* */ }
    clearUser();
    addToast('Déconnecté', 'info');
  };

  if (!user) return null;

  return (
    <>
      <Header title="Profil" icon="fa-user" iconColor="#64748B" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* User Card */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 border border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00E676] to-[#00C853] flex items-center justify-center text-white font-bold text-[1.2rem] shadow-[0_4px_20px_rgba(0,200,83,0.3)]">{esc(user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2))}</div>
            <div><div className="text-[1.05rem] font-bold">{esc(user.name)}</div><div className="text-[0.75rem] text-[rgba(255,255,255,0.5)]">{esc(user.email)}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center"><div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase">Principal</div><div className="text-[0.95rem] font-black">{formatMoney(user.balance)}</div></div>
            <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center"><div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase">Investissement</div><div className="text-[0.95rem] font-black text-[#86EFAC]">{formatMoney(user.investBalance)}</div></div>
            <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center"><div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase">Trading</div><div className="text-[0.95rem] font-black text-[#93C5FD]">{formatMoney(user.tradeBalance)}</div></div>
            <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center"><div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase">Projet</div><div className="text-[0.95rem] font-black text-[#FDBA74]">{formatMoney(user.projectBalance)}</div></div>
          </div>
        </div>

        {/* Referral */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2.5 mb-3"><i className="fas fa-users text-[#FBBF24]"></i><h4 className="text-[0.88rem] font-bold text-[#1A2332]">Parrainage</h4></div>
          <div className="bg-[#FEF9C3] rounded-xl p-3 mb-3"><div className="text-[0.68rem] text-[#92400E] mb-1">Votre code</div><div className="text-[1.1rem] font-mono font-black text-[#78350F]">{user.referralCode}</div></div>
          <div className="flex items-center justify-between mb-2"><span className="text-[0.75rem] text-[#64748B]">Filleuls actifs</span><span className="text-[0.75rem] font-bold">{user.referralCount || 0}</span></div>
          <button onClick={loadReferrals} className="w-full py-2.5 rounded-xl bg-[#FEF9C3] text-[#78350F] font-semibold text-[0.82rem] border-none cursor-pointer"><i className="fas fa-list mr-1"></i>Voir mes filleuls</button>
        </div>

        {/* Referral List */}
        {showReferrals && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <h4 className="text-[0.82rem] font-bold text-[#1A2332] mb-2">Mes filleuls ({referrals.length})</h4>
            {referrals.length === 0 ? <p className="text-[0.75rem] text-[#94A3B8]">Aucun filleul pour le moment.</p> : referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.04)] last:border-none"><div><div className="text-[0.78rem] font-semibold">{esc(r.name)}</div><div className="text-[0.65rem] text-[#94A3B8]">{esc(r.email)}</div></div><span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${r.hasInvested ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{r.hasInvested ? 'Actif' : 'Inactif'}</span></div>
            ))}
          </div>
        )}

        {/* Analytics Button */}
        <button onClick={() => setPage('analytics')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.2)] mb-3 flex items-center justify-center gap-2"><i className="fas fa-chart-bar"></i> Analyses</button>

        {/* Admin Button */}
        {user.role === 'admin' && (
          <button onClick={() => setPage('admin')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] mb-3 flex items-center justify-center gap-2"><i className="fas fa-shield-alt"></i> Panneau Admin</button>
        )}

        {/* Logout */}
        <button onClick={() => setModalOpen(true)} className="w-full py-3.5 rounded-xl border-[1.5px] border-[rgba(239,68,68,0.15)] bg-transparent text-red-500 font-semibold text-[0.88rem] cursor-pointer flex items-center justify-center gap-2"><i className="fas fa-sign-out-alt"></i> Déconnexion</button>
      </div>
      {modalOpen && <Modal title="Déconnexion" text="Voulez-vous vous déconnecter ?" okText="Se déconnecter" okClass="bg-gradient-to-r from-[#F87171] to-[#EF4444]" onOk={handleLogout} onCancel={() => setModalOpen(false)} />}
    </>
  );
}
