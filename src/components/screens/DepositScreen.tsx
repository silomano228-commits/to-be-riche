'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

type Step = 'amount' | 'address' | 'confirm' | 'success';

export default function DepositScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [step, setStep] = useState<Step>('amount');
  const [depositAmt, setDepositAmt] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [trxPrice, setTrxPrice] = useState(0);
  const [pendingDeposit, setPendingDeposit] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

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
            setStep('confirm');
          }
        }
      } catch { /* */ }
      setLoading(false);
    };
    loadInfo();
  }, []);

  // Calculate TRX amount derived from USD amount and TRX price
  const calculatedAmountTrx = (() => {
    const amt = parseFloat(depositAmt);
    if (amt > 0 && trxPrice > 0) {
      return Math.round((amt / trxPrice) * 100) / 100;
    }
    return 0;
  })();

  const handleCopyAddress = async () => {
    if (!adminAddress) return;
    try {
      await navigator.clipboard.writeText(adminAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = adminAddress;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async () => {
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
        setStep('success');
        addToast('Dépôt soumis avec succès !', 'success');
        // Refresh user data
        try {
          const r = await fetch('/api/auth/session');
          const d = await r.json();
          if (d.success) setUser(d.user);
        } catch { /* */ }
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setSubmitting(false);
  };

  if (!user) return null;

  // If there's already a pending deposit, show its status
  if (pendingDeposit && step === 'confirm') {
    return (
      <>
        <Header
          title="Dépôt en attente"
          icon="fa-clock"
          iconColor="#F59E0B"
          leftElement={
            <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1">
              <i className="fas fa-arrow-left text-[0.8rem]"></i>
            </button>
          }
        />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
          <div className="bg-gradient-to-br from-[#FEF3C7] to-[#FFFBEB] rounded-2xl p-5 mb-4 border border-[#F59E0B]/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#F59E0B] flex items-center justify-center shrink-0">
                <i className="fas fa-clock text-white text-[1.2rem]"></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#92400E]">Dépôt en attente</h3>
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

          <button
            onClick={() => setPage('wallet')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)]"
          >
            <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Déposer via TRX"
        icon="fa-arrow-down"
        iconColor="#00C853"
        leftElement={
          <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1">
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
      />
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
                const currentIdx = stepOrder.indexOf(step);
                const thisIdx = stepOrder.indexOf(st.s);
                const isActive = step === st.s;
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

            {/* ===================== STEP 1: AMOUNT ===================== */}
            {step === 'amount' && (
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

                  {/* Quick amount buttons */}
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
                    setStep('address');
                  }}
                  disabled={!depositAmt || parseFloat(depositAmt) < 10 || !adminAddress}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            )}

            {/* ===================== STEP 2: TRX ADDRESS ===================== */}
            {step === 'address' && (
              <div style={{ animation: 'tIn 0.3s ease-out' }}>
                {/* Admin address to send to */}
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
                    onClick={handleCopyAddress}
                    className={`w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                      copied
                        ? 'bg-[#00C853] text-white'
                        : 'bg-[rgba(0,200,83,0.15)] text-[#86EFAC]'
                    }`}
                  >
                    <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                    {copied ? 'Copié !' : 'Copier l\'adresse'}
                  </button>
                </div>

                {/* Amount to send */}
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

                {/* Instructions */}
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

                {/* User TRX Address */}
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
                    onClick={() => setStep('amount')}
                    className="flex-1 py-3.5 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer"
                  >
                    <i className="fas fa-arrow-left mr-1"></i> Retour
                  </button>
                  <button
                    onClick={handleSubmit}
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
            {step === 'success' && (
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
