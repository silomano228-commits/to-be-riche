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
                <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.5px] mb-1">Compte d&apos;Investissement</div>
                <div className="text-[1rem] font-black text-[#86EFAC]">{formatMoney(user.investBalance)}</div>
              </div>
              <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
                <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.5px] mb-1">Compte de Trading</div>
                <div className="text-[1rem] font-black text-[#93C5FD]">{formatMoney(user.tradeBalance)}</div>
              </div>
              <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 border border-[rgba(255,255,255,0.05)]">
                <div className="text-[0.6rem] text-[rgba(255,255,255,0.4)] uppercase tracking-[0.5px] mb-1">Compte de Projet</div>
                <div className="text-[1rem] font-black text-[#FDBA74]">{formatMoney(user.projectBalance)}</div>
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
type TransferTarget = { from: string; to: string; label: string; fee: boolean };

function WalletScreen() {
  const { user, setUser, setPage, addToast } = useAppStore();
  const [transferTarget, setTransferTarget] = useState<TransferTarget | null>(null);
  const [transferAmt, setTransferAmt] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [depositAmt, setDepositAmt] = useState('');
  const [showDeposit, setShowDeposit] = useState(false);
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
    { key: 'principal', label: 'Compte Principal', balance: user.balance, gradient: 'from-[#0F172A] via-[#1E293B] to-[#0F172A]', border: 'border-[rgba(255,255,255,0.05)]', textColor: 'text-white', icon: 'fa-wallet', iconColor: '#00C853' },
    { key: 'invest', label: "Compte d'Investissement", balance: user.investBalance, gradient: 'from-[#064E3B] to-[#0F172A]', border: 'border-[rgba(0,200,83,0.15)]', textColor: 'text-[#86EFAC]', icon: 'fa-chart-line', iconColor: '#00C853' },
    { key: 'trade', label: 'Compte de Trading', balance: user.tradeBalance, gradient: 'from-[#1E3A5F] to-[#0F172A]', border: 'border-[rgba(59,130,246,0.15)]', textColor: 'text-[#93C5FD]', icon: 'fa-bolt', iconColor: '#3B82F6' },
    { key: 'project', label: 'Compte de Projet', balance: user.projectBalance, gradient: 'from-[#7C2D12] to-[#0F172A]', border: 'border-[rgba(249,115,22,0.15)]', textColor: 'text-[#FDBA74]', icon: 'fa-building', iconColor: '#F97316' },
  ] as const;

  return (
    <>
      <Header title="Portefeuille" icon="fa-wallet" iconColor="#00C853" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1"><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} rightElement={<button onClick={refresh} className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none"><i className={`fas fa-sync-alt text-[0.7rem] ${refreshing ? 'animate-spin' : ''}`} /></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto">
        {/* Principal Balance - Main Card */}
        <div className={`bg-gradient-to-br ${accounts[0].gradient} text-white rounded-2xl p-5 mb-3 relative overflow-hidden ${accounts[0].border}`}>
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(0,200,83,0.1),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px] mb-1">{accounts[0].label}</div>
            <div className="text-[2rem] font-black tracking-[-1px] mb-3">{formatMoney(user.balance)}</div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeposit(true)} className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[rgba(0,200,83,0.15)] text-[#86EFAC]"><i className="fas fa-arrow-down"></i> Déposer</button>
              <button onClick={() => setPage('withdraw')} className="flex-1 py-[11px] rounded-lg text-[0.78rem] font-semibold cursor-pointer flex items-center justify-center gap-1.5 border-none bg-[rgba(251,191,36,0.15)] text-[#FDE68A]"><i className="fas fa-arrow-up"></i> Retirer</button>
            </div>
          </div>
        </div>

        {/* Other Accounts */}
        {accounts.slice(1).map((acc) => (
          <div key={acc.key} className={`bg-gradient-to-br ${acc.gradient} text-white rounded-2xl p-4 mb-3 ${acc.border}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(255,255,255,0.1)]"><i className={`fas ${acc.icon} text-[0.8rem]`} style={{ color: acc.iconColor }}></i></div>
                <div className="text-[0.7rem] opacity-40 font-semibold uppercase tracking-[1.5px]">{acc.label}</div>
              </div>
              <div className={`text-[1.3rem] font-black ${acc.textColor}`}>{formatMoney(acc.balance)}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTransferTarget({ from: 'principal', to: acc.key, label: `Verser vers ${acc.label}`, fee: true })} className="flex-1 py-[9px] rounded-lg text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none bg-[rgba(255,255,255,0.1)] text-white"><i className="fas fa-arrow-right text-[0.65rem]"></i> Verser</button>
              <button onClick={() => setTransferTarget({ from: acc.key, to: 'principal', label: `Retirer vers Principal`, fee: false })} className="flex-1 py-[9px] rounded-lg text-[0.72rem] font-semibold cursor-pointer flex items-center justify-center gap-1 border-none bg-[rgba(251,191,36,0.15)] text-[#FDE68A]"><i className="fas fa-arrow-left text-[0.65rem]"></i> Retirer</button>
            </div>
          </div>
        ))}

        {/* Transfer Modal */}
        {transferTarget && (
          <div className="fixed inset-0 bg-[rgba(6,10,20,0.55)] backdrop-blur-sm z-[6000] flex items-center justify-center" onClick={() => setTransferTarget(null)}>
            <div className="bg-white rounded-2xl p-6 w-[88%] max-w-[320px] shadow-xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-[1rem] font-bold text-[#1A2332] mb-1">{transferTarget.label}</h3>
              <p className="text-[0.75rem] text-[#64748B] mb-4">{transferTarget.fee ? 'Frais de 2% sur le transfert' : 'Sans frais'}</p>
              <input type="number" step="0.01" value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} placeholder="Montant (min 2 $)" className="w-full py-3 px-4 bg-[#F8FAFC] border-[1.5px] border-[rgba(0,0,0,0.08)] rounded-xl text-[0.88rem] outline-none mb-4 focus:border-[#00C853]" />
              <div className="flex gap-2">
                <button onClick={() => setTransferTarget(null)} className="flex-1 py-3 rounded-xl border-[1.5px] border-[rgba(0,0,0,0.08)] bg-transparent text-[#64748B] font-semibold text-[0.82rem] cursor-pointer">Annuler</button>
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
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes gs { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
          @keyframes spFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
          @keyframes orbFloat { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(20px, -20px); } }
          @keyframes tIn { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes nIn { from { opacity: 0; transform: translateY(-12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
          @keyframes modalIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        `}</style>
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
