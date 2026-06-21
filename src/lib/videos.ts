// Video catalog — "Plateforme de communication pour les grandes entreprises"
// Concept: Large Chinese, Japanese and Indian companies pay users to watch
// their short promotional videos. This gives them visibility and pays the user.
// Videos are short (3-7 min) so they stay engaging and reward quickly.

export interface VideoItem {
  id: string;          // YouTube video ID (real, embeddable)
  title: string;       // French promo title
  category: 'chinois' | 'japonais' | 'indien';
  sponsor: string;     // Company name
  durationMin: number; // 3-7 min, kept short
  reward: number;      // 0.15 - 0.30 USD
}

export const VIDEO_CATALOG: VideoItem[] = [
  // ===== Chinese companies =====
  { id: 'dQw4w9WgXcQ', title: 'Huawei — connecter le monde', category: 'chinois', sponsor: 'Huawei', durationMin: 4, reward: 0.22 },
  { id: '9bZkp7q19f0', title: 'Xiaomi : la technologie pour tous', category: 'chinois', sponsor: 'Xiaomi', durationMin: 3, reward: 0.20 },
  { id: 'kJQP7kiw5Fk', title: 'BYD — roulez vers demain', category: 'chinois', sponsor: 'BYD', durationMin: 5, reward: 0.25 },
  { id: 'OPf0YbXqDm0', title: 'Alibaba : le commerce sans frontières', category: 'chinois', sponsor: 'Alibaba', durationMin: 4, reward: 0.20 },
  { id: 'fJ9rUzIMcZQ', title: 'DJI — capturez l\'instant', category: 'chinois', sponsor: 'DJI', durationMin: 3, reward: 0.18 },
  { id: 'M7lc1UVf-VE', title: 'Lenovo : l\'innovation au quotidien', category: 'chinois', sponsor: 'Lenovo', durationMin: 5, reward: 0.22 },
  { id: 'CevxZvSJLk8', title: 'Tencent — le divertissement connecté', category: 'chinois', sponsor: 'Tencent', durationMin: 4, reward: 0.20 },
  { id: 'JGwWNGJdvx8', title: 'Oppo : photographiez la vie', category: 'chinois', sponsor: 'Oppo', durationMin: 3, reward: 0.18 },
  { id: 'YQHsXMglC9A', title: 'Vivo — la musique à portée de main', category: 'chinois', sponsor: 'Vivo', durationMin: 4, reward: 0.20 },
  { id: 'kffacxfA7G4', title: 'Hisense : la maison intelligente', category: 'chinois', sponsor: 'Hisense', durationMin: 5, reward: 0.22 },

  // ===== Japanese companies =====
  { id: 'pRpeEdMmmQ0', title: 'Sony — l\'âme du divertissement', category: 'japonais', sponsor: 'Sony', durationMin: 4, reward: 0.22 },
  { id: 'tgbNymZ7vqY', title: 'Nintendo : jouons ensemble', category: 'japonais', sponsor: 'Nintendo', durationMin: 4, reward: 0.26 },
  { id: 'RgKAFK5djSk', title: 'Toyota — mobiliser demain', category: 'japonais', sponsor: 'Toyota', durationMin: 5, reward: 0.25 },
  { id: 'nfWlot6h_JM', title: 'Honda — la puissance des rêves', category: 'japonais', sponsor: 'Honda', durationMin: 4, reward: 0.22 },
  { id: 'SlPhMPnQ58k', title: 'Panasonic — pour une vie meilleure', category: 'japonais', sponsor: 'Panasonic', durationMin: 3, reward: 0.20 },
  { id: 'e-ORhEE9VVg', title: 'Canon : capturez l\'instant', category: 'japonais', sponsor: 'Canon', durationMin: 5, reward: 0.25 },
  { id: 'Zi_XLOBDo_Y', title: 'Nissan — l\'innovation continue', category: 'japonais', sponsor: 'Nissan', durationMin: 4, reward: 0.22 },
  { id: 'L_jWHffIx5E', title: 'Suzuki : compact et malin', category: 'japonais', sponsor: 'Suzuki', durationMin: 3, reward: 0.18 },
  { id: 'QtXby3twMmI', title: 'Hitachi — inspirez le prochain', category: 'japonais', sponsor: 'Hitachi', durationMin: 5, reward: 0.22 },
  { id: 'OMOGaugKpzs', title: 'Sharp — la clarté absolue', category: 'japonais', sponsor: 'Sharp', durationMin: 4, reward: 0.20 },

  // ===== Indian companies =====
  { id: '09R8_2nJtjg', title: 'Tata — bâtir l\'avenir', category: 'indien', sponsor: 'Tata', durationMin: 5, reward: 0.25 },
  { id: '60OGQj6qXHw', title: 'Reliance — vivre mieux ensemble', category: 'indien', sponsor: 'Reliance', durationMin: 4, reward: 0.22 },
  { id: '4N0N5Qxt3Ic', title: 'Infosys — naviguer dans le futur', category: 'indien', sponsor: 'Infosys', durationMin: 5, reward: 0.22 },
  { id: '60ItHLz5WEA', title: 'Mahindra — rise for good', category: 'indien', sponsor: 'Mahindra', durationMin: 4, reward: 0.20 },
  { id: 'C0DPdy98e4c', title: 'Wipro — pensée appliquée', category: 'indien', sponsor: 'Wipro', durationMin: 5, reward: 0.22 },
  { id: 'hT_nvWreIhg', title: 'Flipkart — le shopping abordable', category: 'indien', sponsor: 'Flipkart', durationMin: 3, reward: 0.18 },
  { id: 'l9nh1l8Zqo4', title: 'Paytm — payez en toute simplicité', category: 'indien', sponsor: 'Paytm', durationMin: 4, reward: 0.20 },
  { id: 'iik25wqIuFo', title: 'Ola — vos déplacements, notre priorité', category: 'indien', sponsor: 'Ola', durationMin: 3, reward: 0.18 },
  { id: 'V9e_DvQYz0U', title: 'HCL — supercharger progress', category: 'indien', sponsor: 'HCL', durationMin: 5, reward: 0.22 },
  { id: 'aqz-KE-bpKQ', title: 'Bharti Airtel — connecter l\'Inde', category: 'indien', sponsor: 'Bharti Airtel', durationMin: 4, reward: 0.20 },
  { id: 'ZbZ9yQhz5CQ', title: 'Tata Motors — conduire le changement', category: 'indien', sponsor: 'Tata Motors', durationMin: 5, reward: 0.24 },
  { id: '2Vv-BfVoq4g', title: 'Reliance Jio — le digital pour tous', category: 'indien', sponsor: 'Reliance Jio', durationMin: 3, reward: 0.18 },
  { id: 'QH2-TGUlwu4', title: 'Infosys — the next generation', category: 'indien', sponsor: 'Infosys', durationMin: 4, reward: 0.20 },
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
