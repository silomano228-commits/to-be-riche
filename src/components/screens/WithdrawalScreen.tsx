'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

export default function WithdrawalScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [amount, setAmount] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [step, setStep] = useState<'form' | 'pending' | 'done'>('form');

  // Load existing withdrawals
  useEffect(() => {
    if (!user) return;
    authFetch('/api/withdrawal').then(r => r.json()).then(data => {
      if (data.success) {
        setWithdrawals(data.data || []);
        // If there's a pending withdrawal, show pending state
        const pending = (data.data || []).find((w: any) => w.status === 'pending');
        if (pending) setStep('pending');
      }
    }).catch(() => {});
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) { addToast('Minimum de retrait : 5 $', 'error'); return; }
    if (amt > user.balance) { addToast('Solde insuffisant', 'error'); return; }
    if (!trxAddress || trxAddress.length < 20) { addToast('Adresse TRX invalide', 'error'); return; }

    setLoading(true);
    try {
      const res = await authFetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, trxAddress }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Demande de retrait envoyée !', 'success');
        setStep('pending');
        // Refresh withdrawals
        const wRes = await authFetch('/api/withdrawal');
        const wData = await wRes.json();
        if (wData.success) setWithdrawals(wData.data || []);
      } else {
        addToast(data.error, 'error');
      }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  // Check withdrawal status periodically
  useEffect(() => {
    if (step !== 'pending') return;
    const interval = setInterval(async () => {
      try {
        const res = await authFetch('/api/withdrawal');
        const data = await res.json();
        if (data.success) {
          setWithdrawals(data.data || []);
          const pending = (data.data || []).find((w: any) => w.status === 'pending');
          if (!pending) {
            // Withdrawal processed — refresh user data
            const sessRes = await fetch('/api/auth/session');
            const sessData = await sessRes.json();
            if (sessData.success && sessData.user) setUser(sessData.user);
            setStep('done');
          }
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [step, setUser]);

  if (!user) return null;

  // Pending withdrawal view
  if (step === 'pending') {
    const pendingW = withdrawals.find((w: any) => w.status === 'pending');
    return (
      <>
        <Header title="Retrait en attente" icon="fa-clock" iconColor="#F59E0B" rightElement={
          <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-times"></i></button>
        } />
        <div className="px-[18px] py-4 flex-1 w-full flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-4">
            <i className="fas fa-hourglass-half text-[#F59E0B] text-[2rem]"></i>
          </div>
          <h3 className="text-[1.1rem] font-bold text-[#1A2332] mb-2">Demande en traitement</h3>
          <p className="text-[0.82rem] text-[#64748B] mb-6 text-center">Votre demande de retrait de <strong>{pendingW ? formatMoney(pendingW.amount) : ''}</strong> est en cours de traitement par notre équipe.</p>

          <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.05)] divide-y divide-[#F1F5F9] w-full mb-5">
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Montant</span>
              <span className="text-[0.8rem] font-bold text-[#1A2332]">{pendingW ? formatMoney(pendingW.amount) : ''}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Adresse TRX</span>
              <span className="text-[0.68rem] font-mono text-[#1A2332] max-w-[180px] truncate">{pendingW ? pendingW.trxAddress : ''}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Statut</span>
              <span className="px-2.5 py-1 rounded-md text-[0.58rem] font-bold uppercase tracking-[0.5px] bg-[#FEF3C7] text-[#92400E]">En attente</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[#94A3B8] mb-5">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B]" style={{ animation: 'pod 2s infinite' }} />
            <span className="text-[0.72rem]">Vérification en cours...</span>
          </div>

          <button onClick={() => setPage('wallet')} className="w-full max-w-[200px] py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97]">
            Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // Withdrawal completed view
  if (step === 'done') {
    return (
      <>
        <Header title="Retrait validé" icon="fa-check-circle" iconColor="#00C853" />
        <div className="px-[18px] py-4 flex-1 w-full flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-4">
            <i className="fas fa-check text-[#00C853] text-[2rem]"></i>
          </div>
          <h3 className="text-[1.1rem] font-bold text-[#1A2332] mb-2">Retrait approuvé !</h3>
          <p className="text-[0.82rem] text-[#64748B] mb-6 text-center">Votre retrait a été approuvé. Les fonds seront envoyés à votre adresse TRX.</p>
          <button onClick={() => setPage('wallet')} className="w-full max-w-[200px] py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97]">
            Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // Form view
  return (
    <>
      <Header title="Retrait" icon="fa-arrow-up" iconColor="#F59E0B" rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-times"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* 48h restriction check */}
        {user.firstDepositAt && !user.canWithdraw && (user.hoursUntilWithdrawal || 0) > 0 && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#EFF6FF] border-l-[3px] border-[#3B82F6]">
            <i className="fas fa-clock text-[#2563EB] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div>
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#1E40AF]">Premier retrait dans {user.hoursUntilWithdrawal}h</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#3B82F6]">Vous devez attendre 48h après votre premier dépôt avant de pouvoir retirer vos gains.</p>
            </div>
          </div>
        )}

        <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FFFBEB] border-l-[3px] border-[#F59E0B]">
          <i className="fas fa-info-circle text-[#B45309] mt-0.5 shrink-0 text-[0.9rem]"></i>
          <div>
            <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#B45309]">Retrait depuis les gains</h4>
            <p className="text-[0.72rem] leading-relaxed text-[#92400E]">Vous pouvez retirer uniquement depuis votre <strong>compte de gains</strong>. Le retrait sera envoyé en TRX à votre adresse Trust Wallet après validation par notre équipe. Premier retrait possible 48h après le premier dépôt.</p>
          </div>
        </div>

        {/* Referral Required Warning in Withdrawal */}
        {user.needsReferral && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FEE2E2] border-l-[3px] border-[#DC2626]">
            <i className="fas fa-user-friends text-[#DC2626] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#991B1B]">Parrainage obligatoire</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#991B1B]">Après {user.completedWithdrawals && user.completedWithdrawals >= 4 ? 'vos ' + user.completedWithdrawals + ' retraits' : '4 retraits'}, vous devez parrainer au moins {user.requiredReferrals} personne{user.requiredReferrals && user.requiredReferrals > 1 ? 's' : ''}. Vous avez {user.referralCount || 0} filleul{user.referralCount === 1 ? '' : 's'}.</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[0.68rem] text-[#991B1B] font-semibold">Votre code :</span>
                <span className="bg-[#991B1B] text-white px-3 py-1 rounded-lg text-[0.78rem] font-bold font-mono">{user.referralCode}</span>
              </div>
              <button onClick={() => setPage('referral')} className="mt-2 py-2 px-4 text-[0.72rem] bg-[#DC2626] text-white rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(220,38,38,0.2)] transition-transform active:scale-95"><i className="fas fa-share-alt mr-1"></i>Partager mon code</button>
            </div>
          </div>
        )}

        {/* Available gains */}
        <div className="bg-[#F0FDF4] rounded-2xl p-5 mb-5 border border-[#BBF7D0] text-center">
          <div className="text-[0.68rem] text-[#166534] font-semibold uppercase tracking-[0.5px] mb-1">Gains disponibles</div>
          <div className="text-[1.8rem] font-black text-[#009624]">{formatMoney(user.balance)}</div>
          <div className="text-[0.65rem] text-[#15803D] mt-1">Solde principal · Minimum de retrait : 5 $</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 w-full">
            <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Montant à retirer (USD)</label>
            <div className="relative">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min. 5 $" min={5} step={1} required className="w-full py-3 px-4 pr-16 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.7rem] font-bold text-[#94A3B8]">USD</span>
            </div>
            {amount && parseFloat(amount) > user.balance && (
              <p className="text-red-500 text-[0.68rem] mt-1 font-medium">Dépasse vos gains disponibles</p>
            )}
          </div>

          <div className="flex gap-1.5 mb-4">
            {[5, 10, 25, 50].filter(v => v <= user.balance).map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))} className="flex-1 py-2.5 rounded-lg text-[0.76rem] font-semibold text-center cursor-pointer border-[1.5px] border-[rgba(0,0,0,0.06)] bg-white text-[#1A2332] transition-all active:scale-95 font-[Inter]">{v} $</button>
            ))}
          </div>

          <div className="mb-5 w-full">
            <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Votre adresse TRX (Trust Wallet)</label>
            <input type="text" value={trxAddress} onChange={(e) => setTrxAddress(e.target.value)} placeholder="T..." required className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.82rem] outline-none transition-all font-mono text-[#1A2332] focus:bg-white focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]" />
            <p className="text-[0.62rem] text-[#94A3B8] mt-1">L&apos;adresse où vous recevrez vos TRX</p>
          </div>

          <button type="submit" disabled={loading || user.balance < 5 || !user.canWithdraw || !!user.needsReferral} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-[rgba(120,53,15,0.3)] border-t-[#78350F] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : !user.canWithdraw ? <><i className="fas fa-clock"></i> Attente 48h</> : user.needsReferral ? <><i className="fas fa-user-friends"></i> Parrainage requis</> : <><i className="fas fa-paper-plane"></i> Demander le retrait</>}
          </button>
        </form>

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-2.5 mt-7">
              <h3 className="text-[0.9rem] font-bold text-[#1A2332]">Historique des retraits</h3>
            </div>
            {withdrawals.map((w: any, i: number) => {
              const d = new Date(w.createdAt);
              const ds = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const statusLabel = w.status === 'pending' ? 'En attente' : w.status === 'approved' ? 'Approuvé' : 'Rejeté';
              const statusColor = w.status === 'pending' ? 'bg-[#FEF3C7] text-[#92400E]' : w.status === 'approved' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]';
              return (
                <div key={i} className="flex gap-3 p-3.5 bg-white rounded-xl mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] items-center border border-[rgba(0,0,0,0.03)]">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[0.75rem] shrink-0 ${w.status === 'approved' ? 'bg-[#DCFCE7] text-[#166534]' : w.status === 'pending' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                    <i className={`fas fa-${w.status === 'approved' ? 'check' : w.status === 'pending' ? 'clock' : 'times'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[0.85rem] mb-0.5 text-[#1A2332]">{formatMoney(w.amount)}</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">{ds}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[0.58rem] font-bold uppercase tracking-[0.5px] ${statusColor}`}>{statusLabel}</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
