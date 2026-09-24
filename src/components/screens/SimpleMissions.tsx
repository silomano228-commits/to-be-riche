'use client';

import { useState } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import { useSimpleStore, MISSIONS, DAILY_IMAGE_LIMIT, MAX_REWARD_PER_IMAGE, Mission } from '@/lib/simple-store';

/* ================================================================
   MISSIONS (épuré) — flux en 4 temps :
   1. Liste des missions faisables
   2. Détail (description, règles, comment faire)
   3. Importer l'image créée avec l'IA de son choix
   4. Soumettre → retour à la liste
   ================================================================ */

type View = { mode: 'list' } | { mode: 'detail'; mission: Mission } | { mode: 'done'; mission: Mission };

export default function SimpleMissions() {
  const { addToast } = useAppStore();
  const s = useSimpleStore();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [tab, setTab] = useState<'missions' | 'images'>('missions');
  const [file, setFile] = useState<string | null>(null);

  /* ---------- Vue : liste + mes images ---------- */
  if (view.mode === 'list') {
    return (
      <>
        <Header title="Missions" icon="fa-bullhorn" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Segmented : Missions / Mes images */}
          <div className="flex bg-[rgba(0,0,0,0.04)] rounded-xl p-1 mb-4">
            <button onClick={() => setTab('missions')} className={`flex-1 py-2 rounded-lg text-[0.7rem] font-bold border-none cursor-pointer transition-all ${tab === 'missions' ? 'bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : 'text-[#94A3B8]'}`}>Missions</button>
            <button onClick={() => setTab('images')} className={`flex-1 py-2 rounded-lg text-[0.7rem] font-bold border-none cursor-pointer transition-all ${tab === 'images' ? 'bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : 'text-[#94A3B8]'}`}>Mes images</button>
          </div>

          {tab === 'missions' ? (
            <>
              <div className="text-[0.6rem] text-[#94A3B8] mb-3 leading-relaxed">
                Créez l’image avec l’IA de votre choix (ChatGPT, Gemini…), importez-la puis soumettez-la.
                Max {DAILY_IMAGE_LIMIT} images/jour · {formatCfa(MAX_REWARD_PER_IMAGE)} payés par mission au maximum.
              </div>
              <div className="space-y-2.5">
                {MISSIONS.map((m) => (
                  <button key={m.id} onClick={() => { setView({ mode: 'detail', mission: m }); setFile(null); }} className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-3 text-left border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-transform active:scale-[0.98]">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: m.color + '15' }}>
                      <i className={`fas ${m.icon} text-[0.95rem]`} style={{ color: m.color }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.78rem] font-bold text-[#1F2937] truncate">{m.title}</div>
                      <div className="text-[0.6rem] text-[#94A3B8] truncate">{m.brand} · {m.duration}</div>
                      {s.reservedMissionIds.includes(m.id) && <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md text-[0.5rem] font-bold bg-[rgba(168,85,247,0.1)] text-[#A855F7]">Réservée par vous</span>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[0.82rem] font-black text-[#22C55E]">+{m.reward} F</div>
                      <i className="fas fa-chevron-right text-[rgba(0,0,0,0.2)] text-[0.6rem] mt-1"></i>
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-2.5">
              {s.myImages.length === 0 && <div className="text-center text-[0.7rem] text-[#94A3B8] py-10">Aucune image soumise pour l’instant.</div>}
              {s.myImages.map((img) => (
                <div key={img.id} className="bg-white rounded-2xl p-3.5 flex items-center gap-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: img.status === 'validated' ? 'rgba(34,197,94,0.1)' : img.status === 'pending' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.08)' }}>
                    <i className={`fas ${img.status === 'validated' ? 'fa-check text-[#22C55E]' : img.status === 'pending' ? 'fa-hourglass-half text-[#F59E0B]' : 'fa-times text-[#EF4444]'} text-[0.8rem]`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.72rem] font-bold text-[#1F2937] truncate">{img.missionTitle}</div>
                    <div className="text-[0.55rem] text-[#94A3B8]">{img.date}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[0.5rem] font-black uppercase ${img.status === 'validated' ? 'text-[#22C55E]' : img.status === 'pending' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                      {img.status === 'validated' ? 'Validée' : img.status === 'pending' ? 'En attente' : 'Refusée'}
                    </div>
                    <div className={`text-[0.75rem] font-black ${img.status === 'validated' ? 'text-[#22C55E]' : 'text-[#CBD5E1]'}`}>{img.status === 'validated' ? `+${img.reward} F` : '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </>
    );
  }

  /* ---------- Vue : confirmation de soumission ---------- */
  if (view.mode === 'done') {
    return (
      <>
        <Header title="Missions" icon="fa-bullhorn" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mb-4">
            <i className="fas fa-check text-[#22C55E] text-[1.5rem]"></i>
          </div>
          <div className="text-[1.05rem] font-black text-[#1F2937] mb-1.5">Création soumise !</div>
          <div className="text-[0.72rem] text-[#64748B] leading-relaxed mb-2 max-w-[280px]">
            Votre image « {view.mission.title} » est en file de validation.
            Si elle est validée, jusqu’à <strong className="text-[#22C55E]">+{view.mission.reward} F</strong> seront ajoutés à votre solde.
          </div>
          <div className="text-[0.6rem] text-[#94A3B8] mb-6">{s.submissionsToday} / {DAILY_IMAGE_LIMIT} images aujourd’hui</div>
          <button onClick={() => setView({ mode: 'list' })} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-[0.8rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-95">
            Retour aux missions
          </button>
        </div>
      </>
    );
  }

  /* ---------- Vue : détail d'une mission ---------- */
  const m = view.mission;
  const quotaLeft = DAILY_IMAGE_LIMIT - s.submissionsToday;

  const handleSubmit = () => {
    if (!file) { addToast('Importez d’abord votre image', 'error'); return; }
    const r = s.submitImage(m.id);
    if (!r.ok) { addToast(r.reason || 'Soumission impossible', 'error'); return; }
    addToast('Création soumise ✓', 'success');
    setView({ mode: 'done', mission: m });
    setFile(null);
  };

  return (
    <>
      <Header
        title="Détail mission"
        icon="fa-bullhorn"
        leftElement={
          <button onClick={() => setView({ mode: 'list' })} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#64748B] cursor-pointer border-none mr-1">
            <i className="fas fa-arrow-left text-[0.8rem]"></i>
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {/* En-tête mission */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: m.color + '15' }}>
            <i className={`fas ${m.icon} text-[1.2rem]`} style={{ color: m.color }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.95rem] font-black text-[#1F2937] leading-tight">{m.title}</div>
            <div className="text-[0.65rem] text-[#94A3B8]">{m.brand} · {m.duration}</div>
            <div className="text-[0.8rem] font-black text-[#22C55E] mt-0.5">+{m.reward} F si validée</div>
          </div>
        </div>

        {/* La mission */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-1.5">La mission</div>
          <div className="text-[0.75rem] text-[#475569] leading-relaxed">{m.description}</div>
        </div>

        {/* Les règles */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-1.5">Les règles</div>
          {m.rules.map((r, i) => (
            <div key={i} className="flex items-start gap-2.5 py-1">
              <div className="w-5 h-5 rounded-full bg-[rgba(34,197,94,0.1)] text-[#22C55E] flex items-center justify-center text-[0.55rem] font-black shrink-0 mt-0.5">{i + 1}</div>
              <div className="text-[0.72rem] text-[#475569] flex-1 leading-snug">{r}</div>
            </div>
          ))}
        </div>

        {/* Comment faire */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-1.5">Comment faire ?</div>
          {[
            'Créez l’image avec l’IA de votre choix (ChatGPT, Gemini, autre…)',
            'Importez votre image ci-dessous',
            'Soumettez votre création',
          ].map((t, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1">
              <i className="fas fa-arrow-right text-[#CBD5E1] text-[0.55rem] w-4 shrink-0"></i>
              <div className="text-[0.72rem] text-[#475569] flex-1">{t}</div>
            </div>
          ))}
          <div className="text-[0.58rem] text-[#94A3B8] mt-2 leading-relaxed">Limites : max {DAILY_IMAGE_LIMIT} images par jour · {formatCfa(MAX_REWARD_PER_IMAGE)} payés au maximum par mission. Il vous reste {quotaLeft} soumission{quotaLeft > 1 ? 's' : ''} aujourd’hui.</div>
        </div>

        {/* Import + soumission */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Votre création</div>
          <label className="block border-2 border-dashed border-[rgba(34,197,94,0.35)] rounded-xl py-6 px-4 text-center cursor-pointer mb-3 transition-colors hover:bg-[rgba(34,197,94,0.03)]">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0]?.name || null)} />
            {file ? (
              <div className="text-[0.72rem] font-bold text-[#22C55E]"><i className="fas fa-image mr-1.5"></i>{file}</div>
            ) : (
              <>
                <i className="fas fa-cloud-arrow-up text-[#22C55E] text-[1.3rem] mb-2 block"></i>
                <div className="text-[0.72rem] font-bold text-[#1F2937]">Importer votre image</div>
                <div className="text-[0.58rem] text-[#94A3B8] mt-0.5">PNG, JPG — l’image créée avec l’IA de votre choix</div>
              </>
            )}
          </label>
          <button
            onClick={handleSubmit}
            disabled={quotaLeft <= 0}
            className={`w-full py-3 rounded-xl text-white font-bold text-[0.8rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-[0.97] ${quotaLeft <= 0 ? 'bg-[#CBD5E1] cursor-not-allowed' : 'bg-gradient-to-r from-[#22C55E] to-[#16A34A]'}`}
          >
            {quotaLeft <= 0 ? 'Limite du jour atteinte' : 'Soumettre ma création'}
          </button>
        </div>
      </div>
    </>
  );
}
