'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { LogoImg, ToastContainer, NotificationContainer, Header, AI_TIPS } from '@/components/shared';

// Lazy load heavy screen components
const InvestHubScreen = dynamic(() => import('@/components/screens/InvestHubScreen'), { ssr: false });
const TradingScreen = dynamic(() => import('@/components/screens/TradingScreen'), { ssr: false });
const EnterpriseScreen = dynamic(() => import('@/components/screens/EnterpriseScreen'), { ssr: false });
const ProfileScreen = dynamic(() => import('@/components/screens/ProfileScreen'), { ssr: false });
const AnalyticsScreen = dynamic(() => import('@/components/screens/AnalyticsScreen'), { ssr: false });
const WithdrawScreen = dynamic(() => import('@/components/screens/WithdrawScreen'), { ssr: false });
const AdminScreen = dynamic(() => import('@/components/screens/AdminScreen'), { ssr: false });
const ChatScreen = dynamic(() => import('@/components/screens/ChatScreen'), { ssr: false });
const DepositScreen = dynamic(() => import('@/components/screens/DepositScreen'), { ssr: false });
const GuideScreen = dynamic(() => import('@/components/screens/GuideScreen'), { ssr: false });
const FloatingGift = dynamic(() => import('@/components/FloatingGift'), { ssr: false });

// ==================== SPLASH ====================
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [hide, setHide] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { setHide(true); setTimeout(onDone, 500); }, 1200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`absolute inset-0 bg-[#050506] z-[9999] flex flex-col items-center justify-center transition-all duration-500 ${hide ? 'opacity-0 invisible' : ''}`}>
      <div className="absolute w-[200px] h-[200px] rounded-full bg-[rgba(184,155,94,0.06)] blur-[80px] top-[25%] left-[15%]" style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
      <div className="absolute w-[160px] h-[160px] rounded-full bg-[rgba(184,155,94,0.04)] blur-[80px] bottom-[20%] right-[10%]" style={{ animation: 'orbFloat 6s ease-in-out infinite 3s reverse' }} />
      <LogoImg className="w-[120px] h-[120px] mb-9" style={{ animation: 'spFloat 3s ease-in-out infinite', filter: 'drop-shadow(0 0 40px rgba(184,155,94,0.2))' }} />
      <div className="w-7 h-7 border-[2.5px] border-[rgba(255,255,255,0.06)] border-t-[#B89B5E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
      <div className="text-[rgba(255,255,255,0.2)] mt-5 text-[0.6rem] tracking-[5px] uppercase">Chargement</div>
    </div>
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
    <section className="absolute inset-0 bg-[#050506] flex flex-col items-center justify-center z-[200]">
      <div className="w-full max-w-[330px] text-center px-5">
        <LogoImg className="w-[100px] h-[100px] mx-auto mb-4" style={{ filter: 'drop-shadow(0 4px 20px rgba(184,155,94,0.2))' }} />
        <h1 className="text-[1.8rem] font-black mb-1 text-[#B89B5E] tracking-[2px]">BE RICH</h1>
        <p className="text-[rgba(255,255,255,0.25)] text-[0.72rem] mb-6">{mode === 'login' ? 'Connectez-vous à votre compte.' : 'Rejoignez Be Rich.'}</p>
        <div className="flex bg-[#0E0F11] rounded-xl p-[3px] mb-6 border border-[rgba(255,255,255,0.06)]">
          <button onClick={() => { setMode('login'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer ${mode === 'login' ? 'bg-[#161719] text-[#EDEDEF] shadow-[0_2px_8px_rgba(0,0,0,0.3)]' : 'text-[rgba(255,255,255,0.25)]'}`}>Connexion</button>
          <button onClick={() => { setMode('register'); setErrors({}); }} className={`flex-1 py-[11px] text-center text-[0.82rem] font-semibold rounded-lg transition-all border-none cursor-pointer ${mode === 'register' ? 'bg-[#161719] text-[#EDEDEF] shadow-[0_2px_8px_rgba(0,0,0,0.3)]' : 'text-[rgba(255,255,255,0.25)]'}`}>Inscription</button>
        </div>
        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4 w-full"><label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">Email</label><input name="email" type="email" required placeholder="votre@email.com" className="w-full py-3 px-4 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.88rem] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]" /></div>
            <div className="mb-4 w-full relative"><label className="block mb-1.5 text-[0.75rem] font-semibold text-[rgba(255,255,255,0.35)]">Mot de passe</label><input name="password" type={showPw.l ? 'text' : 'password'} required placeholder="••••••••" className="w-full py-3 px-4 pr-11 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.88rem] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]" /><button type="button" onClick={() => setShowPw({ ...showPw, l: !showPw.l })} className="absolute right-3 top-[38px] bg-transparent border-none text-[rgba(255,255,255,0.25)] cursor-pointer p-0.5"><i className={`fas ${showPw.l ? 'fa-eye-slash' : 'fa-eye'}`}></i></button></div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-[#B89B5E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(184,155,94,0.2)] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">{loading ? <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-arrow-right"></i> Se connecter</>}</button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Nom complet</label><input name="name" type="text" required placeholder="Jean Dupont" minLength={2} className={`w-full py-2.5 px-3.5 bg-[#161719] border-[1.5px] ${errors.name ? 'border-[#F87171]' : 'border-[rgba(255,255,255,0.06)]'} rounded-xl text-[0.85rem] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]`} />{errors.name && <p className="text-[#F87171] text-[0.65rem] mt-0.5">{errors.name}</p>}</div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Email</label><input name="email" type="email" required placeholder="votre@email.com" className="w-full py-2.5 px-3.5 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.85rem] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]" /></div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Mot de passe</label><input name="password" type={showPw.r ? 'text' : 'password'} required placeholder="Min. 6 caractères" minLength={6} className={`w-full py-2.5 px-3.5 bg-[#161719] border-[1.5px] ${errors.password ? 'border-[#F87171]' : 'border-[rgba(255,255,255,0.06)]'} rounded-xl text-[0.85rem] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]`} />{errors.password && <p className="text-[#F87171] text-[0.65rem] mt-0.5">{errors.password}</p>}</div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Confirmer</label><input name="password2" type={showPw.r2 ? 'text' : 'password'} required placeholder="••••••••" className={`w-full py-2.5 px-3.5 bg-[#161719] border-[1.5px] ${errors.password2 ? 'border-[#F87171]' : 'border-[rgba(255,255,255,0.06)]'} rounded-xl text-[0.85rem] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]`} />{errors.password2 && <p className="text-[#F87171] text-[0.65rem] mt-0.5">{errors.password2}</p>}</div>
            <div className="mb-2.5 w-full"><label className="block mb-1 text-[0.72rem] font-semibold text-[rgba(255,255,255,0.35)]">Code de parrainage <span className="opacity-50">(optionnel)</span></label><input name="referralCode" type="text" placeholder="BR-XXXXXX" className="w-full py-2.5 px-3.5 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.85rem] outline-none text-white placeholder:text-[rgba(255,255,255,0.2)] focus:border-[#B89B5E]" /></div>
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-xl bg-[#B89B5E] text-[#050506] font-bold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(184,155,94,0.2)] transition-transform active:scale-[0.97] disabled:opacity-60 flex items-center justify-center gap-2">{loading ? <div className="w-4 h-4 border-2 border-[rgba(5,5,6,0.3)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} /> : <><i className="fas fa-user-plus"></i> Créer mon compte</>}</button>
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
      <Header title={<><LogoImg className="w-[26px] h-[26px] rounded-md" style={{ objectFit: 'contain' }} /> <span className="text-[#EDEDEF]">Be Rich</span></>} rightElement={
        <button onClick={refresh} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#161719] text-[rgba(255,255,255,0.45)] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90"><i className={`fas fa-sync-alt ${refreshing ? 'animate-spin' : ''}`} /></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Welcome + Balance Card */}
        <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 mb-4 relative overflow-hidden">
          {/* Subtle gold glow */}
          <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(184,155,94,0.08),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite' }} />
          <div className="absolute -bottom-10 -left-10 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(184,155,94,0.04),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite 4s reverse' }} />
          <div className="relative z-[1]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[rgba(255,255,255,0.45)] text-[0.75rem]">Bienvenue, <span className="text-[#EDEDEF] font-semibold">{esc(user.name)}</span></p>
              {user.depositCount > 0 && (
                <span className="bg-[rgba(184,155,94,0.12)] text-[#B89B5E] text-[0.6rem] font-bold px-2.5 py-[3px] rounded-full border border-[rgba(184,155,94,0.15)]">{user.depositCount} dépôt{user.depositCount > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <div className="text-[1.8rem] font-black tracking-[-1px] text-[#EDEDEF]">{formatMoney(user.balance)}</div>
            </div>
            {/* Compact 2x2 Account Grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-[#161719] rounded-lg p-2.5 border border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[rgba(184,155,94,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-chart-line text-[0.6rem] text-[#B89B5E]"></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(255,255,255,0.25)] uppercase tracking-[0.3px] leading-tight">Invest.</div>
                  <div className="text-[0.8rem] font-black text-[#EDEDEF] leading-tight">{formatMoney(user.investBalance)}</div>
                </div>
              </div>
              <div className="bg-[#161719] rounded-lg p-2.5 border border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[rgba(184,155,94,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-bolt text-[0.6rem] text-[#B89B5E]"></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(255,255,255,0.25)] uppercase tracking-[0.3px] leading-tight">Trading</div>
                  <div className="text-[0.8rem] font-black text-[#EDEDEF] leading-tight">{formatMoney(user.tradeBalance)}</div>
                </div>
              </div>
              <div className="bg-[#161719] rounded-lg p-2.5 border border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[rgba(184,155,94,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-building text-[0.6rem] text-[#B89B5E]"></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(255,255,255,0.25)] uppercase tracking-[0.3px] leading-tight">Projets</div>
                  <div className="text-[0.8rem] font-black text-[#EDEDEF] leading-tight">{formatMoney(user.projectBalance)}</div>
                </div>
              </div>
              <div className="bg-[#161719] rounded-lg p-2.5 border border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${(user.totalProfit || 0) >= 0 ? 'bg-[rgba(74,222,128,0.12)]' : 'bg-[rgba(248,113,113,0.12)]'}`}><i className={`fas fa-coins text-[0.6rem] ${(user.totalProfit || 0) >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}></i></div>
                <div className="min-w-0">
                  <div className="text-[0.5rem] text-[rgba(255,255,255,0.25)] uppercase tracking-[0.3px] leading-tight">Profit</div>
                  <div className={`text-[0.8rem] font-black leading-tight ${(user.totalProfit || 0) >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>{formatMoney(user.totalProfit - (user.totalLoss || 0))}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-4">
          {[
            { icon: 'fa-wallet', label: 'Wallet', page: 'wallet' },
            { icon: 'fa-arrow-down', label: 'Déposer', page: 'deposit' },
            { icon: 'fa-chart-line', label: 'Investir', page: 'finance' },
            { icon: 'fa-bolt', label: 'Trader', page: 'finance' },
            { icon: 'fa-building', label: 'Projets', page: 'finance' },
          ].map((a, i) => (
            <button key={i} onClick={() => setPage(a.page)} className="flex-1 bg-[#0E0F11] rounded-xl py-2.5 px-1 text-center border border-[rgba(255,255,255,0.06)] cursor-pointer transition-transform active:scale-95">
              <div className="w-9 h-9 rounded-xl mx-auto mb-1 flex items-center justify-center bg-[rgba(184,155,94,0.12)]"><i className={`fas ${a.icon} text-[0.8rem] text-[#B89B5E]`}></i></div>
              <div className="text-[0.6rem] font-semibold text-[rgba(255,255,255,0.45)] leading-tight">{a.label}</div>
            </button>
          ))}
        </div>

        {/* AI Tip Card */}
        <div className="bg-[#0E0F11] border border-[rgba(184,155,94,0.15)] rounded-xl p-3.5 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(184,155,94,0.12)] flex items-center justify-center shrink-0 border border-[rgba(184,155,94,0.15)]"><i className="fas fa-robot text-[#B89B5E] text-[0.9rem]"></i></div>
          <div className="flex-1 min-w-0"><div className="text-[0.6rem] text-[#B89B5E] font-bold uppercase tracking-[1px] mb-0.5">IA Be Rich</div><div className="text-[0.75rem] leading-relaxed text-[rgba(255,255,255,0.6)]">{tip}</div></div>
        </div>

        {/* Quick Guide Link */}
        <button onClick={() => setPage('guide')} className="w-full bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-xl p-3.5 mb-4 flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98]">
          <div className="w-10 h-10 rounded-xl bg-[rgba(184,155,94,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-compass text-[#B89B5E] text-[1rem]"></i></div>
          <div className="flex-1 text-left">
            <div className="text-[0.82rem] font-bold text-[#EDEDEF]">Guide & Analyses</div>
            <div className="text-[0.62rem] text-[rgba(255,255,255,0.35)]">Tout savoir pour bien investir · Signaux de marché</div>
          </div>
          <i className="fas fa-chevron-right text-[rgba(255,255,255,0.25)] text-[0.7rem]"></i>
        </button>

        {/* Referral Gift Teaser */}
        <button onClick={() => setPage('profile')} className="w-full bg-[#0E0F11] border border-[rgba(184,155,94,0.15)] rounded-xl p-3 mb-4 flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98]">
          <div className="w-9 h-9 rounded-xl bg-[rgba(184,155,94,0.12)] flex items-center justify-center shrink-0"><i className="fas fa-gift text-[#B89B5E] text-[0.9rem]"></i></div>
          <div className="flex-1 text-left">
            <div className="text-[0.75rem] font-bold text-[#EDEDEF]">Un cadeau vous attend</div>
            <div className="text-[0.58rem] text-[rgba(255,255,255,0.35)]">Parrainez vos amis pour débloquer des horizons</div>
          </div>
          <i className="fas fa-chevron-right text-[rgba(255,255,255,0.25)] text-[0.65rem]"></i>
        </button>

        {/* Recent Activity */}
        {txs.length > 0 && (
          <>
            <h3 className="text-[0.88rem] font-bold text-[#EDEDEF] mb-2.5">Activité récente</h3>
            <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-2xl p-4 mb-4">
              {txs.map((tx, i) => {
                const isD = tx.type === 'deposit' || tx.type === 'claim' || tx.type === 'enterprise_claim' || tx.type === 'trade_win';
                const isW = tx.type === 'withdrawal' || tx.type === 'trade_lose' || tx.type === 'enterprise_crash';
                return (
                  <div key={tx.id || i} className={`flex items-center gap-3 py-2.5 ${i < txs.length - 1 ? 'border-b border-[rgba(255,255,255,0.06)]' : ''}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[0.7rem] shrink-0 ${isD ? 'bg-[rgba(74,222,128,0.12)] text-[#4ADE80]' : isW ? 'bg-[rgba(248,113,113,0.12)] text-[#F87171]' : 'bg-[rgba(184,155,94,0.12)] text-[#B89B5E]'}`}>
                      <i className={`fas fa-${isW ? 'arrow-up' : isD ? 'arrow-down' : 'exchange-alt'}`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.75rem] font-semibold text-[#EDEDEF]">{tx.detail || tx.type}</div>
                      <div className="text-[0.6rem] text-[rgba(255,255,255,0.25)]">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
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

  const refresh = async () => { setRefreshing(true); try { const r = await fetch('/api/auth/session'); const d = await r.json(); if (d.success) setUser(d.user); } catch { /* */ } setRefreshing(false); };

  const handleTransfer = async () => {
    const amt = parseFloat(transferAmt);
    if (!amt || amt < 2) { addToast('Minimum 2 $', 'error'); return; }
    if (!transferTarget) return;
    setTransferring(true);
    try {
      const res = await authFetch('/api/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from: transferTarget.from, to: transferTarget.to, amount: amt }) });
      const data = await res.json();
      if (data.success) { addToast('Transfert effectué !', 'success'); setTransferAmt(''); setTransferTarget(null); refresh(); }
      else { addToast(data.error, 'error'); }
    } catch { addToast('Erreur', 'error'); }
    setTransferring(false);
  };

  if (!user) return null;

  const accounts = [
    { key: 'principal', label: 'Compte Principal', balance: user.balance, icon: 'fa-wallet', iconColor: '#B89B5E', iconBg: 'bg-[rgba(184,155,94,0.12)]' },
    { key: 'invest', label: "Compte d'Investissement", balance: user.investBalance, icon: 'fa-chart-line', iconColor: '#B89B5E', iconBg: 'bg-[rgba(184,155,94,0.12)]' },
    { key: 'trade', label: 'Compte de Trading', balance: user.tradeBalance, icon: 'fa-bolt', iconColor: '#B89B5E', iconBg: 'bg-[rgba(184,155,94,0.12)]' },
    { key: 'project', label: 'Compte de Projet', balance: user.projectBalance, icon: 'fa-building', iconColor: '#B89B5E', iconBg: 'bg-[rgba(184,155,94,0.12)]' },
  ] as const;

  return (
    <>
      <Header title="Portefeuille" icon="fa-wallet" iconColor="#B89B5E" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#161719] text-[rgba(255,255,255,0.45)] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} rightElement={<button onClick={refresh} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[#161719] text-[rgba(255,255,255,0.45)] cursor-pointer border-none"><i className={`fas fa-sync-alt text-[0.7rem] ${refreshing ? 'animate-spin' : ''}`} /></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Principal Balance - Main Card */}
        <div className="bg-[#0E0F11] text-white rounded-2xl p-5 mb-3 relative overflow-hidden border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="absolute -top-20 -right-20 w-[200px] h-[200px] bg-[radial-gradient(circle,rgba(184,155,94,0.1),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite' }} />
          <div className="absolute -bottom-10 -left-10 w-[140px] h-[140px] bg-[radial-gradient(circle,rgba(184,155,94,0.06),transparent_60%)]" style={{ animation: 'orbFloat 8s ease-in-out infinite 4s reverse' }} />
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-9 h-9 rounded-xl ${accounts[0].iconBg} flex items-center justify-center`}><i className={`fas ${accounts[0].icon} text-[0.85rem]`} style={{ color: accounts[0].iconColor }}></i></div>
              <div className="text-[0.7rem] text-[rgba(255,255,255,0.25)] font-semibold uppercase tracking-[1.5px]">{accounts[0].label}</div>
            </div>
            <div className="text-[2rem] font-black tracking-[-1px] text-[#EDEDEF] mb-3">{formatMoney(user.balance)}</div>
            <div className="flex gap-2">
              <button onClick={() => setPage('deposit')} className="flex-1 py-[11px] rounded-xl text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[#B89B5E] text-[#050506] shadow-[0_2px_8px_rgba(184,155,94,0.15)]"><i className="fas fa-arrow-down"></i> Déposer</button>
              <button onClick={() => setPage('withdraw')} className="flex-1 py-[11px] rounded-xl text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[rgba(184,155,94,0.12)] text-[#B89B5E]"><i className="fas fa-arrow-up"></i> Retirer</button>
            </div>
          </div>
        </div>

        {/* Other Accounts */}
        {accounts.slice(1).map((acc) => (
          <div key={acc.key} className="bg-[#0E0F11] text-white rounded-2xl p-4 mb-3 border border-[rgba(255,255,255,0.06)] shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl ${acc.iconBg} flex items-center justify-center border border-[rgba(255,255,255,0.06)]`}><i className={`fas ${acc.icon} text-[0.9rem]`} style={{ color: acc.iconColor }}></i></div>
                <div className="text-[0.7rem] text-[rgba(255,255,255,0.25)] font-semibold uppercase tracking-[1.5px]">{acc.label}</div>
              </div>
              <div className="text-[1.3rem] font-black text-[#EDEDEF]">{formatMoney(acc.balance)}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTransferTarget({ from: 'principal', to: acc.key, label: `Verser vers ${acc.label}`, fee: true, fromColor: '#B89B5E', toColor: acc.iconColor, fromIcon: 'fa-wallet', toIcon: acc.icon })} className="flex-1 py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none bg-[rgba(184,155,94,0.12)] text-[#B89B5E] hover:bg-[rgba(184,155,94,0.18)] transition-colors"><i className="fas fa-arrow-right text-[0.65rem]"></i> Verser</button>
              <button onClick={() => setTransferTarget({ from: acc.key, to: 'principal', label: `Retirer vers Principal`, fee: false, fromColor: acc.iconColor, toColor: '#B89B5E', fromIcon: acc.icon, toIcon: 'fa-wallet' })} className="flex-1 py-[9px] rounded-xl text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none bg-[#161719] text-[rgba(255,255,255,0.6)]"><i className="fas fa-arrow-left text-[0.65rem]"></i> Retirer</button>
            </div>
          </div>
        ))}

        {/* Transfer Modal */}
        {transferTarget && (
          <div className="fixed inset-0 bg-[rgba(5,5,6,0.7)] backdrop-blur-md z-[6000] flex items-center justify-center" onClick={() => setTransferTarget(null)}>
            <div className="bg-[#0E0F11] rounded-2xl w-[88%] max-w-[340px] border border-[rgba(255,255,255,0.06)] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden" style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }} onClick={(e) => e.stopPropagation()}>
              {/* Modal Header */}
              <div className="bg-[#0A0A0B] p-5 relative overflow-hidden border-b border-[rgba(255,255,255,0.06)]">
                <h3 className="text-[1rem] font-bold text-[#EDEDEF] mb-2">{transferTarget.label}</h3>
                {/* From → To visual */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#161719] rounded-lg px-2.5 py-1.5 border border-[rgba(255,255,255,0.06)]">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[rgba(184,155,94,0.12)]"><i className={`fas ${transferTarget.fromIcon} text-[0.5rem] text-[#B89B5E]`}></i></div>
                    <span className="text-[0.65rem] font-medium text-[rgba(255,255,255,0.45)]">{transferTarget.from === 'principal' ? 'Principal' : transferTarget.from === 'invest' ? 'Invest.' : transferTarget.from === 'trade' ? 'Trading' : 'Projets'}</span>
                  </div>
                  <i className="fas fa-arrow-right text-[0.6rem] text-[rgba(255,255,255,0.25)]"></i>
                  <div className="flex items-center gap-1.5 bg-[#161719] rounded-lg px-2.5 py-1.5 border border-[rgba(255,255,255,0.06)]">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center bg-[rgba(184,155,94,0.12)]"><i className={`fas ${transferTarget.toIcon} text-[0.5rem] text-[#B89B5E]`}></i></div>
                    <span className="text-[0.65rem] font-medium text-[rgba(255,255,255,0.45)]">{transferTarget.to === 'principal' ? 'Principal' : transferTarget.to === 'invest' ? 'Invest.' : transferTarget.to === 'trade' ? 'Trading' : 'Projets'}</span>
                  </div>
                </div>
              </div>
              {/* Modal Body */}
              <div className="p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <i className={`fas ${transferTarget.fee ? 'fa-percentage text-[#B89B5E]' : 'fa-check-circle text-[#4ADE80]'} text-[0.7rem]`}></i>
                  <p className="text-[0.75rem] text-[rgba(255,255,255,0.45)]">{transferTarget.fee ? 'Frais de 2% sur le transfert' : 'Transfert sans frais'}</p>
                </div>
                <input type="number" step="0.01" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} placeholder="Montant (min 2 $)" className="w-full py-3.5 px-4 bg-[#161719] border-[1.5px] border-[rgba(255,255,255,0.06)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#B89B5E] font-semibold text-[#EDEDEF]" />
                <div className="flex gap-2">
                  <button onClick={() => { setTransferTarget(null); setTransferAmt(''); }} className="flex-1 py-3.5 rounded-xl border-[1.5px] border-[rgba(255,255,255,0.06)] bg-transparent text-[rgba(255,255,255,0.45)] font-semibold text-[0.82rem] cursor-pointer transition-transform active:scale-95">Annuler</button>
                  <button onClick={handleTransfer} disabled={transferring} className="flex-1 py-3.5 rounded-xl bg-[#B89B5E] text-[#050506] font-bold text-[0.82rem] border-none cursor-pointer disabled:opacity-60 transition-transform active:scale-95 shadow-[0_4px_16px_rgba(184,155,94,0.15)]">{transferring ? '...' : 'Confirmer'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-xl p-3.5 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 bg-[rgba(74,222,128,0.12)] border border-[rgba(74,222,128,0.15)]"><i className="fas fa-chart-line text-[0.85rem] text-[#4ADE80]"></i></div>
            <div className="font-extrabold text-[0.9rem] text-[#4ADE80]">{formatMoney(user.totalProfit)}</div>
            <div className="text-[0.58rem] text-[rgba(255,255,255,0.25)] uppercase tracking-[0.5px] font-semibold mt-0.5">Gains</div>
          </div>
          <div className="bg-[#0E0F11] border border-[rgba(255,255,255,0.06)] rounded-xl p-3.5 text-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5 bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.15)]"><i className="fas fa-arrow-down text-[0.85rem] text-[#F87171]"></i></div>
            <div className="font-extrabold text-[0.9rem] text-[#F87171]">{formatMoney(user.totalLoss)}</div>
            <div className="text-[0.58rem] text-[rgba(255,255,255,0.25)] uppercase tracking-[0.5px] font-semibold mt-0.5">Pertes</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== FINANCE SCREEN ====================
function FinanceScreen() {
  const [subTab, setSubTab] = useState<'invest' | 'trading' | 'projects'>('invest');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sub-header with 3 pill tabs */}
      <div className="flex gap-2 px-[18px] py-2.5 bg-[#0A0A0B] border-b border-[rgba(255,255,255,0.06)]">
        {[
          { id: 'invest', label: 'Invest', icon: 'fa-chart-line' },
          { id: 'trading', label: 'Trading', icon: 'fa-bolt' },
          { id: 'projects', label: 'Projets', icon: 'fa-building' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as 'invest' | 'trading' | 'projects')}
            className={`flex-1 py-2 rounded-xl text-[0.75rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              subTab === t.id
                ? 'bg-[#B89B5E] text-[#050506] shadow-[0_2px_8px_rgba(184,155,94,0.15)]'
                : 'bg-[#161719] text-[rgba(255,255,255,0.45)]'
            }`}
          >
            <i className={`fas ${t.icon} text-[0.65rem]`}></i>
            {t.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {subTab === 'invest' && <InvestHubScreen />}
        {subTab === 'trading' && <TradingScreen />}
        {subTab === 'projects' && <EnterpriseScreen />}
      </div>
    </div>
  );
}

// ==================== BOTTOM NAV ====================
function BottomNav() {
  const { currentPage, setPage } = useAppStore();
  const tabs = [
    { id: 'home', icon: 'fa-home', label: 'Accueil' },
    { id: 'finance', icon: 'fa-chart-line', label: 'Finance' },
    { id: 'guide', icon: 'fa-compass', label: 'Guide' },
    { id: 'chat', icon: 'fa-robot', label: 'Chat IA' },
    { id: 'profile', icon: 'fa-user', label: 'Profil' },
  ];
  const isActive = (tabId: string) => {
    if (tabId === 'finance') return ['finance', 'invest', 'trading', 'enterprise'].includes(currentPage);
    if (tabId === 'guide') return currentPage === 'guide';
    return currentPage === tabId;
  };
  return (
    <nav className="h-[60px] bg-[#0A0A0B] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-around px-2 shrink-0 safe-area-bottom">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} className={`flex flex-col items-center justify-center py-1.5 px-2 border-none cursor-pointer transition-all ${isActive(t.id) ? 'text-[#B89B5E]' : 'text-[rgba(255,255,255,0.25)]'}`}>
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
    return (<div className="bg-[#050506] h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-[rgba(255,255,255,0.06)] border-t-[#B89B5E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /></div>);
  }

  const showNav = user && !['auth'].includes(currentPage);

  return (
    <div className="bg-[#050506] min-h-screen flex items-center justify-center">
      <div id="app" className="w-full max-w-[430px] h-[100dvh] max-h-[932px] bg-[#050506] relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_0_120px_rgba(0,0,0,0.5)]">
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
          @keyframes pulseGlow { 0%, 100% { box-shadow: 0 0 0 0 rgba(184, 155, 94, 0.4); } 50% { box-shadow: 0 0 0 8px rgba(184, 155, 94, 0); } }
          @keyframes claimPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(184, 155, 94, 0.4); transform: scale(1); } 50% { box-shadow: 0 0 0 10px rgba(184, 155, 94, 0); transform: scale(1.03); } }
        `}</style>
        {showSplash && <SplashScreen onDone={handleSplashDone} />}
        <div className="h-full flex flex-col">
          {!user && <AuthScreen />}
          {user && currentPage === 'home' && <HomeScreen />}
          {user && currentPage === 'wallet' && <WalletScreen />}
          {user && currentPage === 'finance' && <FinanceScreen />}
          {user && currentPage === 'invest' && <FinanceScreen />}
          {user && currentPage === 'trading' && <FinanceScreen />}
          {user && currentPage === 'enterprise' && <FinanceScreen />}
          {user && currentPage === 'profile' && <ProfileScreen />}
          {user && currentPage === 'analytics' && <AnalyticsScreen />}
          {user && currentPage === 'withdraw' && <WithdrawScreen />}
          {user && currentPage === 'admin' && <AdminScreen />}
          {user && currentPage === 'chat' && <ChatScreen />}
          {user && currentPage === 'deposit' && <DepositScreen />}
          {user && currentPage === 'guide' && <GuideScreen />}
          {showNav && <BottomNav />}
          {user && currentPage === 'home' && <FloatingGift />}
        </div>
        <ToastContainer />
        <NotificationContainer />
      </div>
    </div>
  );
}
