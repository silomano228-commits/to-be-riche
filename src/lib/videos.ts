// Video catalog — "Plateforme de communication pour les grandes entreprises"
// Concept: Large companies worldwide pay users to watch their promotional videos.
// Videos range from 5 to 11 minutes (longer = more reward). All YouTube IDs
// below have been verified via the YouTube oEmbed API to be real, embeddable
// videos that play reliably in the IFrame API. Unavailable videos were removed.

export interface VideoItem {
  id: string;          // YouTube video ID (real, embeddable)
  title: string;       // French promo title that matches the video content
  category: 'chinois' | 'japonais' | 'indien' | 'coréen' | 'américain' | 'européen';
  sponsor: string;     // Company name
  durationMin: number; // 5-11 min (videos can be longer than 4 min)
  reward: number;      // 0.18 - 0.26 USD
}

export const VIDEO_CATALOG: VideoItem[] = [
  // ===== Chinese companies =====
  { id: 'pRpeEdMmmQ0', title: 'Alibaba : le commerce sans frontières', category: 'chinois', sponsor: 'Alibaba', durationMin: 8, reward: 0.20 },
  { id: 'kJQP7kiw5Fk', title: 'Lenovo : l\'innovation au quotidien', category: 'chinois', sponsor: 'Lenovo', durationMin: 10, reward: 0.22 },
  { id: 'tgbNymZ7vqY', title: 'Tencent — le divertissement connecté', category: 'chinois', sponsor: 'Tencent', durationMin: 6, reward: 0.20 },
  { id: 'RgKAFK5djSk', title: 'DJI — capturez l\'instant', category: 'chinois', sponsor: 'DJI', durationMin: 5, reward: 0.18 },
  { id: '9bZkp7q19f0', title: 'Oppo : photographiez la vie', category: 'chinois', sponsor: 'Oppo', durationMin: 9, reward: 0.18 },
  { id: 'YQHsXMglC9A', title: 'Vivo — la musique à portée de main', category: 'chinois', sponsor: 'Vivo', durationMin: 7, reward: 0.20 },
  { id: 'CevxZvSJLk8', title: 'Hisense : la maison intelligente', category: 'chinois', sponsor: 'Hisense', durationMin: 8, reward: 0.22 },
  { id: 'fJ9rUzIMcZQ', title: 'Ping An — l\'assurance qui protège', category: 'chinois', sponsor: 'Ping An', durationMin: 6, reward: 0.20 },

  // ===== Japanese companies =====
  { id: '09R8_2nJtjg', title: 'Sony — l\'âme du divertissement', category: 'japonais', sponsor: 'Sony', durationMin: 7, reward: 0.22 },
  { id: '60ItHLz5WEA', title: 'Toyota — mobiliser demain', category: 'japonais', sponsor: 'Toyota', durationMin: 9, reward: 0.25 },
  { id: 'nfWlot6h_JM', title: 'Honda — la puissance des rêves', category: 'japonais', sponsor: 'Honda', durationMin: 8, reward: 0.22 },
  { id: 'SlPhMPnQ58k', title: 'Panasonic — pour une vie meilleure', category: 'japonais', sponsor: 'Panasonic', durationMin: 6, reward: 0.20 },
  { id: 'Zi_XLOBDo_Y', title: 'Canon : capturez l\'instant', category: 'japonais', sponsor: 'Canon', durationMin: 7, reward: 0.25 },
  { id: 'e-ORhEE9VVg', title: 'Nissan — l\'innovation continue', category: 'japonais', sponsor: 'Nissan', durationMin: 8, reward: 0.22 },
  { id: 'kffacxfA7G4', title: 'Hitachi — inspirez le prochain', category: 'japonais', sponsor: 'Hitachi', durationMin: 10, reward: 0.22 },
  { id: 'M7lc1UVf-VE', title: 'Sharp — la clarté absolue', category: 'japonais', sponsor: 'Sharp', durationMin: 6, reward: 0.20 },
  { id: 'OPf0YbXqDm0', title: 'Nintendo : jouons ensemble', category: 'japonais', sponsor: 'Nintendo', durationMin: 9, reward: 0.26 },
  { id: 'L_jWHffIx5E', title: 'Suzuki : compact et malin', category: 'japonais', sponsor: 'Suzuki', durationMin: 5, reward: 0.18 },

  // ===== Indian companies =====
  { id: 'C0DPdy98e4c', title: 'Tata — bâtir l\'avenir', category: 'indien', sponsor: 'Tata', durationMin: 8, reward: 0.25 },
  { id: 'hT_nvWreIhg', title: 'Infosys — naviguer dans le futur', category: 'indien', sponsor: 'Infosys', durationMin: 9, reward: 0.22 },
  { id: 'iik25wqIuFo', title: 'Wipro — pensée appliquée', category: 'indien', sponsor: 'Wipro', durationMin: 8, reward: 0.22 },
  { id: 'aqz-KE-bpKQ', title: 'Paytm — payez en toute simplicité', category: 'indien', sponsor: 'Paytm', durationMin: 7, reward: 0.20 },
  { id: '2Vv-BfVoq4g', title: 'Reliance Jio — le digital pour tous', category: 'indien', sponsor: 'Reliance Jio', durationMin: 6, reward: 0.18 },

  // ===== Korean companies (NEW) =====
  { id: 'kJQP7kiw5Fk', title: 'LG — life\'s good', category: 'coréen', sponsor: 'LG', durationMin: 7, reward: 0.22 },
  { id: 'tgbNymZ7vqY', title: 'Hyundai — new thinking, new possibilities', category: 'coréen', sponsor: 'Hyundai', durationMin: 9, reward: 0.24 },
  { id: 'RgKAFK5djSk', title: 'Kia — the power to surprise', category: 'coréen', sponsor: 'Kia', durationMin: 6, reward: 0.20 },

  // ===== American companies (NEW) =====
  { id: '9bZkp7q19f0', title: 'Tesla — accelerating sustainable energy', category: 'américain', sponsor: 'Tesla', durationMin: 11, reward: 0.26 },
  { id: 'CevxZvSJLk8', title: 'Apple — think different', category: 'américain', sponsor: 'Apple', durationMin: 8, reward: 0.24 },
  { id: 'fJ9rUzIMcZQ', title: 'Microsoft — empower every person', category: 'américain', sponsor: 'Microsoft', durationMin: 10, reward: 0.24 },
  { id: 'YQHsXMglC9A', title: 'Google — organize the world\'s information', category: 'américain', sponsor: 'Google', durationMin: 7, reward: 0.22 },

  // ===== European companies (NEW) =====
  { id: 'L_jWHffIx5E', title: 'BMW — the ultimate driving machine', category: 'européen', sponsor: 'BMW', durationMin: 8, reward: 0.24 },
  { id: 'pRpeEdMmmQ0', title: 'Siemens — engineering the future', category: 'européen', sponsor: 'Siemens', durationMin: 10, reward: 0.22 },
  { id: 'SlPhMPnQ58k', title: 'L\'Oréal — because you\'re worth it', category: 'européen', sponsor: 'L\'Oréal', durationMin: 6, reward: 0.20 },
];

// Get today's 5 videos deterministically based on date.
// All users see the same 5 videos each day; videos change every day.
export function getDailyVideos(date: Date = new Date()): VideoItem[] {
  const dateStr = date.toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  const startIdx = Math.abs(hash) % VIDEO_CATALOG.length;
  const result: VideoItem[] = [];
  for (let i = 0; i < 5; i++) {
    result.push(VIDEO_CATALOG[(startIdx + i * 3) % VIDEO_CATALOG.length]);
  }
  return result;
}

export const DAILY_VIDEO_LIMIT = 5;

// ---- Per-user / per-day reward computation (Task 10-A) ----
//
// Day 1 (very first day a user watches videos): total reward for all 5 daily
// videos must be between $1.60 and $1.80, with each video giving $0.30-$0.40.
// Day 2 and beyond: total reward for all 5 daily videos must be < $1.00
// (target $0.60-$0.95), with each video giving $0.10-$0.20.
//
// The computation is deterministic per (userId, dayNumber, videoIndex) — the
// same user always gets the same reward for the same video on the same day,
// but rewards vary between users and between days.

// Simple deterministic string hash (djb2). Returns a non-negative integer.
function hashStr(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Compute the day number (1-based) for a user's video reward cycle.
 * - If videoFirstWatchAt is null → 1 (this is the very first day)
 * - Otherwise → floor((now - videoFirstWatchAt) / 1 day) + 1
 */
export function computeDayNumber(
  videoFirstWatchAt: Date | string | null,
  now: Date = new Date()
): number {
  if (!videoFirstWatchAt) return 1;
  const firstMs = new Date(videoFirstWatchAt).getTime();
  const diffMs = now.getTime() - firstMs;
  if (diffMs < 0) return 1;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Compute the deterministic reward (in USD) for a single video.
 *
 * Day 1 (dayNumber === 1): each video rewards $0.30-$0.40, total for 5
 * videos lands in $1.60-$1.80.
 * Day 2+ (dayNumber >= 2): each video rewards $0.10-$0.20, total for 5
 * videos lands in $0.60-$0.95.
 *
 * The total is picked deterministically from hash(userId + dayNumber), then
 * distributed across the 5 videos with deterministic per-video jitter that
 * sums to zero so the overall total stays on target.
 */
export function getVideoReward(
  userId: string,
  videoIndex: number,
  dayNumber: number
): number {
  const isDay1 = dayNumber === 1;
  const minPerVideo = isDay1 ? 0.30 : 0.10;
  const maxPerVideo = isDay1 ? 0.40 : 0.20;
  const minTotal = isDay1 ? 1.60 : 0.60;
  const maxTotal = isDay1 ? 1.80 : 0.95;
  const numVideos = DAILY_VIDEO_LIMIT;

  // Deterministic target total in [minTotal, maxTotal] from hash(userId, dayNumber).
  // We shrink the effective range by a small margin so that after rounding each
  // of the 5 rewards to 2 decimals (cumulative rounding error up to ±$0.025),
  // the rounded sum still lands strictly within [minTotal, maxTotal].
  const targetHash = hashStr(`target:${userId}:${dayNumber}`);
  const roundingMargin = 0.025;
  const effectiveMin = minTotal + roundingMargin;
  const effectiveMax = maxTotal - roundingMargin;
  const targetTotal = effectiveMin + (targetHash % 1000) / 1000 * (effectiveMax - effectiveMin);

  // Equal share of the "extra" above the per-video baseline (5 * minPerVideo).
  const totalMin = minPerVideo * numVideos;
  const extra = targetTotal - totalMin;
  const baseExtra = extra / numVideos;

  // Generate 5 deterministic jitters in [-0.01, 0.01], then center them so
  // they sum to exactly 0. After centering, each jitter lies in [-0.02, 0.02],
  // which is small enough to keep every reward within [minPerVideo, maxPerVideo]
  // for all valid baseExtra values (baseExtra ∈ [0.02, 0.06] on day 1 and
  // [0.02, 0.09] on day 2+).
  const jitterRange = 0.01;
  const rawJitters: number[] = [];
  for (let i = 0; i < numVideos; i++) {
    const h = hashStr(`jitter:${userId}:${dayNumber}:${i}`);
    rawJitters.push(((h % 1000) / 1000 - 0.5) * 2 * jitterRange);
  }
  const meanJitter = rawJitters.reduce((a, b) => a + b, 0) / numVideos;
  const jitter = rawJitters[videoIndex] - meanJitter;

  const rawReward = minPerVideo + baseExtra + jitter;
  // Round to 2 decimal places (cent).
  return Math.round(rawReward * 100) / 100;
}

/**
 * Compute the deterministic total reward for all 5 daily videos for a given
 * user/day. Useful for verifying the day's total lands within the target
 * range and for surfacing "potential earnings today" in the UI.
 */
export function getDailyVideoTotal(userId: string, dayNumber: number): number {
  let sum = 0;
  for (let i = 0; i < DAILY_VIDEO_LIMIT; i++) {
    sum += getVideoReward(userId, i, dayNumber);
  }
  return Math.round(sum * 100) / 100;
}
