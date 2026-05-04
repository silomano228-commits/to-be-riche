import { create } from 'zustand';

export interface Transaction {
  id: string;
  type: string;
  amount: number;
  gain: number;
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
  invested: number;
  earnings: number;
  hasInvested: boolean;
  role: string;
  depositCount: number;
  transactions: Transaction[];
  project: Project | null;
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
  setUser: (user: AppUser | null) => void;
  clearUser: () => void;
  setPage: (page: string) => void;
  setLoading: (loading: boolean) => void;
  setShowSplash: (show: boolean) => void;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  addNotification: (id: string, text: string) => void;
  removeNotification: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  currentPage: 'profile',
  isLoading: false,
  showSplash: true,
  toasts: [],
  notifications: [],
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null, currentPage: 'profile' }),
  setPage: (page) => set({ currentPage: page }),
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

export function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
