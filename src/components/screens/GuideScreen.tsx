'use client';

import { useState, useEffect } from 'react';
import { useAppStore, formatMoney, esc, authFetch, type AppUser } from '@/lib/store';
import { Header, LogoImg, INVEST_LEVELS, ENTERPRISE_TYPES } from '@/components/shared';

// ==================== SIMPLIFIED MARKET DATA ====================
const MARKET_MOODS = [
  { label: 'Humeur du marché', emoji: '😊', value: 'Optimiste' },
  { label: 'Volatilité', emoji: '🌊', value: 'Modérée' },
  { label: 'Tendance', emoji: '📈', value: 'Hausse' },
  { label: 'Moment favorable', emoji: '👍', value: 'Oui' },
];

const TRADING_ASSETS = [
  { id: 'brx', name: 'BRX Token', price: 1.247, change: +3.2, conseil: 'favorable' as const, tip: 'La tendance semble favorable pour une position haussière' },
  { id: 'nova', name: 'NovaTech Coin', price: 8.891, change: -1.8, conseil: 'attentif' as const, tip: 'Le marché hésite, restez prudent avant de vous positionner' },
  { id: 'gold', name: 'GoldFund ETF', price: 24.56, change: +0.9, conseil: 'attentif' as const, tip: 'Mouvement modéré, observez avant d\'agir' },
  { id: 'energy', name: 'EnergyPlus Index', price: 5.123, change: +2.1, conseil: 'favorable' as const, tip: 'La tendance semble favorable pour une position haussière' },
];

const PROJECT_SECTORS = [
  { name: 'Technologie', trend: 'Expansion', confidence: 82, hot: true },
  { name: 'Énergie Verte', trend: 'Croissance', confidence: 75, hot: true },
  { name: 'Immobilier', trend: 'Stable', confidence: 68, hot: false },
  { name: 'Finance', trend: 'Volatil', confidence: 60, hot: false },
  { name: 'Agroalimentaire', trend: 'Croissance', confidence: 71, hot: false },
  { name: 'Santé & BioTech', trend: 'Expansion', confidence: 77, hot: true },
];

const PROJECT_TIERS = [
  { name: 'Court terme', days: 5, minRet: 15, maxRet: 28, icon: 'fa-bolt' },
  { name: 'Moyen terme', days: 10, minRet: 30, maxRet: 48, icon: 'fa-building' },
  { name: 'Long terme', days: 20, minRet: 50, maxRet: 68, icon: 'fa-industry' },
  { name: 'Ultra long', days: 30, minRet: 70, maxRet: 95, icon: 'fa-rocket' },
];

const TRADING_TIPS = [
  { title: 'Observez avant d\'agir', text: 'Prenez le temps d\'observer la tendance du marché avant de vous positionner. Un bon trade est un trade réfléchi.', icon: 'fa-eye' },
  { title: 'Choisissez le bon moment', text: 'Les trades courts réagissent vite aux changements. Les trades plus longs laissent le temps à la tendance de se confirmer.', icon: 'fa-clock' },
  { title: 'Protégez votre capital', text: 'Ne misez jamais plus de la moitié de votre solde sur un seul trade. Mieux vaut plusieurs petites positions qu\'une seule grosse.', icon: 'fa-shield-alt' },
  { title: 'Apprenez de chaque trade', text: 'Chaque trade, gagnant ou perdant, vous apprend quelque chose. Observez les patterns et adaptez votre stratégie.', icon: 'fa-graduation-cap' },
];

const INVEST_TIPS = [
  { title: 'Commencez petit', text: 'Testez d\'abord avec un projet court terme pour comprendre le fonctionnement.', icon: 'fa-seedling' },
  { title: 'Montez en puissance', text: 'Plus la durée est longue, plus le rendement est élevé. Adaptez selon vos objectifs.', icon: 'fa-arrow-up' },
  { title: 'Diversifiez', text: 'Répartissez vos investissements entre plusieurs projets pour lisser les rendements.', icon: 'fa-layer-group' },
];

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
      <Header title="Guide & Analyses" icon="fa-compass" iconColor="#14B8A6" leftElement={
        <button onClick={() => useAppStore.getState().setPage('home')} className="w-9 h-9 rounded-full flex items-center justify-center bg-[rgba(0,0,0,0.06)] text-[rgba(0,0,0,0.55)] cursor-pointer border-none mr-1">
          <i className="fas fa-arrow-left text-[0.8rem]"></i>
        </button>
      } />

      {/* Section tabs */}
      <div className="flex gap-2 px-[18px] py-2.5 bg-[#F8F9FA] border-b border-[rgba(0,0,0,0.08)]">
        {[
          { id: 'guide' as const, label: 'Guide', icon: 'fa-book-open' },
          { id: 'trading' as const, label: 'Trading', icon: 'fa-bolt' },
          { id: 'projects' as const, label: 'Projets', icon: 'fa-building' },
        ].map(t => (
          <button key={t.id} onClick={() => setSection(t.id)}
            className={`flex-1 py-2 rounded-xl text-[0.72rem] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
              section === t.id
                ? 'bg-[rgba(20,184,166,0.15)] text-[#14B8A6]'
                : 'bg-[rgba(0,0,0,0.05)] text-[rgba(0,0,0,0.55)]'
            }`}
          >
            <i className={`fas ${t.icon} text-[0.6rem]`}></i>{t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 w-full overflow-y-auto min-h-0 bg-[#F8F9FA]">
        <div className="px-[18px] py-4">

          {/* ============ GUIDE SECTION ============ */}
          {section === 'guide' && (
            <>
              {/* Step 1: Dépôt - Green for basics */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(34,197,94,0.12)] flex items-center justify-center shrink-0 border border-[rgba(34,197,94,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#22C55E]">1</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1F2937]">Faire un dépôt</div>
                    <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Approvisionnez votre compte</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-[rgba(0,0,0,0.04)] rounded-xl p-2.5 border border-[rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="fab fa-gg-circle text-[#22C55E] text-[0.7rem]"></i>
                      <span className="text-[0.72rem] font-bold text-[#1F2937]">Méthode TRX (Dollars)</span>
                    </div>
                    <ol className="space-y-1 text-[0.65rem] text-[rgba(0,0,0,0.65)] pl-4">
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Allez dans <strong className="text-[#1F2937]">Portefeuille → Déposer</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Choisissez <strong className="text-[#1F2937]">TRX</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Entrez le montant en $ (min 10 $)</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>L&apos;adresse TRX de notre équipe s&apos;affiche — envoyez les TRX depuis votre Trust Wallet</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Entrez votre propre adresse TRX pour confirmer l&apos;envoi</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Attendez la validation par notre équipe</li>
                    </ol>
                  </div>
                  <div className="bg-[rgba(0,0,0,0.04)] rounded-xl p-2.5 border border-[rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="fas fa-exchange-alt text-[#22C55E] text-[0.7rem]"></i>
                      <span className="text-[0.72rem] font-bold text-[#1F2937]">Méthode TMoney (Yas) — FCFA</span>
                    </div>
                    <ol className="space-y-1 text-[0.65rem] text-[rgba(0,0,0,0.65)] pl-4">
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Allez dans <strong className="text-[#1F2937]">Portefeuille → Déposer</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Choisissez <strong className="text-[#1F2937]">TMoney (Yas)</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Entrez le montant en FCFA (min 6 000 FCFA)</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Le code USSD s&apos;affiche : <strong className="text-[#1F2937]">*145*1*{`{montant}`}*{`{numéro_admin}`}*2#</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Copiez ou lancez le code, puis envoyez l&apos;argent</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Entrez votre numéro Yas (8 chiffres, commence par 90-93 ou 70-73)</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#22C55E] font-bold">•</span>Attendez la validation par notre équipe</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Step 2: Verser - Teal for accounts */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(20,184,166,0.12)] flex items-center justify-center shrink-0 border border-[rgba(20,184,166,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#14B8A6]">2</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1F2937]">Verser dans les comptes</div>
                    <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Répartissez vos fonds selon vos objectifs</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-[rgba(20,184,166,0.12)] flex items-center justify-center shrink-0 mt-0.5"><i className="fas fa-chart-line text-[0.55rem] text-[#14B8A6]"></i></div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1F2937]">Compte d&apos;Investissement</div>
                      <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Choisissez un palier (Micro à Elite), gagnez 5% à 12.5% par cycle. Réclamez vos gains chaque jour !</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-[rgba(20,184,166,0.12)] flex items-center justify-center shrink-0 mt-0.5"><i className="fas fa-bolt text-[0.55rem] text-[#14B8A6]"></i></div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1F2937]">Compte de Trading</div>
                      <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Pariez sur la hausse ou la baisse des actifs. Durée de 1 à 10 min. Consultez les analyses avant de trader !</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-md bg-[rgba(20,184,166,0.12)] flex items-center justify-center shrink-0 mt-0.5"><i className="fas fa-building text-[0.55rem] text-[#14B8A6]"></i></div>
                    <div>
                      <div className="text-[0.72rem] font-bold text-[#1F2937]">Compte de Projet</div>
                      <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Investissez dans des entreprises. Rendement garanti à l&apos;échéance. Adaptez la durée selon vos objectifs !</div>
                    </div>
                  </div>
                  <div className="bg-[rgba(20,184,166,0.1)] rounded-lg p-2 mt-1 border border-[rgba(20,184,166,0.1)]">
                    <p className="text-[0.62rem] text-[#14B8A6]"><i className="fas fa-info-circle mr-1"></i>Allez dans <strong>Portefeuille</strong> puis cliquez sur <strong>Verser</strong> sur le compte de votre choix.</p>
                    <p className="text-[0.62rem] text-[#14B8A6] mt-1"><i className="fas fa-arrow-right mr-1"></i>Transfert du Principal vers un sous-compte : <strong>frais de 2%</strong></p>
                    <p className="text-[0.62rem] text-[#14B8A6] mt-0.5"><i className="fas fa-arrow-left mr-1"></i>Transfert d&apos;un sous-compte vers le Principal : <strong>sans frais</strong></p>
                    <p className="text-[0.62rem] text-[#14B8A6] mt-0.5"><i className="fas fa-coins mr-1"></i>Montant minimum : <strong>2 $</strong></p>
                  </div>
                </div>
              </div>

              {/* Step 3: Gagner - Amber for rewards */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(245,158,11,0.12)] flex items-center justify-center shrink-0 border border-[rgba(245,158,11,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#F59E0B]">3</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1F2937]">Gagner et réclamer</div>
                    <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Collectez vos gains régulièrement</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-hand-holding-usd text-[#F59E0B] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]"><strong className="text-[#1F2937]">Investissements :</strong> Cliquez sur &quot;Réclamer&quot; dans Finance → Invest pour collecter vos gains quotidiens.</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-chart-line text-[#F59E0B] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]"><strong className="text-[#1F2937]">Trading :</strong> Les gains sont automatiquement crédités après la fin du trade.</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-building text-[#F59E0B] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]"><strong className="text-[#1F2937]">Projets :</strong> Cliquez sur &quot;Réclamer&quot; quand l&apos;entreprise a terminé sa durée.</div>
                  </div>
                </div>
              </div>

              {/* Step 4: Retirer - Red for risks/withdrawal */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(239,68,68,0.12)] flex items-center justify-center shrink-0 border border-[rgba(239,68,68,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#EF4444]">4</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1F2937]">Retirer vos gains</div>
                    <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Transformez vos gains en TRX ou TMoney</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="bg-[rgba(0,0,0,0.04)] rounded-xl p-2.5 border border-[rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="fab fa-gg-circle text-[#EF4444] text-[0.7rem]"></i>
                      <span className="text-[0.72rem] font-bold text-[#1F2937]">Retrait en TRX</span>
                    </div>
                    <ol className="space-y-1 text-[0.65rem] text-[rgba(0,0,0,0.65)] pl-4">
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>Allez dans <strong className="text-[#1F2937]">Portefeuille → Retirer</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>Choisissez <strong className="text-[#1F2937]">TRX</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>Entrez le montant et votre adresse TRX</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>La demande est traitée par notre équipe</li>
                    </ol>
                  </div>
                  <div className="bg-[rgba(0,0,0,0.04)] rounded-xl p-2.5 border border-[rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-2 mb-1.5">
                      <i className="fas fa-mobile-alt text-[#EF4444] text-[0.7rem]"></i>
                      <span className="text-[0.72rem] font-bold text-[#1F2937]">Retrait en TMoney (Yas)</span>
                    </div>
                    <ol className="space-y-1 text-[0.65rem] text-[rgba(0,0,0,0.65)] pl-4">
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>Allez dans <strong className="text-[#1F2937]">Portefeuille → Retirer</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>Choisissez <strong className="text-[#1F2937]">TMoney (Yas)</strong></li>
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>Entrez le montant et votre numéro Yas</li>
                      <li className="flex items-start gap-1.5"><span className="text-[#EF4444] font-bold">•</span>La demande est traitée par notre équipe</li>
                    </ol>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-arrow-up text-[#EF4444] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]">Transférez d&apos;abord vos gains depuis les sous-comptes vers le <strong className="text-[#1F2937]">Compte Principal</strong> (sans frais)</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-clock text-[#EF4444] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]"><strong className="text-[#1F2937]">Attention :</strong> Le premier retrait nécessite 48h après le 1er dépôt + au moins 1 filleul</div>
                  </div>
                  <div className="bg-[rgba(239,68,68,0.1)] rounded-lg p-2 mt-1 border border-[rgba(239,68,68,0.1)]">
                    <p className="text-[0.62rem] text-[#EF4444]"><i className="fas fa-info-circle mr-1"></i>Seuls les <strong>gains</strong> peuvent être retirés, pas le capital investi.</p>
                  </div>
                </div>
              </div>

              {/* Step 5: Parrainer - Purple for social/advanced */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(139,92,246,0.12)] flex items-center justify-center shrink-0 border border-[rgba(139,92,246,0.15)]">
                    <span className="text-[0.85rem] font-black text-[#8B5CF6]">5</span>
                  </div>
                  <div>
                    <div className="text-[0.85rem] font-bold text-[#1F2937]">Parrainer et gagner</div>
                    <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">Invitez vos amis pour débloquer les retraits</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <i className="fas fa-users text-[#8B5CF6] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]">Partagez votre <strong className="text-[#1F2937]">code de parrainage</strong> (visible dans Profil) avec vos amis</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-lock-open text-[#8B5CF6] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]">Avoir <strong className="text-[#1F2937]">au moins 1 filleul</strong> est obligatoire pour débloquer votre premier retrait</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <i className="fas fa-chart-line text-[#8B5CF6] text-[0.65rem] mt-1"></i>
                    <div className="text-[0.65rem] text-[rgba(0,0,0,0.65)]">Plus de filleuls peuvent être nécessaires au fil de vos retraits</div>
                  </div>
                </div>
              </div>

              {/* Chat IA tip - Dark card with subtle gold border */}
              <div className="bg-[#FFFFFF] border border-[rgba(20,184,166,0.2)] rounded-2xl p-3 mb-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[rgba(20,184,166,0.12)] flex items-center justify-center shrink-0 border border-[rgba(20,184,166,0.15)]"><i className="fas fa-robot text-[#14B8A6] text-[0.85rem]"></i></div>
                <div className="flex-1 min-w-0">
                  <div className="text-[0.6rem] text-[rgba(20,184,166,0.7)] font-bold uppercase tracking-[1px] mb-0.5">Besoin d&apos;aide ?</div>
                  <div className="text-[0.7rem] leading-relaxed text-[rgba(0,0,0,0.3)]">Utilisez le <strong className="text-[#1F2937]">Chat IA</strong> pour poser vos questions. Notre équipe de support peut également vous répondre directement.</div>
                </div>
              </div>
            </>
          )}

          {/* ============ TRADING SECTION (SIMPLIFIED) ============ */}
          {section === 'trading' && (
            <>
              {/* Market Pulse Header - Calm dark card */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#14B8A6]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                  <span className="text-[0.65rem] text-[rgba(0,0,0,0.5)] uppercase tracking-[1px] font-bold">Marché en direct</span>
                </div>
                <div className="text-[1.1rem] font-black text-[#1F2937] mb-1">Tableau de Bord Trading</div>
                <div className="text-[0.65rem] text-[rgba(0,0,0,0.45)]">Indicateurs simples pour vos décisions</div>
              </div>

              {/* Market Mood - Simple emoji cards */}
              {/* Trading section - Blue accent for trading */}
              <h3 className="text-[0.85rem] font-bold text-[#1F2937] mb-2.5 flex items-center gap-2">
                <i className="fas fa-heart text-[#14B8A6] text-[0.75rem]"></i>
                Humeur du Marché
              </h3>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {MARKET_MOODS.map((mood, i) => (
                  <div key={i} className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3">
                    <div className="text-[0.58rem] text-[rgba(0,0,0,0.5)] font-medium mb-1.5 leading-tight">{mood.label}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[1.1rem]">{mood.emoji}</span>
                      <span className="text-[0.85rem] font-bold text-[#1F2937]">{mood.value}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Asset Cards - Simplified */}
              <h3 className="text-[0.85rem] font-bold text-[#1F2937] mb-2.5 flex items-center gap-2">
                <i className="fas fa-chart-area text-[#14B8A6] text-[0.75rem]"></i>
                Actifs
              </h3>
              <div className="space-y-2.5 mb-4">
                {TRADING_ASSETS.map((asset) => {
                  const isUp = asset.change >= 0;
                  const conseilConfig = {
                    favorable: { emoji: '🟢', label: 'Moment favorable', color: '#4ADE80' },
                    attentif: { emoji: '🟡', label: 'Restez attentif', color: '#14B8A6' },
                    eviter: { emoji: '🔴', label: 'Évitez pour l\'instant', color: '#F87171' },
                  }[asset.conseil];
                  return (
                    <div key={asset.id} className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[rgba(20,184,166,0.1)]">
                            <i className={`fas fa-${isUp ? 'trending-up' : 'trending-down'} text-[0.75rem] text-[#14B8A6]`}></i>
                          </div>
                          <div>
                            <div className="text-[0.8rem] font-bold text-[#1F2937]">{asset.name}</div>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6rem] font-bold bg-[rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.08)]" style={{ color: conseilConfig.color }}>
                          {conseilConfig.emoji} {conseilConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-[0.95rem] font-black text-[#1F2937]">${asset.price.toFixed(3)}</span>
                        <span className={`text-[0.65rem] font-bold ${isUp ? 'text-[#4ADE80]' : 'text-[#F87171]'}`}>
                          {isUp ? '+' : ''}{asset.change}%
                        </span>
                      </div>
                      <p className="text-[0.62rem] text-[rgba(0,0,0,0.5)] leading-relaxed">{asset.tip}</p>
                    </div>
                  );
                })}
              </div>

              {/* Strategy Tips - Dark cards with gold left border */}
              <h3 className="text-[0.85rem] font-bold text-[#1F2937] mb-2.5 flex items-center gap-2">
                <i className="fas fa-lightbulb text-[#14B8A6] text-[0.75rem]"></i>
                Conseils Stratégiques
              </h3>
              <div className="space-y-2 mb-4">
                {TRADING_TIPS.map((tip, i) => (
                  <div key={i} className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] border-l-[3px] border-l-[#14B8A6] rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(20,184,166,0.12)] flex items-center justify-center shrink-0">
                        <i className={`fas ${tip.icon} text-[#14B8A6] text-[0.6rem]`}></i>
                      </div>
                      <div>
                        <div className="text-[0.72rem] font-bold text-[#1F2937]">{tip.title}</div>
                        <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">{tip.text}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gentle Disclaimer */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3 mb-3">
                <div className="flex items-start gap-2">
                  <i className="fas fa-info-circle text-[rgba(0,0,0,0.35)] text-[0.7rem] mt-0.5"></i>
                  <div className="text-[0.62rem] text-[rgba(0,0,0,0.45)]">Ces indications sont fournies à titre informatif. Chaque trade comporte des risques. Investissez toujours de manière responsable.</div>
                </div>
              </div>
            </>
          )}

          {/* ============ PROJECTS SECTION (SIMPLIFIED) ============ */}
          {section === 'projects' && (
            <>
              {/* Header - Clean dark card */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#14B8A6]" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                  <span className="text-[0.65rem] text-[rgba(0,0,0,0.5)] uppercase tracking-[1px] font-bold">Projets</span>
                </div>
                <div className="text-[1.1rem] font-black text-[#1F2937] mb-1">Analyse des Projets</div>
                <div className="text-[0.65rem] text-[rgba(0,0,0,0.45)]">Découvrez les opportunités d&apos;investissement</div>
              </div>

              {/* Sector Overview - Simple cards with confidence bar */}
              <h3 className="text-[0.85rem] font-bold text-[#1F2937] mb-2.5 flex items-center gap-2">
                <i className="fas fa-industry text-[#14B8A6] text-[0.75rem]"></i>
                Secteurs
              </h3>
              <div className="space-y-2 mb-4">
                {PROJECT_SECTORS.map((sector, i) => (
                  <div key={i} className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {sector.hot && <div className="w-2 h-2 rounded-full bg-[#14B8A6]"></div>}
                        <div>
                          <div className="text-[0.8rem] font-bold text-[#1F2937]">{sector.name}</div>
                          <div className="text-[0.58rem] text-[rgba(0,0,0,0.5)]">Tendance : <span className="text-[rgba(0,0,0,0.3)]">{sector.trend}</span></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.78rem] font-bold text-[#14B8A6]">{sector.confidence}%</div>
                        <div className="text-[0.5rem] text-[rgba(0,0,0,0.4)]">Confiance</div>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-[rgba(0,0,0,0.06)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 bg-[#14B8A6]" style={{ width: `${sector.confidence}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Project Types - Clean cards, always wins presentation */}
              <h3 className="text-[0.85rem] font-bold text-[#1F2937] mb-2.5 flex items-center gap-2">
                <i className="fas fa-layer-group text-[#14B8A6] text-[0.75rem]"></i>
                Types de Projets
              </h3>
              <div className="space-y-2 mb-4">
                {PROJECT_TIERS.map((tier, i) => (
                  <div key={i} className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[rgba(20,184,166,0.12)]">
                          <i className={`fas ${tier.icon} text-[0.75rem] text-[#14B8A6]`}></i>
                        </div>
                        <div>
                          <div className="text-[0.8rem] font-bold text-[#1F2937]">{tier.name}</div>
                          <div className="text-[0.6rem] text-[rgba(0,0,0,0.5)]">{tier.days} jours</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.82rem] font-bold text-[#14B8A6]">+{tier.minRet}-{tier.maxRet}%</div>
                        <div className="text-[0.5rem] text-[rgba(0,0,0,0.4)]">Rendement garanti</div>
                      </div>
                    </div>
                    <div className="text-[0.58rem] text-[rgba(0,0,0,0.45)] mt-1">Rendement garanti à l&apos;échéance</div>
                  </div>
                ))}
              </div>

              {/* Investment Philosophy - Dark cards with gold accent */}
              <h3 className="text-[0.85rem] font-bold text-[#1F2937] mb-2.5 flex items-center gap-2">
                <i className="fas fa-graduation-cap text-[#14B8A6] text-[0.75rem]"></i>
                Conseils d&apos;Investissement
              </h3>
              <div className="space-y-2 mb-4">
                {INVEST_TIPS.map((tip, i) => (
                  <div key={i} className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] border-l-[3px] border-l-[#14B8A6] rounded-xl p-3">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[rgba(20,184,166,0.12)] flex items-center justify-center shrink-0">
                        <i className={`fas ${tip.icon} text-[#14B8A6] text-[0.6rem]`}></i>
                      </div>
                      <div>
                        <div className="text-[0.72rem] font-bold text-[#1F2937]">{tip.title}</div>
                        <div className="text-[0.62rem] text-[rgba(0,0,0,0.55)]">{tip.text}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Disclaimer - subtle dark card */}
              <div className="bg-[#FFFFFF] border border-[rgba(0,0,0,0.08)] rounded-xl p-3 mb-3">
                <div className="flex items-start gap-2">
                  <i className="fas fa-info-circle text-[rgba(0,0,0,0.35)] text-[0.7rem] mt-0.5"></i>
                  <div className="text-[0.62rem] text-[rgba(0,0,0,0.45)]">Les analyses sectorielles sont des indicateurs de tendance. Investissez de manière responsable.</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
