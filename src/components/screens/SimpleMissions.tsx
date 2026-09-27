'use client';

import { useState } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import { YasModal } from '@/components/yas-modal';
import {
  useSimpleStore, MISSIONS, levelFor, FEATURED_MISSION_ID, hashString,
  MAX_REWARD_PER_IMAGE, Mission, CHALLENGE_TARGET,
} from '@/lib/simple-store';

/* ================================================================
   MISSIONS — flux clair + engagement :
   liste (mission vedette du jour) → détail → import → soumission
   → confirmation. Épargne AU CHOIX du jeune (compte pour le prêt),
   dépôt/retrait Yas, détection de doublons à la soumission.
   ================================================================ */

type View = { mode: 'list' } | { mode: 'detail'; mission: Mission } | { mode: 'done'; mission: Mission };

/* Compresse l'image importée (aperçu + empreinte) */
async function readImage(file: File): Promise<{ name: string; data: string; hash: string }> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('img'));
    i.src = dataUrl;
  });
  const max = 400;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.round(img.width * scale));
  cv.height = Math.max(1, Math.round(img.height * scale));
  const ctx = cv.getContext('2d');
  ctx?.drawImage(img, 0, 0, cv.width, cv.height);
  const data = cv.toDataURL('image/jpeg', 0.62);
  return { name: file.name, data, hash: hashString(data) };
}

export default function SimpleMissions({ onBack }: { onBack?: () => void }) {
  const { addToast } = useAppStore();
  const s = useSimpleStore();
  const [view, setView] = useState<View>({ mode: 'list' });
  const [tab, setTab] = useState<'missions' | 'images'>('missions');
  const [file, setFile] = useState<{ name: string; data: string; hash: string } | null>(null);
  const [savingAmt, setSavingAmt] = useState('');
  const [yasDeposit, setYasDeposit] = useState(false);
  const [yasWithdraw, setYasWithdraw] = useState(false);

  const { level } = levelFor(s.xp, s.referralCount);
  const quota = level.quota;

  const backBtn = onBack ? (
    <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.05)] text-[#64748B] cursor-pointer border-none mr-1">
      <i className="fas fa-arrow-left text-[0.8rem]"></i>
    </button>
  ) : undefined;

  /* ---------- Vue : liste + mes images ---------- */
  if (view.mode === 'list') {
    const featured = MISSIONS.find((m) => m.id === FEATURED_MISSION_ID);
    const savingValue = parseInt(savingAmt, 10) || 0;
    return (
      <>
        <Header title="Missions" icon="fa-bullhorn" leftElement={backBtn} />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Segmented : Missions / Mes images */}
          <div className="flex bg-[rgba(0,0,0,0.04)] rounded-xl p-1 mb-3">
            <button onClick={() => setTab('missions')} className={`flex-1 py-2 rounded-lg text-[0.7rem] font-bold border-none cursor-pointer transition-all ${tab === 'missions' ? 'bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : 'text-[#94A3B8]'}`}>Missions</button>
            <button onClick={() => setTab('images')} className={`flex-1 py-2 rounded-lg text-[0.7rem] font-bold border-none cursor-pointer transition-all ${tab === 'images' ? 'bg-white text-[#1F2937] shadow-[0_1px_3px_rgba(0,0,0,0.06)]' : 'text-[#94A3B8]'}`}>Mes images</button>
          </div>

          {tab === 'missions' ? (
            <>
              <div className="text-[0.6rem] text-[#94A3B8] mb-3 leading-relaxed">
                Créez l’image avec l’IA de votre choix (ChatGPT, Gemini…), importez-la puis soumettez-la.
                Niveau {level.name} : {quota} images/jour max · {formatCfa(MAX_REWARD_PER_IMAGE)} payés par mission au maximum.
              </div>

              {/* Épargne missions : le jeune CHOISIT combien épargner */}
              <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(34,197,94,0.2)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-piggy-bank text-[#22C55E] text-[0.8rem]"></i>
                    <div className="text-[0.72rem] font-black text-[#1F2937]">Mon épargne — je choisis mon montant</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[0.5rem] font-bold bg-[rgba(34,197,94,0.1)] text-[#22C55E]">PRÊT</span>
                </div>
                <div className="text-[0.58rem] text-[#64748B] mb-2.5 leading-relaxed">
                  Votre épargne prouve votre sérieux : elle finance la <strong>caution</strong> du micro-prêt (la moitié de la somme empruntée) et compte pour votre crédibilité.
                </div>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <div className="text-[0.55rem] text-[#94A3B8] font-bold uppercase">Épargne actuelle</div>
                    <div className="text-[1.15rem] font-black text-[#1F2937] leading-none">{formatCfa(s.savings)}</div>
                  </div>
                  <div className="flex gap-1.5">
                    {[500, 1000, 2500].map((v) => (
                      <button key={v} onClick={() => setSavingAmt(String(v))} className={`px-2.5 py-1.5 rounded-lg text-[0.58rem] font-black border cursor-pointer active:scale-95 ${savingAmt === String(v) ? 'bg-[rgba(34,197,94,0.1)] border-[rgba(34,197,94,0.4)] text-[#16A34A]' : 'bg-[rgba(0,0,0,0.03)] border-[rgba(0,0,0,0.05)] text-[#64748B]'}`}>
                        +{v.toLocaleString('fr-FR')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number" inputMode="numeric" value={savingAmt} onChange={(e) => setSavingAmt(e.target.value)}
                    placeholder="Montant libre (FCFA)"
                    className="flex-1 py-2.5 px-3.5 rounded-xl bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.05)] text-[0.75rem] font-bold text-[#1F2937] outline-none focus:border-[rgba(34,197,94,0.5)]"
                  />
                  <button
                    onClick={() => {
                      if (savingValue <= 0) { addToast('Choisissez un montant à épargner', 'error'); return; }
                      const r = s.addSavings(savingValue);
                      if (r.ok) { addToast(`${formatCfa(savingValue)} épargnés (+5 XP) — ils comptent pour votre prêt`, 'success'); setSavingAmt(''); }
                      else addToast(r.reason || 'Impossible', 'error');
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-black text-[0.65rem] border-none cursor-pointer shrink-0 active:scale-95"
                  >
                    Épargner
                  </button>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-[rgba(0,0,0,0.04)]">
                  <div className="text-[0.55rem] text-[#94A3B8] flex-1">Solde interne : {formatCfa(s.balance)} · retrait Yas min. 2 500 F{s.withdrawalsDone === 0 && s.referralCount < 1 ? ' · 1 filleul requis (1er retrait)' : ''}</div>
                  <button onClick={() => setYasDeposit(true)} className="px-2.5 py-1.5 rounded-lg bg-[rgba(41,98,255,0.08)] text-[#2962FF] font-black text-[0.55rem] border border-[rgba(41,98,255,0.15)] cursor-pointer active:scale-95"><i className="fas fa-arrow-down mr-1"></i>Déposer</button>
                  <button onClick={() => setYasWithdraw(true)} className="px-2.5 py-1.5 rounded-lg bg-[rgba(245,158,11,0.1)] text-[#B45309] font-black text-[0.55rem] border border-[rgba(245,158,11,0.2)] cursor-pointer active:scale-95"><i className="fas fa-arrow-up mr-1"></i>Retirer</button>
                </div>
              </div>

              {/* Mission vedette du jour */}
              {featured && (
                <button onClick={() => { setView({ mode: 'detail', mission: featured }); setFile(null); }} className="w-full rounded-2xl p-3.5 mb-2.5 text-left cursor-pointer transition-transform active:scale-[0.98] border border-[rgba(245,158,11,0.35)] bg-gradient-to-r from-[rgba(245,158,11,0.08)] to-[rgba(251,191,36,0.05)]">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="px-2 py-0.5 rounded-full text-[0.5rem] font-black bg-[rgba(245,158,11,0.15)] text-[#B45309]"><i className="fas fa-star mr-1"></i>MISSION VEDETTE DU JOUR</span>
                    <span className="text-[0.5rem] text-[#94A3B8]">change chaque jour</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-white/70">
                      <i className={`fas ${featured.icon} text-[0.95rem]`} style={{ color: featured.color }}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[0.78rem] font-bold text-[#1F2937] truncate">{featured.title} — {featured.brand}</div>
                      <div className="text-[0.58rem] text-[#B45309] font-semibold">Récompense maximale garantie : +{featured.reward} F</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[0.85rem] font-black text-[#F59E0B]">+{featured.reward} F</div>
                      <i className="fas fa-chevron-right text-[rgba(0,0,0,0.2)] text-[0.6rem] mt-1"></i>
                    </div>
                  </div>
                </button>
              )}

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
                  {img.data
                    ? <img src={img.data} alt={img.missionTitle} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: img.status === 'validated' ? 'rgba(34,197,94,0.1)' : img.status === 'pending' ? 'rgba(245,158,11,0.1)' : img.status === 'duplicate' ? 'rgba(168,85,247,0.1)' : 'rgba(239,68,68,0.08)' }}>
                      <i className={`fas ${img.status === 'validated' ? 'fa-check text-[#22C55E]' : img.status === 'pending' ? 'fa-hourglass-half text-[#F59E0B]' : img.status === 'duplicate' ? 'fa-clone text-[#A855F7]' : 'fa-times text-[#EF4444]'} text-[0.8rem]`}></i>
                    </div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.72rem] font-bold text-[#1F2937] truncate">{img.missionTitle}</div>
                    <div className="text-[0.55rem] text-[#94A3B8]">{img.date}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-[0.5rem] font-black uppercase ${img.status === 'validated' ? 'text-[#22C55E]' : img.status === 'pending' ? 'text-[#F59E0B]' : img.status === 'duplicate' ? 'text-[#A855F7]' : 'text-[#EF4444]'}`}>
                      {img.status === 'validated' ? 'Validée' : img.status === 'pending' ? 'En attente' : img.status === 'duplicate' ? 'Doublon' : 'Refusée'}
                    </div>
                    <div className={`text-[0.75rem] font-black ${img.status === 'validated' ? 'text-[#22C55E]' : 'text-[#CBD5E1]'}`}>{img.status === 'validated' ? `+${img.reward} F` : '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <YasModal open={yasDeposit} kind="deposit" project="missions" onClose={() => setYasDeposit(false)} />
        <YasModal open={yasWithdraw} kind="withdrawal" project="missions" onClose={() => setYasWithdraw(false)} />
      </>
    );
  }

  /* ---------- Vue : confirmation de soumission ---------- */
  if (view.mode === 'done') {
    const challengeLeft = Math.max(0, CHALLENGE_TARGET - s.todayValidated);
    return (
      <>
        <Header title="Missions" icon="fa-bullhorn" leftElement={backBtn} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[rgba(34,197,94,0.12)] flex items-center justify-center mb-4">
            <i className="fas fa-check text-[#22C55E] text-[1.5rem]"></i>
          </div>
          <div className="text-[1.05rem] font-black text-[#1F2937] mb-1.5">Création soumise !</div>
          <div className="text-[0.72rem] text-[#64748B] leading-relaxed mb-2 max-w-[280px]">
            Votre image « {view.mission.title} » est en file de validation.
            Si elle est validée : <strong className="text-[#22C55E]">+{view.mission.reward} F</strong> et <strong className="text-[#F59E0B]">+10 XP</strong> ajoutés à votre compte.
          </div>
          <div className="text-[0.6rem] text-[#94A3B8] mb-5">{s.submissionsToday} / {quota} images aujourd’hui</div>

          {/* Relances : raisons de continuer */}
          <div className="w-full max-w-[300px] bg-white rounded-2xl p-3.5 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] mb-5 text-left">
            <div className="flex items-center gap-2 py-1.5">
              <i className="fas fa-bullseye text-[#3B82F6] text-[0.7rem] w-5 text-center"></i>
              <div className="text-[0.62rem] text-[#475569] flex-1">{challengeLeft > 0 ? <>Encore <strong>{challengeLeft} image{challengeLeft > 1 ? 's' : ''} validée{challengeLeft > 1 ? 's' : ''}</strong> pour le bonus du jour (+10 F)</> : <span className="text-[#22C55E] font-semibold">Bonus du jour débloqué 🎉</span>}</div>
            </div>
            <div className="flex items-center gap-2 py-1.5">
              <i className="fas fa-fire text-[#EF4444] text-[0.7rem] w-5 text-center"></i>
              <div className="text-[0.62rem] text-[#475569] flex-1">Série active : <strong>{s.streak} jours</strong> — reviens demain pour la garder 🔥</div>
            </div>
            <div className="flex items-center gap-2 py-1.5">
              <i className="fas fa-arrow-trend-up text-[#A855F7] text-[0.7rem] w-5 text-center"></i>
              <div className="text-[0.62rem] text-[#475569] flex-1">{quota - s.submissionsToday > 0 ? <>{quota - s.submissionsToday} soumission{quota - s.submissionsToday > 1 ? 's' : ''} restante{quota - s.submissionsToday > 1 ? 's' : ''} aujourd’hui : jusqu’à +{(quota - s.submissionsToday) * MAX_REWARD_PER_IMAGE} F</> : <>Reviens demain pour {quota} nouvelles soumissions 🔁</>}</div>
            </div>
          </div>

          <button onClick={() => setView({ mode: 'list' })} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-[0.8rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-95">
            Retour aux missions
          </button>
        </div>
      </>
    );
  }

  /* ---------- Vue : détail d'une mission ---------- */
  const m = view.mission;
  const quotaLeft = quota - s.submissionsToday;

  const handleSubmit = () => {
    if (!file) { addToast('Importez d’abord votre image', 'error'); return; }
    const r = s.submitImage(m.id, { data: file.data, hash: file.hash, name: file.name });
    if (r.duplicate) {
      addToast(`Doublon détecté : cette image a déjà été envoyée (${file.name}). Créez une image originale.`, 'error');
      setFile(null);
      return;
    }
    if (!r.ok) { addToast(r.reason || 'Soumission impossible', 'error'); return; }
    addToast('Création soumise ✓ (+2 XP)', 'success');
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
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: m.color + '15' }}>
            <i className={`fas ${m.icon} text-[1.2rem]`} style={{ color: m.color }}></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[0.95rem] font-black text-[#1F2937] leading-tight">{m.title}</div>
              {m.id === FEATURED_MISSION_ID && <span className="px-1.5 py-0.5 rounded-md text-[0.48rem] font-black bg-[rgba(245,158,11,0.12)] text-[#B45309]"><i className="fas fa-star mr-0.5"></i>VEDETTE</span>}
            </div>
            <div className="text-[0.65rem] text-[#94A3B8]">{m.brand} · {m.duration}</div>
            <div className="text-[0.8rem] font-black text-[#22C55E] mt-0.5">+{m.reward} F et +10 XP si validée</div>
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
          <div className="text-[0.58rem] text-[#94A3B8] mt-2 leading-relaxed">Limites : {quota} images par jour (niveau {level.name}) · {formatCfa(MAX_REWARD_PER_IMAGE)} payés au maximum par mission. Il vous reste {quotaLeft} soumission{quotaLeft > 1 ? 's' : ''} aujourd’hui.</div>
        </div>

        {/* Import + soumission */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="text-[0.7rem] font-black text-[#1F2937] uppercase tracking-wide mb-2">Votre création</div>
          <label className="block border-2 border-dashed border-[rgba(34,197,94,0.35)] rounded-xl py-6 px-4 text-center cursor-pointer mb-3 transition-colors hover:bg-[rgba(34,197,94,0.03)]">
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) { setFile(null); return; }
              try {
                const img = await readImage(f);
                setFile(img);
              } catch { addToast('Impossible de lire cette image', 'error'); }
            }} />
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <img src={file.data} alt="Aperçu de votre création" className="max-h-[180px] rounded-xl object-contain" />
                <div className="text-[0.68rem] font-bold text-[#22C55E]"><i className="fas fa-image mr-1.5"></i>{file.name}</div>
              </div>
            ) : (
              <>
                <i className="fas fa-cloud-arrow-up text-[#22C55E] text-[1.3rem] mb-2 block"></i>
                <div className="text-[0.72rem] font-bold text-[#1F2937]">Importer votre image</div>
                <div className="text-[0.58rem] text-[#94A3B8] mt-0.5">PNG, JPG — l’image créée avec l’IA de votre choix</div>
              </>
            )}
          </label>
          <div className="text-[0.55rem] text-[#94A3B8] mb-3 leading-relaxed"><i className="fas fa-fingerprint mr-1"></i>Chaque image est analysée : une image déjà envoyée est refusée automatiquement.</div>
          <button
            onClick={handleSubmit}
            disabled={quotaLeft <= 0}
            className={`w-full py-3 rounded-xl text-white font-bold text-[0.8rem] border-none cursor-pointer shadow-[0_2px_10px_rgba(34,197,94,0.2)] transition-transform active:scale-[0.97] ${quotaLeft <= 0 ? 'bg-[#CBD5E1] cursor-not-allowed' : 'bg-gradient-to-r from-[#22C55E] to-[#16A34A]'}`}
          >
            {quotaLeft <= 0 ? 'Limite du jour atteinte — reviens demain' : 'Soumettre ma création'}
          </button>
        </div>
      </div>
    </>
  );
}
