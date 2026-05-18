'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

type DepositMethod = 'choose' | 'trx' | 'yas';
type TrxStep = 'amount' | 'address' | 'success';
type YasStep = 'guide' | 'amount' | 'wallet' | 'success';

export default function DepositScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [method, setMethod] = useState<DepositMethod>('choose');

  // TRX deposit state
  const [trxStep, setTrxStep] = useState<TrxStep>('amount');
  const [depositAmt, setDepositAmt] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [trxPrice, setTrxPrice] = useState(0);
  const [pendingDeposit, setPendingDeposit] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Yas deposit state
  const [yasStep, setYasStep] = useState<YasStep>('guide');
  const [yasAmount, setYasAmount] = useState('');
  const [yasAccount, setYasAccount] = useState('');
  const [yasTrxAddress, setYasTrxAddress] = useState('');
  const [yasSubmitting, setYasSubmitting] = useState(false);
  const [yasPendingDeposit, setYasPendingDeposit] = useState<any>(null);
  const [yasLoading, setYasLoading] = useState(false);

  // Load deposit info on mount
  useEffect(() => {
    const loadInfo = async () => {
      try {
        const res = await authFetch('/api/deposit/trx');
        const data = await res.json();
        if (data.success) {
          setAdminAddress(data.data.adminAddress || '');
          setTrxPrice(data.data.trxPrice || 0.12);
          if (data.data.pendingDeposit) {
            setPendingDeposit(data.data.pendingDeposit);
          }
        }
      } catch { /* */ }

      try {
        const res = await authFetch('/api/deposit/yas');
        const data = await res.json();
        if (data.success) {
          if (!trxPrice && data.data.trxPrice) setTrxPrice(data.data.trxPrice);
          if (data.data.pendingDeposit) {
            setYasPendingDeposit(data.data.pendingDeposit);
          }
        }
      } catch { /* */ }

      setLoading(false);
    };
    loadInfo();
  }, []);

  // Calculate TRX amount
  const calculatedAmountTrx = (() => {
    const amt = parseFloat(depositAmt || yasAmount);
    if (amt > 0 && trxPrice > 0) {
      return Math.round((amt / trxPrice) * 100) / 100;
    }
    return 0;
  })();

  const handleCopyAddress = async (addr: string) => {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = addr;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const refreshUser = async () => {
    try {
      const r = await fetch('/api/auth/session');
      const d = await r.json();
      if (d.success) setUser(d.user);
    } catch { /* */ }
  };

  // TRX deposit submit
  const handleTrxSubmit = async () => {
    const amt = parseFloat(depositAmt);
    if (!amt || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
    if (!adminAddress) { addToast('Adresse admin non configurée', 'error'); return; }

    setSubmitting(true);
    try {
      const res = await authFetch('/api/deposit/trx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amt, userAddress: userAddress.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTrxStep('success');
        addToast('Dépôt soumis avec succès !', 'success');
        refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setSubmitting(false);
  };

  // Yas deposit submit
  const handleYasSubmit = async () => {
    const amt = parseFloat(yasAmount);
    if (!amt || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
    if (!yasAccount.trim()) { addToast('Numéro de compte Yas requis', 'error'); return; }
    if (!yasTrxAddress.trim()) { addToast('Adresse TRX requise', 'error'); return; }

    setYasSubmitting(true);
    try {
      const res = await authFetch('/api/deposit/yas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsd: amt,
          yasAccount: yasAccount.trim(),
          trxAddress: yasTrxAddress.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setYasStep('success');
        addToast('Demande de conversion soumise !', 'success');
        refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setYasSubmitting(false);
  };

  if (!user) return null;

  const backBtn = (
    <button onClick={() => {
      if (method === 'choose') setPage('wallet');
      else setMethod('choose');
    }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1">
      <i className="fas fa-arrow-left text-[0.8rem]"></i>
    </button>
  );

  // ===================== PENDING DEPOSIT (TRX) =====================
  if (pendingDeposit && method !== 'yas') {
    return (
      <>
        <Header title="Dépôt en attente" icon="fa-clock" iconColor="#F59E0B" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
          <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FFFBEB] rounded-2xl p-5 mb-4 border border-[#F59E0B]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B] flex items-center justify-center shrink-0">
                <i className="fas fa-clock text-white text-[1.2rem]"></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#92400E]">Dépôt TRX en attente</h3>
                <p className="text-[0.72rem] text-[#A16207]">Votre dépôt est en cours de vérification par l'administrateur</p>
              </div>
            </div>
            <div className="bg-white/60 rounded-xl p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[#92400E]">Montant USD</span>
                <span className="text-[0.88rem] font-bold text-[#92400E]">{formatMoney(pendingDeposit.amountUsd)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[#92400E]">Montant TRX</span>
                <span className="text-[0.88rem] font-bold text-[#92400E]">{pendingDeposit.amountTrx?.toFixed(2)} TRX</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[#92400E]">Statut</span>
                <span className="text-[0.72rem] font-semibold bg-[#FEF3C7] text-[#92400E] px-2 py-0.5 rounded-full">En attente</span>
              </div>
            </div>
            <p className="text-[0.7rem] text-[#A16207] text-center">
              <i className="fas fa-info-circle mr-1"></i>
              Cela peut prendre quelques minutes. Vous serez notifié une fois confirmé.
            </p>
          </div>
          <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)]">
            <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // ===================== PENDING YAS DEPOSIT =====================
  if (yasPendingDeposit && method !== 'trx') {
    return (
      <>
        <Header title="Conversion en attente" icon="fa-clock" iconColor="#7C3AED" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
          <div className="bg-gradient-to-br from-[#EDE9FE] to-[#F5F3FF] rounded-2xl p-5 mb-4 border border-[#7C3AED]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0">
                <i className="fas fa-exchange-alt text-white text-[1.2rem]"></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#4C1D95]">Conversion Yas en attente</h3>
                <p className="text-[0.72rem] text-[#6D28D9]">L'administrateur va convertir votre argent et vous envoyer les TRX</p>
              </div>
            </div>
            <div className="bg-white/60 rounded-xl p-4 mb-3">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[#4C1D95]">Montant USD</span>
                <span className="text-[0.88rem] font-bold text-[#4C1D95]">{formatMoney(yasPendingDeposit.amountUsd)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[#4C1D95]">Montant TRX</span>
                <span className="text-[0.88rem] font-bold text-[#4C1D95]">{yasPendingDeposit.amountTrx?.toFixed(2)} TRX</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[#4C1D95]">Compte Yas</span>
                <span className="text-[0.78rem] font-bold text-[#4C1D95]">{esc(yasPendingDeposit.yasAccount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[#4C1D95]">Statut</span>
                <span className="text-[0.72rem] font-semibold bg-[#EDE9FE] text-[#4C1D95] px-2 py-0.5 rounded-full">En attente</span>
              </div>
            </div>
            <p className="text-[0.7rem] text-[#6D28D9] text-center">
              <i className="fas fa-info-circle mr-1"></i>
              L'administrateur va traiter votre demande et envoyer les TRX à votre adresse Trust Wallet.
            </p>
          </div>
          <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)]">
            <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // ===================== CHOOSE METHOD =====================
  if (method === 'choose') {
    const hasPendingTrx = !!pendingDeposit;
    const hasPendingYas = !!yasPendingDeposit;

    return (
      <>
        <Header title="Déposer" icon="fa-arrow-down" iconColor="#00C853" leftElement={
          <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1">
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        } />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              <h2 className="text-[1.1rem] font-black text-[#1A2332] mb-1">Choisissez votre méthode</h2>
              <p className="text-[0.78rem] text-[#64748B] mb-5">Comment souhaitez-vous approvisionner votre compte ?</p>

              {/* TRX Direct Deposit Card */}
              <button
                onClick={() => { if (hasPendingTrx) return; setMethod('trx'); }}
                disabled={hasPendingTrx}
                className={`w-full text-left rounded-2xl p-5 mb-3 border-2 transition-all ${
                  hasPendingTrx
                    ? 'border-[#F59E0B]/30 bg-[#FFFBEB] opacity-70'
                    : 'border-[#00C853]/20 bg-white shadow-[0_2px_12px_rgba(0,200,83,0.06)] hover:border-[#00C853]/50 active:scale-[0.98]'
                } cursor-pointer`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00E676] to-[#00C853] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,200,83,0.2)]">
                    <i className="fab fa-gg-circle text-white text-[1.3rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1A2332] mb-0.5">Dépôt en Dollars (TRX)</h3>
                    <p className="text-[0.72rem] text-[#64748B] leading-relaxed mb-2">Envoyez directement des TRX depuis votre wallet. Confirmation rapide par l'administrateur.</p>
                    {hasPendingTrx ? (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#92400E] bg-[#FEF3C7] px-2 py-1 rounded-full">
                        <i className="fas fa-clock"></i> Dépôt en attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#166534] bg-[#F0FDF4] px-2 py-1 rounded-full">
                        <i className="fas fa-bolt"></i> Rapide & direct
                      </span>
                    )}
                  </div>
                  {!hasPendingTrx && <i className="fas fa-chevron-right text-[#CBD5E1] mt-3"></i>}
                </div>
              </button>

              {/* Yas du Togo Conversion Card */}
              <button
                onClick={() => { if (hasPendingYas) return; setMethod('yas'); setYasStep('guide'); }}
                disabled={hasPendingYas}
                className={`w-full text-left rounded-2xl p-5 mb-5 border-2 transition-all ${
                  hasPendingYas
                    ? 'border-[#F59E0B]/30 bg-[#FFFBEB] opacity-70'
                    : 'border-[#7C3AED]/20 bg-white shadow-[0_2px_12px_rgba(124,58,237,0.06)] hover:border-[#7C3AED]/50 active:scale-[0.98]'
                } cursor-pointer`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(124,58,237,0.2)]">
                    <i className="fas fa-exchange-alt text-white text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1A2332] mb-0.5">Conversion Yas du Togo</h3>
                    <p className="text-[0.72rem] text-[#64748B] leading-relaxed mb-2">Pas de TRX ? Convertissez l'argent de votre compte Yas du Togo en TRX. L'admin vous enverra les TRX sur votre Trust Wallet.</p>
                    {hasPendingYas ? (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#92400E] bg-[#FEF3C7] px-2 py-1 rounded-full">
                        <i className="fas fa-clock"></i> Conversion en attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#4C1D95] bg-[#F5F3FF] px-2 py-1 rounded-full">
                        <i className="fas fa-hand-holding-usd"></i> Sans TRX
                      </span>
                    )}
                  </div>
                  {!hasPendingYas && <i className="fas fa-chevron-right text-[#CBD5E1] mt-3"></i>}
                </div>
              </button>

              {/* Help guide */}
              <div className="bg-gradient-to-br from-[#F0F9FF] to-[#EFF6FF] rounded-2xl p-4 border border-[#BFDBFE]/30">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center shrink-0">
                    <i className="fas fa-question-circle text-white text-[0.8rem]"></i>
                  </div>
                  <h4 className="text-[0.82rem] font-bold text-[#1E40AF]">Besoin d'aide ?</h4>
                </div>
                <p className="text-[0.7rem] text-[#3B82F6] leading-relaxed">
                  Si vous avez déjà Trust Wallet et des TRX, choisissez <strong>Dépôt en Dollars</strong>.
                  Si vous n'avez pas de TRX mais un compte Yas du Togo, choisissez <strong>Conversion Yas du Togo</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // ===================== TRX DEPOSIT FLOW =====================
  if (method === 'trx') {
    return (
      <>
        <Header title="Dépôt via TRX" icon="fa-arrow-down" iconColor="#00C853" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[
                  { s: 'amount', label: '1', icon: 'fa-dollar-sign' },
                  { s: 'address', label: '2', icon: 'fa-paper-plane' },
                  { s: 'success', label: '3', icon: 'fa-check' },
                ].map((st, i) => {
                  const stepOrder = ['amount', 'address', 'success'];
                  const currentIdx = stepOrder.indexOf(trxStep);
                  const thisIdx = stepOrder.indexOf(st.s);
                  const isActive = trxStep === st.s;
                  const isDone = currentIdx > thisIdx;
                  return (
                    <div key={st.s} className="flex items-center gap-2">
                      {i > 0 && <div className={`w-8 h-[2px] rounded ${isDone ? 'bg-[#00C853]' : 'bg-[#E2E8F0]'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-bold ${
                        isActive ? 'bg-[#00C853] text-white' : isDone ? 'bg-[#00C853] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'
                      }`}>
                        {isDone ? <i className="fas fa-check text-[0.6rem]" /> : st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TRX Guide */}
              {trxStep === 'amount' && (
                <div className="bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] rounded-xl p-3.5 mb-4 border-l-[3px] border-[#00C853]">
                  <h4 className="text-[0.78rem] font-bold text-[#166534] mb-1.5">
                    <i className="fas fa-book-open mr-1"></i> Guide - Dépôt TRX
                  </h4>
                  <ol className="space-y-1 text-[0.68rem] text-[#166534]/80">
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#00C853] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">1</span><span>Entrez le montant en dollars</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#00C853] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">2</span><span>Envoyez les TRX à l'adresse de l'admin</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#00C853] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">3</span><span>Entrez votre adresse TRX pour confirmer</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#00C853] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">4</span><span>Attendez la confirmation de l'admin</span></li>
                  </ol>
                </div>
              )}

              {/* ===================== STEP 1: AMOUNT ===================== */}
              {trxStep === 'amount' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                    <h3 className="text-[1rem] font-bold text-[#1A2332] mb-1">Entrez le montant</h3>
                    <p className="text-[0.75rem] text-[#64748B] mb-4">Minimum 10 $. Le montant sera converti en TRX au taux actuel.</p>

                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[1rem] font-bold text-[#94A3B8]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="10"
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder="0.00"
                        className="w-full py-4 pl-9 pr-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#00C853] text-[#1A2332]"
                      />
                    </div>

                    {parseFloat(depositAmt) >= 10 && (
                      <div className="bg-[#F0FDF4] rounded-xl p-3 border border-[#86EFAC]">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.72rem] text-[#166534]">Équivalent TRX</span>
                          <span className="text-[1rem] font-black text-[#009624]">{calculatedAmountTrx.toFixed(2)} TRX</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[0.65rem] text-[#166534]/70">Taux TRX/USD</span>
                          <span className="text-[0.72rem] font-semibold text-[#166534]">1 TRX = {trxPrice.toFixed(4)} $</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[10, 25, 50, 100].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setDepositAmt(String(amt))}
                          className={`py-2 rounded-lg text-[0.78rem] font-semibold border-none cursor-pointer transition-all ${
                            depositAmt === String(amt)
                              ? 'bg-[#00C853] text-white'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                        >
                          {amt} $
                        </button>
                      ))}
                    </div>
                  </div>

                  {!adminAddress && (
                    <div className="bg-[#FEF2F2] rounded-xl p-3 mb-4 border border-[#FCA5A5] flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle text-[#EF4444] text-[0.8rem]"></i>
                      <p className="text-[0.72rem] text-[#991B1B]">Adresse TRX admin non configurée. Contactez le support.</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const amt = parseFloat(depositAmt);
                      if (!amt || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
                      if (!adminAddress) { addToast('Adresse admin non configurée', 'error'); return; }
                      setTrxStep('address');
                    }}
                    disabled={!depositAmt || parseFloat(depositAmt) < 10 || !adminAddress}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}

              {/* ===================== STEP 2: TRX ADDRESS ===================== */}
              {trxStep === 'address' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-2xl p-5 mb-4 border border-[rgba(255,255,255,0.05)]">
                    <div className="text-[0.68rem] text-[rgba(255,255,255,0.4)] uppercase font-semibold tracking-[1px] mb-2">
                      <i className="fas fa-qrcode mr-1"></i> Envoyer à cette adresse
                    </div>
                    <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 mb-3 border border-[rgba(255,255,255,0.08)]">
                      <div className="text-[0.72rem] font-mono text-[#86EFAC] break-all leading-relaxed">
                        {esc(adminAddress)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyAddress(adminAddress)}
                      className={`w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        copied ? 'bg-[#00C853] text-white' : 'bg-[rgba(0,200,83,0.15)] text-[#86EFAC]'
                      }`}
                    >
                      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                      {copied ? 'Copié !' : 'Copier l\'adresse'}
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                    <h4 className="text-[0.85rem] font-bold text-[#1A2332] mb-3">Montant à envoyer</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#F0FDF4] rounded-xl p-3 text-center border border-[#86EFAC]">
                        <div className="text-[0.6rem] text-[#166534] uppercase font-semibold mb-1">TRX</div>
                        <div className="text-[1.3rem] font-black text-[#009624]">{calculatedAmountTrx.toFixed(2)}</div>
                      </div>
                      <div className="bg-[#EFF6FF] rounded-xl p-3 text-center border border-[#93C5FD]">
                        <div className="text-[0.6rem] text-[#1E40AF] uppercase font-semibold mb-1">USD</div>
                        <div className="text-[1.3rem] font-black text-[#2563EB]">{parseFloat(depositAmt).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FFFBEB] rounded-xl p-3.5 mb-4 border-l-[3px] border-[#F59E0B]">
                    <h4 className="text-[0.78rem] font-bold text-[#92400E] mb-2">
                      <i className="fas fa-info-circle mr-1"></i> Instructions
                    </h4>
                    <ol className="space-y-1.5 text-[0.7rem] text-[#92400E]">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">1</span>
                        <span>Ouvrez votre wallet TRX (Trust Wallet, etc.)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">2</span>
                        <span>Envoyez <strong>{calculatedAmountTrx.toFixed(2)} TRX</strong> à l&apos;adresse ci-dessus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                        <span>Entrez votre adresse TRX ci-dessous pour confirmer</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                    <h4 className="text-[0.85rem] font-bold text-[#1A2332] mb-1">Votre adresse TRX</h4>
                    <p className="text-[0.7rem] text-[#64748B] mb-3">L&apos;adresse depuis laquelle vous avez envoyé les TRX</p>
                    <input
                      type="text"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="T... (votre adresse TRX)"
                      className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] font-mono outline-none focus:border-[#00C853] text-[#1A2332] placeholder:text-[#CBD5E1]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setTrxStep('amount')}
                      className="flex-1 py-3.5 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer"
                    >
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={handleTrxSubmit}
                      disabled={submitting || !userAddress.trim()}
                      className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          Soumettre le dépôt
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== STEP 3: SUCCESS ===================== */}
              {trxStep === 'success' && (
                <div className="text-center py-6" style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center mx-auto mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#00C853] flex items-center justify-center">
                      <i className="fas fa-check text-white text-[1.5rem]"></i>
                    </div>
                  </div>
                  <h3 className="text-[1.2rem] font-bold text-[#1A2332] mb-2">Dépôt soumis !</h3>
                  <p className="text-[0.82rem] text-[#64748B] mb-6 max-w-[280px] mx-auto">
                    Votre dépôt de <strong>{formatMoney(parseFloat(depositAmt))}</strong> est en attente de confirmation par l&apos;administrateur.
                  </p>
                  <div className="bg-[#F8FAFC] rounded-xl p-4 mb-6 max-w-[280px] mx-auto">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" style={{ animation: 'pulse 1.5s infinite' }} />
                      <span className="text-[0.78rem] text-[#64748B] font-medium">En attente de confirmation...</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPage('wallet')}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)]"
                  >
                    <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  // ===================== YAS DU TOGO FLOW =====================
  if (method === 'yas') {
    return (
      <>
        <Header title="Conversion Yas du Togo" icon="fa-exchange-alt" iconColor="#7C3AED" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-[#7C3AED] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[
                  { s: 'guide', label: '1' },
                  { s: 'amount', label: '2' },
                  { s: 'wallet', label: '3' },
                  { s: 'success', label: '4' },
                ].map((st, i) => {
                  const stepOrder = ['guide', 'amount', 'wallet', 'success'];
                  const currentIdx = stepOrder.indexOf(yasStep);
                  const thisIdx = stepOrder.indexOf(st.s);
                  const isActive = yasStep === st.s;
                  const isDone = currentIdx > thisIdx;
                  return (
                    <div key={st.s} className="flex items-center gap-2">
                      {i > 0 && <div className={`w-6 h-[2px] rounded ${isDone ? 'bg-[#7C3AED]' : 'bg-[#E2E8F0]'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-bold ${
                        isActive ? 'bg-[#7C3AED] text-white' : isDone ? 'bg-[#7C3AED] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'
                      }`}>
                        {isDone ? <i className="fas fa-check text-[0.6rem]" /> : st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===================== YAS STEP 1: GUIDE ===================== */}
              {yasStep === 'guide' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  {/* Trust Wallet Guide */}
                  <div className="bg-gradient-to-br from-[#1E293B] via-[#2D1B69] to-[#1E293B] rounded-2xl p-5 mb-4 border border-[rgba(124,58,237,0.2)] relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(124,58,237,0.15),transparent_60%)]" />
                    <div className="relative z-[1]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(124,58,237,0.25)] flex items-center justify-center border border-[rgba(124,58,237,0.3)]">
                          <i className="fas fa-shield-alt text-[#A78BFA] text-[0.9rem]"></i>
                        </div>
                        <div>
                          <h3 className="text-[0.95rem] font-bold text-white">Guide - Trust Wallet</h3>
                          <p className="text-[0.65rem] text-[rgba(255,255,255,0.4)]">Suivez ces étapes avant de continuer</p>
                        </div>
                      </div>

                      <ol className="space-y-2.5">
                        {[
                          { icon: 'fa-download', text: 'Téléchargez Trust Wallet depuis le Play Store ou l\'App Store', color: '#22C55E' },
                          { icon: 'fa-user-plus', text: 'Créez votre wallet et sécurisez votre phrase de récupération', color: '#3B82F6' },
                          { icon: 'fa-coins', text: 'Ajoutez la crypto TRX (Tron) à votre wallet', color: '#F59E0B' },
                          { icon: 'fa-key', text: 'Copiez votre adresse TRX (commence par T...)', color: '#7C3AED' },
                          { icon: 'fa-check-circle', text: 'Collez cette adresse TRX dans le formulaire suivant', color: '#00C853' },
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: step.color + '25' }}>
                              <i className={`fas ${step.icon} text-[0.55rem]`} style={{ color: step.color }}></i>
                            </div>
                            <span className="text-[0.72rem] text-[rgba(255,255,255,0.7)] leading-relaxed">{step.text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Important notice */}
                  <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FFFBEB] rounded-xl p-3.5 mb-4 border border-[#F59E0B]/20">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-exclamation-triangle text-[#F59E0B] text-[0.8rem] mt-0.5"></i>
                      <div>
                        <h4 className="text-[0.78rem] font-bold text-[#92400E] mb-1">Important</h4>
                        <p className="text-[0.68rem] text-[#A16207] leading-relaxed">
                          L'administrateur convertira votre argent Yas du Togo et vous enverra les TRX sur votre adresse Trust Wallet. 
                          Vous devrez attendre que l'admin traite votre demande.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setYasStep('amount')}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(124,58,237,0.2)]"
                  >
                    J'ai compris, continuer <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}

              {/* ===================== YAS STEP 2: AMOUNT & ACCOUNT ===================== */}
              {yasStep === 'amount' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                    <h3 className="text-[1rem] font-bold text-[#1A2332] mb-1">Montant à convertir</h3>
                    <p className="text-[0.75rem] text-[#64748B] mb-4">Entrez le montant en dollars que vous souhaitez convertir depuis votre compte Yas du Togo.</p>

                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[1rem] font-bold text-[#94A3B8]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="10"
                        value={yasAmount}
                        onChange={(e) => setYasAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full py-4 pl-9 pr-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#7C3AED] text-[#1A2332]"
                      />
                    </div>

                    {parseFloat(yasAmount) >= 10 && (
                      <div className="bg-[#F5F3FF] rounded-xl p-3 border border-[#C4B5FD]">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.72rem] text-[#4C1D95]">Vous recevrez</span>
                          <span className="text-[1rem] font-black text-[#7C3AED]">{calculatedAmountTrx.toFixed(2)} TRX</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[0.65rem] text-[#4C1D95]/70">Taux TRX/USD</span>
                          <span className="text-[0.72rem] font-semibold text-[#4C1D95]">1 TRX = {trxPrice.toFixed(4)} $</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[10, 25, 50, 100].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setYasAmount(String(amt))}
                          className={`py-2 rounded-lg text-[0.78rem] font-semibold border-none cursor-pointer transition-all ${
                            yasAmount === String(amt)
                              ? 'bg-[#7C3AED] text-white'
                              : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}
                        >
                          {amt} $
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                    <h3 className="text-[0.95rem] font-bold text-[#1A2332] mb-1">Compte Yas du Togo</h3>
                    <p className="text-[0.72rem] text-[#64748B] mb-3">Entrez votre numéro de compte Yas du Togo</p>
                    <input
                      type="text"
                      value={yasAccount}
                      onChange={(e) => setYasAccount(e.target.value)}
                      placeholder="Numéro de compte Yas"
                      className="w-full py-3.5 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#7C3AED] text-[#1A2332] placeholder:text-[#CBD5E1]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setYasStep('guide')}
                      className="flex-1 py-3.5 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer"
                    >
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={() => {
                        const amt = parseFloat(yasAmount);
                        if (!amt || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
                        if (!yasAccount.trim()) { addToast('Numéro de compte Yas requis', 'error'); return; }
                        setYasStep('wallet');
                      }}
                      disabled={!yasAmount || parseFloat(yasAmount) < 10 || !yasAccount.trim()}
                      className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(124,58,237,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuer <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== YAS STEP 3: WALLET ADDRESS ===================== */}
              {yasStep === 'wallet' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  {/* Summary card */}
                  <div className="bg-gradient-to-br from-[#EDE9FE] to-[#F5F3FF] rounded-2xl p-4 mb-4 border border-[#C4B5FD]/20">
                    <h4 className="text-[0.82rem] font-bold text-[#4C1D95] mb-2">Récapitulatif</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[#6D28D9]">Montant</span>
                        <span className="text-[0.88rem] font-bold text-[#4C1D95]">{formatMoney(parseFloat(yasAmount))}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[#6D28D9]">TRX à recevoir</span>
                        <span className="text-[0.88rem] font-bold text-[#7C3AED]">{calculatedAmountTrx.toFixed(2)} TRX</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[#6D28D9]">Compte Yas</span>
                        <span className="text-[0.78rem] font-bold text-[#4C1D95]">{esc(yasAccount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* TRX Address input */}
                  <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00E676] to-[#00C853] flex items-center justify-center shrink-0">
                        <i className="fas fa-wallet text-white text-[0.8rem]"></i>
                      </div>
                      <div>
                        <h3 className="text-[0.95rem] font-bold text-[#1A2332]">Adresse TRX Trust Wallet</h3>
                        <p className="text-[0.68rem] text-[#64748B]">L'admin vous enverra les TRX à cette adresse</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={yasTrxAddress}
                      onChange={(e) => setYasTrxAddress(e.target.value)}
                      placeholder="T... (votre adresse TRX Trust Wallet)"
                      className="w-full py-3.5 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] font-mono outline-none focus:border-[#7C3AED] text-[#1A2332] placeholder:text-[#CBD5E1]"
                    />
                  </div>

                  {/* Reminder about Trust Wallet */}
                  <div className="bg-[#FFFBEB] rounded-xl p-3.5 mb-4 border-l-[3px] border-[#F59E0B]">
                    <h4 className="text-[0.78rem] font-bold text-[#92400E] mb-1.5">
                      <i className="fas fa-info-circle mr-1"></i> Rappel
                    </h4>
                    <ul className="space-y-1 text-[0.68rem] text-[#92400E]">
                      <li className="flex items-start gap-1.5">
                        <i className="fas fa-check text-[0.5rem] mt-1"></i>
                        <span>Assurez-vous d'avoir téléchargé <strong>Trust Wallet</strong></span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <i className="fas fa-check text-[0.5rem] mt-1"></i>
                        <span>Votre adresse TRX doit commencer par <strong>T</strong></span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <i className="fas fa-check text-[0.5rem] mt-1"></i>
                        <span>L'admin convertira votre argent et vous enverra les TRX</span>
                      </li>
                      <li className="flex items-start gap-1.5">
                        <i className="fas fa-check text-[0.5rem] mt-1"></i>
                        <span>Le traitement peut prendre <strong>un peu de temps</strong></span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setYasStep('amount')}
                      className="flex-1 py-3.5 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer"
                    >
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={handleYasSubmit}
                      disabled={yasSubmitting || !yasTrxAddress.trim()}
                      className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C3AED] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(124,58,237,0.2)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {yasSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          Soumettre la demande
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== YAS STEP 4: SUCCESS ===================== */}
              {yasStep === 'success' && (
                <div className="text-center py-6" style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="w-20 h-20 rounded-full bg-[#F5F3FF] flex items-center justify-center mx-auto mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#7C3AED] flex items-center justify-center">
                      <i className="fas fa-check text-white text-[1.5rem]"></i>
                    </div>
                  </div>
                  <h3 className="text-[1.2rem] font-bold text-[#1A2332] mb-2">Demande soumise !</h3>
                  <p className="text-[0.82rem] text-[#64748B] mb-4 max-w-[300px] mx-auto">
                    Votre demande de conversion de <strong>{formatMoney(parseFloat(yasAmount))}</strong> a été envoyée. L&apos;administrateur convertira votre argent et vous enverra <strong>{calculatedAmountTrx.toFixed(2)} TRX</strong> sur votre Trust Wallet.
                  </p>
                  <div className="bg-[#F5F3FF] rounded-xl p-4 mb-6 max-w-[300px] mx-auto">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#7C3AED]" style={{ animation: 'pulse 1.5s infinite' }} />
                      <span className="text-[0.78rem] text-[#6D28D9] font-medium">En attente de traitement par l'admin...</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPage('wallet')}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)]"
                  >
                    <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  return null;
}
