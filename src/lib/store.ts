import { create } from 'zustand';

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  detail?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  amount: number;
  receivedAmount: number;
  description: string;
  status: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  balance: number;
  investBalance: number;
  tradeBalance: number;
  projectBalance: number;
  hasInvested: boolean;
  role: string;
  depositCount: number;
  transactions: Transaction[];
  totalProfit: number;
  totalLoss: number;
  canWithdraw?: boolean;
  firstDepositAt?: string | null;
  hoursUntilWithdrawal?: number;
  referralCode?: string;
  referredByCode?: string | null;
  referralCount?: number;
  completedWithdrawals?: number;
  requiredReferrals?: number;
  needsReferral?: boolean;
  investments?: any[];
  activeTradesCount?: number;
  activeEnterprisesCount?: number;
  claimableInvestments?: number;
  unlockedLevel?: number;
  // Jeune Élan — Mission & Micro-Prêt
  missionBalance?: number;
  missionTotalEarned?: number;
  missionValidatedToday?: number;
  missionDate?: string;
  cautionBalance?: number;
  cautionStatus?: string;
  personalDepositBalance?: number;
  userLevel?: number;
  reputationScore?: number;
  dateOfBirth?: string;
  country?: string;
  city?: string;
  paymentMethod?: string;
  paymentAddress?: string;
  accountVerified?: string;
  lastActivityAt?: string;
  validatedReferralCount?: number;
  hasOverdueLoan?: boolean;
  // Casino
  gameSpinsUsed?: number;
  gameSpinsDate?: string;
  // Projets & gains
  earnings?: number;
  project?: Project | null;
  // Plateforme vidéo
  videoBalance?: number;
  videoDepositRequired?: boolean;
  videoFirstWatchAt?: string | null;
  videoCycleNumber?: number;
  gameTotalWon?: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Notification {
  id: string;
  text: string;
}

interface AppState {
  user: AppUser | null;
  currentPage: string;
  isLoading: boolean;
  showSplash: boolean;
  toasts: Toast[];
  notifications: Notification[];
  depositTargetAccount: string | null;
  withdrawSourceAccount: string | null;
  setUser: (user: AppUser | null) => void;
  clearUser: () => void;
  setPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
  setShowSplash: (showSplash: boolean) => void;
  setDepositTarget: (account: string | null) => void;
  setWithdrawSource: (account: string | null) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addNotification: (id: string, text: string) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  currentPage: 'home',
  isLoading: false,
  showSplash: true,
  toasts: [],
  notifications: [],
  depositTargetAccount: null,
  withdrawSourceAccount: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null, currentPage: 'auth', toasts: [] }),
  setPage: (page) => set({ currentPage: page }),
  setDepositTarget: (account) => set({ depositTargetAccount: account }),
  setWithdrawSource: (account) => set({ withdrawSourceAccount: account }),
  setLoading: (isLoading) => set({ isLoading }),
  setShowSplash: (showSplash) => set({ showSplash }),
  addToast: (message, type) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  addNotification: (id, text) => {
    const nId = Math.random().toString(36).slice(2);
    set((s) => ({ notifications: [...s.notifications.slice(-2), { id: nId, text: `ID-${id} ${text}` }] }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== nId) }));
    }, 4000);
  },
  removeNotification: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));

export function formatMoney(v: number): string {
  return (v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
}

export function formatCfa(v: number): string {
  return (v || 0).toLocaleString('fr-FR') + ' FCFA';
}

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  return fetch(url, { ...options, headers, credentials: 'same-origin' });
}

export async function refreshUser(): Promise<void> {
  try {
    const res = await authFetch('/api/auth/session');
    const data = await res.json();
    if (data.success && data.user) {
      useAppStore.getState().setUser(data.user);
    }
  } catch { /* */ }
}
