'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';

// Generate fake withdrawal entries with realistic codes and amounts
function generateFakeEntries(): Array<{ code: string; type: 'jeu' | 'investissement' | 'projet'; amount: number; icon: string }> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const genCode = () => 'BR-' + Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

  const entries: Array<{ code: string; type: 'jeu' | 'investissement' | 'projet'; amount: number; icon: string }> = [];

  for (let i = 0; i < 10; i++) {
    entries.push({ code: genCode(), type: 'jeu', amount: parseFloat((Math.random() * 48 + 2).toFixed(2)), icon: 'fa-dice' });
  }
  for (let i = 0; i < 10; i++) {
    entries.push({ code: genCode(), type: 'investissement', amount: parseFloat((Math.random() * 77 + 3).toFixed(2)), icon: 'fa-chart-line' });
  }
  for (let i = 0; i < 8; i++) {
    entries.push({ code: genCode(), type: 'projet', amount: parseFloat((Math.random() * 115 + 5).toFixed(2)), icon: 'fa-building' });
  }

  // Shuffle
  for (let i = entries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [entries[i], entries[j]] = [entries[j], entries[i]];
  }

  return entries;
}

const FAKE_ENTRIES = generateFakeEntries();

const TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; borderColor: string; glow: string }> = {
  jeu: {
    label: 'Jeu',
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    glow: 'rgba(245, 158, 11, 0.12)',
  },
  investissement: {
    label: 'Invest.',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
    glow: 'rgba(34, 197, 94, 0.12)',
  },
  projet: {
    label: 'Projet',
    color: '#8B5CF6',
    bgColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
    glow: 'rgba(139, 92, 246, 0.12)',
  },
};

function formatTickerMoney(v: number): string {
  return (v || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $';
}

export default function WithdrawalTicker() {
  const { user, currentPage } = useAppStore();
  const [currentEntry, setCurrentEntry] = useState(FAKE_ENTRIES[0]);
  const [visible, setVisible] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clean up all timers
  const clearAllTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  // Schedule the next notification
  const scheduleNext = () => {
    clearAllTimers();

    // Random delay between 4-10 seconds
    const delay = Math.floor(Math.random() * 6000) + 4000;
    const t1 = setTimeout(() => {
      // Pick a random entry
      const nextEntry = FAKE_ENTRIES[Math.floor(Math.random() * FAKE_ENTRIES.length)];
      setCurrentEntry(nextEntry);
      setVisible(true);

      // Auto-hide after 3.5 seconds
      const t2 = setTimeout(() => {
        setVisible(false);

        // Wait for hide animation, then schedule next
        const t3 = setTimeout(() => {
          scheduleNext();
        }, 600);

        timersRef.current.push(t3);
      }, 3500);

      timersRef.current.push(t2);
    }, delay);

    timersRef.current.push(t1);
  };

  // Start the cycle
  useEffect(() => {
    if (!user) return;

    // Initial delay before first notification (2-5 seconds)
    const initialDelay = Math.floor(Math.random() * 3000) + 2000;
    const initialTimer = setTimeout(() => {
      scheduleNext();
    }, initialDelay);

    timersRef.current.push(initialTimer);

    return () => {
      clearAllTimers();
    };
  }, [user]);

  if (!user) return null;

  // Hide during trading
  if (currentPage === 'trading') return null;

  const config = TYPE_CONFIG[currentEntry.type];

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
      style={{ paddingTop: '8px' }}
    >
      <div
        className="pointer-events-auto cursor-pointer"
        style={{
          maxWidth: '220px',
          transform: visible ? 'translateY(0)' : 'translateY(-120%)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
        }}
        onClick={() => setVisible(false)}
      >
        <div
          className="rounded-full px-3 py-1.5 backdrop-blur-xl border shadow-lg flex items-center gap-1.5"
          style={{
            backgroundColor: 'rgba(255,255,255,0.92)',
            borderColor: config.borderColor,
            boxShadow: `0 4px 16px ${config.glow}, 0 1px 4px rgba(0,0,0,0.04)`,
          }}
        >
          {/* Icon */}
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: config.bgColor }}
          >
            <i className={`fas ${currentEntry.icon} text-[0.45rem]`} style={{ color: config.color }}></i>
          </div>

          {/* Compact pill: Type • +Amount */}
          <span
            className="text-[0.55rem] font-bold uppercase tracking-[0.3px]"
            style={{ color: config.color }}
          >
            {config.label}
          </span>
          <span className="text-[0.35rem] text-[rgba(0,0,0,0.15)]">•</span>
          <span className="text-[0.65rem] font-black" style={{ color: '#16A34A' }}>
            +{formatTickerMoney(currentEntry.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
