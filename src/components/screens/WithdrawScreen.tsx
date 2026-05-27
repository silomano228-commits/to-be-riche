'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

type Method = 'choose' | 'trx' | 'yas';
type TrxStep = 'form' | 'success';
type YasStep = 'amount' | 'info' | 'success';

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

  // TRX withdrawal state
  const [trxStep, setTrxStep] = useState<TrxStep>('form');
  const [trxAmount, setTrxAmount] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [trxSubmitting, setTrxSubmitting] = useState(false);

  // YAS withdrawal state
  const [yasStep, setYasStep] = useState<YasStep>('amount');
  const [yasAmount, setYasAmount] = useState('');
  const [yasAccount, setYasAccount] = useState('');
  const [yasSubmitting, setYasSubmitting] = useState(false);

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
        const res = await authFetch('/api/withdrawal/yas');
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.cfaUsdRate) setCfaUsdRate(data.data.cfaUsdRate);
        }
      } catch { /* */ }

      try {
        const res = await authFetch('/api/deposit/trx');
        const data = await res.json();
        if (data.success) {
          setTrxPrice(data.data.trxPrice || 0.12);
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

  // YAS withdrawal submit
  const handleYasSubmit = async () => {
    const amt = parseFloat(yasAmount);
    if (!amt || amt < 5) { addToast('Minimum 5 $', 'error'); return; }
    const yasErr = validateYasAccount(yasAccount);
    if (yasErr) { addToast(yasErr, 'error'); return; }
    setYasSubmitting(true);
    try {
      const res = await authFetch('/api/withdrawal/yas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd: amt, yasAccount: yasAccount.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setYasStep('success');
        addToast('Retrait soumis !', 'success');
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

  const walletBackBtn = (
    <button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
      <i className="fas fa-arrow-left text-[0.8rem]"></i>
    </button>
  );

  // ===================== PENDING WITHDRAWAL =====================
  if (pendingWithdrawal) {
    const isYas = pendingWithdrawal.type === 'yas';
    const badgeColor = isYas ? '#22C55E' : '#6366F1';
    const badgeText = isYas ? 'TMoney (Yas)' : 'TRX';

    return (
      <>
        <Header title="Retrait en attente" icon="fa-clock" iconColor={badgeColor} leftElement={walletBackBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${badgeColor}1F` }}>
                <i className={`fas ${isYas ? 'fa-mobile-alt' : 'fa-clock'} text-[1.2rem]`} style={{ color: badgeColor }}></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">
                  Retrait {badgeText} en attente
                </h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">
                  Votre demande est en cours de traitement par notre équipe
                </p>
              </div>
            </div>
            <div className="bg-[#F3F4F6] rounded-xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{formatMoney(pendingWithdrawal.amount)}</span>
              </div>
              {isYas && pendingWithdrawal.amountCfa > 0 && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant FCFA</span>
                  <span className="text-[0.88rem] font-bold text-[#22C55E]">{(pendingWithdrawal.amountCfa).toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              {!isYas && pendingWithdrawal.trxAddress && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX</span>
                  <span className="text-[0.72rem] font-mono font-bold text-[rgba(0,0,0,0.7)] max-w-[180px] truncate">{esc(pendingWithdrawal.trxAddress)}</span>
                </div>
              )}
              {isYas && pendingWithdrawal.yasAccount && (
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Numéro Yas</span>
                  <span className="text-[0.82rem] font-bold text-[#22C55E]">{esc(pendingWithdrawal.yasAccount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Statut</span>
                <span className="text-[0.72rem] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${badgeColor}1F`, color: badgeColor }}>
                  En attente
                </span>
              </div>
            </div>
            <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] text-center">
              <i className="fas fa-info-circle mr-1"></i>
              Veuillez patienter, notre équipe traitera votre demande.
            </p>
          </div>
          <button onClick={() => setPage('wallet')} className="w-full py-3.5 rounded-xl text-white font-bold text-[0.88rem] border-none cursor-pointer" style={{ backgroundColor: badgeColor }}>
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
                className="w-full text-left rounded-2xl p-5 mb-3 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(99,102,241,0.3)] active:scale-[0.98] transition-all cursor-pointer"
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

              {/* YAS Withdrawal Card */}
              <button
                onClick={() => { setMethod('yas'); setYasStep('amount'); }}
                className="w-full text-left rounded-2xl p-5 mb-5 border border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98] transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-mobile-alt text-[#22C55E] text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Retrait via TMoney (Yas)</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Recevez vos fonds en FCFA sur votre compte Yas du Togo.</p>
                    <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
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
                  Si vous voulez recevoir en FCFA sur Yas, choisissez <strong className="text-[#22C55E]">Retrait via TMoney</strong>.
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
                  Votre wallet TRX sera bientôt crédité.
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
    const trxAmountTrx = trxPrice > 0 && parseFloat(trxAmount) > 0 ? Math.round((parseFloat(trxAmount) / trxPrice) * 100) / 100 : 0;

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

            {parseFloat(trxAmount) >= 5 && (
              <div className="bg-[#F3F4F6] rounded-xl p-3 mb-3 border border-[rgba(0,0,0,0.08)]">
                <div className="flex justify-between items-center">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent TRX</span>
                  <span className="text-[0.95rem] font-black text-[#6366F1]">{trxAmountTrx.toFixed(2)} TRX</span>
                </div>
              </div>
            )}

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

  // ===================== YAS WITHDRAWAL =====================
  if (method === 'yas') {
    const yasAmountUsd = parseFloat(yasAmount) || 0;
    const yasAmountCfa = cfaUsdRate > 0 ? Math.round(yasAmountUsd * cfaUsdRate) : 0;
    const yasAccountError = yasAccount ? validateYasAccount(yasAccount) : null;

    // SUCCESS
    if (yasStep === 'success') {
      return (
        <>
          <Header title="Retrait via TMoney" icon="fa-arrow-up" iconColor="#22C55E" leftElement={walletBackBtn} />
          <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
                <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center">
                  <i className="fas fa-check text-white text-[1.5rem]"></i>
                </div>
              </div>
              <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Retrait soumis !</h3>
              <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[300px] mx-auto">
                Votre retrait de <strong className="text-[#22C55E]">{yasAmountCfa.toLocaleString('fr-FR')} FCFA</strong> ({formatMoney(yasAmountUsd)}) vers {esc(yasAccount)} est en attente.
              </p>
              <div className="bg-[#FFFFFF] rounded-xl p-4 mb-4 max-w-[300px] mx-auto border border-[rgba(0,0,0,0.08)]">
                <p className="text-[0.78rem] text-[rgba(0,0,0,0.65)] font-medium">
                  <i className="fas fa-mobile-alt text-[#22C55E] mr-1"></i>
                  Vous recevrez les FCFA sur votre compte Yas.
                </p>
              </div>
              <div className="bg-[#FFFFFF] rounded-xl p-4 mb-6 max-w-[300px] mx-auto border border-[rgba(0,0,0,0.08)]">
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

    // Step indicator
    const stepOrder: YasStep[] = ['amount', 'info', 'success'];
    const currentIdx = stepOrder.indexOf(yasStep);

    return (
      <>
        <Header title="Retrait via TMoney" icon="fa-arrow-up" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          {/* Balance card */}
          <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-2xl p-5 mb-5 text-white" style={{ boxShadow: '0 8px 24px rgba(34,197,94,0.25)' }}>
            <div className="text-[0.7rem] uppercase font-semibold opacity-80 mb-1">Solde retirable</div>
            <div className="text-[1.8rem] font-black">{formatMoney(user.balance)}</div>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-5">
            {[
              { s: 'amount', label: '1' },
              { s: 'info', label: '2' },
              { s: 'success', label: '3' },
            ].map((st, i) => {
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
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Montant à retirer</h3>
                <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">Entrez le montant en dollars. Minimum 5 $.</p>

                <div className="relative mb-3">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[1rem] font-bold text-[rgba(0,0,0,0.35)]">$</span>
                  <input type="number" step="0.01" min="5" value={yasAmount} onChange={(e) => setYasAmount(e.target.value)} placeholder="0.00" className="w-full py-4 pl-9 pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[1.5rem] font-black outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
                </div>

                {parseFloat(yasAmount) >= 5 && (
                  <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                      <span className="text-[0.95rem] font-black text-[#4ADE80]">{yasAmountUsd.toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                      <span className="text-[1rem] font-black text-[#22C55E]">{yasAmountCfa.toLocaleString('fr-FR')} FCFA</span>
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
                    <button key={amt} onClick={() => setYasAmount(String(amt))} className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${yasAmount === String(amt) ? 'bg-[#22C55E] text-white' : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'}`}>
                      {amt} $
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => { if (!yasAmount || parseFloat(yasAmount) < 5) { addToast('Minimum 5 $', 'error'); return; } setYasStep('info'); }}
                disabled={!yasAmount || parseFloat(yasAmount) < 5}
                className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50"
              >
                Continuer <i className="fas fa-arrow-right ml-2"></i>
              </button>
            </div>
          )}

          {/* ===================== STEP 2: INFO ===================== */}
          {yasStep === 'info' && (
            <div style={{ animation: 'tIn 0.3s ease-out' }}>
              <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-1">Numéro de compte Yas</h3>
                <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)] mb-4">C&apos;est sur ce numéro que vous recevrez les FCFA.</p>

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
                <div className="bg-[#F3F4F6] rounded-xl p-4 border border-[rgba(0,0,0,0.08)]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                    <span className="text-[0.95rem] font-black text-[#4ADE80]">{yasAmountUsd.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                    <span className="text-[1rem] font-black text-[#22C55E]">{yasAmountCfa.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  {yasAccount && !yasAccountError && (
                    <div className="border-t border-[rgba(0,0,0,0.08)] pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Numéro Yas</span>
                        <span className="text-[0.82rem] font-bold text-[#1F2937]">{esc(yasAccount)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setYasStep('amount')}
                  className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none"
                >
                  <i className="fas fa-arrow-left mr-1"></i> Retour
                </button>
                <button
                  onClick={handleYasSubmit}
                  disabled={yasSubmitting || !yasAccount || !!yasAccountError}
                  className="flex-[2] py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {yasSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-arrow-up"></i>
                      Retirer via TMoney
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
