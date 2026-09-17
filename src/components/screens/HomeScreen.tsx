'use client';

import { useAppStore, authFetch, formatCfa } from '@/lib/store';
import { LogoImg, Header } from '@/components/shared';
import { useState, useEffect } from 'react';

interface DashData {
  missionBalanceCfa: number;
  missionTotalEarnedCfa: number;
  validatedToday: number;
  dailyLimit: number;
  rewardPerImage: number;
  objectiveCfa: number;
  cautionBalanceCfa: number;
  cautionStatus: string;
  activeCampaigns: number;
  activeLoans: number;
  validatedReferralCount: number;
  userLevel: number;
}

export default function HomeScreen() {
  const { user, setPage } = useAppStore();
  const [dash, setDash] = useState<DashData|null>(null);

  useEffect(() => {
    if (user) {
      authFetch('/api/missions/dashboard').then(r => r.json()).then(d => {
        if (d.success) setDash(d.dashboard);
      }).catch(() => {});
    }
  }, [user]);

  if (!user) return null;

  const level = dash?.userLevel || 1;
  const levelLabels = ['', 'Nouveau', 'Actif', 'Éligible', 'Fiable'];
  const levelLabel = levelLabels[level] || 'Nouveau';

  return (
    <>
      <Header title={<><LogoImg className="w-[26px] h-[26px] rounded-md" style={{ objectFit: 'contain', filter: 'none' }} /> Espace Jeunes</>} rightElement={
        <button className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90" onClick={() => setPage('profile')}><i className="far fa-user-circle"></i></button>
      } />
      <div className="px-[18px] py-4 flex-1 w-full">
        {/* Hero Section — Espace Jeunes */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white rounded-2xl p-5 mb-5 relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-12 -right-12 w-[180px] h-[180px] bg-[radial-gradient(circle,rgba(34,197,94,0.12),transparent_65%)]" />
          <div className="absolute -bottom-10 -left-8 w-[120px] h-[120px] bg-[radial-gradient(circle,rgba(251,191,36,0.08),transparent_65%)]" />
          <div className="relative z-[1] text-center">
            <LogoImg className="w-[56px] h-[56px] mx-auto mb-3" style={{ filter: 'drop-shadow(0 4px 20px rgba(34,197,94,0.25))' }} />
            <h2 className="text-[1.4rem] font-black tracking-[-0.5px] mb-1 bg-gradient-to-r from-[#FCD34D] via-[#FBBF24] to-[#F59E0B] bg-[length:200%_auto] text-transparent bg-clip-text" style={{ animation: 'gs 3s linear infinite' }}>Créez. Gagnez. Empruntez.</h2>
            <p className="text-[rgba(255,255,255,0.5)] text-[0.72rem] leading-relaxed mt-2 mb-4">Générez des visuels avec l&apos;IA, gagnez des FCFA, et accédez aux micro-prêts. Tout depuis votre téléphone.</p>
            <button onClick={() => setPage('missions')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2">
              <i className="fas fa-rocket"></i> Commencer les missions
            </button>
          </div>
        </div>

        {/* Dashboard Quick Stats */}
        {dash && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] text-center">
              <div className="text-[0.55rem] text-[#94A3B8] mb-0.5">Solde missions</div>
              <div className="text-[0.82rem] font-black text-[#22C55E]">{formatCfa(dash.missionBalanceCfa)}</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] text-center">
              <div className="text-[0.55rem] text-[#94A3B8] mb-0.5">Validées</div>
              <div className="text-[0.82rem] font-black text-[#1F2937]">{dash.validatedToday}/{dash.dailyLimit}</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] text-center">
              <div className="text-[0.55rem] text-[#94A3B8] mb-0.5">Niveau</div>
              <div className="text-[0.82rem] font-black text-[#A855F7]">{levelLabel}</div>
            </div>
          </div>
        )}

        {/* Features Section — Espace Jeunes */}
        <h3 className="text-[0.9rem] font-bold text-[#1A2332] mb-3">Comment ça marche ?</h3>
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {[
            { icon: 'fa-magic', iconColor: '#22C55E', title: 'Créez avec l\'IA', desc: 'ChatGPT, DALL-E, Midjourney...', color: 'bg-[#DCFCE7] border-[#BBF7D0]' },
            { icon: 'fa-upload', iconColor: '#3B82F6', title: 'Uploadez ici', desc: '+25 FCFA par image validée', color: 'bg-[#DBEAFE] border-[#BFDBFE]' },
            { icon: 'fa-shield-alt', iconColor: '#D97706', title: 'Constituez la caution', desc: '5 000 FCFA bloqués', color: 'bg-[#FEF3C7] border-[#FDE68A]' },
            { icon: 'fa-hand-holding-usd', iconColor: '#A855F7', title: 'Obtenez un prêt', desc: '5 000 ou 10 000 FCFA', color: 'bg-[#F3E8FF] border-[#E9D5FF]' },
          ].map((f, i) => (
            <div key={i} className={`rounded-xl p-3.5 border ${f.color} shadow-[0_1px_3px_rgba(0,0,0,0.04)]`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5" style={{ backgroundColor: f.iconColor + '15' }}><i className={`fas ${f.icon} text-[1rem]`} style={{ color: f.iconColor }}></i></div>
              <div className="text-[0.78rem] font-bold text-[#1A2332] mb-0.5">{f.title}</div>
              <div className="text-[0.65rem] text-[#64748B] leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Step-by-step */}
        <h3 className="text-[0.9rem] font-bold text-[#1A2332] mb-3">Le chemin vers votre prêt</h3>
        <div className="bg-white rounded-2xl p-5 mb-5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
          {[
            { step: 1, title: 'Créez des visuels', desc: 'Utilisez ChatGPT/DALL-E pour générer des images', icon: 'fa-magic', color: '#22C55E' },
            { step: 2, title: 'Uploadez & gagnez', desc: '25 FCFA par image validée par l\'IA', icon: 'fa-coins', color: '#3B82F6' },
            { step: 3, title: 'Atteignez 2 500 FCFA', desc: 'Constituez la caution de 5 000 FCFA', icon: 'fa-shield-alt', color: '#F59E0B' },
            { step: 4, title: 'Demandez votre prêt !', desc: '5 000 ou 10 000 FCFA selon éligibilité', icon: 'fa-hand-holding-usd', color: '#A855F7' },
          ].map((s, i) => (
            <div key={i} className={`flex items-start gap-3 ${i < 3 ? 'mb-4' : ''}`}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[0.72rem] shrink-0 shadow-sm" style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}dd)` }}>{s.step}</div>
              <div className="flex-1 pt-1">
                <div className="text-[0.82rem] font-bold text-[#1A2332] mb-0.5">{s.title}</div>
                <div className="text-[0.72rem] text-[#64748B]">{s.desc}</div>
              </div>
              <i className={`fas ${s.icon} text-[0.85rem] mt-1.5`} style={{ color: s.color }}></i>
            </div>
          ))}
        </div>

        {/* Campaigns preview */}
        {dash && dash.activeCampaigns > 0 && (
          <div className="bg-[rgba(34,197,94,0.06)] rounded-xl p-3.5 mb-5 border border-[rgba(34,197,94,0.12)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[rgba(34,197,94,0.15)]">
                <i className="fas fa-bullhorn text-[#22C55E] text-[0.75rem]"></i>
              </div>
              <div className="flex-1">
                <div className="text-[0.78rem] font-bold text-[#1F2937]">{dash.activeCampaigns} campagne(s) active(s)</div>
                <div className="text-[0.65rem] text-[#64748B]">De nouvelles missions vous attendent !</div>
              </div>
              <button onClick={() => setPage('missions')} className="px-3 py-1.5 rounded-lg bg-[#22C55E] text-white text-[0.68rem] font-semibold border-none cursor-pointer">Voir</button>
            </div>
          </div>
        )}

        {/* CTA */}
        <button onClick={() => setPage('missions')} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.25)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 mb-5">
          <i className="fas fa-arrow-right"></i> Aller aux missions
        </button>

        {/* Important note */}
        <div className="bg-[rgba(59,130,246,0.06)] rounded-xl p-3.5 mb-5 border border-[rgba(59,130,246,0.12)]">
          <div className="text-[0.72rem] font-bold text-[#3B82F6] mb-1.5"><i className="fas fa-info-circle mr-1"></i> Comment créer vos images ?</div>
          <ol className="text-[0.65rem] text-[#1E40AF] space-y-1 list-decimal ml-3.5">
            <li>Ouvrez <strong>ChatGPT</strong>, <strong>DALL-E</strong>, <strong>Midjourney</strong> ou n&apos;importe quelle IA</li>
            <li>Suivez le brief de la campagne choisie</li>
            <li>Téléchargez l&apos;image sur votre téléphone</li>
            <li>Uploadez-la dans la mission sur Espace Jeunes</li>
          </ol>
        </div>
      </div>
    </>
  );
}
