'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, formatMoney, authFetch, refreshUser } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import { CongratulationsModal, type CongratulationsData } from '@/components/CongratulationsModal';
import PaymentDetails from '@/components/PaymentDetails';

interface VideoItem {
  id: string;
  title: string;
  category: string;
  sponsor: string;
  durationMin: number;
  reward: number;
  watched: boolean;
  watchedAt?: string | null;
}

// Map old category values to new theme values for backward compatibility
const resolveTheme = (category: string): string => {
  const oldMapping: Record<string, string> = {
    chinois: 'industrie',
    japonais: 'technologie',
    indien: 'commerce',
  };
  return oldMapping[category] || category;
};

const THEME_LABEL: Record<string, string> = {
  technologie: 'Technologie',
  finance: 'Finance',
  sante: 'Santé',
  education: 'Éducation',
  commerce: 'Commerce',
  industrie: 'Industrie',
  agriculture: 'Agriculture',
  immobilier: 'Immobilier',
  tourisme: 'Tourisme',
  restauration: 'Restauration',
  mode: 'Mode',
  sport: 'Sport',
  entreprise: 'Entreprise',
  // Fallback for old categories
  chinois: 'Industrie',
  japonais: 'Technologie',
  indien: 'Commerce',
};

const THEME_COLOR: Record<string, string> = {
  technologie: '#06B6D4',
  finance: '#22C55E',
  sante: '#EF4444',
  education: '#A855F7',
  commerce: '#FB923C',
  industrie: '#6B7280',
  agriculture: '#4ADE80',
  immobilier: '#6366F1',
  tourisme: '#3B82F6',
  restauration: '#F472B6',
  mode: '#EC4899',
  sport: '#EAB308',
  entreprise: '#14B8A6',
  // Fallback for old categories
  chinois: '#6B7280',
  japonais: '#06B6D4',
  indien: '#FB923C',
};

const THEME_ICON: Record<string, string> = {
  technologie: 'fas fa-microchip',
  finance: 'fas fa-chart-line',
  sante: 'fas fa-heartbeat',
  education: 'fas fa-graduation-cap',
  commerce: 'fas fa-shopping-cart',
  industrie: 'fas fa-industry',
  agriculture: 'fas fa-seedling',
  immobilier: 'fas fa-building',
  tourisme: 'fas fa-plane',
  restauration: 'fas fa-utensils',
  mode: 'fas fa-tshirt',
  sport: 'fas fa-futbol',
  entreprise: 'fas fa-briefcase',
};



export default function VideoPlatformScreen() {
  const { user, addToast, setPage } = useAppStore();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchedCount, setWatchedCount] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  const [videoBalance, setVideoBalance] = useState(0);
  const [videoDepositRequired, setVideoDepositRequired] = useState(false);
  const [daysWatching, setDaysWatching] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [requiredReferrals, setRequiredReferrals] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [hasLevel1Investment, setHasLevel1Investment] = useState(false);
  const [videoCycleNumber, setVideoCycleNumber] = useState(0);
  const [source, setSource] = useState<'admin' | 'catalog'>('catalog');
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [congratsData, setCongratsData] = useState<CongratulationsData>({ show: false, type: 'video' });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const res = await authFetch('/api/videos/list');
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos || []);
        setWatchedCount(data.watchedCount || 0);
        setRemaining(data.remaining ?? 5);
        setTotalEarnedToday(data.totalEarnedToday || 0);
        setVideoBalance(data.videoBalance || 0);
        setVideoDepositRequired(data.videoDepositRequired || false);
        setDaysWatching(data.daysWatching || 0);
        setCurrentCycle(data.currentCycle || 0);
        setRequiredReferrals(data.requiredReferrals || 0);
        setReferralCount(data.referralCount || 0);
        setHasLevel1Investment(!!data.hasLevel1Investment);
        setVideoCycleNumber(data.videoCycleNumber || 0);
        setSource(data.source === 'admin' ? 'admin' : 'catalog');
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await authFetch('/api/videos/list');
        const data = await res.json();
        if (cancelled || !data.success) return;
        setVideos(data.videos || []);
        setWatchedCount(data.watchedCount || 0);
        setRemaining(data.remaining ?? 5);
        setTotalEarnedToday(data.totalEarnedToday || 0);
        setVideoBalance(data.videoBalance || 0);
        setVideoDepositRequired(data.videoDepositRequired || false);
        setDaysWatching(data.daysWatching || 0);
        setCurrentCycle(data.currentCycle || 0);
        setRequiredReferrals(data.requiredReferrals || 0);
        setReferralCount(data.referralCount || 0);
        setHasLevel1Investment(!!data.hasLevel1Investment);
        setVideoCycleNumber(data.videoCycleNumber || 0);
        setSource(data.source === 'admin' ? 'admin' : 'catalog');
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    };
    run();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <>
        <Header title="Vidéos" />
        <div className="flex-1 flex items-center justify-center bg-[#F8F9FA]">
          <div className="w-8 h-8 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#14B8A6] rounded-full" style={{ animation: 'spin 0.7s linear infinite' }}></div>
        </div>
      </>
    );
  }

  // Step-based progress: 5 steps (one per daily video)
  const stepPct = Math.min(100, (watchedCount / 5) * 100);

  return (
    <>
      <Header title="Vidéos d'entreprises" />
      <div className="flex-1 overflow-y-auto pb-6 bg-[#F8F9FA]">
        {/* 1. Concept info banner */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDFA)', border: '1px solid #A7F3D0' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
                <LogoImg className="w-7 h-7" />
              </div>
              <div>
                <div className="text-[0.85rem] font-black text-[#0F766E] mb-0.5">Plateforme de communication pour les grandes entreprises</div>
                <div className="text-[0.7rem] text-[#115E59] leading-relaxed">
                  Les grandes entreprises chinoises, japonaises et indiennes vous paient pour regarder leurs vidéos promotionnelles. Gagnez en visibilité pour elles, gagnez de l'argent pour vous !
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Share invite banner */}
        <div className="px-4 pt-3">
          <button onClick={() => setShowShareModal(true)} className="w-full rounded-2xl p-3 flex items-center gap-3 cursor-pointer transition-all active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', border: '1px solid #FCD34D' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
              <i className="fas fa-share-nodes text-white text-[1rem]"></i>
            </div>
            <div className="flex-1 text-left">
              <div className="text-[0.8rem] font-black text-[#92400E]">Invitez vos amis</div>
              <div className="text-[0.65rem] text-[#B45309]">Partagez Be Rich et gagnez ensemble !</div>
            </div>
            <i className="fas fa-chevron-right text-[#92400E] text-[0.7rem]"></i>
          </button>
        </div>

        {/* 3. Video account balance card with earnings progress meter (image qui augmente) */}
        <div className="px-4 pt-3">
          <div className="rounded-2xl p-4 text-white" style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[0.6rem] uppercase tracking-widest font-bold text-white/70">Compte Vidéo</div>
                <div className="text-[1.6rem] font-black leading-none mt-0.5">{formatMoney(videoBalance)}</div>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <i className="fas fa-video text-white text-[1.2rem]"></i>
              </div>
            </div>

            {/* Step-based progress — 5 steps (one per daily video) */}
            <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <i className="fas fa-list-check text-[#4ADE80] text-[0.85rem]"></i>
                  <span className="text-[0.7rem] font-bold text-white">Progression quotidienne</span>
                </div>
                <span className="text-[0.7rem] font-black text-white">
                  {watchedCount}/5 vidéos
                </span>
              </div>
              {/* Step progress bar */}
              <div className="relative h-2.5 rounded-full overflow-hidden mb-2.5" style={{ background: 'rgba(255,255,255,0.25)' }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${stepPct}%`, background: 'linear-gradient(90deg, #22C55E, #4ADE80)' }}
                ></div>
              </div>
              {/* 5 step circles with checkmarks */}
              <div className="flex items-center justify-between px-0.5">
                {Array.from({ length: 5 }).map((_, i) => {
                  const done = i < watchedCount;
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300"
                        style={{
                          background: done ? '#22C55E' : 'rgba(255,255,255,0.2)',
                          border: done ? 'none' : '2px solid rgba(255,255,255,0.3)',
                        }}
                      >
                        {done ? (
                          <i className="fas fa-check text-white text-[0.55rem]"></i>
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-white/30"></div>
                        )}
                      </div>
                      <span className="text-[0.45rem] text-white/60">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
              <div className="text-[0.6rem] text-white/70 text-center mt-1.5">
                {remaining > 0
                  ? `Regardez encore ${remaining} vidéo${remaining > 1 ? 's' : ''} pour atteindre l'objectif quotidien`
                  : '✨ Objectif quotidien atteint — revenez demain !'}
              </div>
            </div>

            {/* Withdraw button ONLY — NO deposit (video account is funded only by watching) */}
            <button
              onClick={() => setShowWithdrawModal(true)}
              className="w-full py-3 rounded-xl font-bold text-[0.85rem] cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'rgba(255,255,255,0.97)', color: '#0F766E' }}
            >
              <i className="fas fa-arrow-up-from-bracket"></i>
              Retirer
            </button>
            <div className="text-[0.55rem] text-white/60 text-center mt-1.5">
              Minimum de retrait: $1 · Disponible dans les 6h
            </div>
          </div>
        </div>

        {/* 4. 3-day cycle warning banner — withdrawals suspended until cycle cleared */}
        {videoDepositRequired && (
          <div className="px-4 pt-3">
            <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FED7AA)', border: '1px solid #F59E0B' }}>
              <div className="flex items-start gap-2 mb-2">
                <i className="fas fa-triangle-exclamation text-[#D97706] text-[1.1rem] mt-0.5"></i>
                <div className="flex-1">
                  <div className="text-[0.85rem] font-black text-[#92400E]">Action requise pour les retraits</div>
                  <div className="text-[0.7rem] text-[#92400E] leading-relaxed mt-1">
                    Après <b>3 jours de vidéos</b> (cycle {currentCycle}, jour {daysWatching}), pour continuer à <b>retirer</b> vos gains vidéo, vous devez :
                  </div>
                  <ul className="text-[0.7rem] text-[#92400E] leading-relaxed mt-1.5 ml-1 space-y-1">
                    <li className="flex items-start gap-1.5">
                      {hasLevel1Investment
                        ? <i className="fas fa-circle-check text-[#16A34A] mt-0.5"></i>
                        : <i className="fas fa-circle-xmark text-[#DC2626] mt-0.5"></i>}
                      <span>Déposer au <b>Niveau 1 d'investissement</b> (Make Money) — {hasLevel1Investment ? 'investissement actif ✅' : 'aucun investissement Niveau 1 ❌'}</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      {referralCount >= requiredReferrals
                        ? <i className="fas fa-circle-check text-[#16A34A] mt-0.5"></i>
                        : <i className="fas fa-circle-xmark text-[#DC2626] mt-0.5"></i>}
                      <span>Inviter <b>{requiredReferrals} parrainé(s)</b> — vous avez {referralCount} parrainé(s) {referralCount >= requiredReferrals ? '✅' : `(${requiredReferrals - referralCount} restant)`}</span>
                    </li>
                  </ul>
                  <div className="text-[0.62rem] text-[#B45309] italic mt-2 leading-relaxed">
                    <i className="fas fa-info-circle mr-1"></i>
                    Vous pouvez toujours <b>regarder des vidéos</b> et accumuler des gains. Seuls les retraits sont suspendus jusqu'au déblocage.
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => setPage('home')}
                  className="py-2.5 rounded-xl font-bold text-[0.72rem] cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  style={{ background: '#0F766E', color: '#FFFFFF' }}
                >
                  <i className="fas fa-money-bill-trend-up"></i>Aller à Make Money
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="py-2.5 rounded-xl font-bold text-[0.72rem] cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  style={{ background: '#F59E0B', color: '#FFFFFF' }}
                >
                  <i className="fas fa-user-plus"></i>Inviter des amis
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5. Stats row (compact) */}
        <div className="px-4 pt-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2.5 text-center bg-white" style={{ border: '1px solid #E5E7EB' }}>
              <div className="text-[0.5rem] uppercase tracking-wide font-semibold text-[#6B7280]">Restantes</div>
              <div className="text-[1.1rem] font-black text-[#14B8A6]">{remaining}/5</div>
            </div>
            <div className="rounded-xl p-2.5 text-center bg-white" style={{ border: '1px solid #E5E7EB' }}>
              <div className="text-[0.5rem] uppercase tracking-wide font-semibold text-[#6B7280]">Vues</div>
              <div className="text-[1.1rem] font-black text-[#0F766E]">{watchedCount}</div>
            </div>
            <div className="rounded-xl p-2.5 text-center bg-white" style={{ border: '1px solid #E5E7EB' }}>
              <div className="text-[0.5rem] uppercase tracking-wide font-semibold text-[#6B7280]">Gagné</div>
              <div className="text-[1.1rem] font-black text-[#22C55E]">${totalEarnedToday.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* 6. Daily videos header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-[0.9rem] font-black text-[#1F2937]">
            <i className="fas fa-play-circle mr-1.5 text-[#14B8A6]"></i>Vidéos du jour
          </h3>
          <span className="text-[0.65rem] text-[#6B7280]">
            {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            {source === 'admin' && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#0F766E] text-[0.55rem] font-bold">admin</span>}
          </span>
        </div>

        {/* 7. 2-COLUMN GRID of all 5 video cards */}
        {videos.length > 0 ? (
          <div className="px-4 grid grid-cols-2 gap-3">
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => !v.watched && setActiveVideo(v)}
                disabled={v.watched}
                className="rounded-2xl overflow-hidden text-left cursor-pointer transition-all active:scale-[0.98] disabled:cursor-default flex flex-col"
                style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
              >
                {/* Thumbnail */}
                <div className="relative w-full" style={{ aspectRatio: '16/9' }}>
                  <VideoThumbnail videoId={v.id} category={v.category} durationMin={v.durationMin} />
                  {v.watched && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
                      <i className="fas fa-circle-check text-[#22C55E] text-[1.8rem]" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.5)' }}></i>
                    </div>
                  )}
                </div>
                {/* Body */}
                <div className="p-2.5 flex-1 flex flex-col">
                  <div className="flex items-center gap-1 mb-1 flex-wrap">
                    <span className="text-[0.5rem] font-bold px-1.5 py-0.5 rounded text-white flex items-center gap-1" style={{ background: THEME_COLOR[v.category] || '#14B8A6' }}>
                      <i className={`${THEME_ICON[v.category] || 'fas fa-briefcase'} text-[0.4rem]`}></i>
                      {THEME_LABEL[v.category] || v.category}
                    </span>
                  </div>
                  <div className="text-[0.78rem] font-bold text-[#1F2937] leading-snug mb-1" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {v.title}
                  </div>
                  <div className="text-[0.6rem] text-[#6B7280] flex items-center gap-1 mb-2 truncate">
                    <i className="fas fa-bullhorn text-[0.5rem]" style={{ color: THEME_COLOR[v.category] || '#14B8A6' }}></i>
                    <span className="truncate">{v.sponsor}</span>
                  </div>
                  {/* Reward / status */}
                  <div className="mt-auto">
                    {v.watched ? (
                      <div className="flex items-center gap-1 text-[#22C55E]">
                        <i className="fas fa-check-circle text-[0.75rem]"></i>
                        <span className="text-[0.65rem] font-bold">Regardée</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-[0.6rem] text-[#6B7280] flex items-center gap-0.5">
                          <i className="fas fa-clock"></i>{v.durationMin}min
                        </span>
                        <span className="text-[0.85rem] font-black text-[#22C55E]">+${v.reward.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 pt-8 text-center">
            <i className="fas fa-video text-[#D1D5DB] text-[2rem] mb-2"></i>
            <div className="text-[0.8rem] text-[#6B7280]">Aucune vidéo disponible aujourd'hui</div>
          </div>
        )}
      </div>

      {/* Video player modal — YouTube embed, no seeking/scrolling, always-available quit button */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onReward={async (reward) => {
            const newTodayTotal = totalEarnedToday + reward;
            setCongratsData({
              show: true,
              type: 'video',
              amount: reward,
              title: 'Vidéo regardée !',
              message: `+$${reward.toFixed(2)} crédités sur votre compte vidéo. Total gagné aujourd'hui : $${newTodayTotal.toFixed(2)}.`,
              onClose: () => setCongratsData({ show: false, type: 'video' }),
            });
            await refreshUser();
            await loadStatus();
            setActiveVideo(null);
          }}
        />
      )}

      {/* Withdraw modal — $1 minimum, inline error handling */}
      {showWithdrawModal && (
        <VideoWithdrawModal
          videoBalance={videoBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={async () => {
            await loadStatus();
            setShowWithdrawModal(false);
            addToast('Demande de retrait prise en compte. Les fonds seront disponibles dans les 6 heures.', 'success');
          }}
          addToast={addToast}
        />
      )}

      {/* Share modal (native share sheet) */}
      {showShareModal && (
        <ShareModal referralCode={user?.referralCode || ''} addToast={addToast} onClose={() => setShowShareModal(false)} />
      )}

      <CongratulationsModal data={congratsData} />
    </>
  );
}

// ===== Video thumbnail with YouTube image + onError fallback =====
function VideoThumbnail({ videoId, category, durationMin }: { videoId: string; category: string; durationMin: number }) {
  const [failed, setFailed] = useState(false);
  const bg = THEME_COLOR[category] || '#14B8A6';
  if (failed) {
    return (
      <div className="w-full h-full flex items-center justify-center relative" style={{ background: bg }}>
        <i className="fas fa-play text-white text-[1.6rem] opacity-80"></i>
        <div className="absolute bottom-1 right-1 text-[0.5rem] font-bold text-white px-1 rounded" style={{ background: 'rgba(0,0,0,0.65)' }}>{durationMin}min</div>
      </div>
    );
  }
  return (
    <div className="w-full h-full relative" style={{ background: bg }}>
      <img
        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
      <div className="absolute bottom-1 right-1 text-[0.5rem] font-bold text-white px-1 rounded" style={{ background: 'rgba(0,0,0,0.65)' }}>{durationMin}min</div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.55)' }}>
          <i className="fas fa-play text-white text-[0.85rem] ml-0.5"></i>
        </div>
      </div>
    </div>
  );
}


// ===== Video player modal — simple iframe + time-based progress (robust, no YT API dependency) =====
const MIN_WATCH_PCT = 30; // must match /api/videos/reward threshold

function VideoPlayerModal({ video, onClose, onReward }: {
  video: VideoItem;
  onClose: () => void;
  onReward: (reward: number) => Promise<void>;
}) {
  const [watchedPercent, setWatchedPercent] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const claimedRef = useRef(false);

  // Total video duration in seconds (from catalog). Used for time-based progress.
  const totalSeconds = video.durationMin * 60;
  const requiredSeconds = totalSeconds * (MIN_WATCH_PCT / 100);

  // Time-based progress tracker: increments watchedPercent based on elapsed time.
  // This is more reliable than the YouTube IFrame API's getCurrentTime(), which
  // can fail to report when the API fires spurious onError events.
  useEffect(() => {
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const pct = Math.min(100, (elapsed / totalSeconds) * 100);
      setWatchedPercent(pct);
      if (pct >= MIN_WATCH_PCT) setCanClaim(true);
    }, 1000);
    return () => clearInterval(interval);
  }, [video.id, totalSeconds]);

  // If the iframe doesn't load within 15 seconds, show a fallback error.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!iframeLoaded) {
        setError('La vidéo met trop de temps à charger. Vérifiez votre connexion ou essayez une autre vidéo.');
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [iframeLoaded]);

  const preventScroll = (e: React.WheelEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  const handleClaim = async () => {
    if (claiming || claimedRef.current) return;
    claimedRef.current = true;
    setClaiming(true);
    setError(null);
    try {
      const pct = Math.max(watchedPercent, MIN_WATCH_PCT);
      const res = await authFetch('/api/videos/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, watchedPercent: pct }),
      });
      const data = await res.json();
      if (data.success) {
        setClaimed(true);
      } else {
        setError(data.error || 'Erreur lors de la réclamation.');
        claimedRef.current = false;
      }
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
      claimedRef.current = false;
    }
    setClaiming(false);
  };

  const handleClose = async () => {
    if (claimed) {
      await onReward(video.reward);
    } else {
      onClose();
    }
  };


  const remainingPct = Math.max(0, Math.ceil(MIN_WATCH_PCT - watchedPercent));
  const remainingSec = Math.max(0, Math.ceil(requiredSeconds - (Date.now() - startTimeRef.current) / 1000));

  // Build the YouTube embed URL. Using youtube.com (not nocookie) for maximum
  // compatibility. autoplay=1, controls=0 (hidden), rel=0, modestbranding=1.
  const embedUrl = `https://www.youtube.com/embed/${video.id}?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&playsinline=1&fs=0&iv_load_policy=3&enablejsapi=0`;

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.92)' }}>
      <div className="w-full max-w-[420px]">
        {/* Header — Quit (X) button ALWAYS visible */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0 flex items-center gap-1" style={{ background: THEME_COLOR[video.category] || '#14B8A6' }}>
              <i className={`${THEME_ICON[video.category] || 'fas fa-briefcase'} text-[0.45rem]`}></i>
              {THEME_LABEL[video.category] || video.category}
            </span>
            <span className="text-[0.6rem] text-white/60 truncate">Sponsorisé par {video.sponsor}</span>
          </div>
          <button
            onClick={claimed ? handleClose : onClose}
            aria-label="Quitter la vidéo"
            title="Quitter la vidéo"
            className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border-none"
            style={{ background: 'rgba(239,68,68,0.95)', color: '#FFFFFF', boxShadow: '0 2px 10px rgba(239,68,68,0.45)' }}
          >
            <i className="fas fa-times text-[1.15rem]"></i>
          </button>
        </div>

        {/* Title */}
        <h3 className="text-[0.9rem] font-bold text-white mb-2">{video.title}</h3>

        {/* Player container — simple iframe with pointer-events:none overlay */}
        <div
          onWheel={preventScroll}
          onTouchMove={preventScroll}
          className="relative w-full rounded-xl overflow-hidden bg-black"
          style={{ aspectRatio: '16/9' }}
        >
          <iframe
            src={embedUrl}
            title={video.title}
            className="absolute inset-0 w-full h-full"
            style={{ border: 'none', pointerEvents: 'none' }}
            allow="autoplay; encrypted-media"
            onLoad={() => setIframeLoaded(true)}
          />

          {/* Transparent overlay so the user cannot interact with the iframe */}
          <div className="absolute inset-0" style={{ background: 'transparent' }}></div>

          {/* Error overlay */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
              <i className="fas fa-triangle-exclamation text-[#F87171] text-[2rem] mb-3"></i>
              <div className="text-[0.78rem] text-white font-bold mb-1">Vidéo indisponible</div>
              <div className="text-[0.65rem] text-white/70 mb-4 leading-relaxed">{error}</div>
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl font-bold text-[0.8rem] cursor-pointer border-none"
                style={{ background: '#22C55E', color: '#FFFFFF' }}
              >
                <i className="fas fa-arrow-left mr-1"></i>Choisir une autre vidéo
              </button>
            </div>
          )}

          {/* Loading indicator */}
          {!iframeLoaded && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
              <div className="w-10 h-10 border-[3px] border-white/20 border-t-[#22C55E] rounded-full" style={{ animation: 'spin 0.8s linear infinite' }}></div>
              <div className="text-[0.7rem] text-white/70 mt-3">Chargement de la vidéo...</div>
            </div>
          )}

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div className="h-full transition-all" style={{ width: `${watchedPercent}%`, background: canClaim ? '#22C55E' : '#F59E0B' }}></div>
          </div>

          {/* Warning if not yet claimable */}
          {!error && watchedPercent < MIN_WATCH_PCT && (
            <div className="absolute top-2 left-2 right-2 text-center">
              <div className="inline-block px-2 py-1 rounded-full text-[0.55rem] font-bold text-white" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <i className="fas fa-lock mr-1"></i>Encore {remainingSec}s ({remainingPct}%) pour la récompense
              </div>
            </div>
          )}
        </div>

        {/* Progress text */}
        <div className="mt-2 flex items-center justify-between text-white/70 text-[0.65rem]">
          <span>Progression: {Math.floor(watchedPercent)}%</span>
          <span>Récompense: +${video.reward.toFixed(2)}</span>
        </div>

        {/* Error text (below player) */}
        {error && (
          <div className="mt-2 rounded-lg p-2 text-center text-[0.7rem] text-[#FCA5A5]" style={{ background: 'rgba(239,68,68,0.1)' }}>
            {error}
          </div>
        )}

        {claimed ? (
          /* ===== Claimed: show success with reward amount ===== */
          <div className="mt-3">
            {/* Success banner with reward */}
            <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <i className="fas fa-check-circle text-[#22C55E] text-[1.4rem] mb-1.5"></i>
              <div className="text-[0.88rem] font-black text-[#22C55E] mb-0.5">Vidéo regardée !</div>
              <div className="text-[1rem] font-black text-white">+{video.reward.toFixed(2)} $ crédité sur votre compte vidéo</div>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="w-full mt-3 py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #22C55E, #14B8A6)', color: '#FFFFFF' }}
            >
              <i className="fas fa-check mr-1.5"></i>Fermer
            </button>
          </div>
        ) : (
          <>
            {/* Claim button */}
            <button
              onClick={handleClaim}
              disabled={!canClaim || claiming || !!error}
              className="w-full mt-3 py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-40 transition-all active:scale-95"
              style={{ background: canClaim ? 'linear-gradient(135deg, #22C55E, #14B8A6)' : '#4B5563', color: '#FFFFFF' }}
            >
              {claiming ? 'Réclamation...' : canClaim ? `Réclamer $${video.reward.toFixed(2)}` : `Regardez encore ${remainingSec}s (${remainingPct}%)`}
            </button>

            {/* Always-available Quit button */}
            <button
              onClick={onClose}
              className="w-full mt-2 py-3 rounded-xl font-bold text-[0.8rem] cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.4)' }}
            >
              <i className="fas fa-times-circle text-[0.9rem]"></i>
              Quitter la vidéo
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ===== Video withdraw modal — uses shared PaymentDetails (same mechanism as principal account) =====
function VideoWithdrawModal({ videoBalance, onClose, onSuccess, addToast }: {
  videoBalance: number;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}) {
  const [amount, setAmount] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amt = parseFloat(amount) || 0;
  const amountValid = amt >= 1 && amt <= videoBalance;

  const handleSubmit = async (method: 'yas' | 'trx', userAddress: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authFetch('/api/videos/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, method, userAddress }),
      });
      const data = await res.json();
      if (data.success) {
        await onSuccess();
      } else {
        const msg = data.error || 'Échec du retrait. Veuillez réessayer.';
        setError(msg);
        addToast(msg, 'error');
      }
    } catch {
      const msg = 'Erreur de connexion. Veuillez réessayer.';
      setError(msg);
      addToast(msg, 'error');
    }
    setLoading(false);
  };

  return (
    <div
      className="fixed inset-0 z-[8500] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-t-2xl sm:rounded-2xl bg-[#F6F8F7] p-5 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[1rem] font-black text-[#1F2937]">Retrait du compte Vidéo</h3>
          <button onClick={onClose} className="text-[#6B7280] cursor-pointer w-8 h-8 flex items-center justify-center" aria-label="Fermer">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Available balance */}
        <div className="rounded-xl p-3 mb-3 text-center" style={{ background: '#F0FDFA', border: '1px solid #A7F3D0' }}>
          <div className="text-[0.6rem] text-[#0F766E] uppercase tracking-wide font-semibold">Solde vidéo disponible</div>
          <div className="text-[1.3rem] font-black text-[#0F766E]">{formatMoney(videoBalance)}</div>
        </div>

        {/* Amount input */}
        <div className="bg-[#FFFFFF] rounded-2xl p-4 mb-3 border border-[rgba(0,0,0,0.08)]">
          <label className="text-[0.7rem] font-semibold text-[#374151]">
            Montant à retirer (USD) <span className="text-[#0F766E] font-bold">— Minimum $1</span>
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            max={videoBalance}
            className="w-full mt-1.5 px-3 py-2.5 rounded-xl border-none text-[0.85rem] focus:outline-none focus:ring-2 focus:ring-[#14B8A6]/40"
            style={{ background: '#F3F4F6', color: '#1F2937' }}
          />
          {amount && !amountValid && (
            <p className="text-[0.65rem] text-[#EF4444] mt-1 flex items-center gap-1">
              <i className="fas fa-circle-exclamation"></i>
              {amt < 1 ? 'Le montant minimum est de $1.' : 'Montant supérieur à votre solde vidéo.'}
            </p>
          )}
        </div>

        {/* Inline error */}
        {error && (
          <div className="mb-3 rounded-xl p-2.5 text-[0.7rem] text-[#991B1B] leading-relaxed flex items-start gap-1.5" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
            <i className="fas fa-circle-exclamation mt-0.5 text-[0.8rem]"></i>
            <span>{error}</span>
          </div>
        )}

        {/* Payment details — same mechanism as principal account deposit/withdraw */}
        {amountValid ? (
          <PaymentDetails
            mode="withdraw"
            amountUsd={amt}
            initialMethod="trx"
            onConfirm={handleSubmit}
            onCancel={onClose}
            loading={loading}
            ctaText="Retirer"
          />
        ) : (
          <div className="text-center py-4 text-[0.75rem] text-[rgba(0,0,0,0.45)]">
            <i className="fas fa-info-circle mr-1"></i>
            Saisissez un montant valide ($1 minimum) pour continuer.
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Share modal with native share sheet =====
function ShareModal({ referralCode, addToast, onClose }: { referralCode: string; addToast: (msg: string, type: 'success' | 'error' | 'info') => void; onClose: () => void }) {
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : '';
  const shareText = `Rejoins Be Rich, la plateforme de communication pour les grandes entreprises ! Gagne de l'argent en regardant des vidéos. ${shareUrl}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Be Rich', text: shareText, url: shareUrl });
        onClose();
      } catch { /* user cancelled */ }
    } else {
      // Fallback: copy full share text to clipboard
      await copyLink(true);
    }
  };

  const copyLink = async (copyFullText = false) => {
    const textToCopy = copyFullText ? shareText : shareUrl;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Legacy fallback for non-secure contexts
        const ta = document.createElement('textarea');
        ta.value = textToCopy;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      addToast('Lien copié !', 'success');
    } catch {
      addToast('Impossible de copier le lien.', 'error');
    }
  };

  const shareApps = [
    { name: 'WhatsApp', icon: 'fab fa-whatsapp', color: '#25D366', url: `https://wa.me/?text=${encodeURIComponent(shareText)}` },
    { name: 'TikTok', icon: 'fab fa-tiktok', color: '#000000', url: `https://www.tiktok.com/` },
    { name: 'Instagram', icon: 'fab fa-instagram', color: '#E4405F', url: `https://www.instagram.com/` },
    { name: 'Facebook', icon: 'fab fa-facebook', color: '#1877F2', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
    { name: 'Telegram', icon: 'fab fa-telegram', color: '#0088CC', url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}` },
    { name: 'Messenger', icon: 'fab fa-facebook-messenger', color: '#0084FF', url: `https://m.me/` },
  ];

  return (
    <div className="fixed inset-0 z-[8500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-[380px] rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[1rem] font-black text-[#1F2937]">Invitez vos amis</h3>
          <button onClick={onClose} className="text-[#6B7280] cursor-pointer"><i className="fas fa-times"></i></button>
        </div>

        {/* Read-only invite link field + copy button */}
        <div className="rounded-xl p-3 mb-3" style={{ background: '#F0FDFA', border: '1px solid #A7F3D0' }}>
          <div className="text-[0.6rem] text-[#0F766E] mb-1.5">Votre lien de parrainage</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 text-[0.7rem] font-bold text-[#0F766E] bg-white/70 rounded-lg px-2 py-2 outline-none border border-[#A7F3D0] focus:border-[#14B8A6]"
            />
            <button
              onClick={() => copyLink(false)}
              className="shrink-0 px-3 py-2 rounded-lg font-bold text-[0.7rem] border-none cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              style={{ background: '#14B8A6', color: '#FFFFFF' }}
              aria-label="Copier le lien"
            >
              <i className="fas fa-copy mr-1"></i>Copier
            </button>
          </div>
        </div>

        {/* Native share button */}
        <button onClick={handleNativeShare} className="w-full py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer mb-4 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #14B8A6, #0F766E)', color: '#FFFFFF' }}>
          <i className="fas fa-share-nodes mr-1.5"></i>Partager
        </button>

        {/* App grid */}
        <div className="grid grid-cols-3 gap-3">
          {shareApps.map((app) => (
            <a
              key={app.name}
              href={app.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: app.color }}>
                <i className={`${app.icon} text-white text-[1.3rem]`}></i>
              </div>
              <span className="text-[0.6rem] font-semibold text-[#374151]">{app.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
