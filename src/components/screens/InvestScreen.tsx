'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/shared';

export default function InvestScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [userAddress, setUserAddress] = useState('');
  const [step, setStep] = useState<'form' | 'waiting' | 'done'>('form');
  const [depositInfo, setDepositInfo] = useState<{ depositId: string; adminAddress: string; amountTrx: string; amountUsd: number; trxPrice: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  // Vérifie automatiquement si un dépôt en attente existe
  useEffect(() => {
    if (step === 'form' && user) {
      fetch('/api/deposit/trx').then(r => r.json()).then(data => {
        if (data.success && data.data && data.data.status === 'pending') {
          setDepositInfo({ depositId: data.data.id, adminAddress: data.data.adminAddress, amountTrx: data.data.amountTrx.toFixed(2), amountUsd: data.data.amountUsd, trxPrice: data.data.trxPrice.toFixed(4) });
          setStep('waiting');
        }
      }).catch(() => {});
    }
  }, [step, user]);

  // Polling — vérifie le statut du dépôt en attente toutes les 10s
  useEffect(() => {
    if (step !== 'waiting') return;
    const interval = setInterval(async () => {
      try {
        setChecking(true);
        const res = await fetch('/api/deposit/trx');
        const data = await res.json();
        if (data.success) {
          if (!data.data || data.data.status !== 'pending') {
            // Dépôt traité — rafraîchir le solde
            const sessRes = await fetch('/api/auth/session');
            const sessData = await sessRes.json();
            if (sessData.success && sessData.user) setUser(sessData.user);
            setStep('done');
          }
        }
      } catch {} finally { setChecking(false); }
    }, 10000);
    return () => clearInterval(interval);
  }, [step, setUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
    if (!userAddress || userAddress.length < 20) { addToast('Adresse TRX invalide', 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/deposit/trx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountUsd: amt, userAddress }) });
      const data = await res.json();
      if (data.success) {
        setDepositInfo(data.data);
        setStep('waiting');
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  const copyAddress = () => {
    if (depositInfo?.adminAddress) {
      navigator.clipboard.writeText(depositInfo.adminAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const trxEquivalent = amount ? (parseFloat(amount) / 0.12).toFixed(2) : '0.00';

  // Formulaire initial
  if (step === 'form') {
    return (
      <>
        <Header title="Investir" icon="fa-wallet" iconColor="#2962FF" />
        <div className="px-[18px] py-4 flex-1 w-full">
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#EFF6FF] border-l-[3px] border-[#2962FF]">
            <i className="fas fa-info-circle text-[#1E40AF] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div>
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#1E40AF]">Dépôt via Trust Wallet (TRX)</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#1E3A5F]">Envoyez des TRX depuis votre portefeuille Trust Wallet. Le dépôt est vérifié automatiquement. Vous pourrez réclamer vos <strong>gains journaliers (7-15%)</strong> chaque jour.</p>
            </div>
          </div>

          {/* Étapes */}
          <div className="flex gap-2 mb-5 mt-4">
            {['Montant', 'Adresse TRX', 'Envoyer'].map((label, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[0.65rem] font-bold ${i === 0 ? 'bg-[#2962FF] text-white' : 'bg-[#E2E8F0] text-[#94A3B8]'}`}>{i + 1}</div>
                <span className="text-[0.6rem] text-[#94A3B8] font-medium">{label}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4 w-full">
              <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Montant (USD)</label>
              <div className="relative">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min. 10 $" min={10} step={1} required className="w-full py-3 px-4 pr-16 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.08)]" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.7rem] font-bold text-[#94A3B8]">USD</span>
              </div>
              {amount && parseFloat(amount) >= 10 && (
                <p className="text-[0.68rem] text-[#2962FF] mt-1 font-medium">≈ {trxEquivalent} TRX</p>
              )}
            </div>

            <div className="flex gap-1.5 mb-4">
              {[10, 25, 50, 100].map((v) => (
                <button key={v} type="button" onClick={() => setAmount(String(v))} className="flex-1 py-2.5 rounded-lg text-[0.76rem] font-semibold text-center cursor-pointer border-[1.5px] border-[rgba(0,0,0,0.06)] bg-white text-[#1A2332] transition-all active:scale-95 font-[Inter]">{v} $</button>
              ))}
            </div>

            <div className="mb-5 w-full">
              <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Votre adresse TRX (Trust Wallet)</label>
              <input type="text" value={userAddress} onChange={(e) => setUserAddress(e.target.value)} placeholder="T..." required className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.82rem] outline-none transition-all font-mono text-[#1A2332] focus:bg-white focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.08)]" />
              <p className="text-[0.62rem] text-[#94A3B8] mt-1">Ouvrez Trust Wallet → TRX → Recevoir → Copier l&apos;adresse</p>
              <a href="/trx-guide" className="text-[0.68rem] text-[#00C853] mt-1.5 font-semibold inline-flex items-center gap-1 hover:underline"><i className="fas fa-question-circle"></i> Comment trouver l&apos;adresse TRX ?</a>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-paper-plane"></i> Générer l&apos;adresse de dépôt</>}
            </button>
          </form>

          <div className="flex justify-between items-center mb-2.5 mt-7">
            <h3 className="text-[0.9rem] font-bold text-[#1A2332]">Projets à soutenir</h3>
          </div>
          {[
            { img: 'https://picsum.photos/seed/solar99/100/100', n: 'Solaire Village', s: '12% · Énergie', amt: 20 },
            { img: 'https://picsum.photos/seed/immo77/100/100', n: 'Résidence Green', s: '8% · Immobilier', amt: 50 },
          ].map((p, i) => (
            <div key={i} className="flex gap-3 p-3.5 bg-white rounded-xl mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] items-center border border-[rgba(0,0,0,0.03)]">
              <img src={p.img} className="w-[50px] h-[50px] rounded-lg object-cover shrink-0" loading="lazy" alt={p.n} />
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[0.85rem] mb-0.5 text-[#1A2332]">{p.n}</div>
                <div className="text-[0.68rem] text-[#94A3B8] font-medium">{p.s}</div>
              </div>
              <button onClick={() => { setAmount(String(p.amt)); }} className="text-[0.68rem] py-2 px-3 bg-[#00C853] text-white rounded-lg border-none cursor-pointer font-bold whitespace-nowrap font-[Inter] shrink-0 transition-transform active:scale-95">+{p.amt} $</button>
            </div>
          ))}
        </div>
      </>
    );
  }

  // En attente du paiement
  if (step === 'waiting' && depositInfo) {
    return (
      <>
        <Header title="Paiement en attente" icon="fa-clock" iconColor="#F59E0B" />
        <div className="px-[18px] py-4 flex-1 w-full">
          <div className="text-center mb-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#FEF3C7] flex items-center justify-center mb-3">
              <i className="fas fa-hourglass-half text-[#F59E0B] text-[1.4rem]"></i>
            </div>
            <h3 className="text-[1rem] font-bold text-[#1A2332] mb-1">Envoyez {depositInfo.amountTrx} TRX</h3>
            <p className="text-[0.78rem] text-[#64748B]">Ouvrez Trust Wallet et envoyez le montant exact</p>
          </div>

          {/* Adresse de destination */}
          <div className="bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <i className="fas fa-qrcode text-[#2962FF]"></i>
              <span className="text-[0.75rem] font-bold text-[#1A2332]">Adresse de destination (TRX)</span>
            </div>
            <div className="bg-white rounded-lg p-3 border border-[#E2E8F0] flex items-center gap-2">
              <code className="flex-1 text-[0.68rem] font-mono text-[#1A2332] break-all leading-relaxed">{depositInfo.adminAddress}</code>
              <button onClick={copyAddress} className="shrink-0 w-8 h-8 rounded-lg bg-[#2962FF] text-white border-none cursor-pointer flex items-center justify-center text-[0.7rem] transition-transform active:scale-90">
                {copied ? <i className="fas fa-check"></i> : <i className="fas fa-copy"></i>}
              </button>
            </div>
            <p className="text-[0.62rem] text-[#94A3B8] mt-2">
              {copied ? '✓ Adresse copiée !' : 'Copiez cette adresse et collez-la dans Trust Wallet'}
            </p>
          </div>

          {/* Résumé */}
          <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.05)] divide-y divide-[#F1F5F9] mb-5">
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Montant</span>
              <span className="text-[0.8rem] font-bold text-[#1A2332]">{depositInfo.amountUsd} USD</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Équivalent TRX</span>
              <span className="text-[0.8rem] font-bold text-[#2962FF]">{depositInfo.amountTrx} TRX</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Prix TRX</span>
              <span className="text-[0.8rem] text-[#1A2332]">{depositInfo.trxPrice} $</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Rendement</span>
              <span className="text-[0.8rem] font-bold text-[#00C853]">7-15% / jour</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Réseau</span>
              <span className="text-[0.8rem] font-bold text-[#F59E0B]">TRON (TRC20)</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-xl p-3.5 mb-5 bg-[#FEF3C7] border-l-[3px] border-[#F59E0B]">
            <h4 className="text-[0.78rem] mb-2 font-bold text-[#92400E]"><i className="fas fa-exclamation-triangle mr-1"></i> Instructions</h4>
            <ol className="text-[0.7rem] text-[#78350F] space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Ouvrez <strong>Trust Wallet</strong></li>
              <li>Allez dans <strong>TRX</strong> → <strong>Envoyer</strong></li>
              <li>Collez l&apos;adresse ci-dessus en destinataire</li>
              <li>Envoyez exactement <strong>{depositInfo.amountTrx} TRX</strong></li>
              <li>Le dépôt sera vérifié automatiquement en quelques minutes</li>
            </ol>
          </div>

          {/* Statut de vérification */}
          <div className="flex items-center justify-center gap-2 text-[#94A3B8]">
            <div className={`w-2 h-2 rounded-full ${checking ? 'bg-[#00C853]' : 'bg-[#CBD5E1]'} transition-colors`} />
            <span className="text-[0.72rem]">Vérification automatique en cours...</span>
          </div>

          <button onClick={() => { setStep('form'); setDepositInfo(null); setAmount(''); setUserAddress(''); }} className="w-full mt-5 py-3 rounded-xl bg-[#F1F5F9] text-[#64748B] font-semibold text-[0.82rem] border-none cursor-pointer font-[Inter] transition-transform active:scale-[0.97]">
            <i className="fas fa-arrow-left mr-1"></i> Annuler et revenir
          </button>
        </div>
      </>
    );
  }

  // Dépôt validé
  return (
    <>
      <Header title="Dépôt validé" icon="fa-check-circle" iconColor="#00C853" />
      <div className="px-[18px] py-4 flex-1 w-full flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-4">
          <i className="fas fa-check text-[#00C853] text-[2rem]"></i>
        </div>
        <h3 className="text-[1.1rem] font-bold text-[#1A2332] mb-2">Paiement confirmé !</h3>
        <p className="text-[0.82rem] text-[#64748B] mb-6 text-center">Votre dépôt a été vérifié et crédité sur votre solde. Réclamez vos gains journaliers (7-15%) chaque jour !</p>
        <button onClick={() => setPage('wallet')} className="w-full max-w-[260px] py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2">
          <i className="fas fa-coins"></i> Réclamer mes gains
        </button>
      </div>
    </>
  );
}
