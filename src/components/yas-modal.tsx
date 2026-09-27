'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import {
  useSimpleStore, validateYasAccount, ADMIN_YAS_ACCOUNT, YAS_MIN_DEPOSIT, YAS_MIN_WITHDRAW,
  type Project,
} from '@/lib/simple-store';

/* ================================================================
   MODALE YAS — dépôt / retrait par projet (comme l'ancien système) :
   1. Montant + numéro Yas  2. Envoyer au compte de la plateforme
   3. Vérification par l'administrateur -> argent crédité/payé.
   L'admin contrôle l'entrée ET la sortie de l'argent.
   ================================================================ */

export const PROJECT_LABEL: Record<Project, string> = {
  likes: 'Lives Likes', missions: 'Missions images', invest: 'Investir',
};

export function YasModal({ open, kind, project, onClose }: {
  open: boolean; kind: 'deposit' | 'withdrawal'; project: Project; onClose: () => void;
}) {
  const { addToast } = useAppStore();
  const s = useSimpleStore();
  const [step, setStep] = useState<'amount' | 'send' | 'wait'>('amount');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) { setStep('amount'); setAmount(''); setAccount(''); setErr(''); setCopied(false); }
  }, [open]);

  if (!open) return null;

  const value = parseInt(amount, 10) || 0;
  const isDeposit = kind === 'deposit';
  const min = isDeposit ? YAS_MIN_DEPOSIT : YAS_MIN_WITHDRAW;

  /* Transaction en attente pour ce projet (affichage temps réel) */
  const pending = s.yasTransfers.find((t) => t.project === project && t.kind === kind && t.status === 'pending');
  const lastOne = s.yasTransfers.find((t) => t.project === project && t.kind === kind);
  const showWait = step === 'wait' || (step === 'amount' && pending);
  const watched = pending || (showWait ? lastOne : undefined);

  const submitAmount = () => {
    setErr('');
    if (value < min) { setErr(`Minimum : ${min} F`); return; }
    const accErr = validateYasAccount(account);
    if (accErr) { setErr(`Numéro Yas : ${accErr}`); return; }
    if (isDeposit) { setStep('send'); return; }
    const r = s.requestYasTransfer('withdrawal', project, value, account);
    if (!r.ok) { setErr(r.reason || 'Demande impossible'); return; }
    addToast('Demande de retrait envoyée — l’administrateur va payer sur votre compte Yas', 'success');
    setStep('wait');
  };

  const confirmSent = () => {
    const r = s.requestYasTransfer('deposit', project, value, account);
    if (!r.ok) { setErr(r.reason || 'Demande impossible'); return; }
    addToast('Dépôt déclaré — vérification par l’administrateur en cours', 'success');
    setStep('wait');
  };

  const copyAdmin = () => {
    try { navigator.clipboard.writeText(ADMIN_YAS_ACCOUNT.replace(/\s+/g, '')); } catch { /* silencieux */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-[rgba(0,0,0,0.45)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[92%] max-w-[360px] max-h-[88vh] overflow-y-auto border border-[rgba(0,0,0,0.08)] shadow-[0_8px_24px_rgba(0,0,0,0.1)]" style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>

        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(0,0,0,0.05)] sticky top-0 bg-white z-[1]">
          <div className="flex items-center gap-2">
            <i className={`fas ${isDeposit ? 'fa-arrow-down text-[#22C55E]' : 'fa-arrow-up text-[#F59E0B]'} text-[0.8rem]`}></i>
            <div className="text-[0.8rem] font-black text-[#1F2937]">{isDeposit ? 'Dépôt' : 'Retrait'} Yas — {PROJECT_LABEL[project]}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[rgba(0,0,0,0.04)] text-[#64748B] border-none cursor-pointer flex items-center justify-center text-[0.7rem]"><i className="fas fa-xmark"></i></button>
        </div>

        <div className="p-4">
          {/* ------- Étape : montant + numéro ------- */}
          {step === 'amount' && !pending && (
            <>
              <div className="bg-[#EFF6FF] border-l-[3px] border-[#2962FF] rounded-r-xl p-3 mb-3 flex items-start gap-2.5">
                <i className="fas fa-circle-info text-[#1E40AF] text-[0.75rem] mt-0.5"></i>
                <div className="text-[0.62rem] text-[#1E3A5F] leading-relaxed">
                  {isDeposit
                    ? <>Déposez via <strong>Yas (mobile money)</strong> : envoyez le montant au compte de la plateforme, l’administrateur vérifie puis crédite votre projet.</>
                    : <>Retrait vers votre compte <strong>Yas</strong> : l’administrateur vérifie votre compte puis vous paie. {s.withdrawalsDone === 0 && <span className="text-[#B45309] font-bold">Premier retrait : 1 filleul requis.</span>}</>}
                </div>
              </div>

              {/* Étapes 1-2-3 (présentation comme avant) */}
              <div className="flex gap-2 mb-4">
                {['Montant', 'Numéro Yas', 'Envoyer'].map((l, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.55rem] font-black ${i === 0 ? 'bg-[#2962FF] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>{i + 1}</div>
                    <span className="text-[0.52rem] text-[#94A3B8] font-semibold">{l}</span>
                  </div>
                ))}
              </div>

              <label className="block mb-1 text-[0.65rem] font-bold text-[#64748B]">Montant (FCFA)</label>
              <input
                type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min. ${min} F`}
                className="w-full py-2.5 px-3.5 rounded-xl bg-[rgba(0,0,0,0.03)] border-[1.5px] border-[rgba(0,0,0,0.07)] text-[0.82rem] font-bold text-[#1F2937] outline-none focus:border-[#2962FF] focus:bg-white mb-2.5"
              />
              <div className="flex gap-1.5 mb-3">
                {(isDeposit ? [1000, 3000, 5000] : [2500, 5000, 10000]).map((v) => (
                  <button key={v} onClick={() => setAmount(String(v))} className="flex-1 py-2 rounded-lg text-[0.65rem] font-bold border-[1.5px] border-[rgba(0,0,0,0.06)] bg-white text-[#1F2937] cursor-pointer active:scale-95">{v.toLocaleString('fr-FR')} F</button>
                ))}
              </div>

              <label className="block mb-1 text-[0.65rem] font-bold text-[#64748B]">Votre numéro Yas {isDeposit ? '(paiement)' : '(réception)'}</label>
              <input
                type="tel" value={account} onChange={(e) => setAccount(e.target.value)}
                placeholder="90 12 34 56"
                className="w-full py-2.5 px-3.5 rounded-xl bg-[rgba(0,0,0,0.03)] border-[1.5px] border-[rgba(0,0,0,0.07)] text-[0.82rem] font-bold text-[#1F2937] outline-none focus:border-[#2962FF] focus:bg-white"
              />
              <div className="text-[0.55rem] text-[#94A3B8] mt-1 mb-3">8 chiffres — commence par 90-93 ou 70-73</div>

              {err && <div className="text-[0.65rem] text-[#EF4444] font-bold mb-2.5"><i className="fas fa-circle-exclamation mr-1"></i>{err}</div>}

              <button onClick={submitAmount} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-bold text-[0.78rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] active:scale-[0.98]">
                {isDeposit ? <><i className="fas fa-paper-plane mr-1"></i>Continuer</> : <><i className="fas fa-paper-plane mr-1"></i>Demander le retrait</>}
              </button>
            </>
          )}

          {/* ------- Étape : envoyer au compte de la plateforme (dépôt) ------- */}
          {step === 'send' && (
            <>
              <div className="text-center mb-4">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#FEF3C7] flex items-center justify-center mb-2">
                  <i className="fas fa-hourglass-half text-[#F59E0B] text-[1.1rem]"></i>
                </div>
                <h4 className="text-[0.85rem] font-black text-[#1F2937]">Envoyez {formatCfa(value)}</h4>
                <p className="text-[0.65rem] text-[#64748B]">au compte Yas de la plateforme</p>
              </div>

              <div className="bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-xl p-3.5 mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <i className="fas fa-building-columns text-[#2962FF] text-[0.75rem]"></i>
                  <span className="text-[0.68rem] font-bold text-[#1F2937]">Compte Yas Be Rich</span>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-[#E2E8F0] flex items-center gap-2">
                  <code className="flex-1 text-[0.85rem] font-black tracking-wider text-[#1F2937]">{ADMIN_YAS_ACCOUNT}</code>
                  <button onClick={copyAdmin} className="shrink-0 w-8 h-8 rounded-lg bg-[#2962FF] text-white border-none cursor-pointer flex items-center justify-center text-[0.68rem] active:scale-90">
                    {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
                  </button>
                </div>
                <div className="text-[0.55rem] text-[#94A3B8] mt-1.5">{copied ? '✓ Numéro copié !' : 'Copiez puis envoyez depuis votre application Yas'}</div>
              </div>

              <div className="rounded-xl p-3 mb-3 bg-[#FEF3C7] border-l-[3px] border-[#F59E0B]">
                <h5 className="text-[0.68rem] mb-1.5 font-bold text-[#92400E]"><i className="fas fa-exclamation-triangle mr-1"></i> Instructions</h5>
                <ol className="text-[0.62rem] text-[#78350F] space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Ouvrez votre application <strong>Yas</strong></li>
                  <li>Choisissez <strong>Transfert</strong> vers {ADMIN_YAS_ACCOUNT}</li>
                  <li>Envoyez exactement <strong>{formatCfa(value)}</strong></li>
                  <li>Revenez ici et confirmez l&apos;envoi</li>
                  <li>L&apos;administrateur vérifie puis crédite votre projet</li>
                </ol>
              </div>

              {err && <div className="text-[0.65rem] text-[#EF4444] font-bold mb-2.5"><i className="fas fa-circle-exclamation mr-1"></i>{err}</div>}

              <button onClick={confirmSent} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-bold text-[0.78rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(0,200,83,0.2)] active:scale-[0.98] mb-2">
                <i className="fas fa-check mr-1"></i>J&apos;ai envoyé {formatCfa(value)}
              </button>
              <button onClick={() => setStep('amount')} className="w-full py-2.5 rounded-xl bg-[#F1F5F9] text-[#64748B] font-semibold text-[0.72rem] border-none cursor-pointer active:scale-[0.98]">
                <i className="fas fa-arrow-left mr-1"></i>Modifier le montant
              </button>
            </>
          )}

          {/* ------- Étape : en attente de vérification / résultat ------- */}
          {showWait && watched && (
            <div className="text-center py-2">
              {watched.status === 'pending' && (
                <>
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#FEF3C7] flex items-center justify-center mb-2">
                    <i className="fas fa-hourglass-half text-[#F59E0B] text-[1.1rem]" style={{ animation: 'pulse 1.5s infinite' }}></i>
                  </div>
                  <h4 className="text-[0.82rem] font-black text-[#1F2937] mb-1">Vérification en cours…</h4>
                  <p className="text-[0.65rem] text-[#64748B] mb-3 leading-relaxed">
                    {isDeposit
                      ? <>Votre dépôt de <strong>{formatCfa(watched.amount)}</strong> est en cours de vérification par l&apos;administrateur. Il sera crédité sur « {PROJECT_LABEL[project]} » dès validation.</>
                      : <>Votre retrait de <strong>{formatCfa(watched.amount)}</strong> vers <strong>{watched.account}</strong> est en cours de traitement. Vous recevrez le paiement sur votre compte Yas.</>}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-[#94A3B8] mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#22C55E]" style={{ animation: 'pulse 1.5s infinite' }}></div>
                    <span className="text-[0.62rem]">Suivi en temps réel…</span>
                  </div>
                  <div className="rounded-xl bg-[rgba(0,0,0,0.02)] p-3 text-left mb-3">
                    <div className="flex justify-between text-[0.62rem] py-1"><span className="text-[#64748B]">Type</span><span className="font-bold text-[#1F2937]">{isDeposit ? 'Dépôt' : 'Retrait'} · {PROJECT_LABEL[project]}</span></div>
                    <div className="flex justify-between text-[0.62rem] py-1"><span className="text-[#64748B]">Montant</span><span className="font-bold text-[#1F2937]">{formatCfa(watched.amount)}</span></div>
                    <div className="flex justify-between text-[0.62rem] py-1"><span className="text-[#64748B]">Demandé</span><span className="font-bold text-[#1F2937]">{watched.date}</span></div>
                    <div className="flex justify-between text-[0.62rem] py-1"><span className="text-[#64748B]">Statut</span><span className="font-bold text-[#F59E0B]">En attente</span></div>
                  </div>
                </>
              )}
              {watched.status === 'approved' && (
                <>
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#DCFCE7] flex items-center justify-center mb-2">
                    <i className="fas fa-check text-[#22C55E] text-[1.3rem]"></i>
                  </div>
                  <h4 className="text-[0.85rem] font-black text-[#1F2937] mb-1">{isDeposit ? 'Dépôt validé !' : 'Retrait payé !'}</h4>
                  <p className="text-[0.65rem] text-[#64748B] mb-3 leading-relaxed">
                    {isDeposit
                      ? <>{formatCfa(watched.amount)} crédités sur « {PROJECT_LABEL[project]} » — votre activité reprend de plus belle (+15 XP).</>
                      : <>{formatCfa(watched.amount)} envoyés sur votre compte Yas <strong>{watched.account}</strong>. Continuez à gagner !</>}
                  </p>
                </>
              )}
              {watched.status === 'rejected' && (
                <>
                  <div className="w-14 h-14 mx-auto rounded-full bg-[#FEE2E2] flex items-center justify-center mb-2">
                    <i className="fas fa-xmark text-[#EF4444] text-[1.3rem]"></i>
                  </div>
                  <h4 className="text-[0.85rem] font-black text-[#1F2937] mb-1">Demande refusée</h4>
                  <p className="text-[0.65rem] text-[#64748B] mb-3 leading-relaxed">
                    {isDeposit ? 'Le paiement n’a pas été retrouvé. Vérifiez le montant et le compte, puis retentez.' : 'Fonds restitués sur votre compte interne. Vérifiez vos informations et retentez.'}
                  </p>
                </>
              )}
              <button onClick={onClose} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-bold text-[0.78rem] border-none cursor-pointer active:scale-[0.98]">
                Fermer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
