'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

type DepositMethod = 'choose' | 'trx' | 'yas';
type TrxStep = 'amount' | 'address' | 'success';
type YasStep = 'amount' | 'guide' | 'info' | 'confirm' | 'success';

// Yas number validation
function validateYasAccount(account: string): string | null {
  const trimmed = account.trim();
  if (!trimmed) return 'Numéro de compte Yas requis';
  if (!/^\d{8}$/.test(trimmed)) return 'Le numéro doit contenir exactement 8 chiffres';
  const prefix = trimmed.substring(0, 2);
  if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
    return 'Le numéro doit commencer par 90-93 ou 70-73';
  }
  return null;
}

// Represents ANY pending deposit across both tables
type ActivePendingDeposit = 
  | { type: 'trx'; amountUsd: number; amountTrx: number; userAddress?: string; createdAt?: string }
  | { type: 'yas'; amountCfa: number; amountUsd: number; amountTrx: number; yasAccount: string; trxAddress: string; createdAt?: string };

export default function DepositScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [method, setMethod] = useState<DepositMethod>('choose');

  // TRX deposit state
  const [trxStep, setTrxStep] = useState<TrxStep>('amount');
  const [depositAmt, setDepositAmt] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [trxPrice, setTrxPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Yas deposit state
  const [yasStep, setYasStep] = useState<YasStep>('amount');
  const [yasAmount, setYasAmount] = useState('');
  const [yasAccount, setYasAccount] = useState('');
  const [yasTrxAddress, setYasTrxAddress] = useState('');
  const [yasSubmitting, setYasSubmitting] = useState(false);
  const [cfaUsdRate, setCfaUsdRate] = useState(600);
  const [adminYasAccount, setAdminYasAccount] = useState('');
  const [yasCopied, setYasCopied] = useState(false);
  const [yasSyntaxCopied, setYasSyntaxCopied] = useState(false);

  // Unified pending deposit — tracks ANY pending deposit from either table
  const [activePending, setActivePending] = useState<ActivePendingDeposit | null>(null);

  // Load deposit info on mount — check BOTH endpoints for any pending
  useEffect(() => {
    const loadInfo = async () => {
      let foundPending: ActivePendingDeposit | null = null;

      try {
        const res = await authFetch('/api/deposit/trx');
        const data = await res.json();
        if (data.success) {
          setAdminAddress(data.data.adminAddress || '');
          setTrxPrice(data.data.trxPrice || 0.12);
          // Check TRX pending
          if (data.data.pendingDeposit) {
            foundPending = { type: 'trx', ...data.data.pendingDeposit };
          }
          // Also check YAS pending from this response
          if (!foundPending && data.data.pendingYasDeposit) {
            foundPending = { type: 'yas', ...data.data.pendingYasDeposit };
          }
        }
      } catch { /* */ }

      try {
        const res = await authFetch('/api/deposit/yas');
        const data = await res.json();
        if (data.success) {
          if (!trxPrice && data.data.trxPrice) setTrxPrice(data.data.trxPrice);
          if (data.data.cfaUsdRate) setCfaUsdRate(data.data.cfaUsdRate);
          if (data.data.adminYasAccount) setAdminYasAccount(data.data.adminYasAccount);
          // Only set YAS pending if no TRX pending found yet
          if (!foundPending && data.data.pendingDeposit) {
            foundPending = { type: 'yas', ...data.data.pendingDeposit };
          }
          // Also check TRX pending from this response
          if (!foundPending && data.data.pendingTrxDeposit) {
            foundPending = { type: 'trx', ...data.data.pendingTrxDeposit };
          }
        }
      } catch { /* */ }

      if (foundPending) setActivePending(foundPending);
      setLoading(false);
    };
    loadInfo();
  }, []);

  // Calculate TRX amount for TRX flow
  const trxCalculatedAmountTrx = (() => {
    const amt = parseFloat(depositAmt);
    if (amt > 0 && trxPrice > 0) {
      return Math.round((amt / trxPrice) * 100) / 100;
    }
    return 0;
  })();

  // Calculate CFA → USD → TRX for Yas flow
  const yasAmountCfa = parseFloat(yasAmount) || 0;
  const yasAmountUsd = cfaUsdRate > 0 ? Math.round((yasAmountCfa / cfaUsdRate) * 100) / 100 : 0;
  const yasAmountTrx = trxPrice > 0 && yasAmountUsd > 0 ? Math.round((yasAmountUsd / trxPrice) * 100) / 100 : 0;

  const handleCopyAddress = async (addr: string, setCopyState: (v: boolean) => void) => {
    if (!addr) return;
    try {
      await navigator.clipboard.writeText(addr);
      setCopyState(true);
      setTimeout(() => setCopyState(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = addr;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyState(true);
      setTimeout(() => setCopyState(false), 2000);
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
        setActivePending({ type: 'trx', amountUsd: amt, amountTrx: trxCalculatedAmountTrx });
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
    const amtCfa = parseFloat(yasAmount);
    if (!amtCfa || amtCfa < 6000) { addToast('Minimum 6 000 FCFA', 'error'); return; }

    const yasErr = validateYasAccount(yasAccount);
    if (yasErr) { addToast(yasErr, 'error'); return; }
    if (!yasTrxAddress.trim()) { addToast('Adresse TRX requise', 'error'); return; }

    setYasSubmitting(true);
    try {
      const res = await authFetch('/api/deposit/yas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCfa: parseFloat(yasAmount),
          yasAccount: yasAccount.trim(),
          trxAddress: yasTrxAddress.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setYasStep('success');
        setActivePending({ type: 'yas', amountCfa: amtCfa, amountUsd: yasAmountUsd, amountTrx: yasAmountTrx, yasAccount: yasAccount.trim(), trxAddress: yasTrxAddress.trim() });
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
    }} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
      <i className="fas fa-arrow-left text-[0.8rem]"></i>
    </button>
  );

  // ===================== PENDING DEPOSIT (UNIFIED - TRX or YAS) =====================
  // Show this if user has ANY pending deposit, regardless of current method selection
  if (activePending && (method === 'choose' || (activePending.type === 'trx' && method !== 'yas') || (activePending.type === 'yas' && method !== 'trx'))) {
    // If user navigated to the OTHER method, still show pending
    const isTrxPending = activePending.type === 'trx';
    const pendingBackBtn = (
      <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
        <i className="fas fa-arrow-left text-[0.8rem]"></i>
      </button>
    );

    return (
      <>
        <Header title={isTrxPending ? 'Dépôt en attente' : 'Conversion en attente'} icon="fa-clock" iconColor="#22C55E" leftElement={pendingBackBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[#22C55E] flex items-center justify-center shrink-0">
                <i className={`fas ${isTrxPending ? 'fa-clock' : 'fa-exchange-alt'} text-[#050506] text-[1.2rem]`}></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">
                  {isTrxPending ? 'Dépôt TRX en attente' : 'Conversion Yas en attente'}
                </h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">
                  {isTrxPending 
                    ? 'Votre dépôt est en cours de vérification par l\'administrateur'
                    : 'L\'administrateur va convertir votre argent et vous envoyer les TRX'
                  }
                </p>
              </div>
            </div>
            <div className="bg-[#F3F4F6] rounded-xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
              {activePending.type === 'yas' && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant CFA</span>
                  <span className="text-[0.88rem] font-bold text-[#1F2937]">{Math.round(activePending.amountCfa).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{formatMoney(activePending.amountUsd)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant TRX</span>
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{activePending.amountTrx?.toFixed(2)} TRX</span>
              </div>
              {activePending.type === 'yas' && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Compte Yas</span>
                  <span className="text-[0.78rem] font-bold text-[#1F2937]">{esc(activePending.yasAccount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Statut</span>
                <span className="text-[0.72rem] font-semibold bg-[rgba(34,197,94,0.12)] text-[#22C55E] px-2 py-0.5 rounded-full">En attente</span>
              </div>
            </div>

            {/* Info message explaining the user must wait */}
            <div className="bg-[rgba(34,197,94,0.08)] rounded-xl p-3 mb-3 border border-[rgba(34,197,94,0.15)]">
              <div className="flex items-start gap-2">
                <i className="fas fa-info-circle text-[#22C55E] text-[0.8rem] mt-0.5"></i>
                <p className="text-[0.7rem] text-[rgba(0,0,0,0.65)] leading-relaxed">
                  {isTrxPending 
                    ? 'Vous ne pouvez pas faire de nouveau dépôt tant que celui-ci n\'est pas confirmé. Cela peut prendre quelques minutes.'
                    : 'Vous ne pouvez pas faire de nouveau dépôt tant que cette conversion n\'est pas traitée. L\'admin va traiter votre demande.'
                  }
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer">
            <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // ===================== CHOOSE METHOD =====================
  if (method === 'choose') {
    return (
      <>
        <Header title="Déposer" icon="fa-arrow-down" iconColor="#22C55E" leftElement={
          <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        } />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              <h2 className="text-[1.1rem] font-black text-[#1F2937] mb-1">Choisissez votre méthode</h2>
              <p className="text-[0.78rem] text-[rgba(0,0,0,0.55)] mb-5">Comment souhaitez-vous approvisionner votre compte ?</p>

              {/* TRX Direct Deposit Card */}
              <button
                onClick={() => setMethod('trx')}
                className="w-full text-left rounded-2xl p-5 mb-3 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fab fa-gg-circle text-[#22C55E] text-[1.3rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Dépôt en Dollars (TRX)</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Envoyez directement des TRX depuis votre wallet. Confirmation rapide par l&apos;administrateur.</p>
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
                      <i className="fas fa-bolt"></i> Rapide & direct
                    </span>
                  </div>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>
                </div>
              </button>

              {/* Yas du Togo Conversion Card */}
              <button
                onClick={() => { setMethod('yas'); setYasStep('amount'); }}
                className="w-full text-left rounded-2xl p-5 mb-5 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-exchange-alt text-[#22C55E] text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Conversion Yas du Togo</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Pas de TRX ? Convertissez l&apos;argent de votre compte Yas du Togo en TRX. L&apos;admin vous enverra les TRX sur votre Trust Wallet.</p>
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
                      <i className="fas fa-hand-holding-usd"></i> Sans TRX
                    </span>
                  </div>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>
                </div>
              </button>

              {/* Help guide */}
              <div className="bg-[#FFFFFF] rounded-2xl p-4 border border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-question-circle text-[#22C55E] text-[0.8rem]"></i>
                  </div>
                  <h4 className="text-[0.82rem] font-bold text-[#1F2937]">Besoin d&apos;aide ?</h4>
                </div>
                <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] leading-relaxed">
                  Si vous avez déjà Trust Wallet et des TRX, choisissez <strong className="text-[#22C55E]">Dépôt en Dollars</strong>.
                  Si vous n&apos;avez pas de TRX mais un compte Yas du Togo, choisissez <strong className="text-[#22C55E]">Conversion Yas du Togo</strong>.
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
        <Header title="Dépôt via TRX" icon="fa-arrow-down" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
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
                      {i > 0 && <div className={`w-8 h-[2px] rounded ${isDone ? 'bg-[#22C55E]' : 'bg-[rgba(0,0,0,0.06)]'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-bold ${
                        isActive ? 'bg-[#22C55E] text-[#050506]' : isDone ? 'bg-[#22C55E] text-[#050506]' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.35)]'
                      }`}>
                        {isDone ? <i className="fas fa-check text-[0.6rem]" /> : st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TRX Guide */}
              {trxStep === 'amount' && (
                <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-[#22C55E] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                  <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-1.5">
                    <i className="fas fa-book-open mr-1 text-[#22C55E]"></i> Guide - Dépôt TRX
                  </h4>
                  <ol className="space-y-1 text-[0.68rem] text-[rgba(0,0,0,0.55)]">
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">1</span><span>Entrez le montant en dollars</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">2</span><span>Envoyez les TRX à l&apos;adresse de l&apos;admin</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">3</span><span>Entrez votre adresse TRX pour confirmer</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">4</span><span>Attendez la confirmation de l&apos;admin</span></li>
                  </ol>
                </div>
              )}

              {/* ===================== STEP 1: AMOUNT ===================== */}
              {trxStep === 'amount' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Entrez le montant</h3>
                    <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Minimum 10 $. Le montant sera converti en TRX au taux actuel.</p>

                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[1rem] font-bold text-[rgba(0,0,0,0.35)]">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="10"
                        value={depositAmt}
                        onChange={(e) => setDepositAmt(e.target.value)}
                        placeholder="0.00"
                        className="w-full py-4 pl-9 pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                      />
                    </div>

                    {parseFloat(depositAmt) >= 10 && (
                      <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent TRX</span>
                          <span className="text-[1rem] font-black text-[#22C55E]">{trxCalculatedAmountTrx.toFixed(2)} TRX</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[0.65rem] text-[rgba(0,0,0,0.35)]">Taux TRX/USD</span>
                          <span className="text-[0.72rem] font-semibold text-[rgba(0,0,0,0.55)]">1 TRX = {trxPrice.toFixed(4)} $</span>
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
                              ? 'bg-[#22C55E] text-[#050506]'
                              : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'
                          }`}
                        >
                          {amt} $
                        </button>
                      ))}
                    </div>
                  </div>

                  {!adminAddress && (
                    <div className="bg-[#FFFFFF] rounded-xl p-3 mb-4 border border-[rgba(0,0,0,0.08)] flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle text-[#EF4444] text-[0.8rem]"></i>
                      <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX admin non configurée. Contactez le support.</p>
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
                    className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}

              {/* ===================== STEP 2: TRX ADDRESS ===================== */}
              {trxStep === 'address' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="text-[0.68rem] text-[rgba(0,0,0,0.35)] uppercase font-semibold tracking-[1px] mb-2">
                      <i className="fas fa-qrcode mr-1"></i> Envoyer à cette adresse
                    </div>
                    <div className="bg-[#F3F4F6] rounded-xl p-3 mb-3 border border-[rgba(0,0,0,0.08)]">
                      <div className="text-[0.72rem] font-mono text-[#22C55E] break-all leading-relaxed">
                        {esc(adminAddress)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyAddress(adminAddress, setCopied)}
                      className={`w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        copied ? 'bg-[#22C55E] text-[#050506]' : 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'
                      }`}
                    >
                      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                      {copied ? 'Copié !' : 'Copier l\'adresse'}
                    </button>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.85rem] font-bold text-[#1F2937] mb-3">Montant à envoyer</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#F3F4F6] rounded-xl p-3 text-center border border-[rgba(0,0,0,0.08)]">
                        <div className="text-[0.6rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold mb-1">TRX</div>
                        <div className="text-[1.3rem] font-black text-[#22C55E]">{trxCalculatedAmountTrx.toFixed(2)}</div>
                      </div>
                      <div className="bg-[#F3F4F6] rounded-xl p-3 text-center border border-[rgba(0,0,0,0.08)]">
                        <div className="text-[0.6rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold mb-1">USD</div>
                        <div className="text-[1.3rem] font-black text-[#4ADE80]">{parseFloat(depositAmt).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#22C55E] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-2">
                      <i className="fas fa-info-circle mr-1 text-[#22C55E]"></i> Instructions
                    </h4>
                    <ol className="space-y-1.5 text-[0.7rem] text-[rgba(0,0,0,0.55)]">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">1</span>
                        <span>Ouvrez votre wallet TRX (Trust Wallet, etc.)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">2</span>
                        <span>Envoyez <strong className="text-[#22C55E]">{trxCalculatedAmountTrx.toFixed(2)} TRX</strong> à l&apos;adresse ci-dessus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                        <span>Entrez votre adresse TRX ci-dessous pour confirmer</span>
                      </li>
                    </ol>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.85rem] font-bold text-[#1F2937] mb-1">Votre adresse TRX</h4>
                    <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] mb-3">L&apos;adresse depuis laquelle vous avez envoyé les TRX</p>
                    <input
                      type="text"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="T... (votre adresse TRX)"
                      className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] font-mono outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setTrxStep('amount')}
                      className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none"
                    >
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={handleTrxSubmit}
                      disabled={submitting || !userAddress.trim()}
                      className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
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
                  <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center">
                      <i className="fas fa-check text-[#050506] text-[1.5rem]"></i>
                    </div>
                  </div>
                  <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Dépôt soumis !</h3>
                  <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-6 max-w-[280px] mx-auto">
                    Votre dépôt de <strong className="text-[#22C55E]">{formatMoney(parseFloat(depositAmt))}</strong> est en attente de confirmation par l&apos;administrateur.
                  </p>
                  <div className="bg-[#FFFFFF] rounded-xl p-4 mb-6 max-w-[280px] mx-auto border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#22C55E]" style={{ animation: 'pulse 1.5s infinite' }} />
                      <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de confirmation...</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPage('wallet')}
                    className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer"
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
    const yasAccountError = yasAccount ? validateYasAccount(yasAccount) : null;
    // Build the complete Yas transfer syntax
    const yasTransferSyntax = adminYasAccount && yasAmountCfa >= 6000
      ? `*145*1${Math.round(yasAmountCfa)}*${adminYasAccount}*2#`
      : '';

    return (
      <>
        <Header title="Conversion Yas du Togo" icon="fa-exchange-alt" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[
                  { s: 'amount', label: '1' },
                  { s: 'guide', label: '2' },
                  { s: 'info', label: '3' },
                  { s: 'confirm', label: '4' },
                  { s: 'success', label: '5' },
                ].map((st, i) => {
                  const stepOrder: YasStep[] = ['amount', 'guide', 'info', 'confirm', 'success'];
                  const currentIdx = stepOrder.indexOf(yasStep);
                  const thisIdx = stepOrder.indexOf(st.s as YasStep);
                  const isActive = yasStep === st.s;
                  const isDone = currentIdx > thisIdx;
                  return (
                    <div key={st.s} className="flex items-center gap-1">
                      {i > 0 && <div className={`w-4 h-[2px] rounded ${isDone ? 'bg-[#22C55E]' : 'bg-[rgba(0,0,0,0.06)]'}`} />}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${
                        isActive ? 'bg-[#22C55E] text-[#050506]' : isDone ? 'bg-[#22C55E] text-[#050506]' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.35)]'
                      }`}>
                        {isDone ? <i className="fas fa-check text-[0.5rem]" /> : st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===================== YAS STEP 1: AMOUNT (CFA) ===================== */}
              {yasStep === 'amount' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Montant en FCFA</h3>
                    <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Entrez le montant en CFA que vous souhaitez convertir. Minimum 6 000 FCFA.</p>

                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[0.85rem] font-bold text-[rgba(0,0,0,0.35)]">FCFA</span>
                      <input
                        type="number"
                        step="1"
                        min="6000"
                        value={yasAmount}
                        onChange={(e) => setYasAmount(e.target.value)}
                        placeholder="0"
                        className="w-full py-4 pl-[4.5rem] pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                      />
                    </div>

                    {yasAmountCfa >= 6000 && (
                      <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant CFA</span>
                          <span className="text-[0.95rem] font-black text-[#1F2937]">{Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent USD</span>
                          <span className="text-[0.95rem] font-black text-[#4ADE80]">{yasAmountUsd.toFixed(2)} $</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                          <span className="text-[1rem] font-black text-[#22C55E]">{yasAmountTrx.toFixed(2)} TRX</span>
                        </div>
                        <div className="border-t border-[rgba(0,0,0,0.08)] mt-2 pt-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[0.65rem] text-[rgba(0,0,0,0.35)]">Taux CFA/USD</span>
                            <span className="text-[0.72rem] font-semibold text-[rgba(0,0,0,0.55)]">1 USD = {cfaUsdRate} FCFA</span>
                          </div>
                          <div className="flex justify-between items-center mt-0.5">
                            <span className="text-[0.65rem] text-[rgba(0,0,0,0.35)]">Taux TRX/USD</span>
                            <span className="text-[0.72rem] font-semibold text-[rgba(0,0,0,0.55)]">1 TRX = {trxPrice.toFixed(4)} $</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {[6000, 12000, 30000, 60000].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setYasAmount(String(amt))}
                          className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${
                            yasAmount === String(amt)
                              ? 'bg-[#22C55E] text-[#050506]'
                              : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'
                          }`}
                        >
                          {amt.toLocaleString('fr-FR')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Admin Yas Account */}
                  {adminYasAccount && (
                    <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)] relative overflow-hidden">
                      <div className="absolute -top-8 -right-8 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(34,197,94,0.1),transparent_60%)]" />
                      <div className="relative z-[1]">
                        <div className="text-[0.65rem] text-[rgba(0,0,0,0.35)] uppercase font-semibold tracking-[1px] mb-2">
                          <i className="fas fa-university mr-1"></i> Envoyez l&apos;argent à ce compte Yas
                        </div>
                        <div className="bg-[#F3F4F6] rounded-xl p-3 mb-3 border border-[rgba(0,0,0,0.08)]">
                          <div className="text-[1.1rem] font-mono font-bold text-[#22C55E] tracking-wide">
                            {esc(adminYasAccount)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopyAddress(adminYasAccount, setYasCopied)}
                          className={`w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                            yasCopied ? 'bg-[#22C55E] text-[#050506]' : 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'
                          }`}
                        >
                          <i className={`fas ${yasCopied ? 'fa-check' : 'fa-copy'}`}></i>
                          {yasCopied ? 'Copié !' : 'Copier le numéro'}
                        </button>
                      </div>
                    </div>
                  )}

                  {!adminYasAccount && (
                    <div className="bg-[#FFFFFF] rounded-xl p-3 mb-4 border border-[rgba(0,0,0,0.08)] flex items-center gap-2">
                      <i className="fas fa-exclamation-triangle text-[#EF4444] text-[0.8rem]"></i>
                      <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Compte Yas admin non configuré. Contactez le support.</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (!yasAmountCfa || yasAmountCfa < 6000) { addToast('Minimum 6 000 FCFA', 'error'); return; }
                      setYasStep('guide');
                    }}
                    disabled={!yasAmount || parseFloat(yasAmount) < 6000}
                    className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}

              {/* ===================== YAS STEP 2: GUIDE TRANSFERT YAS ===================== */}
              {yasStep === 'guide' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)] relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(34,197,94,0.1),transparent_60%)]" />
                    <div className="relative z-[1]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center border border-[rgba(34,197,94,0.15)]">
                          <i className="fas fa-mobile-alt text-[#22C55E] text-[0.9rem]"></i>
                        </div>
                        <div>
                          <h3 className="text-[0.95rem] font-bold text-[#1F2937]">Comment envoyer via Yas</h3>
                          <p className="text-[0.65rem] text-[rgba(0,0,0,0.35)]">Suivez ces étapes pour transférer</p>
                        </div>
                      </div>
                      <ol className="space-y-2.5">
                        {[
                          { icon: 'fa-phone', text: 'Ouvrez le clavier de votre téléphone' },
                          { icon: 'fa-hashtag', text: 'Composez le code de transfert Yas' },
                          { icon: 'fa-calculator', text: 'Entrez le montant que vous souhaitez envoyer' },
                          { icon: 'fa-user', text: 'Entrez le numéro Yas du destinataire (celui de l\'admin)' },
                          { icon: 'fa-check-double', text: 'Confirmez l\'envoi en tapant 2 puis #' },
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(34,197,94,0.12)]">
                              <i className={`fas ${step.icon} text-[0.55rem] text-[#22C55E]`}></i>
                            </div>
                            <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed">{step.text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Syntax preview */}
                  <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.82rem] font-bold text-[#1F2937] mb-2">
                      <i className="fas fa-code mr-1 text-[#22C55E]"></i> Format du code
                    </h4>
                    <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                      <div className="text-[0.78rem] font-mono font-bold text-[#22C55E] text-center tracking-wide">
                        *145*1(montant)*{adminYasAccount || 'XXXXXXXX'}*2#
                      </div>
                    </div>
                    <p className="text-[0.65rem] text-[rgba(0,0,0,0.45)] mt-2 text-center">
                      Remplacez (montant) par le montant en FCFA que vous souhaitez envoyer
                    </p>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#22C55E] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-exclamation-triangle text-[#22C55E] text-[0.8rem] mt-0.5"></i>
                      <div>
                        <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-1">Important</h4>
                        <p className="text-[0.68rem] text-[rgba(0,0,0,0.55)] leading-relaxed">
                          Après l&apos;envoi, l&apos;administrateur convertira votre argent et vous enverra les TRX sur votre adresse Trust Wallet.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setYasStep('amount')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button onClick={() => setYasStep('info')} className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer">
                      J&apos;ai compris, continuer <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== YAS STEP 3: NUMÉRO YAS + ADRESSE TRX ===================== */}
              {yasStep === 'info' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                        <i className="fas fa-phone text-[#22C55E] text-[0.8rem]"></i>
                      </div>
                      <div>
                        <h3 className="text-[0.95rem] font-bold text-[#1F2937]">Votre numéro Yas</h3>
                        <p className="text-[0.68rem] text-[rgba(0,0,0,0.55)]">Le numéro depuis lequel vous allez envoyer l&apos;argent</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={yasAccount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
                        setYasAccount(val);
                      }}
                      placeholder="Ex: 90123456"
                      className={`w-full py-3.5 px-4 bg-[#F3F4F6] border-[1.5px] rounded-xl text-[0.95rem] font-mono outline-none text-gray-900 placeholder:text-[rgba(0,0,0,0.3)] ${
                        yasAccount && yasAccountError ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[rgba(0,0,0,0.08)] focus:border-[#22C55E]'
                      }`}
                      maxLength={8}
                    />
                    {yasAccount && yasAccountError && (
                      <p className="text-[0.68rem] text-[#EF4444] mt-1.5 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-[0.6rem]"></i>
                        {yasAccountError}
                      </p>
                    )}
                    {yasAccount && !yasAccountError && (
                      <p className="text-[0.68rem] text-[#22C55E] mt-1.5 flex items-center gap-1">
                        <i className="fas fa-check-circle text-[0.6rem]"></i>
                        Numéro valide
                      </p>
                    )}
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                        <i className="fas fa-wallet text-[#22C55E] text-[0.8rem]"></i>
                      </div>
                      <div>
                        <h3 className="text-[0.95rem] font-bold text-[#1F2937]">Adresse TRX Trust Wallet</h3>
                        <p className="text-[0.68rem] text-[rgba(0,0,0,0.55)]">L&apos;admin vous enverra les TRX à cette adresse après conversion</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={yasTrxAddress}
                      onChange={(e) => setYasTrxAddress(e.target.value)}
                      placeholder="T... (votre adresse TRX Trust Wallet)"
                      className="w-full py-3.5 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] font-mono outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setYasStep('guide')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={() => {
                        if (!yasAccount.trim()) { addToast('Entrez votre numéro Yas', 'error'); return; }
                        if (yasAccountError) { addToast(yasAccountError, 'error'); return; }
                        if (!yasTrxAddress.trim()) { addToast('Entrez votre adresse TRX', 'error'); return; }
                        setYasStep('confirm');
                      }}
                      disabled={!yasAccount.trim() || !!yasAccountError || !yasTrxAddress.trim()}
                      className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuer <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== YAS STEP 4: CONFIRMATION + SYNTAXE ===================== */}
              {yasStep === 'confirm' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.82rem] font-bold text-[#1F2937] mb-2">Récapitulatif</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant CFA</span>
                        <span className="text-[0.88rem] font-bold text-[#1F2937]">{Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent USD</span>
                        <span className="text-[0.88rem] font-bold text-[#4ADE80]">{yasAmountUsd.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">TRX à recevoir</span>
                        <span className="text-[0.88rem] font-bold text-[#22C55E]">{yasAmountTrx.toFixed(2)} TRX</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Votre numéro Yas</span>
                        <span className="text-[0.82rem] font-bold text-[#1F2937]">{esc(yasAccount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX</span>
                        <span className="text-[0.72rem] font-mono font-bold text-[#1F2937] max-w-[180px] truncate">{esc(yasTrxAddress)}</span>
                      </div>
                    </div>
                  </div>

                  {/* SYNTAXE D'ENVOI */}
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border-[2px] border-[#22C55E] relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(34,197,94,0.15),transparent_60%)]" />
                    <div className="relative z-[1]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#22C55E] flex items-center justify-center shrink-0">
                          <i className="fas fa-paper-plane text-[#050506] text-[0.9rem]"></i>
                        </div>
                        <div>
                          <h3 className="text-[0.95rem] font-black text-[#1F2937]">Code d&apos;envoi Yas</h3>
                          <p className="text-[0.65rem] text-[rgba(0,0,0,0.55)]">Composez ce code sur votre téléphone</p>
                        </div>
                      </div>
                      <div className="bg-[rgba(34,197,94,0.08)] rounded-xl p-4 mb-3 border border-[rgba(34,197,94,0.2)]">
                        <div className="text-[1.2rem] font-mono font-black text-[#22C55E] text-center tracking-wider break-all">
                          {yasTransferSyntax || '*145*1...*...*2#'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleCopyAddress(yasTransferSyntax, setYasSyntaxCopied)}
                          className={`py-3 rounded-xl text-[0.78rem] font-bold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                            yasSyntaxCopied ? 'bg-[#22C55E] text-[#050506]' : 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'
                          }`}
                        >
                          <i className={`fas ${yasSyntaxCopied ? 'fa-check' : 'fa-copy'}`}></i>
                          {yasSyntaxCopied ? 'Copié !' : 'Copier'}
                        </button>
                        {yasTransferSyntax && (
                          <a
                            href={`tel:${yasTransferSyntax}`}
                            className="py-3 rounded-xl text-[0.78rem] font-bold bg-[#22C55E] text-[#050506] no-underline flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                          >
                            <i className="fas fa-phone"></i>
                            Lancer le code
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#22C55E] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-1.5">
                      <i className="fas fa-info-circle mr-1 text-[#22C55E]"></i> Que faire maintenant ?
                    </h4>
                    <ol className="space-y-1.5 text-[0.68rem] text-[rgba(0,0,0,0.55)]">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">1</span>
                        <span>Copiez le code ci-dessus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">2</span>
                        <span>Ouvrez le clavier de votre téléphone et composez le code</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                        <span>Confirmez le transfert</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">4</span>
                        <span>Cliquez sur <strong className="text-[#22C55E]">Soumettre</strong> ci-dessous pour signaler votre dépôt</span>
                      </li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setYasStep('info')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={handleYasSubmit}
                      disabled={yasSubmitting}
                      className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {yasSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
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

              {/* ===================== YAS STEP 5: SUCCESS ===================== */}
              {yasStep === 'success' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="text-center py-4">
                    <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
                      <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center">
                        <i className="fas fa-check text-[#050506] text-[1.5rem]"></i>
                      </div>
                    </div>
                    <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Demande soumise !</h3>
                    <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[300px] mx-auto">
                      Votre demande de conversion de <strong className="text-[#22C55E]">{Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA</strong> a été envoyée. L&apos;admin vous enverra <strong className="text-[#22C55E]">{yasAmountTrx.toFixed(2)} TRX</strong> sur votre Trust Wallet.
                    </p>
                  </div>

                  {yasTransferSyntax && (
                    <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border-[2px] border-[#22C55E]">
                      <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-2">
                        <i className="fas fa-code mr-1 text-[#22C55E]"></i> Rappel du code d&apos;envoi
                      </h4>
                      <div className="bg-[rgba(34,197,94,0.08)] rounded-xl p-3 mb-2 border border-[rgba(34,197,94,0.2)]">
                        <div className="text-[1rem] font-mono font-black text-[#22C55E] text-center tracking-wider break-all">
                          {yasTransferSyntax}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => handleCopyAddress(yasTransferSyntax, setYasSyntaxCopied)}
                          className={`py-2.5 rounded-xl text-[0.75rem] font-bold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                            yasSyntaxCopied ? 'bg-[#22C55E] text-[#050506]' : 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'
                          }`}
                        >
                          <i className={`fas ${yasSyntaxCopied ? 'fa-check' : 'fa-copy'}`}></i>
                          {yasSyntaxCopied ? 'Copié !' : 'Copier'}
                        </button>
                        <a
                          href={`tel:${yasTransferSyntax}`}
                          className="py-2.5 rounded-xl text-[0.75rem] font-bold bg-[#22C55E] text-[#050506] no-underline flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                        >
                          <i className="fas fa-phone"></i>
                          Lancer le code
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#FFFFFF] rounded-xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#22C55E]" style={{ animation: 'pulse 1.5s infinite' }} />
                      <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de traitement par l&apos;admin...</span>
                    </div>
                  </div>
                  <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer">
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
