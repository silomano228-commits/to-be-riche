'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const LOGO_URL = 'https://z-cdn-media.chatglm.cn/files/1153c12e-46c2-4ff4-9bfb-9ee1ea9ad677.png?auth_key=1875725907-dba9b296a2b347a582e281f8c13d5dd1-0-abc6e2dfe8db025886d8c5cccb41f197';

function ResetForm({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [pwStrength, setPwStrength] = useState(0);

  // Validate token via button click or auto-validate
  const handleValidate = async () => {
    try {
      const res = await fetch(`/api/auth/reset-password?token=${token}`);
      const data = await res.json();
      setTokenValid(data.success);
    } catch {
      setTokenValid(false);
    }
  };

  // Auto-validate on first render using a click event simulation
  if (tokenValid === null) {
    // Trigger validation
    handleValidate();
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-700 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
        <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Invalid/expired token
  if (!tokenValid && !success) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center px-5">
        <div className="fixed w-[200px] h-[200px] rounded-full bg-[rgba(239,68,68,0.06)] blur-[80px] top-[30%] left-[20%] pointer-events-none" />
        <div className="w-full max-w-[380px] text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center mb-4">
            <i className="fas fa-exclamation-triangle text-[#EF4444] text-[1.4rem]"></i>
          </div>
          <h2 className="text-[1.1rem] font-bold text-white mb-2">Lien invalide</h2>
          <p className="text-[rgba(255,255,255,0.4)] text-[0.78rem] mb-6 leading-relaxed">
            Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.
          </p>
          <a
            href="/forgot-password"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 no-underline"
          >
            <i className="fas fa-redo"></i> Demander un nouveau lien
          </a>
          <a
            href="/"
            className="mt-3 text-[0.78rem] text-[rgba(255,255,255,0.4)] hover:text-[#FBBF24] transition-colors inline-flex items-center gap-1.5"
          >
            <i className="fas fa-arrow-left text-[0.7rem]"></i> Retour à la connexion
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center px-5">
        <div className="fixed w-[200px] h-[200px] rounded-full bg-[rgba(0,200,83,0.08)] blur-[80px] top-[25%] left-[15%] pointer-events-none" />
        <div className="w-full max-w-[380px] text-center">
          <img
            src={LOGO_URL}
            alt="Be Rich"
            className="w-[80px] h-[80px] mx-auto mb-4 object-contain"
            style={{ filter: 'drop-shadow(0 4px 20px rgba(0,200,83,0.2))' }}
          />
          <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(0,200,83,0.1)] flex items-center justify-center mb-4">
            <i className="fas fa-check-circle text-[#00E676] text-[1.6rem]"></i>
          </div>
          <h2 className="text-[1.1rem] font-bold text-white mb-2">Mot de passe réinitialisé !</h2>
          <p className="text-[rgba(255,255,255,0.4)] text-[0.78rem] mb-6 leading-relaxed">
            Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
          </p>
          <a
            href="/"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 no-underline"
          >
            <i className="fas fa-sign-in-alt"></i> Se connecter
          </a>
        </div>
      </div>
    );
  }

  // Reset password form
  const checkStrength = (v: string) => {
    let s = 0;
    if (v.length >= 6) s++;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    setPwStrength(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== password2) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, password2 }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Une erreur est survenue');
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center px-5">
      {/* Decorative orbs */}
      <div className="fixed w-[200px] h-[200px] rounded-full bg-[rgba(251,191,36,0.06)] blur-[80px] top-[25%] left-[15%] pointer-events-none" />
      <div className="fixed w-[160px] h-[160px] rounded-full bg-[rgba(0,200,83,0.06)] blur-[80px] bottom-[20%] right-[10%] pointer-events-none" />

      <div className="w-full max-w-[380px] text-center">
        <img
          src={LOGO_URL}
          alt="Be Rich"
          className="w-[80px] h-[80px] mx-auto mb-4 object-contain"
          style={{ filter: 'drop-shadow(0 4px 20px rgba(251,191,36,0.2))' }}
          onError={(e) => {
            const t = e.target as HTMLImageElement;
            const p = t.parentElement;
            if (p) {
              const div = document.createElement('div');
              div.className = 'bg-gradient-to-br from-[#00E676] to-[#00C853] rounded-[22px] flex items-center justify-center text-white font-black w-[80px] h-[80px] mx-auto mb-4';
              div.textContent = 'BR';
              p.replaceChild(div, t);
            }
          }}
        />
        <h1 className="text-[1.6rem] font-black mb-1 bg-gradient-to-r from-[#FCD34D] via-[#FBBF24] to-[#F59E0B] bg-[length:200%_auto] text-transparent bg-clip-text tracking-[2px]">
          BE RICH
        </h1>

        <div className="w-14 h-14 mx-auto rounded-full bg-[rgba(251,191,36,0.1)] flex items-center justify-center mb-4 mt-6">
          <i className="fas fa-key text-[#FBBF24] text-[1.2rem]"></i>
        </div>
        <h2 className="text-[1.1rem] font-bold text-white mb-2">Nouveau mot de passe</h2>
        <p className="text-[rgba(255,255,255,0.4)] text-[0.78rem] mb-6 leading-relaxed">
          Créez un nouveau mot de passe sécurisé pour votre compte.
        </p>

        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-4 w-full relative">
            <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">
              Nouveau mot de passe
            </label>
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); checkStrength(e.target.value); }}
              required
              placeholder="Min. 6 caractères"
              minLength={6}
              className="w-full py-3 px-4 pr-11 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.08)]"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-[38px] bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-0.5"
            >
              <i className={`fas ${showPw ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
            {/* Strength indicator */}
            <div className="flex gap-1 mt-1.5">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
                    pwStrength <= 1 && i === 0 ? 'bg-red-500' :
                    pwStrength <= 2 && i <= 1 ? 'bg-red-500' :
                    pwStrength <= 3 && i <= 2 ? 'bg-amber-500' :
                    pwStrength >= 4 ? 'bg-green-400' :
                    'bg-[rgba(255,255,255,0.06)]'
                  }`}
                />
              ))}
            </div>
            <p className="text-[0.64rem] mt-1 text-left" style={{ color: pwStrength <= 1 ? '#EF4444' : pwStrength <= 3 ? '#F59E0B' : '#00E676' }}>
              {pwStrength === 0 ? '' : pwStrength <= 1 ? 'Faible' : pwStrength <= 3 ? 'Bon' : 'Excellent'}
            </p>
          </div>

          <div className="mb-4 w-full relative">
            <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">
              Confirmer le mot de passe
            </label>
            <input
              type={showPw2 ? 'text' : 'password'}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              placeholder="•••••••••"
              className={`w-full py-3 px-4 pr-11 bg-[rgba(255,255,255,0.05)] border-[1.5px] ${password2 && password !== password2 ? 'border-red-500' : 'border-[rgba(255,255,255,0.08)]'} rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.08)]`}
            />
            <button
              type="button"
              onClick={() => setShowPw2(!showPw2)}
              className="absolute right-3 top-[38px] bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-0.5"
            >
              <i className={`fas ${showPw2 ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
            {password2 && password !== password2 && (
              <p className="text-red-500 text-[0.68rem] mt-1 font-medium">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-xl">
              <p className="text-[0.78rem] text-[#F87171] font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (password2.length > 0 && password !== password2)}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
            ) : (
              <>
                <i className="fas fa-check"></i> Réinitialiser le mot de passe
              </>
            )}
          </button>
        </form>

        <a
          href="/forgot-password"
          className="mt-5 text-[0.78rem] text-[rgba(255,255,255,0.4)] hover:text-[#FBBF24] transition-colors inline-flex items-center gap-1.5"
        >
          <i className="fas fa-redo text-[0.7rem]"></i> Renvoyer un lien
        </a>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function NoTokenScreen() {
  return (
    <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center px-5">
      <div className="fixed w-[200px] h-[200px] rounded-full bg-[rgba(239,68,68,0.06)] blur-[80px] top-[30%] left-[20%] pointer-events-none" />
      <div className="w-full max-w-[380px] text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(239,68,68,0.1)] flex items-center justify-center mb-4">
          <i className="fas fa-exclamation-triangle text-[#EF4444] text-[1.4rem]"></i>
        </div>
        <h2 className="text-[1.1rem] font-bold text-white mb-2">Lien invalide</h2>
        <p className="text-[rgba(255,255,255,0.4)] text-[0.78rem] mb-6 leading-relaxed">
          Ce lien de réinitialisation est invalide ou a expiré. Veuillez demander un nouveau lien.
        </p>
        <a
          href="/forgot-password"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 no-underline"
        >
          <i className="fas fa-redo"></i> Demander un nouveau lien
        </a>
        <a
          href="/"
          className="mt-3 text-[0.78rem] text-[rgba(255,255,255,0.4)] hover:text-[#FBBF24] transition-colors inline-flex items-center gap-1.5"
        >
          <i className="fas fa-arrow-left text-[0.7rem]"></i> Retour à la connexion
        </a>
      </div>
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  if (!token) {
    return <NoTokenScreen />;
  }

  return <ResetForm token={token} />;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-700 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
