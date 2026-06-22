'use client';

import { useState, useEffect, useRef } from 'react';
import { getRandomAd, type AdItem } from '@/lib/ads';

// Hook that triggers a random company ad banner when the user changes tabs.
// 60% probability per tab change (not every time — would be annoying).
// Skips ads on the 'auth' page (login/register screen).
export function useTabChangeAd(currentPage: string) {
  const [currentAd, setCurrentAd] = useState<AdItem | null>(null);
  const prevPageRef = useRef<string>(currentPage);
  const lastAdIdRef = useRef<string | undefined>(undefined);
  const isFirstRenderRef = useRef<boolean>(true);

  useEffect(() => {
    // Skip on first render and on auth page
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevPageRef.current = currentPage;
      return;
    }

    if (currentPage === prevPageRef.current) return;
    const prevPage = prevPageRef.current;
    prevPageRef.current = currentPage;

    // Don't show ads when entering or leaving the auth page
    if (currentPage === 'auth' || prevPage === 'auth') return;

    // 60% probability to show an ad on tab change
    if (Math.random() < 0.6) {
      const ad = getRandomAd(lastAdIdRef.current);
      lastAdIdRef.current = ad.id;
      setCurrentAd(ad);
    }
  }, [currentPage]);

  const dismissAd = () => setCurrentAd(null);

  return { currentAd, dismissAd };
}
