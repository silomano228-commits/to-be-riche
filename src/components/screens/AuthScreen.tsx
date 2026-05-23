'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { LogoImg } from '@/components/shared';

export default function AuthScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState({ l: false, r: false, r2: false });
  const [pwStrength, setPwStrength] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target as HTMLFormElement);
      const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        addToast('Bienvenue, ' + data.user.name, 'success');
        setPage('home');
      } else {
        addToast(data.error, 'error');
      }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const name = (fd.get('name') as string)?.trim() || '';
    const email = (fd.get('email') as string)?.trim() || '';
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
      const res = await fetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, password2, referralCode }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        addToast('Compte créé !', 'success');
        setPage('home');
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  const checkStrength = (v: string) => {
    let s = 0;
    if (v.length >= 6) s++;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/[0-9]/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v)) s++;
    setPwStrength(s);
  };

  return (
    <section className="absolute inset-0 bg-[#0B1120] flex flex-col items-center justify-center z-[200]">
      <div className="w-full max-w-[330px] text-center px-5">
        <LogoImg className="w-[100px] h-[100px] mx-auto mb-4" style={{ filter: 'drop-shadow(0 4px 20px rgba(251,191,36,0.2))', objectFit: 'contain' }} />
        <h1 className="text-[1.8rem] font-black mb-1 bg-gradient-to-r from-[#FCD34D] via-[#FBBF24] to-[#F59E0B] bg-[length:200%_auto] text-transparent bg-clip-text tracking-[2px]" style={{ animation: 'gs 3s linear infinite' }}>BE RICH</h1>
        <p className="text-[rgba(255,255,255,0.3)] text-[0.72rem] mb-6">{mode === 'login' ? 'Connectez-vous à votre compte.' : 'Rejoignez Be Rich.'}</p>

        <div className="flex bg-[rgba(255,255,255,0.05)] rounded-xl p-[3px] mb-6 border border-[rgba(255,255,255,0.06)]">
          <button onClick={() => { setMode('login'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer font-[Inter] ${mode === 'login' ? 'bg-[rgba(255,255,255,0.08)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[rgba(255,255,255,0.35)]'}`}>Connexion</button>
          <button onClick={() => { setMode('register'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer font-[Inter] ${mode === 'register' ? 'bg-[rgba(255,255,255,0.08)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[rgba(255,255,255,0.35)]'}`}>Inscription</button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4 w-full">
              <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">Email</label>
              <input name="email" type="email" required placeholder="votre@email.com" className="w-full py-3 px-4 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.08)]" />
            </div>
            <div className="mb-4 w-full relative">
              <label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">Mot de passe</label>
              <input name="password" type={showPw.l ? 'text' : 'password'} required placeholder="••••••••" className="w-full py-3 px-4 pr-11 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853] focus:shadow-[0_0_0_3px_rgba(0,200,83,0.08)]" />
              <button type="button" onClick={() => setShowPw({ ...showPw, l: !showPw.l })} className="absolute right-3 top-[38px] bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-0.5"><i className={`fas ${showPw.l ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-arrow-right"></i> Se connecter</>}
            </button>
            <a href="/forgot-password" className="mt-4 text-[0.78rem] text-[rgba(255,255,255,0.35)] hover:text-[#FBBF24] transition-colors inline-flex items-center gap-1.5 no-underline">
              <i className="fas fa-lock text-[0.65rem]"></i> Mot de passe oublié ?
            </a>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="mb-2.5 w-full">
              <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Nom complet</label>
              <input name="name" type="text" required placeholder="Jean Dupont" minLength={2} className={`w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] ${errors.name ? 'border-red-500' : 'border-[rgba(255,255,255,0.08)]'} rounded-xl text-[0.85rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853]`} />
              {errors.name && <p className="text-red-500 text-[0.65rem] mt-0.5 font-medium">{errors.name}</p>}
            </div>
            <div className="mb-2.5 w-full">
              <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Email</label>
              <input name="email" type="email" required placeholder="votre@email.com" className="w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.85rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853]" />
            </div>
            <div className="mb-2.5 w-full relative">
              <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Mot de passe</label>
              <input name="password" type={showPw.r ? 'text' : 'password'} required placeholder="Min. 6 caractères" minLength={6} onChange={(e) => checkStrength(e.target.value)} className={`w-full py-2.5 px-3.5 pr-10 bg-[rgba(255,255,255,0.05)] border-[1.5px] ${errors.password ? 'border-red-500' : 'border-[rgba(255,255,255,0.08)]'} rounded-xl text-[0.85rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853]`} />
              <button type="button" onClick={() => setShowPw({ ...showPw, r: !showPw.r })} className="absolute right-3 top-[32px] bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-0.5"><i className={`fas ${showPw.r ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className={`h-[2px] flex-1 rounded-full transition-colors duration-300 ${pwStrength <= 1 && i === 0 ? 'bg-red-500' : pwStrength <= 2 && i <= 1 ? 'bg-red-500' : pwStrength <= 3 && i <= 2 ? 'bg-amber-500' : pwStrength >= 4 ? 'bg-green-400' : 'bg-[rgba(255,255,255,0.06)]'}`} />
                ))}
              </div>
              <p className="text-[0.6rem] mt-0.5 text-left" style={{ color: pwStrength <= 1 ? '#EF4444' : pwStrength <= 3 ? '#F59E0B' : '#00E676' }}>{pwStrength === 0 ? '' : pwStrength <= 1 ? 'Faible' : pwStrength <= 3 ? 'Bon' : 'Excellent'}</p>
            </div>
            <div className="mb-2.5 w-full relative">
              <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Confirmer</label>
              <input name="password2" type={showPw.r2 ? 'text' : 'password'} required placeholder="•••••••••" className={`w-full py-2.5 px-3.5 pr-10 bg-[rgba(255,255,255,0.05)] border-[1.5px] ${errors.password2 ? 'border-red-500' : 'border-[rgba(255,255,255,0.08)]'} rounded-xl text-[0.85rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#00C853]`} />
              <button type="button" onClick={() => setShowPw({ ...showPw, r2: !showPw.r2 })} className="absolute right-3 top-[32px] bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-0.5"><i className={`fas ${showPw.r2 ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
              {errors.password2 && <p className="text-red-500 text-[0.65rem] mt-0.5 font-medium">{errors.password2}</p>}
            </div>
            <div className="mb-2.5 w-full">
              <label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Code de parrainage <span className="opacity-50">(optionnel)</span></label>
              <input name="referralCode" type="text" placeholder="BR-XXXXXX" className="w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.85rem] outline-none transition-all font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:bg-[rgba(255,255,255,0.08)] focus:border-[#FBBF24]" />
              <p className="text-[0.58rem] mt-0.5 text-left text-[rgba(255,255,255,0.25)]">Si un ami vous a invité, entrez son code</p>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <div className="w-4 h-4 border-2 border-[rgba(120,53,15,0.3)] border-t-[#78350F] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-user-plus"></i> Créer mon compte</>}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
