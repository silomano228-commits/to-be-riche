'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch, refreshUser } from '@/lib/store';
import { Header } from '@/components/shared';

type DepositMethod = 'choose' | 'yas-balance' | 'yas-trx' | 'trx';
type TrxStep = 'amount' | 'address' | 'success';
type YasStep = 'amount' | 'guide' | 'info' | 'confirm' | 'success';
type YasTrxStep = 'amount' | 'trustwallet' | 'info' | 'confirm' | 'success';

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

// TRX address validation
function validateTrxAddress(address: string): string | null {
  const trimmed = address.trim();
  if (!trimmed) return 'Adresse TRX requise';
  if (!trimmed.startsWith('T') || trimmed.length < 30) return 'Adresse TRX invalide (doit commencer par T)';
  return null;
}

// Represents ANY pending deposit across both tables
type ActivePendingDeposit =
  | { type: 'trx'; amountUsd: number; amountTrx: number; userAddress?: string; createdAt?: string }
  | { type: 'yas'; amountCfa: number; amountUsd: number; amountTrx: number; yasAccount: string; trxAddress: string; destination?: string; createdAt?: string };

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

  // Yas balance deposit state
  const [yasBalanceStep, setYasBalanceStep] = useState<YasStep>('amount');
  const [yasAmount, setYasAmount] = useState('');
  const [yasAccount, setYasAccount] = useState('');
  const [yasSubmitting, setYasSubmitting] = useState(false);
  const [cfaUsdRate, setCfaUsdRate] = useState(600);
  const [adminYasAccount, setAdminYasAccount] = useState('');
  const [yasCopied, setYasCopied] = useState(false);
  const [yasSyntaxCopied, setYasSyntaxCopied] = useState(false);

  // Yas TRX deposit state
  const [yasTrxStep, setYasTrxStep] = useState<YasTrxStep>('amount');
  const [yasTrxAmount, setYasTrxAmount] = useState('');
  const [yasTrxAccount, setYasTrxAccount] = useState('');
  const [yasTrxAddress, setYasTrxAddress] = useState('');
  const [yasTrxSubmitting, setYasTrxSubmitting] = useState(false);
  const [yasTrxCopied, setYasTrxCopied] = useState(false);
  const [yasTrxSyntaxCopied, setYasTrxSyntaxCopied] = useState(false);

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
          if (data.data.adminYasAccount) setAdminYasAccount(data.data.adminYasAccount);
          if (!foundPending && data.data.pendingDeposit) {
            foundPending = { type: 'yas', ...data.data.pendingDeposit };
          }
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

  // Calculate CFA → USD → TRX for Yas balance flow
  const yasAmountCfa = parseFloat(yasAmount) || 0;
  const yasAmountUsd = cfaUsdRate > 0 ? Math.round((yasAmountCfa / cfaUsdRate) * 100) / 100 : 0;
  const yasAmountTrx = trxPrice > 0 && yasAmountUsd > 0 ? Math.round((yasAmountUsd / trxPrice) * 100) / 100 : 0;

  // Calculate CFA → USD → TRX for Yas TRX flow
  const yasTrxAmountCfa = parseFloat(yasTrxAmount) || 0;
  const yasTrxAmountUsd = cfaUsdRate > 0 ? Math.round((yasTrxAmountCfa / cfaUsdRate) * 100) / 100 : 0;
  const yasTrxAmountTrx = trxPrice > 0 && yasTrxAmountUsd > 0 ? Math.round((yasTrxAmountUsd / trxPrice) * 100) / 100 : 0;

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
        await refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setSubmitting(false);
  };

  // Yas balance deposit submit
  const handleYasBalanceSubmit = async () => {
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
        setYasBalanceStep('success');
        setActivePending({ type: 'yas', amountCfa: amtCfa, amountUsd: yasAmountUsd, amountTrx: yasAmountTrx, yasAccount: yasAccount.trim(), trxAddress: '', destination: 'balance' });
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

  // Yas TRX deposit submit
  const handleYasTrxSubmit = async () => {
    const amtCfa = parseFloat(yasTrxAmount);
    if (!amtCfa || amtCfa < 6000) { addToast('Minimum 6 000 FCFA', 'error'); return; }

    const yasErr = validateYasAccount(yasTrxAccount);
    if (yasErr) { addToast(yasErr, 'error'); return; }

    const trxErr = validateTrxAddress(yasTrxAddress);
    if (trxErr) { addToast(trxErr, 'error'); return; }

    setYasTrxSubmitting(true);
    try {
      const res = await authFetch('/api/deposit/yas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCfa: parseFloat(yasTrxAmount),
          yasAccount: yasTrxAccount.trim(),
          trxAddress: yasTrxAddress.trim(),
          destination: 'trx',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setYasTrxStep('success');
        setActivePending({ type: 'yas', amountCfa: amtCfa, amountUsd: yasTrxAmountUsd, amountTrx: yasTrxAmountTrx, yasAccount: yasTrxAccount.trim(), trxAddress: yasTrxAddress.trim(), destination: 'trx' });
        addToast('Conversion soumise !', 'success');
        await refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setYasTrxSubmitting(false);
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
  if (activePending && (method === 'choose' || (activePending.type === 'trx' && method !== 'yas-balance' && method !== 'yas-trx') || (activePending.type === 'yas' && method !== 'trx'))) {
    const isTrxPending = activePending.type === 'trx';
    const isYasTrxDestination = activePending.type === 'yas' && activePending.destination === 'trx';
    const pendingBackBtn = (
      <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
        <i className="fas fa-arrow-left text-[0.8rem]"></i>
      </button>
    );

    const pendingTitle = isTrxPending
      ? 'Dépôt en attente'
      : isYasTrxDestination
        ? 'Conversion en cours'
        : 'Dépôt en attente';

    const pendingSubtitle = isTrxPending
      ? 'Votre dépôt est en cours de vérification par l\'administrateur'
      : isYasTrxDestination
        ? 'L\'administrateur convertira votre paiement et enverra les TRX à votre wallet'
        : 'L\'administrateur validera votre paiement sous peu';

    const pendingHeader = isTrxPending ? 'Dépôt TRX en attente' : isYasTrxDestination ? 'Conversion TMoney → TRX' : 'Dépôt TMoney en attente';
    const pendingIcon = isTrxPending ? 'fa-clock' : isYasTrxDestination ? 'fa-exchange-alt' : 'fa-mobile-alt';
    const pendingColor = isTrxPending ? '#6366F1' : isYasTrxDestination ? '#F59E0B' : '#22C55E';

    return (
      <>
        <Header title={pendingTitle} icon="fa-clock" iconColor={pendingColor} leftElement={pendingBackBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: pendingColor }}>
                <i className={`fas ${pendingIcon} text-[#050506] text-[1.2rem]`}></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">
                  {pendingHeader}
                </h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">
                  {pendingSubtitle}
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
                <>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Compte Yas</span>
                    <span className="text-[0.78rem] font-bold text-[#1F2937]">{esc(activePending.yasAccount)}</span>
                  </div>
                  {activePending.destination === 'trx' && activePending.trxAddress && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX</span>
                      <span className="text-[0.72rem] font-mono font-bold text-[#1F2937] max-w-[180px] truncate">{esc(activePending.trxAddress)}</span>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Statut</span>
                <span className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${pendingColor}1F`, color: pendingColor }}>
                  {isYasTrxDestination ? 'Conversion en cours' : 'En attente'}
                </span>
              </div>
            </div>

            {/* Info message */}
            <div className="rounded-xl p-3 mb-3 border" style={{ backgroundColor: `${pendingColor}14`, borderColor: `${pendingColor}26` }}>
              <div className="flex items-start gap-2">
                <i className="fas fa-info-circle text-[0.8rem] mt-0.5" style={{ color: pendingColor }}></i>
                <p className="text-[0.7rem] text-[rgba(0,0,0,0.65)] leading-relaxed">
                  {isYasTrxDestination
                    ? 'Votre solde TRX sera bientôt crédité. L\'administrateur convertira votre paiement et enverra les TRX à votre wallet.'
                    : isTrxPending
                      ? 'Vous ne pouvez pas faire de nouveau dépôt tant que celui-ci n\'est pas confirmé. Cela peut prendre quelques minutes.'
                      : 'Vous ne pouvez pas faire de nouveau dépôt tant que celui-ci n\'est pas validé. L\'administrateur traitera votre demande.'
                  }
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

              {/* Option 1: TMoney → Compte principal */}
              <button
                onClick={() => { setMethod('yas-balance'); setYasBalanceStep('amount'); }}
                className="w-full text-left rounded-2xl p-5 mb-3 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-mobile-alt text-[#22C55E] text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Dépôt via TMoney (Yas) → Compte principal</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Envoyez de l&apos;argent via TMoney au numéro Yas de l&apos;admin. Le montant sera crédité sur votre solde principal après validation.</p>
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

              {/* Option 2: TMoney → Compte TRX */}
              <button
                onClick={() => { setMethod('yas-trx'); setYasTrxStep('amount'); }}
                className="w-full text-left rounded-2xl p-5 mb-3 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(245,158,11,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-exchange-alt text-[#F59E0B] text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Dépôt via TMoney (Yas) → Compte TRX</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Envoyez de l&apos;argent via TMoney. L&apos;admin le convertit en TRX et l&apos;envoie à votre wallet TRX.</p>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#F59E0B] bg-[rgba(245,158,11,0.12)] px-2 py-1 rounded-full">
                        <i className="fas fa-coins"></i> Conversion TRX
                      </span>
                      <span className="text-[0.6rem] text-[rgba(0,0,0,0.35)]">Min: 6 000 FCFA</span>
                    </div>
                  </div>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>
                </div>
              </button>

              {/* Option 3: Dépôt direct en TRX */}
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
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Vous avez déjà des TRX ? Envoyez-les directement à l&apos;adresse de l&apos;admin. Confirmation rapide.</p>
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
                  <strong className="text-[#22C55E]">Compte principal</strong> : Déposez via TMoney, l&apos;admin crédite votre solde principal.<br />
                  <strong className="text-[#F59E0B]">Compte TRX</strong> : Déposez via TMoney, l&apos;admin convertit et envoie les TRX à votre wallet.<br />
                  <strong className="text-[#6366F1]">Dépôt TRX</strong> : Vous avez déjà des TRX, envoyez-les directement.
                </p>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // ===================== TRX DIRECT DEPOSIT FLOW =====================
  if (method === 'trx') {
    return (
      <>
        <Header title="Dépôt direct en TRX" icon="fa-arrow-down" iconColor="#6366F1" leftElement={backBtn} />
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

              {/* TRX Guide */}
              {trxStep === 'amount' && (
                <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-[#6366F1] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                  <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-1.5">
                    <i className="fas fa-book-open mr-1 text-[#6366F1]"></i> Guide - Dépôt TRX
                  </h4>
                  <ol className="space-y-1 text-[0.68rem] text-[rgba(0,0,0,0.55)]">
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">1</span><span>Entrez le montant en dollars</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">2</span><span>Envoyez les TRX à l&apos;adresse de l&apos;admin</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">3</span><span>Entrez votre adresse TRX pour confirmer</span></li>
                    <li className="flex items-start gap-1.5"><span className="w-4 h-4 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.5rem] font-bold shrink-0 mt-0.5">4</span><span>Attendez la confirmation de l&apos;admin</span></li>
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
                    className="w-full py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <div className="text-[0.72rem] font-mono text-[#6366F1] break-all leading-relaxed">
                        {esc(adminAddress)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyAddress(adminAddress, setCopied)}
                      className={`w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        copied ? 'bg-[#6366F1] text-white' : 'bg-[rgba(99,102,241,0.12)] text-[#6366F1]'
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
                        <div className="text-[1.3rem] font-black text-[#6366F1]">{trxCalculatedAmountTrx.toFixed(2)}</div>
                      </div>
                      <div className="bg-[#F3F4F6] rounded-xl p-3 text-center border border-[rgba(0,0,0,0.08)]">
                        <div className="text-[0.6rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold mb-1">USD</div>
                        <div className="text-[1.3rem] font-black text-[#4ADE80]">{parseFloat(depositAmt).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

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
                      disabled={submitting || !userAddress.trim()}
                      className="flex-[2] py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                  <div className="w-20 h-20 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-4">
                    <div className="w-14 h-14 rounded-full bg-[#6366F1] flex items-center justify-center">
                      <i className="fas fa-check text-white text-[1.5rem]"></i>
                    </div>
                  </div>
                  <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Dépôt soumis !</h3>
                  <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-6 max-w-[280px] mx-auto">
                    Votre dépôt de <strong className="text-[#6366F1]">{formatMoney(parseFloat(depositAmt))}</strong> est en attente de confirmation par l&apos;administrateur.
                  </p>
                  <div className="bg-[#FFFFFF] rounded-xl p-4 mb-6 max-w-[280px] mx-auto border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#6366F1]" style={{ animation: 'pulse 1.5s infinite' }} />
                      <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de confirmation...</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPage('wallet')}
                    className="w-full py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer"
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

  // ===================== YAS → COMPTE PRINCIPAL FLOW =====================
  if (method === 'yas-balance') {
    const yasAccountError = yasAccount ? validateYasAccount(yasAccount) : null;
    const yasTransferSyntax = adminYasAccount && yasAmountCfa >= 6000
      ? `*145*1*${Math.round(yasAmountCfa)}*${adminYasAccount}*2#`
      : '';

    return (
      <>
        <Header title="TMoney → Compte principal" icon="fa-mobile-alt" iconColor="#22C55E" leftElement={backBtn} />
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
                  const currentIdx = stepOrder.indexOf(yasBalanceStep);
                  const thisIdx = stepOrder.indexOf(st.s as YasStep);
                  const isActive = yasBalanceStep === st.s;
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

              {/* ===================== STEP 1: AMOUNT (CFA) ===================== */}
              {yasBalanceStep === 'amount' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Montant en FCFA</h3>
                    <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Entrez le montant en CFA que vous souhaitez déposer. Minimum 6 000 FCFA.</p>

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
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent TRX</span>
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

                  <button
                    onClick={() => {
                      if (!yasAmountCfa || yasAmountCfa < 6000) { addToast('Minimum 6 000 FCFA', 'error'); return; }
                      setYasBalanceStep('guide');
                    }}
                    disabled={!yasAmount || parseFloat(yasAmount) < 6000}
                    className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}

              {/* ===================== STEP 2: GUIDE TRANSFERT YAS ===================== */}
              {yasBalanceStep === 'guide' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)] relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(34,197,94,0.1),transparent_60%)]" />
                    <div className="relative z-[1]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center border border-[rgba(34,197,94,0.15)]">
                          <i className="fas fa-mobile-alt text-[#22C55E] text-[0.9rem]"></i>
                        </div>
                        <div>
                          <h3 className="text-[0.95rem] font-bold text-[#1F2937]">Comment envoyer via TMoney</h3>
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
                      <i className="fas fa-code mr-1 text-[#22C55E]"></i> Code d&apos;envoi
                    </h4>
                    <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                      <div className="text-[0.78rem] font-mono font-bold text-[#22C55E] text-center tracking-wide">
                        {yasAmountCfa >= 6000 && adminYasAccount
                          ? `*145*1*${Math.round(yasAmountCfa)}*${adminYasAccount}*2#`
                          : `*145*1*(montant)*${adminYasAccount || 'XXXXXXXX'}*2#`
                        }
                      </div>
                    </div>
                    {yasAmountCfa >= 6000 ? (
                      <p className="text-[0.65rem] text-[#22C55E] mt-2 text-center font-semibold">
                        <i className="fas fa-check-circle mr-1"></i> Montant de {Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA inclus automatiquement
                      </p>
                    ) : (
                      <p className="text-[0.65rem] text-[rgba(0,0,0,0.45)] mt-2 text-center">
                        Le montant sera rempli automatiquement à l&apos;étape suivante
                      </p>
                    )}
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#22C55E] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-exclamation-triangle text-[#22C55E] text-[0.8rem] mt-0.5"></i>
                      <div>
                        <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-1">Important</h4>
                        <p className="text-[0.68rem] text-[rgba(0,0,0,0.55)] leading-relaxed">
                          Après l&apos;envoi, l&apos;administrateur validera votre paiement et créditera votre compte principal.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setYasBalanceStep('amount')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button onClick={() => setYasBalanceStep('info')} className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer">
                      J&apos;ai compris, continuer <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== STEP 3: NUMÉRO YAS ===================== */}
              {yasBalanceStep === 'info' && (
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

                  <div className="flex gap-2">
                    <button onClick={() => setYasBalanceStep('guide')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={() => {
                        if (!yasAccount.trim()) { addToast('Entrez votre numéro Yas', 'error'); return; }
                        if (yasAccountError) { addToast(yasAccountError, 'error'); return; }
                        setYasBalanceStep('confirm');
                      }}
                      disabled={!yasAccount.trim() || !!yasAccountError}
                      className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuer <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== STEP 4: CONFIRMATION ===================== */}
              {yasBalanceStep === 'confirm' && (
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
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">TRX équivalent</span>
                        <span className="text-[0.88rem] font-bold text-[#22C55E]">{yasAmountTrx.toFixed(2)} TRX</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Votre numéro Yas</span>
                        <span className="text-[0.82rem] font-bold text-[#1F2937]">{esc(yasAccount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Destination</span>
                        <span className="text-[0.78rem] font-bold text-[#22C55E]">Compte principal</span>
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
                          {yasTransferSyntax || '*145*1*...*...*2#'}
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
                    <button onClick={() => setYasBalanceStep('info')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={handleYasBalanceSubmit}
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

              {/* ===================== STEP 5: SUCCESS ===================== */}
              {yasBalanceStep === 'success' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="text-center py-4">
                    <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
                      <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center">
                        <i className="fas fa-check text-[#050506] text-[1.5rem]"></i>
                      </div>
                    </div>
                    <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Dépôt soumis !</h3>
                    <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[300px] mx-auto">
                      Votre dépôt de <strong className="text-[#22C55E]">{Math.round(yasAmountCfa).toLocaleString('fr-FR')} FCFA</strong> a été envoyé. L&apos;administrateur validera votre paiement sous peu.
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
                      <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de validation par l&apos;admin...</span>
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

  // ===================== YAS → COMPTE TRX FLOW =====================
  if (method === 'yas-trx') {
    const yasTrxAccountError = yasTrxAccount ? validateYasAccount(yasTrxAccount) : null;
    const yasTrxAddressError = yasTrxAddress ? validateTrxAddress(yasTrxAddress) : null;
    const yasTrxTransferSyntax = adminYasAccount && yasTrxAmountCfa >= 6000
      ? `*145*1*${Math.round(yasTrxAmountCfa)}*${adminYasAccount}*2#`
      : '';

    return (
      <>
        <Header title="TMoney → Compte TRX" icon="fa-exchange-alt" iconColor="#F59E0B" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-[3px] border-[#E5E7EB] border-t-[#F59E0B] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div className="flex items-center justify-center gap-1.5 mb-6">
                {[
                  { s: 'amount', label: '1' },
                  { s: 'trustwallet', label: '2' },
                  { s: 'info', label: '3' },
                  { s: 'confirm', label: '4' },
                  { s: 'success', label: '5' },
                ].map((st, i) => {
                  const stepOrder: YasTrxStep[] = ['amount', 'trustwallet', 'info', 'confirm', 'success'];
                  const currentIdx = stepOrder.indexOf(yasTrxStep);
                  const thisIdx = stepOrder.indexOf(st.s as YasTrxStep);
                  const isActive = yasTrxStep === st.s;
                  const isDone = currentIdx > thisIdx;
                  return (
                    <div key={st.s} className="flex items-center gap-1">
                      {i > 0 && <div className={`w-3 h-[2px] rounded ${isDone ? 'bg-[#F59E0B]' : 'bg-[rgba(0,0,0,0.06)]'}`} />}
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${
                        isActive ? 'bg-[#F59E0B] text-white' : isDone ? 'bg-[#F59E0B] text-white' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.35)]'
                      }`}>
                        {isDone ? <i className="fas fa-check text-[0.5rem]" /> : st.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===================== STEP 1: AMOUNT (CFA) ===================== */}
              {yasTrxStep === 'amount' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Montant en FCFA</h3>
                    <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Entrez le montant en CFA que vous souhaitez convertir en TRX. Minimum 6 000 FCFA.</p>

                    <div className="relative mb-3">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[0.85rem] font-bold text-[rgba(0,0,0,0.35)]">FCFA</span>
                      <input
                        type="number"
                        step="1"
                        min="6000"
                        value={yasTrxAmount}
                        onChange={(e) => setYasTrxAmount(e.target.value)}
                        placeholder="0"
                        className="w-full py-4 pl-[4.5rem] pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#F59E0B] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                      />
                    </div>

                    {yasTrxAmountCfa >= 6000 && (
                      <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant CFA</span>
                          <span className="text-[0.95rem] font-black text-[#1F2937]">{Math.round(yasTrxAmountCfa).toLocaleString('fr-FR')} FCFA</span>
                        </div>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent USD</span>
                          <span className="text-[0.95rem] font-black text-[#4ADE80]">{yasTrxAmountUsd.toFixed(2)} $</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                          <span className="text-[1rem] font-black text-[#F59E0B]">{yasTrxAmountTrx.toFixed(2)} TRX</span>
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
                          onClick={() => setYasTrxAmount(String(amt))}
                          className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${
                            yasTrxAmount === String(amt)
                              ? 'bg-[#F59E0B] text-white'
                              : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'
                          }`}
                        >
                          {amt.toLocaleString('fr-FR')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!yasTrxAmountCfa || yasTrxAmountCfa < 6000) { addToast('Minimum 6 000 FCFA', 'error'); return; }
                      setYasTrxStep('trustwallet');
                    }}
                    disabled={!yasTrxAmount || parseFloat(yasTrxAmount) < 6000}
                    className="w-full py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continuer <i className="fas fa-arrow-right ml-2"></i>
                  </button>
                </div>
              )}

              {/* ===================== STEP 2: TRUST WALLET GUIDE ===================== */}
              {yasTrxStep === 'trustwallet' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border-[2px] border-[#F59E0B] relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(245,158,11,0.1),transparent_60%)]" />
                    <div className="relative z-[1]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-[#F59E0B] flex items-center justify-center border border-[rgba(245,158,11,0.3)]">
                          <i className="fas fa-shield-alt text-white text-[1.1rem]"></i>
                        </div>
                        <div>
                          <h3 className="text-[0.95rem] font-bold text-[#1F2937]">Portefeuille TRX requis</h3>
                          <p className="text-[0.65rem] text-[rgba(0,0,0,0.45)]">Vous avez besoin d&apos;un wallet TRX pour recevoir vos fonds</p>
                        </div>
                      </div>

                      <div className="bg-[rgba(245,158,11,0.08)] rounded-xl p-4 mb-4 border border-[rgba(245,158,11,0.15)]">
                        <p className="text-[0.78rem] text-[rgba(0,0,0,0.65)] leading-relaxed">
                          Pour utiliser cette option, vous devez disposer d&apos;un portefeuille TRX. Téléchargez <strong className="text-[#F59E0B]">Trust Wallet</strong> depuis le Play Store ou l&apos;App Store, puis créez votre compte TRX (Tron).
                        </p>
                      </div>

                      <h4 className="text-[0.82rem] font-bold text-[#1F2937] mb-2">
                        <i className="fas fa-download mr-1 text-[#F59E0B]"></i> Télécharger Trust Wallet
                      </h4>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <a
                          href="https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)] no-underline active:scale-[0.97] transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#34A853] flex items-center justify-center shrink-0">
                            <i className="fab fa-google-play text-white text-[0.9rem]"></i>
                          </div>
                          <div>
                            <div className="text-[0.65rem] text-[rgba(0,0,0,0.45)] uppercase font-semibold">GET IT ON</div>
                            <div className="text-[0.82rem] font-bold text-[#1F2937]">Google Play</div>
                          </div>
                        </a>
                        <a
                          href="https://apps.apple.com/app/trust-wallet-crypto-bitcoin/id1288339409"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2.5 bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)] no-underline active:scale-[0.97] transition-all"
                        >
                          <div className="w-10 h-10 rounded-lg bg-[#1F2937] flex items-center justify-center shrink-0">
                            <i className="fab fa-apple text-white text-[1.1rem]"></i>
                          </div>
                          <div>
                            <div className="text-[0.65rem] text-[rgba(0,0,0,0.45)] uppercase font-semibold">Download on</div>
                            <div className="text-[0.82rem] font-bold text-[#1F2937]">App Store</div>
                          </div>
                        </a>
                      </div>

                      <h4 className="text-[0.82rem] font-bold text-[#1F2937] mb-2">
                        <i className="fas fa-list-ol mr-1 text-[#F59E0B]"></i> Étapes à suivre
                      </h4>
                      <ol className="space-y-2">
                        {[
                          { icon: 'fa-download', text: 'Téléchargez Trust Wallet sur votre téléphone' },
                          { icon: 'fa-user-plus', text: 'Créez votre compte et sécurisez votre phrase de récupération' },
                          { icon: 'fa-coins', text: 'Ajoutez le token TRX (Tron) à votre portefeuille' },
                          { icon: 'fa-key', text: 'Copiez votre adresse TRX (commence par T...)' },
                        ].map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 bg-[rgba(245,158,11,0.12)]">
                              <i className={`fas ${step.icon} text-[0.55rem] text-[#F59E0B]`}></i>
                            </div>
                            <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed">{step.text}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#F59E0B] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                    <div className="flex items-start gap-2">
                      <i className="fas fa-exclamation-triangle text-[#F59E0B] text-[0.8rem] mt-0.5"></i>
                      <div>
                        <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-1">Important</h4>
                        <p className="text-[0.68rem] text-[rgba(0,0,0,0.55)] leading-relaxed">
                          L&apos;admin convertira votre paiement et enverra les TRX directement à votre wallet. Assurez-vous d&apos;avoir une adresse TRX valide.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setYasTrxStep('amount')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button onClick={() => setYasTrxStep('info')} className="flex-[2] py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer">
                      J&apos;ai un wallet TRX <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== STEP 3: NUMÉRO YAS + ADRESSE TRX ===================== */}
              {yasTrxStep === 'info' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(245,158,11,0.12)] flex items-center justify-center shrink-0">
                        <i className="fas fa-phone text-[#F59E0B] text-[0.8rem]"></i>
                      </div>
                      <div>
                        <h3 className="text-[0.95rem] font-bold text-[#1F2937]">Votre numéro Yas</h3>
                        <p className="text-[0.68rem] text-[rgba(0,0,0,0.55)]">Le numéro depuis lequel vous allez envoyer l&apos;argent</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={yasTrxAccount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
                        setYasTrxAccount(val);
                      }}
                      placeholder="Ex: 90123456"
                      className={`w-full py-3.5 px-4 bg-[#F3F4F6] border-[1.5px] rounded-xl text-[0.95rem] font-mono outline-none text-gray-900 placeholder:text-[rgba(0,0,0,0.3)] ${
                        yasTrxAccount && yasTrxAccountError ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[rgba(0,0,0,0.08)] focus:border-[#F59E0B]'
                      }`}
                      maxLength={8}
                    />
                    {yasTrxAccount && yasTrxAccountError && (
                      <p className="text-[0.68rem] text-[#EF4444] mt-1.5 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-[0.6rem]"></i>
                        {yasTrxAccountError}
                      </p>
                    )}
                    {yasTrxAccount && !yasTrxAccountError && (
                      <p className="text-[0.68rem] text-[#F59E0B] mt-1.5 flex items-center gap-1">
                        <i className="fas fa-check-circle text-[0.6rem]"></i>
                        Numéro valide
                      </p>
                    )}
                  </div>

                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0">
                        <i className="fas fa-key text-[#6366F1] text-[0.8rem]"></i>
                      </div>
                      <div>
                        <h3 className="text-[0.95rem] font-bold text-[#1F2937]">Votre adresse TRX</h3>
                        <p className="text-[0.68rem] text-[rgba(0,0,0,0.55)]">L&apos;adresse de votre wallet TRX où recevoir les fonds</p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={yasTrxAddress}
                      onChange={(e) => setYasTrxAddress(e.target.value)}
                      placeholder="T... (votre adresse TRX)"
                      className={`w-full py-3.5 px-4 bg-[#F3F4F6] border-[1.5px] rounded-xl text-[0.85rem] font-mono outline-none text-gray-900 placeholder:text-[rgba(0,0,0,0.3)] ${
                        yasTrxAddress && yasTrxAddressError ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[rgba(0,0,0,0.08)] focus:border-[#6366F1]'
                      }`}
                    />
                    {yasTrxAddress && yasTrxAddressError && (
                      <p className="text-[0.68rem] text-[#EF4444] mt-1.5 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-[0.6rem]"></i>
                        {yasTrxAddressError}
                      </p>
                    )}
                    {yasTrxAddress && !yasTrxAddressError && (
                      <p className="text-[0.68rem] text-[#6366F1] mt-1.5 flex items-center gap-1">
                        <i className="fas fa-check-circle text-[0.6rem]"></i>
                        Adresse TRX valide
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setYasTrxStep('trustwallet')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={() => {
                        if (!yasTrxAccount.trim()) { addToast('Entrez votre numéro Yas', 'error'); return; }
                        if (yasTrxAccountError) { addToast(yasTrxAccountError, 'error'); return; }
                        if (!yasTrxAddress.trim()) { addToast('Entrez votre adresse TRX', 'error'); return; }
                        if (yasTrxAddressError) { addToast(yasTrxAddressError, 'error'); return; }
                        setYasTrxStep('confirm');
                      }}
                      disabled={!yasTrxAccount.trim() || !!yasTrxAccountError || !yasTrxAddress.trim() || !!yasTrxAddressError}
                      className="flex-[2] py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continuer <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                  </div>
                </div>
              )}

              {/* ===================== STEP 4: CONFIRMATION ===================== */}
              {yasTrxStep === 'confirm' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.82rem] font-bold text-[#1F2937] mb-2">Récapitulatif</h4>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant CFA</span>
                        <span className="text-[0.88rem] font-bold text-[#1F2937]">{Math.round(yasTrxAmountCfa).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent USD</span>
                        <span className="text-[0.88rem] font-bold text-[#4ADE80]">{yasTrxAmountUsd.toFixed(2)} $</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                        <span className="text-[0.88rem] font-bold text-[#F59E0B]">{yasTrxAmountTrx.toFixed(2)} TRX</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Votre numéro Yas</span>
                        <span className="text-[0.82rem] font-bold text-[#1F2937]">{esc(yasTrxAccount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX</span>
                        <span className="text-[0.72rem] font-mono font-bold text-[#6366F1] max-w-[180px] truncate">{esc(yasTrxAddress)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Destination</span>
                        <span className="text-[0.78rem] font-bold text-[#F59E0B]">Compte TRX (Wallet)</span>
                      </div>
                    </div>
                  </div>

                  {/* SYNTAXE D'ENVOI */}
                  <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border-[2px] border-[#F59E0B] relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(245,158,11,0.15),transparent_60%)]" />
                    <div className="relative z-[1]">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center shrink-0">
                          <i className="fas fa-paper-plane text-white text-[0.9rem]"></i>
                        </div>
                        <div>
                          <h3 className="text-[0.95rem] font-black text-[#1F2937]">Code d&apos;envoi Yas</h3>
                          <p className="text-[0.65rem] text-[rgba(0,0,0,0.55)]">Composez ce code sur votre téléphone</p>
                        </div>
                      </div>
                      <div className="bg-[rgba(245,158,11,0.08)] rounded-xl p-4 mb-3 border border-[rgba(245,158,11,0.2)]">
                        <div className="text-[1.2rem] font-mono font-black text-[#F59E0B] text-center tracking-wider break-all">
                          {yasTrxTransferSyntax || '*145*1*...*...*2#'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleCopyAddress(yasTrxTransferSyntax, setYasTrxSyntaxCopied)}
                          className={`py-3 rounded-xl text-[0.78rem] font-bold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                            yasTrxSyntaxCopied ? 'bg-[#F59E0B] text-white' : 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]'
                          }`}
                        >
                          <i className={`fas ${yasTrxSyntaxCopied ? 'fa-check' : 'fa-copy'}`}></i>
                          {yasTrxSyntaxCopied ? 'Copié !' : 'Copier'}
                        </button>
                        {yasTrxTransferSyntax && (
                          <a
                            href={`tel:${yasTrxTransferSyntax}`}
                            className="py-3 rounded-xl text-[0.78rem] font-bold bg-[#F59E0B] text-white no-underline flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                          >
                            <i className="fas fa-phone"></i>
                            Lancer le code
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3.5 mb-4 border-l-[3px] border-l-[#F59E0B] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]">
                    <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-1.5">
                      <i className="fas fa-info-circle mr-1 text-[#F59E0B]"></i> Que faire maintenant ?
                    </h4>
                    <ol className="space-y-1.5 text-[0.68rem] text-[rgba(0,0,0,0.55)]">
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">1</span>
                        <span>Copiez le code ci-dessus</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">2</span>
                        <span>Ouvrez le clavier de votre téléphone et composez le code</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                        <span>Confirmez le transfert</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">4</span>
                        <span>Cliquez sur <strong className="text-[#F59E0B]">Soumettre</strong> ci-dessous pour signaler votre dépôt</span>
                      </li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => setYasTrxStep('info')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                      <i className="fas fa-arrow-left mr-1"></i> Retour
                    </button>
                    <button
                      onClick={handleYasTrxSubmit}
                      disabled={yasTrxSubmitting}
                      className="flex-[2] py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {yasTrxSubmitting ? (
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

              {/* ===================== STEP 5: SUCCESS ===================== */}
              {yasTrxStep === 'success' && (
                <div style={{ animation: 'tIn 0.3s ease-out' }}>
                  <div className="text-center py-4">
                    <div className="w-20 h-20 rounded-full bg-[rgba(245,158,11,0.12)] flex items-center justify-center mx-auto mb-4">
                      <div className="w-14 h-14 rounded-full bg-[#F59E0B] flex items-center justify-center">
                        <i className="fas fa-check text-white text-[1.5rem]"></i>
                      </div>
                    </div>
                    <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Conversion en cours !</h3>
                    <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[300px] mx-auto">
                      Votre demande de conversion de <strong className="text-[#F59E0B]">{Math.round(yasTrxAmountCfa).toLocaleString('fr-FR')} FCFA</strong> a été envoyée. L&apos;administrateur convertira votre paiement et enverra <strong className="text-[#F59E0B]">{yasTrxAmountTrx.toFixed(2)} TRX</strong> à votre wallet.
                    </p>
                  </div>

                  {yasTrxTransferSyntax && (
                    <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border-[2px] border-[#F59E0B]">
                      <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-2">
                        <i className="fas fa-code mr-1 text-[#F59E0B]"></i> Rappel du code d&apos;envoi
                      </h4>
                      <div className="bg-[rgba(245,158,11,0.08)] rounded-xl p-3 mb-2 border border-[rgba(245,158,11,0.2)]">
                        <div className="text-[1rem] font-mono font-black text-[#F59E0B] text-center tracking-wider break-all">
                          {yasTrxTransferSyntax}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        <button
                          onClick={() => handleCopyAddress(yasTrxTransferSyntax, setYasTrxSyntaxCopied)}
                          className={`py-2.5 rounded-xl text-[0.75rem] font-bold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                            yasTrxSyntaxCopied ? 'bg-[#F59E0B] text-white' : 'bg-[rgba(245,158,11,0.12)] text-[#F59E0B]'
                          }`}
                        >
                          <i className={`fas ${yasTrxSyntaxCopied ? 'fa-check' : 'fa-copy'}`}></i>
                          {yasTrxSyntaxCopied ? 'Copié !' : 'Copier'}
                        </button>
                        <a
                          href={`tel:${yasTrxTransferSyntax}`}
                          className="py-2.5 rounded-xl text-[0.75rem] font-bold bg-[#F59E0B] text-white no-underline flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                        >
                          <i className="fas fa-phone"></i>
                          Lancer le code
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="bg-[#FFFFFF] rounded-xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" style={{ animation: 'pulse 1.5s infinite' }} />
                      <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">Votre solde TRX sera bientôt crédité...</span>
                    </div>
                  </div>
                  <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer">
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
