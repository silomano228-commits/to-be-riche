'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function WithdrawScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { addToast('Montant invalide', 'error'); return; }
    if (!address.trim()) { addToast('Adresse TRX requise', 'error'); return; }
    setWithdrawing(true);
    try {
      const res = await authFetch('/api/withdrawal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, trxAddress: address.trim() }) });
      const data = await res.json();
      if (data.success) { addToast('Retrait soumis !', 'success'); setAmount(''); setAddress(''); fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); }); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setWithdrawing(false);
  };

  if (!user) return null;

  return (
    <>
      <Header title="Retrait" icon="fa-arrow-up" iconColor="#F59E0B" leftElement={<button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="text-[0.7rem] text-[#64748B] uppercase font-semibold mb-1">Solde principal</div>
          <div className="text-[1.5rem] font-black text-[#1A2332] mb-4">{formatMoney(user.balance)}</div>
          <div className="mb-3"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Montant ($)</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#F59E0B]" /></div>
          <div className="mb-4"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Adresse TRX (Trust Wallet)</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="T..." className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#F59E0B]" /></div>
          <button onClick={handleWithdraw} disabled={withdrawing} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-60 shadow-[0_4px_20px_rgba(251,191,36,0.2)]"><i className="fas fa-arrow-up mr-2"></i>{withdrawing ? 'Envoi...' : 'Retirer'}</button>
        </div>
      </div>
    </>
  );
}
