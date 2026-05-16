'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, formatMoney, esc, type AppUser, type Transaction, type Project } from '@/lib/store';

const LOGO_URL = 'https://z-cdn-media.chatglm.cn/files/1153c12e-46c2-4ff4-9bfb-9ee1ea9ad677.png?auth_key=1875725907-dba9b296a2b347a582e281f8c13d5dd1-0-abc6e2dfe8db025886d8c5cccb41f197';

const PROJECTS = [
  { n: 'Tech StartUp', img: 'https://picsum.photos/seed/techx/100/100', s: '11% · Tech' },
  { n: 'Green Energy', img: 'https://picsum.photos/seed/greenx/100/100', s: '9% · Énergie' },
  { n: 'Urban Farm', img: 'https://picsum.photos/seed/farmx/100/100', s: '14% · Agro' },
];

const CATEGORY_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  'Tech': { icon: 'fa-microchip', color: '#2563EB', bg: 'bg-[#DBEAFE]' },
  'Énergie': { icon: 'fa-solar-panel', color: '#16A34A', bg: 'bg-[#DCFCE7]' },
  'Agro': { icon: 'fa-seedling', color: '#65A30D', bg: 'bg-[#ECFCCB]' },
  'Finance': { icon: 'fa-chart-pie', color: '#D97706', bg: 'bg-[#FEF3C7]' },
  'Immobilier': { icon: 'fa-building', color: '#7C3AED', bg: 'bg-[#F3E8FF]' },
  'Santé': { icon: 'fa-heartbeat', color: '#DC2626', bg: 'bg-[#FEE2E2]' },
};

function getCategoryIcon(category: string) {
  return CATEGORY_ICONS[category] || { icon: 'fa-briefcase', color: '#64748B', bg: 'bg-[#F1F5F9]' };
}

// ==================== SPLASH ====================
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setHide(true); setTimeout(onDone, 500); }, 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className={`absolute inset-0 bg-[#060A14] z-[9999] flex flex-col items-center justify-center transition-all duration-500 ${hide ? 'opacity-0 invisible' : ''}`}>
      <div className="absolute w-[200px] h-[200px] rounded-full bg-[rgba(0,200,83,0.08)] blur-[80px] top-[25%] left-[15%]" style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
      <div className="absolute w-[160px] h-[160px] rounded-full bg-[rgba(251,191,36,0.06)] blur-[80px] bottom-[20%] right-[10%]" style={{ animation: 'orbFloat 6s ease-in-out infinite 3s reverse' }} />
      <LogoImg className="w-[120px] h-[120px] mb-9" style={{ animation: 'spFloat 3s ease-in-out infinite', filter: 'drop-shadow(0 0 40px rgba(0,200,83,0.2))' }} />
      <div className="w-7 h-7 border-[2.5px] border-[rgba(255,255,255,0.06)] border-t-[#FBBF24] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
      <div className="text-[rgba(255,255,255,0.2)] mt-5 text-[0.6rem] tracking-[5px] uppercase">Chargement</div>
    </div>
  );
}

// ==================== LOGO ====================
function LogoImg({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <img
      src={LOGO_URL}
      alt="Be Rich"
      className={className}
      style={{ objectFit: 'contain', ...style }}
      onError={(e) => {
        const t = e.target as HTMLImageElement;
        const p = t.parentElement;
        if (p) {
          const div = document.createElement('div');
          div.className = `bg-gradient-to-br from-[#00E676] to-[#00C853] rounded-[22px] flex items-center justify-center text-white font-black ${className}`;
          div.textContent = 'BR';
          div.style.filter = t.style.filter;
          p.replaceChild(div, t);
        }
      }}
    />
  );
}

// ==================== TOASTS ====================
function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);
  const removeToast = useAppStore((s) => s.removeToast);
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[3000] w-[88%] max-w-[360px] flex flex-col-reverse gap-1.5 pointer-events-none items-center">
      {toasts.map((t) => (
        <div key={t.id} className="bg-[#0B1120] text-white px-5 py-3 rounded-full text-center text-[0.8rem] shadow-[0_8px_40px_rgba(0,0,0,0.08)] pointer-events-auto font-medium flex items-center justify-center gap-2"
          style={{ animation: 'tIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', borderLeft: `4px solid ${t.type === 'success' ? '#00E676' : t.type === 'error' ? '#EF4444' : '#3B82F6'}` }}>
          <span>{t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}</span>
          {esc(t.message)}
          <button onClick={() => removeToast(t.id)} className="ml-1 opacity-50 text-xs">✕</button>
        </div>
      ))}
    </div>
  );
}

// ==================== NOTIFICATIONS ====================
function NotificationContainer() {
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);
  return (
    <div className="fixed top-2.5 left-1/2 -translate-x-1/2 w-[92%] max-w-[390px] z-[2000] flex flex-col gap-1.5 pointer-events-none items-center">
      {notifications.map((n) => {
        const idPart = n.text.split(' ')[0]?.replace('ID-', '').slice(-3) || '???';
        return (
          <div key={n.id} className="bg-[rgba(255,255,255,0.96)] backdrop-blur-xl p-3 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex items-center gap-2.5 pointer-events-auto w-full"
            style={{ animation: 'nIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', borderLeft: '3px solid #00C853' }}>
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#DCFCE7] to-[#BBF7D0] shrink-0 flex items-center justify-center text-[0.52rem] font-extrabold text-[#009624]">{idPart}</div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[0.74rem] text-[#1A2332] mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis font-bold font-mono">{esc(n.text.split(' ').slice(0, 2).join(' '))} <span className="font-normal text-[0.56rem] text-gray-400">à l&apos;instant</span></h4>
              <p className="text-[0.66rem] text-[#64748B] whitespace-nowrap overflow-hidden text-ellipsis">{esc(n.text.split(' ').slice(2).join(' '))}</p>
            </div>
            <button onClick={() => removeNotification(n.id)} className="bg-transparent border-none text-gray-300 cursor-pointer p-1 text-[0.65rem]">✕</button>
          </div>
        );
      })}
    </div>
  );
}

// ==================== MODAL ====================
function Modal({ title, text, okText = 'Confirmer', okClass = 'bg-gradient-to-r from-[#00E676] to-[#00C853]', onOk, onCancel }: {
  title: string; text: string; okText?: string; okClass?: string; onOk: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-7 w-[88%] max-w-[320px] text-center shadow-[0_8px_40px_rgba(0,0,0,0.08)]" style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-2 text-[1.05rem] font-extrabold text-[#1A2332]">{title}</h3>
        <p className="text-[#64748B] text-[0.82rem] mb-5 leading-relaxed">{text}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer font-[Inter] transition-transform active:scale-95">Annuler</button>
          <button onClick={onOk} className={`flex-1 py-3 rounded-xl text-white font-semibold text-[0.82rem] cursor-pointer font-[Inter] transition-transform active:scale-95 ${okClass}`}>{okText}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== HEADER ====================
function Header({ title, icon, iconColor, rightElement }: { title: React.ReactNode; icon?: string; iconColor?: string; rightElement?: React.ReactNode }) {
  return (
    <header className="h-[58px] bg-[rgba(255,255,255,0.88)] backdrop-blur-2xl flex items-center justify-between px-[18px] sticky top-0 z-20 shrink-0 border-b border-[rgba(0,0,0,0.04)]">
      <div className="text-[1rem] font-bold text-[#1A2332] flex items-center gap-2">
        {icon && <i className={`fas ${icon} text-[0.85rem] mr-1`} style={iconColor ? { color: iconColor } : undefined} />}
        {title}
      </div>
      {rightElement || null}
    </header>
  );
}

// ==================== AUTH SCREEN ====================
function AuthScreen() {
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

// ==================== HOME SCREEN (Landing Page) ====================
function HomeScreen() {
  const { user, setPage } = useAppStore();

  if (!user) return null;

  return (
    <>
      <Header title={<><LogoImg className="w-[26px] h-[26px] rounded-md" style={{ objectFit: 'contain', filter: 'none' }} /> Be Rich</>} rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('profile')}><i className="far fa-user-circle"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-6 mb-5 relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.12),transparent_65%)]" />
          <div className="absolute -bottom-10 -left-8 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(251,191,36,0.08),transparent_65%)]" />
          <div className="relative z-[1] text-center">
            <LogoImg className="w-[64px] h-[64px] mx-auto mb-3" style={{ filter: 'drop-shadow(0 4px 20px rgba(0,200,83,0.25))' }} />
            <h2 className="text-[1.5rem] font-black tracking-[-0.5px] mb-1 bg-gradient-to-r from-[#FCD34D] via-[#FBBF24] to-[#F59E0B] bg-[length:200%_auto] text-transparent bg-clip-text" style={{ animation: 'gs 3s linear infinite' }}>Investissez. Prospérez.</h2>
            <p className="text-[rgba(255,255,255,0.5)] text-[0.78rem] leading-relaxed mt-2 mb-4">Be Rich vous permet d&apos;investir via TRX et de gagner entre 7% et 15% de rendement journalier sur vos dépôts. Réclamez vos gains chaque jour et retirez quand vous voulez.</p>
            <button onClick={() => user.hasInvested ? setPage('wallet') : setPage('invest')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2">
              <i className="fas fa-rocket"></i> Commencer
            </button>
          </div>
        </div>

        {/* Features Section */}
        <h3 className="text-[0.9rem] font-bold text-[#1A2332] mb-3">Pourquoi Be Rich ?</h3>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[
            { icon: 'fa-coins', iconColor: '#16A34A', title: 'Investissement simplifié', desc: 'Déposez via TRX et gagnez 7-15% par jour', color: 'bg-[#DCFCE7] border-[#BBF7D0]' },
            { icon: 'fa-chart-line', iconColor: '#2563EB', title: 'Suivi en temps réel', desc: 'Suivez vos gains et votre portefeuille', color: 'bg-[#DBEAFE] border-[#BFDBFE]' },
            { icon: 'fa-shield-alt', iconColor: '#D97706', title: 'Sécurisé', desc: 'Vos fonds sont protégés', color: 'bg-[#FEF3C7] border-[#FDE68A]' },
            { icon: 'fa-bolt', iconColor: '#7C3AED', title: 'Retrait facile', desc: 'Retirez vos gains quand vous voulez', color: 'bg-[#F3E8FF] border-[#E9D5FF]' },
          ].map((f, i) => (
            <div key={i} className={`rounded-xl p-3.5 border ${f.color} shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5" style={{ backgroundColor: f.iconColor + '15' }}><i className={`fas ${f.icon} text-[1rem]`} style={{ color: f.iconColor }}></i></div>
              <div className="text-[0.78rem] font-bold text-[#1A2332] mb-0.5">{f.title}</div>
              <div className="text-[0.65rem] text-[#64748B] leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* How it Works Section */}
        <h3 className="text-[0.9rem] font-bold text-[#1A2332] mb-3">Comment ça marche ?</h3>
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
          {[
            { step: 1, title: 'Créez votre compte', desc: 'Inscrivez-vous en quelques secondes', icon: 'fa-user-plus', color: '#00C853' },
            { step: 2, title: 'Déposez via TRX', desc: 'Envoyez des TRX depuis Trust Wallet', icon: 'fa-wallet', color: '#FBBF24' },
            { step: 3, title: 'Gagnez chaque jour', desc: '7-15% de rendement journalier à réclamer', icon: 'fa-coins', color: '#00C853' },
          ].map((s, i) => (
            <div key={i} className={`flex items-start gap-3 ${i < 2 ? 'mb-4' : ''}`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[0.72rem] shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}>{s.step}</div>
              <div className="flex-1 pt-1">
                <div className="text-[0.82rem] font-bold text-[#1A2332] mb-0.5">{s.title}</div>
                <div className="text-[0.72rem] text-[#64748B]">{s.desc}</div>
              </div>
              <i className={`fas ${s.icon} text-[0.85rem] mt-1.5`} style={{ color: s.color }}></i>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button onClick={() => user.hasInvested ? setPage('wallet') : setPage('invest')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 mb-5">
          <i className="fas fa-arrow-right"></i> {user.hasInvested ? 'Voir mon portefeuille' : 'Commencer à investir'}
        </button>

        {/* Popular Projects */}
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-[0.9rem] font-bold text-[#1A2332]">Projets Populaires</h3>
          <span className="text-[0.68rem] text-[#00C853] font-semibold cursor-pointer">Voir tout</span>
        </div>
        {PROJECTS.map((p, i) => (
          <div key={i} className="flex gap-3 p-3.5 bg-white rounded-xl mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] items-center border border-[rgba(0,0,0,0.03)]">
            <img src={p.img} className="w-[50px] h-[50px] rounded-lg object-cover shrink-0" loading="lazy" alt={p.n} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[0.85rem] mb-0.5 text-[#1A2332]">{p.n}</div>
              <div className="text-[0.68rem] text-[#94A3B8] font-medium">{p.s}</div>
            </div>
            <i className="fas fa-chevron-right text-gray-300 text-[0.65rem]"></i>
          </div>
        ))}
      </div>
    </>
  );
}

// ==================== WALLET SCREEN ====================
function WalletScreen() {
  const { user, setPage, setUser, addToast, addNotification } = useAppStore();
  const [flashBal, setFlashBal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fake notifications — intervals: 7, 10, 13, 15 secondes
  useEffect(() => {
    if (!user) return;
    const fakeIds: string[] = [];
    for (let i = 0; i < 30; i++) fakeIds.push(String(Math.floor(Math.random() * 90000) + 10000).padStart(5, '0'));
    const intervals = [7000, 10000, 13000, 15000];
    let idx = 0;
    const showNotif = () => {
      const id = fakeIds[Math.floor(Math.random() * fakeIds.length)];
      const amt = Math.round(Math.random() * 27 + 3);
      addNotification(id, `a retiré ${formatMoney(amt)}`);
      const next = intervals[idx % intervals.length];
      idx++;
      setTimeout(showNotif, next);
    };
    const t = setTimeout(showNotif, 5000);
    return () => clearTimeout(t);
  }, [user]);

  // Flash balance on mount
  useEffect(() => {
    setTimeout(() => setFlashBal(true), 100);
    setTimeout(() => setFlashBal(false), 700);
  }, []);

  // Refresh wallet
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        addToast('Solde mis à jour', 'success');
      }
    } catch { addToast('Erreur', 'error'); }
    setRefreshing(false);
  };

  if (!user) return null;
  const principalBalance = user.invested;
  const gainsBalance = user.earnings;
  const totalPotentialGain = user.totalPotentialGain || 0;
  const projects = user.projects || [];
  const canWithdraw = user.canWithdraw;
  const hoursUntilWithdrawal = user.hoursUntilWithdrawal || 0;

  return (
    <>
      <Header title="Portefeuille" icon="fa-wallet" iconColor="#00C853" rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('profile')}><i className="far fa-user-circle"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* Balance Card — Two accounts */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-[18px] relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.1),transparent_65%)]" />
          <div className="absolute -bottom-10 -left-8 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(251,191,36,0.06),transparent_65%)]" />
          <div className="relative z-[1]">
            {/* Total + Refresh */}
            <div className="flex items-center justify-between mb-1">
              <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px]">Portefeuille</div>
              <button onClick={handleRefresh} className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(255,255,255,0.08)] border-none text-white cursor-pointer transition-transform active:scale-90" title="Rafraîchir">
                <i className="fas fa-sync-alt text-[0.7rem]" style={refreshing ? { animation: 'spin 0.8s linear infinite' } : {}}></i>
              </button>
            </div>
            <div className={`text-[2rem] font-black tracking-[-1px] mb-4 ${flashBal ? 'text-[#BBF7D0]' : 'text-white'}`} style={{ transition: 'color 0.6s, transform 0.6s', transform: flashBal ? 'scale(1.04)' : 'scale(1)' }}>{formatMoney(user.balance)}</div>

            {/* Two accounts */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3.5 border border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-[rgba(59,130,246,0.2)] flex items-center justify-center text-[0.5rem]"><i className="fas fa-shield-alt text-[#60A5FA]"></i></div>
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[0.5px]">Principal</span>
                </div>
                <div className="text-[1.05rem] font-black text-white">{formatMoney(principalBalance)}</div>
              </div>
              <div className="bg-[rgba(0,200,83,0.08)] rounded-xl p-3.5 border border-[rgba(0,200,83,0.12)]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-5 h-5 rounded-md bg-[rgba(0,200,83,0.2)] flex items-center justify-center text-[0.5rem]"><i className="fas fa-chart-line text-[#00E676]"></i></div>
                  <span className="text-[0.6rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[0.5px]">Gains</span>
                </div>
                <div className="text-[1.05rem] font-black text-[#86EFAC]">{formatMoney(gainsBalance)}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none font-[Inter] transition-transform active:scale-95 bg-[rgba(0,200,83,0.15)] text-[#86EFAC]" onClick={() => setPage('invest')}><i className="fas fa-arrow-down"></i> Déposer</button>
              <button className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none font-[Inter] transition-transform active:scale-95 bg-[rgba(251,191,36,0.15)] text-[#FDE68A]" onClick={() => setPage('withdraw')}><i className="fas fa-arrow-up"></i> Retirer</button>
            </div>
          </div>
        </div>

        {/* Daily Gains Overview Card */}
        {user.hasInvested && projects.length > 0 && (
          <div className="rounded-2xl p-5 mb-[18px] border bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border-[#86EFAC]">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#00C853]">
                <i className="fas fa-gift text-[1rem] text-white"></i>
              </div>
              <div className="flex-1">
                <h4 className="text-[0.88rem] font-bold text-[#1A2332]">Gains journaliers</h4>
                <p className="text-[0.68rem] text-[#64748B]">Réclamez vos gains par projet</p>
              </div>
            </div>

            {/* Show potential gain */}
            <div className="bg-white rounded-xl p-3.5 mb-3 border border-[rgba(0,0,0,0.04)]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[0.68rem] text-[#64748B] font-medium">Gain potentiel total</span>
                <span className="text-[0.68rem] text-[#00C853] font-bold">{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
              </div>
              <div className="text-[1.4rem] font-black text-[#009624]">{formatMoney(totalPotentialGain)}</div>
            </div>

            <button onClick={() => setPage('projects')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2">
              <i className="fas fa-briefcase"></i> Voir mes projets
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { icon: 'fa-chart-line', color: 'bg-[#DCFCE7] text-[#166534]', val: formatMoney(user.earnings), label: 'Gains' },
            { icon: 'fa-hand-holding-usd', color: 'bg-[#DBEAFE] text-[#1E40AF]', val: formatMoney(user.invested), label: 'Investi' },
            { icon: 'fa-percentage', color: 'bg-[#FEF3C7] text-[#92400E]', val: '7-15%', label: 'Rendement' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
              <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center mx-auto mb-1.5 text-[0.85rem] ${s.color}`}><i className={`fas ${s.icon}`}></i></div>
              <div className="font-extrabold text-[0.84rem] text-[#1A2332] tracking-[-0.2px]">{s.val}</div>
              <div className="text-[0.56rem] text-[#94A3B8] mt-0.5 font-medium uppercase tracking-[0.4px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Status */}
        {!user.hasInvested && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FFFBEB] border-l-[3px] border-[#F59E0B]">
            <i className="fas fa-exclamation-circle text-[#B45309] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#B45309]">Compte Limité</h4>
              <p className="text-[0.78rem] leading-relaxed text-[#92400E]">Faites un premier dépôt de 10 $ pour commencer à gagner.</p>
            </div>
            <button className="py-2.5 px-4 text-[0.76rem] bg-gradient-to-r from-[#00E676] to-[#00C853] text-white rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(0,200,83,0.2)] shrink-0" onClick={() => setPage('invest')}><i className="fas fa-rocket mr-1"></i>Investir</button>
          </div>
        )}

        {/* 48h Withdrawal Info */}
        {user.hasInvested && !canWithdraw && hoursUntilWithdrawal > 0 && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#EFF6FF] border-l-[3px] border-[#3B82F6]">
            <i className="fas fa-clock text-[#2563EB] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#1E40AF]">Premier retrait dans {hoursUntilWithdrawal}h</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#3B82F6]">Vous pourrez retirer vos gains 48h après votre premier dépôt.</p>
            </div>
          </div>
        )}
        {user.hasInvested && canWithdraw && !user.needsReferral && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#F0FDF4] border-l-[3px] border-[#00C853]">
            <i className="fas fa-check-circle text-[#166534] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#166534]">Retrait disponible</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#15803D]">Vous pouvez retirer vos gains vers votre wallet TRX.</p>
            </div>
            <button className="py-2.5 px-4 text-[0.76rem] bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(251,191,36,0.2)] shrink-0" onClick={() => setPage('withdraw')}><i className="fas fa-arrow-up mr-1"></i>Retirer</button>
          </div>
        )}

        {/* Referral Required Warning */}
        {user.needsReferral && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FEF3C7] border-l-[3px] border-[#F59E0B]">
            <i className="fas fa-user-friends text-[#92400E] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#92400E]">Parrainage requis</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#92400E]">Vous devez parrainer au moins {user.requiredReferrals} personne{user.requiredReferrals && user.requiredReferrals > 1 ? 's' : ''} pour retirer. Actuel : {user.referralCount || 0}. Partagez votre code <strong className="font-mono">{user.referralCode}</strong></p>
            </div>
            <button className="py-2.5 px-3 text-[0.72rem] bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(251,191,36,0.2)] shrink-0" onClick={() => setPage('referral')}><i className="fas fa-share-alt mr-1"></i>Parrainer</button>
          </div>
        )}

        {/* Popular Projects */}
        <div className="flex justify-between items-center mb-2.5 mt-5">
          <h3 className="text-[0.9rem] font-bold text-[#1A2332]">Projets Populaires</h3>
          <span className="text-[0.68rem] text-[#00C853] font-semibold cursor-pointer">Voir tout</span>
        </div>
        {PROJECTS.map((p, i) => (
          <div key={i} className="flex gap-3 p-3.5 bg-white rounded-xl mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] items-center border border-[rgba(0,0,0,0.03)]">
            <img src={p.img} className="w-[50px] h-[50px] rounded-lg object-cover shrink-0" loading="lazy" alt={p.n} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[0.85rem] mb-0.5 text-[#1A2332]">{p.n}</div>
              <div className="text-[0.68rem] text-[#94A3B8] font-medium">{p.s}</div>
            </div>
            <i className="fas fa-chevron-right text-gray-300 text-[0.65rem]"></i>
          </div>
        ))}
        <button onClick={() => window.location.href = '/trx-guide'} className="w-full py-3.5 rounded-xl border-[1.5px] border-[rgba(0,200,83,0.15)] bg-[rgba(0,200,83,0.04)] text-[#009624] font-semibold text-[0.82rem] cursor-pointer font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 mt-4 mb-4">
          <i className="fas fa-question-circle"></i> Comment trouver l&apos;adresse TRX ?
        </button>
      </div>
    </>
  );
}

// ==================== INVEST SCREEN (TRX / Trust Wallet) ====================
function InvestScreen() {
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

// ==================== WITHDRAWAL SCREEN ====================
function WithdrawalScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [amount, setAmount] = useState('');
  const [trxAddress, setTrxAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [step, setStep] = useState<'form' | 'pending' | 'done'>('form');

  // Load existing withdrawals
  useEffect(() => {
    if (!user) return;
    fetch('/api/withdrawal').then(r => r.json()).then(data => {
      if (data.success) {
        setWithdrawals(data.data || []);
        // If there's a pending withdrawal, show pending state
        const pending = (data.data || []).find((w: any) => w.status === 'pending');
        if (pending) setStep('pending');
      }
    }).catch(() => {});
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 5) { addToast('Minimum de retrait : 5 $', 'error'); return; }
    if (amt > user.earnings) { addToast('Solde de gains insuffisant', 'error'); return; }
    if (!trxAddress || trxAddress.length < 20) { addToast('Adresse TRX invalide', 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/withdrawal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, trxAddress }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('Demande de retrait envoyée !', 'success');
        setStep('pending');
        // Refresh withdrawals
        const wRes = await fetch('/api/withdrawal');
        const wData = await wRes.json();
        if (wData.success) setWithdrawals(wData.data || []);
      } else {
        addToast(data.error, 'error');
      }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  // Check withdrawal status periodically
  useEffect(() => {
    if (step !== 'pending') return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/withdrawal');
        const data = await res.json();
        if (data.success) {
          setWithdrawals(data.data || []);
          const pending = (data.data || []).find((w: any) => w.status === 'pending');
          if (!pending) {
            // Withdrawal processed — refresh user data
            const sessRes = await fetch('/api/auth/session');
            const sessData = await sessRes.json();
            if (sessData.success && sessData.user) setUser(sessData.user);
            setStep('done');
          }
        }
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [step, setUser]);

  if (!user) return null;

  // Pending withdrawal view
  if (step === 'pending') {
    const pendingW = withdrawals.find((w: any) => w.status === 'pending');
    return (
      <>
        <Header title="Retrait en attente" icon="fa-clock" iconColor="#F59E0B" rightElement={
          <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-times"></i></button>
        } />
        <div className="px-[18px] py-4 flex-1 w-full flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#FEF3C7] flex items-center justify-center mb-4">
            <i className="fas fa-hourglass-half text-[#F59E0B] text-[2rem]"></i>
          </div>
          <h3 className="text-[1.1rem] font-bold text-[#1A2332] mb-2">Demande en traitement</h3>
          <p className="text-[0.82rem] text-[#64748B] mb-6 text-center">Votre demande de retrait de <strong>{pendingW ? formatMoney(pendingW.amount) : ''}</strong> est en cours de traitement par l&apos;administration.</p>

          <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.05)] divide-y divide-[#F1F5F9] w-full mb-5">
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Montant</span>
              <span className="text-[0.8rem] font-bold text-[#1A2332]">{pendingW ? formatMoney(pendingW.amount) : ''}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Adresse TRX</span>
              <span className="text-[0.68rem] font-mono text-[#1A2332] max-w-[180px] truncate">{pendingW ? pendingW.trxAddress : ''}</span>
            </div>
            <div className="flex justify-between px-4 py-3">
              <span className="text-[0.75rem] text-[#64748B]">Statut</span>
              <span className="px-2.5 py-1 rounded-md text-[0.58rem] font-bold uppercase tracking-[0.5px] bg-[#FEF3C7] text-[#92400E]">En attente</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-[#94A3B8] mb-5">
            <div className="w-2 h-2 rounded-full bg-[#F59E0B]" style={{ animation: 'pod 2s infinite' }} />
            <span className="text-[0.72rem]">Vérification en cours...</span>
          </div>

          <button onClick={() => setPage('wallet')} className="w-full max-w-[200px] py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97]">
            Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // Withdrawal completed view
  if (step === 'done') {
    return (
      <>
        <Header title="Retrait validé" icon="fa-check-circle" iconColor="#00C853" />
        <div className="px-[18px] py-4 flex-1 w-full flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#DCFCE7] flex items-center justify-center mb-4">
            <i className="fas fa-check text-[#00C853] text-[2rem]"></i>
          </div>
          <h3 className="text-[1.1rem] font-bold text-[#1A2332] mb-2">Retrait approuvé !</h3>
          <p className="text-[0.82rem] text-[#64748B] mb-6 text-center">Votre retrait a été approuvé. Les fonds seront envoyés à votre adresse TRX.</p>
          <button onClick={() => setPage('wallet')} className="w-full max-w-[200px] py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97]">
            Retour au portefeuille
          </button>
        </div>
      </>
    );
  }

  // Form view
  return (
    <>
      <Header title="Retrait" icon="fa-arrow-up" iconColor="#F59E0B" rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-times"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* 48h restriction check */}
        {user.firstDepositAt && !user.canWithdraw && (user.hoursUntilWithdrawal || 0) > 0 && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#EFF6FF] border-l-[3px] border-[#3B82F6]">
            <i className="fas fa-clock text-[#2563EB] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div>
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#1E40AF]">Premier retrait dans {user.hoursUntilWithdrawal}h</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#3B82F6]">Vous devez attendre 48h après votre premier dépôt avant de pouvoir retirer vos gains.</p>
            </div>
          </div>
        )}

        <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FFFBEB] border-l-[3px] border-[#F59E0B]">
          <i className="fas fa-info-circle text-[#B45309] mt-0.5 shrink-0 text-[0.9rem]"></i>
          <div>
            <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#B45309]">Retrait depuis les gains</h4>
            <p className="text-[0.72rem] leading-relaxed text-[#92400E]">Vous pouvez retirer uniquement depuis votre <strong>compte de gains</strong>. Le retrait sera envoyé en TRX à votre adresse Trust Wallet après validation par l&apos;admin. Premier retrait possible 48h après le premier dépôt.</p>
          </div>
        </div>

        {/* Referral Required Warning in Withdrawal */}
        {user.needsReferral && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FEE2E2] border-l-[3px] border-[#DC2626]">
            <i className="fas fa-user-friends text-[#DC2626] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#991B1B]">Parrainage obligatoire</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#991B1B]">Après votre {user.completedWithdrawals && user.completedWithdrawals >= 2 ? (user.completedWithdrawals + 1) + 'e' : '3e'} retrait, vous devez parrainer au moins {user.requiredReferrals} personne{user.requiredReferrals && user.requiredReferrals > 1 ? 's' : ''}. Vous avez {user.referralCount || 0} filleul{user.referralCount === 1 ? '' : 's'}.</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[0.68rem] text-[#991B1B] font-semibold">Votre code :</span>
                <span className="bg-[#991B1B] text-white px-3 py-1 rounded-lg text-[0.78rem] font-bold font-mono">{user.referralCode}</span>
              </div>
              <button onClick={() => setPage('referral')} className="mt-2 py-2 px-4 text-[0.72rem] bg-[#DC2626] text-white rounded-xl border-none cursor-pointer font-semibold font-[Inter] shadow-[0_4px_20px_rgba(220,38,38,0.2)] transition-transform active:scale-95"><i className="fas fa-share-alt mr-1"></i>Partager mon code</button>
            </div>
          </div>
        )}

        {/* Available gains */}
        <div className="bg-[#F0FDF4] rounded-2xl p-5 mb-5 border border-[#BBF7D0] text-center">
          <div className="text-[0.68rem] text-[#166534] font-semibold uppercase tracking-[0.5px] mb-1">Gains disponibles</div>
          <div className="text-[1.8rem] font-black text-[#009624]">{formatMoney(user.earnings)}</div>
          <div className="text-[0.65rem] text-[#15803D] mt-1">Minimum de retrait : 5 $</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 w-full">
            <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Montant à retirer (USD)</label>
            <div className="relative">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Min. 5 $" min={5} step={1} required className="w-full py-3 px-4 pr-16 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[0.7rem] font-bold text-[#94A3B8]">USD</span>
            </div>
            {amount && parseFloat(amount) > user.earnings && (
              <p className="text-red-500 text-[0.68rem] mt-1 font-medium">Dépasse vos gains disponibles</p>
            )}
          </div>

          <div className="flex gap-1.5 mb-4">
            {[5, 10, 25, 50].filter(v => v <= user.earnings).map((v) => (
              <button key={v} type="button" onClick={() => setAmount(String(v))} className="flex-1 py-2.5 rounded-lg text-[0.76rem] font-semibold text-center cursor-pointer border-[1.5px] border-[rgba(0,0,0,0.06)] bg-white text-[#1A2332] transition-all active:scale-95 font-[Inter]">{v} $</button>
            ))}
          </div>

          <div className="mb-5 w-full">
            <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Votre adresse TRX (Trust Wallet)</label>
            <input type="text" value={trxAddress} onChange={(e) => setTrxAddress(e.target.value)} placeholder="T..." required className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.82rem] outline-none transition-all font-mono text-[#1A2332] focus:bg-white focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)]" />
            <p className="text-[0.62rem] text-[#94A3B8] mt-1">L&apos;adresse où vous recevrez vos TRX</p>
          </div>

          <button type="submit" disabled={loading || user.earnings < 5 || !user.canWithdraw || !!user.needsReferral} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-[rgba(120,53,15,0.3)] border-t-[#78350F] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : !user.canWithdraw ? <><i className="fas fa-clock"></i> Attente 48h</> : user.needsReferral ? <><i className="fas fa-user-friends"></i> Parrainage requis</> : <><i className="fas fa-paper-plane"></i> Demander le retrait</>}
          </button>
        </form>

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-2.5 mt-7">
              <h3 className="text-[0.9rem] font-bold text-[#1A2332]">Historique des retraits</h3>
            </div>
            {withdrawals.map((w: any, i: number) => {
              const d = new Date(w.createdAt);
              const ds = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const statusLabel = w.status === 'pending' ? 'En attente' : w.status === 'approved' ? 'Approuvé' : 'Rejeté';
              const statusColor = w.status === 'pending' ? 'bg-[#FEF3C7] text-[#92400E]' : w.status === 'approved' ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]';
              return (
                <div key={i} className="flex gap-3 p-3.5 bg-white rounded-xl mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] items-center border border-[rgba(0,0,0,0.03)]">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[0.75rem] shrink-0 ${w.status === 'approved' ? 'bg-[#DCFCE7] text-[#166534]' : w.status === 'pending' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>
                    <i className={`fas fa-${w.status === 'approved' ? 'check' : w.status === 'pending' ? 'clock' : 'times'}`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[0.85rem] mb-0.5 text-[#1A2332]">{formatMoney(w.amount)}</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">{ds}</div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-md text-[0.58rem] font-bold uppercase tracking-[0.5px] ${statusColor}`}>{statusLabel}</span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

// ==================== ADD PROJECT SCREEN ====================
function AddProjectScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [loading, setLoading] = useState(false);

  if (!user) return null;
  const isUnlocked = user.hasInvested;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const name = (fd.get('name') as string)?.trim();
    const amount = fd.get('amount') as string;
    const desc = (fd.get('description') as string)?.trim();
    if (!name || !amount || !desc) { addToast('Remplissez tout', 'error'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/projects/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, amount: parseFloat(amount), description: desc }) });
      const data = await res.json();
      if (data.success) {
        (e.target as HTMLFormElement).reset();
        const newProj: Project = { id: data.project_id, name, amount: parseFloat(amount), receivedAmount: 0, description: desc, status: 'active' };
        setUser({ ...user, project: newProj });
        addToast('Projet soumis !', 'success');
        setPage('wallet');
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setLoading(false);
  };

  return (
    <>
      <Header title="Nouveau Projet" rightElement={<button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-times"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full">
        {!isUnlocked ? (
          <div className="text-center py-12 px-5">
            <div className="w-[72px] h-[72px] rounded-[20px] bg-[rgba(255,255,255,0.03)] mx-auto mb-5 flex items-center justify-center text-[1.6rem] text-[#CBD5E1] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><i className="fas fa-lock"></i></div>
            <h3 className="mb-2 font-extrabold">Verrouillé</h3>
            <p className="text-[#64748B] mb-6 leading-relaxed text-[0.82rem]">Investissez minimum <strong>10 $</strong> pour débloquer.</p>
            <button className="bg-gradient-to-r from-[#00E676] to-[#00C853] text-white max-w-[220px] mx-auto w-full py-3.5 rounded-xl border-none cursor-pointer font-semibold text-[0.88rem] font-[Inter] shadow-[0_4px_20px_rgba(0,200,83,0.2)] transition-transform active:scale-[0.97] flex items-center justify-center gap-2" onClick={() => setPage('invest')}><i className="fas fa-rocket"></i> Investir</button>
          </div>
        ) : (
          <>
            <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#F0FDF4] border-l-[3px] border-[#00C853]">
              <i className="fas fa-check-circle text-[#166534] mt-0.5 shrink-0 text-[0.9rem]"></i>
              <div><h4 className="text-[0.82rem] mb-0.5 font-bold text-[#166534]">Débloqué</h4><p className="text-[0.78rem] leading-relaxed text-[#15803D]">Vous pouvez soumettre un projet.</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Nom du projet</label>
                <input name="name" type="text" required placeholder="Ex: Mon projet" className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#00C853]" />
              </div>
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Montant ($)</label>
                <input name="amount" type="number" required placeholder="5000" min={100} className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#00C853]" />
              </div>
              <div className="mb-4 w-full">
                <label className="block mb-1.5 text-[0.75rem] font-semibold text-[#64748B]">Description</label>
                <textarea name="description" required rows={3} placeholder="Décrivez..." className="w-full py-3 px-4 bg-[rgba(0,0,0,0.02)] border-[1.5px] border-[rgba(0,0,0,0.07)] rounded-xl text-[0.88rem] outline-none transition-all font-[Inter] text-[#1A2332] focus:bg-white focus:border-[#00C853] resize-y" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.2)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
                {loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-paper-plane"></i> Soumettre</>}
              </button>
            </form>
          </>
        )}
      </div>
    </>
  );
}

// ==================== EMOJI PICKER ====================
const EMOJI_LIST = ['😀','😂','🥰','😎','🤩','😘','🤗','😏','🥺','😤','🔥','❤️','💚','💛','💙','💜','👍','👎','👏','🙏','💪','🤝','✅','❌','⭐','💰','💎','🎉','🎊','💯','🚀','💼','📱','💡','📌','✨','🌟','😊','🥳','😍','🤔','😴','😇','🤑','🤓','😱','🤯','😇','🫡','🤝','🙏🏻','💔','💔'];

function EmojiPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'smileys' | 'gestes' | 'cœurs'>('smileys');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const tabs = [
    { id: 'smileys' as const, label: '😊', emojis: ['😀','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😏','🤗','🤔','🥺','😤','😴','🤑','🤓','😱','🤯','😇','🫡','🙄','😬','🤭'] },
    { id: 'gestes' as const, label: '👍', emojis: ['👍','👎','👏','🙌','🤝','🙏','🙏🏻','💪','🫶','🤞','✌️','🤟','👋','✋','🖐️','☝️','🤙','👋🏻','🫰','🫵','🤌','🫱','🫲'] },
    { id: 'cœurs' as const, label: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','💗','💖','💝','💘','💕','❣️','💔','💯','🔥','⭐','✨','🌟','💰','💎','🚀','🎉','🎊','💼','📱','💡','📌'] },
  ];

  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <div ref={pickerRef} className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-[rgba(0,0,0,0.06)] overflow-hidden z-50" style={{ width: '280px', animation: 'modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
      {/* Tab bar */}
      <div className="flex border-b border-[rgba(0,0,0,0.05)] bg-[#F8FAFC]">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 py-2.5 text-center text-[1rem] cursor-pointer border-none transition-all ${activeTab === tab.id ? 'bg-white shadow-[0_-2px_8px_rgba(0,0,0,0.04)] scale-110' : 'bg-transparent opacity-50 hover:opacity-80'}`}>{tab.label}</button>
        ))}
      </div>
      {/* Emoji grid */}
      <div className="grid grid-cols-8 gap-0.5 p-2 max-h-[180px] overflow-y-auto">
        {currentTab.emojis.map((emoji, i) => (
          <button key={i} onClick={() => onSelect(emoji)} className="w-[30px] h-[30px] flex items-center justify-center rounded-lg text-[1.1rem] cursor-pointer border-none bg-transparent transition-all hover:bg-[#F1F5F9] active:scale-125">{emoji}</button>
        ))}
      </div>
    </div>
  );
}

// ==================== CHAT SCREEN ====================
interface ChatMsg { id: string; text: string; me: boolean; isAdmin: boolean; t: string; senderName?: string; }

function ChatScreen() {
  const { user, addToast } = useAppStore();
  const [messages, setMessages] = useState<ChatMsg[]>([{ id: 'welcome', text: "Bonjour ! Bienvenue sur le support Be Rich. Écrivez votre message ci-dessous, l'admin vous répondra.", me: false, isAdmin: false, t: '', senderName: 'Support' }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const lastIdRef = useRef('0');
  const msgsEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => { msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };

  const loadMessages = useCallback(async (fromId: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/chat/messages?lastId=${fromId}`);
      const data = await res.json();
      if (data.success && data.messages.length) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const newMsgs = data.messages.filter((m: ChatMsg) => !existing.has(m.id));
          let maxId = fromId;
          for (const m of data.messages) if (m.id > maxId) maxId = m.id;
          lastIdRef.current = maxId;
          return [...prev, ...newMsgs];
        });
      }
    } catch { /* ignore */ }
  }, [user]);

  // Load initial messages + start polling
  useEffect(() => {
    if (!user) return;
    const loadInitial = async () => {
      await loadMessages('0');
    };
    loadInitial();
    pollRef.current = setInterval(() => loadMessages(lastIdRef.current), 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, loadMessages]);

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || sending) return;
    const txt = input.trim();
    setInput('');
    setSending(true);
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { id: 'temp-' + Date.now(), text: txt, me: true, isAdmin: false, t: now, senderName: user.name }]);
    setTyping(true);
    try {
      await fetch('/api/chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: txt }) });
      setTimeout(() => loadMessages(lastIdRef.current), 500);
    } catch { addToast('Erreur', 'error'); }
    setSending(false);
    setTimeout(() => setTyping(false), 1500);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Chat Header */}
      <header className="h-[62px] bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl flex items-center gap-3 px-4 sticky top-0 z-20 shrink-0 border-b border-[rgba(0,0,0,0.04)]">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00E676] to-[#00C853] flex items-center justify-center text-white font-bold text-[0.72rem] shadow-[0_2px_10px_rgba(0,200,83,0.25)]">BR</div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#00C853] rounded-full border-2 border-white" style={{ boxShadow: '0 0 6px rgba(0,200,83,0.5)', animation: 'pod 2s infinite' }} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[0.92rem] font-bold text-[#1A2332] leading-tight">Support Be Rich</h2>
          <div className="flex items-center gap-1.5">
            <div className="w-[6px] h-[6px] rounded-full bg-[#00C853]" />
            <span className="text-[0.68rem] text-[#00C853] font-semibold">En ligne</span>
          </div>
        </div>
        <button className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-all active:scale-90 hover:bg-[rgba(0,0,0,0.08)]"><i className="fas fa-ellipsis-v"></i></button>
      </header>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-[#F8FAFC] via-[#FAFBFD] to-[#F1F5F9] flex flex-col min-h-0 gap-2.5">
          {messages.map((m, idx) => {
            const showAvatar = !m.me && (idx === 0 || messages[idx - 1].me);
            const isLastInGroup = idx === messages.length - 1 || messages[idx + 1]?.me !== m.me;
            return (
              <div key={m.id} className={`flex items-end gap-2 ${m.me ? 'flex-row-reverse' : 'flex-row'}`} style={{ animation: 'cbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                {/* Avatar */}
                {showAvatar ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[0.58rem] shrink-0 mb-5 shadow-sm ${m.isAdmin ? 'bg-gradient-to-br from-[#00E676] to-[#00C853]' : 'bg-gradient-to-br from-[#60A5FA] to-[#3B82F6]'}`}>{m.isAdmin ? 'BR' : esc(m.senderName || 'S')}</div>
                ) : !m.me ? <div className="w-8 shrink-0" /> : null}
                {/* Bubble */}
                <div className={`max-w-[75%] flex flex-col ${m.me ? 'items-end' : 'items-start'}`}>
                  {showAvatar && !m.me && <span className="text-[0.62rem] text-[#94A3B8] font-semibold mb-1 ml-1">{m.isAdmin ? 'Admin' : esc(m.senderName || 'Support')}</span>}
                  <div className={`py-2.5 px-4 text-[0.84rem] leading-[1.55] ${m.me
                    ? 'bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white rounded-2xl rounded-br-md shadow-[0_2px_12px_rgba(37,99,235,0.18)]'
                    : m.isAdmin
                      ? 'bg-gradient-to-br from-[#00E676] to-[#00C853] text-white rounded-2xl rounded-bl-md shadow-[0_2px_12px_rgba(0,200,83,0.18)]'
                      : 'bg-white text-[#1A2332] rounded-2xl rounded-bl-md shadow-[0_1px_6px_rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.04)]'}`}>
                    {esc(m.text)}
                  </div>
                  {isLastInGroup && m.t && (
                    <span className={`text-[0.56rem] mt-1 mx-1 ${m.me ? 'text-blue-300 opacity-60' : 'text-[#94A3B8]'}`}>
                      {m.t} {m.me && '✓✓'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typing && (
            <div className="flex items-end gap-2" style={{ animation: 'cbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00E676] to-[#00C853] flex items-center justify-center text-white font-bold text-[0.58rem] shrink-0 shadow-sm">BR</div>
              <div className="bg-white rounded-2xl rounded-bl-md px-5 py-3.5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.04)]">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-[7px] h-[7px] rounded-full bg-[#94A3B8]" style={{ animation: `tdot 1.4s infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={msgsEndRef} />
        </div>

        {/* Premium Chat Input Bar */}
        <div className="shrink-0 px-3 pt-3 pb-[76px] bg-gradient-to-t from-white via-white to-[rgba(255,255,255,0.95)]">
          <div className="flex items-end gap-2">
            {/* Action buttons */}
            <div className="flex gap-1 shrink-0 pb-1 relative">
              <button onClick={() => setShowEmoji(!showEmoji)} className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none text-[0.82rem] transition-all active:scale-90 ${showEmoji ? 'bg-[#00C853] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E8ECF1]'}`}><i className="far fa-smile"></i></button>
              {showEmoji && <EmojiPicker onSelect={(emoji) => { setInput((prev) => prev + emoji); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />}
            </div>
            {/* Input field */}
            <div className="flex-1 min-w-0 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                onFocus={() => setShowEmoji(false)}
                placeholder="Écrivez votre message..."
                className="w-full py-3 pl-4 pr-12 bg-[#F1F5F9] border-[1.5px] border-transparent rounded-2xl text-[0.86rem] outline-none font-[Inter] text-[#1A2332] transition-all focus:border-[#00C853] focus:shadow-[0_0_0_4px_rgba(0,200,83,0.08)] focus:bg-white placeholder:text-[#94A3B8]"
              />
              {/* Send button inside input */}
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all duration-200 ${input.trim()
                  ? 'bg-gradient-to-br from-[#00C853] to-[#009624] text-white shadow-[0_2px_10px_rgba(0,200,83,0.3)] active:scale-90'
                  : 'bg-[#E2E8F0] text-[#94A3B8] cursor-default'}`}>
                {sending
                  ? <div className="w-3.5 h-3.5 border-[2px] border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                  : <i className="fas fa-paper-plane text-[0.7rem]" style={input.trim() ? { transform: 'translateX(0)' } : { transform: 'translateX(1px)' }}></i>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== ADMIN SCREEN ====================
function AdminScreen() {
  const { user, addToast } = useAppStore();
  const [tab, setTab] = useState<'users' | 'messages' | 'deposits' | 'withdrawals'>('users');
  const [adminData, setAdminData] = useState<any>(null);
  const [conversations, setConversations] = useState<any[]>([]);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [depositStats, setDepositStats] = useState<any>({});
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [configEditing, setConfigEditing] = useState(false);
  const [configAddr, setConfigAddr] = useState('');
  const [configPrice, setConfigPrice] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<any>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const convPollRef = useRef<NodeJS.Timeout | null>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const loadChats = useCallback(async () => {
    try {
      const cRes = await fetch('/api/admin/chats');
      const cData = await cRes.json();
      if (cData.success) setConversations(cData.conversations || []);
    } catch { /* ignore */ }
  }, []);

  const loadDeposits = useCallback(async () => {
    try {
      const dRes = await fetch('/api/admin/deposits');
      const dData = await dRes.json();
      if (dData.success) {
        setPendingDeposits(dData.data || []);
        setDepositStats(dData.stats || {});
      }
    } catch { /* ignore */ }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    try {
      const wRes = await fetch('/api/admin/withdrawals');
      const wData = await wRes.json();
      if (wData.success) {
        setWithdrawals(wData.data || []);
        setWithdrawalStats(wData.stats || {});
      }
    } catch { /* ignore */ }
  }, []);

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId, action }) });
      const data = await res.json();
      if (data.success) {
        addToast(action === 'approve' ? 'Retrait approuvé et débité' : 'Retrait rejeté', action === 'approve' ? 'success' : 'info');
        loadWithdrawals();
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
  };

  const loadConfig = useCallback(async () => {
    try {
      const cRes = await fetch('/api/admin/config');
      const cData = await cRes.json();
      if (cData.success) {
        setSiteConfig(cData.data);
        setConfigAddr(cData.data.adminTrxAddress || '');
        setConfigPrice(String(cData.data.trxUsdPrice || ''));
      }
    } catch { /* ignore */ }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [dRes, cRes] = await Promise.all([fetch('/api/admin/data'), fetch('/api/admin/chats')]);
      const [dData, cData] = await Promise.all([dRes.json(), cRes.json()]);
      if (dData.success) setAdminData(dData);
      if (cData.success) setConversations(cData.conversations || []);
    } catch { addToast('Erreur', 'error'); }
    setLoading(false);
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => { loadData(); loadDeposits(); loadConfig(); loadWithdrawals(); }, 0);
    return () => clearTimeout(timer);
  }, [loadData, loadDeposits, loadConfig]);

  // Auto-poll conversations every 5s when on admin page
  useEffect(() => {
    pollRef.current = setInterval(() => { loadChats(); if (tab === 'deposits') loadDeposits(); if (tab === 'withdrawals') loadWithdrawals(); }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [loadChats, loadDeposits, tab]);

  // Auto-poll active conversation every 3s
  useEffect(() => {
    if (activeConv) {
      convPollRef.current = setInterval(loadChats, 3000);
    }
    return () => { if (convPollRef.current) clearInterval(convPollRef.current); };
  }, [activeConv, loadChats]);

  // Scroll to bottom of active conversation
  useEffect(() => { setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150); }, [activeConv, conversations]);

  const handleReply = async () => {
    if (!activeConv || !replyText.trim() || replySending) return;
    const content = replyText.trim();
    setReplySending(true);
    try {
      const res = await fetch('/api/admin/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: activeConv, content }) });
      const data = await res.json();
      if (data.success) {
        setReplyText('');
        addToast('Réponse envoyée', 'success');
        loadChats();
        replyInputRef.current?.focus();
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setReplySending(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    setDeletingMsgId(messageId);
    try {
      const res = await fetch('/api/admin/messages/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId }) });
      const data = await res.json();
      if (data.success) {
        addToast('Message supprimé', 'success');
        loadChats();
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setDeletingMsgId(null);
  };

  const handleDepositAction = async (depositId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId, action }) });
      const data = await res.json();
      if (data.success) {
        addToast(action === 'approve' ? 'Dépôt approuvé et crédité' : 'Dépôt rejeté', action === 'approve' ? 'success' : 'info');
        loadDeposits();
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminTrxAddress: configAddr, trxUsdPrice: configPrice }) });
      const data = await res.json();
      if (data.success) {
        setSiteConfig(data.data);
        setConfigEditing(false);
        addToast('Configuration sauvegardée', 'success');
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setConfigSaving(false);
  };

  const filteredConversations = conversations.filter((c: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.user_name.toLowerCase().includes(q) || c.user_email.toLowerCase().includes(q);
  });

  if (!user || user.role !== 'admin') return null;

  if (loading) return (
    <>
      <Header title="Admin" icon="fa-shield-alt" iconColor="#FBBF24" />
      <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-3 border-gray-200 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div>
    </>
  );

  const stats = adminData?.stats || {};
  const users = adminData?.users || [];
  const totalUnread = conversations.reduce((sum: number, c: any) => sum + (c.unread_count || 0), 0);
  const activeConversation = activeConv ? conversations.find((c: any) => c.user_id === activeConv) : null;

  // ---- Full-screen chat view for active conversation ----
  if (activeConversation) {
    const conv = activeConversation;
    const initials = conv.user_name ? conv.user_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '??';
    const unreadCount = conv.unread_count || 0;

    return (
      <>
        {/* Chat-style header with user info */}
        <header className="h-[62px] bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl flex items-center gap-3 px-4 sticky top-0 z-20 shrink-0 border-b border-[rgba(0,0,0,0.04)]">
          <button className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-all active:scale-90" onClick={() => setActiveConv(null)}><i className="fas fa-arrow-left"></i></button>
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center text-white font-bold text-[0.68rem] shadow-[0_2px_10px_rgba(59,130,246,0.25)]">{esc(initials)}</div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#00C853] rounded-full border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[0.92rem] font-bold text-[#1A2332] leading-tight">{esc(conv.user_name)}</h2>
            <div className="flex items-center gap-2">
              <span className="text-[0.66rem] text-[#64748B] font-medium">{conv.user_email}</span>
              {conv.user_has_invested && <span className="px-1.5 py-0.5 rounded text-[0.5rem] font-bold bg-[#DCFCE7] text-[#166534]">Investisseur</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[0.7rem] font-bold text-[#009624]">{formatMoney(conv.user_balance)}</div>
            <button onClick={loadChats} className="w-7 h-7 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#94A3B8] cursor-pointer border-none text-[0.7rem] transition-all active:scale-90 ml-auto mt-0.5"><i className="fas fa-sync-alt"></i></button>
          </div>
        </header>

        {/* Conversation info bar */}
        {unreadCount > 0 && (
          <div className="px-4 py-2 bg-gradient-to-r from-[#FEF3C7] to-[#FFFBEB] border-b border-[rgba(251,191,36,0.15)] flex items-center gap-2 shrink-0">
            <i className="fas fa-exclamation-circle text-[#B45309] text-[0.7rem]"></i>
            <span className="text-[0.72rem] text-[#92400E] font-semibold">{unreadCount} message{unreadCount > 1 ? 's' : ''} non répondu{unreadCount > 1 ? 's' : ''}</span>
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 bg-gradient-to-b from-[#F8FAFC] via-[#FAFBFD] to-[#F1F5F9] flex flex-col min-h-0 gap-2.5">
            {/* Conversation header info */}
            <div className="text-center mb-2">
              <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-[0_1px_4px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <span className="text-[0.62rem] text-[#94A3B8] font-medium">{conv.total_messages} message{conv.total_messages > 1 ? 's' : ''} · Conversation démarrée le {conv.messages[0]?.date || 'récemment'}</span>
              </div>
            </div>

            {conv.messages.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                    <i className="fas fa-comment-slash text-lg text-[#CBD5E1]"></i>
                  </div>
                  <p className="text-[#94A3B8] text-[0.78rem]">Aucun message dans cette conversation</p>
                </div>
              </div>
            )}

            {conv.messages.map((m: any, mi: number) => {
              const isMe = m.is_admin;
              const prevMsg = mi > 0 ? conv.messages[mi - 1] : null;
              const showAvatar = isMe ? (mi === 0 || !prevMsg?.is_admin) : (!prevMsg?.is_admin ? false : true);
              const showUserAvatar = !isMe ? (mi === 0 || prevMsg?.is_admin) : false;
              const isLastInGroup = mi === conv.messages.length - 1 || conv.messages[mi + 1]?.is_admin !== isMe;
              return (
                <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'} group`} style={{ animation: 'cbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
                  {/* Avatar */}
                  {showAvatar || showUserAvatar ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[0.58rem] shrink-0 mb-5 shadow-sm ${isMe ? 'bg-gradient-to-br from-[#FCD34D] to-[#F59E0B]' : 'bg-gradient-to-br from-[#60A5FA] to-[#3B82F6]'}`}>
                      {isMe ? 'AD' : esc(initials)}
                    </div>
                  ) : isMe ? <div className="w-8 shrink-0" /> : !showUserAvatar ? <div className="w-8 shrink-0" /> : null}
                  {/* Bubble */}
                  <div className={`max-w-[78%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showAvatar && isMe && <span className="text-[0.6rem] text-[#F59E0B] font-bold mb-1 mr-1 tracking-wide">ADMIN</span>}
                    {showUserAvatar && !isMe && <span className="text-[0.6rem] text-[#3B82F6] font-bold mb-1 ml-1">{esc(conv.user_name)}</span>}
                    <div className="relative">
                      <div className={`py-2.5 px-4 text-[0.84rem] leading-[1.55] ${isMe
                        ? 'bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] text-[#78350F] rounded-2xl rounded-bl-md shadow-[0_2px_12px_rgba(245,158,11,0.18)]'
                        : 'bg-white text-[#1A2332] rounded-2xl rounded-br-md shadow-[0_1px_6px_rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.04)]'}`}>
                        {esc(m.content)}
                      </div>
                      {/* Delete button on hover */}
                      <button
                        onClick={() => handleDeleteMessage(m.id)}
                        disabled={deletingMsgId === m.id}
                        className="absolute w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center border-2 border-white cursor-pointer text-[0.45rem] opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-sm hover:bg-red-600 active:scale-90 z-10"
                        style={{ [isMe ? 'left' : 'right']: '-8px', top: '-4px' }}
                      >
                        {deletingMsgId === m.id
                          ? <div className="w-2.5 h-2.5 border-[1.5px] border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                          : <i className="fas fa-times"></i>}
                      </button>
                    </div>
                    {isLastInGroup && (
                      <div className="flex items-center gap-1 mt-1 mx-1">
                        <span className={`text-[0.54rem] ${isMe ? 'text-[#D97706] opacity-50' : 'text-[#94A3B8]'}`}>{m.time}</span>
                        {m.date && <span className={`text-[0.5rem] ${isMe ? 'text-[#D97706] opacity-40' : 'text-[#CBD5E1]'}`}>· {m.date}</span>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Premium Reply Bar */}
          <div className="shrink-0 px-3 pt-3 pb-[76px] bg-gradient-to-t from-white via-white to-[rgba(255,255,255,0.95)]">
            <div className="flex items-end gap-2">
              <div className="flex gap-1 shrink-0 pb-1 relative">
                <button onClick={() => setShowEmoji(!showEmoji)} className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none text-[0.82rem] transition-all active:scale-90 ${showEmoji ? 'bg-[#F59E0B] text-white' : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E8ECF1]'}`}><i className="far fa-smile"></i></button>
                {showEmoji && <EmojiPicker onSelect={(emoji) => { setReplyText((prev) => prev + emoji); replyInputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />}
              </div>
              <div className="flex-1 min-w-0 relative">
                <input
                  ref={replyInputRef}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  onFocus={() => setShowEmoji(false)}
                  placeholder={`Répondre à ${conv.user_name}...`}
                  className="w-full py-3 pl-4 pr-12 bg-[#F1F5F9] border-[1.5px] border-transparent rounded-2xl text-[0.86rem] outline-none font-[Inter] text-[#1A2332] transition-all focus:border-[#F59E0B] focus:shadow-[0_0_0_4px_rgba(245,158,11,0.08)] focus:bg-white placeholder:text-[#94A3B8]"
                  autoFocus
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || replySending}
                  className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all duration-200 ${replyText.trim()
                    ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706] text-white shadow-[0_2px_10px_rgba(245,158,11,0.3)] active:scale-90'
                    : 'bg-[#E2E8F0] text-[#94A3B8] cursor-default'}`}>
                  {replySending
                    ? <div className="w-3.5 h-3.5 border-[2px] border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                    : <i className="fas fa-paper-plane text-[0.7rem]"></i>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---- Main admin dashboard ----
  return (
    <>
      <Header title="Admin" icon="fa-shield-alt" iconColor="#FBBF24" rightElement={<div className="flex items-center gap-1.5"><button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={async () => { setLoading(true); await loadData(); await loadDeposits(); await loadWithdrawals(); await loadConfig(); addToast('Données actualisées', 'success'); }} title="Actualiser"><i className="fas fa-sync-alt"></i></button><button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => useAppStore.getState().setPage('profile')}><i className="fas fa-arrow-left"></i></button></div>} />
      <div className="px-[18px] py-4 pb-[88px] flex-1 w-full">
        {/* Alert banner */}
        <div className="rounded-xl p-3.5 flex items-start gap-3 mb-[18px] bg-[#FFFBEB] border-l-[3px] border-[#F59E0B]">
          <i className="fas fa-exclamation-triangle text-[#B45309] mt-0.5 shrink-0 text-[0.9rem]"></i>
          <div><h4 className="text-[0.82rem] mb-0.5 font-bold text-[#B45309]">Zone Sécurisée</h4><p className="text-[0.78rem] leading-relaxed text-[#92400E]">Données en temps réel. Actualisation automatique toutes les 5 secondes.</p></div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 mb-[18px]">
          {[
            { val: stats.total_users || 0, label: 'Users', icon: 'fa-users', color: 'text-[#3B82F6]' },
            { val: formatMoney(stats.total_invested || 0), label: 'Investi', icon: 'fa-chart-line', color: 'text-[#8B5CF6]' },
            { val: stats.active_projects || 0, label: 'Projets', icon: 'fa-project-diagram', color: 'text-[#F59E0B]' },
            { val: stats.total_referrals || 0, label: 'Parrainages', icon: 'fa-user-friends', color: 'text-[#EC4899]' },
            { val: formatMoney(stats.total_balance || 0), label: 'Volume', icon: 'fa-coins', color: 'text-[#00C853]' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
              <i className={`fas ${s.icon} ${s.color} text-[0.85rem] mb-1.5 block`}></i>
              <div className="text-[1.3rem] font-black text-[#1A2332] tracking-[-0.3px]">{s.val}</div>
              <div className="text-[0.58rem] text-[#94A3B8] mt-1 font-medium uppercase tracking-[0.4px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white rounded-xl p-[3px] mb-[18px] gap-[3px] shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.04)]">
          <button onClick={() => setTab('users')} className={`flex-1 py-2.5 text-center text-[0.68rem] font-semibold rounded-lg border-none cursor-pointer font-[Inter] transition-all flex items-center justify-center gap-1 ${tab === 'users' ? 'bg-[#0B1120] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#64748B] bg-transparent'}`}><i className="fas fa-users"></i> Users</button>
          <button onClick={() => { setTab('messages'); loadChats(); }} className={`flex-1 py-2.5 text-center text-[0.68rem] font-semibold rounded-lg border-none cursor-pointer font-[Inter] transition-all flex items-center justify-center gap-1 ${tab === 'messages' ? 'bg-[#0B1120] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#64748B] bg-transparent'}`}><i className="fas fa-comments"></i> Msgs {totalUnread > 0 && <span className="bg-red-500 text-white text-[0.45rem] py-0.5 px-1 rounded-md font-extrabold min-w-[14px]">{totalUnread}</span>}</button>
          <button onClick={() => { setTab('deposits'); loadDeposits(); }} className={`flex-1 py-2.5 text-center text-[0.68rem] font-semibold rounded-lg border-none cursor-pointer font-[Inter] transition-all flex items-center justify-center gap-1 ${tab === 'deposits' ? 'bg-[#0B1120] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#64748B] bg-transparent'}`}><i className="fas fa-wallet"></i> TRX {depositStats.pending > 0 && <span className="bg-[#F59E0B] text-white text-[0.45rem] py-0.5 px-1 rounded-md font-extrabold min-w-[14px]">{depositStats.pending}</span>}</button>
          <button onClick={() => { setTab('withdrawals'); loadWithdrawals(); }} className={`flex-1 py-2.5 text-center text-[0.68rem] font-semibold rounded-lg border-none cursor-pointer font-[Inter] transition-all flex items-center justify-center gap-1 ${tab === 'withdrawals' ? 'bg-[#0B1120] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#64748B] bg-transparent'}`}><i className="fas fa-arrow-up"></i> Retraits {withdrawalStats.pending > 0 && <span className="bg-[#F59E0B] text-white text-[0.45rem] py-0.5 px-1 rounded-md font-extrabold min-w-[14px]">{withdrawalStats.pending}</span>}</button>
        </div>

        {tab === 'users' && (
          <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden border border-[rgba(0,0,0,0.03)]">
            <div className="px-[18px] py-3.5 border-b border-[rgba(0,0,0,0.04)] flex justify-between items-center">
              <h3 className="text-[0.85rem] font-bold m-0">Utilisateurs inscrits</h3>
              <span className="px-2.5 py-1 rounded-md text-[0.58rem] font-bold uppercase tracking-[0.5px] bg-[#1a1a1a] text-[#FBBF24] border border-[rgba(251,191,36,0.25)]">{users.length}</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto px-[18px]">
              {users.length === 0 ? <p className="text-center text-[#94A3B8] py-7 text-[0.82rem]">Aucun utilisateur</p> : users.map((u: any) => (
                <div key={u.id} className="py-3 border-b border-[rgba(0,0,0,0.04)] last:border-none">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[0.84rem] mb-0.5 font-semibold">{esc(u.name)} {u.role === 'admin' && <i className="fas fa-shield-alt text-[#FBBF24] text-[0.5rem]"></i>}</h5>
                      <span className="text-[0.66rem] text-[#64748B]">{esc(u.email)}</span><br />
                      <small className="text-[0.56rem] text-[#94A3B8] font-mono">{u.id.slice(0, 10)}</small>
                    </div>
                    <div className="text-right shrink-0 ml-2.5">
                      <strong className="block text-[#009624] text-[0.84rem] font-extrabold">{formatMoney(u.balance)}</strong>
                      <small className="text-[0.62rem] text-[#64748B]">{u.hasInvested ? '✓ Investisseur' : '— Inactif'}</small>
                    </div>
                  </div>
                  {/* Referral info row */}
                  {(u.referralCount > 0 || u.referredByCode || (u.referredUsers && u.referredUsers.length > 0)) && (
                    <div className="mt-2 pt-2 border-t border-[rgba(0,0,0,0.04)]">
                      <div className="flex flex-wrap items-center gap-1.5 text-[0.6rem]">
                        <span className="px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] font-bold">
                          <i className="fas fa-user-friends mr-0.5"></i> Code: {u.referralCode}
                        </span>
                        {u.referralCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] font-bold">
                            {u.referralCount} filleul{u.referralCount > 1 ? 's' : ''}
                          </span>
                        )}
                        {u.referredByCode && (
                          <span className="px-2 py-0.5 rounded-md bg-[#DBEAFE] text-[#1E40AF] font-bold">
                            <i className="fas fa-link mr-0.5"></i> Parrainé par {u.referredByCode}
                          </span>
                        )}
                      </div>
                      {u.referredUsers && u.referredUsers.length > 0 && (
                        <div className="mt-1.5 space-y-1">
                          {u.referredUsers.map((r: any, ri: number) => (
                            <div key={ri} className="flex items-center gap-2 text-[0.6rem] text-[#64748B] bg-[#F8FAFC] rounded-lg px-2.5 py-1.5">
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] flex items-center justify-center text-white text-[0.4rem] font-bold shrink-0">{r.name ? r.name[0].toUpperCase() : '?'}</div>
                              <span className="font-semibold text-[#1A2332]">{esc(r.name)}</span>
                              <span className="text-[#94A3B8]">·</span>
                              <span>{r.date}</span>
                              {r.hasInvested && <span className="text-[#00C853] font-bold">✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'messages' && (
          <div>
            {/* Search bar */}
            <div className="relative mb-4">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-[#94A3B8] text-[0.78rem]"></i>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="w-full py-3 pl-10 pr-4 bg-white border-[1.5px] border-[rgba(0,0,0,0.06)] rounded-xl text-[0.84rem] outline-none font-[Inter] text-[#1A2332] transition-all focus:border-[#F59E0B] focus:shadow-[0_0_0_3px_rgba(245,158,11,0.08)] placeholder:text-[#94A3B8]"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none text-[#94A3B8] cursor-pointer text-[0.7rem] p-1"><i className="fas fa-times-circle"></i></button>
              )}
            </div>

            {/* Conversation stats */}
            {conversations.length > 0 && (
              <div className="flex gap-2 mb-4">
                <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                  <div className="text-[1rem] font-black text-[#1A2332]">{conversations.length}</div>
                  <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">Conversations</div>
                </div>
                <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                  <div className="text-[1rem] font-black text-red-500">{totalUnread}</div>
                  <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">Non répondus</div>
                </div>
                <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                  <div className="text-[1rem] font-black text-[#00C853]">{conversations.filter((c: any) => c.unread_count === 0).length}</div>
                  <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">Répondus</div>
                </div>
              </div>
            )}

            {filteredConversations.length === 0 ? (
              <div className="text-center text-[#94A3B8] py-10 text-[0.82rem]">
                <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
                  <i className={`fas ${searchQuery ? 'fa-search' : 'fa-inbox'} text-2xl text-[#CBD5E1]`}></i>
                </div>
                <p className="font-semibold text-[#64748B]">{searchQuery ? 'Aucun résultat' : 'Aucun message'}</p>
                <p className="text-[0.72rem] mt-1">{searchQuery ? 'Essayez un autre terme de recherche' : 'Les conversations apparaîtront ici'}</p>
              </div>
            ) : filteredConversations.map((c: any) => {
              const initials = c.user_name ? c.user_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) : '??';
              const lastMsg = c.last_message;
              const hasUnread = (c.unread_count || 0) > 0;
              return (
                <div key={c.user_id} className={`bg-white rounded-2xl mb-2.5 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border transition-all active:scale-[0.98] cursor-pointer ${hasUnread ? 'border-l-[3px] border-l-[#F59E0B] border-t-[rgba(0,0,0,0.03)] border-r-[rgba(0,0,0,0.03)] border-b-[rgba(0,0,0,0.03)]' : 'border-[rgba(0,0,0,0.03)]'}`}>
                  <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#FAFBFC] transition-colors" onClick={() => { setActiveConv(c.user_id); setReplyText(''); }}>
                    <div className="relative shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-[0.72rem] text-white shadow-md ${hasUnread ? 'bg-gradient-to-br from-[#F59E0B] to-[#D97706]' : 'bg-gradient-to-br from-[#60A5FA] to-[#3B82F6]'}`}>{esc(initials)}</div>
                      {hasUnread && (
                        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white px-1">
                          <span className="text-[0.48rem] text-white font-bold">{c.unread_count}</span>
                        </div>
                      )}
                      {!hasUnread && c.total_messages > 0 && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#00C853] rounded-full border-2 border-white flex items-center justify-center">
                          <i className="fas fa-check text-white text-[0.3rem]"></i>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <h5 className={`text-[0.84rem] font-bold text-[#1A2332] ${hasUnread ? '' : ''}`}>{esc(c.user_name)}</h5>
                          {c.user_has_invested && <i className="fas fa-gem text-[#F59E0B] text-[0.5rem]"></i>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {lastMsg && <span className="text-[0.56rem] text-[#94A3B8]">{lastMsg.date} · {lastMsg.time}</span>}
                        </div>
                      </div>
                      <p className="text-[0.74rem] text-[#64748B] whitespace-nowrap overflow-hidden text-ellipsis leading-snug">
                        {lastMsg?.is_admin && <span className="text-[#F59E0B] font-semibold mr-1">Admin :</span>}
                        {lastMsg?.content ? esc(lastMsg.content).substring(0, 50) : 'Aucun message'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[0.56rem] text-[#CBD5E1]">{c.total_messages} msg{c.total_messages > 1 ? 's' : ''}</span>
                        <span className="text-[0.56rem] text-[#CBD5E1]">·</span>
                        <span className="text-[0.56rem] text-[#CBD5E1]">{formatMoney(c.user_balance)}</span>
                      </div>
                    </div>
                    <i className={`fas fa-chevron-right text-[0.55rem] shrink-0 ${hasUnread ? 'text-[#F59E0B]' : 'text-[#CBD5E1]'}`}></i>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'deposits' && (
          <div>
            {/* Config TRX */}
            <div className="bg-white rounded-xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2962FF] to-[#1565C0] flex items-center justify-center text-white text-[0.7rem]"><i className="fas fa-cog"></i></div>
                  <h3 className="text-[0.85rem] font-bold text-[#1A2332] m-0">Configuration TRX</h3>
                </div>
                <button onClick={() => setConfigEditing(!configEditing)} className="text-[0.68rem] py-1.5 px-3 rounded-lg border-none cursor-pointer font-semibold font-[Inter] transition-all active:scale-95 bg-[#F1F5F9] text-[#64748B]">
                  <i className={`fas ${configEditing ? 'fa-times' : 'fa-pen'} mr-1`}></i>{configEditing ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              {configEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 text-[0.68rem] font-semibold text-[#64748B]">Adresse TRX de l&apos;admin</label>
                    <input type="text" value={configAddr} onChange={(e) => setConfigAddr(e.target.value)} placeholder="T..." className="w-full py-2.5 px-3 bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-lg text-[0.78rem] font-mono outline-none focus:border-[#2962FF] text-[#1A2332]" />
                  </div>
                  <div>
                    <label className="block mb-1 text-[0.68rem] font-semibold text-[#64748B]">Prix TRX (USD)</label>
                    <input type="number" step="0.0001" value={configPrice} onChange={(e) => setConfigPrice(e.target.value)} placeholder="0.12" className="w-full py-2.5 px-3 bg-[#F8FAFC] border-[1.5px] border-[#E2E8F0] rounded-lg text-[0.78rem] outline-none focus:border-[#2962FF] text-[#1A2332]" />
                  </div>
                  <button onClick={handleSaveConfig} disabled={configSaving} className="w-full py-2.5 rounded-lg bg-[#2962FF] text-white text-[0.78rem] font-semibold border-none cursor-pointer font-[Inter] transition-all active:scale-[0.97] disabled:opacity-60">
                    {configSaving ? 'Enregistrement...' : 'Sauvegarder'}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[0.72rem] text-[#64748B]">Adresse admin</span>
                    <span className="text-[0.68rem] font-mono text-[#1A2332] max-w-[200px] truncate">{siteConfig?.adminTrxAddress || 'Non configurée'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[0.72rem] text-[#64748B]">Prix TRX</span>
                    <span className="text-[0.72rem] font-bold text-[#2962FF]">{siteConfig?.trxUsdPrice || 0} $</span>
                  </div>
                  {!siteConfig?.adminTrxAddress && (
                    <div className="rounded-lg p-2.5 bg-[#FEF3C7] border-l-2 border-[#F59E0B] mt-2">
                      <p className="text-[0.68rem] text-[#92400E]"><i className="fas fa-exclamation-triangle mr-1"></i>Configurez votre adresse TRX pour activer les dépôts</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="text-[1rem] font-black text-[#F59E0B]">{depositStats.pending || 0}</div>
                <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">En attente</div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="text-[1rem] font-black text-[#00C853]">{depositStats.approved || 0}</div>
                <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">Approuvés</div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="text-[1rem] font-black text-[#EF4444]">{depositStats.rejected || 0}</div>
                <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">Rejetés</div>
              </div>
            </div>

            {/* Deposit list */}
            {pendingDeposits.length === 0 ? (
              <div className="text-center text-[#94A3B8] py-8 text-[0.82rem]">
                <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-inbox text-xl text-[#CBD5E1]"></i>
                </div>
                <p className="font-semibold text-[#64748B]">Aucun dépôt</p>
                <p className="text-[0.7rem] mt-1">Les dépôts TRX apparaîtront ici</p>
              </div>
            ) : pendingDeposits.map((dep: any) => {
              const d = new Date(dep.createdAt);
              const ds = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const isPending = dep.status === 'pending';
              const isApproved = dep.status === 'approved';
              return (
                <div key={dep.id} className={`bg-white rounded-xl mb-2.5 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border ${isPending ? 'border-l-[3px] border-l-[#F59E0B]' : isApproved ? 'border-l-[3px] border-l-[#00C853]' : 'border-l-[3px] border-l-[#EF4444]'} border-t-[rgba(0,0,0,0.03)] border-r-[rgba(0,0,0,0.03)] border-b-[rgba(0,0,0,0.03)]`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[0.76rem] font-bold text-[#1A2332]">{esc(dep.user?.name || 'Inconnu')}</span>
                      <span className="text-[0.6rem] text-[#94A3B8] ml-1.5">{dep.user?.email || ''}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[0.52rem] font-bold uppercase ${isPending ? 'bg-[#FEF3C7] text-[#92400E]' : isApproved ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>{isPending ? 'En attente' : isApproved ? 'Approuvé' : 'Rejeté'}</span>
                  </div>
                  <div className="flex items-center gap-3 mb-2 text-[0.68rem]">
                    <div className="flex-1">
                      <span className="text-[#64748B]">Montant : </span>
                      <span className="font-bold text-[#1A2332]">{dep.amountUsd} USD</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[#64748B]">TRX : </span>
                      <span className="font-bold text-[#2962FF]">{dep.amountTrx} TRX</span>
                    </div>
                  </div>
                  <div className="text-[0.62rem] text-[#94A3B8] mb-2">
                    <span>Adresse : </span><code className="font-mono text-[#64748B]">{dep.userAddress?.slice(0, 20)}...{dep.userAddress?.slice(-8)}</code>
                    <span className="mx-2">·</span>{ds}
                  </div>
                  {isPending && (
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleDepositAction(dep.id, 'approve')} className="flex-1 py-2 rounded-lg bg-[#00C853] text-white text-[0.72rem] font-bold border-none cursor-pointer font-[Inter] transition-all active:scale-95">
                        <i className="fas fa-check mr-1"></i>Approuver
                      </button>
                      <button onClick={() => handleDepositAction(dep.id, 'reject')} className="flex-1 py-2 rounded-lg bg-[#F1F5F9] text-[#64748B] text-[0.72rem] font-bold border-none cursor-pointer font-[Inter] transition-all active:scale-95">
                        <i className="fas fa-times mr-1"></i>Rejeter
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === 'withdrawals' && (
          <div>
            {/* Stats */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="text-[1rem] font-black text-[#F59E0B]">{withdrawalStats.pending || 0}</div>
                <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">En attente</div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="text-[1rem] font-black text-[#00C853]">{withdrawalStats.approved || 0}</div>
                <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">Approuvés</div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="text-[1rem] font-black text-[#F59E0B]">{withdrawalStats.totalAmount ? formatMoney(withdrawalStats.totalAmount) : '0,00 $'}</div>
                <div className="text-[0.55rem] text-[#94A3B8] font-medium uppercase tracking-wide">Total retiré</div>
              </div>
            </div>

            {/* Withdrawal list */}
            {withdrawals.length === 0 ? (
              <div className="text-center text-[#94A3B8] py-8 text-[0.82rem]">
                <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                  <i className="fas fa-inbox text-xl text-[#CBD5E1]"></i>
                </div>
                <p className="font-semibold text-[#64748B]">Aucun retrait</p>
                <p className="text-[0.7rem] mt-1">Les demandes de retrait apparaîtront ici</p>
              </div>
            ) : withdrawals.map((w: any) => {
              const d = new Date(w.createdAt);
              const ds = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
              const isPending = w.status === 'pending';
              const isApproved = w.status === 'approved';
              return (
                <div key={w.id} className={`bg-white rounded-xl mb-2.5 p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border ${isPending ? 'border-l-[3px] border-l-[#F59E0B]' : isApproved ? 'border-l-[3px] border-l-[#00C853]' : 'border-l-[3px] border-l-[#EF4444]'} border-t-[rgba(0,0,0,0.03)] border-r-[rgba(0,0,0,0.03)] border-b-[rgba(0,0,0,0.03)]`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-[0.76rem] font-bold text-[#1A2332]">{esc(w.user?.name || 'Inconnu')}</span>
                      <span className="text-[0.62rem] text-[#94A3B8] ml-2">{ds}</span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-md text-[0.55rem] font-bold uppercase tracking-[0.5px] ${isPending ? 'bg-[#FEF3C7] text-[#92400E]' : isApproved ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#991B1B]'}`}>{isPending ? 'En attente' : isApproved ? 'Approuvé' : 'Rejeté'}</span>
                  </div>
                  <div className="text-[0.68rem] text-[#94A3B8] mb-1">
                    <i className="fas fa-user mr-1"></i>{esc(w.user?.email || '')} · Gains: {formatMoney(w.user?.earnings || 0)} · Solde: {formatMoney(w.user?.balance || 0)}
                  </div>
                  <div className="bg-[#F8FAFC] rounded-lg p-2.5 mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[0.65rem] text-[#64748B]">Montant</span>
                      <span className="text-[0.82rem] font-black text-[#1A2332]">{formatMoney(w.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[0.65rem] text-[#64748B]">Adresse TRX</span>
                      <span className="text-[0.62rem] font-mono text-[#1A2332] max-w-[200px] truncate">{w.trxAddress}</span>
                    </div>
                  </div>
                  {isPending && (
                    <div className="flex gap-2">
                      <button onClick={() => handleWithdrawalAction(w.id, 'approve')} className="flex-1 py-2.5 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer font-[Inter] transition-all active:scale-95 bg-gradient-to-r from-[#00E676] to-[#00C853] text-white shadow-[0_2px_8px_rgba(0,200,83,0.15)]"><i className="fas fa-check mr-1"></i>Approuver</button>
                      <button onClick={() => handleWithdrawalAction(w.id, 'reject')} className="flex-1 py-2.5 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer font-[Inter] transition-all active:scale-95 bg-gradient-to-r from-[#F87171] to-[#EF4444] text-white shadow-[0_2px_8px_rgba(239,68,68,0.15)]"><i className="fas fa-times mr-1"></i>Rejeter</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ==================== PROFILE SCREEN (LOGGED IN) ====================
function ProfileScreen() {
  const { user, clearUser, setPage, addToast, setUser } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);

  const handleLogout = async () => {
    setModalOpen(false);
    await fetch('/api/auth/logout', { method: 'POST' });
    clearUser();
    addToast('Déconnexion réussie', 'info');
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.success) setUser(data.user);
    } catch { /* ignore */ }
  }, [setUser]);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  if (!user) return null;

  return (
    <>
      <Header title="Profil" rightElement={<button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-arrow-left"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full text-center max-w-[380px] mx-auto">
        <div className="w-[88px] h-[88px] rounded-3xl bg-gradient-to-br from-[#DCFCE7] to-[#BBF7D0] mx-auto mb-4 flex items-center justify-center relative overflow-hidden shadow-[0_6px_20px_rgba(0,200,83,0.12)]">
          <LogoImg className="w-[50px] h-[50px] object-contain relative z-[1]" />
          <div className="absolute bottom-1 right-1 w-[18px] h-[18px] bg-[#00C853] rounded-[7px] border-[2.5px] border-[#F2F5F9]" />
        </div>
        <h2 className="mb-0.5 font-extrabold text-lg">{esc(user.name)}</h2>
        <p className="text-[rgba(0,0,0,0.3)] mb-6 text-[0.82rem]">{esc(user.email)}</p>

        <div className="bg-[rgba(255,255,255,0.95)] backdrop-blur-xl rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] text-left mb-[18px]">
          {[
            ['ID Compte', <span key="id" className="font-mono text-[0.7rem] text-[#94A3B8]">{user.id.slice(0, 10)}</span>],
            ['Statut', <span key="st" className="px-2.5 py-1 rounded-md text-[0.58rem] font-bold uppercase tracking-[0.5px] bg-[#DCFCE7] text-[#166534]">Vérifié</span>],
            ['Rôle', <span key="r" className={`px-2.5 py-1 rounded-md text-[0.58rem] font-bold uppercase tracking-[0.5px] ${user.role === 'admin' ? 'bg-[#1a1a1a] text-[#FBBF24] border border-[rgba(251,191,36,0.25)]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>{user.role === 'admin' ? 'Admin' : 'Membre'}</span>],
            ['Dépôts', <span key="c" className="font-bold text-[0.8rem] text-[#1A2332]">{user.depositCount} dépôt(s)</span>],
            ['Filleuls', <span key="ref" className="font-bold text-[0.8rem] text-[#1A2332]">{user.referralCount || 0}</span>],
          ].map(([label, val], i) => (
            <div key={i} className={`flex justify-between items-center ${i < 4 ? 'mb-3 pb-3 border-b border-[rgba(0,0,0,0.04)]' : ''}`}>
              <span className="text-[0.8rem] text-[#64748B] font-medium">{label}</span>
              {val}
            </div>
          ))}
        </div>

        {/* Referral Code Card */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-2xl p-5 mb-[18px] text-center text-white border border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <i className="fas fa-user-friends text-[#FBBF24]"></i>
            <h4 className="text-[0.85rem] font-bold">Mon code de parrainage</h4>
          </div>
          <div className="bg-[rgba(255,255,255,0.08)] rounded-xl p-3 mb-3 border border-[rgba(255,255,255,0.1)]">
            <span className="text-[1.3rem] font-black font-mono tracking-[3px] text-[#FBBF24]">{user.referralCode}</span>
          </div>
          <p className="text-[0.68rem] text-[rgba(255,255,255,0.4)] mb-3">Partagez ce code avec vos amis. Après le 3e retrait, le parrainage devient obligatoire.</p>
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(user.referralCode || ''); addToast('Code copié !', 'success'); }} className="flex-1 py-2.5 rounded-xl bg-[rgba(0,200,83,0.15)] text-[#86EFAC] text-[0.76rem] font-semibold border-none cursor-pointer font-[Inter] transition-transform active:scale-95 flex items-center justify-center gap-1.5"><i className="fas fa-copy"></i> Copier</button>
            <button onClick={() => setPage('referral')} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] text-[0.76rem] font-semibold border-none cursor-pointer font-[Inter] transition-transform active:scale-95 flex items-center justify-center gap-1.5"><i className="fas fa-share-alt"></i> Partager</button>
          </div>
        </div>

        <div className="bg-[rgba(255,255,255,0.95)] rounded-2xl p-4 px-[18px] text-left mb-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)]">
          <h4 className="text-[0.82rem] mb-2.5 font-bold"><i className="fas fa-history text-[#2962FF] mr-1.5"></i>Historique</h4>
          {(!user.transactions || user.transactions.length === 0) ? (
            <p className="text-center text-[#94A3B8] text-[0.78rem] py-3">Aucune transaction</p>
          ) : user.transactions.slice(0, 10).map((tx, i) => {
            const isD = tx.type === 'deposit';
            const isW = tx.type === 'withdrawal';
            const d = new Date(tx.createdAt);
            const ds = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={i} className="flex items-center gap-3 py-3 border-b border-[rgba(0,0,0,0.04)] last:border-none">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[0.75rem] shrink-0 ${isD ? 'bg-[#DCFCE7] text-[#166534]' : isW ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#DBEAFE] text-[#1E40AF]'}`}>
                  <i className={`fas fa-${isW ? 'arrow-up' : isD ? 'arrow-down' : 'hand-holding-usd'}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-[0.78rem] mb-0.5 font-semibold">{isW ? 'Retrait' : isD ? 'Dépôt' : 'Réclamation'}{isD && tx.gain ? <span className="text-[#009624] font-bold text-[0.68rem] ml-1">+{formatMoney(tx.gain)}</span> : ''}</h5>
                  <small className="text-[0.6rem] text-[#94A3B8]">{ds}</small>
                </div>
                <div className={`font-extrabold text-[0.84rem] shrink-0 tracking-[-0.2px] ${isW ? 'text-[#92400E]' : isD ? 'text-[#009624]' : 'text-[#1565C0]'}`}>{isW ? '-' : '+'}{formatMoney(tx.amount)}</div>
              </div>
            );
          })}
        </div>

        {user.role === 'admin' && (
          <button onClick={() => setPage('admin')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] font-[Inter] transition-transform active:scale-[0.97] mb-3 flex items-center justify-center gap-2"><i className="fas fa-shield-alt"></i> Panneau Admin</button>
        )}
        <button onClick={() => setModalOpen(true)} className="w-full py-3.5 rounded-xl border-[1.5px] border-[rgba(239,68,68,0.15)] bg-transparent text-red-500 font-semibold text-[0.88rem] cursor-pointer font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2"><i className="fas fa-sign-out-alt"></i> Déconnexion</button>
      </div>
      {modalOpen && <Modal title="Déconnexion" text="Voulez-vous vous déconnecter ?" okText="Se déconnecter" okClass="bg-gradient-to-r from-[#F87171] to-[#EF4444]" onOk={handleLogout} onCancel={() => setModalOpen(false)} />}
    </>
  );
}

// ==================== PROJECTS SCREEN ====================
function ProjectsScreen() {
  const { user, setPage, setSelectedProjectId } = useAppStore();

  if (!user) return null;
  const projects = user.projects || [];
  const totalPotentialGain = user.totalPotentialGain || 0;

  const handleProjectClick = (projectId: string) => {
    setSelectedProjectId(projectId);
    setPage('project-detail');
  };

  return (
    <>
      <Header title="Mes Projets" icon="fa-briefcase" iconColor="#00C853" rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-arrow-left"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* Total Potential Gains */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-5 relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.1),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px] mb-1">Voir tous les gains</div>
            <div className="text-[1.8rem] font-black tracking-[-1px] text-[#86EFAC] mb-2">{formatMoney(totalPotentialGain)}</div>
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] text-[rgba(255,255,255,0.5)]">{projects.length} projet{projects.length > 1 ? 's' : ''} actif{projects.length > 1 ? 's' : ''}</span>
              <span className="text-[0.68rem] text-[#00C853] font-bold">7% – 15% / jour</span>
            </div>
          </div>
        </div>

        {/* Projects List */}
        {projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((p, i) => {
              const cat = getCategoryIcon(p.category);
              const potentialGain = p.potentialGain || (p.amount * p.dailyRate / 100);
              return (
                <div key={i} onClick={() => handleProjectClick(p.id)} className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)] cursor-pointer transition-transform active:scale-[0.98]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${cat.bg}`}>
                      <i className={`fas ${cat.icon} text-[1rem]`} style={{ color: cat.color }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.88rem] font-bold text-[#1A2332]">{esc(p.name)}</div>
                      <div className="text-[0.65rem] text-[#94A3B8] font-medium">{p.category}</div>
                    </div>
                    <div className="px-2.5 py-1 rounded-md text-[0.6rem] font-bold bg-[#DCFCE7] text-[#166534]">{p.dailyRate}%</div>
                  </div>
                  <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl px-3.5 py-2.5">
                    <div>
                      <div className="text-[0.6rem] text-[#94A3B8] font-medium uppercase tracking-[0.3px]">Investi</div>
                      <div className="text-[0.85rem] font-black text-[#1A2332]">{formatMoney(p.amount)}</div>
                    </div>
                    <div className="w-px h-8 bg-[#E2E8F0]"></div>
                    <div>
                      <div className="text-[0.6rem] text-[#94A3B8] font-medium uppercase tracking-[0.3px]">Gain potentiel</div>
                      <div className="text-[0.85rem] font-black text-[#009624]">+{formatMoney(potentialGain)}</div>
                    </div>
                    <i className="fas fa-chevron-right text-[#CBD5E1] text-[0.65rem]"></i>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-briefcase text-[#94A3B8] text-[1.5rem]"></i>
            </div>
            <h4 className="text-[0.95rem] font-bold text-[#1A2332] mb-2">Aucun projet actif</h4>
            <p className="text-[0.78rem] text-[#64748B] mb-5">Investissez pour commencer à gagner des revenus journaliers.</p>
            <button onClick={() => setPage('invest')} className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.85rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97]">
              <i className="fas fa-rocket mr-1.5"></i> Investir
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ==================== REFERRAL SCREEN ====================
function ReferralScreen() {
  const { user, setPage, addToast } = useAppStore();
  const [referrals, setReferrals] = useState<{ id: string; name: string; email: string; hasInvested: boolean; date: string }[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(true);

  useEffect(() => {
    const fetchReferrals = async () => {
      try {
        const res = await fetch('/api/referral/list');
        const data = await res.json();
        if (data.success) {
          setReferrals(data.referrals || []);
        }
      } catch { /* ignore */ }
      setLoadingReferrals(false);
    };
    fetchReferrals();
  }, []);

  if (!user) return null;

  const referralCode = user.referralCode || '';
  const referralCount = user.referralCount || 0;
  const requiredReferrals = user.requiredReferrals || 0;
  const needsReferral = user.needsReferral;
  const completedWithdrawals = user.completedWithdrawals || 0;

  const shareText = `Rejoins Be Rich et gagne jusqu'à 15% par jour ! Utilise mon code de parrainage : ${referralCode}`;
  const shareUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    addToast('Code copié !', 'success');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Be Rich - Parrainage',
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      addToast('Lien copié !', 'success');
    }
  };

  return (
    <>
      <Header title="Parrainage" icon="fa-user-friends" iconColor="#F59E0B" rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('wallet')}><i className="fas fa-times"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-6 mb-5 relative overflow-hidden border border-[rgba(255,255,255,0.05)] text-center">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(251,191,36,0.1),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FBBF24] to-[#F59E0B] flex items-center justify-center mx-auto mb-4 shadow-[0_4px_20px_rgba(251,191,36,0.3)]">
              <i className="fas fa-user-friends text-white text-[1.5rem]"></i>
            </div>
            <h3 className="text-[1.2rem] font-black mb-1">Parrainez vos amis</h3>
            <p className="text-[rgba(255,255,255,0.5)] text-[0.78rem] leading-relaxed">Partagez votre code et gagnez ensemble. Après votre 3e retrait, le parrainage devient obligatoire pour continuer à retirer.</p>
          </div>
        </div>

        {/* Referral Code */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)] text-center">
          <div className="text-[0.72rem] text-[#64748B] font-semibold uppercase tracking-[1px] mb-2">Votre code de parrainage</div>
          <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FDE68A] rounded-xl p-4 mb-3 border border-[rgba(251,191,36,0.2)]">
            <span className="text-[1.6rem] font-black font-mono tracking-[4px] text-[#92400E]">{referralCode}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.82rem] border-none cursor-pointer font-[Inter] transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(0,200,83,0.2)]"><i className="fas fa-copy"></i> Copier le code</button>
            <button onClick={handleShare} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] font-bold text-[0.82rem] border-none cursor-pointer font-[Inter] transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(251,191,36,0.2)]"><i className="fas fa-share-alt"></i> Partager</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-white rounded-xl p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center mx-auto mb-1.5"><i className="fas fa-users text-[#166534]"></i></div>
            <div className="font-extrabold text-[1.2rem] text-[#1A2332]">{referralCount}</div>
            <div className="text-[0.58rem] text-[#94A3B8] font-medium uppercase tracking-[0.5px]">Filleuls</div>
          </div>
          <div className="bg-white rounded-xl p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center mx-auto mb-1.5"><i className="fas fa-check-circle text-[#92400E]"></i></div>
            <div className="font-extrabold text-[1.2rem] text-[#1A2332]">{completedWithdrawals}</div>
            <div className="text-[0.58rem] text-[#94A3B8] font-medium uppercase tracking-[0.5px]">Retraits</div>
          </div>
        </div>

        {/* Referral Requirement Status */}
        {needsReferral && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-4 bg-[#FEE2E2] border-l-[3px] border-[#DC2626]">
            <i className="fas fa-exclamation-triangle text-[#DC2626] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#991B1B]">Parrainage obligatoire</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#991B1B]">Vous devez avoir au moins <strong>{requiredReferrals}</strong> filleul{requiredReferrals > 1 ? 's' : ''} pour effectuer votre prochain retrait. Actuellement : <strong>{referralCount}</strong> filleul{referralCount > 1 ? 's' : ''}. Il vous manque <strong>{requiredReferrals - referralCount}</strong> filleul{requiredReferrals - referralCount > 1 ? 's' : ''}.</p>
            </div>
          </div>
        )}

        {!needsReferral && completedWithdrawals >= 1 && (
          <div className="rounded-xl p-3.5 flex items-start gap-3 mb-4 bg-[#F0FDF4] border-l-[3px] border-[#00C853]">
            <i className="fas fa-check-circle text-[#166534] mt-0.5 shrink-0 text-[0.9rem]"></i>
            <div className="flex-1">
              <h4 className="text-[0.82rem] mb-0.5 font-bold text-[#166534]">Parrainage OK</h4>
              <p className="text-[0.72rem] leading-relaxed text-[#15803D]">Vous remplissez les conditions de parrainage pour votre prochain retrait.</p>
            </div>
          </div>
        )}

        {/* Referred Users List */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
          <h4 className="text-[0.88rem] font-bold text-[#1A2332] mb-3 flex items-center gap-2"><i className="fas fa-list text-[#64748B]"></i> Mes filleuls</h4>
          {loadingReferrals ? (
            <div className="flex items-center justify-center py-5">
              <div className="w-6 h-6 border-2 border-[rgba(0,0,0,0.06)] border-t-[#F59E0B] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
            </div>
          ) : referrals.length === 0 ? (
            <div className="text-center py-5">
              <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-2">
                <i className="fas fa-user-plus text-[#CBD5E1]"></i>
              </div>
              <p className="text-[0.78rem] text-[#94A3B8]">Aucun filleul pour le moment</p>
              <p className="text-[0.68rem] text-[#CBD5E1] mt-1">Partagez votre code pour inviter des amis</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {referrals.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 bg-[#F8FAFC] rounded-xl border border-[rgba(0,0,0,0.03)]" style={{ animation: 'cbIn 0.3s cubic-bezier(0.34,1.56,0.64,1)', animationDelay: `${i * 50}ms` }}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] flex items-center justify-center text-white font-bold text-[0.6rem] shrink-0 shadow-sm">{r.name ? r.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.8rem] font-semibold text-[#1A2332] truncate">{esc(r.name)}</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">{r.date}</div>
                  </div>
                  <div className="shrink-0">
                    {r.hasInvested ? (
                      <span className="px-2 py-0.5 rounded-md text-[0.55rem] font-bold bg-[#DCFCE7] text-[#166534]">Investisseur</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[0.55rem] font-bold bg-[#F1F5F9] text-[#94A3B8]">Inactif</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rules */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
          <h4 className="text-[0.88rem] font-bold text-[#1A2332] mb-3 flex items-center gap-2"><i className="fas fa-info-circle text-[#64748B]"></i> Règles de parrainage</h4>
          <div className="space-y-3">
            {[
              { icon: 'fa-1', color: '#00C853', text: 'Les 2 premiers retraits sont libres.' },
              { icon: 'fa-2', color: '#F59E0B', text: 'À partir du 3e retrait, vous devez avoir au moins 1 filleul.' },
              { icon: 'fa-3', color: '#DC2626', text: 'Après chaque 2 retraits supplémentaires, un nouveau filleul est requis.' },
              { icon: 'fa-share-alt', color: '#7C3AED', text: 'Partagez votre code pour que vos amis s\'inscrivent.' },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[0.6rem] shrink-0" style={{ background: rule.color }}><i className={`fas ${rule.icon}`}></i></div>
                <p className="text-[0.75rem] text-[#475569] leading-relaxed pt-0.5">{rule.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== PROJECT DETAIL SCREEN ====================
function ProjectDetailScreen() {
  const { user, setUser, setPage, addToast, selectedProjectId, setSelectedProjectId } = useAppStore();
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [claimHistory, setClaimHistory] = useState<{ rate: number; amount: number; date: string; createdAt: string }[]>([]);
  const [alreadyClaimedToday, setAlreadyClaimedToday] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    if (!selectedProjectId) return;
    // Check if already claimed today for this project + load history
    const fetchData = async () => {
      try {
        setLoadingHistory(true);
        const res = await fetch(`/api/gains/status?projectId=${selectedProjectId}`);
        const data = await res.json();
        if (data.success) {
          setAlreadyClaimedToday(data.alreadyClaimedToday || false);
          setClaimHistory(data.history || []);
        }
      } catch { /* ignore */ }
      setLoadingHistory(false);
    };
    fetchData();
  }, [selectedProjectId, claimSuccess]);

  if (!user || !selectedProjectId) return null;
  const projects = user.projects || [];
  const project = projects.find((p) => p.id === selectedProjectId);
  if (!project) {
    return (
      <>
        <Header title="Projet" icon="fa-briefcase" iconColor="#00C853" rightElement={
          <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => { setSelectedProjectId(null); setPage('projects'); }}><i className="fas fa-arrow-left"></i></button>
        } />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#64748B]">Projet non trouvé</p>
        </div>
      </>
    );
  }

  const cat = getCategoryIcon(project.category);
  const potentialGain = project.potentialGain || (project.amount * project.dailyRate / 100);

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch('/api/projects/claim-daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh user data
        const sessRes = await fetch('/api/auth/session');
        const sessData = await sessRes.json();
        if (sessData.success && sessData.user) {
          setUser(sessData.user);
        }
        setAlreadyClaimedToday(true);
        setClaimSuccess(true);
        addToast(`+${data.gainAmount.toFixed(2)} $ réclamés !`, 'success');
        setTimeout(() => setClaimSuccess(false), 3000);
      } else {
        if (data.alreadyClaimed) {
          setAlreadyClaimedToday(true);
        }
        addToast(data.error, 'error');
      }
    } catch { addToast('Erreur réseau', 'error'); }
    setClaiming(false);
  };

  return (
    <>
      <Header title="Détail du projet" icon="fa-briefcase" iconColor="#00C853" rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => { setSelectedProjectId(null); setPage('projects'); }}><i className="fas fa-arrow-left"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* Project Header */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.1),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${cat.bg}`}>
                <i className={`fas ${cat.icon} text-[1.1rem]`} style={{ color: cat.color }}></i>
              </div>
              <div>
                <div className="text-[1rem] font-bold text-white">{esc(project.name)}</div>
                <div className="text-[0.68rem] text-[rgba(255,255,255,0.5)]">{project.category}</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1 bg-[rgba(255,255,255,0.06)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
                <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[0.3px]">Investi</div>
                <div className="text-[1rem] font-black text-white">{formatMoney(project.amount)}</div>
              </div>
              <div className="flex-1 bg-[rgba(0,200,83,0.08)] rounded-xl p-3 border border-[rgba(0,200,83,0.12)]">
                <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[0.3px]">Taux du jour</div>
                <div className="text-[1rem] font-black text-[#86EFAC]">{project.dailyRate}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Gain du jour Card */}
        <div className={`rounded-2xl p-5 mb-4 border ${claimSuccess ? 'bg-[#F0FDF4] border-[#86EFAC]' : alreadyClaimedToday ? 'bg-[#F8FAFC] border-[rgba(0,0,0,0.05)]' : 'bg-gradient-to-br from-[#F0FDF4] to-[#DCFCE7] border-[#86EFAC]'}`} style={claimSuccess ? { animation: 'cbIn 0.4s ease' } : {}}>
          <div className="flex items-center gap-2.5 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alreadyClaimedToday ? 'bg-[rgba(0,0,0,0.04)]' : 'bg-[#00C853]'}`}>
              <i className={`fas ${alreadyClaimedToday ? 'fa-check' : 'fa-coins'} text-[1rem] ${alreadyClaimedToday ? 'text-[#94A3B8]' : 'text-white'}`}></i>
            </div>
            <div className="flex-1">
              <h4 className="text-[0.88rem] font-bold text-[#1A2332]">{alreadyClaimedToday ? 'Déjà réclamé' : 'Gain du jour'}</h4>
              <p className="text-[0.68rem] text-[#64748B]">{alreadyClaimedToday ? 'Revenez demain pour ce projet' : 'Réclamez vos gains journaliers'}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] text-center">
            <div className="text-[0.68rem] text-[#64748B] font-medium mb-1">Gain potentiel</div>
            <div className="text-[1.8rem] font-black text-[#009624]">+{formatMoney(potentialGain)}</div>
            <div className="text-[0.65rem] text-[#00C853] font-semibold mt-1">à {project.dailyRate}% / jour</div>
          </div>

          {alreadyClaimedToday ? (
            <div className="w-full py-3 rounded-xl bg-[rgba(0,0,0,0.03)] text-[#94A3B8] font-semibold text-[0.82rem] text-center flex items-center justify-center gap-2">
              <i className="fas fa-check-circle"></i> Déjà réclamé aujourd&apos;hui
            </div>
          ) : (
            <button onClick={handleClaim} disabled={claiming} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">
              {claiming ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-coins"></i> Réclamer mes gains</>}
            </button>
          )}
        </div>

        {/* Project Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { icon: 'fa-wallet', color: 'bg-[#DCFCE7] text-[#166534]', val: formatMoney(project.amount), label: 'Investi' },
            { icon: 'fa-percentage', color: 'bg-[#FEF3C7] text-[#92400E]', val: `${project.dailyRate}%`, label: 'Taux' },
            { icon: 'fa-tag', color: 'bg-[#DBEAFE] text-[#1E40AF]', val: project.category, label: 'Catégorie' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
              <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center mx-auto mb-1 text-[0.75rem] ${s.color}`}><i className={`fas ${s.icon}`}></i></div>
              <div className="font-extrabold text-[0.75rem] text-[#1A2332] tracking-[-0.2px]">{s.val}</div>
              <div className="text-[0.52rem] text-[#94A3B8] mt-0.5 font-medium uppercase tracking-[0.4px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Claim History */}
        <div className="flex justify-between items-center mb-2.5">
          <h3 className="text-[0.9rem] font-bold text-[#1A2332]">Historique des gains</h3>
          <span className="text-[0.68rem] text-[#94A3B8]">5 derniers</span>
        </div>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-5 h-5 border-2 border-[#E2E8F0] border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
          </div>
        ) : claimHistory.length > 0 ? (
          <div className="space-y-2">
            {claimHistory.map((g, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-xl px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center"><i className="fas fa-coins text-[#009624] text-[0.65rem]"></i></div>
                  <div>
                    <div className="text-[0.78rem] font-bold text-[#1A2332]">+{formatMoney(g.amount)}</div>
                    <div className="text-[0.6rem] text-[#94A3B8]">{g.date}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md text-[0.55rem] font-bold bg-[#DCFCE7] text-[#166534]">{g.rate}%</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <p className="text-[0.78rem] text-[#94A3B8]">Aucun gain réclamé pour ce projet</p>
          </div>
        )}
      </div>
    </>
  );
}

// ==================== BOTTOM NAV ====================
function BottomNav() {
  const { currentPage, setPage, user } = useAppStore();
  if (!user) return null;

  const items = [
    { id: 'home', icon: 'fa-home', label: 'Accueil' },
    { id: 'wallet', icon: 'fa-wallet', label: 'Wallet' },
    { id: 'projects', icon: 'fa-briefcase', label: 'Projets', isFab: true },
    { id: 'chat', icon: 'fa-comment-alt', label: 'Chat' },
    { id: 'profile', icon: 'fa-user', label: 'Profil' },
  ];

  return (
    <nav className="absolute bottom-0 left-0 w-full h-[68px] bg-[rgba(255,255,255,0.92)] backdrop-blur-2xl flex justify-around items-center z-[100] border-t border-[rgba(0,0,0,0.04)] pb-2">
      {items.map((item) => (
        <div key={item.id} className="flex flex-col items-center justify-center text-[#94A3B8] text-[0.55rem] font-medium gap-[2px] cursor-pointer transition-all py-1.5" style={{ width: '20%' }}
          onClick={() => {
            if (item.id === 'admin' && user.role !== 'admin') return;
            setPage(item.id);
          }}>
          {item.isFab ? (
            <>
              <div className={`w-11 h-11 bg-gradient-to-br from-[#00E676] to-[#00C853] rounded-[13px] flex items-center justify-center text-white shadow-[0_4px_16px_rgba(0,200,83,0.3)] -mt-5 border-[3px] border-[#F2F5F9] transition-transform active:scale-90`}>
                <i className="fas fa-briefcase text-[0.95rem]"></i>
              </div>
              <span className="mt-0.5">Projets</span>
            </>
          ) : (
            <>
              <i className={`fas ${item.icon} text-[1.05rem] transition-transform ${currentPage === item.id ? 'text-[#00C853] -translate-y-0.5 scale-105' : ''}`}></i>
              <span className={currentPage === item.id ? 'text-[#00C853]' : ''}>{item.label}</span>
            </>
          )}
        </div>
      ))}
    </nav>
  );
}

// ==================== MAIN APP ====================
export default function BeRichApp() {
  const { user, currentPage, setPage, setUser, showSplash, setShowSplash, addToast } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.success && data.user) {
          setUser(data.user);
          setPage('home');
        } else {
          setPage('profile');
        }
      } catch {
        setPage('profile');
      }
      setInitialized(true);
      setShowSplash(false);
    };
    init();
  }, []);

  const handleSplashDone = useCallback(() => {
    setShowSplash(false);
  }, [setShowSplash]);

  if (!initialized) {
    return (
      <div className="bg-[#060A14] h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-gray-700 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="bg-[#060A14] min-h-screen flex items-center justify-center">
      <div id="app" className="w-full max-w-[430px] h-[100dvh] max-h-[932px] bg-[#F2F5F9] relative overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_0_120px_rgba(0,0,0,0.5)]">
        {showSplash && <SplashScreen onDone={handleSplashDone} />}

        <NotificationContainer />
        <ToastContainer />



        {/* Pages */}
        <div className={`absolute inset-0 bg-[#F2F5F9] overflow-y-auto overflow-x-hidden flex flex-col transition-all duration-300 ${!showSplash && currentPage !== 'profile' ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-full pointer-events-none'}`}>
          {currentPage === 'home' && <HomeScreen />}
          {currentPage === 'wallet' && <WalletScreen />}
          {currentPage === 'projects' && <ProjectsScreen />}
          {currentPage === 'project-detail' && <ProjectDetailScreen />}
          {currentPage === 'invest' && <InvestScreen />}
          {currentPage === 'withdraw' && <WithdrawalScreen />}
          {currentPage === 'add' && <AddProjectScreen />}
          {currentPage === 'chat' && <ChatScreen />}
          {currentPage === 'admin' && <AdminScreen />}
          {currentPage === 'referral' && <ReferralScreen />}
          {currentPage === 'profile' && user && <ProfileScreen />}
        </div>

        {/* Auth page */}
        {currentPage === 'profile' && !user && <AuthScreen />}

        {/* Logged in profile page */}
        {!showSplash && currentPage === 'profile' && user && (
          <div className="absolute inset-0 bg-[#F2F5F9] overflow-y-auto flex flex-col z-10">
            <ProfileScreen />
          </div>
        )}

        <BottomNav />
      </div>
    </div>
  );
}
