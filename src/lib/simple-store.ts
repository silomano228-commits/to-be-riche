import { create } from 'zustand';

/* ================================================================
   SIMPLE STORE v3 — Be Rich, « vrai système »
   ----------------------------------------------------------------
   Une seule source de vérité. Trois projets financiers :
   1. LIKES (live) : 100 coeurs en 45 s -> +25 F, 10 sessions/jour
      (+ lives VIP si cagnotte versée via Yas).
   2. MISSIONS images : jusqu'à 30 F/image, épargne AU CHOIX du
      jeune (compte pour la caution du prêt), détection de
      doublons, aperçu image pour l'admin.
   3. INVESTIR : 5 %/jour (7 % boosté a 10 filleuls) — dépôts et
      retraits via Yas, validés par l'administrateur.

   Tout est favorable à la plateforme :
   • Prêts = caution 50 % verrouillée + frais 10 %.
   • 1er retrait exige >= 1 filleul ; chaque niveau exige des
     parrainages croissants -> moteur de recrutement.
   • Crédibilité obligatoire avant prêt (tâches à prouver).
   • Retraits/dépôts Yas filtrés par l'admin -> il contrôle
     l'entrée et la sortie de l'argent.
   • Persistance localStorage -> la progression est réelle.
   ================================================================ */

export const BASE_DAILY_LIMIT = 10;
export const MAX_REWARD_PER_IMAGE = 30;
export const INVEST_RATE = 0.05;
export const INVEST_BOOST_RATE = 0.07;
export const INVEST_BOOST_REFERRALS = 10;
export const REFERRAL_BONUS = 100;
export const CHALLENGE_TARGET = 3;
export const CHALLENGE_REWARD = 10;

/* ---- Projet LIKES (live) ---- */
export const LIKE_TARGET = 100;      // coeurs à atteindre
export const LIKE_SECONDS = 45;      // en 45 secondes (difficile mais raisonnable)
export const LIKE_REWARD = 25;       // F par session réussie
export const LIKE_ROUNDS_MAX = 10;   // sessions par jour
export const LIKE_VIP_REWARD = 50;   // lives VIP (cagnotte >= 1000 F via Yas)
export const LIKE_VIP_CAGNOTTE = 1000;
export const LIKE_FAIL_COOLDOWN = 60; // secondes avant de retenter

/* ---- Yas (mobile money) ---- */
export const ADMIN_YAS_ACCOUNT = '90 87 64 59';
export const YAS_MIN_DEPOSIT = 1000;
export const YAS_MIN_WITHDRAW = 2500;

/* ---- Numéro Yas (Togo) : 8 chiffres, préfixe 90-93 / 70-73 ---- */
export function validateYasAccount(acc: string): string | null {
  const t = (acc || '').replace(/\s+/g, '');
  if (!t) return 'Numéro Yas requis';
  if (!/^\d{8}$/.test(t)) return '8 chiffres exactement';
  if (!['90', '91', '92', '93', '70', '71', '72', '73'].includes(t.slice(0, 2))) {
    return 'Doit commencer par 90-93 ou 70-73';
  }
  return null;
}

export interface Level {
  name: string; icon: string; color: string; min: number; quota: number;
  referrals: number; perk: string;
}
/* Niveaux : les parrainages sont OBLIGATOIRES pour monter */
export const LEVELS: Level[] = [
  { name: 'Bronze',  icon: 'fa-medal',  color: '#B45309', min: 0,   quota: 10, referrals: 0, perk: 'Accès aux missions' },
  { name: 'Argent',  icon: 'fa-medal',  color: '#94A3B8', min: 150, quota: 10, referrals: 1, perk: 'Priorité de validation' },
  { name: 'Or',      icon: 'fa-trophy', color: '#F59E0B', min: 400, quota: 12, referrals: 3, perk: '12 images/jour' },
  { name: 'Diamant', icon: 'fa-gem',    color: '#3B82F6', min: 900, quota: 15, referrals: 5, perk: '15 images/jour' },
];

/* Le niveau exige XP ET parrainages (obligatoire avant de monter) */
export function levelFor(xp: number, referralCount = 0): { level: Level; index: number; next: Level | null; toNext: number } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min && referralCount >= LEVELS[i].referrals) index = i;
  }
  const level = LEVELS[index];
  const next = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
  const toNext = next ? Math.max(next.min - xp, next.referrals - referralCount) : 0;
  return { level, index, next, toNext };
}

export interface LoanTier {
  id: number; amount: number; caution: number; referrals: number; levelMin: number; repay: number; days: number;
}
export const LOAN_TIERS: LoanTier[] = [
  { id: 1, amount: 5000,  caution: 2500,  referrals: 5,  levelMin: 0, repay: 5500,  days: 30 },
  { id: 2, amount: 10000, caution: 5000,  referrals: 10, levelMin: 1, repay: 11200, days: 45 },
  { id: 3, amount: 25000, caution: 12500, referrals: 20, levelMin: 2, repay: 28750, days: 60 },
];

export function investRateFor(referralCount: number): number {
  return referralCount >= INVEST_BOOST_REFERRALS ? INVEST_BOOST_RATE : INVEST_RATE;
}

/* ---------------- Missions ---------------- */

export interface Mission {
  id: string; title: string; brand: string; icon: string; color: string;
  reward: number; duration: string; description: string; rules: string[];
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1', title: 'Créer une affiche', brand: 'Restaurant Le Méridien', icon: 'fa-utensils', color: '#F59E0B', reward: 25, duration: '2 jours',
    description: 'Créez une affiche publicitaire appétissante pour le nouveau menu du restaurant : plat principal, prix et slogan court.',
    rules: ['Format vertical (affiche)', 'Style moderne et coloré', 'Mentionner « Nouveau menu » et un prix', 'Image créée avec l’IA de votre choix (ChatGPT, Gemini…)'],
  },
  {
    id: 'm2', title: 'Créer un logo', brand: 'Boutique Mercedes Style', icon: 'fa-gem', color: '#8B5CF6', reward: 30, duration: '3 jours',
    description: 'Proposez un logo élégant et mémorable pour cette boutique de mode : initiales « MS » intégrées au design.',
    rules: ['Format carré', 'Style minimaliste et premium', 'Initiales « MS » visibles', 'Image créée avec l’IA de votre choix'],
  },
  {
    id: 'm3', title: 'Visuel publicitaire', brand: 'Immobilier Prestige', icon: 'fa-building', color: '#3B82F6', reward: 25, duration: '2 jours',
    description: 'Réalisez un visuel de promotion pour un appartement de standing : façade moderne, ciel dégagé, texte d’accroche.',
    rules: ['Format paysage', 'Style lumineux et professionnel', 'Ajouter le slogan « Vivez ailleurs »', 'Image créée avec l’IA de votre choix'],
  },
  {
    id: 'm4', title: 'Illustration événement', brand: 'Fête de la Jeunesse', icon: 'fa-music', color: '#EC4899', reward: 20, duration: '5 jours',
    description: 'Illustrez l’affiche de la fête de la jeunesse : ambiance festive, jeunes qui dansent, date de l’événement.',
    rules: ['Format vertical', 'Ambiance joyeuse et dynamique', 'Afficher la date du 11 février', 'Image créée avec l’IA de votre choix'],
  },
  {
    id: 'm5', title: 'Bannière réseaux sociaux', brand: 'Agence Digitale Nova', icon: 'fa-bullhorn', color: '#14B8A6', reward: 30, duration: '1 jour',
    description: 'Créez une bannière promotionnelle pour la page de l’agence : services clés et appel à l’action « Nous contacter ».',
    rules: ['Format bannière horizontale', 'Style épuré, 3 couleurs maximum', 'Appel à l’action visible', 'Image créée avec l’IA de votre choix'],
  },
];

/* Mission vedette du jour (change chaque jour -> raison de revenir) */
export const FEATURED_MISSION_ID: string = MISSIONS[Math.floor(Date.now() / 86400000) % MISSIONS.length].id;

/* ---------------- Preuve sociale ---------------- */

export interface FeedEvent { name: string; action: string; amount: number; when: string }
export const LIVE_FEED: FeedEvent[] = [
  { name: 'Awa D.', action: 'a réussi un live Likes (100 coeurs)', amount: 25, when: 'il y a 2 min' },
  { name: 'Moussa T.', action: 'a validé une image', amount: 30, when: 'il y a 9 min' },
  { name: 'Fatou B.', action: 'a réclamé ses gains du jour', amount: 25, when: 'il y a 14 min' },
  { name: 'Ibrahim S.', action: 'a atteint 7 jours de série 🔥', amount: 5, when: 'il y a 22 min' },
  { name: 'Awa D.', action: 'a débloqué le niveau Argent', amount: 0, when: 'il y a 31 min' },
  { name: 'Fatou B.', action: 'a validé une image', amount: 25, when: 'il y a 44 min' },
  { name: 'Moussa T.', action: 'a demandé le micro-prêt de 5 000 F', amount: 0, when: 'il y a 1 h' },
];

export const TOP_CREATORS = [
  { name: 'Awa D.', earned: 1420, streak: 12 },
  { name: 'Fatou B.', earned: 610, streak: 8 },
  { name: 'Moussa T.', earned: 860, streak: 6 },
];

/* ---------------- Projets à soutenir (présentation Investir, comme avant) ---------------- */

export interface SupportProject {
  id: string; name: string; sector: string; rate: string; img: string; suggested: number; description: string;
}
export const SUPPORT_PROJECTS: SupportProject[] = [
  {
    id: 'solar', name: 'Solaire Village', sector: '12 % · Énergie', rate: '12 %', img: 'https://picsum.photos/seed/solar99/100/100',
    suggested: 3000, description: 'Centrale solaire communautaire — rendement fort',
  },
  {
    id: 'immo', name: 'Résidence Green', sector: '8 % · Immobilier', rate: '8 %', img: 'https://picsum.photos/seed/immo77/100/100',
    suggested: 5000, description: 'Logements durables — rendement régulier',
  },
];

/* ---------------- Types d'état ---------------- */

export interface MyImage {
  id: string; missionId: string; missionTitle: string; reward: number;
  status: 'pending' | 'validated' | 'refused' | 'duplicate'; date: string;
  data?: string;   /* aperçu compressé (data URL) pour l'admin */
  hash?: string;   /* empreinte pour la détection de doublons */
  dupOf?: string;  /* id de l'image déjà envoyée */
}

export type Project = 'likes' | 'missions' | 'invest';

export interface YasTransfer {
  id: string; kind: 'deposit' | 'withdrawal'; project: Project;
  amount: number; account: string;
  status: 'pending' | 'approved' | 'rejected'; date: string;
}

export interface Tx {
  id: string; label: string; amount: number;
  kind: 'mission' | 'invest' | 'daily' | 'loan' | 'caution' | 'bonus' | 'likes' | 'yas'; date: string;
}

export interface AdminUserRow {
  id: string; name: string; xp: number; imagesSubmitted: number; imagesValidated: number;
  imagesPending: number; invested: number; earned: number; lastActive: string;
}

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const today = () => new Date().toDateString();
const yesterday = () => new Date(Date.now() - 86400000).toDateString();

/* Empreinte simple et stable d'une image (djb2) */
export function hashString(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i += 3) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + '-' + str.length.toString(36);
}

interface SimpleState {
  balance: number;
  missionTotalEarned: number;
  todayEarned: number;
  todayValidated: number;
  submissionsToday: number;
  referralCount: number;
  invest: { invested: number; totalEarned: number; claimedToday: boolean };
  likes: { roundsToday: number; totalEarned: number; lastFailAt: number; cagnotte: number; vip: boolean };
  savings: number;            /* épargne missions (choisie par le jeune) */
  savingsGoal: number;        /* objectif d'épargne choisi */
  xp: number;
  streak: number;
  bestStreak: number;
  lastActiveDate: string;
  dailyDate: string;
  challengeClaimed: boolean;
  dayProcessed: string;
  cautionBalance: number;
  loansTaken: number;
  withdrawalsDone: number;    /* 0 = premier retrait non encore fait */
  phoneVerified: boolean;     /* numéro vérifié (crédibilité) */
  reservedMissionIds: string[];
  myImages: MyImage[];
  transactions: Tx[];
  adminUsers: AdminUserRow[];
  yasTransfers: YasTransfer[];

  processNewDay: () => { messages: string[]; bonus: number };
  submitImage: (missionId: string, file?: { data: string; hash: string; name: string }) => { ok: boolean; reason?: string; duplicate?: boolean };
  validateImage: (imageId: string) => { challengeBonus?: number };
  refuseImage: (imageId: string) => void;
  claimDailyChallenge: () => { ok: boolean; reason?: string };
  deposit: (amount: number) => boolean;
  withdraw: (amount: number) => boolean;
  claimDailyGains: () => { ok: boolean; reason?: string; gain?: number };
  payCaution: () => boolean;
  requestLoan: () => { ok: boolean; reason?: string };
  addSavings: (amount: number) => { ok: boolean; reason?: string };
  requestYasTransfer: (kind: 'deposit' | 'withdrawal', project: Project, amount: number, account: string) => { ok: boolean; reason?: string };
  approveYasTransfer: (id: string) => { ok: boolean; credited?: number };
  rejectYasTransfer: (id: string) => boolean;
  completeLikeRound: (vip: boolean) => { ok: boolean; reward?: number; reason?: string };
  registerLikeFail: () => void;
  markPhoneVerified: () => void;
}

/* ---------------- Persistance (vrai système) ---------------- */

const LS_KEY = 'berich_state_v1';
const DATA_KEYS = ['balance', 'missionTotalEarned', 'todayEarned', 'todayValidated', 'submissionsToday',
  'referralCount', 'invest', 'likes', 'savings', 'savingsGoal', 'xp', 'streak', 'bestStreak', 'lastActiveDate',
  'dailyDate', 'challengeClaimed', 'dayProcessed', 'cautionBalance', 'loansTaken', 'withdrawalsDone',
  'phoneVerified', 'reservedMissionIds', 'myImages', 'transactions', 'adminUsers', 'yasTransfers'] as const;

function loadPersisted(): Partial<SimpleState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const k of DATA_KEYS) if (k in parsed) out[k] = parsed[k];
    return out as Partial<SimpleState>;
  } catch { return {}; }
}

function persist(state: SimpleState) {
  if (typeof window === 'undefined') return;
  try {
    const out: Record<string, unknown> = {};
    for (const k of DATA_KEYS) out[k] = (state as unknown as Record<string, unknown>)[k];
    /* quota : on ne garde l'aperçu que des 12 dernières images */
    const imgs = out.myImages as MyImage[] | undefined;
    if (imgs) {
      out.myImages = imgs.map((im, i) => (i < 12 ? im : { ...im, data: undefined }));
    }
    localStorage.setItem(LS_KEY, JSON.stringify(out));
  } catch { /* quota dépassé : silencieux */ }
}

/* ---------------- Store ---------------- */

export const useSimpleStore = create<SimpleState>((set, get) => ({
  balance: 1850,
  missionTotalEarned: 1850,
  todayEarned: 175,
  todayValidated: 7,
  submissionsToday: 7,
  referralCount: 3,
  invest: { invested: 0, totalEarned: 0, claimedToday: false },
  likes: { roundsToday: 0, totalEarned: 0, lastFailAt: 0, cagnotte: 0, vip: false },
  savings: 0,
  savingsGoal: 2500,
  xp: 355,
  streak: 5,
  bestStreak: 5,
  lastActiveDate: yesterday(), // pour déclencher le traitement du jour à la 1re visite
  dailyDate: today(),
  challengeClaimed: false,
  dayProcessed: '',
  cautionBalance: 0,
  loansTaken: 0,
  withdrawalsDone: 0,
  phoneVerified: false,
  reservedMissionIds: ['m2', 'm3'],
  myImages: [
    { id: 'i-1', missionId: 'm1', missionTitle: 'Affiche — Le Méridien', reward: 25, status: 'validated', date: "Aujourd'hui — 10:42" },
    { id: 'i-2', missionId: 'm3', missionTitle: 'Visuel — Immobilier Prestige', reward: 25, status: 'validated', date: "Aujourd'hui — 09:58" },
    { id: 'i-3', missionId: 'm2', missionTitle: 'Logo — Mercedes Style', reward: 30, status: 'pending', date: "Aujourd'hui — 08:15" },
    { id: 'i-4', missionId: 'm4', missionTitle: 'Illustration — Fête de la Jeunesse', reward: 20, status: 'validated', date: 'Hier — 18:21' },
    { id: 'i-5', missionId: 'm1', missionTitle: 'Affiche — Le Méridien', reward: 25, status: 'refused', date: 'Hier — 12:04' },
  ],
  transactions: [
    { id: 't-1', label: 'Image validée — Affiche Le Méridien', amount: 25, kind: 'mission', date: "Aujourd'hui — 10:42" },
    { id: 't-2', label: 'Image validée — Visuel Immobilier', amount: 25, kind: 'mission', date: "Aujourd'hui — 09:58" },
    { id: 't-3', label: 'Image validée — Illustration Jeunesse', amount: 20, kind: 'mission', date: 'Hier — 18:21' },
  ],
  adminUsers: [
    { id: 'u-1', name: 'Richard (vous)', xp: 355, imagesSubmitted: 22, imagesValidated: 19, imagesPending: 1, invested: 0, earned: 1850, lastActive: 'en ligne' },
    { id: 'u-2', name: 'Awa D.', xp: 520, imagesSubmitted: 18, imagesValidated: 16, imagesPending: 2, invested: 2000, earned: 1420, lastActive: 'il y a 5 min' },
    { id: 'u-3', name: 'Moussa T.', xp: 240, imagesSubmitted: 12, imagesValidated: 10, imagesPending: 0, invested: 500, earned: 860, lastActive: 'il y a 1 h' },
    { id: 'u-4', name: 'Fatou B.', xp: 180, imagesSubmitted: 9, imagesValidated: 7, imagesPending: 1, invested: 1000, earned: 610, lastActive: 'il y a 3 h' },
    { id: 'u-5', name: 'Ibrahim S.', xp: 90, imagesSubmitted: 5, imagesValidated: 4, imagesPending: 0, invested: 0, earned: 340, lastActive: 'hier' },
  ],
  yasTransfers: [],
  ...loadPersisted(),

  /* ---- Passage au nouveau jour : reset quotidien + série active ---- */
  processNewDay: () => {
    const s = get();
    if (s.dayProcessed === today()) return { messages: [], bonus: 0 };
    const messages: string[] = [];
    let bonus = 0;

    const patch: Partial<SimpleState> = { dayProcessed: today() };

    if (s.dailyDate !== today()) {
      patch.submissionsToday = 0;
      patch.todayEarned = 0;
      patch.todayValidated = 0;
      patch.challengeClaimed = false;
      patch.invest = { ...s.invest, claimedToday: false };
      patch.likes = { ...s.likes, roundsToday: 0 };
      patch.dailyDate = today();
    }

    if (s.lastActiveDate === yesterday()) {
      const newStreak = s.streak + 1;
      if (newStreak % 30 === 0) bonus = 15;
      else if (newStreak % 7 === 0) bonus = 5;
      patch.streak = newStreak;
      patch.bestStreak = Math.max(s.bestStreak, newStreak);
      patch.lastActiveDate = today();
      messages.push(`Série active : ${newStreak} jours 🔥${bonus ? ` — bonus fidélité +${bonus} F` : ''}`);
    } else if (s.lastActiveDate !== today()) {
      if (s.streak > 1) messages.push('Série repartie à 1 jour — reviens chaque jour pour la faire grandir 🔥');
      else messages.push('Nouvelle série active — reviens chaque jour pour la faire grandir 🔥');
      patch.streak = 1;
      patch.lastActiveDate = today();
    }

    if (bonus > 0) {
      patch.balance = (patch.balance ?? s.balance) + bonus;
      patch.xp = (patch.xp ?? s.xp) + 5;
      patch.transactions = [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Bonus fidélité — série de ${patch.streak} jours`, amount: bonus, kind: 'bonus' as const, date: `Aujourd'hui — ${now()}` }, ...s.transactions];
    }

    set(patch);
    return { messages, bonus };
  },

  /* ---- Soumettre une image (flux mission) : +2 XP, doublon bloqué ---- */
  submitImage: (missionId, file) => {
    const s = get();
    const quota = levelFor(s.xp, s.referralCount).level.quota;
    if (s.submissionsToday >= quota) {
      return { ok: false, reason: `Limite de ${quota} images par jour atteinte.` };
    }
    const mission = MISSIONS.find((m) => m.id === missionId);
    if (!mission) return { ok: false, reason: 'Mission introuvable.' };

    /* Filtre anti-doublon : la même image (empreinte) déjà envoyée ? */
    if (file?.hash) {
      const dup = s.myImages.find((i) => i.hash === file.hash);
      if (dup) {
        const img: MyImage = {
          id: 'i-' + Math.random().toString(36).slice(2, 8),
          missionId, missionTitle: `${mission.title} — ${mission.brand}`,
          reward: 0, status: 'duplicate', date: `Aujourd'hui — ${now()}`,
          data: undefined, hash: file.hash, dupOf: dup.id,
        };
        set((st) => ({ myImages: [img, ...st.myImages] }));
        return { ok: false, duplicate: true, reason: `Cette image a déjà été envoyée (${dup.date}). Une création originale est attendue.` };
      }
    }

    const reward = Math.min(mission.reward, MAX_REWARD_PER_IMAGE);
    const img: MyImage = {
      id: 'i-' + Math.random().toString(36).slice(2, 8),
      missionId,
      missionTitle: `${mission.title} — ${mission.brand}`,
      reward,
      status: 'pending',
      date: `Aujourd'hui — ${now()}`,
      data: file?.data,
      hash: file?.hash,
    };
    set((st) => ({
      submissionsToday: st.submissionsToday + 1,
      xp: st.xp + 2,
      adminUsers: st.adminUsers.map((u) => u.id === 'u-1'
        ? { ...u, imagesSubmitted: u.imagesSubmitted + 1, imagesPending: u.imagesPending + 1, lastActive: 'en ligne' }
        : u),
      myImages: [img, ...st.myImages],
    }));
    return { ok: true };
  },

  /* ---- Admin : valider une image -> gain + XP + défi du jour ---- */
  validateImage: (imageId) => {
    const s = get();
    const img = s.myImages.find((i) => i.id === imageId);
    if (!img || img.status !== 'pending') return {};
    const newValidated = s.todayValidated + 1;
    let challengeBonus: number | undefined;
    const patch: Record<string, unknown> = {
      myImages: s.myImages.map((i) => (i.id === imageId ? { ...i, status: 'validated' } : i)),
      balance: s.balance + img.reward,
      missionTotalEarned: s.missionTotalEarned + img.reward,
      todayEarned: s.todayEarned + img.reward,
      todayValidated: newValidated,
      xp: s.xp + 10,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Image validée — ${img.missionTitle}`, amount: img.reward, kind: 'mission' as const, date: `Aujourd'hui — ${now()}` }, ...s.transactions],
      adminUsers: s.adminUsers.map((u) => u.id === 'u-1'
        ? { ...u, imagesPending: Math.max(0, u.imagesPending - 1), imagesValidated: u.imagesValidated + 1, earned: u.earned + img.reward, xp: u.xp + 10 }
        : u),
    };
    /* Défi du jour : 3 images validées -> +10 F (crédité automatiquement) */
    if (!s.challengeClaimed && newValidated >= CHALLENGE_TARGET) {
      challengeBonus = CHALLENGE_REWARD;
      patch.challengeClaimed = true;
      patch.balance = (patch.balance as number) + CHALLENGE_REWARD;
      patch.xp = (patch.xp as number) + 5;
      patch.transactions = [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: 'Bonus du jour — 3 images validées', amount: CHALLENGE_REWARD, kind: 'bonus' as const, date: `Aujourd'hui — ${now()}` }, ...(patch.transactions as Tx[])];
    }
    set(patch as Partial<SimpleState>);
    return { challengeBonus };
  },

  refuseImage: (imageId) => {
    set((st) => ({
      myImages: st.myImages.map((i) => (i.id === imageId ? { ...i, status: 'refused' } : i)),
      adminUsers: st.adminUsers.map((u) => u.id === 'u-1' ? { ...u, imagesPending: Math.max(0, u.imagesPending - 1) } : u),
    }));
  },

  /* ---- Défi du jour : réclamation manuelle (si déjà >= 3 au chargement) ---- */
  claimDailyChallenge: () => {
    const s = get();
    if (s.challengeClaimed) return { ok: false, reason: 'Bonus du jour déjà reçu.' };
    if (s.todayValidated < CHALLENGE_TARGET) return { ok: false, reason: `Validez encore ${CHALLENGE_TARGET - s.todayValidated} image(s) pour débloquer le bonus.` };
    set((st) => ({
      challengeClaimed: true,
      balance: st.balance + CHALLENGE_REWARD,
      xp: st.xp + 5,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: 'Bonus du jour — 3 images validées', amount: CHALLENGE_REWARD, kind: 'bonus' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return { ok: true };
  },

  /* ---- Épargne missions : le jeune CHOISIT combien épargner ---- */
  addSavings: (amount) => {
    const s = get();
    if (amount <= 0) return { ok: false, reason: 'Choisissez un montant.' };
    if (amount > s.balance) return { ok: false, reason: 'Solde disponible insuffisant.' };
    set((st) => ({
      balance: st.balance - amount,
      savings: st.savings + amount,
      xp: st.xp + 5,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Épargne missions — objectif ${st.savingsGoal} F`, amount: -amount, kind: 'mission' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return { ok: true };
  },

  /* ---- Yas : dépôts / retraits (validés par l'admin) ---- */
  requestYasTransfer: (kind, project, amount, account) => {
    const s = get();
    const acc = (account || '').replace(/\s+/g, '');
    const accErr = validateYasAccount(acc);
    if (accErr) return { ok: false, reason: `Numéro Yas invalide : ${accErr}.` };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'Montant invalide.' };

    const label: Record<Project, string> = { likes: 'Lives Likes', missions: 'Missions images', invest: 'Investir' };

    if (kind === 'deposit') {
      if (amount < YAS_MIN_DEPOSIT) return { ok: false, reason: `Dépôt minimum : ${YAS_MIN_DEPOSIT} F.` };
      const pending = s.yasTransfers.some((t) => t.status === 'pending');
      if (pending) return { ok: false, reason: 'Une demande est déjà en attente de vérification.' };
      const t: YasTransfer = { id: 'y-' + Math.random().toString(36).slice(2, 8), kind, project, amount, account: acc, status: 'pending', date: `Aujourd'hui — ${now()}` };
      set((st) => ({ yasTransfers: [t, ...st.yasTransfers] }));
      return { ok: true };
    }

    /* Retrait : premier retrait exige >= 1 filleul (obligatoire) */
    if (s.withdrawalsDone === 0 && s.referralCount < 1) {
      return { ok: false, reason: 'Premier retrait : parrainez au moins 1 personne (obligatoire). Onglet Profil.' };
    }
    if (amount < YAS_MIN_WITHDRAW) return { ok: false, reason: `Retrait minimum : ${YAS_MIN_WITHDRAW} F.` };

    /* fonds disponibles selon le projet */
    const funds = project === 'invest' ? s.invest.invested
      : project === 'missions' ? s.savings
      : s.likes.cagnotte + s.balance; /* likes : gains + cagnotte */
    if (amount > funds) return { ok: false, reason: `Fonds insuffisants sur ${label[project]} (${funds} F disponibles).` };

    /* le montant est mis de côté dès la demande */
    const patch: Partial<SimpleState> = { yasTransfers: [{ id: 'y-' + Math.random().toString(36).slice(2, 8), kind, project, amount, account: acc, status: 'pending', date: `Aujourd'hui — ${now()}` } as YasTransfer, ...s.yasTransfers] };
    if (project === 'invest') patch.invest = { ...s.invest, invested: s.invest.invested - amount };
    else if (project === 'missions') patch.savings = s.savings - amount;
    else patch.balance = s.balance - Math.min(amount, s.balance), patch.likes = { ...s.likes, cagnotte: Math.max(0, s.likes.cagnotte - Math.max(0, amount - Math.min(amount, s.balance))) };

    set(patch);
    return { ok: true };
  },

  /* ---- Admin : valide la transaction Yas ---- */
  approveYasTransfer: (id) => {
    const s = get();
    const t = s.yasTransfers.find((x) => x.id === id);
    if (!t || t.status !== 'pending') return { ok: false };
    const patch: Record<string, unknown> = {
      yasTransfers: s.yasTransfers.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)),
      xp: s.xp + 15,
    };
    if (t.kind === 'deposit') {
      if (t.project === 'invest') patch.invest = { ...s.invest, invested: s.invest.invested + t.amount };
      else if (t.project === 'missions') patch.savings = s.savings + t.amount;
      else patch.likes = { ...s.likes, cagnotte: s.likes.cagnotte + t.amount, vip: s.likes.cagnotte + t.amount >= LIKE_VIP_CAGNOTTE };
      patch.transactions = [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Dépôt Yas validé (${t.project === 'likes' ? 'Lives' : t.project === 'missions' ? 'Missions' : 'Investir'})`, amount: t.amount, kind: 'yas' as const, date: `Aujourd'hui — ${now()}` }, ...s.transactions];
    } else {
      patch.withdrawalsDone = s.withdrawalsDone + 1;
      patch.transactions = [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Retrait Yas payé (${t.project === 'likes' ? 'Lives' : t.project === 'missions' ? 'Missions' : 'Investir'})`, amount: -t.amount, kind: 'yas' as const, date: `Aujourd'hui — ${now()}` }, ...s.transactions];
    }
    set(patch as Partial<SimpleState>);
    return { ok: true, credited: t.kind === 'deposit' ? t.amount : undefined };
  },

  rejectYasTransfer: (id) => {
    const s = get();
    const t = s.yasTransfers.find((x) => x.id === id);
    if (!t || t.status !== 'pending') return false;
    const patch: Record<string, unknown> = { yasTransfers: s.yasTransfers.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)) };
    /* retrait refusé -> fonds restitués */
    if (t.kind === 'withdrawal') {
      if (t.project === 'invest') patch.invest = { ...s.invest, invested: s.invest.invested + t.amount };
      else if (t.project === 'missions') patch.savings = s.savings + t.amount;
      else patch.balance = s.balance + t.amount;
    }
    set(patch as Partial<SimpleState>);
    return true;
  },

  /* ---- Lives Likes : session réussie -> gain ---- */
  completeLikeRound: (vip) => {
    const s = get();
    if (s.likes.roundsToday >= LIKE_ROUNDS_MAX) return { ok: false, reason: 'Limite de 10 sessions aujourd’hui — reviens demain 🔁' };
    const reward = vip ? LIKE_VIP_REWARD : LIKE_REWARD;
    set((st) => ({
      balance: st.balance + reward,
      todayEarned: st.todayEarned + reward,
      xp: st.xp + 5,
      likes: { ...st.likes, roundsToday: st.likes.roundsToday + 1, totalEarned: st.likes.totalEarned + reward },
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: vip ? 'Live VIP réussi (100 coeurs)' : 'Live réussi (100 coeurs)', amount: reward, kind: 'likes' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return { ok: true, reward };
  },

  registerLikeFail: () => set((st) => ({ likes: { ...st.likes, lastFailAt: Date.now() } })),

  markPhoneVerified: () => set({ phoneVerified: true }),

  /* ---- Investir : déposer (+20 XP) / retirer (interne, depuis le solde) ---- */
  deposit: (amount) => {
    if (amount <= 0) return false;
    set((st) => ({
      balance: st.balance - amount,
      xp: st.xp + 20,
      invest: { ...st.invest, invested: st.invest.invested + amount },
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: 'Dépôt — Investir', amount: -amount, kind: 'invest' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return true;
  },

  withdraw: (amount) => {
    const s = get();
    if (amount <= 0 || amount > s.invest.invested) return false;
    set((st) => ({
      balance: st.balance + amount,
      invest: { ...st.invest, invested: st.invest.invested - amount },
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: 'Retrait — Investir', amount, kind: 'invest' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return true;
  },

  /* ---- Gains journaliers (taux boosté si >= 10 filleuls) ---- */
  claimDailyGains: () => {
    const s = get();
    if (s.invest.invested <= 0) return { ok: false, reason: 'Vous n’avez rien investi pour l’instant.' };
    if (s.invest.claimedToday) return { ok: false, reason: 'Gains du jour déjà réclamés. Revenez demain !' };
    const rate = investRateFor(s.referralCount);
    const gain = Math.round(s.invest.invested * rate);
    set((st) => ({
      balance: st.balance + gain,
      xp: st.xp + 5,
      invest: { ...st.invest, totalEarned: st.invest.totalEarned + gain, claimedToday: true },
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Gains journaliers (${Math.round(rate * 100)} %)`, amount: gain, kind: 'daily' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return { ok: true, gain };
  },

  /* ---- Caution : la moitié du prêt (solde + épargne) ---- */
  payCaution: () => {
    const s = get();
    const tier = LOAN_TIERS[Math.min(s.loansTaken, LOAN_TIERS.length - 1)];
    if (s.cautionBalance >= tier.caution) return false;
    const total = s.balance + s.savings;
    if (total < tier.caution) return false;
    const fromBalance = Math.min(s.balance, tier.caution);
    const fromSavings = tier.caution - fromBalance;
    set((st) => ({
      balance: st.balance - fromBalance,
      savings: st.savings - fromSavings,
      cautionBalance: tier.caution,
      xp: st.xp + 25,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Caution verrouillée (garantie prêt ${tier.amount} F)`, amount: -tier.caution, kind: 'caution' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return true;
  },

  /* ---- Demande du prêt : crédibilité prouvée obligatoire ---- */
  requestLoan: () => {
    const s = get();
    const tier = LOAN_TIERS[Math.min(s.loansTaken, LOAN_TIERS.length - 1)];
    const { level } = levelFor(s.xp, s.referralCount);
    if (s.cautionBalance < tier.caution) return { ok: false, reason: `Verrouillez d’abord la caution de ${tier.caution} F (votre épargne + solde deviennent la garantie).` };
    if (s.referralCount < tier.referrals) return { ok: false, reason: `Parrainages insuffisants (${s.referralCount}/${tier.referrals}).` };
    if (LEVELS.indexOf(level) < tier.levelMin) return { ok: false, reason: `Niveau ${LEVELS[tier.levelMin].name} requis.` };
    set((st) => ({
      loansTaken: st.loansTaken + 1,
      balance: st.balance + tier.amount,
      xp: st.xp + 50,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Micro-prêt palier ${tier.id} (${tier.amount} F) — rembourser ${tier.repay} F en ${tier.days} j`, amount: tier.amount, kind: 'loan' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return { ok: true };
  },
}));

/* Sauvegarde automatique à chaque changement -> vrai système persistant */
if (typeof window !== 'undefined') {
  useSimpleStore.subscribe((s) => persist(s));
}

/* ---------------- Crédibilité (tâches à prouver avant le prêt) ---------------- */

export interface CredTask { id: string; label: string; sub: string; points: number; done: boolean; icon: string; color: string }

export function credibilityTasks(s: {
  phoneVerified: boolean; todayValidated: number; myImages: MyImage[];
  streak: number; referralCount: number; savings: number;
}): { tasks: CredTask[]; score: number } {
  const validatedTotal = s.myImages.filter((i) => i.status === 'validated').length;
  const tasks: CredTask[] = [
    { id: 'phone', label: 'Numéro de téléphone vérifié', sub: 'Un numéro unique par compte — preuve d’identité.', points: 20, done: s.phoneVerified, icon: 'fa-phone', color: '#3B82F6' },
    { id: 'tasks', label: `Créer et valider 5 images`, sub: `Images validées : ${validatedTotal} / 5 — prouver votre sérieux.`, points: 20, done: validatedTotal >= 5, icon: 'fa-image', color: '#22C55E' },
    { id: 'streak', label: 'Série active de 3 jours', sub: `Série actuelle : ${s.streak} jours — régularité exigée.`, points: 20, done: s.streak >= 3, icon: 'fa-fire', color: '#EF4444' },
    { id: 'ref', label: 'Parrainer au moins 1 personne', sub: `${s.referralCount} filleul(s) — votre réseau vous recommande.`, points: 20, done: s.referralCount >= 1, icon: 'fa-user-plus', color: '#A855F7' },
    { id: 'savings', label: 'Épargner au moins 500 F', sub: `Épargne missions : ${s.savings} / 500 F — capacité à épargner.`, points: 20, done: s.savings >= 500, icon: 'fa-piggy-bank', color: '#F59E0B' },
  ];
  const score = tasks.reduce((a, t) => a + (t.done ? t.points : 0), 0);
  return { tasks, score };
}
