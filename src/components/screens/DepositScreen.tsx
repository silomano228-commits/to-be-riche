'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch, refreshUser } from '@/lib/store';
import { Header } from '@/components/shared';

type DepositMethod = 'choose' | 'yas' | 'trx';
type TrxStep = 'amount' | 'send' | 'success';
type YasStep = 'amount' | 'send' | 'info' | 'success';

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
  | { type: 'yas'; amountCfa: number; amountUsd: number; amountTrx: number; yasAccount: string; createdAt?: string };

export default function DepositScreen() {
  const { user, setPage, addToast } = useAppStore();
  const [method, setMethod] = useState<DepositMethod>('choose');

  // TRX deposit state
  const [trxStep, setTrxStep] = useState<TrxStep>('amount');
  const [depositAmt, setDepositAmt] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [adminAddress, setAdminAddress] = useState('');
  const [trxPrice, setTrxPrice] = useState(0);
  const [trxSubmitting, setTrxSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // YAS deposit state
  const [yasStep, setYasStep] = useState<YasStep>('amount');
  const [yasAmount, setYasAmount] = useState('');
  const [yasAccount, setYasAccount] = useState('');
  const [yasSubmitting, setYasSubmitting] = useState(false);
  const [cfaUsdRate, setCfaUsdRate] = useState(600);
  const [adminYasAccount, setAdminYasAccount] = useState('');
  const [yasCopied, setYasCopied] = useState(false);
  const [syntaxCopied, setSyntaxCopied] = useState(false);

  // Unified pending deposit
  const [activePending, setActivePending] = useState<ActivePendingDeposit | null>(null);

  // Load deposit info on mount
  useEffect(() => {
    const loadInfo = async () => {
      let foundPending: ActivePendingDeposit | null = null;
      let gotYasAccount = false;
      let gotTrxAddress = false;

      try {
        const res = await authFetch('/api/deposit/trx');
        const data = await res.json();
        if (data.success) {
          if (data.data.adminAddress) { setAdminAddress(data.data.adminAddress); gotTrxAddress = true; }
          setTrxPrice(data.data.trxPrice || 0.12);
          if (data.data.pendingDeposit) {
            foundPending = { type: 'trx', ...data.data.pendingDeposit };
          }
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
          if (data.data.adminYasAccount) { setAdminYasAccount(data.data.adminYasAccount); gotYasAccount = true; }
          if (!foundPending && data.data.pendingDeposit) {
            foundPending = { type: 'yas', ...data.data.pendingDeposit };
          }
          if (!foundPending && data.data.pendingTrxDeposit) {
            foundPending = { type: 'trx', ...data.data.pendingTrxDeposit };
          }
        }
      } catch { /* */ }

      // Fallback: if critical config is still missing, try admin config endpoint
      if (!gotYasAccount || !gotTrxAddress) {
        try {
          const res = await authFetch('/api/admin/config');
          const data = await res.json();
          if (data.success && data.config) {
            if (!gotYasAccount && data.config.adminYasAccount) setAdminYasAccount(data.config.adminYasAccount);
            if (!gotTrxAddress && data.config.adminTrxAddress) setAdminAddress(data.config.adminTrxAddress);
          }
        } catch { /* */ }
      }

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

  // Calculate CFA → USD → TRX for YAS flow
  const yasAmountCfa = parseFloat(yasAmount) || 0;
  const yasAmountUsd = cfaUsdRate > 0 ? Math.round((yasAmountCfa / cfaUsdRate) * 100) / 100 : 0;
  const yasAmountTrx = trxPrice > 0 && yasAmountUsd > 0 ? Math.round((yasAmountUsd / trxPrice) * 100) / 100 : 0;

  const handleCopy = async (text: string, setCopyState: (v: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState(true);
      setTimeout(() => setCopyState(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopyState(true);
      setTimeout(() => setCopyState(false), 2000);
    }
  };

  // TRX deposit submit
  const handleTrxSubmit = async () => {
    const amt = parseFloat(depositAmt);
    if (!amt || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
    if (!adminAddress) { addToast('Adresse de paiement non configurée', 'error'); return; }

    setTrxSubmitting(true);
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
        await refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setTrxSubmitting(false);
  };

  // YAS deposit submit
  const handleYasSubmit = async () => {
    const amtCfa = parseFloat(yasAmount);
    if (!amtCfa || amtCfa < 6000) { addToast('Minimum 6 000 FCFA', 'error'); return; }

    const yasErr = validateYasAccount(yasAccount);
    if (yasErr) { addToast(yasErr, 'error'); return; }

    setYasSubmitting(true);
    try {
      const res = await authFetch('/api/deposit/yas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCfa: parseFloat(yasAmount),
          yasAccount: yasAccount.trim(),
          destination: 'balance',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setYasStep('success');
        setActivePending({ type: 'yas', amountCfa: amtCfa, amountUsd: yasAmountUsd, amountTrx: yasAmountTrx, yasAccount: yasAccount.trim() });
        addToast('Dépôt soumis !', 'success');
        await refreshUser();
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

  const walletBackBtn = (
    <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
      <i className="fas fa-arrow-left text-[0.8rem]"></i>
    </button>
  );

  // ===================== PENDING DEPOSIT =====================
  if (activePending && method === 'choose') {
    const isTrxPending = activePending.type === 'trx';
    const pendingColor = isTrxPending ? '#6366F1' : '#22C55E';
    const pendingIcon = isTrxPending ? 'fa-clock' : 'fa-mobile-alt';
    const pendingHeader = isTrxPending ? 'Dépôt TRX en attente' : 'Dépôt Yas en attente';
    const pendingSubtext = isTrxPending
      ? 'Vous ne pouvez pas faire de nouveau dépôt tant que celui-ci n\'est pas confirmé.'
      : 'Notre équipe de validation vérifiera votre paiement sous peu.';

    return (
      <>
        <Header title="Dépôt en attente" icon="fa-clock" iconColor={pendingColor} leftElement={walletBackBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: pendingColor }}>
                <i className={`fas ${pendingIcon} text-[#050506] text-[1.2rem]`}></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">{pendingHeader}</h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">{pendingSubtext}</p>
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
                <div className="flex justify-between items-center">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Compte Yas</span>
                  <span className="text-[0.78rem] font-bold text-[#1F2937]">{esc(activePending.yasAccount)}</span>
                </div>
              )}
            </div>
            <div className="rounded-xl p-3 mb-3 border" style={{ backgroundColor: `${pendingColor}14`, borderColor: `${pendingColor}26` }}>
              <div className="flex items-start gap-2">
                <i className="fas fa-info-circle text-[0.8rem] mt-0.5" style={{ color: pendingColor }}></i>
                <p className="text-[0.7rem] text-[rgba(0,0,0,0.65)] leading-relaxed">
                  Cela peut prendre quelques minutes. Vous serez crédité dès que notre équipe aura validé le dépôt.
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer" style={{ backgroundColor: pendingColor }}>
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
        <Header title="Déposer" icon="fa-arrow-down" iconColor="#22C55E" leftElement={walletBackBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              <h2 className="text-[1.1rem] font-black text-[#1F2937] mb-1">Choisissez votre méthode</h2>
              <p className="text-[0.78rem] text-[rgba(0,0,0,0.55)] mb-5">Comment souhaitez-vous approvisionner votre compte ?</p>

              {/* Option 1: Yas */}
              <button
                onClick={() => { setMethod('yas'); setYasStep('amount'); }}
                className="w-full text-left rounded-2xl p-5 mb-3 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-mobile-alt text-[#22C55E] text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Dépôt via Yas</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Envoyez de l&apos;argent via Yas au numéro indiqué. Le montant sera crédité sur votre solde après vérification.</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
                        <i className="fas fa-wallet"></i> Solde principal
                      </span>
                      <span className="text-[0.6rem] text-[rgba(0,0,0,0.35)]">Min: 6 000 FCFA</span>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>
                </div>
              </button>

              {/* Option 2: TRX direct */}
              <button
                onClick={() => setMethod('trx')}
                className="w-full text-left rounded-2xl p-5 mb-5 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(99,102,241,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0">
                    <i className="fab fa-gg-circle text-[#6366F1] text-[1.3rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Dépôt direct en TRX</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Envoyez des TRX à l&apos;adresse indiquée. Confirmation rapide après vérification.</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#6366F1] bg-[rgba(99,102,241,0.12)] px-2 py-1 rounded-full">
                        <i className="fas fa-bolt"></i> Rapide & direct
                      </span>
                      <span className="text-[0.6rem] text-[rgba(0,0,0,0.35)]">Min: $10</span>
                    </div>
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
                  <strong className="text-[#22C55E]">Yas</strong> : Déposez via mobile money, votre solde sera crédité après vérification.<br />
                  <strong className="text-[#6366F1]">TRX</strong> : Vous avez déjà des TRX, envoyez-les directement à l&apos;adresse indiquée.
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
    // SUCCESS
    if (trxStep === 'success') {
      return (
        <>
          <Header title="Dépôt TRX" icon="fa-arrow-down" iconColor="#6366F1" leftElement={walletBackBtn} />
          <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-4">
                <div className="w-14 h-14 rounded-full bg-[#6366F1] flex items-center justify-center">
                  <i className="fas fa-check text-white text-[1.5rem]"></i>
                </div>
              </div>
              <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Dépôt soumis !</h3>
              <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-6 max-w-[280px] mx-auto">
                Votre dépôt de <strong className="text-[#6366F1]">{formatMoney(parseFloat(depositAmt))}</strong> est en attente de confirmation par notre équipe.
              </p>
              <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer">
                <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
              </button>
            </div>
          </div>
        </>
      );
    }

    // Step indicator
    const stepOrder: TrxStep[] = ['amount', 'send', 'success'];
    const currentIdx = stepOrder.indexOf(trxStep);

    return (
      <>
        <Header title="Dépôt TRX" icon="fa-arrow-down" iconColor="#6366F1" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#6366F1] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[
                  { s: 'amount', label: '1' },
                  { s: 'send', label: '2' },
                  { s: 'success', label: '3' },
                ].map((st, i) => {
                  const thisIdx = stepOrder.indexOf(st.s);
                  const isActive = trxStep === st.s;
                  const isDone = currentIdx > thisIdx;
                  return (
                    <div key={st.s} className="flex items-center gap-2">
                      {i > 0 && <div className={`w-8 h-[2px] rounded ${isDone ? 'bg-[#6366F1]' : 'bg-[rgba(0,0,0,0.06)]'}`} />}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-bold ${
                        isActive ? 'bg-[#6366F1] text-white' : isDone ? 'bg-[#6366F1] text-white' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.35)]'
                      }`}>
                        {isDone ? <i className="fas fa-check text-[0.6rem]" /> : st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

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
                        className="w-full py-4 pl-9 pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#6366F1] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                      />
                    </div>

                    {parseFloat(depositAmt) >= 10 && (
                      <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                        <div className="flex justify-between items-center">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent TRX</span>
                          <span className="text-[1rem] font-black text-[#6366F1]">{trxCalculatedAmountTrx.toFixed(2)} TRX</span>
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
                              ? 'bg-[#6366F1] text-white'
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
                      <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX non configurée. Contactez le support.</p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const amt = parseFloat(depositAmt);
                      if (!amt || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
                      if (!adminAddress) { addToast('Adresse de paiement non configurée', 'error'); return; }
                      setTrxStep('send');
                    }}
                    disabled={!depositAmt || parseFloat(depositAmt) < 10 || !adminAddress}
                    className="w-full py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}

              {/* ===================== STEP 2: SEND TRX ===================== */}
              {trxStep === 'send' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  {/* Admin address */}
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="text-[0.68rem] text-[rgba(0,0,0,0.35)] uppercase font-semibold tracking-[1px] mb-2">
                      <i className="fas fa-qrcode mr-1"></i> Envoyer à cette adresse
                    </div>
                    <div className="bg-[#F3F4F6] rounded-xl p-3 mb-3 border border-[rgba(0,0,0,0.08)]">
                      <div className="text-[0.72rem] font-mono text-[#6366F1] break-all leading-relaxed">
                        {esc(adminAddress)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(adminAddress, setCopied)}
                      className={`w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        copied ? 'bg-[#6366F1] text-white' : 'bg-[rgba(99,102,241,0.12)] text-[#6366F1]'
                      }`}
                    >
                      <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
                      {copied ? 'Copié !' : 'Copier l\'adresse'}
                    </button>
                  </div>

                  {/* Amount to send */}
                  <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.85rem] font-bold text-[#1F2937] mb-3">Montant à envoyer</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#F3F4F6] rounded-xl p-3 text-center border border-[rgba(0,0,0,0.08)]">
                        <div className="text-[0.6rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold mb-1">TRX</div>
                        <div className="text-[1.3rem] font-black text-[#6366F1]">{trxCalculatedAmountTrx.toFixed(2)}</div>
                      </div>
                      <div className="bg-[#F3F4F6] rounded-xl p-3 text-center border border-[rgba(0,0,0,0.08)]">
                        <div className="text-[0.6rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold mb-1">USD</div>
                        <div className="text-[1.3rem] font-black text-[#4ADE80]">{parseFloat(depositAmt).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#6366F1] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-2">
                      <i className="fas fa-info-circle mr-1 text-[#6366F1]"></i> Instructions
                    </h4>
                    <ol className="space-y-1.5 text-[0.7rem] text-[rgba(0,0,0,0.55)]">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">1</span>
                        <span>Ouvrez votre wallet TRX (Trust Wallet, etc.)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">2</span>
                        <span>Envoyez <strong className="text-[#6366F1]">{trxCalculatedAmountTrx.toFixed(2)} TRX</strong> à l&apos;adresse ci-dessus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                        <span>Entrez votre adresse TRX ci-dessous pour confirmer</span>
                      </li>
                    </ol>
                  </div>

                  {/* User address input */}
                  <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.85rem] font-bold text-[#1F2937] mb-1">Votre adresse TRX</h4>
                    <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] mb-3">L&apos;adresse depuis laquelle vous avez envoyé les TRX</p>
                    <input
                      type="text"
                      value={userAddress}
                      onChange={(e) => setUserAddress(e.target.value)}
                      placeholder="T... (votre adresse TRX)"
                      className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] font-mono outline-none focus:border-[#6366F1] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
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
                      disabled={trxSubmitting || !userAddress.trim()}
                      className="flex-[2] py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {trxSubmitting ? (
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
            </>
          )}
        </div>
      </>
    );
  }

  // ===================== YAS DEPOSIT FLOW =====================
  if (method === 'yas') {
    // SUCCESS
    if (yasStep === 'success') {
      return (
        <>
          <Header title="Dépôt Yas" icon="fa-arrow-down" iconColor="#22C55E" leftElement={walletBackBtn} />
          <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
                <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center">
                  <i className="fas fa-check text-white text-[1.5rem]"></i>
                </div>
              </div>
              <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Dépôt soumis !</h3>
              <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[300px] mx-auto">
                Votre dépôt de <strong className="text-[#22C55E]">{Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA</strong> ({formatMoney(yasAmountUsd)}) est en attente de validation.
              </p>
              <div className="bg-[#FFFFFF] rounded-xl p-4 mb-6 max-w-[300px] mx-auto border border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" style={{ animation: 'pulse 1.5s infinite' }} />
                  <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de validation...</span>
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

    const yasAccountError = yasAccount ? validateYasAccount(yasAccount) : null;

    return (
      <>
        <Header title="Dépôt Yas" icon="fa-arrow-down" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { s: 'amount', label: '1' },
              { s: 'send', label: '2' },
              { s: 'info', label: '3' },
              { s: 'success', label: '4' },
            ].map((st, i) => {
              const stepOrder: YasStep[] = ['amount', 'send', 'info', 'success'];
              const currentIdx = stepOrder.indexOf(yasStep);
              const thisIdx = stepOrder.indexOf(st.s as YasStep);
              const isActive = yasStep === st.s;
              const isDone = currentIdx > thisIdx;
              return (
                <div key={st.s} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-6 h-[2px] rounded ${isDone ? 'bg-[#22C55E]' : 'bg-[rgba(0,0,0,0.06)]'}`} />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${
                    isActive ? 'bg-[#22C55E] text-white' : isDone ? 'bg-[#22C55E] text-white' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.35)]'
                  }`}>
                    {isDone ? <i className="fas fa-check text-[0.5rem]" /> : st.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===================== STEP 1: AMOUNT ===================== */}
          {yasStep === 'amount' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Montant du dépôt</h3>
                <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Entrez le montant en FCFA. Minimum 6 000 FCFA.</p>

                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[1rem] font-bold text-[rgba(0,0,0,0.35)]">₣</span>
                  <input
                    type="number"
                    step="500"
                    min="6000"
                    value={yasAmount}
                    onChange={(e) => setYasAmount(e.target.value)}
                    placeholder="0"
                    className="w-full py-4 pl-9 pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                  />
                </div>

                {parseFloat(yasAmount) >= 6000 && (
                  <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant FCFA</span>
                      <span className="text-[0.95rem] font-black text-[#22C55E]">{Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent USD</span>
                      <span className="text-[0.95rem] font-black text-[#4ADE80]">{formatMoney(yasAmountUsd)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent TRX</span>
                      <span className="text-[0.95rem] font-black text-[#6366F1]">{yasAmountTrx.toFixed(2)} TRX</span>
                    </div>
                    <div className="border-t border-[rgba(0,0,0,0.08)] mt-2 pt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.65rem] text-[rgba(0,0,0,0.35)]">Taux CFA/USD</span>
                        <span className="text-[0.72rem] font-semibold text-[rgba(0,0,0,0.55)]">1 $ = {cfaUsdRate} FCFA</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-4 gap-2 mt-3">
                  {[6000, 10000, 25000, 50000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setYasAmount(String(amt))}
                      className={`py-2 rounded-lg text-[0.65rem] font-semibold border-none cursor-pointer transition-all ${
                        yasAmount === String(amt)
                          ? 'bg-[#22C55E] text-white'
                          : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'
                      }`}
                    >
                      {(amt / 1000)}K
                    </button>
                  ))}
                </div>
              </div>

              {!adminYasAccount && (
                <div className="bg-[rgba(239,68,68,0.08)] rounded-xl p-3 mb-4 border border-[rgba(239,68,68,0.2)] flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-[#EF4444] text-[0.8rem]"></i>
                  <p className="text-[0.72rem] text-[rgba(0,0,0,0.65)]">Dépôt Yas temporairement indisponible (service non configuré).</p>
                </div>
              )}

              <button
                onClick={() => {
                  if (!yasAmount || parseFloat(yasAmount) < 6000) { addToast('Minimum 6 000 FCFA', 'error'); return; }
                  if (!adminYasAccount) { addToast('Service Yas non configuré', 'error'); return; }
                  setYasStep('send');
                }}
                disabled={!yasAmount || parseFloat(yasAmount) < 6000 || !adminYasAccount}
                className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          )}

          {/* ===================== STEP 2: SEND ===================== */}
          {yasStep === 'send' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[rgba(34,197,94,0.08)] rounded-2xl p-5 mb-4 border border-[rgba(34,197,94,0.2)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#22C55E] flex items-center justify-center shrink-0">
                    <i className="fas fa-paper-plane text-white text-[0.9rem]"></i>
                  </div>
                  <div>
                    <h3 className="text-[1rem] font-bold text-[#1F2937]">Envoyez via Yas</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Envoyez le montant au numéro ci-dessous</p>
                  </div>
                </div>

                {/* Amount to send */}
                <div className="bg-[#FFFFFF] rounded-xl p-4 border border-[rgba(0,0,0,0.08)]">
                  <div className="text-[0.68rem] text-[rgba(0,0,0,0.35)] uppercase font-semibold tracking-[1px] mb-2">
                    Montant à envoyer
                  </div>
                  <div className="text-[1.5rem] font-black text-[#22C55E] text-center">
                    {Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA
                  </div>
                  <div className="text-[0.75rem] text-center text-[rgba(0,0,0,0.45)] mt-1">
                    ≈ {formatMoney(yasAmountUsd)}
                  </div>
                </div>
              </div>

              {/* Yas syntax */}
              {!adminYasAccount ? (
                <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border border-[rgba(239,68,68,0.3)]">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-[#EF4444] text-[0.8rem]"></i>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.65)]">Service Yas non configuré. Contactez le support.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#22C55E] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                  <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-2">
                    <i className="fas fa-info-circle mr-1 text-[#22C55E]"></i> Code USSD Yas
                  </h4>
                  <div className="bg-[#F3F4F6] rounded-lg p-2.5 mb-2 border border-[rgba(0,0,0,0.08)]">
                    <code className="text-[0.78rem] font-mono font-bold text-[#22C55E]">
                      *145*1*{Math.round(yasAmountCfa)}*{adminYasAccount}*2#
                    </code>
                  </div>
                  <p className="text-[0.62rem] text-[rgba(0,0,0,0.45)] mb-2">
                    <i className="fas fa-info-circle mr-1"></i> Composez ce code sur votre téléphone. Le <strong>2</strong> confirme le transfert.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy(`*145*1*${Math.round(yasAmountCfa)}*${adminYasAccount}*2#`, setSyntaxCopied)}
                      className={`flex-1 py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        syntaxCopied ? 'bg-[#22C55E] text-white' : 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'
                      }`}
                    >
                      <i className={`fas ${syntaxCopied ? 'fa-check' : 'fa-copy'} text-[0.65rem]`}></i>
                      {syntaxCopied ? 'Copié !' : 'Copier'}
                    </button>
                    <a
                      href={`tel:*145*1*${Math.round(yasAmountCfa)}*${adminYasAccount}*2%23`}
                      className="flex-1 py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1 bg-[#22C55E] text-[#050506] no-underline"
                    >
                      <i className="fas fa-phone text-[0.65rem]"></i>
                      Lancer le code
                    </a>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setYasStep('amount')}
                  className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none"
                >
                  <i className="fas fa-arrow-left mr-1"></i> Retour
                </button>
                <button
                  onClick={() => setYasStep('info')}
                  className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer"
                >
                  J&apos;ai envoyé <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          )}

          {/* ===================== STEP 3: INFO ===================== */}
          {yasStep === 'info' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Vos informations</h3>
                <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Veuillez renseigner votre numéro Yas pour permettre la vérification du paiement.</p>

                <div className="mb-3">
                  <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Numéro de compte Yas du Togo</label>
                  <input
                    type="tel"
                    value={yasAccount}
                    onChange={(e) => setYasAccount(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="90XXXXXX ou 70XXXXXX"
                    className={`w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] rounded-xl text-[0.88rem] outline-none text-gray-900 placeholder:text-[rgba(0,0,0,0.3)] ${
                      yasAccountError ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[rgba(0,0,0,0.08)] focus:border-[#22C55E]'
                    }`}
                  />
                  {yasAccountError && <p className="text-[0.65rem] text-[#EF4444] mt-1">{yasAccountError}</p>}
                  {yasAccount && !yasAccountError && <p className="text-[0.65rem] text-[#22C55E] mt-1"><i className="fas fa-check mr-1"></i>Numéro valide</p>}
                </div>

                {/* Summary */}
                <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant envoyé</span>
                    <span className="text-[0.95rem] font-black text-[#22C55E]">{Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent USD</span>
                    <span className="text-[0.95rem] font-black text-[#4ADE80]">{formatMoney(yasAmountUsd)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setYasStep('send')}
                  className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none"
                >
                  <i className="fas fa-arrow-left mr-1"></i> Retour
                </button>
                <button
                  onClick={handleYasSubmit}
                  disabled={yasSubmitting || !yasAccount || !!yasAccountError}
                  className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {yasSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Soumettre le dépôt
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  return null;
}
