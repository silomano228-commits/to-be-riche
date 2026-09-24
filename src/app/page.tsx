'use client';

import { useState, useEffect, Component } from 'react';
import dynamic from 'next/dynamic';
import { useAppStore, authFetch } from '@/lib/store';
import { ToastContainer } from '@/components/shared';

/* ================================================================
   JEUNE ÉLAN — VERSION ÉPURÉE
   ----------------------------------------------------------------
   5 onglets : Accueil · Missions · Investir · Portefeuille ·
   Communauté (+ Admin pour les administrateurs, + Profil via
   l'avatar). Un écran = une chose. Flux clair : chaque clic a
   une suite logique.
   ================================================================ */

const AuthScreen = dynamic(() => import('@/components/screens/AuthScreen'), { ssr: false });
const SimpleHome = dynamic(() => import('@/components/screens/SimpleHome'), { ssr: false });
const SimpleMissions = dynamic(() => import('@/components/screens/SimpleMissions'), { ssr: false });
const SimpleInvest = dynamic(() => import('@/components/screens/SimpleInvest'), { ssr: false });
const SimpleWallet = dynamic(() => import('@/components/screens/SimpleWallet'), { ssr: false });
const SimpleProfile = dynamic(() => import('@/components/screens/SimpleProfile'), { ssr: false });
const SimpleAdmin = dynamic(() => import('@/components/screens/SimpleAdmin'), { ssr: false });
const ChatScreen = dynamic(() => import('@/components/screens/ChatScreen'), { ssr: false });

/* ==================== ERROR BOUNDARY ==================== */
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error?: string }> {
  state = { hasError: false, error: '' };
  static getDerivedStateFromError(e: Error) { return { hasError: true, error: e.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] min-h-screen flex items-center justify-center p-6">
          <div className="text-center max-w-[320px]">
            <div className="w-16 h-16 rounded-full bg-[rgba(245,158,11,0.1)] flex items-center justify-center mx-auto mb-4">
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

/* ==================== BOTTOM NAV (5 onglets + admin) ==================== */
function BottomNav() {
  const { user, currentPage, setPage } = useAppStore();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const tabs = [
    { id: 'home', icon: 'fa-house', label: 'Accueil' },
    { id: 'missions', icon: 'fa-bullhorn', label: 'Missions' },
    { id: 'invest', icon: 'fa-chart-line', label: 'Investir' },
    { id: 'wallet', icon: 'fa-wallet', label: 'Portefeuille' },
    { id: 'chat', icon: 'fa-comments', label: 'Communauté' },
    ...(isAdmin ? [{ id: 'admin', icon: 'fa-shield-halved', label: 'Admin' }] : []),
  ];
  const active = (id: string) => (id === 'home' ? ['home', 'profile'].includes(currentPage) : currentPage === id);
  return (
    <nav className="h-[62px] bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.06)] flex items-center justify-around px-0.5 shrink-0">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setPage(t.id)} className={`relative flex flex-col items-center justify-center py-1.5 border-none cursor-pointer min-w-0 flex-1 transition-all ${active(t.id) ? 'text-[#22C55E]' : 'text-[rgba(0,0,0,0.3)]'}`}>
          {active(t.id) && <div className="absolute -top-0.5 w-5 h-[3px] rounded-full bg-[#22C55E]"></div>}
          <i className={`fas ${t.icon} text-[0.82rem] mb-1`}></i>
          <span className={`text-[0.5rem] ${active(t.id) ? 'font-black' : 'font-semibold'} truncate max-w-full`}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ==================== MAIN APP ==================== */
export default function JeuneElanApp() {
  const { user, currentPage, setPage, setUser } = useAppStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await authFetch('/api/auth/session');
        const data = await res.json();
        if (data.success && data.user) { setUser(data.user); setPage('home'); }
        else { setPage('auth'); }
      } catch { setPage('auth'); }
      setInitialized(true);
    };
    init();
    /* Retirer l'ancien service worker (cache périmé de l'ancienne version) */
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister())).catch(() => {});
    }
  }, []);

  if (!initialized) {
    return (
      <div className="bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-[3px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  const showNav = user && !['auth'].includes(currentPage);

  return (
    <ErrorBoundary>
      <div className="bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] min-h-screen flex items-center justify-center">
        <div id="app" className="w-full max-w-[430px] h-[100dvh] max-h-[932px] bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9] relative overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.04)]">
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes tIn { from { opacity: 0; transform: translateY(12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes nIn { from { opacity: 0; transform: translateY(-12px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            @keyframes modalIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
          `}</style>
          <div className="h-full flex flex-col min-h-0">
            {!user && <AuthScreen />}
            {user && currentPage === 'home' && <SimpleHome />}
            {user && currentPage === 'missions' && <SimpleMissions />}
            {user && currentPage === 'invest' && <SimpleInvest />}
            {user && currentPage === 'wallet' && <SimpleWallet />}
            {user && currentPage === 'chat' && <ChatScreen />}
            {user && currentPage === 'profile' && <SimpleProfile />}
            {user && currentPage === 'admin' && <SimpleAdmin />}
            {showNav && <BottomNav />}
          </div>
          <ToastContainer />
        </div>
      </div>
    </ErrorBoundary>
  );
}
