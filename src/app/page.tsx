'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';

const LOGO_URL = 'https://z-cdn-media.chatglm.cn/files/1153c12e-46c2-4ff4-9bfb-9ee1ea9ad677.png?auth_key=1875725907-dba9b296a2b347a582e281f8c13d5dd1-0-abc6e2dfe8db025886d8c5cccb41f197';

const INVEST_LEVELS = [
  { level: 1, name: 'Micro', color: '#22C55E', bg: 'bg-[#DCFCE7]', border: 'border-[#86EFAC]', min: 2, max: 5, cycles: 35, rate: 5, icon: 'fa-seedling' },
  { level: 2, name: 'Standard', color: '#EAB308', bg: 'bg-[#FEF9C3]', border: 'border-[#FDE047]', min: 5.5, max: 10, cycles: 25, rate: 7.5, icon: 'fa-chart-line' },
  { level: 3, name: 'High Yield', color: '#F97316', bg: 'bg-[#FFEDD5]', border: 'border-[#FDBA74]', min: 10.5, max: 20, cycles: 20, rate: 9.5, icon: 'fa-fire' },
  { level: 4, name: 'Elite', color: '#EF4444', bg: 'bg-[#FEE2E2]', border: 'border-[#FCA5A5]', min: 20.5, max: 50, cycles: 20, rate: 12.5, icon: 'fa-crown' },
];

const ENTERPRISE_TYPES = [
  { type: 'short', name: 'Court terme', days: 5, minRet: 40, maxRet: 60, color: '#22C55E', icon: 'fa-bolt', risk: '5%', minAmount: 5 },
  { type: 'medium', name: 'Moyen terme', days: 10, minRet: 60, maxRet: 75, color: '#EAB308', icon: 'fa-building', risk: '10%', minAmount: 5 },
  { type: 'long', name: 'Long terme', days: 20, minRet: 80, maxRet: 100, color: '#F97316', icon: 'fa-industry', risk: '15%', minAmount: 5 },
  { type: 'ultralong', name: 'Ultra long', days: 30, minRet: 100, maxRet: 150, color: '#EF4444', icon: 'fa-rocket', risk: '20%', minAmount: 5 },
];

const AI_TIPS = [
  "📈 Le marché tech est en hausse ! Investissez maintenant.",
  "⚠️ Volatilité détectée sur le marché. Prudence recommandée.",
  "🔥 L'Elite Investment offre 12.5%/cycle ! Opportunité rare.",
  "📊 Tendance haussière sur 3 jours. Le momentum est fort.",
  "💡 Conseil IA: Diversifiez vos investissements entre les niveaux.",
  "🚀 Nouveau projet entreprise disponible ! Rendement +150% possible.",
  "⚡ Le trading rapide peut être lucratif, mais restez prudent.",
  "📉 Marché en correction. C'est le moment d'acheter bas.",
  "🎯 Les investisseurs élites gagnent 2x plus. Passez au niveau supérieur.",
  "🔄 Réclamez vos gains quotidiens pour maximiser vos profits !",
];

const ENTERPRISE_NAMES = [
  'TechCorp Industries', 'GreenEnergy Ltd', 'AgroVista Holdings', 'FinancePlus Group',
  'Immobilier Royale', 'SantéGlobal Inc', 'CryptoVault Systems', 'AeroSpace Dynamics',
  'BioTech Solutions', 'DigitalMarket Pro', 'OceanTrade Corp', 'SolarPower SA',
];

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
    <img src={LOGO_URL} alt="Be Rich" className={className} style={{ objectFit: 'contain', ...style }}
      onError={(e) => { const t = e.target as HTMLImageElement; const p = t.parentElement; if (p) { const div = document.createElement('div'); div.className = `bg-gradient-to-br from-[#00E676] to-[#00C853] rounded-[22px] flex items-center justify-center text-white font-black ${className}`; div.textContent = 'BR'; div.style.filter = t.style.filter; p.replaceChild(div, t); } }}
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
      {notifications.map((n) => (
        <div key={n.id} className="bg-[rgba(255,255,255,0.96)] backdrop-blur-xl p-3 rounded-xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] flex items-center gap-2.5 pointer-events-auto w-full"
          style={{ animation: 'nIn 0.35s cubic-bezier(0.34,1.56,0.64,1)', borderLeft: '3px solid #00C853' }}>
          <div className="flex-1 min-w-0 text-[0.78rem] text-[#1A2332]">{esc(n.text)}</div>
          <button onClick={() => removeNotification(n.id)} className="bg-transparent border-none text-gray-300 cursor-pointer p-1 text-[0.65rem]">✕</button>
        </div>
      ))}
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
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95">Annuler</button>
          <button onClick={onOk} className={`flex-1 py-3 rounded-xl text-white font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95 ${okClass}`}>{okText}</button>
        </div>
      </div>
    </div>
  );
}

// ==================== HEADER ====================
function Header({ title, icon, iconColor, rightElement, leftElement }: { title: React.ReactNode; icon?: string; iconColor?: string; rightElement?: React.ReactNode; leftElement?: React.ReactNode }) {
  return (
    <header className="h-[58px] bg-[rgba(255,255,255,0.88)] backdrop-blur-2xl flex items-center justify-between px-[18px] sticky top-0 z-20 shrink-0 border-b border-[rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        {leftElement}
        <div className="text-[1rem] font-bold text-[#1A2332] flex items-center gap-2">
          {icon && <i className={`fas ${icon} text-[0.85rem]`} style={iconColor ? { color: iconColor } : undefined} />}
          {title}
        </div>
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (user) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData(e.target as HTMLFormElement);
      const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.success) { setUser(data.user); addToast('Bienvenue, ' + data.user.name, 'success'); setPage('home'); }
      else { addToast(data.error, 'error'); }
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
      if (data.success) { setUser(data.user); addToast('Compte créé !', 'success'); setPage('home'); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur réseau', 'error'); }
    setLoading(false);
  };

  return (
    <section className="absolute inset-0 bg-[#0B1120] flex flex-col items-center justify-center z-[200]">
      <div className="w-full max-w-[330px] text-center px-5">
        <LogoImg className="w-[100px] h-[100px] mx-auto mb-4" style={{ filter: 'drop-shadow(0 4px 20px rgba(251,191,36,0.2))' }} />
        <h1 className="text-[1.8rem] font-black mb-1 bg-gradient-to-r from-[#FCD34D] via-[#FBBF24] to-[#F59E0B] bg-[length:200%_auto] text-transparent bg-clip-text tracking-[2px]" style={{ animation: 'gs 3s linear infinite' }}>BE RICH</h1>
        <p className="text-[rgba(255,255,255,0.3)] text-[0.72rem] mb-6">{mode === 'login' ? 'Connectez-vous à votre compte.' : 'Rejoignez Be Rich.'}</p>
        <div className="flex bg-[rgba(255,255,255,0.05)] rounded-xl p-[3px] mb-6 border border-[rgba(255,255,255,0.06)]">
          <button onClick={() => { setMode('login'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer ${mode === 'login' ? 'bg-[rgba(255,255,255,0.08)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[rgba(255,255,255,0.35)]'}`}>Connexion</button>
          <button onClick={() => { setMode('register'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer ${mode === 'register' ? 'bg-[rgba(255,255,255,0.08)] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[rgba(255,255,255,0.35)]'}`}>Inscription</button>
        </div>
        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4 w-full"><label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">Email</label><input name="email" type="email" required placeholder="votre@email.com" className="w-full py-3 px-4 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.88rem] outline-none font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#00C853]" /></div>
            <div className="mb-4 w-full relative"><label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">Mot de passe</label><input name="password" type={showPw.l ? 'text' : 'password'} required placeholder="••••••••" className="w-full py-3 px-4 pr-11 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.88rem] outline-none font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#00C853]" /><button type="button" onClick={() => setShowPw({ ...showPw, l: !showPw.l })} className="absolute right-3 top-[38px] bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-0.5"><i className={`fas ${showPw.l ? 'fa-eye-slash' : 'fa-eye'}`}></i></button></div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">{loading ? <div className="w-4 h-4 border-2 border-[rgba(255,255,255,0.3)] border-t-white rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-arrow-right"></i> Se connecter</>}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Nom complet</label><input name="name" type="text" required placeholder="Jean Dupont" minLength={2} className={`w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] ${errors.name ? 'border-red-500' : 'border-[rgba(255,255,255,0.08)]'} rounded-xl text-[0.85rem] outline-none font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#00C853]`} />{errors.name && <p className="text-red-500 text-[0.65rem] mt-0.5">{errors.name}</p>}</div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Email</label><input name="email" type="email" required placeholder="votre@email.com" className="w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.85rem] outline-none font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#00C853]" /></div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Mot de passe</label><input name="password" type={showPw.r ? 'text' : 'password'} required placeholder="Min. 6 caractères" minLength={6} className={`w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] ${errors.password ? 'border-red-500' : 'border-[rgba(255,255,255,0.08)]'} rounded-xl text-[0.85rem] outline-none font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#00C853]`} />{errors.password && <p className="text-red-500 text-[0.65rem] mt-0.5">{errors.password}</p>}</div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Confirmer</label><input name="password2" type={showPw.r2 ? 'text' : 'password'} required placeholder="••••••••" className={`w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] ${errors.password2 ? 'border-red-500' : 'border-[rgba(255,255,255,0.08)]'} rounded-xl text-[0.85rem] outline-none font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#00C853]`} />{errors.password2 && <p className="text-red-500 text-[0.65rem] mt-0.5">{errors.password2}</p>}</div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Code de parrainage <span className="opacity-50">(optionnel)</span></label><input name="referralCode" type="text" placeholder="BR-XXXXXX" className="w-full py-2.5 px-3.5 bg-[rgba(255,255,255,0.05)] border-[1.5px] border-[rgba(255,255,255,0.08)] rounded-xl text-[0.85rem] outline-none font-[Inter] text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#FBBF24]" /></div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">{loading ? <div className="w-4 h-4 border-2 border-[rgba(120,53,15,0.3)] border-t-[#78350F] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-user-plus"></i> Créer mon compte</>}</button>
          </form>
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

  const refresh = async () => {
    setRefreshing(true);
    try { const res = await fetch('/api/auth/session'); const data = await res.json(); if (data.success) setUser(data.user); } catch { /* */ }
    setRefreshing(false);
  };

  if (!user) return null;
  const txs = user.transactions?.slice(0, 5) || [];

  return (
    <>
      <Header title={<><LogoImg className="w-[26px] h-[26px] rounded-md" style={{ objectFit: 'contain' }} /> Be Rich</>} rightElement={
        <button onClick={refresh} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90"><i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`} /></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Welcome + Balance */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.1),transparent_65%)]" />
          <div className="relative z-[1]">
            <p className="text-[rgba(255,255,255,0.5)] text-[0.75rem] mb-1">Bienvenue, <span className="text-white font-semibold">{esc(user.name)}</span></p>
            <div className="text-[1.8rem] font-black tracking-[-1px] mb-3">{formatMoney(user.balance)}</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
                <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.5px] mb-1">Invest Hub</div>
                <div className="text-[1rem] font-black text-[#86EFAC]">{formatMoney(user.investBalance)}</div>
              </div>
              <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
                <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.5px] mb-1">Profit total</div>
                <div className={`text-[1rem] font-black ${(user.totalProfit || 0) >= 0 ? 'text-[#86EFAC]' : 'text-[#FCA5A5]'}`}>{formatMoney(user.totalProfit - (user.totalLoss || 0))}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: 'fa-wallet', label: 'Wallet', page: 'wallet', color: '#00C853' },
            { icon: 'fa-chart-line', label: 'Investir', page: 'invest', color: '#FBBF24' },
            { icon: 'fa-bolt', label: 'Trader', page: 'trading', color: '#3B82F6' },
            { icon: 'fa-building', label: 'Projets', page: 'enterprise', color: '#F97316' },
          ].map((a, i) => (
            <button key={i} onClick={() => setPage(a.page)} className="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] cursor-pointer transition-transform active:scale-95">
              <div className="w-10 h-10 rounded-xl mx-auto mb-1.5 flex items-center justify-center" style={{ backgroundColor: a.color + '15' }}><i className={`fas ${a.icon} text-[0.9rem]`} style={{ color: a.color }}></i></div>
              <div className="text-[0.68rem] font-semibold text-[#1A2332]">{a.label}</div>
            </button>
          ))}
        </div>

        {/* AI Tip */}
        <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white rounded-xl p-3.5 mb-4 flex items-center gap-3 border border-[rgba(255,255,255,0.05)]">
          <div className="w-9 h-9 rounded-xl bg-[rgba(59,130,246,0.2)] flex items-center justify-center shrink-0"><i className="fas fa-robot text-[#60A5FA] text-[0.85rem]"></i></div>
          <div className="flex-1 min-w-0"><div className="text-[0.65rem] text-[rgba(255,255,255,0.4)] font-semibold uppercase tracking-[0.5px] mb-0.5">IA Be Rich</div><div className="text-[0.75rem] leading-relaxed">{tip}</div></div>
        </div>

        {/* Recent Activity */}
        {txs.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Activité récente</h3>
            <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
              {txs.map((tx, i) => {
                const isD = tx.type === 'deposit' || tx.type === 'claim' || tx.type === 'enterprise_claim' || tx.type === 'trade_win';
                const isW = tx.type === 'withdrawal' || tx.type === 'trade_lose' || tx.type === 'enterprise_crash';
                return (
                  <div key={tx.id || i} className={`flex items-center gap-3 py-2.5 ${i < txs.length - 1 ? 'border-b border-[rgba(0,0,0,0.04)]' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[0.7rem] shrink-0 ${isD ? 'bg-[#DCFCE7] text-[#166534]' : isW ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#DBEAFE] text-[#1E40AF]'}`}>
                      <i className={`fas fa-${isW ? 'arrow-up' : isD ? 'arrow-down' : 'exchange-alt'}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.75rem] font-semibold text-[#1A2332]">{tx.detail || tx.type}</div>
                      <div className="text-[0.6rem] text-[#94A3B8]">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                    </div>
                    <div className={`text-[0.82rem] font-bold ${isW ? 'text-[#EF4444]' : 'text-[#00C853]'}`}>{isW ? '-' : '+'}{formatMoney(Math.abs(tx.amount))}</div>
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
function WalletScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [transferMode, setTransferMode] = useState<'toInvest' | 'fromInvest' | null>(null);
  const [transferAmt, setTransferAmt] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [depositAmt, setDepositAmt] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => { setRefreshing(true); try { const r = await fetch('/api/auth/session'); const d = await r.json(); if (d.success) setUser(d.user); } catch { /* */ } setRefreshing(false); };

  const handleTransfer = async () => {
    const amt = parseFloat(transferAmt);
    if (!amt || amt < 2) { addToast('Minimum 2 $', 'error'); return; }
    setTransferring(true);
    try {
      const from = transferMode === 'toInvest' ? 'principal' : 'invest';
      const to = transferMode === 'toInvest' ? 'invest' : 'principal';
      const res = await authFetch('/api/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, amount: amt }) });
      const data = await res.json();
      if (data.success) { addToast('Transfert effectué !', 'success'); setTransferAmt(''); setTransferMode(null); refresh(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setTransferring(false);
  };

  if (!user) return null;

  return (
    <>
      <Header title="Portefeuille" icon="fa-wallet" iconColor="#00C853" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} rightElement={<button onClick={refresh} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none"><i className={`fas fa-sync-alt text-[0.7rem] ${refreshing ? 'animate-spin' : ''}`} /></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Principal Balance */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.1),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px] mb-1">Compte Principal</div>
            <div className="text-[2rem] font-black tracking-[-1px] mb-3">{formatMoney(user.balance)}</div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeposit(true)} className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[rgba(0,200,83,0.15)] text-[#86EFAC]"><i className="fas fa-arrow-down"></i> Déposer</button>
              <button onClick={() => setPage('withdraw')} className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[rgba(251,191,36,0.15)] text-[#FDE68A]"><i className="fas fa-arrow-up"></i> Retirer</button>
            </div>
          </div>
        </div>

        {/* Invest Hub Balance */}
        <div className="bg-gradient-to-br from-[#064E3B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 border border-[rgba(0,200,83,0.15)]">
          <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px] mb-1">Invest Hub</div>
          <div className="text-[1.5rem] font-black text-[#86EFAC] mb-3">{formatMoney(user.investBalance)}</div>
          <div className="flex gap-2">
            <button onClick={() => setTransferMode('toInvest')} className="flex-1 py-[10px] rounded-lg text-[0.75rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[rgba(0,200,83,0.15)] text-[#86EFAC]"><i className="fas fa-arrow-right"></i> Verser</button>
            <button onClick={() => setTransferMode('fromInvest')} className="flex-1 py-[10px] rounded-lg text-[0.75rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[rgba(251,191,36,0.15)] text-[#FDE68A]"><i className="fas fa-arrow-left"></i> Retirer</button>
          </div>
        </div>

        {/* Transfer Modal */}
        {transferMode && (
          <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setTransferMode(null)}>
            <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[320px] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[1rem] font-bold text-[#1A2332] mb-1">{transferMode === 'toInvest' ? 'Verser vers Invest Hub' : 'Retirer vers Principal'}</h3>
              <p className="text-[0.75rem] text-[#64748B] mb-4">{transferMode === 'toInvest' ? 'Frais de 2% sur le transfert' : 'Sans frais'}</p>
              <input type="number" step="0.01" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} placeholder="Montant (min 2 $)" className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#00C853]" />
              <div className="flex gap-2">
                <button onClick={() => setTransferMode(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer">Annuler</button>
                <button onClick={handleTransfer} disabled={transferring} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60">{transferring ? '...' : 'Confirmer'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Deposit Modal */}
        {showDeposit && (
          <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowDeposit(false)}>
            <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[340px] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[1rem] font-bold text-[#1A2332] mb-2">Déposer via TRX</h3>
              <p className="text-[0.75rem] text-[#64748B] mb-3">Minimum 10 $. Envoyez des TRX à l&apos;adresse admin puis soumettez.</p>
              <input type="number" step="0.01" value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} placeholder="Montant en USD" className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-3 focus:border-[#00C853]" />
              <button onClick={async () => {
                const amt = parseFloat(depositAmt);
                if (!amt || amt < 10) { addToast('Minimum 10 $', 'error'); return; }
                try {
                  const res = await authFetch('/api/deposit/trx', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amountUsd: amt }) });
                  const data = await res.json();
                  if (data.success) { addToast('Dépôt soumis ! En attente de confirmation.', 'success'); setShowDeposit(false); setDepositAmt(''); }
                  else { addToast(data.error, 'error'); }
                } catch { addToast('Erreur', 'error'); }
              }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer"><i className="fas fa-paper-plane mr-2"></i>Soumettre</button>
              <button onClick={() => setShowDeposit(false)} className="w-full py-2.5 mt-2 text-[0.82rem] text-[#64748B] bg-transparent border-none cursor-pointer">Annuler</button>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-white rounded-xl p-3.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mx-auto mb-1.5 bg-[#DCFCE7] text-[#166534]"><i className="fas fa-chart-line text-[0.85rem]"></i></div>
            <div className="font-extrabold text-[0.84rem] text-[#009624]">{formatMoney(user.totalProfit)}</div>
            <div className="text-[0.56rem] text-[#94A3B8] uppercase tracking-[0.4px]">Gains</div>
          </div>
          <div className="bg-white rounded-xl p-3.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center mx-auto mb-1.5 bg-[#FEE2E2] text-[#991B1B]"><i className="fas fa-arrow-down text-[0.85rem]"></i></div>
            <div className="font-extrabold text-[0.84rem] text-[#EF4444]">{formatMoney(user.totalLoss)}</div>
            <div className="text-[0.56rem] text-[#94A3B8] uppercase tracking-[0.4px]">Pertes</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== INVEST HUB SCREEN ====================
function InvestHubScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [investments, setInvestments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState<number | null>(null);
  const [createAmt, setCreateAmt] = useState('');
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadInvestments = useCallback(async () => {
    try {
      const res = await authFetch('/api/invest/list');
      const data = await res.json();
      if (data.success) setInvestments(data.investments || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => { loadInvestments(); }, 0); return () => clearTimeout(t); }, [loadInvestments]);

  const refreshUser = async () => { try { const r = await fetch('/api/auth/session'); const d = await r.json(); if (d.success) setUser(d.user); } catch { /* */ } };

  const handleCreate = async (level: number) => {
    const amt = parseFloat(createAmt);
    const lvl = INVEST_LEVELS[level - 1];
    if (!amt || amt < lvl.min || amt > lvl.max) { addToast(`Montant: ${lvl.min}-${lvl.max} $`, 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/invest/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ level, amount: amt }) });
      const data = await res.json();
      if (data.success) { addToast('Investissement créé !', 'success'); setShowCreate(null); setCreateAmt(''); loadInvestments(); refreshUser(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  const handleClaim = async (id: string) => {
    try {
      const res = await authFetch('/api/invest/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ investmentId: id }) });
      const data = await res.json();
      if (data.success) { addToast('Gain réclamé ! +' + formatMoney(data.claimedAmount), 'success'); loadInvestments(); refreshUser(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
  };

  if (!user) return null;

  const activeInv = investments.filter(i => i.status === 'active');
  const completedInv = investments.filter(i => i.status === 'completed');

  return (
    <>
      <Header title="Invest Hub" icon="fa-chart-line" iconColor="#FBBF24" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Balance */}
        <div className="bg-gradient-to-br from-[#064E3B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 border border-[rgba(0,200,83,0.15)]">
          <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px] mb-1">Solde Invest Hub</div>
          <div className="text-[1.8rem] font-black text-[#86EFAC] mb-2">{formatMoney(user.investBalance)}</div>
          <button onClick={() => useAppStore.getState().setPage('wallet')} className="text-[0.72rem] text-[#86EFAC] font-semibold"><i className="fas fa-plus mr-1"></i>Verser des fonds</button>
        </div>

        {/* Claimable alert */}
        {activeInv.some(i => i.canClaim) && (
          <div className="bg-[#F0FDF4] rounded-xl p-3.5 mb-4 flex items-center gap-3 border border-[#86EFAC]" style={{ animation: 'pulse 2s infinite' }}>
            <div className="w-10 h-10 rounded-xl bg-[#00C853] flex items-center justify-center shrink-0"><i className="fas fa-gift text-white text-[1rem]"></i></div>
            <div className="flex-1"><h4 className="text-[0.82rem] font-bold text-[#166534]">Gains à réclamer !</h4><p className="text-[0.72rem] text-[#15803D]">Vous avez des gains prêts à être collectés.</p></div>
          </div>
        )}

        {/* Investment Levels */}
        <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Niveaux d&apos;investissement</h3>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {INVEST_LEVELS.map((lvl) => (
            <button key={lvl.level} onClick={() => setShowCreate(lvl.level)} className={`${lvl.bg} rounded-xl p-3.5 text-left border ${lvl.border} cursor-pointer transition-transform active:scale-95`}>
              <div className="flex items-center gap-1.5 mb-1.5"><i className={`fas ${lvl.icon} text-[0.8rem]`} style={{ color: lvl.color }}></i><span className="text-[0.72rem] font-bold" style={{ color: lvl.color }}>Niv. {lvl.level}</span></div>
              <div className="text-[0.82rem] font-bold text-[#1A2332]">{lvl.name}</div>
              <div className="text-[0.65rem] text-[#64748B]">{lvl.min}-{lvl.max} $</div>
              <div className="text-[0.65rem] font-semibold" style={{ color: lvl.color }}>{lvl.rate}%/cycle · {lvl.cycles}j</div>
            </button>
          ))}
        </div>

        {/* Active Investments */}
        {activeInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Investissements actifs</h3>
            {activeInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              const nextMs = inv.nextClaimAt ? new Date(inv.nextClaimAt).getTime() - now : 0;
              const canClaim = inv.canClaim || nextMs <= 0;
              const hours = Math.max(0, Math.floor(nextMs / 3600000));
              const mins = Math.max(0, Math.floor((nextMs % 3600000) / 60000));
              const secs = Math.max(0, Math.floor((nextMs % 60000) / 1000));
              const progress = (inv.doneCycles / inv.totalCycles) * 100;
              return (
                <div key={inv.id} className="bg-white rounded-xl p-4 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-[0.7rem]" style={{ backgroundColor: lvl.color + '20', color: lvl.color }}><i className={`fas ${lvl.icon}`}></i></div><div><div className="text-[0.8rem] font-bold text-[#1A2332]">Niv. {inv.level} - {lvl.name}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(inv.amount)} · {inv.rate}%/cycle</div></div></div>
                    <div className="text-right"><div className="text-[0.65rem] text-[#94A3B8]">Gagné</div><div className="text-[0.82rem] font-bold text-[#00C853]">{formatMoney(inv.earned)}</div></div>
                  </div>
                  <div className="w-full h-[6px] bg-[#F1F5F9] rounded-full mb-2"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: lvl.color }}></div></div>
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-[#64748B]">{inv.doneCycles}/{inv.totalCycles} cycles</span>
                    {canClaim ? (
                      <button onClick={() => handleClaim(inv.id)} className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#00E676] to-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer" style={{ animation: 'pulse 2s infinite' }}>Réclamer</button>
                    ) : (
                      <span className="text-[0.65rem] font-mono text-[#64748B]">{hours}h {mins}m {secs}s</span>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* Completed */}
        {completedInv.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5 mt-4">Terminés</h3>
            {completedInv.map((inv) => {
              const lvl = INVEST_LEVELS[inv.level - 1];
              return (
                <div key={inv.id} className="bg-[#F8FAFC] rounded-xl p-3 mb-2 border border-[rgba(0,0,0,0.03)]">
                  <div className="flex items-center justify-between"><div className="text-[0.75rem] font-semibold text-[#1A2332]">Niv. {inv.level} - {lvl.name}</div><div className="text-[0.75rem] font-bold text-[#00C853]">+{formatMoney(inv.earned)}</div></div>
                  <div className="text-[0.6rem] text-[#94A3B8]">{formatMoney(inv.amount)} investi · {inv.totalCycles} cycles</div>
                </div>
              );
            })}
          </>
        )}

        {investments.length === 0 && !loading && (
          <div className="text-center py-8"><i className="fas fa-chart-line text-[2rem] text-[#CBD5E1] mb-3"></i><p className="text-[0.82rem] text-[#94A3B8]">Aucun investissement. Choisissez un niveau pour commencer !</p></div>
        )}
      </div>

      {/* Create Investment Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowCreate(null)}>
          <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[320px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const lvl = INVEST_LEVELS[showCreate - 1];
              return (
                <>
                  <div className="flex items-center gap-2 mb-1"><i className={`fas ${lvl.icon}`} style={{ color: lvl.color }}></i><h3 className="text-[1rem] font-bold text-[#1A2332]">Niveau {lvl.level} - {lvl.name}</h3></div>
                  <p className="text-[0.75rem] text-[#64748B] mb-1">{lvl.min}-{lvl.max} $ · {lvl.rate}%/cycle · {lvl.cycles} cycles</p>
                  <p className="text-[0.68rem] text-[#94A3B8] mb-4">Gain potentiel: {formatMoney(lvl.max * lvl.rate / 100 * lvl.cycles)}</p>
                  <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant (${lvl.min}-${lvl.max} $)`} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#00C853]" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer">Annuler</button>
                    <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60">{creating ? '...' : 'Investir'}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

// ==================== TRADING SCREEN ====================
function TradingScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [activeTrades, setActiveTrades] = useState<any[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [duration, setDuration] = useState(60);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadTrades = useCallback(async () => {
    try {
      const res = await authFetch('/api/trade/active');
      const data = await res.json();
      if (data.success) setActiveTrades(data.trades || []);
    } catch { /* */ }
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  // Auto-resolve finished trades
  useEffect(() => {
    activeTrades.forEach((trade) => {
      if (new Date(trade.endsAt).getTime() <= now && !trade.resolved) {
        authFetch('/api/trade/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tradeId: trade.id }) })
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              addToast(data.result === 'win' ? `Gagné ! +${formatMoney(data.profit)}` : data.result === 'lose' ? 'Perdu !' : 'Match nul', data.result === 'win' ? 'success' : data.result === 'lose' ? 'error' : 'info');
              loadTrades();
              fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); });
            }
          })
          .catch(() => { /* */ });
      }
    });
  }, [now, activeTrades]);

  const handleCreateTrade = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 1 || amt > 5) { addToast('Montant: 1-5 $', 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/trade/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, direction, durationSec: duration }) });
      const data = await res.json();
      if (data.success) { addToast('Trade lancé !', 'success'); setAmount(''); loadTrades(); fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); }); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  if (!user) return null;
  const durations = [{ sec: 60, label: '1 min' }, { sec: 180, label: '3 min' }, { sec: 300, label: '5 min' }, { sec: 600, label: '10 min' }];

  return (
    <>
      <Header title="Ultra Market" icon="fa-bolt" iconColor="#3B82F6" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Balance */}
        <div className="bg-gradient-to-br from-[#1E3A5F] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(59,130,246,0.15)]">
          <div className="text-[0.7rem] opacity-40 uppercase tracking-[1.5px] mb-1">Solde Trading</div>
          <div className="text-[1.5rem] font-black text-[#93C5FD]">{formatMoney(user.investBalance)}</div>
        </div>

        {/* Trade Form */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <h4 className="text-[0.82rem] font-bold text-[#1A2332] mb-3">Nouveau trade</h4>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant (1-5 $)" className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-3 focus:border-[#3B82F6]" />
          
          {/* Direction */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button onClick={() => setDirection('up')} className={`py-3 rounded-xl font-semibold text-[0.85rem] border-none cursor-pointer transition-transform active:scale-95 ${direction === 'up' ? 'bg-gradient-to-r from-[#00E676] to-[#00C853] text-white shadow-[0_4px_20px_rgba(0,200,83,0.2)]' : 'bg-[#F1F5F9] text-[#64748B]'}`}><i className="fas fa-arrow-up mr-1"></i>HAUT ↑</button>
            <button onClick={() => setDirection('down')} className={`py-3 rounded-xl font-semibold text-[0.85rem] border-none cursor-pointer transition-transform active:scale-95 ${direction === 'down' ? 'bg-gradient-to-r from-[#EF4444] to-[#DC2626] text-white shadow-[0_4px_20px_rgba(239,68,68,0.2)]' : 'bg-[#F1F5F9] text-[#64748B]'}`}><i className="fas fa-arrow-down mr-1"></i>BAS ↓</button>
          </div>

          {/* Duration */}
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {durations.map((d) => (
              <button key={d.sec} onClick={() => setDuration(d.sec)} className={`py-2 rounded-lg text-[0.72rem] font-semibold border-none cursor-pointer ${duration === d.sec ? 'bg-[#3B82F6] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{d.label}</button>
            ))}
          </div>

          <div className="text-[0.65rem] text-[#94A3B8] mb-3 text-center">Gain max: +85% | Perte max: -100% | Équilibre = remboursement</div>

          <button onClick={handleCreateTrade} disabled={creating} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-semibold text-[0.88rem] border-none cursor-pointer disabled:opacity-60 shadow-[0_4px_20px_rgba(59,130,246,0.2)]"><i className="fas fa-bolt mr-2"></i>{creating ? 'Chargement...' : 'Lancer le trade'}</button>
        </div>

        {/* Active Trades */}
        {activeTrades.filter(t => !t.resolved).length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Trades en cours</h3>
            {activeTrades.filter(t => !t.resolved).map((trade) => {
              const remaining = new Date(trade.endsAt).getTime() - now;
              const mins = Math.max(0, Math.floor(remaining / 60000));
              const secs = Math.max(0, Math.floor((remaining % 60000) / 1000));
              return (
                <div key={trade.id} className="bg-[#1E293B] text-white rounded-xl p-4 mb-2.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${trade.direction === 'up' ? 'bg-[rgba(0,200,83,0.2)]' : 'bg-[rgba(239,68,68,0.2)]'}`}><i className={`fas fa-arrow-${trade.direction}`} style={{ color: trade.direction === 'up' ? '#00E676' : '#EF4444' }}></i></div><div><div className="text-[0.8rem] font-bold">{trade.direction === 'up' ? 'HAUT' : 'BAS'}</div><div className="text-[0.65rem] text-[rgba(255,255,255,0.5)]">{formatMoney(trade.amount)}</div></div></div>
                    <div className="text-right"><div className="text-[0.7rem] text-[rgba(255,255,255,0.5)]">Temps restant</div><div className="text-[1.1rem] font-mono font-bold">{mins}:{secs.toString().padStart(2, '0')}</div></div>
                  </div>
                  {/* Fake chart line */}
                  <div className="h-[40px] relative overflow-hidden rounded-lg bg-[rgba(255,255,255,0.05)]">
                    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${trade.direction === 'up' ? '#00E676' : '#EF4444'}33, ${trade.direction === 'up' ? '#00E676' : '#EF4444'})` }}></div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {/* No active trades info */}
        {activeTrades.filter(t => !t.resolved).length === 0 && (
          <div className="text-center py-4"><i className="fas fa-chart-area text-[2rem] text-[#CBD5E1] mb-2"></i><p className="text-[0.82rem] text-[#94A3B8]">Aucun trade actif. Lancez-en un !</p></div>
        )}
      </div>
    </>
  );
}

// ==================== ENTERPRISE SCREEN ====================
function EnterpriseScreen() {
  const { user, setUser, addToast } = useAppStore();
  const [enterprises, setEnterprises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState<string | null>(null);
  const [createAmt, setCreateAmt] = useState('');
  const [creating, setCreating] = useState(false);

  const loadEnterprises = useCallback(async () => {
    try {
      const res = await authFetch('/api/enterprise/list');
      const data = await res.json();
      if (data.success) setEnterprises(data.enterprises || []);
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => { loadEnterprises(); }, 0); return () => clearTimeout(t); }, [loadEnterprises]);

  const refreshUser = async () => { try { const r = await fetch('/api/auth/session'); const d = await r.json(); if (d.success) setUser(d.user); } catch { /* */ } };

  const handleCreate = async (type: string) => {
    const amt = parseFloat(createAmt);
    const entType = ENTERPRISE_TYPES.find(e => e.type === type);
    if (!amt || amt < (entType?.minAmount || 5)) { addToast(`Minimum ${entType?.minAmount || 5} $`, 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch('/api/enterprise/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, amount: amt }) });
      const data = await res.json();
      if (data.success) {
        if (data.crashed) { addToast('Crash ! Le projet a échoué.', 'error'); }
        else { addToast('Projet créé !', 'success'); }
        setShowCreate(null); setCreateAmt(''); loadEnterprises(); refreshUser();
      } else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setCreating(false);
  };

  const handleClaim = async (id: string) => {
    try {
      const res = await authFetch('/api/enterprise/claim', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enterpriseId: id }) });
      const data = await res.json();
      if (data.success) { addToast(`Projet réclamé ! +${formatMoney(data.totalReturn)}`, 'success'); loadEnterprises(); refreshUser(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
  };

  if (!user) return null;

  return (
    <>
      <Header title="Entreprises" icon="fa-building" iconColor="#F97316" leftElement={<button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Balance */}
        <div className="bg-gradient-to-br from-[#7C2D12] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(249,115,22,0.15)]">
          <div className="text-[0.7rem] opacity-40 uppercase tracking-[1.5px] mb-1">Solde Invest Hub</div>
          <div className="text-[1.5rem] font-black text-[#FDBA74]">{formatMoney(user.investBalance)}</div>
        </div>

        {/* Risk Warning */}
        <div className="bg-[#FFFBEB] rounded-xl p-3 mb-4 flex items-start gap-2 border-l-[3px] border-[#F59E0B]">
          <i className="fas fa-exclamation-triangle text-[#D97706] mt-0.5 shrink-0 text-[0.8rem]"></i>
          <p className="text-[0.72rem] text-[#92400E]">Plus la durée est longue, plus le risque de crash augmente. Investissez prudemment !</p>
        </div>

        {/* Enterprise Types */}
        <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Types de projets</h3>
        <div className="space-y-2.5 mb-5">
          {ENTERPRISE_TYPES.map((ent) => (
            <button key={ent.type} onClick={() => setShowCreate(ent.type)} className="w-full bg-white rounded-xl p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] cursor-pointer transition-transform active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5"><div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: ent.color + '15' }}><i className={`fas ${ent.icon}`} style={{ color: ent.color }}></i></div><div><div className="text-[0.82rem] font-bold text-[#1A2332]">{ent.name}</div><div className="text-[0.65rem] text-[#64748B]">{ent.days} jours · +{ent.minRet}-{ent.maxRet}%</div></div></div>
                <div className="text-right"><div className="text-[0.65rem] text-[#EF4444] font-semibold">Risque {ent.risk}</div><i className="fas fa-chevron-right text-[#CBD5E1] text-[0.65rem] mt-1"></i></div>
              </div>
            </button>
          ))}
        </div>

        {/* Active Enterprises */}
        {enterprises.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#1A2332] mb-2.5">Mes entreprises</h3>
            {enterprises.map((ent) => {
              const progress = Math.min(100, (ent.daysElapsed / ent.durationDays) * 100);
              const isFinished = ent.isFinished || ent.status === 'completed';
              const isCrashed = ent.status === 'crashed';
              return (
                <div key={ent.id} className={`bg-white rounded-xl p-4 mb-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border ${isCrashed ? 'border-[#FCA5A5]' : isFinished ? 'border-[#86EFAC]' : 'border-[rgba(0,0,0,0.03)]'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div><div className="text-[0.82rem] font-bold text-[#1A2332]">{esc(ent.name)}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(ent.amount)} · {ent.durationDays}j · +{ent.minReturn}-{ent.maxReturn}%</div></div>
                    <span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${isCrashed ? 'bg-[#FEE2E2] text-[#991B1B]' : isFinished ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#DBEAFE] text-[#1E40AF]'}`}>{isCrashed ? 'Crash' : isFinished ? 'Terminé' : 'En cours'}</span>
                  </div>
                  {!isCrashed && <div className="w-full h-[6px] bg-[#F1F5F9] rounded-full mb-2"><div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: isFinished ? '#00C853' : '#3B82F6' }}></div></div>}
                  <div className="flex items-center justify-between">
                    <span className="text-[0.65rem] text-[#64748B]">{ent.daysElapsed}/{ent.durationDays} jours</span>
                    {isFinished && ent.canClaim && (
                      <button onClick={() => handleClaim(ent.id)} className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-[#00E676] to-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Réclamer</button>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}

        {enterprises.length === 0 && !loading && (
          <div className="text-center py-8"><i className="fas fa-building text-[2rem] text-[#CBD5E1] mb-3"></i><p className="text-[0.82rem] text-[#94A3B8]">Aucune entreprise. Lancez votre premier projet !</p></div>
        )}
      </div>

      {/* Create Enterprise Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setShowCreate(null)}>
          <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[320px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const et = ENTERPRISE_TYPES.find(e => e.type === showCreate);
              if (!et) return null;
              return (
                <>
                  <div className="flex items-center gap-2 mb-1"><i className={`fas ${et.icon}`} style={{ color: et.color }}></i><h3 className="text-[1rem] font-bold text-[#1A2332]">{et.name}</h3></div>
                  <p className="text-[0.75rem] text-[#64748B] mb-1">{et.days} jours · +{et.minRet}-{et.maxReturn}%</p>
                  <p className="text-[0.68rem] text-[#EF4444] mb-4">⚠️ Risque de crash: {et.risk}</p>
                  <input type="number" step="0.01" value={createAmt} onChange={(e) => setCreateAmt(e.target.value)} placeholder={`Montant (min ${et.minAmount} $)`} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#F97316]" />
                  <div className="flex gap-2">
                    <button onClick={() => setShowCreate(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer">Annuler</button>
                    <button onClick={() => handleCreate(showCreate)} disabled={creating} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] text-white font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-60">{creating ? '...' : 'Investir'}</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
}

// ==================== PROFILE SCREEN ====================
function ProfileScreen() {
  const { user, clearUser, setPage, addToast } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showReferrals, setShowReferrals] = useState(false);

  const loadReferrals = async () => {
    try {
      const res = await authFetch('/api/referral/list');
      const data = await res.json();
      if (data.success) { setReferrals(data.referrals || []); setShowReferrals(true); }
    } catch { /* */ }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout'); } catch { /* */ }
    clearUser();
    addToast('Déconnecté', 'info');
  };

  if (!user) return null;

  return (
    <>
      <Header title="Profil" icon="fa-user" iconColor="#64748B" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* User Card */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-4 border border-[rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00E676] to-[#00C853] flex items-center justify-center text-white font-bold text-[1.2rem] shadow-[0_4px_20px_rgba(0,200,83,0.3)]">{esc(user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2))}</div>
            <div><div className="text-[1.05rem] font-bold">{esc(user.name)}</div><div className="text-[0.75rem] text-[rgba(255,255,255,0.5)]">{esc(user.email)}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center"><div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase">Principal</div><div className="text-[0.95rem] font-black">{formatMoney(user.balance)}</div></div>
            <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center"><div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase">Invest Hub</div><div className="text-[0.95rem] font-black text-[#86EFAC]">{formatMoney(user.investBalance)}</div></div>
          </div>
        </div>

        {/* Referral */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2.5 mb-3"><i className="fas fa-users text-[#FBBF24]"></i><h4 className="text-[0.88rem] font-bold text-[#1A2332]">Parrainage</h4></div>
          <div className="bg-[#FEF9C3] rounded-xl p-3 mb-3"><div className="text-[0.68rem] text-[#92400E] mb-1">Votre code</div><div className="text-[1.1rem] font-mono font-black text-[#78350F]">{user.referralCode}</div></div>
          <div className="flex items-center justify-between mb-2"><span className="text-[0.75rem] text-[#64748B]">Filleuls actifs</span><span className="text-[0.75rem] font-bold">{user.referralCount || 0}</span></div>
          <button onClick={loadReferrals} className="w-full py-2.5 rounded-xl bg-[#FEF9C3] text-[#78350F] font-semibold text-[0.82rem] border-none cursor-pointer"><i className="fas fa-list mr-1"></i>Voir mes filleuls</button>
        </div>

        {/* Referral List */}
        {showReferrals && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
            <h4 className="text-[0.82rem] font-bold text-[#1A2332] mb-2">Mes filleuls ({referrals.length})</h4>
            {referrals.length === 0 ? <p className="text-[0.75rem] text-[#94A3B8]">Aucun filleul pour le moment.</p> : referrals.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.04)] last:border-none"><div><div className="text-[0.78rem] font-semibold">{esc(r.name)}</div><div className="text-[0.65rem] text-[#94A3B8]">{esc(r.email)}</div></div><span className={`text-[0.65rem] font-semibold px-2 py-0.5 rounded-full ${r.hasInvested ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>{r.hasInvested ? 'Actif' : 'Inactif'}</span></div>
            ))}
          </div>
        )}

        {/* Analytics Button */}
        <button onClick={() => setPage('analytics')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(59,130,246,0.2)] mb-3 flex items-center justify-center gap-2"><i className="fas fa-chart-bar"></i> Analyses</button>

        {/* Admin Button */}
        {user.role === 'admin' && (
          <button onClick={() => setPage('admin')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(251,191,36,0.2)] mb-3 flex items-center justify-center gap-2"><i className="fas fa-shield-alt"></i> Panneau Admin</button>
        )}

        {/* Logout */}
        <button onClick={() => setModalOpen(true)} className="w-full py-3.5 rounded-xl border-[1.5px] border-[rgba(239,68,68,0.15)] bg-transparent text-red-500 font-semibold text-[0.88rem] cursor-pointer flex items-center justify-center gap-2"><i className="fas fa-sign-out-alt"></i> Déconnexion</button>
      </div>
      {modalOpen && <Modal title="Déconnexion" text="Voulez-vous vous déconnecter ?" okText="Se déconnecter" okClass="bg-gradient-to-r from-[#F87171] to-[#EF4444]" onOk={handleLogout} onCancel={() => setModalOpen(false)} />}
    </>
  );
}

// ==================== ANALYTICS SCREEN ====================
function AnalyticsScreen() {
  const { user, setPage } = useAppStore();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch('/api/analytics').then(r => r.json()).then(data => {
      if (data.success) setAnalytics(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (!user) return null;

  const a = analytics || {};

  return (
    <>
      <Header title="Analyses" icon="fa-chart-bar" iconColor="#3B82F6" leftElement={<button onClick={() => setPage('profile')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Profit/Loss */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-[#F0FDF4] rounded-xl p-4 border border-[#86EFAC]"><div className="text-[0.68rem] text-[#166534] uppercase font-semibold mb-1">Profit total</div><div className="text-[1.2rem] font-black text-[#009624]">{formatMoney(a.totalProfit || user.totalProfit)}</div></div>
          <div className="bg-[#FEF2F2] rounded-xl p-4 border border-[#FCA5A5]"><div className="text-[0.68rem] text-[#991B1B] uppercase font-semibold mb-1">Pertes totales</div><div className="text-[1.2rem] font-black text-[#EF4444]">{formatMoney(a.totalLoss || user.totalLoss)}</div></div>
        </div>

        {/* Net */}
        <div className="bg-white rounded-2xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="text-[0.7rem] text-[#64748B] uppercase font-semibold mb-1">Bénéfice net</div>
          <div className={`text-[1.8rem] font-black ${(user.totalProfit - user.totalLoss) >= 0 ? 'text-[#00C853]' : 'text-[#EF4444]'}`}>{formatMoney(user.totalProfit - user.totalLoss)}</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Investissements', value: a.activeInvestments ?? '-', icon: 'fa-chart-line', color: '#00C853' },
            { label: 'Win Rate Trading', value: a.tradeWinRate ? `${a.tradeWinRate}%` : '-', icon: 'fa-bolt', color: '#3B82F6' },
            { label: 'Entreprises', value: a.activeEnterprises ?? '-', icon: 'fa-building', color: '#F97316' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
              <div className="w-8 h-8 rounded-lg mx-auto mb-1 flex items-center justify-center" style={{ backgroundColor: s.color + '15' }}><i className={`fas ${s.icon} text-[0.75rem]`} style={{ color: s.color }}></i></div>
              <div className="text-[0.9rem] font-bold text-[#1A2332]">{s.value}</div>
              <div className="text-[0.56rem] text-[#94A3B8] uppercase">{s.label}</div>
            </div>
          ))}
        </div>

        {/* AI Recommendation */}
        <div className="bg-gradient-to-r from-[#1E293B] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(59,130,246,0.15)]">
          <div className="flex items-center gap-2 mb-2"><i className="fas fa-robot text-[#60A5FA]"></i><span className="text-[0.78rem] font-semibold">Recommandation IA</span></div>
          <p className="text-[0.82rem] leading-relaxed text-[rgba(255,255,255,0.8)]">{AI_TIPS[Math.floor(Math.random() * AI_TIPS.length)]}</p>
        </div>

        {loading && <div className="text-center py-4"><div className="w-6 h-6 border-2 border-gray-200 border-t-[#3B82F6] rounded-full mx-auto" style={{ animation: 'spin 0.7s linear infinite' }} /></div>}
      </div>
    </>
  );
}

// ==================== WITHDRAW SCREEN ====================
function WithdrawScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [amount, setAmount] = useState('');
  const [address, setAddress] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { addToast('Montant invalide', 'error'); return; }
    if (!address.trim()) { addToast('Adresse TRX requise', 'error'); return; }
    setWithdrawing(true);
    try {
      const res = await authFetch('/api/withdrawal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, trxAddress: address.trim() }) });
      const data = await res.json();
      if (data.success) { addToast('Retrait soumis !', 'success'); setAmount(''); setAddress(''); fetch('/api/auth/session').then(r => r.json()).then(d => { if (d.success) setUser(d.user); }); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setWithdrawing(false);
  };

  if (!user) return null;

  return (
    <>
      <Header title="Retrait" icon="fa-arrow-up" iconColor="#F59E0B" leftElement={<button onClick={() => setPage('wallet')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
          <div className="text-[0.7rem] text-[#64748B] uppercase font-semibold mb-1">Solde principal</div>
          <div className="text-[1.5rem] font-black text-[#1A2332] mb-4">{formatMoney(user.balance)}</div>
          <div className="mb-3"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Montant ($)</label><input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#F59E0B]" /></div>
          <div className="mb-4"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Adresse TRX (Trust Wallet)</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="T..." className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none focus:border-[#F59E0B]" /></div>
          <button onClick={handleWithdraw} disabled={withdrawing} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FBBF24] to-[#F59E0B] text-[#78350F] font-bold text-[0.88rem] border-none cursor-pointer disabled:opacity-60 shadow-[0_4px_20px_rgba(251,191,36,0.2)]"><i className="fas fa-arrow-up mr-2"></i>{withdrawing ? 'Envoi...' : 'Retirer'}</button>
        </div>
      </div>
    </>
  );
}

// ==================== ADMIN SCREEN (simplified) ====================
function AdminScreen() {
  const { user, addToast } = useAppStore();
  const [tab, setTab] = useState<'users' | 'deposits' | 'withdrawals' | 'config'>('users');
  const [adminData, setAdminData] = useState<any>(null);
  const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
  const [depositStats, setDepositStats] = useState<any>({});
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalStats, setWithdrawalStats] = useState<any>({});
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [configAddr, setConfigAddr] = useState('');
  const [configPrice, setConfigPrice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try { const r = await authFetch('/api/admin/data'); const d = await r.json(); if (d.success) setAdminData(d); } catch { /* */ }
    setLoading(false);
  }, []);

  const loadDeposits = useCallback(async () => {
    try { const r = await authFetch('/api/admin/deposits'); const d = await r.json(); if (d.success) { setPendingDeposits(d.data || []); setDepositStats(d.stats || {}); } } catch { /* */ }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    try { const r = await authFetch('/api/admin/withdrawals'); const d = await r.json(); if (d.success) { setWithdrawals(d.data || []); setWithdrawalStats(d.stats || {}); } } catch { /* */ }
  }, []);

  const loadConfig = useCallback(async () => {
    try { const r = await authFetch('/api/admin/config'); const d = await r.json(); if (d.success) { setSiteConfig(d.data); setConfigAddr(d.data.adminTrxAddress || ''); setConfigPrice(String(d.data.trxUsdPrice || '')); } } catch { /* */ }
  }, []);

  useEffect(() => { const t = setTimeout(() => { loadData(); loadDeposits(); loadWithdrawals(); loadConfig(); }, 0); return () => clearTimeout(t); }, [loadData, loadDeposits, loadWithdrawals, loadConfig]);

  if (!user || user.role !== 'admin') return null;
  const stats = adminData?.stats || {};
  const usersList = adminData?.users || [];

  return (
    <>
      <Header title="Admin" icon="fa-shield-alt" iconColor="#FBBF24" leftElement={<button onClick={() => useAppStore.getState().setPage('profile')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} rightElement={<button onClick={() => { loadData(); loadDeposits(); loadWithdrawals(); loadConfig(); }} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none"><i className="fas fa-sync-alt text-[0.7rem]"></i></button>} />
      <div className="flex-1 w-full overflow-y-auto">
        {/* Tabs */}
        <div className="flex bg-[#F8FAFC] border-b border-[rgba(0,0,0,0.04)] px-2">
          {[{ k: 'users', l: 'Utilisateurs' }, { k: 'deposits', l: 'Dépôts' }, { k: 'withdrawals', l: 'Retraits' }, { k: 'config', l: 'Config' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)} className={`flex-1 py-3 text-[0.72rem] font-semibold border-none cursor-pointer transition-all ${tab === t.k ? 'text-[#00C853] border-b-2 border-[#00C853]' : 'text-[#94A3B8]'}`}>{t.l}</button>
          ))}
        </div>

        <div className="px-[18px] py-4">
          {loading ? <div className="flex justify-center py-8"><div className="w-8 h-8 border-3 border-gray-200 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div> : (
            <>
              {/* Users Tab */}
              {tab === 'users' && (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { label: 'Utilisateurs', value: stats.total_users || 0, color: '#3B82F6' },
                      { label: 'Total investi', value: formatMoney(stats.total_balance || 0), color: '#00C853' },
                    ].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-3 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.9rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.6rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {usersList.map((u: any) => (
                    <div key={u.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between"><div><div className="text-[0.78rem] font-bold text-[#1A2332]">{esc(u.name)} {u.role === 'admin' && <span className="text-[0.6rem] bg-[#FEF9C3] text-[#92400E] px-1.5 py-0.5 rounded-full ml-1">Admin</span>}</div><div className="text-[0.65rem] text-[#94A3B8]">{esc(u.email)}</div></div><div className="text-right"><div className="text-[0.75rem] font-bold">{formatMoney(u.balance)}</div><div className="text-[0.6rem] text-[#00C853]">Invest: {formatMoney(u.investBalance || 0)}</div></div></div>
                    </div>
                  ))}
                </>
              )}

              {/* Deposits Tab */}
              {tab === 'deposits' && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[{ label: 'En attente', value: depositStats.pending || 0, color: '#F59E0B' }, { label: 'Approuvés', value: depositStats.approved || 0, color: '#00C853' }, { label: 'Rejetés', value: depositStats.rejected || 0, color: '#EF4444' }].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.55rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {pendingDeposits.filter(d => d.status === 'pending').map((d: any) => (
                    <div key={d.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#F59E0B]">
                      <div className="flex items-center justify-between mb-2"><div><div className="text-[0.78rem] font-bold">{esc(d.user?.name || '?')}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(d.amountUsd)}</div></div><span className="text-[0.6rem] bg-[#FEF9C3] text-[#92400E] px-2 py-0.5 rounded-full">En attente</span></div>
                      <div className="flex gap-2"><button onClick={async () => { const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'approve' }) }); const data = await r.json(); if (data.success) { addToast('Approuvé', 'success'); loadDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Approuver</button><button onClick={async () => { const r = await authFetch('/api/admin/deposits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ depositId: d.id, action: 'reject' }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadDeposits(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button></div>
                    </div>
                  ))}
                  {pendingDeposits.filter(d => d.status === 'pending').length === 0 && <p className="text-center text-[0.82rem] text-[#94A3B8] py-4">Aucun dépôt en attente</p>}
                </>
              )}

              {/* Withdrawals Tab */}
              {tab === 'withdrawals' && (
                <>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[{ label: 'En attente', value: withdrawalStats.pending || 0, color: '#F59E0B' }, { label: 'Approuvés', value: withdrawalStats.approved || 0, color: '#00C853' }, { label: 'Rejetés', value: withdrawalStats.rejected || 0, color: '#EF4444' }].map((s, i) => (
                      <div key={i} className="bg-white rounded-xl p-2.5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]"><div className="text-[0.85rem] font-bold" style={{ color: s.color }}>{s.value}</div><div className="text-[0.55rem] text-[#94A3B8] uppercase">{s.label}</div></div>
                    ))}
                  </div>
                  {withdrawals.filter(w => w.status === 'pending').map((w: any) => (
                    <div key={w.id} className="bg-white rounded-xl p-3 mb-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#F59E0B]">
                      <div className="flex items-center justify-between mb-2"><div><div className="text-[0.78rem] font-bold">{esc(w.user?.name || '?')}</div><div className="text-[0.65rem] text-[#94A3B8]">{formatMoney(w.amount)} → {esc(w.trxAddress?.slice(0, 10))}...</div></div><span className="text-[0.6rem] bg-[#FEF9C3] text-[#92400E] px-2 py-0.5 rounded-full">En attente</span></div>
                      <div className="flex gap-2"><button onClick={async () => { const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'approve' }) }); const data = await r.json(); if (data.success) { addToast('Approuvé', 'success'); loadWithdrawals(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#00C853] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Approuver</button><button onClick={async () => { const r = await authFetch('/api/admin/withdrawals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ withdrawalId: w.id, action: 'reject' }) }); const data = await r.json(); if (data.success) { addToast('Rejeté', 'info'); loadWithdrawals(); } else addToast(data.error, 'error'); }} className="flex-1 py-2 rounded-lg bg-[#EF4444] text-white text-[0.72rem] font-semibold border-none cursor-pointer">Rejeter</button></div>
                    </div>
                  ))}
                  {withdrawals.filter(w => w.status === 'pending').length === 0 && <p className="text-center text-[0.82rem] text-[#94A3B8] py-4">Aucun retrait en attente</p>}
                </>
              )}

              {/* Config Tab */}
              {tab === 'config' && siteConfig && (
                <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                  <div className="mb-3"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Adresse TRX Admin</label><input type="text" value={configAddr} onChange={(e) => setConfigAddr(e.target.value)} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] outline-none focus:border-[#FBBF24]" /></div>
                  <div className="mb-4"><label className="block mb-1 text-[0.75rem] font-semibold text-[#64748B]">Prix TRX (USD)</label><input type="number" step="0.001" value={configPrice} onChange={(e) => setConfigPrice(e.target.value)} className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.85rem] outline-none focus:border-[#FBBF24]" /></div>
                  <button onClick={async () => { try { const r = await authFetch('/api/admin/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminTrxAddress: configAddr, trxUsdPrice: configPrice }) }); const d = await r.json(); if (d.success) addToast('Config sauvegardée', 'success'); else addToast(d.error, 'error'); } catch { addToast('Erreur', 'error'); } }} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FCD34D] to-[#FBBF24] text-[#78350F] font-bold text-[0.85rem] border-none cursor-pointer"><i className="fas fa-save mr-1"></i>Sauvegarder</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ==================== BOTTOM NAV ====================
function BottomNav() {
  const { currentPage, setPage } = useAppStore();
  const tabs = [
    { id: 'home', icon: 'fa-home', label: 'Accueil' },
    { id: 'invest', icon: 'fa-chart-line', label: 'Invest' },
    { id: 'trading', icon: 'fa-bolt', label: 'Trading' },
    { id: 'enterprise', icon: 'fa-building', label: 'Projets' },
    { id: 'profile', icon: 'fa-user', label: 'Profil' },
  ];
  return (
    <nav className="h-[60px] bg-white border-t border-[rgba(0,0,0,0.04)] flex items-center justify-around px-2 shrink-0 safe-area-bottom">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} className={`flex flex-col items-center justify-center py-1.5 px-2 border-none cursor-pointer transition-all ${currentPage === t.id ? 'text-[#00C853]' : 'text-[#94A3B8]'}`}>
          <i className={`fas ${t.icon} text-[0.95rem] mb-0.5`}></i>
          <span className="text-[0.55rem] font-semibold">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

// ==================== MAIN APP ====================
export default function BeRichApp() {
  const { user, currentPage, setPage, setUser, showSplash, setShowSplash } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.success && data.user) { setUser(data.user); setPage('home'); }
        else { setPage('auth'); }
      } catch { setPage('auth'); }
      setInitialized(true);
      setShowSplash(false);
    };
    init();
  }, []);

  const handleSplashDone = useCallback(() => { setShowSplash(false); }, [setShowSplash]);

  if (!initialized) {
    return (<div className="bg-[#060A14] h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-gray-700 border-t-[#00C853] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div>);
  }

  const showNav = user && !['auth'].includes(currentPage);

  return (
    <div className="bg-[#060A14] min-h-screen flex items-center justify-center">
      <div id="app" className="w-full max-w-[430px] h-[100dvh] max-h-[932px] bg-[#F2F5F9] relative overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_0_120px_rgba(0,0,0,0.5)]">
        {showSplash && <SplashScreen onDone={handleSplashDone} />}
        <div className="h-full flex flex-col">
          {!user && <AuthScreen />}
          {user && currentPage === 'home' && <HomeScreen />}
          {user && currentPage === 'wallet' && <WalletScreen />}
          {user && currentPage === 'invest' && <InvestHubScreen />}
          {user && currentPage === 'trading' && <TradingScreen />}
          {user && currentPage === 'enterprise' && <EnterpriseScreen />}
          {user && currentPage === 'profile' && <ProfileScreen />}
          {user && currentPage === 'analytics' && <AnalyticsScreen />}
          {user && currentPage === 'withdraw' && <WithdrawScreen />}
          {user && currentPage === 'admin' && <AdminScreen />}
          {showNav && <BottomNav />}
        </div>
        <ToastContainer />
        <NotificationContainer />
      </div>
    </div>
  );
}
