'use client';

import { useState } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import { useSimpleStore, AdminUserRow } from '@/lib/simple-store';

/* ================================================================
   ADMIN (épuré) — la même interface que l'utilisateur existe déjà
   (l'admin garde tous les onglets). Ici : l'onglet supplémentaire
   de surveillance — ce que chaque utilisateur fait.
   ================================================================ */

export default function SimpleAdmin() {
  const { addToast } = useAppStore();
  const s = useSimpleStore();
  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  const pending = s.myImages.filter((i) => i.status === 'pending');
  const totalInvested = s.adminUsers.reduce((a, u) => a + u.invested, 0);
  const totalPending = s.adminUsers.reduce((a, u) => a + u.imagesPending, 0);
  const totalEarned = s.adminUsers.reduce((a, u) => a + u.earned, 0);

  const doValidate = (id: string) => { s.validateImage(id); addToast('Image validée — gain crédité au jeune ✓', 'success'); };
  const doRefuse = (id: string) => { s.refuseImage(id); addToast('Image refusée', 'info'); };

  /* ---------- Vue : détail d'un utilisateur ---------- */
  if (selected) {
    return (
      <>
        <Header
          title={selected.name}
          icon="fa-user"
          leftElement={
            <button onClick={() => setSelected(null)} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#64748B] cursor-pointer border-none mr-1">
              <i className="fas fa-arrow-left text-[0.8rem]"></i>
            </button>
          }
        />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {[
              { label: 'Images soumises', value: String(selected.imagesSubmitted), color: '#3B82F6', icon: 'fa-image' },
              { label: 'Images validées', value: String(selected.imagesValidated), color: '#22C55E', icon: 'fa-check' },
              { label: 'Investi', value: formatCfa(selected.invested), color: '#14B8A6', icon: 'fa-chart-line' },
              { label: 'Total gagné', value: formatCfa(selected.earned), color: '#F59E0B', icon: 'fa-coins' },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-2xl p-3.5 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: c.color + '15' }}><i className={`fas ${c.icon} text-[0.7rem]`} style={{ color: c.color }}></i></div>
                <div className="text-[0.55rem] text-[#94A3B8] font-bold uppercase tracking-wide">{c.label}</div>
                <div className="text-[1rem] font-black text-[#1F2937] mt-0.5">{c.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Son activité « gagné »</div>
            {selected.id === 'u-1' ? (
              <>
                {s.myImages.slice(0, 6).map((img) => (
                  <div key={img.id} className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                    <i className={`fas ${img.status === 'validated' ? 'fa-check text-[#22C55E]' : img.status === 'pending' ? 'fa-hourglass-half text-[#F59E0B]' : 'fa-times text-[#EF4444]'} text-[0.72rem] w-5 text-center shrink-0`}></i>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.68rem] font-semibold text-[#1F2937] truncate">{img.missionTitle}</div>
                      <div className="text-[0.55rem] text-[#94A3B8]">{img.date}</div>
                    </div>
                    <div className={`text-[0.5rem] font-black uppercase shrink-0 ${img.status === 'validated' ? 'text-[#22C55E]' : img.status === 'pending' ? 'text-[#F59E0B]' : 'text-[#EF4444]'}`}>
                      {img.status === 'validated' ? `+${img.reward} F` : img.status === 'pending' ? 'Attente' : 'Refus'}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)]">
                  <i className="fas fa-chart-line text-[#14B8A6] text-[0.72rem] w-5 text-center"></i>
                  <div className="text-[0.68rem] text-[#475569] flex-1">Investissement actif</div>
                  <div className="text-[0.75rem] font-black text-[#1F2937]">{formatCfa(selected.invested)}</div>
                </div>
                <div className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)]">
                  <i className="fas fa-calendar-day text-[#F59E0B] text-[0.72rem] w-5 text-center"></i>
                  <div className="text-[0.68rem] text-[#475569] flex-1">Revenu journalier (5 %)</div>
                  <div className="text-[0.75rem] font-black text-[#22C55E]">+{formatCfa(Math.round(selected.invested * 0.05))}</div>
                </div>
                <div className="flex items-center gap-2.5 py-2.5">
                  <i className="fas fa-clock text-[#94A3B8] text-[0.72rem] w-5 text-center"></i>
                  <div className="text-[0.68rem] text-[#475569] flex-1">Dernière activité</div>
                  <div className="text-[0.65rem] font-semibold text-[#64748B]">{selected.lastActive}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  /* ---------- Vue : synthèse + file de validation + utilisateurs ---------- */
  return (
    <>
      <Header title="Admin — Surveillance" icon="fa-shield-halved" iconColor="#EF4444" />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* 4 indicateurs globaux */}
        <div className="grid grid-cols-2 gap-2.5 mb-4">
          {[
            { label: 'Jeunes actifs', value: String(s.adminUsers.length), color: '#3B82F6', icon: 'fa-users' },
            { label: 'Images en attente', value: String(totalPending), color: '#F59E0B', icon: 'fa-hourglass-half' },
            { label: 'Total investi', value: formatCfa(totalInvested), color: '#14B8A6', icon: 'fa-chart-line' },
            { label: 'Gains versés', value: formatCfa(totalEarned), color: '#22C55E', icon: 'fa-coins' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-3.5 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ background: c.color + '15' }}><i className={`fas ${c.icon} text-[0.7rem]`} style={{ color: c.color }}></i></div>
              <div className="text-[0.55rem] text-[#94A3B8] font-bold uppercase tracking-wide">{c.label}</div>
              <div className="text-[1rem] font-black text-[#1F2937] mt-0.5">{c.value}</div>
            </div>
          ))}
        </div>

        {/* File de validation (images soumises par Richard) */}
        <div className="bg-white rounded-2xl p-4 mb-4 border border-[rgba(245,158,11,0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-hourglass-half text-[#F59E0B] text-[0.75rem]"></i>
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide">Images à valider</div>
          </div>
          {pending.length === 0 && <div className="text-center text-[0.65rem] text-[#94A3B8] py-4">Aucune image en attente. Tout est traité ✓</div>}
          {pending.map((img) => (
            <div key={img.id} className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0">
              <i className="fas fa-image text-[#3B82F6] text-[0.72rem] w-5 text-center shrink-0"></i>
              <div className="flex-1 min-w-0">
                <div className="text-[0.68rem] font-semibold text-[#1F2937] truncate">{img.missionTitle}</div>
                <div className="text-[0.55rem] text-[#94A3B8]">{img.date} · {formatCfa(img.reward)} si validée</div>
              </div>
              <button onClick={() => doValidate(img.id)} className="px-3 py-1.5 rounded-lg bg-[rgba(34,197,94,0.1)] text-[#16A34A] font-bold text-[0.6rem] border border-[rgba(34,197,94,0.2)] cursor-pointer transition-transform active:scale-95">Valider</button>
              <button onClick={() => doRefuse(img.id)} className="px-3 py-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#EF4444] font-bold text-[0.6rem] border border-[rgba(239,68,68,0.15)] cursor-pointer transition-transform active:scale-95">Refuser</button>
            </div>
          ))}
        </div>

        {/* Utilisateurs */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Tous les utilisateurs</div>
          {s.adminUsers.map((u) => (
            <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 last:pb-0 text-left bg-transparent border-x-0 border-t-0 cursor-pointer transition-colors hover:bg-[rgba(0,0,0,0.015)]">
              <div className="w-9 h-9 rounded-full bg-[rgba(59,130,246,0.1)] text-[#3B82F6] flex items-center justify-center shrink-0 font-black text-[0.65rem]">
                {u.name.replace(' (vous)', '').split(' ').map((w) => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.7rem] font-bold text-[#1F2937] truncate">{u.name}</div>
                <div className="text-[0.55rem] text-[#94A3B8]">{u.imagesSubmitted} images · {formatCfa(u.invested)} investis · {u.lastActive}</div>
              </div>
              <i className="fas fa-chevron-right text-[rgba(0,0,0,0.2)] text-[0.6rem]"></i>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
