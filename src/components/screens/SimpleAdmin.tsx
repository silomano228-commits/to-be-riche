'use client';

import { useState } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import { useSimpleStore, levelFor, AdminUserRow, LOAN_TIERS, MyImage, PROJECT_LABEL } from '@/lib/simple-store';

/* ================================================================
   ADMIN — surveillance + économie de la plateforme.
   L'admin garde l'interface jeune complète ; ici : stats globales,
   file de validation (VOIR l'image avant de valider, badge doublon),
   transactions Yas à approuver (dépôts / retraits), activité par
   utilisateur, et la vue « rentabilité ».
   ================================================================ */

/* Caution et intérêts détenus sur les autres utilisateurs (démo) */
const MOCK_HELD_CAUTION = 7500;
const MOCK_LOAN_INTEREST = 3200;

export default function SimpleAdmin() {
  const { addToast } = useAppStore();
  const s = useSimpleStore();
  const [selected, setSelected] = useState<AdminUserRow | null>(null);
  const [preview, setPreview] = useState<MyImage | null>(null);

  const pending = s.myImages.filter((i) => i.status === 'pending');
  const pendingYas = s.yasTransfers.filter((t) => t.status === 'pending');
  const totalInvested = s.adminUsers.reduce((a, u) => a + u.invested, 0);
  const totalPending = s.adminUsers.reduce((a, u) => a + u.imagesPending, 0);
  const totalEarned = s.adminUsers.reduce((a, u) => a + u.earned, 0) + s.likes.totalEarned;
  const totalXpUsers = s.adminUsers.length;

  /* Économie de la plateforme (faveur du créateur) */
  const heldCaution = s.cautionBalance + MOCK_HELD_CAUTION;
  const loanInterest = (s.loansTaken > 0 ? (s.transactions.filter((t) => t.kind === 'loan').reduce((a, t) => a + t.amount, 0) * 0.1) : 0) + MOCK_LOAN_INTEREST;
  const yasDepositsIn = s.yasTransfers.filter((t) => t.kind === 'deposit' && t.status === 'approved').reduce((a, t) => a + t.amount, 0);
  const yasPaidOut = s.yasTransfers.filter((t) => t.kind === 'withdrawal' && t.status === 'approved').reduce((a, t) => a + t.amount, 0);
  const netPosition = heldCaution + loanInterest + totalInvested + yasDepositsIn - totalEarned - yasPaidOut;

  /* Doublon ? la même empreinte existe déjà ailleurs */
  const isDuplicate = (img: MyImage) => !!img.hash && s.myImages.some((o) => o.id !== img.id && o.hash === img.hash);

  const doValidate = (id: string) => {
    const r = s.validateImage(id);
    addToast(r.challengeBonus ? `Image validée ✓ + bonus du jour débloqué (+${r.challengeBonus} F)` : 'Image validée — gain crédité au jeune ✓', 'success');
  };
  const doRefuse = (id: string) => { s.refuseImage(id); addToast('Image refusée', 'info'); };

  /* ---------- Vue : aperçu d'une image avant validation ---------- */
  if (preview) {
    const dup = isDuplicate(preview);
    return (
      <>
        <Header
          title="Contrôle de l’image"
          icon="fa-image"
          iconColor="#3B82F6"
          leftElement={
            <button onClick={() => setPreview(null)} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#64748B] cursor-pointer border-none mr-1">
              <i className="fas fa-arrow-left text-[0.8rem]"></i>
            </button>
          }
        />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="bg-white rounded-2xl p-3 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col items-center">
            {preview.data ? (
              <img src={preview.data} alt={preview.missionTitle} className="max-h-[340px] rounded-xl object-contain" />
            ) : (
              <div className="w-full py-14 flex flex-col items-center text-center">
                <i className="fas fa-image text-[#CBD5E1] text-[2.4rem] mb-2"></i>
                <div className="text-[0.7rem] text-[#94A3B8]">Aperçu non disponible (ancienne soumission)</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-1.5">Détails</div>
            <div className="flex justify-between text-[0.65rem] py-1.5 border-b border-[rgba(0,0,0,0.04)]"><span className="text-[#64748B]">Mission</span><span className="font-bold text-[#1F2937] text-right">{preview.missionTitle}</span></div>
            <div className="flex justify-between text-[0.65rem] py-1.5 border-b border-[rgba(0,0,0,0.04)]"><span className="text-[#64748B]">Soumise</span><span className="font-bold text-[#1F2937]">{preview.date}</span></div>
            <div className="flex justify-between text-[0.65rem] py-1.5 border-b border-[rgba(0,0,0,0.04)]"><span className="text-[#64748B]">Récompense si validée</span><span className="font-bold text-[#22C55E]">+{preview.reward} F</span></div>
            <div className="flex justify-between text-[0.65rem] py-1.5"><span className="text-[#64748B]">Empreinte</span><span className="font-mono font-bold text-[#1F2937]">{preview.hash || '—'}</span></div>
          </div>

          {dup && (
            <div className="bg-[rgba(168,85,247,0.06)] rounded-2xl p-4 mb-3 border border-[rgba(168,85,247,0.25)] flex items-start gap-2.5">
              <i className="fas fa-clone text-[#A855F7] text-[0.8rem] mt-0.5"></i>
              <div className="text-[0.65rem] text-[#6B21A8] leading-relaxed flex-1">
                <strong>Doublon probable :</strong> cette image (ou une identique) figure déjà dans les soumissions de ce compte. Une image déjà envoyée ne doit pas être validée deux fois.
              </div>
            </div>
          )}

          <div className="text-[0.6rem] text-[#64748B] mb-2 leading-relaxed">Contrôlez la conformité aux règles de la mission avant de valider. En cas de non-respect ou de doublon, refusez — la session n’est pas payée.</div>

          <div className="flex gap-2">
            <button onClick={() => { doRefuse(preview.id); setPreview(null); }} className="flex-1 py-3 rounded-xl bg-[rgba(239,68,68,0.08)] text-[#EF4444] font-bold text-[0.75rem] border border-[rgba(239,68,68,0.2)] cursor-pointer active:scale-95">Refuser</button>
            <button onClick={() => { doValidate(preview.id); setPreview(null); }} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-black text-[0.75rem] border-none cursor-pointer active:scale-95">Valider (+{preview.reward} F)</button>
          </div>
        </div>
      </>
    );
  }

  /* ---------- Vue : détail d'un utilisateur ---------- */
  if (selected) {
    const lvl0 = levelFor(selected.xp, 3).level;
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
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full text-[0.6rem] font-black" style={{ background: lvl0.color + '15', color: lvl0.color }}>
              <i className={`fas ${lvl0.icon} mr-1`}></i>Niveau {lvl0.name} · {selected.xp} XP
            </span>
            <span className="text-[0.6rem] text-[#94A3B8]">{lvl0.perk}</span>
          </div>

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

  /* ---------- Vue : synthèse ---------- */
  return (
    <>
      <Header title="Admin — Surveillance" icon="fa-shield-halved" iconColor="#EF4444" />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* 4 indicateurs globaux */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {[
            { label: 'Jeunes actifs', value: String(totalXpUsers), color: '#3B82F6', icon: 'fa-users' },
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

        {/* Économie de la plateforme (faveur du créateur) */}
        <div className="bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#1E293B] text-white rounded-2xl p-4 mb-3 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-[130px] h-[130px] bg-[radial-gradient(circle,rgba(34,197,94,0.15),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="flex items-center gap-2 mb-3">
              <i className="fas fa-scale-balanced text-[#4ADE80] text-[0.8rem]"></i>
              <div className="text-[0.78rem] font-bold">Économie de la plateforme</div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-3">
              {[
                { label: 'Caution détenue (verrouillée)', value: heldCaution, color: '#FBBF24', icon: 'fa-lock' },
                { label: 'Intérêts de prêts encaissés', value: Math.round(loanInterest), color: '#4ADE80', icon: 'fa-hand-holding-dollar' },
                { label: 'Dépôts d’investissement actifs', value: totalInvested, color: '#22D3EE', icon: 'fa-chart-line' },
                { label: 'Dépôts Yas encaissés', value: yasDepositsIn, color: '#60A5FA', icon: 'fa-building-columns' },
                { label: 'Retraits Yas payés', value: yasPaidOut, color: '#F472B6', icon: 'fa-hand-holding-dollar' },
                { label: 'Gains versés aux jeunes', value: totalEarned, color: '#F87171', icon: 'fa-coins' },
              ].map((r) => (
                <div key={r.label} className="flex items-start gap-2">
                  <i className={`fas ${r.icon} text-[0.65rem] mt-1 shrink-0`} style={{ color: r.color }}></i>
                  <div className="min-w-0">
                    <div className="text-[0.55rem] text-white/60 font-bold uppercase leading-tight">{r.label}</div>
                    <div className="text-[0.78rem] font-black" style={{ color: r.color }}>{formatCfa(r.value)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-white/8 p-2.5 flex items-center justify-between">
              <div className="text-[0.6rem] text-white/70 font-semibold">Position nette de la plateforme</div>
              <div className={`text-[0.9rem] font-black ${netPosition >= 0 ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>{formatCfa(netPosition)}</div>
            </div>
            <div className="text-[0.52rem] text-white/40 mt-2 leading-relaxed">Caution = 50 % du prêt, verrouillée · frais de prêt 10 % · paliers : {LOAN_TIERS.map((t) => `${(t.amount / 1000)}k`).join(' · ')}</div>
          </div>
        </div>

        {/* File de validation : VOIR l'image avant de valider + badge doublon */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(245,158,11,0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-hourglass-half text-[#F59E0B] text-[0.75rem]"></i>
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide">Images à valider</div>
            <span className="ml-auto text-[0.55rem] text-[#94A3B8]">cliquez « Voir » pour contrôler</span>
          </div>
          {pending.length === 0 && <div className="text-center text-[0.65rem] text-[#94A3B8] py-4">Aucune image en attente. Tout est traité ✓</div>}
          {pending.map((img) => {
            const dup = isDuplicate(img);
            return (
              <div key={img.id} className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0">
                {img.data
                  ? <img src={img.data} alt={img.missionTitle} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  : <i className="fas fa-image text-[#3B82F6] text-[0.72rem] w-5 text-center shrink-0"></i>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[0.68rem] font-semibold text-[#1F2937] truncate">{img.missionTitle}</div>
                    {dup && <span className="px-1.5 py-0.5 rounded-md text-[0.48rem] font-black bg-[rgba(168,85,247,0.12)] text-[#A855F7] shrink-0"><i className="fas fa-clone mr-0.5"></i>DOUBLON ?</span>}
                  </div>
                  <div className="text-[0.55rem] text-[#94A3B8]">{img.date} · {formatCfa(img.reward)} si validée</div>
                </div>
                <button onClick={() => setPreview(img)} className="px-3 py-1.5 rounded-lg bg-[rgba(59,130,246,0.1)] text-[#2563EB] font-bold text-[0.6rem] border border-[rgba(59,130,246,0.2)] cursor-pointer transition-transform active:scale-95">Voir</button>
                <button onClick={() => doValidate(img.id)} className="px-3 py-1.5 rounded-lg bg-[rgba(34,197,94,0.1)] text-[#16A34A] font-bold text-[0.6rem] border border-[rgba(34,197,94,0.2)] cursor-pointer transition-transform active:scale-95">Valider</button>
                <button onClick={() => doRefuse(img.id)} className="px-3 py-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#EF4444] font-bold text-[0.6rem] border border-[rgba(239,68,68,0.15)] cursor-pointer transition-transform active:scale-95">Refuser</button>
              </div>
            );
          })}
        </div>

        {/* Transactions Yas : dépôts / retraits à approuver */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(41,98,255,0.3)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-building-columns text-[#2962FF] text-[0.75rem]"></i>
            <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide">Transactions Yas</div>
            {pendingYas.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[0.5rem] font-black bg-[rgba(41,98,255,0.1)] text-[#2962FF]">{pendingYas.length} en attente</span>}
          </div>
          {s.yasTransfers.length === 0 && <div className="text-center text-[0.65rem] text-[#94A3B8] py-4">Aucune transaction Yas pour l’instant. Les dépôts et retraits des jeunes apparaîtront ici.</div>}
          {s.yasTransfers.slice(0, 10).map((t) => (
            <div key={t.id} className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${t.kind === 'deposit' ? 'bg-[rgba(34,197,94,0.1)]' : 'bg-[rgba(245,158,11,0.1)]'}`}>
                <i className={`fas ${t.kind === 'deposit' ? 'fa-arrow-down text-[#22C55E]' : 'fa-arrow-up text-[#F59E0B]'} text-[0.7rem]`}></i>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.68rem] font-semibold text-[#1F2937] truncate">{t.kind === 'deposit' ? 'Dépôt' : 'Retrait'} · {PROJECT_LABEL[t.project]}</div>
                <div className="text-[0.55rem] text-[#94A3B8]">{t.date} · {t.kind === 'deposit' ? 'à vérifier (compte payé)' : `à payer au ${t.account}`}</div>
              </div>
              <div className="text-[0.68rem] font-black text-[#1F2937] shrink-0">{formatCfa(t.amount)}</div>
              {t.status === 'pending' ? (
                <>
                  <button onClick={() => { const r = s.approveYasTransfer(t.id); if (r.ok) addToast(t.kind === 'deposit' ? `Dépôt validé — ${formatCfa(r.credited || 0)} crédités au jeune ✓` : 'Retrait marqué payé ✓', 'success'); }} className="px-2.5 py-1.5 rounded-lg bg-[rgba(34,197,94,0.1)] text-[#16A34A] font-bold text-[0.58rem] border border-[rgba(34,197,94,0.2)] cursor-pointer transition-transform active:scale-95">Approuver</button>
                  <button onClick={() => { if (s.rejectYasTransfer(t.id)) addToast('Transaction refusée' + (t.kind === 'withdrawal' ? ' — fonds restitués' : ''), 'info'); }} className="px-2.5 py-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] text-[#EF4444] font-bold text-[0.58rem] border border-[rgba(239,68,68,0.15)] cursor-pointer transition-transform active:scale-95">Refuser</button>
                </>
              ) : (
                <span className={`px-2 py-0.5 rounded-md text-[0.5rem] font-black shrink-0 ${t.status === 'approved' ? 'bg-[rgba(34,197,94,0.1)] text-[#16A34A]' : 'bg-[rgba(239,68,68,0.08)] text-[#EF4444]'}`}>
                  {t.status === 'approved' ? 'APPROUVÉ' : 'REFUSÉ'}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Utilisateurs */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Tous les utilisateurs</div>
          {s.adminUsers.map((u) => {
            const lvl = levelFor(u.xp, 3).level;
            return (
              <button key={u.id} onClick={() => setSelected(u)} className="w-full flex items-center gap-2.5 py-2.5 border-b border-[rgba(0,0,0,0.04)] last:border-0 last:pb-0 text-left bg-transparent border-x-0 border-t-0 cursor-pointer transition-colors hover:bg-[rgba(0,0,0,0.015)]">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-[0.65rem]" style={{ background: lvl.color + '15', color: lvl.color }}>
                  {u.name.replace(' (vous)', '').split(' ').map((w) => w[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-[0.7rem] font-bold text-[#1F2937] truncate">{u.name}</div>
                    <i className={`fas ${lvl.icon} text-[0.5rem]`} style={{ color: lvl.color }}></i>
                  </div>
                  <div className="text-[0.55rem] text-[#94A3B8]">{u.imagesSubmitted} images · {formatCfa(u.invested)} investis · {u.lastActive}</div>
                </div>
                <i className="fas fa-chevron-right text-[rgba(0,0,0,0.2)] text-[0.6rem]"></i>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
