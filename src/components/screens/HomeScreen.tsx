'use client';

import { useAppStore } from '@/lib/store';
import { LogoImg, Header, PROJECTS } from '@/components/shared';

export default function HomeScreen() {
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
