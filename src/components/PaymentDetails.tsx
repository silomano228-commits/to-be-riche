'use client';

import { useEffect, useMemo, useState } from 'react';
import { authFetch, esc, formatMoney } from '@/lib/store';
import {
  formatYasUssd,
  validatePaymentAddress,
  validateTrxAddress,
  validateYasAccount,
  type PaymentMethod,
} from '@/lib/payment';

export interface PaymentDetailsProps {
  mode: 'deposit' | 'withdraw';
  /** Amount in USD. For deposit mode it is converted to CFA for the YAS USSD code. */
  amountUsd: number;
  /** Initial selected method (defaults to 'yas'). */
  initialMethod?: PaymentMethod;
  /** Called with the selected method + validated user address when the user confirms. */
  onConfirm: (method: PaymentMethod, userAddress: string) => void;
  /** Cancel handler. */
  onCancel: () => void;
  /** Loading state (disables both action buttons). */
  loading?: boolean;
  /** CTA button text (defaults to mode-aware French label). */
  ctaText?: string;
  /** Optional small title rendered above the method selector. */
  title?: string;
}

interface AdminConfig {
  adminYasAccount: string;
  adminTrxAddress: string;
  cfaUsdRate: number;
  trxPrice: number;
}

const DEFAULT_CONFIG: AdminConfig = {
  adminYasAccount: '',
  adminTrxAddress: '',
  cfaUsdRate: 600,
  trxPrice: 0.12,
};

/**
 * Shared payment-details panel used by EVERY deposit / withdraw flow in the app
 * (video, investment, game, principal account). It mirrors the visual language
 * of `DepositScreen.tsx` so the experience is identical everywhere.
 *
 * Two modes:
 *   - `deposit`: user SENDS money to the admin (YAS USSD code shown, TRX admin
 *     address shown with copy button). User still enters their own address for
 *     verification.
 *   - `withdraw`: user PROVIDES their own address where they want to receive.
 *     No admin address / USSD code is shown.
 */
export default function PaymentDetails({
  mode,
  amountUsd,
  initialMethod = 'yas',
  onConfirm,
  onCancel,
  loading = false,
  ctaText,
  title,
}: PaymentDetailsProps) {
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [userAddress, setUserAddress] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [config, setConfig] = useState<AdminConfig>(DEFAULT_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [copied, setCopied] = useState<null | 'address' | 'ussd'>(null);

  // ---- Load admin config from the deposit endpoints -----------------------
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      let next: AdminConfig = { ...DEFAULT_CONFIG };
      let gotYas = false;
      let gotTrx = false;

      try {
        const res = await authFetch('/api/deposit/yas');
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.adminYasAccount) {
            next.adminYasAccount = data.data.adminYasAccount;
            gotYas = true;
          }
          if (data.data.cfaUsdRate) next.cfaUsdRate = data.data.cfaUsdRate;
          if (data.data.trxPrice) next.trxPrice = data.data.trxPrice;
        }
      } catch { /* ignore */ }

      try {
        const res = await authFetch('/api/deposit/trx');
        const data = await res.json();
        if (data.success && data.data) {
          if (data.data.adminAddress) {
            next.adminTrxAddress = data.data.adminAddress;
            gotTrx = true;
          }
          if (!next.trxPrice && data.data.trxPrice) next.trxPrice = data.data.trxPrice;
        }
      } catch { /* ignore */ }

      // Fallback to admin config (only works for admins — non-admins silently get 401/403)
      if (!gotYas || !gotTrx) {
        try {
          const res = await authFetch('/api/admin/config');
          const data = await res.json();
          if (data.success && data.config) {
            if (!gotYas && data.config.adminYasAccount) next.adminYasAccount = data.config.adminYasAccount;
            if (!gotTrx && data.config.adminTrxAddress) next.adminTrxAddress = data.config.adminTrxAddress;
          }
        } catch { /* ignore */ }
      }

      if (!cancelled) {
        setConfig(next);
        setLoadingConfig(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ---- Derived values ------------------------------------------------------
  const isDeposit = mode === 'deposit';
  const isYas = method === 'yas';
  const accent = isYas ? '#22C55E' : '#6366F1';
  const accentSoft = isYas ? 'rgba(34,197,94,0.12)' : 'rgba(99,102,241,0.12)';
  const accentBorder = isYas ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)';

  const amountCfa = useMemo(
    () => Math.round((amountUsd || 0) * config.cfaUsdRate),
    [amountUsd, config.cfaUsdRate],
  );
  const amountTrx = useMemo(
    () => (config.trxPrice > 0 && amountUsd > 0 ? Math.round((amountUsd / config.trxPrice) * 100) / 100 : 0),
    [amountUsd, config.trxPrice],
  );

  const ussdCode = useMemo(
    () => (config.adminYasAccount ? formatYasUssd(amountCfa, config.adminYasAccount) : ''),
    [amountCfa, config.adminYasAccount],
  );

  // ---- Address validation (live) ------------------------------------------
  const addressError = userAddress ? validatePaymentAddress(method, userAddress) : null;
  const addressValid = !!userAddress && !addressError;

  // For deposit mode + YAS, the user MUST tick the confirmation checkbox first.
  const confirmationRequired = isDeposit && isYas;
  const canConfirm = addressValid && (!confirmationRequired || confirmed) && !loading && !loadingConfig;

  // ---- Helpers -------------------------------------------------------------
  const handleCopy = async (text: string, kind: 'address' | 'ussd') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleConfirmClick = () => {
    if (!canConfirm) return;
    // Final validation gate before delegating to parent
    const err = validatePaymentAddress(method, userAddress);
    if (err) return;
    if (confirmationRequired && !confirmed) return;
    onConfirm(method, userAddress.trim());
  };

  const defaultCta = ctaText ?? (isDeposit ? 'Confirmer le dépôt' : 'Confirmer le retrait');

  // ---- Render --------------------------------------------------------------
  return (
    <div className="w-full max-w-[400px] mx-auto">
      {title && (
        <h3 className="text-[1rem] font-black text-[#1F2937] mb-3">{title}</h3>
      )}

      {/* Amount summary */}
      <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-4 border border-[rgba(0,0,0,0.08)]">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Montant</span>
          <span className="text-[0.95rem] font-black text-[#1F2937]">{formatMoney(amountUsd || 0)}</span>
        </div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent FCFA</span>
          <span className="text-[0.85rem] font-bold text-[#22C55E]">{amountCfa.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[0.72rem] text-[rgba(0,0,0,0.55)]">Équivalent TRX</span>
          <span className="text-[0.85rem] font-bold text-[#6366F1]">{amountTrx.toFixed(2)} TRX</span>
        </div>
      </div>

      {/* Method selector — two cards */}
      <div className="mb-4">
        <p className="text-[0.72rem] font-semibold text-[rgba(0,0,0,0.55)] mb-2 uppercase tracking-wide">
          {isDeposit ? 'Méthode de dépôt' : 'Méthode de retrait'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMethod('yas')}
            className={`rounded-2xl p-4 border-2 transition-all active:scale-[0.98] cursor-pointer flex flex-col items-center gap-1.5 ${
              isYas ? 'bg-[rgba(34,197,94,0.08)]' : 'bg-[#FFFFFF] border-[rgba(0,0,0,0.08)]'
            }`}
            style={isYas ? { borderColor: '#22C55E' } : undefined}
            aria-pressed={isYas}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: isYas ? '#22C55E' : 'rgba(34,197,94,0.12)' }}
            >
              <i className="fas fa-mobile-alt text-[1rem]" style={{ color: isYas ? '#050506' : '#22C55E' }}></i>
            </div>
            <span className={`text-[0.82rem] font-bold ${isYas ? 'text-[#22C55E]' : 'text-[#1F2937]'}`}>YAS</span>
            <span className="text-[0.6rem] text-[rgba(0,0,0,0.45)] text-center leading-tight">Mobile money Togo</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('trx')}
            className={`rounded-2xl p-4 border-2 transition-all active:scale-[0.98] cursor-pointer flex flex-col items-center gap-1.5 ${
              !isYas ? 'bg-[rgba(99,102,241,0.08)]' : 'bg-[#FFFFFF] border-[rgba(0,0,0,0.08)]'
            }`}
            style={!isYas ? { borderColor: '#6366F1' } : undefined}
            aria-pressed={!isYas}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: !isYas ? '#6366F1' : 'rgba(99,102,241,0.12)' }}
            >
              <i className="fab fa-gg-circle text-[1.1rem]" style={{ color: !isYas ? '#FFFFFF' : '#6366F1' }}></i>
            </div>
            <span className={`text-[0.82rem] font-bold ${!isYas ? 'text-[#6366F1]' : 'text-[#1F2937]'}`}>TRX</span>
            <span className="text-[0.6rem] text-[rgba(0,0,0,0.45)] text-center leading-tight">Tron (USDT)</span>
          </button>
        </div>
      </div>

      {loadingConfig ? (
        <div className="flex justify-center py-6 mb-4">
          <div
            className="w-7 h-7 border-[3px] border-[#E5E7EB] rounded-full"
            style={{ borderTopColor: accent, animation: 'spin 0.7s linear infinite' }}
          />
        </div>
      ) : (
        <>
          {/* ============== YAS — DEPOSIT ============== */}
          {isYas && isDeposit && (
            <>
              {/* Admin YAS account */}
              <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
                <div className="text-[0.68rem] text-[rgba(0,0,0,0.35)] uppercase font-semibold tracking-[1px] mb-2">
                  <i className="fas fa-mobile-alt mr-1"></i> Compte Yas destinataire (admin)
                </div>
                {config.adminYasAccount ? (
                  <div className="bg-[#F3F4F6] rounded-xl p-3 border border-[rgba(0,0,0,0.08)]">
                    <div className="text-[0.95rem] font-mono font-bold text-[#22C55E] tracking-wide">
                      {esc(config.adminYasAccount)}
                    </div>
                  </div>
                ) : (
                  <div className="bg-[rgba(239,68,68,0.08)] rounded-xl p-3 border border-[rgba(239,68,68,0.2)] flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-[#EF4444] text-[0.8rem]"></i>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.65)]">Service Yas non configuré. Contactez le support.</p>
                  </div>
                )}
              </div>

              {/* USSD code */}
              {config.adminYasAccount && (
                <div
                  className="bg-[#FFFFFF] rounded-2xl p-4 mb-3 border-l-[3px] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]"
                  style={{ borderLeftColor: '#22C55E' }}
                >
                  <h4 className="text-[0.78rem] font-bold text-[#1F2937] mb-2">
                    <i className="fas fa-info-circle mr-1 text-[#22C55E]"></i> Code USSD Yas
                  </h4>
                  <div className="bg-[#F3F4F6] rounded-lg p-2.5 mb-2 border border-[rgba(0,0,0,0.08)]">
                    <code className="text-[0.85rem] font-mono font-bold text-[#22C55E] break-all">
                      {esc(ussdCode)}
                    </code>
                  </div>
                  <p className="text-[0.62rem] text-[rgba(0,0,0,0.45)] mb-2">
                    <i className="fas fa-info-circle mr-1"></i> Composez ce code sur votre téléphone. Le <strong>2</strong> confirme le transfert.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(ussdCode, 'ussd')}
                      className={`flex-1 py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        copied === 'ussd' ? 'bg-[#22C55E] text-white' : 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'
                      }`}
                    >
                      <i className={`fas ${copied === 'ussd' ? 'fa-check' : 'fa-copy'} text-[0.65rem]`}></i>
                      {copied === 'ussd' ? 'Copié !' : 'Copier'}
                    </button>
                    <a
                      href={`tel:${encodeURIComponent(ussdCode).replace(/%2A/g, '*').replace(/%23/g, '%23')}`}
                      className="flex-1 py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1 bg-[#22C55E] text-[#050506] no-underline"
                    >
                      <i className="fas fa-phone text-[0.65rem]"></i>
                      Lancer le code
                    </a>
                  </div>
                </div>
              )}

              {/* Mandatory confirmation */}
              <div className="bg-[rgba(245,158,11,0.08)] rounded-xl p-3 mb-3 border border-[rgba(245,158,11,0.2)]">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded accent-[#22C55E] shrink-0"
                  />
                  <div>
                    <p className="text-[0.75rem] font-bold text-[#1F2937]">
                      ⚠️ Je confirme avoir effectué le transfert
                    </p>
                    <p className="text-[0.65rem] text-[rgba(0,0,0,0.55)] mt-0.5">
                      Je certifie avoir envoyé <strong className="text-[#22C55E]">{amountCfa.toLocaleString('fr-FR')} FCFA</strong>
                      {' '}au numéro <strong className="text-[#22C55E]">{esc(config.adminYasAccount)}</strong> depuis mon téléphone.
                      {' '}Toute fausse déclaration entraînera des sanctions.
                    </p>
                  </div>
                </label>
              </div>
            </>
          )}

          {/* ============== TRX — DEPOSIT ============== */}
          {!isYas && isDeposit && (
            <>
              <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
                <div className="text-[0.68rem] text-[rgba(0,0,0,0.35)] uppercase font-semibold tracking-[1px] mb-2">
                  <i className="fas fa-qrcode mr-1"></i> Adresse TRX destinataire (admin)
                </div>
                {config.adminTrxAddress ? (
                  <>
                    <div className="bg-[#F3F4F6] rounded-xl p-3 mb-3 border border-[rgba(0,0,0,0.08)]">
                      <div className="text-[0.78rem] font-mono text-[#6366F1] break-all leading-relaxed">
                        {esc(config.adminTrxAddress)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(config.adminTrxAddress, 'address')}
                      className={`w-full py-2.5 rounded-xl text-[0.78rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-2 ${
                        copied === 'address' ? 'bg-[#6366F1] text-white' : 'bg-[rgba(99,102,241,0.12)] text-[#6366F1]'
                      }`}
                    >
                      <i className={`fas ${copied === 'address' ? 'fa-check' : 'fa-copy'}`}></i>
                      {copied === 'address' ? 'Copié !' : 'Copier l\'adresse'}
                    </button>
                  </>
                ) : (
                  <div className="bg-[rgba(239,68,68,0.08)] rounded-xl p-3 border border-[rgba(239,68,68,0.2)] flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-[#EF4444] text-[0.8rem]"></i>
                    <p className="text-[0.72rem] text-[rgba(0,0,0,0.65)]">Adresse TRX non configurée. Contactez le support.</p>
                  </div>
                )}
              </div>

              <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-3 border-l-[3px] border-r border-r-[rgba(0,0,0,0.08)] border-t border-t-[rgba(0,0,0,0.08)] border-b border-b-[rgba(0,0,0,0.08)]" style={{ borderLeftColor: '#6366F1' }}>
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
                    <span>Envoyez <strong className="text-[#6366F1]">{amountTrx.toFixed(2)} TRX</strong> à l&apos;adresse ci-dessus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white flex items-center justify-center text-[0.55rem] font-bold shrink-0 mt-0.5">3</span>
                    <span>Entrez votre adresse TRX ci-dessous pour confirmer</span>
                  </li>
                </ol>
              </div>
            </>
          )}

          {/* ============== USER ADDRESS INPUT (both modes, both methods) ============== */}
          <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
            <h4 className="text-[0.85rem] font-bold text-[#1F2937] mb-1">
              {isDeposit
                ? (isYas ? 'Votre numéro YAS (vérification)' : 'Votre adresse TRX (expéditeur)')
                : (isYas ? 'Votre numéro YAS (réception)' : 'Votre adresse TRX (réception)')}
            </h4>
            <p className="text-[0.7rem] text-[rgba(0,0,0,0.55)] mb-3">
              {isYas
                ? 'Numéro Yas du Togo — 8 chiffres commençant par 90-93 ou 70-73.'
                : 'Adresse TRX commençant par la lettre T (min. 20 caractères).'}
            </p>
            <input
              type={isYas ? 'tel' : 'text'}
              value={userAddress}
              onChange={(e) => {
                if (isYas) {
                  setUserAddress(e.target.value.replace(/\D/g, '').slice(0, 8));
                } else {
                  setUserAddress(e.target.value);
                }
              }}
              placeholder={isYas ? '90XXXXXX ou 70XXXXXX' : 'T... (votre adresse TRX)'}
              className={`w-full py-3 px-4 bg-[#F3F4F6] border-[1.5px] rounded-xl text-[0.85rem] outline-none text-gray-900 placeholder:text-[rgba(0,0,0,0.3)] ${
                userAddress && addressError
                  ? 'border-[#EF4444] focus:border-[#EF4444]'
                  : 'border-[rgba(0,0,0,0.08)]'
              }`}
              style={addressValid ? { borderColor: accent } : undefined}
              inputMode={isYas ? 'numeric' : undefined}
            />
            {userAddress && addressError && (
              <p className="text-[0.65rem] text-[#EF4444] mt-1 flex items-center gap-1">
                <i className="fas fa-circle-exclamation"></i> {addressError}
              </p>
            )}
            {addressValid && (
              <p className="text-[0.65rem] mt-1 flex items-center gap-1" style={{ color: accent }}>
                <i className="fas fa-check"></i> {isYas ? 'Numéro valide' : 'Adresse valide'}
              </p>
            )}
          </div>

          {/* 6-hour availability note */}
          <div
            className="rounded-xl p-2.5 mb-3 text-center border"
            style={{ backgroundColor: `${accent}14`, borderColor: `${accent}26` }}
          >
            <div className="text-[0.65rem]" style={{ color: accent }}>
              <i className="fas fa-clock mr-1"></i>
              {isDeposit
                ? 'Votre dépôt sera vérifié sous 6 heures après envoi.'
                : 'Les fonds seront disponibles dans les 6 heures.'}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer border-none disabled:opacity-50"
            >
              <i className="fas fa-arrow-left mr-1"></i> Annuler
            </button>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={!canConfirm}
              className="flex-[2] py-3.5 rounded-xl font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
              style={{ backgroundColor: accent, color: isYas ? '#050506' : '#FFFFFF' }}
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 border-2 rounded-full"
                    style={{
                      borderColor: isYas ? 'rgba(5,5,6,0.3)' : 'rgba(255,255,255,0.3)',
                      borderTopColor: isYas ? '#050506' : '#FFFFFF',
                      animation: 'spin 0.6s linear infinite',
                    }}
                  />
                  Traitement...
                </>
              ) : (
                <>
                  <i className={isDeposit ? 'fas fa-paper-plane' : 'fas fa-check'}></i>
                  {defaultCta}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Re-export validators for convenience so consumers can import everything from
// a single place if they wish.
export { validateYasAccount, validateTrxAddress, validatePaymentAddress, formatYasUssd };
export type { PaymentMethod };
