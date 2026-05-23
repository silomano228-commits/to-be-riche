'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch } from '@/lib/store';
import { Header } from '@/components/shared';

type WithdrawMethod = 'choose' | 'trx' | 'yas';
type TrxStep = 'form' | 'success';
type YasStep = 'form' | 'success';

export default function WithdrawScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [method, setMethod] = useState<WithdrawMethod>('choose');
  const [cfaUsdRate, setCfaUsdRate] = useState(600);
  const [loading, setLoading] = useState(true);
  const [pendingTrxWithdrawal, setPendingTrxWithdrawal] = useState<any>(null);
  const [pendingYasWithdrawal, setPendingYasWithdrawal] = useState<any>(null);

  // TRX withdrawal state
  const [trxStep, setTrxStep] = useState<TrxStep>('form');
  const [trxAmount, setTrxAmount] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [trxSubmitting, setTrxSubmitting] = useState(false);

  // YAS withdrawal state
  const [yasStep, setYasStep] = useState<YasStep>('form');
  const [yasAmountUsd, setYasAmountUsd] = useState('');
  const [yasAccount, setYasAccount] = useState('');
  const [yasSubmitting, setYasSubmitting] = useState(false);

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Get YAS config
        const yasRes = await authFetch('/api/withdrawal/yas');
        const yasData = await yasRes.json();
        if (yasData.success) {
          setCfaUsdRate(yasData.data.cfaUsdRate || 600);
          if (yasData.data.pendingYasWithdrawal) {
            setPendingYasWithdrawal(yasData.data.pendingYasWithdrawal);
          }
        }
      } catch { /* */ }

      try {
        // Get pending TRX withdrawals
        const res = await authFetch('/api/withdrawal');
        const data = await res.json();
        if (data.success && data.data) {
          const pendingTrx = data.data.find((w: any) => w.type === 'trx' && (w.status === 'pending' || w.status === 'approved'));
          if (pendingTrx) setPendingTrxWithdrawal(pendingTrx);
        }
      } catch { /* */ }

      setLoading(false);
    };
    loadConfig();
  }, []);

  const refreshUser = async () => {
    try {
      const r = await fetch('/api/auth/session');
      const d = await r.json();
      if (d.success) setUser(d.user);
    } catch { /* */ }
  };

  // YAS number validation
  const validateYasAccount = (account: string): string | null => {
    const trimmed = account.trim();
    if (!trimmed) return 'Numéro Yas requis';
    if (!/^\d{8}$/.test(trimmed)) return '8 chiffres requis';
    const prefix = trimmed.substring(0, 2);
    if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(prefix)) {
      return 'Commence par 90-93 ou 70-73';
    }
    return null;
  };

  // Calculate CFA equivalent
  const yasAmountCfa = yasAmountUsd && cfaUsdRate > 0 ? Math.round(parseFloat(yasAmountUsd) * cfaUsdRate) : 0;

  // TRX submit
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
        addToast('Retrait TRX soumis !', 'success');
        refreshUser();
      } else {
        addToast(data.error, 'error');
      }
    } catch {
      addToast('Erreur réseau', 'error');
    }
    setTrxSubmitting(false);
  };

  // YAS submit
  const handleYasSubmit = async () => {
    const amt = parseFloat(yasAmountUsd);
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
        addToast('Retrait Yas soumis !', 'success');
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

  // ===================== PENDING TRX WITHDRAWAL =====================
  if (pendingTrxWithdrawal && method !== 'yas') {
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
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{formatMoney(pendingTrxWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Adresse TRX</span>
                <span className="text-[0.72rem] font-mono font-bold text-[rgba(0,0,0,0.7)] max-w-[180px] truncate">{esc(pendingTrxWithdrawal.trxAddress || '')}</span>
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

  // ===================== PENDING YAS WITHDRAWAL =====================
  if (pendingYasWithdrawal && method !== 'trx') {
    return (
      <>
        <Header title="Retrait en attente" icon="fa-clock" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-4 border border-[rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                <i className="fas fa-mobile-alt text-[#22C55E] text-[1.2rem]"></i>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-[#1F2937]">Retrait Yas en attente</h3>
                <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">L&apos;administrateur va envoyer les fonds sur votre compte Yas</p>
              </div>
            </div>
            <div className="bg-[#F3F4F6] rounded-xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{formatMoney(pendingYasWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant FCFA</span>
                <span className="text-[0.88rem] font-bold text-[#1F2937]">{(pendingYasWithdrawal.amountCfa || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Numéro Yas</span>
                <span className="text-[0.82rem] font-bold text-[#1F2937]">{esc(pendingYasWithdrawal.yasAccount || '')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Statut</span>
                <span className="text-[0.72rem] font-semibold bg-[rgba(34,197,94,0.12)] text-[#22C55E] px-2 py-0.5 rounded-full">En attente</span>
              </div>
            </div>
            <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] text-center">
              <i className="fas fa-info-circle mr-1"></i>
              Les fonds seront envoyés sur votre compte Yas du Togo. Veuillez patienter.
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
        <Header title="Retirer" icon="fa-arrow-up" iconColor="#22C55E" leftElement={
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
              {/* Balance card */}
              <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-2xl p-5 mb-5 text-white" style={{ boxShadow: '0 8px 24px rgba(34,197,94,0.25)' }}>
                <div className="text-[0.7rem] uppercase font-semibold opacity-80 mb-1">Solde retirable (compte principal)</div>
                <div className="text-[1.8rem] font-black">{formatMoney(user.balance)}</div>
              </div>

              <h2 className="text-[1.1rem] font-black text-[#1F2937] mb-1">Choisissez votre méthode</h2>
              <p className="text-[0.78rem] text-[rgba(0,0,0,0.55)] mb-5">Comment souhaitez-vous retirer vos fonds ?</p>

              {/* TRX Withdrawal Card */}
              <button
                onClick={() => { if (pendingTrxWithdrawal) return; setMethod('trx'); setTrxStep('form'); }}
                disabled={!!pendingTrxWithdrawal}
                className={`w-full text-left rounded-2xl p-5 mb-3 border transition-all ${
                  pendingTrxWithdrawal
                    ? 'border-[rgba(34,197,94,0.2)] bg-[#FFFFFF] opacity-70'
                    : 'border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98]'
                } cursor-pointer`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fab fa-gg-circle text-[#22C55E] text-[1.3rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Retrait via TRX</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Recevez vos fonds directement sur votre wallet TRX (Trust Wallet).</p>
                    {pendingTrxWithdrawal ? (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
                        <i className="fas fa-clock"></i> Retrait en attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
                        <i className="fas fa-bolt"></i> Direct
                      </span>
                    )}
                  </div>
                  {!pendingTrxWithdrawal && <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>}
                </div>
              </button>

              {/* YAS Withdrawal Card */}
              <button
                onClick={() => { if (pendingYasWithdrawal) return; setMethod('yas'); setYasStep('form'); }}
                disabled={!!pendingYasWithdrawal}
                className={`w-full text-left rounded-2xl p-5 mb-5 border transition-all ${
                  pendingYasWithdrawal
                    ? 'border-[rgba(34,197,94,0.2)] bg-[#FFFFFF] opacity-70'
                    : 'border-[rgba(0,0,0,0.08)] bg-[#FFFFFF] hover:border-[rgba(34,197,94,0.3)] active:scale-[0.98]'
                } cursor-pointer`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-mobile-alt text-[#22C55E] text-[1.1rem]"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-bold text-[#1F2937] mb-0.5">Retrait via Yas du Togo</h3>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.55)] leading-relaxed mb-2">Recevez vos fonds directement sur votre compte Yas du Togo en FCFA. Entrez le montant en dollars et on convertit automatiquement.</p>
                    {pendingYasWithdrawal ? (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
                        <i className="fas fa-clock"></i> Retrait en attente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-[#22C55E] bg-[rgba(34,197,94,0.12)] px-2 py-1 rounded-full">
                        <i className="fas fa-hand-holding-usd"></i> En FCFA
                      </span>
                    )}
                  </div>
                  {!pendingYasWithdrawal && <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] mt-3"></i>}
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
                  Si vous avez un wallet TRX, choisissez <strong className="text-[#22C55E]">Retrait via TRX</strong>.
                  Si vous voulez recevoir en FCFA sur Yas, choisissez <strong className="text-[#22C55E]">Retrait via Yas du Togo</strong>.
                </p>
              </div>
            </>
          )}
        </div>
      </>
    );
  }

  // ===================== TRX WITHDRAWAL FORM =====================
  if (method === 'trx') {
    if (trxStep === 'success') {
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
                Votre retrait de <strong className="text-[#22C55E]">{formatMoney(parseFloat(trxAmount))}</strong> est en attente de confirmation par l&apos;administrateur.
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

    return (
      <>
        <Header title="Retrait via TRX" icon="fa-arrow-up" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 mb-4">
            <div className="text-[0.7rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold mb-1">Solde retirable (compte principal)</div>
            <div className="text-[1.5rem] font-black text-[#1F2937] mb-4">{formatMoney(user.balance)}</div>

            <div className="mb-3">
              <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Montant ($)</label>
              <input type="number" step="0.01" value={trxAmount} onChange={(e) => setTrxAmount(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
            </div>

            <div className="mb-4">
              <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Adresse TRX (Trust Wallet)</label>
              <input type="text" value={trxAddress} onChange={(e) => setTrxAddress(e.target.value)} placeholder="T..." className="w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]" />
            </div>

            <button onClick={handleTrxSubmit} disabled={trxSubmitting} className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-60">
              {trxSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
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

  // ===================== YAS WITHDRAWAL FORM =====================
  if (method === 'yas') {
    const yasAccountError = yasAccount ? validateYasAccount(yasAccount) : null;

    if (yasStep === 'success') {
      return (
        <>
          <Header title="Retrait via Yas" icon="fa-arrow-up" iconColor="#22C55E" leftElement={backBtn} />
          <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mx-auto mb-4">
                <div className="w-14 h-14 rounded-full bg-[#22C55E] flex items-center justify-center">
                  <i className="fas fa-check text-[#050506] text-[1.5rem]"></i>
                </div>
              </div>
              <h3 className="text-[1.2rem] font-bold text-[#1F2937] mb-2">Demande envoyée !</h3>
              <p className="text-[0.82rem] text-[rgba(0,0,0,0.55)] mb-4 max-w-[300px] mx-auto">
                Votre retrait de <strong className="text-[#22C55E]">{formatMoney(parseFloat(yasAmountUsd))}</strong> (<strong>{yasAmountCfa.toLocaleString('fr-FR')} FCFA</strong>) est en cours de traitement.
              </p>
              <div className="bg-[#FFFFFF] rounded-2xl p-5 mb-6 max-w-[300px] mx-auto border border-[rgba(0,0,0,0.08)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0">
                    <i className="fas fa-mobile-alt text-[#22C55E] text-[1rem]"></i>
                  </div>
                  <div>
                    <div className="text-[0.78rem] font-bold text-[#1F2937]">Compte Yas</div>
                    <div className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">{esc(yasAccount)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-center pt-3 border-t border-[rgba(0,0,0,0.06)]">
                  <div className="w-2 h-2 rounded-full bg-[#22C55E]" style={{ animation: 'pulse 1.5s infinite' }} />
                  <span className="text-[0.78rem] text-[rgba(0,0,0,0.55)] font-medium">Les fonds arrivent sur votre compte Yas...</span>
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

    return (
      <>
        <Header title="Retrait via Yas" icon="fa-arrow-up" iconColor="#22C55E" leftElement={backBtn} />
        <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
          <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 mb-4">
            <div className="text-[0.7rem] text-[rgba(0,0,0,0.55)] uppercase font-semibold mb-1">Solde retirable (compte principal)</div>
            <div className="text-[1.5rem] font-black text-[#1F2937] mb-4">{formatMoney(user.balance)}</div>

            {/* Amount in USD */}
            <div className="mb-3">
              <label className="block mb-1 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.55)]">Montant en dollars ($)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[0.9rem] font-bold text-[rgba(0,0,0,0.35)]">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={yasAmountUsd}
                  onChange={(e) => setYasAmountUsd(e.target.value)}
                  placeholder="0.00"
                  className="w-full py-3 pl-9 pr-4 bg-[#F3F4F6] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#22C55E] text-gray-900 placeholder:text-[rgba(0,0,0,0.3)]"
                />
              </div>
            </div>

            {/* Conversion preview */}
            {parseFloat(yasAmountUsd) >= 5 && (
              <div className="bg-[#F3F4F6] rounded-xl p-3 mb-3 border border-[rgba(0,0,0,0.08)]">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant USD</span>
                  <span className="text-[0.95rem] font-black text-[#4ADE80]">{parseFloat(yasAmountUsd).toFixed(2)} $</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Vous recevrez</span>
                  <span className="text-[1rem] font-black text-[#22C55E]">{yasAmountCfa.toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[0.6rem] text-[rgba(0,0,0,0.35)]">Taux</span>
                  <span className="text-[0.65rem] text-[rgba(0,0,0,0.45)]">1 $ = {cfaUsdRate} FCFA</span>
                </div>
              </div>
            )}

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[5, 10, 25, 50].map(amt => (
                <button
                  key={amt}
                  onClick={() => setYasAmountUsd(String(amt))}
                  className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${
                    yasAmountUsd === String(amt)
                      ? 'bg-[#22C55E] text-[#050506]'
                      : 'bg-[#F3F4F6] text-[rgba(0,0,0,0.55)]'
                  }`}
                >
                  {amt} $
                </button>
              ))}
            </div>

            {/* YAS phone number */}
            <div className="mb-4">
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

            <button
              onClick={handleYasSubmit}
              disabled={yasSubmitting || !yasAmountUsd || parseFloat(yasAmountUsd) < 5 || !yasAccount || !!yasAccountError}
              className="w-full py-3.5 rounded-xl bg-[#22C55E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-60"
            >
              {yasSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                  Envoi...
                </span>
              ) : (
                <><i className="fas fa-arrow-up mr-2"></i>Retirer via Yas</>
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
                <span>Entrez le montant en dollars — la conversion FCFA est automatique</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">2</span>
                <span>Indiquez votre numéro de compte Yas du Togo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                <span>L&apos;administrateur traitera votre demande et enverra les fonds sur votre compte Yas</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[#22C55E] text-[#050506] flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">4</span>
                <span>Vous recevrez les FCFA sur votre compte Yas — patientez un peu !</span>
              </li>
            </ol>
          </div>
        </div>
      </>
    );
  }

  return null;
}
