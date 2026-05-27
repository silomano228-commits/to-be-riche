'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'otp' | 'reset' | 'done'>('email');
  const [simCode, setSimCode] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('otp');
        if (data.plain_code) {
          setSimCode(data.plain_code);
        } else {
          // Real email was sent
        }
      } else {
        setError(data.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    }

    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      setError('Entrez le code à 6 chiffres');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code: otpCode }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('reset');
      } else {
        setError(data.error || 'Code invalide');
      }
    } catch {
      setError('Erreur réseau');
    }

    setLoading(false);
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, code: otpCode, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur réseau');
    }

    setLoading(false);
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email }),
      });
      const data = await res.json();
      if (data.success && data.plain_code) {
        setSimCode(data.plain_code);
      }
    } catch { /* */ }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F0FDF4] via-[#F8F9FA] to-[#ECFDF5] flex flex-col items-center justify-center px-5">
      {/* Decorative orbs */}
      <div className="fixed w-[200px] h-[200px] rounded-full bg-[rgba(34,197,94,0.06)] blur-[80px] top-[25%] left-[15%] pointer-events-none" />
      <div className="fixed w-[160px] h-[160px] rounded-full bg-[rgba(20,184,166,0.05)] blur-[80px] bottom-[20%] right-[10%] pointer-events-none" />

      <div className="w-full max-w-[380px] text-center relative z-[1]">
        {/* Logo */}
        <div className="w-[80px] h-[80px] mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center shadow-lg" style={{ boxShadow: '0 8px 24px rgba(34,197,94,0.25)' }}>
          <span className="text-white font-black text-[1.5rem] tracking-[1px]">BR</span>
        </div>
        <h1 className="text-[1.6rem] font-black mb-1 bg-gradient-to-r from-[#22C55E] to-[#16A34A] bg-clip-text text-transparent tracking-[2px]">
          BE RICH
        </h1>

        {/* Step 1: Email */}
        {step === 'email' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-4 mt-6">
              <i className="fas fa-lock text-[#22C55E] text-[1.2rem]"></i>
            </div>
            <h2 className="text-[1.1rem] font-bold text-[#1F2937] mb-2">Mot de passe oublié ?</h2>
            <p className="text-[rgba(0,0,0,0.45)] text-[0.78rem] mb-6 leading-relaxed">
              Entrez votre adresse email pour recevoir un code de vérification.
            </p>

            <form onSubmit={handleSendOtp} className="text-left">
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.45)]">
                  Adresse email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                  className="w-full premium-input"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] rounded-xl">
                  <p className="text-[0.78rem] text-[#F87171] font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-paper-plane"></i> Envoyer le code</>}
              </button>
            </form>

            <div className="mt-6">
              <a href="/" className="text-[0.78rem] text-[#22C55E] font-medium hover:underline inline-flex items-center gap-1.5">
                <i className="fas fa-arrow-left text-[0.7rem]"></i> Retour à la connexion
              </a>
            </div>
          </>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-4 mt-6">
              <i className="fas fa-shield-alt text-[#22C55E] text-[1.2rem]"></i>
            </div>
            <h2 className="text-[1.1rem] font-bold text-[#1F2937] mb-2">Vérification</h2>
            <p className="text-[rgba(0,0,0,0.45)] text-[0.78rem] mb-5 leading-relaxed">
              Un code a été envoyé à <strong className="text-[#1F2937]">{email}</strong>
            </p>

            {/* Simulation mode code display */}
            {simCode && (
              <div className="mb-4 p-3 bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.2)] rounded-xl">
                <div className="text-[0.65rem] text-[rgba(0,0,0,0.4)] mb-1 font-semibold">Code de simulation</div>
                <div className="text-[1.4rem] font-black text-[#F59E0B] tracking-[6px] font-mono">{simCode}</div>
                <button
                  onClick={() => { navigator.clipboard.writeText(simCode); }}
                  className="mt-2 py-1.5 px-3 rounded-lg bg-[rgba(245,158,11,0.12)] text-[0.68rem] text-[#D97706] font-semibold border border-[rgba(245,158,11,0.2)] cursor-pointer"
                >
                  <i className="fas fa-copy mr-1"></i>Copier le code
                </button>
              </div>
            )}

            {/* 6-digit OTP input */}
            <div className="flex justify-center gap-2 mb-5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className="w-10 h-12 text-center text-[1.1rem] font-bold bg-white border-[1.5px] border-[rgba(0,0,0,0.1)] rounded-xl outline-none focus:border-[#22C55E] focus:shadow-[0_0_0_3px_rgba(34,197,94,0.1)] transition-all text-[#1F2937]"
                  value={otpCode[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    const newCode = otpCode.split('');
                    newCode[i] = val.slice(-1);
                    const final = newCode.join('').slice(0, 6);
                    setOtpCode(final);
                    if (val && i < 5) {
                      const next = e.target.nextElementSibling as HTMLInputElement;
                      next?.focus();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !otpCode[i] && i > 0) {
                      const prev = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                      prev?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
                    setOtpCode(paste);
                  }}
                />
              ))}
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] rounded-xl">
                <p className="text-[0.78rem] text-[#F87171] font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={handleVerifyOtp}
              disabled={loading || otpCode.length < 6}
              className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2 mb-3"
            >
              {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-check-circle"></i> Vérifier</>}
            </button>

            <button
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[rgba(0,0,0,0.5)] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95 mb-3"
            >
              <i className="fas fa-redo mr-1.5 text-[0.7rem]"></i>Renvoyer le code
            </button>

            <button
              onClick={() => { setStep('email'); setOtpCode(''); setSimCode(''); setError(''); }}
              className="text-[0.75rem] text-[rgba(0,0,0,0.4)] cursor-pointer bg-transparent border-none font-medium"
            >
              <i className="fas fa-arrow-left mr-1"></i>Retour
            </button>
          </>
        )}

        {/* Step 3: New Password */}
        {step === 'reset' && (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-4 mt-6">
              <i className="fas fa-key text-[#22C55E] text-[1.2rem]"></i>
            </div>
            <h2 className="text-[1.1rem] font-bold text-[#1F2937] mb-2">Nouveau mot de passe</h2>
            <p className="text-[rgba(0,0,0,0.45)] text-[0.78rem] mb-6 leading-relaxed">
              Choisissez votre nouveau mot de passe.
            </p>

            <div className="text-left">
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.45)]">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Min. 6 caractères"
                  minLength={6}
                  className="w-full premium-input"
                />
              </div>
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.45)]">Confirmer</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full premium-input"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.15)] rounded-xl">
                  <p className="text-[0.78rem] text-[#F87171] font-medium">{error}</p>
                </div>
              )}

              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-check"></i> Réinitialiser</>}
              </button>
            </div>
          </>
        )}

        {/* Step 4: Done */}
        {step === 'done' && (
          <>
            <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-4 mt-6">
              <i className="fas fa-check-circle text-[#22C55E] text-[1.6rem]"></i>
            </div>
            <h2 className="text-[1.1rem] font-bold text-[#1F2937] mb-2">Mot de passe réinitialisé !</h2>
            <p className="text-[rgba(0,0,0,0.45)] text-[0.78rem] mb-6 leading-relaxed">
              Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.
            </p>

            <a
              href="/"
              className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-pointer transition-transform active:scale-[0.97] flex items-center justify-center gap-2 no-underline"
            >
              <i className="fas fa-arrow-left"></i> Retour à la connexion
            </a>
          </>
        )}
      </div>
    </div>
  );
}
