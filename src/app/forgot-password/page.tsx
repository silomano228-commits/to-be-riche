'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'done'>('form');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setStep('done');
      } else {
        setError(data.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    }

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

        {step === 'form' ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-4 mt-6">
              <i className="fas fa-key text-[#22C55E] text-[1.2rem]"></i>
            </div>
            <h2 className="text-[1.1rem] font-bold text-[#1F2937] mb-2">Mot de passe oublié ?</h2>
            <p className="text-[rgba(0,0,0,0.45)] text-[0.78rem] mb-6 leading-relaxed">
              Entrez votre email et choisissez un nouveau mot de passe.
            </p>

            <form onSubmit={handleReset} className="text-left">
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

              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.45)]">
                  Nouveau mot de passe
                </label>
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
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.45)]">
                  Confirmer le mot de passe
                </label>
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
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-check"></i> Réinitialiser</>}
              </button>
            </form>

            <div className="mt-6">
              <a href="/" className="text-[0.78rem] text-[#22C55E] font-medium hover:underline inline-flex items-center gap-1.5">
                <i className="fas fa-arrow-left text-[0.7rem]"></i> Retour à la connexion
              </a>
            </div>
          </>
        ) : (
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
