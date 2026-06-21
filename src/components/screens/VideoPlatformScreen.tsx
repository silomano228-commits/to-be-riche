'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, formatMoney, authFetch, refreshUser as globalRefreshUser } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';
import { CongratulationsModal, type CongratulationsData } from '@/components/CongratulationsModal';

interface VideoItem {
  id: string;
  title: string;
  category: 'chinois' | 'japonais' | 'indien';
  sponsor: string;
  durationMin: number;
  reward: number;
  watched: boolean;
  watchedAt?: string | null;
}

const CATEGORY_LABEL: Record<string, string> = {
  chinois: 'Entreprise Chinoise',
  japonais: 'Entreprise Japonaise',
  indien: 'Entreprise Indienne',
};

const CATEGORY_COLOR: Record<string, string> = {
  chinois: '#DC2626',
  japonais: '#BC002D',
  indien: '#FF9933',
};

const CATEGORY_FLAG: Record<string, string> = {
  chinois: '🇨🇳',
  japonais: '🇯🇵',
  indien: '🇮🇳',
};

export default function VideoPlatformScreen() {
  const { user, addToast } = useAppStore();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchedCount, setWatchedCount] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  const [videoBalance, setVideoBalance] = useState(0);
  const [videoDepositRequired, setVideoDepositRequired] = useState(false);
  const [daysWatching, setDaysWatching] = useState(0);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [congratsData, setCongratsData] = useState<CongratulationsData>({ show: false, type: 'video' });
  const [showDepositModal, setShowDepositModal] = useState(false);
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

  return (
    <>
      <Header title="Vidéos d'entreprises" />
      <div className="flex-1 overflow-y-auto pb-6 bg-[#F8F9FA]">
        {/* Concept info banner */}
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDFA)', border: '1px solid #A7F3D0' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
                <i className="fas fa-bullhorn text-white text-[1rem]"></i>
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

        {/* Share invite banner */}
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

        {/* Video account balance */}
        <div className="px-4 pt-3">
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #0F766E, #14B8A6)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-[0.6rem] uppercase tracking-widest font-bold text-white/70">Compte Vidéo</div>
                <div className="text-[1.5rem] font-black text-white">{formatMoney(videoBalance)}</div>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <i className="fas fa-video text-white text-[1.2rem]"></i>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowDepositModal(true)} className="py-2 rounded-xl font-bold text-[0.72rem] cursor-pointer transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.95)', color: '#0F766E' }}>
                <i className="fas fa-arrow-down mr-1"></i>Déposer
              </button>
              <button onClick={() => setShowWithdrawModal(true)} className="py-2 rounded-xl font-bold text-[0.72rem] cursor-pointer transition-all active:scale-95" style={{ background: 'rgba(255,255,255,0.2)', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.3)' }}>
                <i className="fas fa-arrow-up mr-1"></i>Retirer
              </button>
            </div>
          </div>
        </div>

        {/* 3-day deposit warning */}
        {videoDepositRequired && (
          <div className="px-4 pt-3">
            <div className="rounded-2xl p-3 flex items-start gap-2" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <i className="fas fa-exclamation-triangle text-[#DC2626] text-[0.85rem] mt-0.5"></i>
              <div>
                <div className="text-[0.75rem] font-bold text-[#991B1B]">Dépôt requis</div>
                <div className="text-[0.65rem] text-[#B91C1C] leading-relaxed">
                  Vous avez regardé des vidéos pendant 3 jours. Pour continuer, effectuez un dépôt sur votre compte vidéo (min. $5).
                </div>
                <button onClick={() => setShowDepositModal(true)} className="mt-1.5 text-[0.7rem] font-bold text-[#DC2626] underline">Déposer maintenant</button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
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

        {/* Daily videos header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-[0.9rem] font-black text-[#1F2937]">
            <i className="fas fa-play-circle mr-1.5 text-[#14B8A6]"></i>Vidéos du jour
          </h3>
          <span className="text-[0.65rem] text-[#6B7280]">{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
        </div>

        {/* Video list */}
        <div className="px-4 space-y-2">
          {videos.map((v) => (
            <button
              key={v.id}
              onClick={() => !v.watched && !videoDepositRequired && setActiveVideo(v)}
              disabled={v.watched || videoDepositRequired}
              className="w-full rounded-2xl p-3 flex items-center gap-3 text-left cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 relative overflow-hidden" style={{ background: CATEGORY_COLOR[v.category] }}>
                <i className="fas fa-play text-white text-[1.2rem]"></i>
                <div className="absolute bottom-1 right-1 text-[0.5rem] font-bold text-white px-1 rounded" style={{ background: 'rgba(0,0,0,0.6)' }}>{v.durationMin}min</div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                  <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: CATEGORY_COLOR[v.category] }}>
                    {CATEGORY_FLAG[v.category]} {CATEGORY_LABEL[v.category]}
                  </span>
                </div>
                <div className="text-[0.8rem] font-bold text-[#1F2937] truncate">{v.title}</div>
                <div className="text-[0.6rem] text-[#6B7280] flex items-center gap-1">
                  <i className="fas fa-bullhorn text-[0.5rem]" style={{ color: CATEGORY_COLOR[v.category] }}></i>
                  Sponsorisé par {v.sponsor}
                </div>
              </div>

              {/* Reward / status */}
              <div className="flex-shrink-0 text-right">
                {v.watched ? (
                  <div className="flex items-center gap-1 text-[#22C55E]">
                    <i className="fas fa-check-circle text-[0.85rem]"></i>
                    <span className="text-[0.65rem] font-bold">Regardée</span>
                  </div>
                ) : (
                  <div className="text-[0.85rem] font-black text-[#22C55E]">+${v.reward.toFixed(2)}</div>
                )}
              </div>
            </button>
          ))}
        </div>

        {videos.length === 0 && (
          <div className="px-4 pt-8 text-center">
            <i className="fas fa-video text-[#D1D5DB] text-[2rem] mb-2"></i>
            <div className="text-[0.8rem] text-[#6B7280]">Aucune vidéo disponible aujourd'hui</div>
          </div>
        )}
      </div>

      {/* Video player modal with NO seeking/scrolling — Quit button always available */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onReward={async (reward) => {
            // Show reward + today's cumulative earnings in the congratulations modal
            const newTodayTotal = totalEarnedToday + reward;
            setCongratsData({
              show: true,
              type: 'video',
              amount: reward,
              title: 'Vidéo regardée !',
              message: `+$${reward.toFixed(2)} crédités sur votre compte vidéo. Total gagné aujourd'hui : $${newTodayTotal.toFixed(2)}.`,
              onClose: () => setCongratsData({ show: false, type: 'video' }),
            });
            await globalRefreshUser();
            await loadStatus();
            setActiveVideo(null);
          }}
        />
      )}

      {/* Deposit modal */}
      {showDepositModal && (
        <VideoDepositModal
          onClose={() => setShowDepositModal(false)}
          onSuccess={async () => {
            await loadStatus();
            setShowDepositModal(false);
            addToast('Demande de dépôt prise en compte. Les fonds seront disponibles dans les 6 heures.', 'success');
          }}
        />
      )}

      {/* Withdraw modal */}
      {showWithdrawModal && (
        <VideoWithdrawModal
          videoBalance={videoBalance}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={async () => {
            await loadStatus();
            setShowWithdrawModal(false);
            addToast('Demande de retrait prise en compte. Les fonds seront disponibles dans les 6 heures.', 'success');
          }}
        />
      )}

      {/* Share modal */}
      {showShareModal && (
        <ShareModal referralCode={user?.referralCode || ''} onClose={() => setShowShareModal(false)} />
      )}

      <CongratulationsModal data={congratsData} />
    </>
  );
}

// ===== Video player modal with NO seeking/scrolling =====
function VideoPlayerModal({ video, onClose, onReward }: {
  video: VideoItem;
  onClose: () => void;
  onReward: (reward: number) => Promise<void>;
}) {
  const playerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [watchedPercent, setWatchedPercent] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastTimeRef = useRef(0);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const initPlayer = () => {
      const YT = (window as any).YT;
      if (!YT || !YT.Player) {
        setTimeout(initPlayer, 300);
        return;
      }
      playerRef.current = new YT.Player('yt-player', {
        videoId: video.id,
        playerVars: {
          autoplay: 1,
          controls: 0,        // NO controls
          disablekb: 1,       // NO keyboard
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          fs: 0,              // NO fullscreen
          iv_load_policy: 3,  // NO annotations
          nocookie: 1,
        },
        events: {
          onReady: (e: any) => e.target.playVideo(),
          onStateChange: (e: any) => {
            // If user pauses, resume automatically
            if (e.data === 2) {
              setTimeout(() => playerRef.current?.playVideo(), 100);
            }
          },
        },
      });
    };

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const current = playerRef.current.getCurrentTime();
          const duration = playerRef.current.getDuration();

          // Anti-seeking: if time jumped forward abnormally, reset
          if (current > lastTimeRef.current + 2) {
            playerRef.current.seekTo(lastTimeRef.current, true);
            return;
          }
          lastTimeRef.current = current;

          if (duration > 0) {
            const pct = (current / duration) * 100;
            setWatchedPercent(pct);
            if (pct >= 50) setCanClaim(true);
          }
        } catch { /* ignore */ }
      }
    }, 1000);

    // Wait for YT API
    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      clearInterval(interval);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [video.id]);

  // Prevent scroll on the container
  const preventScroll = (e: React.WheelEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  const handleClaim = async () => {
    setClaiming(true);
    setError(null);
    try {
      const res = await authFetch('/api/videos/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, watchedPercent }),
      });
      const data = await res.json();
      if (data.success) {
        await onReward(video.reward);
      } else {
        setError(data.error || 'Erreur');
      }
    } catch {
      setError('Erreur de connexion');
    }
    setClaiming(false);
  };

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)' }}>
      <div className="w-full max-w-[420px]">
        {/* Header — Quit (X) button ALWAYS visible (top-right, 44px touch target) */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0" style={{ background: CATEGORY_COLOR[video.category] }}>
              {CATEGORY_FLAG[video.category]} {CATEGORY_LABEL[video.category]}
            </span>
            <span className="text-[0.6rem] text-white/60 truncate">Sponsorisé par {video.sponsor}</span>
          </div>
          {/* Always-visible Quit button — anyone can quit at any moment */}
          <button
            onClick={onClose}
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

        {/* Player container - NO scroll/seek allowed */}
        <div
          ref={containerRef}
          onWheel={preventScroll}
          onTouchMove={preventScroll}
          className="relative w-full rounded-xl overflow-hidden bg-black"
          style={{ aspectRatio: '16/9' }}
        >
          <div id="yt-player" className="w-full h-full" style={{ pointerEvents: 'none' }}></div>

          {/* Transparent overlay that CAPTURES all pointer events so the user
              cannot click the YouTube iframe to seek/pause/interact. */}
          <div className="absolute inset-0" style={{ background: 'transparent' }}></div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
            <div className="h-full transition-all" style={{ width: `${watchedPercent}%`, background: canClaim ? '#22C55E' : '#F59E0B' }}></div>
          </div>

          {/* Warning if trying to scroll */}
          {watchedPercent < 50 && (
            <div className="absolute top-2 left-2 right-2 text-center">
              <div className="inline-block px-2 py-1 rounded-full text-[0.55rem] font-bold text-white" style={{ background: 'rgba(0,0,0,0.7)' }}>
                <i className="fas fa-lock mr-1"></i>Regardez {Math.ceil(50 - watchedPercent)}% pour la récompense
              </div>
            </div>
          )}
        </div>

        {/* Progress text */}
        <div className="mt-2 flex items-center justify-between text-white/70 text-[0.65rem]">
          <span>Progression: {Math.floor(watchedPercent)}%</span>
          <span>Récompense: +${video.reward.toFixed(2)}</span>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-2 rounded-lg p-2 text-center text-[0.7rem] text-[#FCA5A5]" style={{ background: 'rgba(239,68,68,0.1)' }}>
            {error}
          </div>
        )}

        {/* Claim button */}
        <button
          onClick={handleClaim}
          disabled={!canClaim || claiming}
          className="w-full mt-3 py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-40 transition-all active:scale-95"
          style={{ background: canClaim ? 'linear-gradient(135deg, #22C55E, #14B8A6)' : '#4B5563', color: '#FFFFFF' }}
        >
          {claiming ? 'Réclamation...' : canClaim ? `Réclamer $${video.reward.toFixed(2)}` : `Regardez ${Math.ceil(50 - watchedPercent)}% de plus`}
        </button>

        {/* Always-available Quit button — visible at ANY moment during playback.
            The user explicitly requested that everyone can quit the video at any time. */}
        <button
          onClick={onClose}
          className="w-full mt-2 py-3 rounded-xl font-bold text-[0.8rem] cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
          style={{ background: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.4)' }}
        >
          <i className="fas fa-times-circle text-[0.9rem]"></i>
          Quitter la vidéo
        </button>
      </div>
    </div>
  );
}

// ===== Video deposit modal =====
function VideoDepositModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => Promise<void> }) {
  const [method, setMethod] = useState<'yas' | 'trx'>('trx');
  const [amount, setAmount] = useState('5');
  const [userAddress, setUserAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return;
    if (!userAddress) return;
    setLoading(true);
    try {
      const res = await authFetch('/api/videos/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, method, userAddress }),
      });
      const data = await res.json();
      if (data.success) {
        await onSuccess();
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[8500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-[380px] rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[1rem] font-black text-[#1F2937]">Dépôt sur compte Vidéo</h3>
          <button onClick={onClose} className="text-[#6B7280] cursor-pointer"><i className="fas fa-times"></i></button>
        </div>

        {/* Method selection */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setMethod('trx')} className="py-2.5 rounded-xl font-bold text-[0.78rem] cursor-pointer transition-all" style={{ background: method === 'trx' ? '#14B8A6' : '#F3F4F6', color: method === 'trx' ? '#FFFFFF' : '#6B7280' }}>TRX</button>
          <button onClick={() => setMethod('yas')} className="py-2.5 rounded-xl font-bold text-[0.78rem] cursor-pointer transition-all" style={{ background: method === 'yas' ? '#14B8A6' : '#F3F4F6', color: method === 'yas' ? '#FFFFFF' : '#6B7280' }}>YAS</button>
        </div>

        <div className="mb-2">
          <label className="text-[0.7rem] font-semibold text-[#374151]">Montant (USD) - min $5</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="5" className="w-full mt-1 px-3 py-2.5 rounded-xl border-none text-[0.85rem]" style={{ background: '#F3F4F6', color: '#1F2937' }} />
        </div>

        <div className="mb-3">
          <label className="text-[0.7rem] font-semibold text-[#374151]">{method === 'trx' ? 'Adresse TRX' : 'Compte YAS'}</label>
          <input type="text" value={userAddress} onChange={(e) => setUserAddress(e.target.value)} placeholder={method === 'trx' ? 'Votre adresse TRX' : 'Votre compte YAS'} className="w-full mt-1 px-3 py-2.5 rounded-xl border-none text-[0.85rem]" style={{ background: '#F3F4F6', color: '#1F2937' }} />
        </div>

        <button onClick={handleSubmit} disabled={loading || !userAddress || parseFloat(amount) < 5} className="w-full py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #14B8A6, #0F766E)', color: '#FFFFFF' }}>
          {loading ? 'Traitement...' : 'Déposer'}
        </button>

        <div className="mt-3 rounded-xl p-2.5 text-center" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <div className="text-[0.65rem] text-[#065F46]"><i className="fas fa-clock mr-1"></i>Les fonds seront disponibles dans les 6 heures.</div>
        </div>
      </div>
    </div>
  );
}

// ===== Video withdraw modal =====
function VideoWithdrawModal({ videoBalance, onClose, onSuccess }: { videoBalance: number; onClose: () => void; onSuccess: () => Promise<void> }) {
  const [method, setMethod] = useState<'yas' | 'trx'>('trx');
  const [amount, setAmount] = useState('5');
  const [userAddress, setUserAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 5) return;
    if (!userAddress) return;
    if (amt > videoBalance) return;
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
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[8500] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }} onClick={onClose}>
      <div className="w-full max-w-[380px] rounded-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[1rem] font-black text-[#1F2937]">Retrait du compte Vidéo</h3>
          <button onClick={onClose} className="text-[#6B7280] cursor-pointer"><i className="fas fa-times"></i></button>
        </div>

        <div className="rounded-xl p-2.5 mb-3 text-center" style={{ background: '#F0FDFA', border: '1px solid #A7F3D0' }}>
          <div className="text-[0.6rem] text-[#0F766E]">Solde vidéo disponible</div>
          <div className="text-[1.2rem] font-black text-[#0F766E]">{formatMoney(videoBalance)}</div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setMethod('trx')} className="py-2.5 rounded-xl font-bold text-[0.78rem] cursor-pointer transition-all" style={{ background: method === 'trx' ? '#14B8A6' : '#F3F4F6', color: method === 'trx' ? '#FFFFFF' : '#6B7280' }}>TRX</button>
          <button onClick={() => setMethod('yas')} className="py-2.5 rounded-xl font-bold text-[0.78rem] cursor-pointer transition-all" style={{ background: method === 'yas' ? '#14B8A6' : '#F3F4F6', color: method === 'yas' ? '#FFFFFF' : '#6B7280' }}>YAS</button>
        </div>

        <div className="mb-2">
          <label className="text-[0.7rem] font-semibold text-[#374151]">Montant (USD) - min $5</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="5" max={videoBalance} className="w-full mt-1 px-3 py-2.5 rounded-xl border-none text-[0.85rem]" style={{ background: '#F3F4F6', color: '#1F2937' }} />
        </div>

        <div className="mb-3">
          <label className="text-[0.7rem] font-semibold text-[#374151]">{method === 'trx' ? 'Adresse TRX' : 'Compte YAS'}</label>
          <input type="text" value={userAddress} onChange={(e) => setUserAddress(e.target.value)} placeholder={method === 'trx' ? 'Votre adresse TRX' : 'Votre compte YAS'} className="w-full mt-1 px-3 py-2.5 rounded-xl border-none text-[0.85rem]" style={{ background: '#F3F4F6', color: '#1F2937' }} />
        </div>

        <button onClick={handleSubmit} disabled={loading || !userAddress || parseFloat(amount) < 5 || parseFloat(amount) > videoBalance} className="w-full py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #14B8A6, #0F766E)', color: '#FFFFFF' }}>
          {loading ? 'Traitement...' : 'Retirer'}
        </button>

        <div className="mt-3 rounded-xl p-2.5 text-center" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <div className="text-[0.65rem] text-[#065F46]"><i className="fas fa-clock mr-1"></i>Les fonds seront disponibles dans les 6 heures.</div>
        </div>
      </div>
    </div>
  );
}

// ===== Share modal with native share sheet =====
function ShareModal({ referralCode, onClose }: { referralCode: string; onClose: () => void }) {
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${referralCode}` : '';
  const shareText = `Rejoins Be Rich, la plateforme de communication pour les grandes entreprises ! Gagne de l'argent en regardant des vidéos. ${shareUrl}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Be Rich', text: shareText, url: shareUrl });
        onClose();
      } catch { /* user cancelled */ }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Lien copié dans le presse-papiers !');
      } catch { /* ignore */ }
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
          <h3 className="text-[1rem] font-black text-[#1F2937]">Partager Be Rich</h3>
          <button onClick={onClose} className="text-[#6B7280] cursor-pointer"><i className="fas fa-times"></i></button>
        </div>

        <div className="rounded-xl p-3 mb-4" style={{ background: '#F0FDFA', border: '1px solid #A7F3D0' }}>
          <div className="text-[0.6rem] text-[#0F766E] mb-1">Votre lien de parrainage</div>
          <div className="text-[0.7rem] font-bold text-[#0F766E] break-all">{shareUrl}</div>
        </div>

        {/* Native share button */}
        <button onClick={handleNativeShare} className="w-full py-3 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer mb-4 transition-all active:scale-95" style={{ background: 'linear-gradient(135deg, #14B8A6, #0F766E)', color: '#FFFFFF' }}>
          <i className="fas fa-share-nodes mr-1.5"></i>Partager via...
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
