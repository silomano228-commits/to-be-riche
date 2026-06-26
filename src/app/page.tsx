'use client';

import { useState, useEffect, useCallback, Component } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore, formatMoney, esc, authFetch, refreshUser } from '@/lib/store';
import { LogoImg, ToastContainer, NotificationContainer, Header, AI_TIPS } from '@/components/shared';
import { useTabChangeAd } from '@/lib/useTabChangeAd';

// ==================== ERROR BOUNDARY ====================
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-[320px]">
            <div className="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-exclamation-triangle text-[#F59E0B] text-2xl"></i>
            </div>
            <h2 className="text-lg font-bold text-[#1F2937] mb-2">Oups !</h2>
            <p className="text-sm text-[rgba(0,0,0,0.5)] mb-4">Une erreur inattendue s&apos;est produite.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }} className="px-6 py-3 rounded-xl bg-[#22C55E] text-white font-semibold border-none cursor-pointer">
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== SCREEN LOADER (lazy-load fallback) ====================
function ScreenLoader() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#F8F9FA]">
      <LogoImg className="w-12 h-12 mb-3" style={{ animation: 'spFloat 2s ease-in-out infinite' }} />
      <div className="w-5 h-5 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}

// Lazy load heavy screen components
const InvestHubScreen = dynamic(() => import('@/components/screens/InvestHubScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const SpinGameScreen = dynamic(() => import('@/components/screens/SpinGameScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const VideoPlatformScreen = dynamic(() => import('@/components/screens/VideoPlatformScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const EnterpriseScreen = dynamic(() => import('@/components/screens/EnterpriseScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const ProfileScreen = dynamic(() => import('@/components/screens/ProfileScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const AnalyticsScreen = dynamic(() => import('@/components/screens/AnalyticsScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const WithdrawScreen = dynamic(() => import('@/components/screens/WithdrawScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const AdminScreen = dynamic(() => import('@/components/screens/AdminScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const ChatScreen = dynamic(() => import('@/components/screens/ChatScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const DepositScreen = dynamic(() => import('@/components/screens/DepositScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const GuideScreen = dynamic(() => import('@/components/screens/GuideScreen'), { ssr: false, loading: () => <ScreenLoader /> });
const FloatingGift = dynamic(() => import('@/components/FloatingGift'), { ssr: false, loading: () => <ScreenLoader /> });
const TabChangeAd = dynamic(() => import('@/components/TabChangeAd').then(m => ({ default: m.TabChangeAd })), { ssr: false, loading: () => <ScreenLoader /> });
const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), { ssr: false, loading: () => <ScreenLoader /> });
const NotificationBell = dynamic(() => import('@/components/NotificationBell'), { ssr: false, loading: () => <ScreenLoader /> });
const WithdrawalTicker = dynamic(() => import('@/components/WithdrawalTicker'), { ssr: false, loading: () => <ScreenLoader /> });
const PromoBanner = dynamic(() => import('@/components/PromoBanner'), { ssr: false, loading: () => <ScreenLoader /> });
const RefreshReminderBanner = dynamic(() => import('@/components/RefreshReminderBanner'), { ssr: false, loading: () => null });

// ==================== SPLASH ====================
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setHide(true); setTimeout(onDone, 500); }, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`absolute inset-0 bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] z-[9999] flex flex-col items-center justify-center transition-all duration-500 ${hide ? 'opacity-0 invisible' : ''}`}>
      <div className="absolute w-[200px] h-[200px] rounded-full bg-[rgba(34,197,94,0.08)] blur-[80px] top-[25%] left-[15%]" style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
      <div className="absolute w-[160px] h-[160px] rounded-full bg-[rgba(20,184,166,0.06)] blur-[80px] bottom-[20%] right-[10%]" style={{ animation: 'orbFloat 6s ease-in-out infinite 3s reverse' }} />
      <div className="absolute w-[120px] h-[120px] rounded-full bg-[rgba(245,158,11,0.05)] blur-[80px] top-[60%] left-[60%]" style={{ animation: 'orbFloat 7s ease-in-out infinite 1.5s' }} />
      <LogoImg className="w-[140px] h-[140px] mb-5" style={{ animation: 'logoPulse 2.4s ease-in-out infinite', filter: 'drop-shadow(0 8px 40px rgba(34,197,94,0.3))' }} />
      <h1 className="text-[2rem] font-black mb-6 bg-gradient-to-r from-[#22C55E] to-[#16A34A] bg-clip-text text-transparent tracking-[3px]">BE RICH</h1>
      <div className="w-5 h-5 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
      <div className="text-[rgba(0,0,0,0.25)] mt-4 text-[0.6rem] tracking-[5px] uppercase">Chargement</div>
    </div>
  );
}

// ==================== AUTH SCREEN ====================
function AuthScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  // Referral code from URL (lazy init before useState)
  const { prefilledReferral, initialMode } = (() => {
    if (typeof window === 'undefined') return { prefilledReferral: '', initialMode: 'login' as const };
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) return { prefilledReferral: ref.toUpperCase(), initialMode: 'register' as const };
    } catch { /* */ }
    return { prefilledReferral: '', initialMode: 'login' as const };
  })();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState({ l: false, r: false, r2: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // OTP state (registration only)
  const [otpStep, setOtpStep] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [simCode, setSimCode] = useState('');

  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target as HTMLFormElement);
      const email = fd.get('email') as string;
      const password = fd.get('password') as string;
      const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        setUser(data.user); addToast('Bienvenue, ' + data.user.name, 'success'); setPage('videos');
      } else if (data.needs_verification) {
        // Account exists but email isn't verified — switch to OTP screen.
        setOtpEmail(email);
        setOtpStep(true);
        if (data.plain_code) {
          setSimCode(data.plain_code);
          addToast('Mode simulation - Code: ' + data.plain_code, 'info');
        } else {
          addToast('Code de vérification envoyé à ' + email, 'success');
        }
      } else {
        addToast(data.error, 'error');
      }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  const handleOtpVerify = async () => {
    if (!otpCode || otpCode.length < 6) { addToast('Entrez le code à 6 chiffres', 'error'); return; }
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/otp', { method: 'POST', body: JSON.stringify({ action: 'verify', email: otpEmail, code: otpCode, purpose: 'email_verification' }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        addToast('Email vérifié ! Bienvenue, ' + data.user.name, 'success');
        setPage('videos');
      } else {
        addToast(data.error || 'Code invalide', 'error');
      }
    } catch { addToast('Erreur réseau', 'error'); }
    setOtpLoading(false);
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/otp', { method: 'POST', body: JSON.stringify({ action: 'send', email: otpEmail, purpose: 'email_verification' }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        if (data.plain_code) {
          setSimCode(data.plain_code);
          addToast('Code: ' + data.plain_code, 'info');
        } else {
          addToast('Code renvoyé à ' + otpEmail, 'success');
        }
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur réseau', 'error'); }
    setOtpLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const name = (fd.get('name') as string)?.trim() || '';
    const email = (fd.get('email') as string)?.trim() || '';
    const phone = (fd.get('phone') as string)?.trim() || '';
    const password = fd.get('password') as string || '';
    const password2 = fd.get('password2') as string || '';
    const referralCode = (fd.get('referralCode') as string)?.trim().toUpperCase() || '';
    const errs: Record<string, string> = {};
    if (name.length < 2) errs.name = 'Min. 2 caractères';
    if (password.length < 6) errs.password = 'Min. 6 caractères';
    if (password !== password2) errs.password2 = 'Ne correspond pas';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, phone: phone.trim(), password, password2, referralCode }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success && data.requires_verification) {
        // Account created — must verify email via OTP
        setOtpEmail(email);
        setOtpStep(true);
        if (data.plain_code) {
          setSimCode(data.plain_code);
          addToast('Mode simulation - Code: ' + data.plain_code, 'info');
        } else {
          addToast('Code de vérification envoyé à ' + email, 'success');
        }
      } else if (data.success) {
        setUser(data.user); addToast('Compte créé !', 'success'); setPage('videos');
      } else {
        addToast(data.error, 'error');
      }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  return (
    <section className="absolute inset-0 bg-gradient-to-br from-[#F0FDF4] via-[#F8F9FA] to-[#ECFDF5] flex flex-col items-center justify-start sm:justify-center overflow-y-auto z-[200]">
      {/* Floating decorative orbs */}
      <div className="absolute w-[200px] h-[200px] rounded-full bg-[rgba(34,197,94,0.06)] blur-[80px] top-[15%] left-[10%]" style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
      <div className="absolute w-[160px] h-[160px] rounded-full bg-[rgba(20,184,166,0.05)] blur-[80px] bottom-[15%] right-[10%]" style={{ animation: 'orbFloat 6s ease-in-out infinite 3s reverse' }} />
      <div className="absolute w-[120px] h-[120px] rounded-full bg-[rgba(245,158,11,0.04)] blur-[80px] top-[50%] right-[25%]" style={{ animation: 'orbFloat 7s ease-in-out infinite 1.5s' }} />

      <div className="w-full max-w-[330px] text-center px-5 relative z-[1] py-6 my-auto">
        <LogoImg className="w-[100px] h-[100px] mx-auto mb-4" style={{ filter: 'drop-shadow(0 8px 32px rgba(34,197,94,0.25))' }} />
        <h1 className="text-[1.8rem] font-black mb-1 bg-gradient-to-r from-[#22C55E] to-[#16A34A] bg-clip-text text-transparent tracking-[2px]">BE RICH</h1>
        {/* Communication platform tagline */}
        <div className="inline-flex items-center gap-1.5 mb-1 px-3 py-1 rounded-full bg-[rgba(20,184,166,0.1)] border border-[rgba(20,184,166,0.2)]">
          <i className="fas fa-globe-asia text-[#14B8A6] text-[0.6rem]"></i>
          <span className="text-[0.58rem] font-bold text-[#0F766E] uppercase tracking-wide">Plateforme de communication des grandes entreprises</span>
        </div>
        <p className="text-[0.6rem] text-[rgba(0,0,0,0.45)] mb-4">Regardez des vidéos d&rsquo;entreprises chinoises, japonaises et indiennes &mdash; soyez pay&eacute;s&nbsp;!</p>

        {/* OTP Verification Step — Registration only */}
        {otpStep ? (
          <>
            <div className="w-14 h-14 mx-auto rounded-full bg-[rgba(34,197,94,0.1)] flex items-center justify-center mb-4 mt-4">
              <i className="fas fa-shield-alt text-[#22C55E] text-[1.3rem]"></i>
            </div>
            <h2 className="text-[1rem] font-bold text-[#1F2937] mb-1">Vérification email</h2>
            <p className="text-[rgba(0,0,0,0.45)] text-[0.72rem] mb-5">
              Un code a été envoyé à <strong className="text-[#1F2937]">{otpEmail}</strong> pour vérifier votre adresse email
            </p>

            {/* Simulation mode code display */}
            {simCode && (
              <div className="mb-4 p-4 bg-[rgba(245,158,11,0.12)] border-2 border-[rgba(245,158,11,0.4)] rounded-xl">
                <div className="flex items-center gap-1.5 mb-2">
                  <i className="fas fa-key text-[#F59E0B] text-[0.7rem]"></i>
                  <div className="text-[0.72rem] text-[#D97706] font-bold">Votre code de vérification</div>
                </div>
                <div className="text-[2rem] font-black text-[#F59E0B] tracking-[8px] font-mono text-center py-2">{simCode}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => { setOtpCode(simCode); addToast('Code rempli automatiquement', 'success'); }}
                    className="flex-1 py-2 rounded-lg bg-[#F59E0B] text-white text-[0.75rem] font-bold border-none cursor-pointer flex items-center justify-center gap-1"
                  >
                    <i className="fas fa-magic mr-1"></i>Remplir automatiquement
                  </button>
                  <button
                    onClick={() => { try { navigator.clipboard.writeText(simCode); } catch { /* */ } addToast('Code copié', 'success'); }}
                    className="py-2 px-3 rounded-lg bg-[rgba(245,158,11,0.15)] text-[0.72rem] text-[#D97706] font-semibold border border-[rgba(245,158,11,0.3)] cursor-pointer"
                  >
                    <i className="fas fa-copy mr-1"></i>Copier
                  </button>
                </div>
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

            {/* Hint when code is incomplete */}
            {otpCode.length < 6 && (
              <p className="text-[0.65rem] text-[rgba(0,0,0,0.4)] mb-2"><i className="fas fa-info-circle mr-1"></i>Entrez les 6 chiffres reçus par email pour finaliser</p>
            )}

            <button
              onClick={handleOtpVerify}
              disabled={otpLoading || otpCode.length < 6}
              className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-not-allowed disabled:opacity-60 enabled:cursor-pointer transition-transform active:scale-[0.97] flex items-center justify-center gap-2 mb-3"
            >
              {otpLoading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-check-circle"></i> Finaliser l&rsquo;inscription</>}
            </button>

            <button
              onClick={handleResendOtp}
              disabled={otpLoading}
              className="w-full py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[rgba(0,0,0,0.5)] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95 mb-3"
            >
              <i className="fas fa-redo mr-1.5 text-[0.7rem]"></i>Renvoyer le code
            </button>

            <button
              onClick={() => { setOtpStep(false); setOtpCode(''); setSimCode(''); }}
              className="text-[0.75rem] text-[rgba(0,0,0,0.4)] cursor-pointer bg-transparent border-none font-medium"
            >
              <i className="fas fa-arrow-left mr-1"></i>Retour
            </button>
          </>
        ) : (
          <>
            <p className="text-[rgba(0,0,0,0.35)] text-[0.72rem] mb-6">{mode === 'login' ? 'Connectez-vous à votre compte.' : 'Rejoignez Be Rich.'}</p>
            <div className="flex bg-[#FFFFFF] rounded-xl p-[3px] mb-6 border border-[rgba(0,0,0,0.08)]">
              <button onClick={() => { setMode('login'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer ${mode === 'login' ? 'bg-[#22C55E] text-white shadow-lg' : 'text-[rgba(0,0,0,0.35)]'}`}>Connexion</button>
              <button onClick={() => { setMode('register'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer ${mode === 'register' ? 'bg-[#22C55E] text-white shadow-lg' : 'text-[rgba(0,0,0,0.35)]'}`}>Inscription</button>
            </div>
            {mode === 'login' ? (
              <form onSubmit={handleLogin}>
                <div className="mb-4 w-full"><label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.45)]">Email</label><input name="email" type="email" required placeholder="votre@email.com" className="w-full premium-input" /></div>
                <div className="mb-4 w-full relative"><label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(0,0,0,0.45)]">Mot de passe</label><input name="password" type={showPw.l ? 'text' : 'password'} required placeholder="••••••••" className="w-full premium-input pr-11" /><button type="button" onClick={() => setShowPw({ ...showPw, l: !showPw.l })} className="absolute right-3 top-[38px] bg-transparent border-none text-[rgba(0,0,0,0.35)] cursor-pointer p-0.5"><i className={`fas ${showPw.l ? 'fa-eye-slash' : 'fa-eye'}`}></i></button></div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">{loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-arrow-right"></i> Se connecter</>}</button>
                <div className="mt-3"><a href="/forgot-password" className="text-[0.72rem] text-[#22C55E] font-medium hover:underline">Mot de passe oublié ?</a></div>
              </form>
            ) : (
              <form onSubmit={handleRegister}>
                <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(0,0,0,0.45)]">Nom complet</label><input name="name" type="text" required placeholder="Jean Dupont" minLength={2} className={`w-full premium-input ${errors.name ? '!border-[#F87171]' : ''}`} />{errors.name && <p className="text-[#F87171] text-[0.65rem] mt-0.5">{errors.name}</p>}</div>
                <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(0,0,0,0.45)]">Email</label><input name="email" type="email" required placeholder="votre@email.com" className="w-full premium-input" /></div>
                <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(0,0,0,0.45)]">Numéro de téléphone</label><input name="phone" type="tel" required placeholder="+228 90 12 34 56" className={`w-full premium-input ${errors.phone ? '!border-[#F87171]' : ''}`} />{errors.phone && <p className="text-[#F87171] text-[0.65rem] mt-0.5">{errors.phone}</p>}</div>
                <div className="mb-2.5 w-full relative"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(0,0,0,0.45)]">Mot de passe</label><input name="password" type={showPw.r ? 'text' : 'password'} required placeholder="Min. 6 caractères" minLength={6} className={`w-full premium-input pr-11 ${errors.password ? '!border-[#F87171]' : ''}`} /><button type="button" onClick={() => setShowPw({ ...showPw, r: !showPw.r })} className="absolute right-3 top-[34px] bg-transparent border-none text-[rgba(0,0,0,0.35)] cursor-pointer p-0.5"><i className={`fas ${showPw.r ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>{errors.password && <p className="text-[#F87171] text-[0.65rem] mt-0.5">{errors.password}</p>}</div>
                <div className="mb-2.5 w-full relative"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(0,0,0,0.45)]">Confirmer</label><input name="password2" type={showPw.r2 ? 'text' : 'password'} required placeholder="••••••••" className={`w-full premium-input pr-11 ${errors.password2 ? '!border-[#F87171]' : ''}`} /><button type="button" onClick={() => setShowPw({ ...showPw, r2: !showPw.r2 })} className="absolute right-3 top-[34px] bg-transparent border-none text-[rgba(0,0,0,0.35)] cursor-pointer p-0.5"><i className={`fas ${showPw.r2 ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>{errors.password2 && <p className="text-[#F87171] text-[0.65rem] mt-0.5">{errors.password2}</p>}</div>
                <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(0,0,0,0.45)]">Code de parrainage <span className="opacity-50">(optionnel)</span></label><input name="referralCode" type="text" placeholder="BR-XXXXXX" defaultValue={prefilledReferral} className={`w-full premium-input ${prefilledReferral ? '!border-[#22C55E] !bg-[rgba(34,197,94,0.04)]' : ''}`} />{prefilledReferral && <p className="text-[#22C55E] text-[0.6rem] mt-0.5 font-medium"><i className="fas fa-user-friends mr-1"></i>Code de parrainage appliqué !</p>}</div>
                <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl btn-gradient-green text-[0.88rem] cursor-pointer transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">{loading ? <><div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /><span>Envoi du code...</span></> : <><i className="fas fa-user-plus"></i> Créer mon compte</>}</button>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ==================== HOME SCREEN ====================
function HomeScreen() {
  const { user, setPage, setUser, addToast } = useAppStore();
  const [tip] = useState(() => AI_TIPS[Math.floor(Math.random() * AI_TIPS.length)]);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyNotif, setDailyNotif] = useState<{ message: string; referrals: number; required: number; code: string } | null>(null);
  const [dailyNotifShown, setDailyNotifShown] = useState(false);

  // Fetch daily notification once per session
  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const lastShown = typeof window !== 'undefined' ? localStorage.getItem('br_daily_notif_date') : '';
    if (lastShown === today || dailyNotifShown) return;
    (async () => {
      try {
        const res = await authFetch('/api/notifications/daily');
        const data = await res.json();
        if (data.success && data.data) {
          setDailyNotif({ message: data.data.message, referrals: data.data.referralCount || 0, required: data.data.requiredReferrals || 10, code: data.data.referralCode || '' });
          localStorage.setItem('br_daily_notif_date', today);
        }
      } catch { /* */ }
    })();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDailyNotifShown(true);
  }, [user, dailyNotifShown]);

  const refresh = async () => {
    setRefreshing(true);
    try { await refreshUser(); } catch { /* */ }
    setRefreshing(false);
  };

  if (!user) return null;
  const txs = user.transactions?.slice(0, 5) || [];

  return (
    <>
      <Header title={<><LogoImg className="w-[26px] h-[26px] rounded-md" style={{ objectFit: 'contain' }} /> <span className="text-[#1F2937] font-black">Be Rich</span></>} rightElement={
        <div className="flex items-center gap-1.5">
          <NotificationBell />
          <button onClick={refresh} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.6)] backdrop-blur-sm text-[rgba(0,0,0,0.55)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90"><i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`} /></button>
        </div>
      } />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
        {/* Daily Notification Popup */}
        {dailyNotif && (
          <div className="mb-4 rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)', animation: 'modalIn 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <button onClick={() => setDailyNotif(null)} className="absolute top-2 right-3 bg-transparent border-none text-white/60 cursor-pointer text-[0.75rem]"><i className="fas fa-times"></i></button>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0"><i className="fas fa-bullhorn text-white text-[0.85rem]"></i></div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.68rem] text-white/70 font-bold uppercase tracking-[1px] mb-1">Notification du jour</div>
                <div className="text-[0.78rem] text-white font-semibold leading-snug mb-2">{dailyNotif.message}</div>
                <div className="flex items-center gap-3 text-[0.65rem] text-white/80">
                  <span><i className="fas fa-users mr-1"></i>{dailyNotif.referrals}/{dailyNotif.required} parrainés</span>
                  <span><i className="fas fa-key mr-1"></i>{dailyNotif.code}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Welcome + Balance Card — Premium Gradient */}
        <div className="gradient-card rounded-2xl p-5 mb-4 relative overflow-hidden">
          {/* Decorative orbs */}
          <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(255,255,255,0.15),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite' }} />
          <div className="absolute -bottom-10 -left-10 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite 4s reverse' }} />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[rgba(0,0,0,0.7)] text-[0.75rem]">Bienvenue, <span className="text-[#000000] font-semibold">{esc(user.name)}</span></p>
              {user.depositCount > 0 && (
                <span className="bg-[rgba(0,0,0,0.1)] text-[#000000] text-[0.6rem] font-bold px-2.5 py-[3px] rounded-full">{user.depositCount} dépôt{user.depositCount > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="text-[0.5rem] text-[rgba(0,0,0,0.45)] uppercase tracking-[0.5px] font-semibold mb-0.5">Solde total</div>
            <div className="flex items-baseline gap-2 mb-3">
              <div className="text-[1.8rem] font-black tracking-[-1px] text-[#000000]">{formatMoney(user.balance)}</div>
              <button onClick={() => setPage('deposit')} className="ml-auto py-2 px-3.5 rounded-xl bg-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.35)] text-[#000000] text-[0.68rem] font-semibold cursor-pointer border-none transition-all active:scale-95 flex items-center gap-1.5 backdrop-blur-sm">
                <i className="fas fa-arrow-down text-[0.6rem]"></i> Déposer
              </button>
            </div>
            {/* Compact 2x2 Account Grid — Glass Cards */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="glass-card rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 icon-box bg-[rgba(34,197,94,0.15)] shrink-0"><i className="fas fa-wallet text-[0.65rem] text-[#22C55E]"></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(0,0,0,0.45)] uppercase tracking-[0.3px] leading-tight">Principal</div>
                  <div className="text-[0.8rem] font-black text-[#000000] leading-tight">{formatMoney(user.balance)}</div>
                </div>
              </div>
              <div className="glass-card rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 icon-box bg-[rgba(245,158,11,0.15)] shrink-0"><i className="fas fa-dice text-[0.65rem] text-[#F59E0B]"></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(0,0,0,0.45)] uppercase tracking-[0.3px] leading-tight">Jeu</div>
                  <div className="text-[0.8rem] font-black text-[#000000] leading-tight">{formatMoney(user.gameTotalWon || 0)}</div>
                </div>
              </div>
              <div className="glass-card rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 icon-box bg-[rgba(139,92,246,0.15)] shrink-0"><i className="fas fa-building text-[0.65rem] text-[#8B5CF6]"></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(0,0,0,0.45)] uppercase tracking-[0.3px] leading-tight">Projets</div>
                  <div className="text-[0.8rem] font-black text-[#000000] leading-tight">{formatMoney(user.projectBalance)}</div>
                </div>
              </div>
              <div className="glass-card rounded-lg p-2.5 flex items-center gap-2">
                <div className="w-8 h-8 icon-box bg-[rgba(20,184,166,0.15)] shrink-0"><i className="fas fa-video text-[0.65rem] text-[#14B8A6]"></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(0,0,0,0.45)] uppercase tracking-[0.3px] leading-tight">Vidéo</div>
                  <div className="text-[0.8rem] font-black text-[#000000] leading-tight">{formatMoney(user.videoBalance || 0)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions — Colored bottom borders */}
        <div className="flex gap-2 mb-4">
          {[
            { icon: 'fa-wallet', label: 'Wallet', page: 'wallet', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', borderColor: 'border-[#22C55E]' },
            { icon: 'fa-chart-line', label: 'Investir', page: 'invest', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', borderColor: 'border-[#3B82F6]' },
            { icon: 'fa-dice', label: 'Jeu', page: 'game', color: '#F87171', bg: 'rgba(248,113,113,0.12)', borderColor: 'border-[#F87171]' },
            { icon: 'fa-building', label: 'Projets', page: 'enterprise', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', borderColor: 'border-[#8B5CF6]' },
          ].map((a, i) => (
            <button key={i} onClick={() => setPage(a.page)} className={`flex-1 glass-card rounded-xl py-2.5 px-1 text-center cursor-pointer transition-all active:scale-95 hover:shadow-md hover:scale-[1.04] border-b-2 ${a.borderColor}`}>
              <div className="w-10 h-10 icon-box mx-auto mb-1" style={{ backgroundColor: a.bg }}><i className={`fas ${a.icon} text-[0.9rem]`} style={{ color: a.color }}></i></div>
              <div className="text-[0.6rem] font-semibold text-[rgba(0,0,0,0.55)] leading-tight">{a.label}</div>
            </button>
          ))}
        </div>

        {/* AI Tip Card — Purple gradient left border + glow */}
        <div className="bg-[rgba(139,92,246,0.04)] border border-[rgba(139,92,246,0.12)] rounded-xl p-3.5 mb-4 flex items-center gap-3" style={{ borderLeft: '5px solid', borderImage: 'linear-gradient(to bottom, #8B5CF6, #6D28D9) 1', boxShadow: '0 0 12px rgba(139,92,246,0.08)' }}>
          <div className="w-10 h-10 icon-box bg-[rgba(139,92,246,0.12)] shrink-0 border border-[rgba(139,92,246,0.15)]"><i className="fas fa-robot text-[#8B5CF6] text-[0.9rem]"></i></div>
          <div className="flex-1 min-w-0"><div className="text-[0.6rem] text-[#8B5CF6] font-bold uppercase tracking-[1px] mb-0.5">IA Be Rich</div><div className="text-[0.75rem] leading-relaxed text-[rgba(0,0,0,0.7)]">{tip}</div></div>
        </div>

        {/* Promo Banner */}
        <PromoBanner />

        {/* Quick Guide Link — Teal left border accent */}
        <button onClick={() => setPage('guide')} className="w-full glass-card rounded-xl p-3.5 mb-4 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98] hover:translate-x-1" style={{ borderLeft: '4px solid #14B8A6' }}>
          <div className="w-10 h-10 icon-box bg-[rgba(20,184,166,0.12)] shrink-0"><i className="fas fa-compass text-[#14B8A6] text-[1rem]"></i></div>
          <div className="flex-1 text-left">
            <div className="text-[0.82rem] font-bold text-[#1F2937]">Guide & Analyses</div>
            <div className="text-[0.62rem] text-[rgba(0,0,0,0.45)]">Tout savoir pour bien investir · Signaux de marché</div>
          </div>
          <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] text-[0.7rem]"></i>
        </button>

        {/* Referral Gift Teaser — Gold gradient left border + shimmer */}
        <button onClick={() => setPage('profile')} className="w-full glass-card rounded-xl p-3 mb-4 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]" style={{ borderLeft: '4px solid', borderImage: 'linear-gradient(to bottom, #F59E0B, #D97706) 1' }}>
          <div className="w-9 h-9 icon-box bg-[rgba(245,158,11,0.15)] shrink-0"><i className="fas fa-gift text-[#F59E0B] text-[0.9rem]" style={{ animation: 'shimmer 1.5s linear infinite', background: 'linear-gradient(90deg, #D97706 0%, #FCD34D 30%, #FBBF24 50%, #FCD34D 70%, #D97706 100%)', backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}></i></div>
          <div className="flex-1 text-left">
            <div className="text-[0.75rem] font-bold text-[#1F2937]">Un cadeau vous attend</div>
            <div className="text-[0.58rem] text-[rgba(0,0,0,0.45)]">Parrainez vos amis pour débloquer des horizons</div>
          </div>
          <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] text-[0.65rem]"></i>
        </button>

        {/* Recent Activity */}
        {txs.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1F2937] mb-2.5 flex items-center gap-2"><span className="w-1 h-4 rounded-full bg-[#22C55E] inline-block"></span>Activité récente</h3>
            <div className="glass-card rounded-2xl p-4 mb-4">
              {txs.map((tx, i) => {
                const isD = tx.type === 'deposit' || tx.type === 'claim' || tx.type === 'enterprise_claim' || tx.type === 'trade_win';
                const isW = tx.type === 'withdrawal' || tx.type === 'trade_lose' || tx.type === 'enterprise_crash';
                return (
                  <div key={tx.id || i} className={`flex items-center gap-3 py-2.5 stagger-${i + 1} rounded-lg px-1 -mx-1 transition-all hover:bg-[rgba(34,197,94,0.04)] ${i < txs.length - 1 ? 'border-b border-[rgba(0,0,0,0.08)]' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[0.7rem] shrink-0 ${isD ? 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80]' : isW ? 'bg-[rgba(248,113,113,0.12)] text-[#F87171]' : 'bg-[rgba(34,197,94,0.12)] text-[#22C55E]'}`}>
                      <i className={`fas fa-${isW ? 'arrow-up' : isD ? 'arrow-down' : 'exchange-alt'}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.75rem] font-semibold text-[#1F2937]">{tx.detail || tx.type}</div>
                      <div className="text-[0.6rem] text-[rgba(0,0,0,0.35)]">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div className={`text-[0.82rem] font-bold ${isW ? 'text-[#F87171]' : 'text-[#4ADE80]'}`}>{isW ? '-' : '+'}{formatMoney(Math.abs(tx.amount))}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ==================== WALLET SCREEN ====================
type TransferTarget = { from: string; to: string; label: string; fee: boolean; fromColor: string; toColor: string; fromIcon: string; toIcon: string };

function WalletScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [transferTarget, setTransferTarget] = useState<TransferTarget | null>(null);
  const [transferAmt, setTransferAmt] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gameStatus, setGameStatus] = useState<{ spinsRemaining: number; totalWonToday: number } | null>(null);
  const [investSummary, setInvestSummary] = useState<{ totalInvested: number; totalEarned: number; active: number } | null>(null);

  const refresh = async () => { setRefreshing(true); try { await refreshUser(); } catch { /* */ } setRefreshing(false); };

  // Fetch game status + investment summary in parallel on mount (silent failures)
  useEffect(() => {
    let cancelled = false;
    const loadExtras = async () => {
      const [invRes, gameRes] = await Promise.allSettled([
        authFetch('/api/invest/list'),
        authFetch('/api/game/status'),
      ]);
      if (cancelled) return;
      if (invRes.status === 'fulfilled') {
        try {
          const data = await invRes.value.json();
          if (data.success && data.summary) {
            setInvestSummary({
              totalInvested: data.summary.totalInvested || 0,
              totalEarned: data.summary.totalEarned || 0,
              active: data.summary.active || 0,
            });
          }
        } catch { /* ignore */ }
      }
      if (gameRes.status === 'fulfilled') {
        try {
          const data = await gameRes.value.json();
          if (data.success) {
            setGameStatus({
              spinsRemaining: data.spinsRemaining ?? 10,
              totalWonToday: data.totalWonToday || 0,
            });
          }
        } catch { /* ignore */ }
      }
    };
    loadExtras();
    return () => { cancelled = true; };
  }, []);

  const handleTransfer = async () => {
    const amt = parseFloat(transferAmt);
    if (!amt || amt < 2) { addToast('Minimum 2 $', 'error'); return; }
    if (!transferTarget) return;
    setTransferring(true);
    try {
      const res = await authFetch('/api/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: transferTarget.from, to: transferTarget.to, amount: amt }) });
      const data = await res.json();
      if (data.success) {
        // Level-2 hold: funds sent to escrow for 10 days — surface the API's message verbatim.
        if (data.held) addToast(data.message || 'Transfert en cours. Les fonds seront disponibles sous 10 jours.', 'info');
        else addToast('Transfert effectué !', 'success');
        setTransferAmt(''); setTransferTarget(null); await refreshUser();
      }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setTransferring(false);
  };

  if (!user) return null;

  // Vidéo account is funded only by watching videos (no deposit/transfer),
  // so it's a display-only card. Project is transferable to/from Principal.
  const accounts = [
    { key: 'video', label: 'Compte Vidéo', balance: user.videoBalance || 0, icon: 'fa-video', iconColor: '#14B8A6', iconBg: 'bg-[rgba(20,184,166,0.12)]', borderColor: '#14B8A6', transferable: false },
    { key: 'project', label: 'Compte de Projet', balance: user.projectBalance, icon: 'fa-building', iconColor: '#8B5CF6', iconBg: 'bg-[rgba(139,92,246,0.12)]', borderColor: '#8B5CF6', transferable: true },
  ] as const;

  // Label helper for the transfer modal — 'trade' intentionally absent (trading account removed).
  const accountLabel = (k: string) =>
    k === 'principal' ? 'Principal' : k === 'invest' ? 'Investissement' : k === 'project' ? 'Projets' : k === 'video' ? 'Vidéo' : k;

  // Derived values from API (silent fallbacks if fetch failed)
  const spinsRemaining = gameStatus?.spinsRemaining ?? 10;
  const totalWonToday = gameStatus?.totalWonToday ?? 0;
  const totalInvested = investSummary?.totalInvested ?? 0;
  const totalEarned = investSummary?.totalEarned ?? 0;
  const activeInvestments = investSummary?.active ?? 0;

  return (
    <>
      <Header title="Portefeuille" icon="fa-wallet" iconColor="#22C55E" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(255,255,255,0.6)] backdrop-blur-sm text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} rightElement={<button onClick={refresh} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(255,255,255,0.6)] backdrop-blur-sm text-[rgba(0,0,0,0.55)] cursor-pointer border-none"><i className={`fas fa-sync-alt text-[0.7rem] ${refreshing ? 'animate-spin' : ''}`} /></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0">
        {/* Principal Balance — Gradient Card */}
        <div className="gradient-card rounded-2xl p-5 mb-3 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(255,255,255,0.15),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite' }} />
          <div className="absolute -bottom-10 -left-10 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(255,255,255,0.1),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite 4s reverse' }} />
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-9 h-9 icon-box bg-white/20"><i className="fas fa-wallet text-[0.85rem] text-white"></i></div>
              <div className="text-[0.7rem] text-white/70 font-semibold uppercase tracking-[1.5px]">Compte Principal</div>
            </div>
            <div className="text-[2rem] font-black tracking-[-1px] text-white mb-3">{formatMoney(user.balance)}</div>
            <button onClick={() => setPage('withdraw')} className="w-full py-[11px] rounded-xl text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-white/15 text-white hover:bg-white/25 transition-colors"><i className="fas fa-arrow-up"></i> Retirer</button>
            <button onClick={() => setPage('invest')} className="mt-2 w-full text-[0.66rem] text-white/70 hover:text-white underline-offset-2 hover:underline transition-colors border-none bg-transparent cursor-pointer"><i className="fas fa-info-circle mr-1"></i>Les dépôts se font directement dans les niveaux d&apos;investissement</button>
          </div>
        </div>

        {/* Promo Banner — compact */}
        <PromoBanner compact />

        {/* Section header — Mes comptes */}
        <div className="flex justify-between items-center mb-2.5 mt-1">
          <h3 className="text-[0.9rem] font-bold text-[#1F2937]">Mes comptes</h3>
        </div>

        {/* Compte Jeu — Amber card with dice icon */}
        <div className="glass-card rounded-2xl p-4 mb-3" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 icon-box bg-[rgba(245,158,11,0.12)]"><i className="fas fa-dice text-[0.9rem]" style={{ color: '#F59E0B' }}></i></div>
              <div>
                <div className="text-[0.7rem] text-[rgba(0,0,0,0.5)] font-semibold uppercase tracking-[1.5px]">Compte Jeu</div>
                <div className="text-[0.55rem] text-[#F59E0B] font-semibold mt-0.5">Roue de la fortune</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[1.3rem] font-black text-[#1F2937]">{formatMoney(user.gameTotalWon || 0)}</div>
              <div className="text-[0.55rem] text-[rgba(0,0,0,0.45)] font-medium">{spinsRemaining} tours restants · {formatMoney(totalWonToday)} aujourd&apos;hui</div>
            </div>
          </div>
          <button onClick={() => setPage('game')} className="w-full py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none text-white transition-transform active:scale-95" style={{ background: 'linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)' }}><i className="fas fa-play text-[0.65rem]"></i> Jouer maintenant</button>
        </div>

        {/* Compte Investissement — Teal card with seedling icon */}
        <div className="glass-card rounded-2xl p-4 mb-3" style={{ borderLeft: '4px solid #14B8A6' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 icon-box bg-[rgba(20,184,166,0.12)]"><i className="fas fa-seedling text-[0.9rem]" style={{ color: '#0F766E' }}></i></div>
              <div>
                <div className="text-[0.7rem] text-[rgba(0,0,0,0.5)] font-semibold uppercase tracking-[1.5px]">Compte Investissement</div>
                <div className="text-[0.55rem] text-[#0F766E] font-semibold mt-0.5">+{formatMoney(totalEarned)} gagnés · {activeInvestments} actif{activeInvestments > 1 ? 's' : ''}</div>
              </div>
            </div>
            <div className="text-[1.3rem] font-black text-[#1F2937]">{formatMoney(totalInvested)}</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTransferTarget({ from: 'invest', to: 'principal', label: 'Retirer vers Principal', fee: false, fromColor: '#14B8A6', toColor: '#22C55E', fromIcon: 'fa-seedling', toIcon: 'fa-wallet' })} className="flex-1 py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none text-white transition-transform active:scale-95" style={{ background: 'linear-gradient(90deg, #14B8A6 0%, #0F766E 100%)' }}><i className="fas fa-arrow-left text-[0.65rem]"></i> Retirer vers Principal</button>
            <button onClick={() => setPage('invest')} className="flex-1 py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border border-[rgba(20,184,166,0.25)] bg-transparent text-[#0F766E] transition-transform active:scale-95"><i className="fas fa-list text-[0.65rem]"></i> Voir mes investissements</button>
          </div>
          <p className="mt-2 text-[0.6rem] text-[rgba(0,0,0,0.45)] flex items-center gap-1"><i className="fas fa-info-circle text-[#0F766E]"></i>Pour retirer, transférez vers le compte principal.</p>
        </div>

        {/* Autres comptes — Vidéo et Projet (Glass Cards with colored left border) */}
        {accounts.map((acc) => (
          <div key={acc.key} className="glass-card rounded-2xl p-4 mb-3" style={{ borderLeft: `4px solid ${acc.borderColor}` }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 icon-box ${acc.iconBg}`}><i className={`fas ${acc.icon} text-[0.9rem]`} style={{ color: acc.iconColor }}></i></div>
                <div>
                  <div className="text-[0.7rem] text-[rgba(0,0,0,0.5)] font-semibold uppercase tracking-[1.5px]">{acc.label}</div>
                  {acc.key === 'video' && <div className="text-[0.55rem] text-[#14B8A6] font-semibold mt-0.5">Alimenté par les vidéos regardées</div>}
                </div>
              </div>
              <div className="text-[1.3rem] font-black text-[#1F2937]">{formatMoney(acc.balance)}</div>
            </div>
            {acc.transferable ? (
              <div className="flex gap-2">
                <button onClick={() => setTransferTarget({ from: 'principal', to: acc.key, label: `Verser vers ${acc.label}`, fee: true, fromColor: '#22C55E', toColor: acc.iconColor, fromIcon: 'fa-wallet', toIcon: acc.icon })} className="flex-1 py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none bg-[rgba(34,197,94,0.12)] text-[#22C55E] hover:bg-[rgba(34,197,94,0.18)] transition-colors"><i className="fas fa-arrow-right text-[0.65rem]"></i> Verser</button>
                <button onClick={() => setTransferTarget({ from: acc.key, to: 'principal', label: `Retirer vers Principal`, fee: false, fromColor: acc.iconColor, toColor: '#22C55E', fromIcon: acc.icon, toIcon: 'fa-wallet' })} className="flex-1 py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.7)]"><i className="fas fa-arrow-left text-[0.65rem]"></i> Retirer</button>
              </div>
            ) : (
              <button onClick={() => setPage('videos')} className="w-full py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none bg-[rgba(20,184,166,0.10)] text-[#0F766E] hover:bg-[rgba(20,184,166,0.16)] transition-colors"><i className="fas fa-play text-[0.65rem]"></i> Regarder des vidéos</button>
            )}
          </div>
        ))}

        {/* Transfer Modal — Frosted Glass */}
        {transferTarget && (
          <div className="fixed inset-0 bg-[rgba(0,0,0,0.25)] z-[6000] flex items-center justify-center" style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }} onClick={() => setTransferTarget(null)}>
            <div className="glass-card rounded-2xl w-[88%] max-w-[340px] overflow-hidden" style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="p-5 relative overflow-hidden border-b border-[rgba(0,0,0,0.06)]">
                <h3 className="text-[1rem] font-bold text-[#1F2937] mb-2">{transferTarget.label}</h3>
                {/* From → To visual */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.04)] rounded-lg px-2.5 py-1.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[rgba(34,197,94,0.12)]"><i className={`fas ${transferTarget.fromIcon} text-[0.5rem] text-[#22C55E]`}></i></div>
                    <span className="text-[0.65rem] font-medium text-[rgba(0,0,0,0.55)]">{accountLabel(transferTarget.from)}</span>
                  </div>
                  <i className="fas fa-arrow-right text-[0.6rem] text-[rgba(0,0,0,0.35)]"></i>
                  <div className="flex items-center gap-1.5 bg-[rgba(0,0,0,0.04)] rounded-lg px-2.5 py-1.5">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[rgba(34,197,94,0.12)]"><i className={`fas ${transferTarget.toIcon} text-[0.5rem] text-[#22C55E]`}></i></div>
                    <span className="text-[0.65rem] font-medium text-[rgba(0,0,0,0.55)]">{accountLabel(transferTarget.to)}</span>
                  </div>
                </div>
              </div>
              {/* Modal Body */}
              <div className="p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <i className={`fas ${transferTarget.fee ? 'fa-percentage text-[#22C55E]' : 'fa-check-circle text-[#4ADE80]'} text-[0.7rem]`}></i>
                  <p className="text-[0.75rem] text-[rgba(0,0,0,0.55)]">{transferTarget.fee ? 'Frais de 2% sur le transfert' : 'Transfert sans frais'}</p>
                </div>
                <input type="number" step="0.01" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} placeholder="Montant (min 2 $)" className="w-full premium-input mb-4" />
                <div className="flex gap-2">
                  <button onClick={() => { setTransferTarget(null); setTransferAmt(''); }} className="flex-1 py-3.5 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[rgba(0,0,0,0.55)] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95">Annuler</button>
                  <button onClick={handleTransfer} disabled={transferring} className="flex-1 py-3.5 rounded-xl btn-gradient-green text-[0.82rem] cursor-pointer disabled:opacity-60 transition-transform active:scale-95">{transferring ? '...' : 'Confirmer'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats — Vertical readable list (replaces previous cramped 2-col grid) */}
        <div className="glass-card rounded-2xl p-1.5 mb-4">
          {[
            { icon: 'fa-chart-line', color: '#22C55E', bg: 'bg-[rgba(34,197,94,0.10)]', label: 'Gains totaux', value: formatMoney(user.totalProfit || 0), sub: 'Cumul des gains' },
            { icon: 'fa-arrow-trend-down', color: '#F87171', bg: 'bg-[rgba(248,113,113,0.10)]', label: 'Pertes totales', value: formatMoney(user.totalLoss || 0), sub: 'Cumul des pertes' },
            { icon: 'fa-video', color: '#14B8A6', bg: 'bg-[rgba(20,184,166,0.10)]', label: 'Solde vidéo', value: formatMoney(user.videoBalance || 0), sub: 'Compte vidéo autonome' },
            { icon: 'fa-seedling', color: '#14B8A6', bg: 'bg-[rgba(20,184,166,0.10)]', label: 'Solde investissement', value: formatMoney(user.investBalance || 0), sub: 'Compte d\'investissement' },
            { icon: 'fa-building', color: '#8B5CF6', bg: 'bg-[rgba(139,92,246,0.10)]', label: 'Solde projet', value: formatMoney(user.projectBalance || 0), sub: 'Compte de projet' },
          ].map((s, i, arr) => (
            <div key={s.label} className={`flex items-center gap-3 px-3 py-3 ${i < arr.length - 1 ? 'border-b border-[rgba(0,0,0,0.05)]' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
                <i className={`fas ${s.icon} text-[0.85rem]`} style={{ color: s.color }}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.8rem] font-semibold text-[#1F2937]">{s.label}</div>
                <div className="text-[0.62rem] text-[rgba(0,0,0,0.4)]">{s.sub}</div>
              </div>
              <div className="text-[0.95rem] font-bold tracking-[-0.3px]" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Recent transactions shortcut */}
        <button onClick={() => setPage('home')} className="w-full glass-card rounded-2xl p-3.5 mb-4 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]">
          <div className="w-9 h-9 icon-box bg-[rgba(34,197,94,0.12)] shrink-0"><i className="fas fa-clock-rotate-left text-[#22C55E] text-[0.85rem]"></i></div>
          <div className="flex-1 text-left">
            <div className="text-[0.82rem] font-bold text-[#1F2937]">Activité récente</div>
            <div className="text-[0.62rem] text-[rgba(0,0,0,0.45)]">Voir vos dernières transactions sur l&apos;accueil</div>
          </div>
          <i className="fas fa-chevron-right text-[rgba(0,0,0,0.35)] text-[0.7rem]"></i>
        </button>
      </div>
    </>
  );
}

// ==================== FINANCE SCREEN ====================
function FinanceScreen() {
  const [subTab, setSubTab] = useState<'invest' | 'game' | 'projects'>('invest');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header with 3 pill tabs — Gradient Active */}
      <div className="flex gap-2 px-[18px] py-2.5 bg-white/80 backdrop-blur-2xl border-b border-[rgba(0,0,0,0.04)]">
        {[
          { id: 'invest', label: 'Invest', icon: 'fa-chart-line' },
          { id: 'game', label: 'Jeu', icon: 'fa-dice' },
          { id: 'projects', label: 'Projets', icon: 'fa-building' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as 'invest' | 'game' | 'projects')}
            className={`flex-1 py-2 rounded-xl text-[0.75rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              subTab === t.id
                ? 'bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white shadow-md'
                : 'bg-[rgba(0,0,0,0.04)] text-[rgba(0,0,0,0.5)]'
            }`}
          >
            <i className={`fas ${t.icon} text-[0.65rem]`}></i>
            {t.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {subTab === 'invest' && <InvestHubScreen />}
        {subTab === 'game' && <SpinGameScreen />}
        {subTab === 'projects' && <EnterpriseScreen />}
      </div>
    </div>
  );
}

// ==================== BOTTOM NAV ====================
function BottomNav() {
  const { currentPage, setPage } = useAppStore();
  const tabs = [
    { id: 'videos', icon: 'fa-video', label: 'Vidéos' },
    { id: 'home', icon: 'fa-coins', label: 'Make Money' },
    { id: 'guide', icon: 'fa-compass', label: 'Guide' },
    { id: 'profile', icon: 'fa-user', label: 'Profil' },
  ];
  const isActive = (tabId: string) => {
    if (tabId === 'home') return ['home', 'finance', 'invest', 'game', 'enterprise', 'wallet', 'deposit', 'withdraw'].includes(currentPage);
    if (tabId === 'guide') return currentPage === 'guide';
    return currentPage === tabId;
  };
  return (
    <nav className="h-[60px] bg-white/90 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] flex items-center justify-around px-2 shrink-0 safe-area-bottom">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} className={`flex flex-col items-center justify-center py-1.5 px-2 border-none cursor-pointer transition-all relative ${isActive(t.id) ? 'text-[#22C55E]' : 'text-[rgba(0,0,0,0.3)]'}`}>
          {isActive(t.id) && <div className="absolute -top-0.5 w-5 h-[3px] rounded-full bg-[#22C55E]"></div>}
          <i className={`fas ${t.icon} text-[0.95rem] mb-0.5`}></i>
          <span className={`text-[0.55rem] ${isActive(t.id) ? 'font-bold text-[#22C55E]' : 'font-semibold'}`}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ==================== SERVICE WORKER REGISTRAR ====================
function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failed silently
      });
    }
  }, []);
  return null;
}

// ==================== MAIN APP ====================
export default function BeRichApp() {
  const { user, currentPage, setPage, setUser, showSplash, setShowSplash } = useAppStore();
  const { currentAd, dismissAd } = useTabChangeAd(currentPage);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await authFetch('/api/auth/session');
        const data = await res.json();
        if (data.success && data.user) { setUser(data.user); setPage('videos'); }
        else { setPage('auth'); }
      } catch { setPage('auth'); }
      setInitialized(true);
      setShowSplash(false);
    };
    init();
  }, []);

  const handleSplashDone = useCallback(() => { setShowSplash(false); }, [setShowSplash]);

  if (!initialized) {
    return (<div className="bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] h-screen flex items-center justify-center"><div className="w-8 h-8 border-[3px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div>);
  }

  const showNav = user && !['auth'].includes(currentPage);

  return (
    <ErrorBoundary>
    <div className="bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] min-h-screen flex items-center justify-center">
      <div id="app" className="w-full max-w-[430px] h-[100dvh] max-h-[932px] bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] relative overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)] noise-bg">
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes gs { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
          @keyframes spFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
          @keyframes orbFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
          @keyframes tIn { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes nIn { from { opacity: 0; transform: translateY(-12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes modalIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
          @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); } 50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); } }
          @keyframes claimPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); transform: scale(1); } 50% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); transform: scale(1.03); } }
          @keyframes logoPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        `}</style>
        {showSplash && <SplashScreen onDone={handleSplashDone} />}
        <div className="h-full flex flex-col min-h-0">
          {!user && <AuthScreen />}
          {user && currentPage === 'videos' && <VideoPlatformScreen />}
          {user && currentPage === 'home' && <HomeScreen />}
          {user && currentPage === 'wallet' && <WalletScreen />}
          {user && currentPage === 'finance' && <FinanceScreen />}
          {user && currentPage === 'invest' && <InvestHubScreen />}
          {user && currentPage === 'game' && <SpinGameScreen />}
          {user && currentPage === 'enterprise' && <EnterpriseScreen />}
          {user && currentPage === 'profile' && <ProfileScreen />}
          {user && currentPage === 'analytics' && <AnalyticsScreen />}
          {user && currentPage === 'withdraw' && <WithdrawScreen />}
          {user && currentPage === 'admin' && <AdminScreen />}
          {user && currentPage === 'chat' && <ChatScreen />}
          {user && currentPage === 'deposit' && <DepositScreen />}
          {user && currentPage === 'guide' && <GuideScreen />}
          {showNav && <BottomNav />}
          {user && (currentPage === 'home' || currentPage === 'videos') && <FloatingGift />}
          <InstallPrompt />
        </div>
        <TabChangeAd ad={currentAd} onClose={dismissAd} />
        <ToastContainer />
        <NotificationContainer />
        {user && <RefreshReminderBanner />}
        {user && <WithdrawalTicker />}
      </div>
      <ServiceWorkerRegistrar />
    </div>
    </ErrorBoundary>
  );
}
