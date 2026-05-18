'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, INVEST_LEVELS, ENTERPRISE_TYPES } from '@/components/shared';

// ==================== MOCK ANALYSIS DATA ====================
const TRADING_ASSETS = [
  { id: 'brx', name: 'BRX Token', price: 1.247, change: +3.2, signal: 'buy' as const, rsi: 42, macd: 'haussier', volatility: 'Modérée', strength: 72 },
  { id: 'nova', name: 'NovaTech Coin', price: 8.891, change: -1.8, signal: 'sell' as const, rsi: 68, macd: 'baissier', volatility: 'Élevée', strength: 55 },
  { id: 'gold', name: 'GoldFund ETF', price: 24.56, change: +0.9, signal: 'hold' as const, rsi: 51, macd: 'neutre', volatility: 'Faible', strength: 64 },
  { id: 'energy', name: 'EnergyPlus Index', price: 5.123, change: +2.1, signal: 'buy' as const, rsi: 38, macd: 'haussier', volatility: 'Modérée', strength: 78 },
];

const PROJECT_SECTORS = [
  { name: 'Technologie', trend: 'Expansion', confidence: 82, avgReturn: '+25%', momentum: 'Fort', risk: 'Modéré', hot: true },
  { name: 'Énergie Verte', trend: 'Croissance', confidence: 75, avgReturn: '+20%', momentum: 'Moyen', risk: 'Faible', hot: true },
  { name: 'Immobilier', trend: 'Stable', confidence: 68, avgReturn: '+15%', momentum: 'Stable', risk: 'Faible', hot: false },
  { name: 'Finance', trend: 'Volatil', confidence: 60, avgReturn: '+30%', momentum: 'Variable', risk: 'Élevé', hot: false },
  { name: 'Agroalimentaire', trend: 'Croissance', confidence: 71, avgReturn: '+18%', momentum: 'Moyen', risk: 'Modéré', hot: false },
  { name: 'Santé & BioTech', trend: 'Expansion', confidence: 77, avgReturn: '+22%', momentum: 'Fort', risk: 'Modéré', hot: true },
];

const MARKET_INDICES = [
  { name: 'Indice Confiance Marché', value: 68, prev: 65, label: 'Optimiste' },
  { name: 'Indice Volatilité', value: 34, prev: 41, label: 'Calme' },
  { name: 'Indice Momentum', value: 72, prev: 69, label: 'Fort' },
  { name: 'Indice Risque Global', value: 41, prev: 38, label: 'Modéré' },
];

function SignalBadge({ signal }: { signal: 'buy' | 'sell' | 'hold' }) {
  const config = {
    buy: { bg: 'bg-[#DCFCE7]', text: 'text-[#166534]', border: 'border-[#86EFAC]', label: 'ACHAT', icon: 'fa-arrow-up' },
    sell: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FCA5A5]', label: 'VENTE', icon: 'fa-arrow-down' },
    hold: { bg: 'bg-[#FEF9C3]', text: 'text-[#92400E]', border: 'border-[#FDE047]', label: 'HOLD', icon: 'fa-minus' },
  }[signal];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6rem] font-bold border ${config.bg} ${config.text} ${config.border}`}>
      <i className={`fas ${config.icon} text-[0.5rem]`}></i>{config.label}
    </span>
  );
}

function MiniGauge({ value, max = 100, color = '#00C853', size = 32 }: { value: number; max?: number; color?: string; size?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const strokeW = 3;
  const radius = (size - strokeW) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#F1F5F9" strokeWidth={strokeW} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={size/2} y={size/2 + 3.5} textAnchor="middle" className="fill-[#1A2332] text-[7px] font-bold">{value}</text>
    </svg>
  );
}

function ProgressBar({ value, max = 100, color = '#00C853', height = 6 }: { value: number; max?: number; color?: string; height?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height }} >
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

export default function GuideScreen() {
  const { user } = useAppStore();
  const [section, setSection] = useState<'guide' | 'trading' | 'projects'>('guide');
  const [marketPulse, setMarketPulse] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setMarketPulse(p => p + 1), 8000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;

  return (
    <>
      <Header title="Guide & Analyses" icon="fa-compass" iconColor="#FBBF24" leftElement={
        <button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none mr-1">
          <i className="fas fa-arrow-left text-[0.8rem]"></i>
        </button>
      } />

      {/* Section tabs */}
      <div className="flex gap-2 px-[18px] py-2.5 bg-white border-b border-[rgba(0,0,0,0.04)]">
        {[
          { id: 'guide' as const, label: 'Guide', icon: 'fa-book-open', color: '#FBBF24' },
          { id: 'trading' as const, label: 'Trading', icon: 'fa-bolt', color: '#3B82F6' },
          { id: 'projects' as const, label: 'Projets', icon: 'fa-building', color: '#F97316' },
        ].map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex-1 py-2 rounded-xl text-[0.72rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              section === t.id ? 'text-white shadow-[0_2px_8px_rgba(0,0,0,0.1)]' : 'bg-[#F1F5F9] text-[#64748B]'
            }`}
            style={section === t.id ? { backgroundColor: t.color } : undefined}
          >
            <i className={`fas ${t.icon} text-[0.6rem]`}></i>{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 w-full overflow-y-auto">
        <div className="px-[18px] py-4">

          {/* ============ GUIDE SECTION ============ */}
          {section === 'guide' && (
            <>
              {/* Étape 1 : Dépôt */}
              <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#00C853]">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center shrink-0 border border-[rgba(0,200,83,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#009624]">1</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1A2332]">Faire un dépôt</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">Approvisionnez votre compte</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-[#F0FDF4] rounded-xl p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="fab fa-gg-circle text-[#00C853] text-[0.7rem]"></i>
                      <span className="text-[0.72rem] font-bold text-[#166534]">Méthode TRX (Dollars)</span>
                    </div>
                    <ol className="space-y-1 text-[0.65rem] text-[#166534]/80 pl-4">
                      <li className="flex items-start gap-1.5"><span className="text-[#009624] font-bold">•</span>Allez dans <strong>Portefeuille → Déposer</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#009624] font-bold">•</span>Choisissez <strong>Dépôt en Dollars (TRX)</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#009624] font-bold">•</span>Entrez le montant en $ (min 10 $)</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#009624] font-bold">•</span>Envoyez les TRX à l'adresse admin affichée</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#009624] font-bold">•</span>Entrez votre adresse TRX pour confirmer</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#009624] font-bold">•</span>Attendez la validation par l'admin</li>
                    </ol>
                  </div>
                  <div className="bg-[#F5F3FF] rounded-xl p-2.5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="fas fa-exchange-alt text-[#7C3AED] text-[0.7rem]"></i>
                      <span className="text-[0.72rem] font-bold text-[#4C1D95]">Méthode Yas du Togo (FCFA)</span>
                    </div>
                    <ol className="space-y-1 text-[0.65rem] text-[#4C1D95]/80 pl-4">
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>Choisissez <strong>Conversion Yas du Togo</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>Entrez le montant en FCFA (min 6 000)</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>Le montant est converti automatiquement en $ et TRX</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>Entrez votre numéro Yas (8 chiffres, 90-93 ou 70-73)</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>Envoyez l'argent au numéro Yas de l'admin</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>Téléchargez Trust Wallet, créez un portefeuille TRX</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>Entrez votre adresse TRX Trust Wallet</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#7C3AED] font-bold">•</span>L'admin vous enverra les TRX sur votre Trust Wallet</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Étape 2 : Transférer vers les comptes */}
              <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#3B82F6]">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0 border border-[rgba(59,130,246,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#2563EB]">2</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1A2332]">Verser dans les comptes</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">Répartissez vos fonds selon vos objectifs</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-[rgba(0,200,83,0.1)] flex items-center justify-center shrink-0 mt-0.5"><i className="fas fa-chart-line text-[0.55rem] text-[#00C853]"></i></div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Compte d'Investissement</div>
                      <div className="text-[0.62rem] text-[#64748B]">Choisissez un palier (Micro à Elite), gagnez 5% à 12.5% par cycle. Réclamez vos gains chaque jour !</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-[rgba(59,130,246,0.1)] flex items-center justify-center shrink-0 mt-0.5"><i className="fas fa-bolt text-[0.55rem] text-[#3B82F6]"></i></div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Compte de Trading</div>
                      <div className="text-[0.62rem] text-[#64748B]">Pariez sur la hausse ou la baisse des actifs. Durée de 1 à 10 min. Consultez les analyses avant de trader !</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-[rgba(249,115,22,0.1)] flex items-center justify-center shrink-0 mt-0.5"><i className="fas fa-building text-[0.55rem] text-[#F97316]"></i></div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Compte de Projet</div>
                      <div className="text-[0.62rem] text-[#64748B]">Investissez dans des entreprises. Rendement de +40% à +150%. Étudiez les secteurs avant d'investir !</div>
                    </div>
                  </div>
                  <div className="bg-[#EFF6FF] rounded-lg p-2 mt-1">
                    <p className="text-[0.62rem] text-[#2563EB]"><i className="fas fa-info-circle mr-1"></i>Allez dans <strong>Portefeuille</strong> puis cliquez sur <strong>Verser</strong> sur le compte de votre choix. Frais de 2% pour les transferts vers les sous-comptes.</p>
                  </div>
                </div>
              </div>

              {/* Étape 3 : Gagner & Réclamer */}
              <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#FBBF24]">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FFFBEB] flex items-center justify-center shrink-0 border border-[rgba(251,191,36,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#92400E]">3</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1A2332]">Gagner et réclamer</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">Collectez vos gains régulièrement</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-hand-holding-usd text-[#FBBF24] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]"><strong className="text-[#1A2332]">Investissements :</strong> Cliquez sur "Réclamer" dans Finance → Invest pour collecter vos gains quotidiens.</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-chart-line text-[#FBBF24] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]"><strong className="text-[#1A2332]">Trading :</strong> Les gains sont automatiquement crédités après la fin du trade.</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-building text-[#FBBF24] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]"><strong className="text-[#1A2332]">Projets :</strong> Cliquez sur "Réclamer" quand l'entreprise a terminé sa durée.</div>
                  </div>
                </div>
              </div>

              {/* Étape 4 : Retirer */}
              <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#EF4444]">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#FEF2F2] flex items-center justify-center shrink-0 border border-[rgba(239,68,68,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#EF4444]">4</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1A2332]">Retirer vos gains</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">Transformez vos gains en TRX</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-arrow-up text-[#EF4444] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]">Transférez vos gains depuis les sous-comptes vers le <strong className="text-[#1A2332]">Compte Principal</strong> (sans frais)</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-paper-plane text-[#EF4444] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]">Allez dans <strong className="text-[#1A2332]">Portefeuille → Retirer</strong> et entrez votre adresse TRX</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-clock text-[#EF4444] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]"><strong className="text-[#1A2332]">Attention :</strong> Le premier retrait nécessite 48h après le 1er dépôt + 10 filleuls</div>
                  </div>
                  <div className="bg-[#FEF2F2] rounded-lg p-2 mt-1">
                    <p className="text-[0.62rem] text-[#991B1B]"><i className="fas fa-exclamation-triangle mr-1"></i>Seuls les <strong>gains</strong> peuvent être retirés, pas le capital investi.</p>
                  </div>
                </div>
              </div>

              {/* Étape 5 : Parrainage */}
              <div className="bg-white rounded-2xl p-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#8B5CF6]">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] flex items-center justify-center shrink-0 border border-[rgba(139,92,246,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#7C3AED]">5</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1A2332]">Parrainer et gagner</div>
                    <div className="text-[0.62rem] text-[#94A3B8]">Invitez vos amis pour débloquer les retraits</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-users text-[#8B5CF6] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]">Partagez votre <strong className="text-[#1A2332]">code de parrainage</strong> (visible dans Profil) avec vos amis</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-lock-open text-[#8B5CF6] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[#64748B]">Avoir <strong className="text-[#1A2332]">10 filleuls</strong> est obligatoire pour débloquer votre premier retrait</div>
                  </div>
                </div>
              </div>

              {/* Chat IA tip */}
              <div className="rounded-xl p-[1px] mb-3 bg-gradient-to-r from-[#1E3A5F] via-[#3B82F6] to-[#1E3A5F]" style={{ backgroundSize: '200% 100%', animation: 'gs 4s linear infinite' }}>
                <div className="bg-gradient-to-br from-[#0F172A] via-[#1a2744] to-[#0F172A] text-white rounded-[11px] p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgba(59,130,246,0.25)] to-[rgba(139,92,246,0.25)] flex items-center justify-center shrink-0 border border-[rgba(59,130,246,0.15)]"><i className="fas fa-robot text-[#A5B4FC] text-[0.85rem]"></i></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.6rem] text-[rgba(165,180,252,0.7)] font-bold uppercase tracking-[1px] mb-0.5">Besoin d&apos;aide ?</div>
                    <div className="text-[0.7rem] leading-relaxed text-[rgba(255,255,255,0.8)]">Utilisez le <strong>Chat IA</strong> pour poser vos questions. L&apos;IA vous mettra en contact avec l&apos;admin si besoin.</div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ============ TRADING ANALYSIS SECTION ============ */}
          {section === 'trading' && (
            <>
              {/* Market Pulse Header */}
              <div className="bg-gradient-to-br from-[#1E3A5F] via-[#162D4A] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(59,130,246,0.15)] relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[rgba(147,197,253,0.06)]" style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#00E676]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                  <span className="text-[0.65rem] text-[rgba(255,255,255,0.5)] uppercase tracking-[1px] font-bold">Marché en direct</span>
                </div>
                <div className="text-[1.1rem] font-black mb-1">Tableau de Bord Trading</div>
                <div className="text-[0.65rem] text-[rgba(255,255,255,0.5)]">Analyses et signaux pour vos décisions</div>
              </div>

              {/* Market Indices */}
              <h3 className="text-[0.85rem] font-bold text-[#1A2332] mb-2.5 flex items-center gap-2">
                <i className="fas fa-heartbeat text-[#EF4444] text-[0.75rem]"></i>
                Indices de Marché
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {MARKET_INDICES.map((idx, i) => {
                  const isUp = idx.value > idx.prev;
                  return (
                    <div key={i} className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                      <div className="text-[0.58rem] text-[#64748B] font-medium mb-1 leading-tight">{idx.name}</div>
                      <div className="flex items-end gap-2">
                        <MiniGauge value={idx.value} color={idx.value >= 60 ? '#00C853' : idx.value >= 40 ? '#FBBF24' : '#EF4444'} />
                        <div>
                          <div className="text-[0.95rem] font-black text-[#1A2332]">{idx.value}</div>
                          <div className={`text-[0.55rem] font-bold flex items-center gap-0.5 ${isUp ? 'text-[#00C853]' : 'text-[#EF4444]'}`}>
                            <i className={`fas fa-caret-${isUp ? 'up' : 'down'} text-[0.5rem]`}></i>
                            {idx.label}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Asset Analysis Cards */}
              <h3 className="text-[0.85rem] font-bold text-[#1A2332] mb-2.5 flex items-center gap-2">
                <i className="fas fa-chart-area text-[#3B82F6] text-[0.75rem]"></i>
                Analyse des Actifs
              </h3>
              <div className="space-y-2.5 mb-4">
                {TRADING_ASSETS.map((asset) => {
                  const isUp = asset.change >= 0;
                  return (
                    <div key={asset.id} className="bg-white rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isUp ? 'bg-[#F0FDF4]' : 'bg-[#FEF2F2]'}`}>
                            <i className={`fas fa-${isUp ? 'trending-up' : 'trending-down'} text-[0.75rem] ${isUp ? 'text-[#00C853]' : 'text-[#EF4444]'}`}></i>
                          </div>
                          <div>
                            <div className="text-[0.8rem] font-bold text-[#1A2332]">{asset.name}</div>
                            <div className="text-[0.6rem] text-[#64748B]">{asset.volatility}</div>
                          </div>
                        </div>
                        <SignalBadge signal={asset.signal} />
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-[0.95rem] font-black text-[#1A2332]">${asset.price.toFixed(3)}</span>
                          <span className={`text-[0.65rem] font-bold ml-1.5 ${isUp ? 'text-[#00C853]' : 'text-[#EF4444]'}`}>
                            {isUp ? '+' : ''}{asset.change}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[0.55rem] text-[#94A3B8]">Force</span>
                          <MiniGauge value={asset.strength} size={24} color={asset.strength >= 70 ? '#00C853' : asset.strength >= 50 ? '#FBBF24' : '#EF4444'} />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-[#F8FAFC] rounded-lg p-1.5 text-center">
                          <div className="text-[0.5rem] text-[#94A3B8] uppercase">RSI</div>
                          <div className={`text-[0.75rem] font-bold ${asset.rsi < 30 ? 'text-[#00C853]' : asset.rsi > 70 ? 'text-[#EF4444]' : 'text-[#FBBF24]'}`}>{asset.rsi}</div>
                        </div>
                        <div className="bg-[#F8FAFC] rounded-lg p-1.5 text-center">
                          <div className="text-[0.5rem] text-[#94A3B8] uppercase">MACD</div>
                          <div className={`text-[0.72rem] font-bold ${asset.macd === 'haussier' ? 'text-[#00C853]' : asset.macd === 'baissier' ? 'text-[#EF4444]' : 'text-[#FBBF24]'}`}>{asset.macd}</div>
                        </div>
                        <div className="bg-[#F8FAFC] rounded-lg p-1.5 text-center">
                          <div className="text-[0.5rem] text-[#94A3B8] uppercase">Volat.</div>
                          <div className="text-[0.72rem] font-bold text-[#1A2332]">{asset.volatility}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strategy Tips */}
              <h3 className="text-[0.85rem] font-bold text-[#1A2332] mb-2.5 flex items-center gap-2">
                <i className="fas fa-lightbulb text-[#FBBF24] text-[0.75rem]"></i>
                Stratégies & Conseils
              </h3>
              <div className="space-y-2 mb-4">
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#00C853]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
                      <i className="fas fa-bullseye text-[#00C853] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Suivez la tendance dominante</div>
                      <div className="text-[0.62rem] text-[#64748B]">Quand l&apos;indice de confiance est au-dessus de 65, le marché favorise les positions haussières. En dessous de 40, la prudence est de mise.</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#3B82F6]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                      <i className="fas fa-clock text-[#3B82F6] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Timing optimal</div>
                      <div className="text-[0.62rem] text-[#64748B]">Les trades courts (1-3 min) sont mieux adaptés aux marchés volatils. Les trades plus longs (5-10 min) conviennent aux tendances stables.</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#FBBF24]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] flex items-center justify-center shrink-0">
                      <i className="fas fa-shield-alt text-[#FBBF24] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Gestion du risque</div>
                      <div className="text-[0.62rem] text-[#64748B]">Ne misez jamais plus de la moité de votre solde sur un seul trade. Diversifiez vos positions pour lisser les pertes éventuelles.</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#8B5CF6]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center shrink-0">
                      <i className="fas fa-chart-bar text-[#8B5CF6] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Lisez les indicateurs</div>
                      <div className="text-[0.62rem] text-[#64748B]">Un RSI sous 30 indique un actif survendu (potentiel de hausse). Au-dessus de 70, il est suracheté (risque de baisse). Le MACD confirme la tendance.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-[#FEF9C3] rounded-xl p-3 mb-3 border border-[#FDE047]">
                <div className="flex items-start gap-2">
                  <i className="fas fa-info-circle text-[#92400E] text-[0.7rem] mt-0.5"></i>
                  <div className="text-[0.62rem] text-[#92400E]">Ces analyses sont fournies à titre indicatif. Le trading comporte des risques et les performances passées ne garantissent pas les résultats futurs. Tradez de manière responsable.</div>
                </div>
              </div>
            </>
          )}

          {/* ============ PROJECT ANALYSIS SECTION ============ */}
          {section === 'projects' && (
            <>
              {/* Sector Overview Header */}
              <div className="bg-gradient-to-br from-[#7C2D12] via-[#5C1D0B] to-[#0F172A] text-white rounded-2xl p-4 mb-4 border border-[rgba(249,115,22,0.15)] relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-[rgba(249,115,22,0.08)]" style={{ animation: 'orbFloat 6s ease-in-out infinite' }} />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#F97316]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                  <span className="text-[0.65rem] text-[rgba(255,255,255,0.5)] uppercase tracking-[1px] font-bold">Veille sectorielle</span>
                </div>
                <div className="text-[1.1rem] font-black mb-1">Analyse des Projets</div>
                <div className="text-[0.65rem] text-[rgba(255,255,255,0.5)]">Étudiez les secteurs avant d&apos;investir</div>
              </div>

              {/* Hot Sectors Banner */}
              <div className="bg-gradient-to-r from-[#FEF3C7] to-[#FFFBEB] rounded-xl p-3 mb-4 border border-[#F59E0B]">
                <div className="flex items-center gap-2 mb-1.5">
                  <i className="fas fa-fire text-[#F59E0B] text-[0.8rem]"></i>
                  <span className="text-[0.72rem] font-bold text-[#92400E]">Secteurs en vogue</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_SECTORS.filter(s => s.hot).map((s, i) => (
                    <span key={i} className="bg-[#F59E0B] text-white text-[0.6rem] font-bold px-2 py-0.5 rounded-full">{s.name} 🔥</span>
                  ))}
                </div>
              </div>

              {/* Sector Cards */}
              <h3 className="text-[0.85rem] font-bold text-[#1A2332] mb-2.5 flex items-center gap-2">
                <i className="fas fa-industry text-[#F97316] text-[0.75rem]"></i>
                Analyse Sectorielle
              </h3>
              <div className="space-y-2.5 mb-4">
                {PROJECT_SECTORS.map((sector, i) => {
                  const confColor = sector.confidence >= 75 ? '#00C853' : sector.confidence >= 65 ? '#FBBF24' : '#EF4444';
                  const riskColor = sector.risk === 'Faible' ? '#00C853' : sector.risk === 'Modéré' ? '#FBBF24' : '#EF4444';
                  return (
                    <div key={i} className="bg-white rounded-xl p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MiniGauge value={sector.confidence} color={confColor} />
                          <div>
                            <div className="text-[0.8rem] font-bold text-[#1A2332]">{sector.name}</div>
                            <div className="text-[0.58rem] text-[#64748B]">Tendance: <span className="font-semibold">{sector.trend}</span></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[0.82rem] font-black text-[#00C853]">{sector.avgReturn}</div>
                          <div className="text-[0.55rem] text-[#94A3B8]">Rdt moy.</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="bg-[#F8FAFC] rounded-lg p-1.5 text-center">
                          <div className="text-[0.5rem] text-[#94A3B8] uppercase">Confiance</div>
                          <div className="text-[0.72rem] font-bold" style={{ color: confColor }}>{sector.confidence}%</div>
                        </div>
                        <div className="bg-[#F8FAFC] rounded-lg p-1.5 text-center">
                          <div className="text-[0.5rem] text-[#94A3B8] uppercase">Momentum</div>
                          <div className="text-[0.72rem] font-bold text-[#1A2332]">{sector.momentum}</div>
                        </div>
                        <div className="bg-[#F8FAFC] rounded-lg p-1.5 text-center">
                          <div className="text-[0.5rem] text-[#94A3B8] uppercase">Risque</div>
                          <div className="text-[0.72rem] font-bold" style={{ color: riskColor }}>{sector.risk}</div>
                        </div>
                      </div>
                      <ProgressBar value={sector.confidence} color={confColor} />
                    </div>
                  );
                })}
              </div>

              {/* Risk/Reward Matrix */}
              <h3 className="text-[0.85rem] font-bold text-[#1A2332] mb-2.5 flex items-center gap-2">
                <i className="fas fa-balance-scale text-[#8B5CF6] text-[0.75rem]"></i>
                Matrice Rendement / Risque
              </h3>
              <div className="bg-white rounded-xl p-4 mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)]">
                <div className="space-y-3">
                  {ENTERPRISE_TYPES.map((ent) => {
                    const riskVal = parseFloat(ent.risk);
                    const retVal = (ent.minRet + ent.maxRet) / 2;
                    const ratio = (retVal / riskVal).toFixed(1);
                    const riskColor = riskVal <= 5 ? '#00C853' : riskVal <= 10 ? '#FBBF24' : riskVal <= 15 ? '#F97316' : '#EF4444';
                    return (
                      <div key={ent.type} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: ent.color + '15' }}>
                          <i className={`fas ${ent.icon} text-[0.7rem]`} style={{ color: ent.color }}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[0.72rem] font-bold text-[#1A2332]">{ent.name}</span>
                            <span className="text-[0.6rem] font-mono font-bold text-[#64748B]">R/R: {ratio}x</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[0.5rem] text-[#94A3B8]">Risque {ent.risk}</span>
                                <span className="text-[0.5rem] text-[#00C853]">+{ent.minRet}-{ent.maxRet}%</span>
                              </div>
                              <div className="flex gap-1">
                                <div className="flex-1 h-1.5 bg-[#FEE2E2] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${riskVal * 5}%`, backgroundColor: riskColor }} />
                                </div>
                                <div className="flex-1 h-1.5 bg-[#DCFCE7] rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-[#00C853]" style={{ width: `${retVal / 1.5}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-2 border-t border-[rgba(0,0,0,0.04)]">
                  <div className="flex items-center gap-3 text-[0.55rem]">
                    <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-[#FEE2E2] rounded-full" /><span className="text-[#94A3B8]">Risque</span></div>
                    <div className="flex items-center gap-1"><div className="w-3 h-1.5 bg-[#DCFCE7] rounded-full" /><span className="text-[#94A3B8]">Rendement</span></div>
                    <div className="ml-auto text-[#94A3B8]">R/R = Ratio Rendement/Risque</div>
                  </div>
                </div>
              </div>

              {/* Investment Philosophy */}
              <h3 className="text-[0.85rem] font-bold text-[#1A2332] mb-2.5 flex items-center gap-2">
                <i className="fas fa-graduation-cap text-[#FBBF24] text-[0.75rem]"></i>
                Philosophie d'Investissement
              </h3>
              <div className="space-y-2 mb-4">
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#00C853]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
                      <i className="fas fa-seedling text-[#00C853] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Commencez petit, grandissez ensemble</div>
                      <div className="text-[0.62rem] text-[#64748B]">Les projets court terme sont idéaux pour démarrer. Une fois confiance établie, diversifiez vers le moyen et long terme.</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#F97316]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFEDD5] flex items-center justify-center shrink-0">
                      <i className="fas fa-divide text-[#F97316] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Diversifiez vos secteurs</div>
                      <div className="text-[0.62rem] text-[#64748B]">Ne mettez pas tous vos œufs dans le même panier. Répartissez entre 2-3 secteurs différents pour équilibrer risque et rendement.</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#8B5CF6]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#F5F3FF] flex items-center justify-center shrink-0">
                      <i className="fas fa-chart-pie text-[#8B5CF6] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Observez la confiance sectorielle</div>
                      <div className="text-[0.62rem] text-[#64748B]">Un secteur avec une confiance élevée (sup. à 75%) offre un terrain plus sûr. Les secteurs volatils peuvent rapporter davantage mais nécessitent plus d&apos;attention.</div>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-l-[3px] border-[#3B82F6]">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                      <i className="fas fa-sync text-[#3B82F6] text-[0.6rem]"></i>
                    </div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1A2332]">Réinvestissez progressivement</div>
                      <div className="text-[0.62rem] text-[#64748B]">Réclamez vos gains et réinvestissez une partie pour amplifier vos résultats. La croissance composée est votre meilleure alliée.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="bg-[#FEF9C3] rounded-xl p-3 mb-3 border border-[#FDE047]">
                <div className="flex items-start gap-2">
                  <i className="fas fa-info-circle text-[#92400E] text-[0.7rem] mt-0.5"></i>
                  <div className="text-[0.62rem] text-[#92400E]">Les analyses sectorielles sont des indicateurs de tendance, pas des garanties. Chaque projet comporte une part de risque. Investissez de manière éclairée et responsable.</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
