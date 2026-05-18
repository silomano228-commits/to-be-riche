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
      <Header title="Retrait" icon="fa-arrow-up" iconColor="#B89B5E" leftElement={<button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.45)] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 mb-4">
          <div className="text-[0.7rem] text-[rgba(255,255,255,0.45)] uppercase font-semibold mb-1">Solde principal</div>
          <div className="text-[1.5rem] font-black text-[#EDEDEF] mb-4">{formatMoney(user.balance)}</div>
          <div className="mb-3"><label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.45)]">Montant ($)</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.88rem] outline-none focus:border-[#B89B5E] text-white placeholder:text-[rgba(255,255,255,0.25)]" /></div>
          <div className="mb-4"><label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.45)]">Adresse TRX (Trust Wallet)</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="T..." className="w-full py-3 px-4 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.88rem] outline-none focus:border-[#B89B5E] text-white placeholder:text-[rgba(255,255,255,0.25)]" /></div>
          <button onClick={handleWithdraw} disabled={withdrawing} className="w-full py-3.5 rounded-xl bg-[#B89B5E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-60"><i className="fas fa-arrow-up mr-2"></i>{withdrawing ? 'Envoi...' : 'Retirer'}</button>
        </div>
      </div>
    </>
  );
}
