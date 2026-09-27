'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore, formatCfa } from '@/lib/store';
import { Header } from '@/components/shared';
import { YasModal } from '@/components/yas-modal';
import {
  useSimpleStore, LIKE_TARGET, LIKE_SECONDS, LIKE_REWARD, LIKE_ROUNDS_MAX,
  LIKE_VIP_REWARD, LIKE_VIP_CAGNOTTE, LIKE_FAIL_COOLDOWN,
} from '@/lib/simple-store';

/* ================================================================
   LIVES LIKES — gagner en likant, comme dans un live TikTok.
   100 coeurs en 45 s -> +25 F (50 F en live VIP si cagnotte versée).
   10 sessions max par jour. Echec -> 60 s de récupération.
   ================================================================ */

interface FloatingHeart { id: number; x: number; size: number; gold: boolean }

const HOSTS = [
  { name: 'Nadege', color: '#EC4899', emoji: '🎙️' },
  { name: 'Kevin', color: '#8B5CF6', emoji: '🎧' },
  { name: 'Sofia', color: '#14B8A6', emoji: '✨' },
];
const hostToday = HOSTS[Math.floor(Date.now() / 86400000) % HOSTS.length];

export default function SimpleLikes() {
  const { addToast } = useAppStore();
  const s = useSimpleStore();
  const [phase, setPhase] = useState<'idle' | 'playing' | 'success' | 'fail'>('idle');
  const [likes, setLikes] = useState(0);
  const [timeLeft, setTimeLeft] = useState(LIKE_SECONDS);
  const [hearts, setHearts] = useState<FloatingHeart[]>([]);
  const [viewers, setViewers] = useState(1287);
  const [cooldown, setCooldown] = useState(0);
  const heartId = useRef(0);
  const [yasDeposit, setYasDeposit] = useState(false);
  const [yasWithdraw, setYasWithdraw] = useState(false);

  const vip = s.likes.cagnotte >= LIKE_VIP_CAGNOTTE;
  const reward = vip ? LIKE_VIP_REWARD : LIKE_REWARD;
  const roundsLeft = LIKE_ROUNDS_MAX - s.likes.roundsToday;
  const canPlay = roundsLeft > 0 && cooldown === 0;

  /* Viewers fluctuants (présence vivante) */
  useEffect(() => {
    const t = setInterval(() => setViewers((v) => Math.max(200, v + Math.floor(Math.random() * 60) - 25)), 2000);
    return () => clearInterval(t);
  }, []);

  /* Cooldown après échec */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown > 0]);

  /* Chrono de la session */
  useEffect(() => {
    if (phase !== 'playing') return;
    if (timeLeft <= 0) {
      if (likes >= LIKE_TARGET) return; /* déjà géré par le tap final */
      s.registerLikeFail();
      setPhase('fail');
      setCooldown(LIKE_FAIL_COOLDOWN);
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, timeLeft, likes]);

  const tap = useCallback(() => {
    if (phase !== 'playing') return;
    const next = likes + 1;
    setLikes(next);
    const h: FloatingHeart = { id: heartId.current++, x: 12 + Math.random() * 76, size: 0.8 + Math.random() * 0.9, gold: Math.random() < 0.12 };
    setHearts((hs) => [...hs.slice(-24), h]);
    if (next >= LIKE_TARGET) {
      const r = s.completeLikeRound(vip);
      if (r.ok) setPhase('success');
      else { addToast(r.reason || 'Limite atteinte', 'info'); setPhase('idle'); }
    }
  }, [phase, likes, vip, s]);

  const start = () => {
    if (!canPlay) {
      if (roundsLeft <= 0) addToast('Limite de 10 sessions aujourd’hui — reviens demain 🔁', 'info');
      else addToast(`Récupération : ${cooldown} s`, 'info');
      return;
    }
    setLikes(0);
    setTimeLeft(LIKE_SECONDS);
    setHearts([]);
    setPhase('playing');
  };

  const pct = Math.min(100, (likes / LIKE_TARGET) * 100);
  const timePct = (timeLeft / LIKE_SECONDS) * 100;

  return (
    <>
      <Header title="Lives Likes" icon="fa-heart" iconColor="#EC4899" />
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* ----- LE LIVE (zone de jeu) ----- */}
        <div
          className="relative rounded-2xl overflow-hidden mb-3 select-none"
          style={{ background: phase === 'playing' ? 'linear-gradient(160deg,#1F0938,#4C0519 60%,#831843)' : 'linear-gradient(160deg,#2A0A3E,#5B1049 55%,#9D174D)' }}
          onPointerDown={phase === 'playing' ? tap : undefined}
        >
          {/* coeurs flottants */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {hearts.map((h) => (
              <div key={h.id} className="absolute bottom-[110px]" style={{ left: `${h.x}%`, animation: `hFloat 1.15s ease-out forwards` }}>
                <i className={`fas ${h.gold ? 'fa-star text-[#FCD34D]' : 'fa-heart text-[#F472B6]'}`} style={{ fontSize: `${h.size}rem`, filter: 'drop-shadow(0 2px 6px rgba(244,114,182,0.5))' }}></i>
              </div>
            ))}
            {/* ambiance : coeurs d'autres viewers */}
            {phase === 'playing' && (
              <>
                <div className="absolute bottom-[100px] left-[8%]" style={{ animation: 'hFloat 2.6s ease-out infinite' }}><i className="fas fa-heart text-[#DB2777] text-[0.7rem]"></i></div>
                <div className="absolute bottom-[100px] left-[82%]" style={{ animation: 'hFloat 3.1s ease-out infinite 0.7s' }}><i className="fas fa-heart text-[#BE185D] text-[0.9rem]"></i></div>
              </>
            )}
          </div>

          <div className="relative z-[1] p-4">

            {/* barre live : hôte + spectateurs */}
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 rounded-md text-[0.52rem] font-black bg-[#EF4444] text-white flex items-center gap-1">
                <i className="fas fa-circle text-[0.3rem]" style={{ animation: 'pulse 1.5s infinite' }}></i>EN DIRECT
              </span>
              <div className="flex items-center gap-1.5 text-white/80">
                <i className="fas fa-eye text-[0.55rem]"></i>
                <span className="text-[0.58rem] font-bold tabular-nums">{viewers.toLocaleString('fr-FR')}</span>
              </div>
              <span className="ml-auto text-[0.55rem] text-white/60 font-semibold">{hostToday.emoji} {hostToday.name}</span>
            </div>

            {/* scène : avatar hôte */}
            <div className="flex flex-col items-center justify-center py-3">
              <div
                className="w-[74px] h-[74px] rounded-full flex items-center justify-center mb-2 border-[3px] border-white/20"
                style={{ background: `radial-gradient(circle at 35% 35%, ${hostToday.color}, rgba(0,0,0,0.6))`, animation: phase === 'playing' ? 'pulse 0.8s infinite' : 'none' }}
              >
                <i className="fas fa-microphone-lines text-white text-[1.4rem]"></i>
              </div>
              <div className="text-white text-[0.72rem] font-black">Live Likes Be Rich</div>
              <div className="text-white/60 text-[0.55rem]">Likez le live pour soutenir l&apos;artiste</div>
            </div>

            {/* ----- IDLE : bouton démarrer ----- */}
            {phase === 'idle' && (
              <div className="mt-3">
                <button
                  onClick={start}
                  disabled={!canPlay}
                  className={`w-full py-3.5 rounded-xl font-black text-[0.82rem] border-none cursor-pointer transition-transform active:scale-[0.97] ${canPlay ? 'bg-white text-[#BE185D] shadow-[0_4px_18px_rgba(255,255,255,0.25)]' : 'bg-white/15 text-white/50 cursor-not-allowed'}`}
                >
                  {roundsLeft <= 0 ? 'Limite du jour atteinte — reviens demain' : cooldown > 0 ? `Récupération… ${cooldown} s` : `Entrer dans le live (${LIKE_SECONDS} s)`}
                </button>
                <div className="text-center text-white/60 text-[0.55rem] mt-2">
                  Objectif : {LIKE_TARGET} coeurs en {LIKE_SECONDS} s → <strong className="text-[#FCD34D]">+{reward} F</strong> · {roundsLeft} session{roundsLeft > 1 ? 's' : ''} restante{roundsLeft > 1 ? 's' : ''} aujourd&apos;hui
                </div>
              </div>
            )}

            {/* ----- PLAYING : compteur + chrono + gros bouton ----- */}
            {phase === 'playing' && (
              <>
                {/* chrono */}
                <div className="flex items-center gap-2 mb-2">
                  <i className={`fas fa-clock text-[0.6rem] ${timeLeft <= 10 ? 'text-[#FCA5A5]' : 'text-white/70'}`}></i>
                  <div className="flex-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timePct}%`, background: timeLeft <= 10 ? '#EF4444' : '#FCD34D' }} />
                  </div>
                  <span className={`text-[0.62rem] font-black tabular-nums ${timeLeft <= 10 ? 'text-[#FCA5A5]' : 'text-white'}`}>{timeLeft} s</span>
                </div>

                {/* compteur */}
                <div className="text-center mb-2">
                  <span className="text-[1.9rem] font-black text-white tabular-nums leading-none">{likes}</span>
                  <span className="text-[0.7rem] text-white/60 font-black"> / {LIKE_TARGET} coeurs</span>
                </div>
                <div className="w-full h-2 bg-white/15 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-gradient-to-r from-[#F472B6] to-[#FCD34D] rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>

                {/* gros bouton LIKE */}
                <button
                  onPointerDown={(e) => { e.preventDefault(); tap(); }}
                  className="w-full flex flex-col items-center py-3 bg-transparent border-none cursor-pointer group"
                >
                  <div className="w-[64px] h-[64px] rounded-full bg-gradient-to-br from-[#F472B6] to-[#BE185D] flex items-center justify-center shadow-[0_4px_24px_rgba(244,114,182,0.45)] transition-transform group-active:scale-75">
                    <i className="fas fa-heart text-white text-[1.6rem]" style={{ animation: 'heartbeat 0.6s infinite' }}></i>
                  </div>
                  <div className="text-white/80 text-[0.62rem] font-black mt-1.5">TAP TAP TAP — likez vite !</div>
                </button>
              </>
            )}

            {/* ----- SUCCESS ----- */}
            {phase === 'success' && (
              <div className="text-center py-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(34,197,94,0.2)] flex items-center justify-center mb-2 border-2 border-[#22C55E]">
                  <i className="fas fa-check text-[#4ADE80] text-[1.5rem]"></i>
                </div>
                <div className="text-[1rem] font-black text-white">{LIKE_TARGET} coeurs !</div>
                <div className="text-[0.72rem] text-[#FCD34D] font-black mb-1">+{reward} F crédités (+5 XP)</div>
                <div className="text-[0.55rem] text-white/60 mb-3">Session {s.likes.roundsToday} / {LIKE_ROUNDS_MAX} aujourd&apos;hui</div>
                <div className="flex gap-2">
                  <button onClick={start} disabled={!canPlay} className={`flex-1 py-2.5 rounded-xl font-black text-[0.72rem] border-none cursor-pointer ${canPlay ? 'bg-white text-[#BE185D]' : 'bg-white/15 text-white/50 cursor-not-allowed'}`}>
                    {canPlay ? 'Enchaîner une session' : 'Limite du jour atteinte'}
                  </button>
                  <button onClick={() => setPhase('idle')} className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-bold text-[0.72rem] border border-white/20 cursor-pointer">Plus tard</button>
                </div>
              </div>
            )}

            {/* ----- FAIL ----- */}
            {phase === 'fail' && (
              <div className="text-center py-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-[rgba(239,68,68,0.15)] flex items-center justify-center mb-2 border-2 border-[#EF4444]/50">
                  <i className="fas fa-heart-crack text-[#FCA5A5] text-[1.4rem]"></i>
                </div>
                <div className="text-[0.95rem] font-black text-white">{likes} / {LIKE_TARGET} coeurs</div>
                <div className="text-[0.68rem] text-white/70 mb-1">Presque ! La session n&apos;est pas consommée.</div>
                <div className="text-[0.55rem] text-white/50 mb-3">Récupération de {LIKE_FAIL_COOLDOWN} s — chauffez vos doigts 🔥</div>
                <button onClick={() => setPhase('idle')} className="w-full py-2.5 rounded-xl bg-white text-[#BE185D] font-black text-[0.75rem] border-none cursor-pointer">
                  Compris
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ----- Statistiques du jour ----- */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Sessions aujourd’hui', value: `${s.likes.roundsToday}/${LIKE_ROUNDS_MAX}`, icon: 'fa-clapperboard', color: '#EC4899' },
            { label: 'Gagné ici', value: formatCfa(s.likes.totalEarned), icon: 'fa-coins', color: '#F59E0B' },
            { label: 'Objectif', value: `${LIKE_TARGET}/${LIKE_SECONDS}s`, icon: 'fa-bullseye', color: '#3B82F6' },
          ].map((c) => (
            <div key={c.label} className="bg-white rounded-2xl p-3 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-center">
              <i className={`fas ${c.icon} text-[0.7rem] mb-1`} style={{ color: c.color }}></i>
              <div className="text-[0.78rem] font-black text-[#1F2937]">{c.value}</div>
              <div className="text-[0.48rem] text-[#94A3B8] font-bold uppercase">{c.label}</div>
            </div>
          ))}
        </div>

        {/* ----- VIP : cagnotte via Yas (moteur de dépôt) ----- */}
        <div className="bg-white rounded-2xl p-4 mb-3 border border-[rgba(245,158,11,0.3)] shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <i className="fas fa-crown text-[#F59E0B] text-[0.85rem]"></i>
              <div className="text-[0.78rem] font-bold text-[#1F2937]">Lives VIP — {LIKE_VIP_REWARD} F / session</div>
            </div>
            {vip
              ? <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-black bg-[rgba(34,197,94,0.1)] text-[#22C55E]">DÉBLOQUÉ</span>
              : <span className="px-2 py-0.5 rounded-full text-[0.55rem] font-black bg-[rgba(245,158,11,0.1)] text-[#B45309]"><i className="fas fa-lock mr-1"></i>VERROUILLÉ</span>}
          </div>
          <div className="text-[0.6rem] text-[#64748B] mb-2.5 leading-relaxed">
            Doublez vos gains sur les lives : versez une cagnotte de <strong>{formatCfa(LIKE_VIP_CAGNOTTE)}</strong> via Yas.
            Chaque session VIP validée rapporte <strong>{formatCfa(LIKE_VIP_REWARD)}</strong> au lieu de {formatCfa(LIKE_REWARD)}.
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-2 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#F59E0B] to-[#D97706] rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (s.likes.cagnotte / LIKE_VIP_CAGNOTTE) * 100)}%` }} />
            </div>
            <div className="text-[0.6rem] font-black text-[#B45309] shrink-0">{formatCfa(s.likes.cagnotte)} / {formatCfa(LIKE_VIP_CAGNOTTE)}</div>
            <button onClick={() => setYasDeposit(true)} className="px-3 py-1.5 rounded-lg bg-[rgba(245,158,11,0.1)] text-[#B45309] font-black text-[0.58rem] border border-[rgba(245,158,11,0.2)] cursor-pointer shrink-0 active:scale-95">Déposer</button>
          </div>
        </div>

        {/* ----- Retrait Yas ----- */}
        <div className="bg-white rounded-2xl p-4 border border-[rgba(0,0,0,0.04)] shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[rgba(236,72,153,0.1)] shrink-0">
            <i className="fas fa-building-columns text-[#EC4899] text-[0.8rem]"></i>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[0.72rem] font-bold text-[#1F2937]">Retirer mes gains</div>
            <div className="text-[0.56rem] text-[#64748B] leading-snug">Solde : {formatCfa(s.balance)} · retrait Yas min. {formatCfa(2500)}{s.withdrawalsDone === 0 && s.referralCount < 1 ? ' · 1 filleul requis (1er retrait)' : ''}</div>
          </div>
          <button onClick={() => setYasWithdraw(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#BE185D] text-white font-black text-[0.65rem] border-none cursor-pointer shrink-0 active:scale-95">Retirer</button>
        </div>
      </div>

      <style>{`
        @keyframes hFloat {
          0% { transform: translateY(0) scale(0.6); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translateY(-160px) scale(1.15); opacity: 0; }
        }
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
      `}</style>

      <YasModal open={yasDeposit} kind="deposit" project="likes" onClose={() => setYasDeposit(false)} />
      <YasModal open={yasWithdraw} kind="withdrawal" project="likes" onClose={() => setYasWithdraw(false)} />
    </>
  );
}
