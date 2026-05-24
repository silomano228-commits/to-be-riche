'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

type Step = 'form' | 'success';

export default function WithdrawScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [step, setStep] = useState<Step>('form');
  const [loading, setLoading] = useState(true);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<any>(null);

  // TRX withdrawal state
  const [amount, setAmount] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load pending withdrawals on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await authFetch('/api/withdrawal');
        const data = await res.json();
        if (data.success && data.data) {
          const pending = data.data.find((w: any) => w.type === 'trx' && (w.status === 'pending' || w.status === 'approved'));
          if (pending) setPendingWithdrawal(pending);
        }
      } catch { /* */ }
      setLoading(false);
    };
    loadData();
  }, []);

  const refreshUser = async () => {
    try {
      const r = await fetch('/api/auth/session');
      const d = await r.json();
      if (d.success) setUser(d.user);
    } catch { /* */ }
  };

  // TRX submit
  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5) { addToast('Minimum 5 $', 'error'); return; }
    if (!trxAddress.trim() || trxAddress.trim().length < 20) { addToast('Adresse TRX invalide', 'error'); return; }
    setSubmitting(true);
    try {
      const res = await authFetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, trxAddress: trxAddress.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('success');
        addToast('Retrait soumis !', 'success');
        refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setSubmitting(false);
  };

  if (!user) return null;

  const backBtn = (
    <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
      <i className="fas fa-arrow-left text-[0.8rem]"></i>
    </button>
  );

  // ===================== PENDING WITHDRAWAL =====================
  if (pendingWithdrawal) {
    return (
      <>
        <Header title="Retrait en attente" icon="fa-clock" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                <i className="fas fa-clock text-[#22C55E] text-[1.2rem]"></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">Retrait TRX en attente</h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Votre demande est en cours de traitement par l&apos;administrateur</p>
              </div>
            </div>
            <div className="bg-[#F3F4F6] rounded-xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant</span>
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{formatMoney(pendingWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX</span>
                <span className="text-[0.72rem] font-mono font-bold text-[rgba(0,0,0,0.7)] max-w-[180px] truncate">{esc(pendingWithdrawal.trxAddress || '')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Statut</span>
                <span className="text-[0.72rem] font-semibold bg-[rgba(34,197,94,0.12)] text-[#22C55E] px-2 py-0.5 rounded-full">En attente</span>
              </div>
            </div>
            <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] text-center">
              <i className="fas fa-info-circle mr-1"></i>
              Veuillez patienter, l&apos;administrateur traitera votre demande.
            </p>
          </div>
          <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer">
            <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // ===================== SUCCESS =====================
  if (step === 'success') {
    return (
      <>
        <Header title="Retrait via TRX" icon="fa-arrow-up" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
              <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center">
                <i className="fas fa-check text-[#050506] text-[1.5rem]"></i>
              </div>
            </div>
            <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Retrait soumis !</h3>
            <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-6 max-w-[280px] mx-auto">
              Votre retrait de <strong className="text-[#22C55E]">{formatMoney(parseFloat(amount))}</strong> est en attente de confirmation par l&apos;administrateur.
            </p>
            <div className="bg-[#FFFFFF] rounded-xl p-4 mb-6 max-w-[280px] mx-auto border border-[rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 justify-center">
                <div className="w-2 h-2 rounded-full bg-[#22C55E]" style={{ animation: 'pulse 1.5s infinite' }} />
                <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de confirmation...</span>
              </div>
            </div>
            <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer">
              <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
            </button>
          </div>
        </div>
      </>
    );
  }

  // ===================== TRX WITHDRAWAL FORM =====================
  return (
    <>
      <Header title="Retirer" icon="fa-arrow-up" iconColor="#22C55E" leftElement={backBtn} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
          </div>
        ) : (
          <>
            {/* Balance card */}
            <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-2xl p-5 mb-5 text-white" style={{ boxShadow: '0 8px 24px rgba(34,197,94,0.25)' }}>
              <div className="text-[0.7rem] uppercase font-semibold opacity-80 mb-1">Solde retirable (compte principal)</div>
              <div className="text-[1.8rem] font-black">{formatMoney(user.balance)}</div>
            </div>

            {/* Method indicator */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                <i className="fab fa-gg-circle text-[#22C55E] text-[1.3rem]"></i>
              </div>
              <div>
                <h2 className="text-[1.1rem] font-black text-[#1F2937]">Retrait via Trust Wallet</h2>
                <p className="text-[0.78rem] text-[rgba(0,0,0,0.55)]">Recevez vos fonds directement sur votre wallet TRX</p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 mb-4">
              <div className="mb-3">
                <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Montant ($)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
              </div>

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[5, 10, 25, 50].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmount(String(amt))}
                    className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${
                      amount === String(amt)
                        ? 'bg-[#22C55E] text-[#050506]'
                        : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'
                    }`}
                  >
                    {amt} $
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Adresse TRX (Trust Wallet)</label>
                <input type="text" value={trxAddress} onChange={(e) => setTrxAddress(e.target.value)} placeholder="T..." className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
              </div>

              <button onClick={handleSubmit} disabled={submitting || !amount || parseFloat(amount) < 5 || !trxAddress.trim()} className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-60">
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                    Envoi...
                  </span>
                ) : (
                  <><i className="fas fa-arrow-up mr-2"></i>Retirer via TRX</>
                )}
              </button>
            </div>

            {/* Info card */}
            <div className="bg-[#FFFFFF] rounded-xl p-3.5 border-l-[3px] border-l-[#22C55E] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
              <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-2">
                <i className="fas fa-info-circle mr-1 text-[#22C55E]"></i> Comment ça marche
              </h4>
              <ol className="space-y-1.5 text-[0.7rem] text-[rgba(0,0,0,0.55)]">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">1</span>
                  <span>Entrez le montant que vous souhaitez retirer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">2</span>
                  <span>Indiquez votre adresse TRX (Trust Wallet)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                  <span>L&apos;administrateur traitera votre demande et enverra les TRX sur votre wallet</span>
                </li>
              </ol>
            </div>
          </>
        )}
      </div>
    </>
  );
}
