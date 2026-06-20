'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore, formatMoney, authFetch, refreshUser as globalRefreshUser } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';

interface VideoItem {
  id: string;
  title: string;
  category: string;
  durationMin: number;
  reward: number;
  watched: boolean;
  watchedAt: string | null;
}

export default function VideoPlatformScreen() {
  const { user, addToast } = useAppStore();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [watchedCount, setWatchedCount] = useState(0);
  const [remaining, setRemaining] = useState(5);
  const [totalEarnedToday, setTotalEarnedToday] = useState(0);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const [claiming, setClaiming] = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      const res = await authFetch('/api/videos/list');
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos || []);
        setWatchedCount(data.watchedCount || 0);
        setRemaining(data.remaining || 0);
        setTotalEarnedToday(data.totalEarnedToday || 0);
      }
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const refreshUser = async () => { await globalRefreshUser(); };

  const handleClaimReward = async (video: VideoItem) => {
    setClaiming(true);
    try {
      const res = await authFetch('/api/videos/reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id, watchedPercent: 100 }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`+$${data.reward.toFixed(2)} crédité !`, 'success');
        await refreshUser();
        await loadVideos();
        setActiveVideo(null);
      } else {
        addToast(data.error || 'Erreur', 'error');
      }
    } catch {
      addToast('Erreur de connexion', 'error');
    }
    setClaiming(false);
  };

  const categoryLabel: Record<string, string> = {
    fun: 'Divertissement',
    gaming: 'Gaming',
    tech: 'Technologie',
    arabic: 'Arabe',
  };
  const categoryColor: Record<string, string> = {
    fun: '#22C55E',
    gaming: '#8B5CF6',
    tech: '#3B82F6',
    arabic: '#F59E0B',
  };

  return (
    <>
      <Header title="Vidéos" />
      <div className="flex-1 overflow-y-auto" style={{ background: 'linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 100%)' }}>
        {/* Hero banner */}
        <div className="px-4 pt-4 pb-3">
          <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)', boxShadow: '0 8px 24px rgba(34,197,94,0.2)' }}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <i className="fas fa-video text-white text-[0.9rem]"></i>
                <span className="text-[0.7rem] font-bold text-white uppercase tracking-wide">Regagnez en regardant</span>
              </div>
              <h2 className="text-[1.15rem] font-black text-white leading-tight mb-1">5 vidéos par jour</h2>
              <p className="text-[0.7rem] text-white/80">Regardez au moins 50% pour gagner la récompense</p>
            </div>
            <i className="fas fa-film absolute -right-4 -bottom-4 text-[5rem] text-white/10"></i>
          </div>
        </div>

        {/* Stats row */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl p-2.5 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="text-[0.55rem] uppercase tracking-wide font-semibold" style={{ color: 'rgba(0,0,0,0.4)' }}>Restantes</div>
              <div className="text-[1rem] font-black" style={{ color: '#22C55E' }}>{remaining}/5</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="text-[0.55rem] uppercase tracking-wide font-semibold" style={{ color: 'rgba(0,0,0,0.4)' }}>Vues</div>
              <div className="text-[1rem] font-black" style={{ color: '#1F2937' }}>{watchedCount}</div>
            </div>
            <div className="rounded-xl p-2.5 text-center" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="text-[0.55rem] uppercase tracking-wide font-semibold" style={{ color: 'rgba(0,0,0,0.4)' }}>Gagné</div>
              <div className="text-[1rem] font-black" style={{ color: '#F59E0B' }}>${totalEarnedToday.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {/* Video list */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[0.88rem] font-bold" style={{ color: '#1F2937' }}>
              <i className="fas fa-play-circle mr-1" style={{ color: '#22C55E' }}></i>
              Vidéos du jour
            </h3>
            <span className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.4)' }}>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-[2.5px] border-[rgba(0,0,0,0.08)] border-t-[#22C55E] rounded-full mx-auto" style={{ animation: 'spin 0.7s linear infinite' }}></div>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-10">
              <i className="fas fa-video-slash text-[1.5rem] text-[rgba(0,0,0,0.15)] mb-2"></i>
              <p className="text-[0.85rem]" style={{ color: 'rgba(0,0,0,0.4)' }}>Aucune vidéo disponible</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {videos.map((v, idx) => {
                const color = categoryColor[v.category] || '#22C55E';
                return (
                  <div key={`${v.id}-${idx}`} className="rounded-xl overflow-hidden" style={{ background: '#FFFFFF', border: `1px solid ${v.watched ? 'rgba(34,197,94,0.2)' : 'rgba(0,0,0,0.08)'}` }}>
                    <button
                      onClick={() => !v.watched && setActiveVideo(v)}
                      disabled={v.watched}
                      className="w-full text-left p-3 flex items-center gap-3 border-none cursor-pointer transition-all"
                      style={{ background: v.watched ? 'rgba(34,197,94,0.04)' : 'transparent' }}
                    >
                      {/* Thumbnail placeholder */}
                      <div className="w-20 h-14 rounded-lg shrink-0 relative overflow-hidden flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}30, ${color}10)` }}>
                        <i className="fab fa-youtube text-[1.4rem]" style={{ color: '#EF4444' }}></i>
                        <span className="absolute bottom-0.5 right-0.5 text-[0.5rem] font-bold px-1 rounded text-white" style={{ background: 'rgba(0,0,0,0.7)' }}>{v.durationMin}min</span>
                        {v.watched && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.85)' }}>
                            <i className="fas fa-check text-white text-[0.9rem]"></i>
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[0.55rem] font-bold px-1.5 py-0.5 rounded" style={{ background: `${color}15`, color }}>
                            {categoryLabel[v.category] || v.category}
                          </span>
                        </div>
                        <div className="text-[0.8rem] font-bold leading-tight mb-1 truncate" style={{ color: v.watched ? 'rgba(0,0,0,0.4)' : '#1F2937' }}>
                          {v.title}
                        </div>
                        <div className="flex items-center gap-2 text-[0.62rem]" style={{ color: v.watched ? '#22C55E' : 'rgba(0,0,0,0.45)' }}>
                          <span className="font-bold">
                            {v.watched ? (
                              <><i className="fas fa-check-circle mr-0.5"></i>Regardée</>
                            ) : (
                              <><i className="fas fa-gift mr-0.5"></i>+${v.reward.toFixed(2)}</>
                            )}
                          </span>
                        </div>
                      </div>

                      {!v.watched && (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: '#22C55E' }}>
                          <i className="fas fa-play text-white text-[0.7rem] ml-0.5"></i>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info card */}
          <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle text-[#22C55E] text-[0.8rem] mt-0.5"></i>
              <div>
                <div className="text-[0.72rem] font-bold mb-0.5" style={{ color: '#1F2937' }}>Comment ça marche ?</div>
                <div className="text-[0.65rem] leading-relaxed" style={{ color: 'rgba(0,0,0,0.55)' }}>
                  • Regardez au moins 50% de chaque vidéo<br/>
                  • Recevez la récompense automatiquement<br/>
                  • 5 vidéos disponibles par jour<br/>
                  • Les gains vont sur votre solde principal
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
          onClaim={() => handleClaimReward(activeVideo)}
          claiming={claiming}
        />
      )}
    </>
  );
}

// ==================== VIDEO PLAYER MODAL ====================
function VideoPlayerModal({ video, onClose, onClaim, claiming }: {
  video: VideoItem;
  onClose: () => void;
  onClaim: () => void;
  claiming: boolean;
}) {
  const [watchedPercent, setWatchedPercent] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const playerRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load YouTube IFrame API
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const initPlayer = () => {
      if (!(window as any).YT || !(window as any).YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }
      playerRef.current = new (window as any).YT.Player('yt-player', {
        videoId: video.id,
        events: {
          onReady: () => {
            setPlayerReady(true);
            const d = playerRef.current.getDuration();
            setDuration(d);
          },
          onStateChange: (e: any) => {
            // Track when video ends
            if (e.data === 0) { // 0 = ended
              setWatchedPercent(100);
              setCanClaim(true);
            }
          },
        },
      });
    };

    const timer = setTimeout(initPlayer, 500);

    // Poll for progress
    intervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        try {
          const cur = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (dur > 0) {
            const pct = Math.min(100, (cur / dur) * 100);
            setWatchedPercent(pct);
            setElapsed(cur);
            if (pct >= 50) setCanClaim(true);
          }
        } catch { /* */ }
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playerRef.current && playerRef.current.destroy) {
        try { playerRef.current.destroy(); } catch { /* */ }
      }
    };
  }, [video.id]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[7000] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div className="w-full max-w-[420px]" style={{ animation: 'modalIn 0.25s ease-out' }} onClick={(e) => e.stopPropagation()}>
        {/* Player */}
        <div className="relative bg-black aspect-video rounded-t-2xl overflow-hidden">
          <div id="yt-player" className="w-full h-full"></div>
          {!playerReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="w-8 h-8 border-[2.5px] border-white/20 border-t-white rounded-full" style={{ animation: 'spin 0.7s linear infinite' }}></div>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center z-10"
            style={{ background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer' }}
          >
            <i className="fas fa-times text-[0.8rem]"></i>
          </button>
        </div>

        {/* Info & controls */}
        <div className="rounded-b-2xl p-4" style={{ background: '#FFFFFF' }}>
          <h3 className="text-[0.9rem] font-bold mb-1" style={{ color: '#1F2937' }}>{video.title}</h3>

          {/* Progress bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.62rem] font-semibold" style={{ color: 'rgba(0,0,0,0.5)' }}>
                Progression: {Math.round(watchedPercent)}%
              </span>
              <span className="text-[0.62rem] font-mono" style={{ color: 'rgba(0,0,0,0.4)' }}>
                {fmtTime(elapsed)} / {fmtTime(duration)}
              </span>
            </div>
            <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.08)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${watchedPercent}%`,
                  background: watchedPercent >= 50 ? 'linear-gradient(90deg, #22C55E, #14B8A6)' : 'linear-gradient(90deg, #F59E0B, #EF4444)',
                }}
              ></div>
            </div>
            <div className="mt-1.5 text-[0.58rem] flex items-center gap-1" style={{ color: canClaim ? '#22C55E' : 'rgba(0,0,0,0.4)' }}>
              {canClaim ? (
                <><i className="fas fa-check-circle"></i>Vous pouvez réclamer votre récompense !</>
              ) : (
                <><i className="fas fa-clock"></i>Regardez au moins 50% pour réclamer ({50 - Math.round(watchedPercent)}% restant)</>
              )}
            </div>
          </div>

          {/* Reward & claim button */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 rounded-xl p-2.5 text-center" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <div className="text-[0.55rem] uppercase tracking-wide font-semibold" style={{ color: 'rgba(0,0,0,0.4)' }}>Récompense</div>
              <div className="text-[1rem] font-black" style={{ color: '#F59E0B' }}>${video.reward.toFixed(2)}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-colors"
              style={{ background: 'rgba(0,0,0,0.05)', border: '1.5px solid rgba(0,0,0,0.1)', color: 'rgba(0,0,0,0.55)' }}
            >
              Fermer
            </button>
            <button
              onClick={onClaim}
              disabled={!canClaim || claiming}
              className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer disabled:opacity-40 transition-all active:scale-[0.97]"
              style={{
                background: canClaim ? '#22C55E' : 'rgba(0,0,0,0.1)',
                color: canClaim ? '#FFFFFF' : 'rgba(0,0,0,0.4)',
                boxShadow: canClaim ? '0 4px 16px rgba(34,197,94,0.3)' : 'none',
              }}
            >
              {claiming ? '...' : canClaim ? `Réclamer $${video.reward.toFixed(2)}` : 'Regardez encore...'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
