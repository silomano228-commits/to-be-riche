'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, Modal, INVEST_LEVELS, ENTERPRISE_TYPES, ENTERPRISE_NAMES } from '@/components/shared';

export default function ProfileScreen() {
  const { user, clearUser, setPage, addToast } = useAppStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [showReferrals, setShowReferrals] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadReferrals = async () => {
    try {
      const res = await authFetch('/api/referral/list');
      const data = await res.json();
      if (data.success) { setReferrals(data.referrals || []); setShowReferrals(true); }
    } catch { /* */ }
  };

  const handleCopyCode = async () => {
    if (!user?.referralCode) return;
    try {
      await navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      addToast('Code copié !', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = user.referralCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      addToast('Code copié !', 'success');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogout = async () => {
    try { await fetch('/api/auth/logout'); } catch { /* */ }
    clearUser();
    addToast('Déconnecté', 'info');
  };

  if (!user) return null;

  const requiredReferrals = user.requiredReferrals || 0;
  const currentReferrals = user.referralCount || 0;
  const needsMore = Math.max(0, requiredReferrals - currentReferrals);
  const referralProgress = requiredReferrals > 0 ? Math.min(100, (currentReferrals / requiredReferrals) * 100) : 100;

  return (
    <>
      <style>{`
        @keyframes avatarBreathe {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 20px 4px rgba(34,197,94,0.15); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <Header title="Profil" icon="fa-user" iconColor="#22C55E" leftElement={<button onClick={() => setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer border-none mr-1" style={{ background: 'rgba(0,0,0,0.06)', color: 'rgba(0,0,0,0.55)' }}><i className="fas fa-arrow-left text-[0.8rem]"></i></button>} />
      <div className="px-[18px] py-4 flex-1 w-full overflow-y-auto min-h-0" style={{ background: '#F8F9FA' }}>

        {/* User Card — white with gold avatar */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 mb-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          {/* Decorative subtle elements */}
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: 'rgba(34,197,94,0.06)' }}></div>
          <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full" style={{ background: 'rgba(34,197,94,0.05)' }}></div>

          <div className="flex items-center gap-4 mb-4 relative">
            {/* Gold avatar */}
            <div className="relative">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-[1.3rem]"
                style={{
                  background: 'linear-gradient(135deg, #22C55E, #4ADE80)',
                  color: '#050506',
                  boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
                  animation: 'avatarBreathe 3s ease-in-out infinite',
                }}
              >
                {esc(user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2))}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full" style={{ background: '#22C55E', border: '2px solid #FFFFFF' }}></div>
            </div>
            <div>
              <div className="text-[1.1rem] font-bold" style={{ color: '#1F2937' }}>{esc(user.name)}</div>
              <div className="text-[0.75rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>{esc(user.email)}</div>
              {user.role === 'admin' && (
                <span
                  className="inline-flex items-center gap-1 text-[0.6rem] px-2 py-0.5 rounded-full mt-1 font-semibold"
                  style={{
                    background: 'rgba(34,197,94,0.12)',
                    color: '#4ADE80',
                  }}
                >
                  <i className="fas fa-shield-alt text-[0.5rem]"></i>Admin
                </span>
              )}
            </div>
          </div>

          {/* Account grid — light bg with gold numbers */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="text-[0.6rem] uppercase" style={{ color: 'rgba(0,0,0,0.35)' }}>Principal</div>
              <div className="text-[0.95rem] font-black" style={{ color: '#4ADE80' }}>{formatMoney(user.balance)}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="text-[0.6rem] uppercase" style={{ color: 'rgba(0,0,0,0.35)' }}>Investissement</div>
              <div className="text-[0.95rem] font-black" style={{ color: '#4ADE80' }}>{formatMoney(user.investBalance)}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="text-[0.6rem] uppercase" style={{ color: 'rgba(0,0,0,0.35)' }}>Trading</div>
              <div className="text-[0.95rem] font-black" style={{ color: '#4ADE80' }}>{formatMoney(user.tradeBalance)}</div>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="text-[0.6rem] uppercase" style={{ color: 'rgba(0,0,0,0.35)' }}>Projet</div>
              <div className="text-[0.95rem] font-black" style={{ color: '#4ADE80' }}>{formatMoney(user.projectBalance)}</div>
            </div>
          </div>
        </div>

        {/* Referral Section — white cards, gold accent */}
        <div
          className="rounded-2xl p-4 mb-4"
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="flex items-center gap-2.5 mb-3">
            <i className="fas fa-gift" style={{ color: '#F59E0B' }}></i>
            <h4 className="text-[0.88rem] font-bold" style={{ color: '#1F2937' }}>Parrainage</h4>
          </div>

          {/* Referral Code — light bg, gold accent */}
          <div
            className="rounded-xl p-3 mb-3 flex items-center justify-between"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.1)',
            }}
          >
            <div>
              <div className="text-[0.68rem] mb-0.5" style={{ color: 'rgba(0,0,0,0.45)' }}>Votre code</div>
              <div className="text-[1.1rem] font-mono font-black" style={{ color: '#F59E0B' }}>{user.referralCode}</div>
            </div>
            <button
              onClick={handleCopyCode}
              className="w-10 h-10 rounded-xl flex items-center justify-center border-none cursor-pointer transition-all"
              style={{
                background: copied ? 'rgba(245,158,11,0.3)' : '#F59E0B',
                color: copied ? '#F59E0B' : '#050506',
                boxShadow: copied ? 'none' : '0 2px 12px rgba(245,158,11,0.25)',
              }}
            >
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-[0.85rem]`}></i>
            </button>
          </div>

          {/* Referral Progress — light bg, gold bar */}
          {requiredReferrals > 0 && (
            <div
              className="rounded-xl p-3 mb-3"
              style={{
                background: 'rgba(0,0,0,0.04)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.72rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>Progrès pour retrait</span>
                <span className="text-[0.72rem] font-bold" style={{ color: '#F59E0B' }}>{currentReferrals}/{requiredReferrals}</span>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden mb-1.5" style={{ background: 'rgba(0,0,0,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${referralProgress}%`,
                    background: referralProgress >= 100
                      ? 'linear-gradient(90deg, #22C55E, #4ADE80)'
                      : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                  }}
                ></div>
              </div>
              {needsMore > 0 ? (
                <p className="text-[0.65rem]" style={{ color: 'rgba(34,197,94,0.7)' }}>
                  <i className="fas fa-info-circle mr-1"></i>Encore <strong>{needsMore}</strong> filleul{needsMore > 1 ? 's' : ''} requis pour le retrait
                </p>
              ) : (
                <p className="text-[0.65rem]" style={{ color: '#22C55E' }}>
                  <i className="fas fa-check-circle mr-1"></i>Condition de parrainage remplie !
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <span className="text-[0.75rem]" style={{ color: 'rgba(0,0,0,0.45)' }}>Filleuls actifs</span>
            <span className="text-[0.75rem] font-bold" style={{ color: '#F59E0B' }}>{user.referralCount || 0}</span>
          </div>
          <button
            onClick={loadReferrals}
            className="w-full py-2.5 rounded-xl font-semibold text-[0.82rem] border-none cursor-pointer transition-all active:scale-[0.98]"
            style={{
              background: 'rgba(245,158,11,0.1)',
              color: '#F59E0B',
              border: '1px solid rgba(245,158,11,0.15)',
            }}
          >
            <i className="fas fa-list mr-1"></i>Voir mes filleuls
          </button>
        </div>

        {/* Referral List — white cards */}
        {showReferrals && (
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
            }}
          >
            <h4 className="text-[0.82rem] font-bold mb-2" style={{ color: '#1F2937' }}>Mes filleuls ({referrals.length})</h4>
            {referrals.length === 0 ? (
              <p className="text-[0.75rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>Aucun filleul pour le moment.</p>
            ) : referrals.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: i < referrals.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}
              >
                <div>
                  <div className="text-[0.78rem] font-semibold" style={{ color: '#1F2937' }}>{esc(r.name)}</div>
                  <div className="text-[0.65rem]" style={{ color: 'rgba(0,0,0,0.35)' }}>{esc(r.email)}</div>
                </div>
                <span
                  className="text-[0.65rem] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: r.hasInvested ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)',
                    color: r.hasInvested ? '#22C55E' : 'rgba(239,68,68,0.6)',
                  }}
                >
                  {r.hasInvested ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Analytics Button — white bg with gold icon */}
        <button
          onClick={() => setPage('analytics')}
          className="w-full py-3.5 rounded-xl font-bold text-[0.88rem] border-none cursor-pointer mb-3 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
          style={{
            background: '#FFFFFF',
            color: '#1F2937',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
            <i className="fas fa-chart-bar text-[0.75rem]" style={{ color: '#6366F1' }}></i>
          </div>
          Analyses
        </button>

        {/* Admin Button — white bg with gold icon */}
        {user.role === 'admin' && (
          <button
            onClick={() => setPage('admin')}
            className="w-full py-3.5 rounded-xl font-bold text-[0.88rem] border-none cursor-pointer mb-3 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
            style={{
              background: '#FFFFFF',
              color: '#1F2937',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)' }}>
              <i className="fas fa-shield-alt text-[0.75rem]" style={{ color: '#6366F1' }}></i>
            </div>
            Panneau Admin
          </button>
        )}

        {/* Logout — light bg with subtle red text */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3.5 rounded-xl font-semibold text-[0.88rem] cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(0,0,0,0.04)',
            border: '1.5px solid rgba(239,68,68,0.12)',
            color: 'rgba(239,68,68,0.6)',
          }}
        >
          <i className="fas fa-sign-out-alt"></i> Déconnexion
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm z-[6000] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
          onClick={() => setModalOpen(false)}
        >
          <div
            className="rounded-2xl p-7 w-[88%] max-w-[320px] text-center"
            style={{
              background: '#FFFFFF',
              border: '1px solid rgba(0,0,0,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
              animation: 'modalIn 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-[1.05rem] font-extrabold" style={{ color: '#1F2937' }}>Déconnexion</h3>
            <p className="text-[0.82rem] mb-5 leading-relaxed" style={{ color: 'rgba(0,0,0,0.55)' }}>Voulez-vous vous déconnecter ?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95"
                style={{
                  background: 'rgba(0,0,0,0.05)',
                  border: '1.5px solid rgba(0,0,0,0.1)',
                  color: 'rgba(0,0,0,0.55)',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl text-white font-semibold text-[0.82rem] cursor-pointer transition-all active:scale-95"
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#F87171',
                }}
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
