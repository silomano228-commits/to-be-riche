import { create } from 'zustand';

/* ================================================================
   SIMPLE STORE — version épurée de Jeune Élan
   ----------------------------------------------------------------
   Une seule source de vérité pour tout le système :
   missions images (max 10/j, 30 F max), investir (5 %/jour),
   portefeuille, objectif du mois (prêt 5 000 F, caution 50 %).
   Chaque action met à jour TOUT (solde, file active, admin,
   portefeuille) → l'app reste cohérente partout.
   ================================================================ */

export const DAILY_IMAGE_LIMIT = 10;
export const MAX_REWARD_PER_IMAGE = 30;
export const LOAN_AMOUNT = 5000;
export const LOAN_BALANCE_THRESHOLD = 2500; // solde à atteindre
export const CAUTION_REQUIRED = 2500;       // = moitié du prêt
export const REFERRAL_REQUIRED = 5;
export const INVEST_RATE = 0.05;            // 5 % / jour

export interface Mission {
  id: string;
  title: string;
  brand: string;
  icon: string;
  color: string;
  reward: number;
  duration: string;
  description: string;
  rules: string[];
}

export interface MyImage {
  id: string;
  missionId: string;
  missionTitle: string;
  reward: number;
  status: 'pending' | 'validated' | 'refused';
  date: string;
}

export interface Tx {
  id: string;
  label: string;
  amount: number; // signé
  kind: 'mission' | 'invest' | 'daily' | 'loan' | 'caution';
  date: string;
}

export interface AdminUserRow {
  id: string;
  name: string;
  imagesSubmitted: number;
  imagesValidated: number;
  imagesPending: number;
  invested: number;
  earned: number;
  lastActive: string;
}

export const MISSIONS: Mission[] = [
  {
    id: 'm1',
    title: 'Créer une affiche',
    brand: 'Restaurant Le Méridien',
    icon: 'fa-utensils',
    color: '#F59E0B',
    reward: 25,
    duration: '2 jours',
    description: 'Créez une affiche publicitaire appétissante pour le nouveau menu du restaurant : plat principal, prix et slogan court.',
    rules: [
      'Format vertical (affiche)',
      'Style moderne et coloré',
      'Mentionner « Nouveau menu » et un prix',
      'Image créée avec l’IA de votre choix (ChatGPT, Gemini…)',
    ],
  },
  {
    id: 'm2',
    title: 'Créer un logo',
    brand: 'Boutique Mercedes Style',
    icon: 'fa-gem',
    color: '#8B5CF6',
    reward: 30,
    duration: '3 jours',
    description: 'Proposez un logo élégant et mémorable pour cette boutique de mode : initiales « MS » intégrées au design.',
    rules: [
      'Format carré',
      'Style minimaliste et premium',
      'Initiales « MS » visibles',
      'Image créée avec l’IA de votre choix',
    ],
  },
  {
    id: 'm3',
    title: 'Visuel publicitaire',
    brand: 'Immobilier Prestige',
    icon: 'fa-building',
    color: '#3B82F6',
    reward: 25,
    duration: '2 jours',
    description: 'Réalisez un visuel de promotion pour un appartement de standing : façade moderne, ciel dégagé, texte d’accroche.',
    rules: [
      'Format paysage',
      'Style lumineux et professionnel',
      'Ajouter le slogan « Vivez ailleurs »',
      'Image créée avec l’IA de votre choix',
    ],
  },
  {
    id: 'm4',
    title: 'Illustration événement',
    brand: 'Fête de la Jeunesse',
    icon: 'fa-music',
    color: '#EC4899',
    reward: 20,
    duration: '5 jours',
    description: 'Illustrez l’affiche de la fête de la jeunesse : ambiance festive, jeunes qui dansent, date de l’événement.',
    rules: [
      'Format vertical',
      'Ambiance joyeuse et dynamique',
      'Afficher la date du 11 février',
      'Image créée avec l’IA de votre choix',
    ],
  },
  {
    id: 'm5',
    title: 'Bannière réseaux sociaux',
    brand: 'Agence Digitale Nova',
    icon: 'fa-bullhorn',
    color: '#14B8A6',
    reward: 30,
    duration: '1 jour',
    description: 'Créez une bannière promotionnelle pour la page de l’agence : services clés et appel à l’action « Nous contacter ».',
    rules: [
      'Format bannière horizontale',
      'Style épuré, 3 couleurs maximum',
      'Appel à l’action visible',
      'Image créée avec l’IA de votre choix',
    ],
  },
];

const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

interface SimpleState {
  balance: number;              // solde disponible (caution non incluse)
  missionTotalEarned: number;   // gains missions cumulés
  todayEarned: number;
  todayValidated: number;
  submissionsToday: number;
  reservedMissionIds: string[];
  invest: { invested: number; totalEarned: number; claimedToday: boolean };
  referralCount: number;
  cautionBalance: number;
  loanRequested: boolean;
  myImages: MyImage[];
  transactions: Tx[];
  adminUsers: AdminUserRow[];

  submitImage: (missionId: string) => { ok: boolean; reason?: string };
  validateImage: (imageId: string) => void;
  refuseImage: (imageId: string) => void;
  deposit: (amount: number) => boolean;
  withdraw: (amount: number) => boolean;
  claimDailyGains: () => { ok: boolean; reason?: string; gain?: number };
  payCaution: () => boolean;
  requestLoan: () => { ok: boolean; reason?: string };
}

export const useSimpleStore = create<SimpleState>((set, get) => ({
  balance: 1850,
  missionTotalEarned: 1850,
  todayEarned: 175,
  todayValidated: 7,
  submissionsToday: 7,
  reservedMissionIds: ['m2', 'm3'],
  invest: { invested: 0, totalEarned: 0, claimedToday: false },
  referralCount: 3,
  cautionBalance: 0,
  loanRequested: false,
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
    { id: 'u-1', name: 'Richard (vous)', imagesSubmitted: 22, imagesValidated: 19, imagesPending: 1, invested: 0, earned: 1850, lastActive: 'en ligne' },
    { id: 'u-2', name: 'Awa D.', imagesSubmitted: 18, imagesValidated: 16, imagesPending: 2, invested: 2000, earned: 1420, lastActive: 'il y a 5 min' },
    { id: 'u-3', name: 'Moussa T.', imagesSubmitted: 12, imagesValidated: 10, imagesPending: 0, invested: 500, earned: 860, lastActive: 'il y a 1 h' },
    { id: 'u-4', name: 'Fatou B.', imagesSubmitted: 9, imagesValidated: 7, imagesPending: 1, invested: 1000, earned: 610, lastActive: 'il y a 3 h' },
    { id: 'u-5', name: 'Ibrahim S.', imagesSubmitted: 5, imagesValidated: 4, imagesPending: 0, invested: 0, earned: 340, lastActive: 'hier' },
  ],

  /* ---- Soumettre une image (flux mission) ---- */
  submitImage: (missionId) => {
    const s = get();
    if (s.submissionsToday >= DAILY_IMAGE_LIMIT) {
      return { ok: false, reason: `Limite de ${DAILY_IMAGE_LIMIT} images par jour atteinte.` };
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
      myImages: [img, ...st.myImages],
      adminUsers: st.adminUsers.map((u) => u.id === 'u-1'
        ? { ...u, imagesSubmitted: u.imagesSubmitted + 1, imagesPending: u.imagesPending + 1, lastActive: 'en ligne' }
        : u),
    }));
    return { ok: true };
  },

  /* ---- Admin : valider / refuser une image en attente ---- */
  validateImage: (imageId) => {
    const s = get();
    const img = s.myImages.find((i) => i.id === imageId);
    if (!img || img.status !== 'pending') return;
    set((st) => ({
      myImages: st.myImages.map((i) => (i.id === imageId ? { ...i, status: 'validated' } : i)),
      balance: st.balance + img.reward,
      missionTotalEarned: st.missionTotalEarned + img.reward,
      todayEarned: st.todayEarned + img.reward,
      todayValidated: st.todayValidated + 1,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Image validée — ${img.missionTitle}`, amount: img.reward, kind: 'mission' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
      adminUsers: st.adminUsers.map((u) => u.id === 'u-1'
        ? { ...u, imagesPending: Math.max(0, u.imagesPending - 1), imagesValidated: u.imagesValidated + 1, earned: u.earned + img.reward }
        : u),
    }));
  },

  refuseImage: (imageId) => {
    set((st) => ({
      myImages: st.myImages.map((i) => (i.id === imageId ? { ...i, status: 'refused' } : i)),
      adminUsers: st.adminUsers.map((u) => u.id === 'u-1'
        ? { ...u, imagesPending: Math.max(0, u.imagesPending - 1) }
        : u),
    }));
  },

  /* ---- Investir : déposer / retirer ---- */
  deposit: (amount) => {
    if (amount <= 0) return false;
    set((st) => ({
      balance: st.balance - amount,
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

  /* ---- Gains journaliers : 5 % du montant investi ---- */
  claimDailyGains: () => {
    const s = get();
    if (s.invest.invested <= 0) return { ok: false, reason: 'Vous n’avez rien investi pour l’instant.' };
    if (s.invest.claimedToday) return { ok: false, reason: 'Gains du jour déjà réclamés. Revenez demain !' };
    const gain = Math.round(s.invest.invested * INVEST_RATE);
    set((st) => ({
      balance: st.balance + gain,
      invest: { ...st.invest, totalEarned: st.invest.totalEarned + gain, claimedToday: true },
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Gains journaliers (${Math.round(INVEST_RATE * 100)} %)`, amount: gain, kind: 'daily' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return { ok: true, gain };
  },

  /* ---- Caution : la moitié du prêt, versée depuis le solde ---- */
  payCaution: () => {
    const s = get();
    if (s.cautionBalance >= CAUTION_REQUIRED) return false;
    if (s.balance < CAUTION_REQUIRED) return false;
    set((st) => ({
      balance: st.balance - CAUTION_REQUIRED,
      cautionBalance: CAUTION_REQUIRED,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: 'Caution verrouillée (garantie prêt)', amount: -CAUTION_REQUIRED, kind: 'caution' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return true;
  },

  /* ---- Demande du prêt : toutes les conditions doivent être remplies ---- */
  requestLoan: () => {
    const s = get();
    if (s.loanRequested) return { ok: false, reason: 'Demande déjà envoyée.' };
    if (s.balance < LOAN_BALANCE_THRESHOLD) return { ok: false, reason: `Solde insuffisant (${LOAN_BALANCE_THRESHOLD} F requis).` };
    if (s.cautionBalance < CAUTION_REQUIRED) return { ok: false, reason: 'Caution non versée.' };
    if (s.referralCount < REFERRAL_REQUIRED) return { ok: false, reason: `Parrainages insuffisants (${s.referralCount}/${REFERRAL_REQUIRED}).` };
    set((st) => ({
      loanRequested: true,
      balance: st.balance + LOAN_AMOUNT,
      transactions: [{ id: 't-' + Math.random().toString(36).slice(2, 8), label: `Micro-prêt débloqué (${LOAN_AMOUNT} F)`, amount: LOAN_AMOUNT, kind: 'loan' as const, date: `Aujourd'hui — ${now()}` }, ...st.transactions],
    }));
    return { ok: true };
  },
}));
