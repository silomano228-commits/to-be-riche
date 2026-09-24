import { create } from 'zustand';

/* ================================================================
   SIMPLE STORE v2 — Jeune Élan, version « vrai système »
   ----------------------------------------------------------------
   Une seule source de vérité. Même dynamique qu'avant :
   missions images (30 F max), investir (gains journaliers),
   prêt 5 000 F (caution = 50 %, parrainages requis).

   NOUVEAU — mécaniques d'engagement (favorables à la plateforme) :
   • XP + niveaux (Bronze → Diamant) : le quota d'images/jour
     augmente avec le niveau → plus de production pour la
     plateforme, du statut pour le jeune.
   • Série active (streak) : un jour manqué = série perdue →
     retour quotidien garanti.
   • Défi du jour : 3 images validées → +10 F (production).
   • Paliers de prêts 5 000 → 10 000 → 25 000 F : la caution
     reste TOUJOURS la moitié, les parrainages exigés montent,
     et chaque prêt est remboursé avec frais → revenu plateforme.
   • Booster d'investissement 7 %/jour verrouillé à 10 filleuls
     validés → moteur de recrutement.
   • +100 F par filleul validé → croissance.
   • Persistance localStorage → la progression est réelle.
   ================================================================ */

export const BASE_DAILY_LIMIT = 10;
export const MAX_REWARD_PER_IMAGE = 30;
export const INVEST_RATE = 0.05;
export const INVEST_BOOST_RATE = 0.07;
export const INVEST_BOOST_REFERRALS = 10;
export const REFERRAL_BONUS = 100;
export const CHALLENGE_TARGET = 3;
export const CHALLENGE_REWARD = 10;

export interface Level {
  name: string; icon: string; color: string; min: number; quota: number; perk: string;
}
export const LEVELS: Level[] = [
  { name: 'Bronze',  icon: 'fa-medal',  color: '#B45309', min: 0,   quota: 10, perk: 'Accès aux missions' },
  { name: 'Argent',  icon: 'fa-medal',  color: '#94A3B8', min: 150, quota: 10, perk: 'Priorité de validation' },
  { name: 'Or',      icon: 'fa-trophy', color: '#F59E0B', min: 400, quota: 12, perk: '12 images/jour' },
  { name: 'Diamant', icon: 'fa-gem',    color: '#3B82F6', min: 900, quota: 15, perk: '15 images/jour' },
];

export function levelFor(xp: number): { level: Level; index: number; next: Level | null; toNext: number } {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) index = i;
  const level = LEVELS[index];
  const next = index < LEVELS.length - 1 ? LEVELS[index + 1] : null;
  const toNext = next ? next.min - xp : 0;
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

/* Mission vedette du jour (change chaque jour → raison de revenir) */
export const FEATURED_MISSION_ID: string = MISSIONS[Math.floor(Date.now() / 86400000) % MISSIONS.length].id;

/* ---------------- Preuve sociale (flux live + top créateurs) ---------------- */

export interface FeedEvent { name: string; action: string; amount: number; when: string }
export const LIVE_FEED: FeedEvent[] = [
  { name: 'Awa D.', action: 'a validé une image', amount: 25, when: 'il y a 2 min' },
  { name: 'Moussa T.', action: 'a réclamé ses gains du jour', amount: 25, when: 'il y a 9 min' },
  { name: 'Fatou B.', action: 'a validé une image', amount: 30, when: 'il y a 14 min' },
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

/* ---------------- Types d'état ---------------- */

export interface MyImage {
  id: string; missionId: string; missionTitle: string; reward: number;
  status: 'pending' | 'validated' | 'refused'; date: string;
}

export interface Tx {
  id: string; label: string; amount: number;
  kind: 'mission' | 'invest' | 'daily' | 'loan' | 'caution' | 'bonus'; date: string;
}

export interface AdminUserRow {
  id: string; name: string; xp: number; imagesSubmitted: number; imagesValidated: number;
  imagesPending: number; invested: number; earned: number; lastActive: string;
}

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const today = () => new Date().toDateString();
const yesterday = () => new Date(Date.now() - 86400000).toDateString();

interface SimpleState {
  balance: number;
  missionTotalEarned: number;
  todayEarned: number;
  todayValidated: number;
  submissionsToday: number;
  referralCount: number;
  invest: { invested: number; totalEarned: number; claimedToday: boolean };
  xp: number;
  streak: number;
  bestStreak: number;
  lastActiveDate: string;
  dailyDate: string;
  challengeClaimed: boolean;
  dayProcessed: string;
  cautionBalance: number;
  loansTaken: number;
  reservedMissionIds: string[];
  myImages: MyImage[];
  transactions: Tx[];
  adminUsers: AdminUserRow[];

  processNewDay: () => { messages: string[]; bonus: number };
  submitImage: (missionId: string) => { ok: boolean; reason?: string };
  validateImage: (imageId: string) => { challengeBonus?: number };
  refuseImage: (imageId: string) => void;
  claimDailyChallenge: () => { ok: boolean; reason?: string };
  deposit: (amount: number) => boolean;
  withdraw: (amount: number) => boolean;
  claimDailyGains: () => { ok: boolean; reason?: string; gain?: number };
  payCaution: () => boolean;
  requestLoan: () => { ok: boolean; reason?: string };
}

/* ---------------- Persistance (vrai système) ---------------- */

const LS_KEY = 'je_state_v2';
const DATA_KEYS = ['balance', 'missionTotalEarned', 'todayEarned', 'todayValidated', 'submissionsToday',
  'referralCount', 'invest', 'xp', 'streak', 'bestStreak', 'lastActiveDate', 'dailyDate',
  'challengeClaimed', 'dayProcessed', 'cautionBalance', 'loansTaken', 'reservedMissionIds',
  'myImages', 'transactions', 'adminUsers'] as const;

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
  xp: 355,
  streak: 5,
  bestStreak: 5,
  lastActiveDate: yesterday(), // pour déclencher le traitement du jour à la 1re visite
  dailyDate: today(),
  challengeClaimed: false,
  dayProcessed: '',
  cautionBalance: 0,
  loansTaken: 0,
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

  /* ---- Soumettre une image (flux mission) : +2 XP ---- */
  submitImage: (missionId) => {
    const s = get();
    const quota = levelFor(s.xp).level.quota;
    if (s.submissionsToday >= quota) {
      return { ok: false, reason: `Limite de ${quota} images par jour atteinte.` };
    }
    const mission = MISSIONS.find((m) => m.id === missionId);
    if (!mission) return { ok: false, reason: 'Mission introuvable.' };
    const reward = Math.min(mission.reward, MAX_REWARD_PER_IMAGE);
    const img: MyImage = {
      id: 'i-' + Math.random().toString(36).slice(2, 8),
      missionId,
      missionTitle: `${mission.title} — ${mission.brand}`,
      reward,
      status: 'pending',
      date: `Aujourd'hui — ${now()}`,
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

  /* ---- Admin : valider une image → gain + XP + défi du jour ---- */
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
    /* Défi du jour : 3 images validées → +10 F (crédité automatiquement) */
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

  /* ---- Défi du jour : réclamation manuelle (si déjà ≥ 3 au chargement) ---- */
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

  /* ---- Investir : déposer (+20 XP) / retirer ---- */
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

  /* ---- Gains journaliers (taux boosté si ≥ 10 filleuls) ---- */
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

  /* ---- Caution : la moitié du prêt, versée depuis le solde ---- */
  payCaution: () => {
    const s = get();
    const tier = LOAN_TIERS[Math.min(s.loansTaken, LOAN_TIERS.length - 1)];
    if (s.cautionBalance >= tier.caution) return false;
    if (s.balance < tier.caution) return false;
    set((st) => ({
      balance: st.balance - tier.caution,
      cautionBalance: tier.caution,
      xp: st.xp + 25,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Caution verrouillée (garantie prêt ${tier.amount} F)`, amount: -tier.caution, kind: 'caution' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return true;
  },

  /* ---- Demande du prêt : palier suivant, frais inclus ----
     Logique microfinance : le solde exigé prouve la capacité d'épargne ;
     il est ensuite VERROUILLÉ en caution. Une fois la caution versée,
     la condition de solde est acquise. Restent : parrainages + niveau. */
  requestLoan: () => {
    const s = get();
    const tier = LOAN_TIERS[Math.min(s.loansTaken, LOAN_TIERS.length - 1)];
    const { level } = levelFor(s.xp);
    if (s.cautionBalance < tier.caution) return { ok: false, reason: `Verrouillez d’abord la caution de ${tier.caution} F (votre solde devient la garantie).` };
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

/* Sauvegarde automatique à chaque changement → vrai système persistant */
if (typeof window !== 'undefined') {
  useSimpleStore.subscribe((s) => persist(s));
}
