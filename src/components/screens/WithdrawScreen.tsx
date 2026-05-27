'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

type Method = 'choose' | 'trx' | 'convert';
type TrxStep = 'form' | 'success';
type ConvertStep = 'amount' | 'guide' | 'info' | 'confirm' | 'success';

// Yas number validation
function validateYasAccount(account: string): string | null {
  const trimmed = account.trim();
  if (!trimmed) return 'Numéro de compte Yas requis';
  if (!/^\d{8}$/.test(trimmed)) return '8 chiffres requis';
  const prefix = trimmed.substring(0, 2);
  if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
    return 'Commence par 90-93 ou 70-73';
  }
  return null;
}

export default function WithdrawScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [method, setMethod] = useState<Method>('choose');
  const [loading, setLoading] = useState(true);
  const [pendingWithdrawal, setPendingWithdrawal] = useState<any>(null);
  const [cfaUsdRate, setCfaUsdRate] = useState(600);
  const [trxPrice, setTrxPrice] = useState(0.12);
  const [adminTrxAddress, setAdminTrxAddress] = useState('');

  // TRX withdrawal state
  const [trxStep, setTrxStep] = useState<TrxStep>('form');
  const [trxAmount, setTrxAmount] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [trxSubmitting, setTrxSubmitting] = useState(false);

  // TRX → TMoney conversion state
  const [convertStep, setConvertStep] = useState<ConvertStep>('amount');
  const [convertAmountUsd, setConvertAmountUsd] = useState('');
  const [convertTrxAddress, setConvertTrxAddress] = useState('');
  const [convertYasAccount, setConvertYasAccount] = useState('');
  const [convertSubmitting, setConvertSubmitting] = useState(false);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await authFetch('/api/withdrawal');
        const data = await res.json();
        if (data.success && data.data) {
          const pending = data.data.find((w: any) => w.status === 'pending' || w.status === 'approved');
          if (pending) setPendingWithdrawal(pending);
        }
      } catch { /* */ }

      try {
        const res = await authFetch('/api/deposit/trx');
        const data = await res.json();
        if (data.success) {
          setTrxPrice(data.data.trxPrice || 0.12);
          setAdminTrxAddress(data.data.adminAddress || '');
        }
      } catch { /* */ }

      try {
        const res = await authFetch('/api/deposit/yas');
        const data = await res.json();
        if (data.success) {
          if (data.data.cfaUsdRate) setCfaUsdRate(data.data.cfaUsdRate);
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

  // TRX withdrawal submit
  const handleTrxSubmit = async () => {
    const amt = parseFloat(trxAmount);
    if (!amt || amt < 5) { addToast('Minimum 5 $', 'error'); return; }
    if (!trxAddress.trim() || trxAddress.trim().length < 20) { addToast('Adresse TRX invalide', 'error'); return; }
    setTrxSubmitting(true);
    try {
      const res = await authFetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, trxAddress: trxAddress.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTrxStep('success');
        addToast('Retrait soumis !', 'success');
        refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setTrxSubmitting(false);
  };

  // TRX → TMoney conversion submit
  const handleConvertSubmit = async () => {
    const amt = parseFloat(convertAmountUsd);
    if (!amt || amt < 5) { addToast('Minimum 5 $', 'error'); return; }
    if (!convertTrxAddress.trim() || convertTrxAddress.trim().length < 20) { addToast('Adresse TRX invalide', 'error'); return; }
    const yasErr = validateYasAccount(convertYasAccount);
    if (yasErr) { addToast(yasErr, 'error'); return; }
    setConvertSubmitting(true);
    try {
      const res = await authFetch('/api/withdrawal/convert-trx-tmoney', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsd: amt,
          trxAddress: convertTrxAddress.trim(),
          yasAccount: convertYasAccount.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConvertStep('success');
        addToast('Conversion soumise !', 'success');
        refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setConvertSubmitting(false);
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

  // ===================== PENDING WITHDRAWAL =====================
  if (pendingWithdrawal) {
    const isConversion = pendingWithdrawal.type === 'convert_trx_tmoney';
    return (
      <>
        <Header title={isConversion ? 'Conversion en attente' : 'Retrait en attente'} icon="fa-clock" iconColor="#22C55E" leftElement={walletBackBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                <i className={`fas ${isConversion ? 'fa-exchange-alt' : 'fa-clock'} text-[#22C55E] text-[1.2rem]`}></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">
                  {isConversion ? 'Conversion TRX → TMoney en attente' : 'Retrait TRX en attente'}
                </h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">
                  {isConversion 
                    ? 'L\'administrateur va vérifier la réception des TRX et envoyer les FCFA sur votre compte Yas'
                    : 'Votre demande est en cours de traitement par l\'administrateur'
                  }
                </p>
              </div>
            </div>
            <div className="bg-[#F3F4F6] rounded-xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{formatMoney(pendingWithdrawal.amount)}</span>
              </div>
              {isConversion && pendingWithdrawal.amountCfa > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant FCFA</span>
                  <span className="text-[0.88rem] font-bold text-[#F59E0B]">{(pendingWithdrawal.amountCfa).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">{isConversion ? 'Votre adresse TRX' : 'Adresse TRX'}</span>
                <span className="text-[0.72rem] font-mono font-bold text-[rgba(0,0,0,0.7)] max-w-[180px] truncate">{esc(pendingWithdrawal.trxAddress || '')}</span>
              </div>
              {isConversion && pendingWithdrawal.yasAccount && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Numéro Yas</span>
                  <span className="text-[0.82rem] font-bold text-[#1F2937]">{esc(pendingWithdrawal.yasAccount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Statut</span>
                <span className="text-[0.72rem] font-semibold bg-[rgba(34,197,94,0.12)] text-[#22C55E] px-2 py-0.5 rounded-full">En attente</span>
              </div>
            </div>
            <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] text-center">
              <i className="fas fa-info-circle mr-1"></i>
              {isConversion 
                ? 'Envoyez les TRX depuis votre wallet. L\'administrateur vérifiera et vous enverra les FCFA.'
                : 'Veuillez patienter, l\'administrateur traitera votre demande.'
              }
            </p>
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
        <Header title="Retirer" icon="fa-arrow-up" iconColor="#22C55E" leftElement={walletBackBtn} />
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

              <h2 className="text-[1.1rem] font-black text-[#1F2937] mb-1">Choisissez votre méthode</h2>
              <p className="text-[0.78rem] text-[rgba(0,0,0,0.55)] mb-5">Comment souhaitez-vous retirer vos fonds ?</p>

              {/* TRX Withdrawal Card */}
              <button
                onClick={() => { setMethod('trx'); setTrxStep('form'); }}
                className="w-full text-left rounded-2xl p-5 mb-3 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(99,102,241,0.12)] flex items-center justify-center shrink-0">
                    <i className="fab fa-gg-circle text-[#6366F1] text-[1.3rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Retrait vers TRX</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Recevez vos fonds directement sur votre wallet TRX (Trust Wallet).</p>
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#6366F1] bg-[rgba(99,102,241,0.12)] px-2 py-1 rounded-full">
                      <i className="fas fa-bolt"></i> Direct
                    </span>
                  </div>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>
                </div>
              </button>

              {/* TRX → TMoney Conversion Card */}
              <button
                onClick={() => { setMethod('convert'); setConvertStep('amount'); }}
                className="w-full text-left rounded-2xl p-5 mb-5 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(245,158,11,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(245,158,11,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-exchange-alt text-[#F59E0B] text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Conversion TRX → TMoney</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Transformez vos fonds TRX en argent mobile money. Recevez sur votre compte Yas du Togo.</p>
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#F59E0B] bg-[rgba(245,158,11,0.12)] px-2 py-1 rounded-full">
                      <i className="fas fa-mobile-alt"></i> En FCFA
                    </span>
                  </div>
                  <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>
                </div>
              </button>

              {/* Help */}
              <div className="bg-[#FFFFFF] rounded-2xl p-4 border border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-question-circle text-[#22C55E] text-[0.8rem]"></i>
                  </div>
                  <h4 className="text-[0.82rem] font-bold text-[#1F2937]">Aide</h4>
                </div>
                <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] leading-relaxed">
                  Si vous avez un wallet TRX, choisissez <strong className="text-[#6366F1]">Retrait vers TRX</strong>.
                  Si vous voulez recevoir en FCFA sur Yas, choisissez <strong className="text-[#F59E0B]">Conversion TRX → TMoney</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // ===================== TRX WITHDRAWAL =====================
  if (method === 'trx') {
    // SUCCESS
    if (trxStep === 'success') {
      return (
        <>
          <Header title="Retrait vers TRX" icon="fa-arrow-up" iconColor="#6366F1" leftElement={walletBackBtn} />
          <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[rgba(99,102,241,0.12)] flex items-center justify-center mx-auto mb-4">
                <div className="w-14 h-14 rounded-full bg-[#6366F1] flex items-center justify-center">
                  <i className="fas fa-check text-white text-[1.5rem]"></i>
                </div>
              </div>
              <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Retrait soumis !</h3>
              <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[280px] mx-auto">
                Votre retrait de <strong className="text-[#6366F1]">{formatMoney(parseFloat(trxAmount))}</strong> est en attente de confirmation.
              </p>
              <div className="bg-[#FFFFFF] rounded-xl p-4 mb-4 max-w-[280px] mx-auto border border-[rgba(0,0,0,0.08)]">
                <p className="text-[0.78rem] text-[rgba(0,0,0,0.65)] font-medium">
                  <i className="fas fa-wallet text-[#6366F1] mr-1"></i>
                  Votre compte TRX sera bientôt crédité.
                </p>
              </div>
              <div className="bg-[#FFFFFF] rounded-xl p-4 mb-6 max-w-[280px] mx-auto border border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#6366F1]" style={{ animation: 'pulse 1.5s infinite' }} />
                  <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de confirmation...</span>
                </div>
              </div>
              <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer">
                <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
              </button>
            </div>
          </div>
        </>
      );
    }

    // FORM
    return (
      <>
        <Header title="Retrait vers TRX" icon="fa-arrow-up" iconColor="#6366F1" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {/* Balance card */}
          <div className="bg-gradient-to-r from-[#6366F1] to-[#4F46E5] rounded-2xl p-5 mb-5 text-white" style={{ boxShadow: '0 8px 24px rgba(99,102,241,0.25)' }}>
            <div className="text-[0.7rem] uppercase font-semibold opacity-80 mb-1">Solde retirable</div>
            <div className="text-[1.8rem] font-black">{formatMoney(user.balance)}</div>
          </div>

          {/* Auto-guide for Trust Wallet */}
          <div className="bg-[rgba(99,102,241,0.08)] rounded-xl p-3.5 mb-4 border border-[rgba(99,102,241,0.15)]">
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle text-[#6366F1] text-[0.8rem] mt-0.5"></i>
              <p className="text-[0.72rem] text-[rgba(0,0,0,0.65)] leading-relaxed">
                Si vous n&apos;avez pas de portefeuille TRX, téléchargez <strong className="text-[#6366F1]">Trust Wallet</strong> sur le Play Store ou l&apos;App Store et créez un compte avant de continuer.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 mb-4">
            <div className="mb-3">
              <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Montant ($)</label>
              <input type="number" step="0.01" value={trxAmount} onChange={(e) => setTrxAmount(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#6366F1] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[5, 10, 25, 50].map(amt => (
                <button key={amt} onClick={() => setTrxAmount(String(amt))} className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${trxAmount === String(amt) ? 'bg-[#6366F1] text-white' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'}`}>
                  {amt} $
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Adresse TRX (Trust Wallet)</label>
              <input type="text" value={trxAddress} onChange={(e) => setTrxAddress(e.target.value)} placeholder="T..." className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#6366F1] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
            </div>

            <button onClick={handleTrxSubmit} disabled={trxSubmitting || !trxAmount || parseFloat(trxAmount) < 5 || !trxAddress.trim()} className="w-full py-3.5 rounded-xl bg-[#6366F1] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-60">
              {trxSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                  Envoi...
                </span>
              ) : (
                <><i className="fas fa-arrow-up mr-2"></i>Retirer via TRX</>
              )}
            </button>
          </div>
        </div>
      </>
    );
  }

  // ===================== TRX → TMONEY CONVERSION =====================
  if (method === 'convert') {
    const convertAmountCfa = convertAmountUsd && cfaUsdRate > 0 ? Math.round(parseFloat(convertAmountUsd) * cfaUsdRate) : 0;
    const convertAmountTrx = convertAmountUsd && trxPrice > 0 ? Math.round((parseFloat(convertAmountUsd) / trxPrice) * 100) / 100 : 0;
    const yasAccountError = convertYasAccount ? validateYasAccount(convertYasAccount) : null;

    // SUCCESS
    if (convertStep === 'success') {
      return (
        <>
          <Header title="Conversion TRX → TMoney" icon="fa-exchange-alt" iconColor="#F59E0B" leftElement={walletBackBtn} />
          <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[rgba(245,158,11,0.12)] flex items-center justify-center mx-auto mb-4">
                <div className="w-14 h-14 rounded-full bg-[#F59E0B] flex items-center justify-center">
                  <i className="fas fa-check text-white text-[1.5rem]"></i>
                </div>
              </div>
              <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Conversion soumise !</h3>
              <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[300px] mx-auto">
                Envoyez <strong className="text-[#6366F1]">{convertAmountTrx.toFixed(2)} TRX</strong> à l&apos;adresse admin. Vous recevrez <strong className="text-[#F59E0B]">{convertAmountCfa.toLocaleString('fr-FR')} FCFA</strong> sur votre compte Yas.
              </p>
              <div className="bg-[#FFFFFF] rounded-xl p-4 mb-4 max-w-[300px] mx-auto border border-[rgba(0,0,0,0.08)]">
                <p className="text-[0.78rem] text-[rgba(0,0,0,0.65)] font-medium">
                  <i className="fas fa-exchange-alt text-[#F59E0B] mr-1"></i>
                  Après réception des TRX, l&apos;administrateur enverra les FCFA sur votre compte Yas.
                </p>
              </div>
              <div className="bg-[#FFFFFF] rounded-xl p-4 mb-6 max-w-[300px] mx-auto border border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-2 justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B]" style={{ animation: 'pulse 1.5s infinite' }} />
                  <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">En attente de vérification...</span>
                </div>
              </div>
              <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer">
                <i className="fas fa-wallet mr-2"></i>Retour au portefeuille
              </button>
            </div>
          </div>
        </>
      );
    }

    // Step indicator
    const stepOrder: ConvertStep[] = ['amount', 'guide', 'info', 'confirm', 'success'];
    const currentIdx = stepOrder.indexOf(convertStep);

    return (
      <>
        <Header title="Conversion TRX → TMoney" icon="fa-exchange-alt" iconColor="#F59E0B" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-5">
            {['1', '2', '3', '4', '5'].map((label, i) => {
              const thisIdx = i;
              const isActive = currentIdx === i;
              const isDone = currentIdx > i;
              return (
                <div key={label} className="flex items-center gap-1.5">
                  {i > 0 && <div className={`w-4 h-[2px] rounded ${isDone ? 'bg-[#F59E0B]' : 'bg-[rgba(0,0,0,0.06)]'}`} />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.6rem] font-bold ${isActive ? 'bg-[#F59E0B] text-white' : isDone ? 'bg-[#F59E0B] text-white' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.35)]'}`}>
                    {isDone ? <i className="fas fa-check text-[0.5rem]" /> : label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===================== STEP 1: AMOUNT ===================== */}
          {convertStep === 'amount' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Montant à convertir</h3>
                <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Entrez le montant en dollars. Minimum 5 $.</p>

                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[1rem] font-bold text-[rgba(0,0,0,0.35)]">$</span>
                  <input type="number" step="0.01" min="5" value={convertAmountUsd} onChange={(e) => setConvertAmountUsd(e.target.value)} placeholder="0.00" className="w-full py-4 pl-9 pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#F59E0B] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
                </div>

                {parseFloat(convertAmountUsd) >= 5 && (
                  <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                      <span className="text-[0.95rem] font-black text-[#4ADE80]">{parseFloat(convertAmountUsd).toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                      <span className="text-[1rem] font-black text-[#F59E0B]">{convertAmountCfa.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">TRX à envoyer</span>
                      <span className="text-[0.95rem] font-black text-[#6366F1]">{convertAmountTrx.toFixed(2)} TRX</span>
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
                  {[5, 10, 25, 50].map(amt => (
                    <button key={amt} onClick={() => setConvertAmountUsd(String(amt))} className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${convertAmountUsd === String(amt) ? 'bg-[#F59E0B] text-white' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'}`}>
                      {amt} $
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={() => { if (!convertAmountUsd || parseFloat(convertAmountUsd) < 5) { addToast('Minimum 5 $', 'error'); return; } setConvertStep('guide'); }} disabled={!convertAmountUsd || parseFloat(convertAmountUsd) < 5} className="w-full py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50">
                Continuer <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          )}

          {/* ===================== STEP 2: GUIDE ===================== */}
          {convertStep === 'guide' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[rgba(245,158,11,0.08)] rounded-2xl p-5 mb-4 border border-[rgba(245,158,11,0.2)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B] flex items-center justify-center shrink-0">
                    <i className="fas fa-book-open text-white text-[0.9rem]"></i>
                  </div>
                  <div>
                    <h3 className="text-[1rem] font-bold text-[#1F2937]">Guide - Conversion TRX → TMoney</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Suivez ces étapes pour effectuer la conversion</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.6rem] font-bold shrink-0 mt-0.5">1</span>
                      <div>
                        <p className="text-[0.78rem] font-bold text-[#1F2937]">Ouvrez Trust Wallet</p>
                        <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)]">Si vous n&apos;avez pas Trust Wallet, téléchargez-le :</p>
                        <div className="flex gap-2 mt-1.5">
                          <a href="https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp" target="_blank" rel="noopener noreferrer" className="py-1 px-2.5 rounded-lg bg-[rgba(0,0,0,0.06)] text-[0.6rem] font-semibold text-[rgba(0,0,0,0.55)] flex items-center gap-1 no-underline">
                            <i className="fab fa-google-play"></i> Play Store
                          </a>
                          <a href="https://apps.apple.com/app/trust-wallet-crypto-btc/id1288339409" target="_blank" rel="noopener noreferrer" className="py-1 px-2.5 rounded-lg bg-[rgba(0,0,0,0.06)] text-[0.6rem] font-semibold text-[rgba(0,0,0,0.55)] flex items-center gap-1 no-underline">
                            <i className="fab fa-apple"></i> App Store
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.6rem] font-bold shrink-0 mt-0.5">2</span>
                      <div>
                        <p className="text-[0.78rem] font-bold text-[#1F2937]">Envoyez les TRX à l&apos;adresse admin</p>
                        <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)]">Adresse : <span className="font-mono font-bold text-[#6366F1]">{adminTrxAddress ? `${esc(adminTrxAddress.slice(0, 10))}...${esc(adminTrxAddress.slice(-6))}` : 'Non configurée'}</span></p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#FFFFFF] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-[0.6rem] font-bold shrink-0 mt-0.5">3</span>
                      <div>
                        <p className="text-[0.78rem] font-bold text-[#1F2937]">Soumettez votre demande</p>
                        <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)]">Entrez vos informations (adresse TRX, numéro Yas) pour que l&apos;admin puisse vérifier et envoyer les FCFA.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin TRX address display */}
              {adminTrxAddress && (
                <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(99,102,241,0.2)]">
                  <div className="text-[0.68rem] text-[rgba(0,0,0,0.35)] uppercase font-semibold tracking-[1px] mb-2">
                    <i className="fas fa-qrcode mr-1"></i> Adresse TRX de l&apos;administrateur
                  </div>
                  <div className="bg-[#F3F4F6] rounded-xl p-3 mb-2 border border-[rgba(0,0,0,0.08)]">
                    <div className="text-[0.72rem] font-mono text-[#6366F1] break-all leading-relaxed">{esc(adminTrxAddress)}</div>
                  </div>
                  <button onClick={async () => { try { await navigator.clipboard.writeText(adminTrxAddress); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur de copie', 'error'); } }} className="w-full py-2 rounded-lg bg-[rgba(99,102,241,0.12)] text-[#6366F1] text-[0.72rem] font-semibold border-none cursor-pointer">
                    <i className="fas fa-copy mr-1"></i> Copier l&apos;adresse
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setConvertStep('amount')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                  <i className="fas fa-arrow-left mr-1"></i> Retour
                </button>
                <button onClick={() => setConvertStep('info')} className="flex-[2] py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer">
                  Continuer <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          )}

          {/* ===================== STEP 3: INFO ===================== */}
          {convertStep === 'info' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Vos informations</h3>
                <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Renseignez les informations nécessaires pour la conversion.</p>

                <div className="mb-3">
                  <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Votre adresse TRX</label>
                  <input type="text" value={convertTrxAddress} onChange={(e) => setConvertTrxAddress(e.target.value)} placeholder="T... (adresse depuis laquelle vous envoyez)" className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] font-mono outline-none focus:border-[#6366F1] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
                  <p className="text-[0.65rem] text-[rgba(0,0,0,0.45)] mt-1">L&apos;adresse depuis laquelle vous enverrez les TRX</p>
                </div>

                <div className="mb-3">
                  <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Numéro de compte Yas du Togo</label>
                  <input type="tel" value={convertYasAccount} onChange={(e) => setConvertYasAccount(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="90XXXXXX ou 70XXXXXX" className={`w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] rounded-xl text-[0.88rem] outline-none text-gray-900 placeholder:text-[rgba(0,0,0,0.3)] ${yasAccountError ? 'border-[#EF4444] focus:border-[#EF4444]' : 'border-[rgba(0,0,0,0.08)] focus:border-[#F59E0B]'}`} />
                  {yasAccountError && <p className="text-[0.65rem] text-[#EF4444] mt-1">{yasAccountError}</p>}
                  {convertYasAccount && !yasAccountError && <p className="text-[0.65rem] text-[#22C55E] mt-1"><i className="fas fa-check mr-1"></i>Numéro valide</p>}
                  <p className="text-[0.65rem] text-[rgba(0,0,0,0.45)] mt-1">C&apos;est sur ce numéro que vous recevrez les FCFA</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setConvertStep('guide')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                  <i className="fas fa-arrow-left mr-1"></i> Retour
                </button>
                <button onClick={() => {
                  if (!convertTrxAddress.trim() || convertTrxAddress.trim().length < 20) { addToast('Adresse TRX invalide', 'error'); return; }
                  const yasErr = validateYasAccount(convertYasAccount);
                  if (yasErr) { addToast(yasErr, 'error'); return; }
                  setConvertStep('confirm');
                }} disabled={!convertTrxAddress.trim() || convertTrxAddress.trim().length < 20 || !convertYasAccount || !!yasAccountError} className="flex-[2] py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50">
                  Continuer <i className="fas fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          )}

          {/* ===================== STEP 4: CONFIRM ===================== */}
          {convertStep === 'confirm' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Confirmation</h3>
                <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Vérifiez les informations avant de soumettre.</p>

                <div className="bg-[#F3F4F6] rounded-xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                    <span className="text-[0.95rem] font-black text-[#4ADE80]">{parseFloat(convertAmountUsd).toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">TRX à envoyer</span>
                    <span className="text-[0.95rem] font-black text-[#6366F1]">{convertAmountTrx.toFixed(2)} TRX</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                    <span className="text-[1rem] font-black text-[#F59E0B]">{convertAmountCfa.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div className="border-t border-[rgba(0,0,0,0.08)] pt-2 mt-2 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX</span>
                      <span className="text-[0.7rem] font-mono font-bold text-[#6366F1] max-w-[180px] truncate">{esc(convertTrxAddress)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Numéro Yas</span>
                      <span className="text-[0.82rem] font-bold text-[#1F2937]">{esc(convertYasAccount)}</span>
                    </div>
                  </div>
                </div>

                {/* Admin TRX address reminder */}
                {adminTrxAddress && (
                  <div className="bg-[rgba(99,102,241,0.08)] rounded-xl p-3 mb-3 border border-[rgba(99,102,241,0.15)]">
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.45)] uppercase font-semibold mb-1">Envoyez les TRX à :</div>
                    <div className="flex items-center gap-2">
                      <div className="text-[0.72rem] font-mono font-bold text-[#6366F1] break-all flex-1">{esc(adminTrxAddress)}</div>
                      <button onClick={async () => { try { await navigator.clipboard.writeText(adminTrxAddress); addToast('Adresse copiée !', 'success'); } catch { addToast('Erreur', 'error'); } }} className="shrink-0 py-1 px-2 rounded-lg bg-[rgba(99,102,241,0.12)] text-[0.6rem] text-[#6366F1] font-semibold border-none cursor-pointer">
                        <i className="fas fa-copy"></i>
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-[rgba(245,158,11,0.08)] rounded-xl p-3 border border-[rgba(245,158,11,0.15)]">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-info-circle text-[#F59E0B] text-[0.8rem] mt-0.5"></i>
                    <p className="text-[0.7rem] text-[rgba(0,0,0,0.65)] leading-relaxed">
                      Assurez-vous d&apos;avoir envoyé les <strong className="text-[#6366F1]">{convertAmountTrx.toFixed(2)} TRX</strong> à l&apos;adresse admin avant de soumettre. L&apos;administrateur vérifiera la réception puis enverra <strong className="text-[#F59E0B]">{convertAmountCfa.toLocaleString('fr-FR')} FCFA</strong> sur votre compte Yas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setConvertStep('info')} className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none">
                  <i className="fas fa-arrow-left mr-1"></i> Retour
                </button>
                <button onClick={handleConvertSubmit} disabled={convertSubmitting} className="flex-[2] py-3.5 rounded-xl bg-[#F59E0B] text-white font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                  {convertSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                      Envoi...
                    </>
                  ) : (
                    <><i className="fas fa-exchange-alt mr-1"></i> Confirmer la conversion</>
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
