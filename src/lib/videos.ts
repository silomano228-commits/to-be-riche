// YouTube video catalog for the video platform
// Videos are mostly Arabic content and gaming, generally under 10 minutes
// Each user gets 5 videos per day from this pool

export interface VideoItem {
  id: string;          // YouTube video ID
  title: string;
  category: 'arabic' | 'gaming' | 'fun' | 'tech';
  durationMin: number; // approximate duration in minutes
  reward: number;      // reward in USD for watching
}

export const VIDEO_CATALOG: VideoItem[] = [
  // Arabic content (entertainment, nasheeds, short clips)
  { id: 'dQw4w9WgXcQ', title: 'Vidéo divertissante #1', category: 'fun', durationMin: 3, reward: 0.15 },
  { id: '9bZkp7q19f0', title: 'Clip musical populaire', category: 'fun', durationMin: 4, reward: 0.15 },
  { id: 'kJQP7kiw5Fk', title: 'Vidéo virale #1', category: 'fun', durationMin: 4, reward: 0.15 },
  { id: 'OPf0YbXqDm0', title: 'Moment de détente', category: 'fun', durationMin: 3, reward: 0.15 },
  { id: 'fJ9rUzIMcZQ', title: 'Vidéo nature', category: 'fun', durationMin: 5, reward: 0.15 },

  // Gaming content (under 10 min)
  { id: 'M7lc1UVf-VE', title: 'Gameplay épique #1', category: 'gaming', durationMin: 8, reward: 0.25 },
  { id: 'l9nh1l8Zqo4', title: 'Highlights de jeu', category: 'gaming', durationMin: 7, reward: 0.25 },
  { id: 'iik25wqIuFo', title: 'Astuces de gaming', category: 'gaming', durationMin: 6, reward: 0.20 },
  { id: 'V9e_DvQYz0U', title: 'Top 5 moments gaming', category: 'gaming', durationMin: 5, reward: 0.20 },
  { id: '2Vv-BfVoq4g', title: 'Speedrun record', category: 'gaming', durationMin: 9, reward: 0.25 },
  { id: 'QH2-TGUlwu4', title: 'Tutoriel de jeu', category: 'gaming', durationMin: 8, reward: 0.20 },
  { id: 'JGwWNGJdvx8', title: 'Gameplay mobile', category: 'gaming', durationMin: 7, reward: 0.20 },
  { id: 'tgbNymZ7vqY', title: 'Compilation gaming', category: 'gaming', durationMin: 6, reward: 0.20 },
  { id: 'hT_nvWreIhg', title: 'Top 10 jeux mobiles', category: 'gaming', durationMin: 8, reward: 0.25 },

  // Tech / educational (short)
  { id: 'aqz-KE-bpKQ', title: 'Tech en 5 minutes', category: 'tech', durationMin: 5, reward: 0.20 },
  { id: 'ZbZ9yQhz5CQ', title: 'Découverte tech', category: 'tech', durationMin: 7, reward: 0.20 },
  { id: '60ItHLz5WEA', title: 'Astuces smartphone', category: 'tech', durationMin: 6, reward: 0.20 },
  { id: 'C0DPdy98e4c', title: 'Innovation du jour', category: 'tech', durationMin: 4, reward: 0.15 },

  // More fun / variety (under 10 min)
  { id: '3JZ_D3ELwOQ', title: 'Vidéo surprise #1', category: 'fun', durationMin: 4, reward: 0.15 },
  { id: 'y6120QOlsfU', title: 'Vidéo surprise #2', category: 'fun', durationMin: 5, reward: 0.15 },
  { id: 'pRpeEdMmmQ0', title: 'Moment magique', category: 'fun', durationMin: 3, reward: 0.15 },
  { id: '09R8_2nJtjg', title: 'Compilation fun', category: 'fun', durationMin: 7, reward: 0.20 },
  { id: '60OGQj6qXHw', title: 'Top moments', category: 'fun', durationMin: 6, reward: 0.20 },
  { id: 'OMOGaugKpzs', title: 'Vidéo relaxante', category: 'fun', durationMin: 8, reward: 0.20 },
  { id: 'QtXby3twMmI', title: 'Découverte du monde', category: 'fun', durationMin: 5, reward: 0.15 },
  { id: 'L_jWHffIx5E', title: 'Aventure quotidienne', category: 'fun', durationMin: 6, reward: 0.20 },
  { id: 'Zi_XLOBDo_Y', title: 'Vidéo inspirante', category: 'fun', durationMin: 4, reward: 0.15 },
  { id: 'e-ORhEE9VVg', title: 'Histoire courte', category: 'fun', durationMin: 7, reward: 0.20 },
  { id: 'nfWlot6h_JM', title: 'Moment fort', category: 'fun', durationMin: 5, reward: 0.15 },
  { id: 'SlPhMPnQ58k', title: 'Vidéo du jour', category: 'fun', durationMin: 6, reward: 0.20 },
  { id: 'RgKAFK5djSk', title: 'Surprise garantie', category: 'fun', durationMin: 4, reward: 0.15 },
  { id: 'CevxZvSJLk8', title: 'Clip du moment', category: 'fun', durationMin: 5, reward: 0.15 },
  { id: 'YQHsXMglC9A', title: 'Vidéo populaire', category: 'fun', durationMin: 6, reward: 0.20 },
  { id: '09R8_2nJtjg', title: 'Top fun #2', category: 'fun', durationMin: 7, reward: 0.20 },
];

// Get today's 5 videos deterministically based on date
// This ensures all users see the same 5 videos each day
export function getDailyVideos(date: Date = new Date()): VideoItem[] {
  const dateStr = date.toISOString().slice(0, 10);
  // Simple hash from date string to pick starting index
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  const startIdx = Math.abs(hash) % VIDEO_CATALOG.length;
  const result: VideoItem[] = [];
  for (let i = 0; i < 5; i++) {
    result.push(VIDEO_CATALOG[(startIdx + i) % VIDEO_CATALOG.length]);
  }
  return result;
}

export const DAILY_VIDEO_LIMIT = 5;
