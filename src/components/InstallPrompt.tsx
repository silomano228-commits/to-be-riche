'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallPlatform = 'android' | 'ios' | 'desktop';

function getInitialInstallState() {
  if (typeof window === 'undefined') return { dismissed: false, platform: 'desktop' as InstallPlatform };
  // Check if already dismissed within 7 days
  const dismissedAt = localStorage.getItem('be-rich-install-dismissed');
  if (dismissedAt) {
    const elapsed = Date.now() - parseInt(dismissedAt);
    if (elapsed < 7 * 24 * 60 * 60 * 1000) {
      return { dismissed: true, platform: 'desktop' as InstallPlatform };
    }
  }
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return { dismissed: true, platform: 'desktop' as InstallPlatform };
  }
  if ((navigator as any).standalone === true) {
    return { dismissed: true, platform: 'desktop' as InstallPlatform };
  }
  // Detect platform
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) {
    return { dismissed: false, platform: 'ios' as InstallPlatform };
  } else if (/Android/.test(ua)) {
    return { dismissed: false, platform: 'android' as InstallPlatform };
  }
  return { dismissed: false, platform: 'desktop' as InstallPlatform };
}

export default function InstallPrompt() {
  const { user } = useAppStore();
  const initialState = getInitialInstallState();
  const [show, setShow] = useState(false);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(initialState.dismissed);
  const [platform] = useState<InstallPlatform>(initialState.platform);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // Listen for beforeinstallprompt (Android Chrome & Desktop Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      // Delay showing for better UX
      setTimeout(() => setShow(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // If iOS, show after delay (no beforeinstallprompt on iOS)
    if (platform === 'ios') {
      setTimeout(() => setShow(true), 3000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed, platform]);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const { outcome } = await installEvent.userChoice;
      if (outcome === 'accepted') {
        setShow(false);
      }
    } catch {
      // Fallback
    }
    setInstallEvent(null);
    setInstalling(false);
  }, [installEvent]);

  const handleDismiss = useCallback(() => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('be-rich-install-dismissed', Date.now().toString());
  }, []);

  const handleIOSInstall = () => {
    setShowIOSGuide(true);
  };

  if (!show || dismissed) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10000] transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: show ? 1 : 0,
        }}
        onClick={handleDismiss}
      />

      {/* Prompt Card */}
      <div
        className="fixed z-[10001] w-[92%] max-w-[380px] transition-all duration-500"
        style={{
          left: '50%',
          bottom: '24px',
          transform: show ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(100%)',
          opacity: show ? 1 : 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: '#FFFFFF',
            boxShadow: '0 25px 60px rgba(0,0,0,0.25), 0 8px 24px rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.15)',
          }}
        >
          {/* Header with gradient */}
          <div
            className="relative px-6 pt-6 pb-4 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
            }}
          >
            {/* Decorative circles */}
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

            <div className="relative flex items-start gap-4">
              {/* App Icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                <img src="/icon-192.png" alt="Be Rich" className="w-10 h-10 rounded-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[1.05rem] font-black text-white mb-0.5">Installer Be Rich</h3>
                <p className="text-[0.72rem] text-white/80 leading-relaxed">
                  Accédez plus rapidement à vos investissements, directement depuis votre écran d&apos;accueil
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { icon: 'fa-bolt', label: 'Rapide', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
                { icon: 'fa-shield-alt', label: 'Sécurisé', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
                { icon: 'fa-wifi', label: 'Hors ligne', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
              ].map((f, i) => (
                <div key={i} className="text-center">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-1.5"
                    style={{ background: f.bg }}
                  >
                    <i className={`fas ${f.icon} text-[0.8rem]`} style={{ color: f.color }}></i>
                  </div>
                  <div className="text-[0.65rem] font-semibold" style={{ color: 'rgba(0,0,0,0.55)' }}>{f.label}</div>
                </div>
              ))}
            </div>

            {/* iOS-specific guide */}
            {showIOSGuide && platform === 'ios' ? (
              <div
                className="rounded-xl p-4 mb-4"
                style={{
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.06)',
                }}
              >
                <div className="text-[0.82rem] font-bold mb-2" style={{ color: '#1F2937' }}>
                  Comment installer sur iPhone/iPad
                </div>
                <div className="space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[0.65rem] font-bold"
                      style={{ background: '#22C55E', color: '#050506' }}
                    >1</div>
                    <p className="text-[0.72rem] leading-relaxed" style={{ color: 'rgba(0,0,0,0.65)' }}>
                      Appuyez sur l&apos;icône <strong style={{ color: '#1F2937' }}><i className="fas fa-arrow-up-from-bracket"></i> Partager</strong> en bas de Safari
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[0.65rem] font-bold"
                      style={{ background: '#22C55E', color: '#050506' }}
                    >2</div>
                    <p className="text-[0.72rem] leading-relaxed" style={{ color: 'rgba(0,0,0,0.65)' }}>
                      Faites défiler et appuyez sur <strong style={{ color: '#1F2937' }}>Sur l&apos;écran d&apos;accueil</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[0.65rem] font-bold"
                      style={{ background: '#22C55E', color: '#050506' }}
                    >3</div>
                    <p className="text-[0.72rem] leading-relaxed" style={{ color: 'rgba(0,0,0,0.65)' }}>
                      Appuyez sur <strong style={{ color: '#1F2937' }}>Ajouter</strong> en haut à droite
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="flex gap-2.5">
              {platform === 'ios' && !showIOSGuide ? (
                <button
                  onClick={handleIOSInstall}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    color: '#050506',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
                  }}
                >
                  <i className="fas fa-arrow-up-from-bracket text-[0.75rem]"></i>
                  Voir comment installer
                </button>
              ) : installEvent ? (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    color: '#050506',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
                  }}
                >
                  {installing ? (
                    <div className="w-4 h-4 border-2 border-[rgba(0,0,0,0.2)] border-t-[#050506] rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <>
                      <i className="fas fa-download text-[0.75rem]"></i>
                      Installer l&apos;application
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-3.5 rounded-xl font-bold text-[0.85rem] border-none cursor-pointer transition-all active:scale-[0.97] flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                    color: '#050506',
                    boxShadow: '0 4px 16px rgba(34,197,94,0.35)',
                  }}
                >
                  <i className="fas fa-check-circle text-[0.75rem]"></i>
                  Continuer sur le web
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="py-3.5 px-5 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95"
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  color: 'rgba(0,0,0,0.45)',
                }}
              >
                Plus tard
              </button>
            </div>
          </div>

          {/* Bottom safe area for mobile */}
          <div className="h-[env(safe-area-inset-bottom)]" style={{ background: '#FFFFFF' }} />
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
