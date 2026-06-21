'use client';

import { useState } from 'react';
import { useAppStore, esc } from '@/lib/store';
import { Header, LogoImg, INVEST_LEVELS, ENTERPRISE_TYPES } from '@/components/shared';

type Section = 'overview' | 'videos' | 'game' | 'invest' | 'projects' | 'payments' | 'referral';

const SECTIONS: { id: Section; label: string; icon: string; color: string }[] = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: 'fa-home', color: '#22C55E' },
  { id: 'videos', label: 'Vidéos', icon: 'fa-video', color: '#14B8A6' },
  { id: 'game', label: 'Jeu', icon: 'fa-dice', color: '#F59E0B' },
  { id: 'invest', label: 'Investissement', icon: 'fa-chart-line', color: '#3B82F6' },
  { id: 'projects', label: 'Projets', icon: 'fa-building', color: '#8B5CF6' },
  { id: 'payments', label: 'Dépôts/Retraits', icon: 'fa-wallet', color: '#EF4444' },
  { id: 'referral', label: 'Parrainage', icon: 'fa-gift', color: '#EC4899' },
];

export default function GuideScreen() {
  const { user } = useAppStore();
  const [section, setSection] = useState<Section>('overview');

  if (!user) return null;

  return (
    <>
      <Header title="Guide" />
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#F8F9FA] to-[#F1F5F9]">
        {/* Hero */}
        <div className="px-4 pt-4 pb-3">
          <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #22C55E, #14B8A6)' }}>
            <LogoImg className="w-12 h-12 mx-auto mb-2 rounded-xl" />
            <h1 className="text-[1.1rem] font-black text-white mb-0.5">Guide Be Rich</h1>
            <p className="text-[0.7rem] text-white/80">Plateforme de communication pour les grandes entreprises</p>
          </div>
        </div>

        {/* Section selector */}
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-[0.7rem] whitespace-nowrap cursor-pointer transition-all active:scale-95 ${section === s.id ? 'text-white shadow-lg' : 'bg-white text-[#6B7280]'}`}
                style={section === s.id ? { background: s.color } : { border: '1px solid #E5E7EB' }}
              >
                <i className={`fas ${s.icon} text-[0.65rem]`}></i>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-6">
          {section === 'overview' && <OverviewSection />}
          {section === 'videos' && <VideosSection />}
          {section === 'game' && <GameSection />}
          {section === 'invest' && <InvestSection />}
          {section === 'projects' && <ProjectsSection />}
          {section === 'payments' && <PaymentsSection />}
          {section === 'referral' && <ReferralSection />}
        </div>
      </div>
    </>
  );
}

function Card({ icon, color, title, children }: { icon: string; color: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-4 mb-3" style={{ border: '1px solid #E5E7EB' }}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <i className={`fas ${icon} text-[0.8rem]`} style={{ color }}></i>
        </div>
        <h3 className="text-[0.85rem] font-black text-[#1F2937]">{title}</h3>
      </div>
      <div className="text-[0.72rem] text-[#4B5563] leading-relaxed">{children}</div>
    </div>
  );
}

function OverviewSection() {
  return (
    <>
      <div className="rounded-2xl p-4 mb-3" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDFA)', border: '1px solid #A7F3D0' }}>
        <div className="flex items-start gap-3">
          <i className="fas fa-bullhorn text-[#0F766E] text-[1.2rem] mt-0.5"></i>
          <div>
            <h3 className="text-[0.9rem] font-black text-[#0F766E] mb-1">Bienvenue sur Be Rich !</h3>
            <p className="text-[0.72rem] text-[#115E59] leading-relaxed">
              Be Rich est une plateforme de communication pour les grandes entreprises. Les sociétés chinoises, japonaises et indiennes vous paient pour regarder leurs vidéos promotionnelles. Vous gagnez de l'argent, elles gagnent en visibilité !
            </p>
          </div>
        </div>
      </div>

      <Card icon="fa-video" color="#14B8A6" title="🎬 Plateforme Vidéo">
        Regardez 5 vidéos d'entreprises par jour et gagnez des récompenses. <strong>Compte vidéo autonome</strong> avec dépôts/retraits séparés. Aucun dépôt requis pour commencer, mais après 3 jours, un dépôt devient obligatoire.
      </Card>

      <Card icon="fa-dice" color="#F59E0B" title="🎡 Jeu de la Roue">
        10 tours gratuits par jour. Gagnez de $0.10 à $1.00 par tour. Réinitialisation à minuit. Félicitations à chaque gain, encouragement à chaque perte.
      </Card>

      <Card icon="fa-chart-line" color="#3B82F6" title="📈 Investissement">
        4 niveaux d'investissement avec rendements quotidiens. <strong>Collecte journalière illimitée</strong>. Déblocage des niveaux via parrainage (inviter + inscription).
      </Card>

      <Card icon="fa-building" color="#8B5CF6" title="🏢 Projets">
        Investissez dans des projets (Starter, Growth, Premium) avec rendements de +100% à +200%. Collecte journalière illimitée.
      </Card>

      <Card icon="fa-wallet" color="#EF4444" title="💳 Paiements">
        Dépôts et retraits via <strong>YAS</strong> et <strong>TRX</strong> sur tous les comptes. Minimum $5. Les fonds sont disponibles dans les <strong>6 heures</strong>.
      </Card>
    </>
  );
}

function VideosSection() {
  return (
    <>
      <Card icon="fa-play-circle" color="#14B8A6" title="Comment ça marche">
        Les grandes entreprises (Huawei, Toyota, Tata, Sony, Xiaomi...) vous paient pour regarder leurs vidéos promotionnelles courtes (3-7 min). C'est un échange gagnant-gagnant : elles obtiennent de la visibilité, vous gagnez de l'argent.
      </Card>

      <Card icon="fa-calendar-day" color="#14B8A6" title="5 vidéos par jour">
        Chaque jour, 5 nouvelles vidéos d'entreprises différentes sont disponibles. Les vidéos changent tous les jours. Regardez-en autant que vous voulez (max 5/jour) pour cumuler des récompenses.
      </Card>

      <Card icon="fa-lock" color="#EF4444" title="Pas de défilement autorisé">
        Vous devez regarder au moins <strong>50% de la vidéo</strong> pour recevoir la récompense. Le défilement et la recherche (seeking) sont <strong>désactivés</strong>, même sur ordinateur. Vous ne pouvez pas tricher !
      </Card>

      <Card icon="fa-wallet" color="#14B8A6" title="Compte vidéo autonome">
        Les récompenses vidéo vont sur votre <strong>compte Vidéo</strong> (séparé des autres comptes). Vous pouvez déposer et retirer depuis ce compte, avec les mêmes méthodes (YAS/TRX, min $5).
      </Card>

      <Card icon="fa-exclamation-triangle" color="#F59E0B" title="Règle des 3 jours">
        Après <strong>3 jours</strong> de visionnage, vous devez effectuer un dépôt sur votre compte vidéo (min $5) pour continuer à regarder des vidéos. C'est pour garantir l'engagement des utilisateurs.
      </Card>

      <Card icon="fa-share-nodes" color="#EC4899" title="Partager">
        Cliquez sur "Invitez vos amis" pour partager Be Rich via WhatsApp, TikTok, Instagram, Facebook, Telegram et plus. Gagnez des bonus de parrainage !
      </Card>
    </>
  );
}

function GameSection() {
  return (
    <>
      <Card icon="fa-dice" color="#F59E0B" title="Roue de la Fortune">
        Tournez la roue et tentez de gagner des récompenses en argent ! La roue contient 20 segments avec des récompenses de $0.10 à $1.00.
      </Card>

      <Card icon="fa-clock" color="#22C55E" title="10 tours par jour">
        Vous disposez de <strong>10 tours gratuits</strong> chaque jour. La roue se réinitialise à minuit. Pas de tours payants — tout est gratuit !
      </Card>

      <Card icon="fa-trophy" color="#22C55E" title="Félicitations à chaque gain">
        Quand vous gagnez, une belle popup de félicitations apparaît avec des confettis et le montant gagné. Cliquez sur OK pour fermer et continuer à jouer.
      </Card>

      <Card icon="fa-redo" color="#EF4444" title="Encouragement en cas de perte">
        Si vous perdez, un message d'encouragement apparaît avec un petit conseil motivant. Vous pouvez réessayer immédiatement si vous avez des tours restants.
      </Card>

      <Card icon="fa-fire" color="#EF4444" title="Gagnants récents">
        Un ticker en haut affiche les gagnants récents pour vous motiver. Continuez à tourner — la persistance paie toujours !
      </Card>

      <Card icon="fa-coins" color="#F59E0B" title="Où vont les gains">
        Les gains du jeu sont crédités sur votre <strong>solde Jeu</strong> (compte principal). Vous pouvez les retirer via YAS ou TRX (min $5).
      </Card>
    </>
  );
}

function InvestSection() {
  return (
    <>
      <Card icon="fa-chart-line" color="#3B82F6" title="Investissement">
        Créez des investissements à différents niveaux. Chaque niveau offre un rendement quotidien. Réclamez vos gains chaque jour !
      </Card>

      <Card icon="fa-infinity" color="#22C55E" title="Collecte journalière illimitée">
        Les durées de collecte journalière sont <strong>illimitées</strong>. Vous pouvez réclamer vos gains tous les jours, sans fin, tant que l'investissement est actif.
      </Card>

      <Card icon="fa-user-friends" color="#EC4899" title="Déblocage par parrainage">
        Pour débloquer le niveau suivant, vous devez <strong>inviter une personne</strong> et cette personne doit <strong>s'inscrire</strong> avec votre code de parrainage. Le parrainage est la clé de la progression !
      </Card>

      <Card icon="fa-trophy" color="#22C55E" title="Félicitations à chaque collecte">
        Chaque fois que vous réclamez un gain d'investissement, une popup de félicitations apparaît avec le montant collecté. Cliquez sur OK pour fermer.
      </Card>

      <div className="rounded-2xl bg-white p-4 mb-3" style={{ border: '1px solid #E5E7EB' }}>
        <h3 className="text-[0.85rem] font-black text-[#1F2937] mb-3 flex items-center gap-2">
          <i className="fas fa-layer-group text-[#3B82F6]"></i>Niveaux d'investissement
        </h3>
        <div className="space-y-2">
          {INVEST_LEVELS.map((lvl, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
              <div>
                <div className="text-[0.72rem] font-bold text-[#1F2937]">{lvl.name}</div>
                <div className="text-[0.6rem] text-[#6B7280]">${lvl.min} - ${lvl.max}</div>
              </div>
              <div className="text-[0.7rem] font-bold text-[#22C55E]">+{lvl.rate}% / jour</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function ProjectsSection() {
  return (
    <>
      <Card icon="fa-building" color="#8B5CF6" title="Projets d'entreprise">
        Investissez dans des projets d'entreprises de différents secteurs. Rendements de +100% à +200% selon la durée.
      </Card>

      <Card icon="fa-infinity" color="#22C55E" title="Collecte journalière illimitée">
        Comme pour l'investissement, la collecte journalière sur les projets est <strong>illimitée</strong>.
      </Card>

      <Card icon="fa-trophy" color="#22C55E" title="Félicitations à chaque collecte">
        Chaque collecte de projet déclenche une popup de félicitations avec le montant réclamé.
      </Card>

      <div className="rounded-2xl bg-white p-4 mb-3" style={{ border: '1px solid #E5E7EB' }}>
        <h3 className="text-[0.85rem] font-black text-[#1F2937] mb-3 flex items-center gap-2">
          <i className="fas fa-layer-group text-[#8B5CF6]"></i>Types de projets
        </h3>
        <div className="space-y-2">
          {ENTERPRISE_TYPES.map((t, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: '#F9FAFB' }}>
              <div>
                <div className="text-[0.72rem] font-bold text-[#1F2937]">{t.name}</div>
                <div className="text-[0.6rem] text-[#6B7280]">${t.minAmount} min · {t.durationDays} jours</div>
              </div>
              <div className="text-[0.7rem] font-bold text-[#8B5CF6]">+{t.minReturn}%</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function PaymentsSection() {
  return (
    <>
      <Card icon="fa-wallet" color="#EF4444" title="4 comptes autonomes">
        Be Rich utilise 4 comptes séparés : <strong>Jeu</strong> (solde principal), <strong>Investissement</strong>, <strong>Projets</strong>, et <strong>Vidéo</strong>. Chaque compte a son propre solde et ses propres dépôts/retraits.
      </Card>

      <Card icon="fa-money-bill" color="#22C55E" title="Minimum $5">
        Le minimum de dépôt et de retrait est de <strong>$5</strong> sur tous les comptes, pour toutes les méthodes.
      </Card>

      <Card icon="fa-arrow-down" color="#3B82F6" title="Dépôts YAS et TRX">
        Deux méthodes disponibles sur tous les comptes :
        <ul className="mt-1.5 space-y-1">
          <li><strong>TRX</strong> : Payez en TRX (cryptomonnaie) via Trust Wallet</li>
          <li><strong>YAS</strong> : Payez en FCFA via compte Yas (mobile money)</li>
        </ul>
      </Card>

      <Card icon="fa-arrow-up" color="#EF4444" title="Retraits YAS et TRX">
        Mêmes méthodes pour les retraits. Recevez vos gains en TRX sur votre wallet ou en FCFA sur votre compte Yas.
      </Card>

      <Card icon="fa-clock" color="#F59E0B" title="Disponibilité des fonds">
        Dès qu'un dépôt ou retrait est lancé, les fonds sont disponibles dans les <strong>6 heures</strong>. Un message de confirmation vous informe à chaque étape.
      </Card>

      <Card icon="fa-ban" color="#6B7280" title="Pas de compte principal unique">
        Il n'y a plus de "compte principal" unique. Chaque compte (Jeu, Investissement, Projets, Vidéo) est autonome avec ses propres dépôts et retraits.
      </Card>
    </>
  );
}

function ReferralSection() {
  return (
    <>
      <Card icon="fa-gift" color="#EC4899" title="Code de parrainage">
        Votre code de parrainage (format <strong>BR-XXXXX</strong>) est visible dans votre Profil. Partagez-le avec vos amis !
      </Card>

      <Card icon="fa-share-nodes" color="#EC4899" title="Partage facile">
        Cliquez sur "Partager" pour ouvrir le partage natif de votre téléphone (WhatsApp, TikTok, Instagram, Facebook, Telegram, Messenger). Le lien inclut automatiquement votre code.
      </Card>

      <Card icon="fa-user-plus" color="#22C55E" title="Bonus de bienvenue">
        Recevez <strong>20% du premier dépôt</strong> de chaque parrainé qui s'inscrit avec votre code. Le bonus est crédité sur le compte correspondant, sans déduction pour le parrainé.
      </Card>

      <Card icon="fa-percentage" color="#3B82F6" title="Bonus sur gains">
        Recevez aussi <strong>5% des gains d'investissement</strong> de vos parrainés à chaque réclamation. Un revenu passif tant qu'ils investissent !
      </Card>

      <Card icon="fa-unlock" color="#F59E0B" title="Déblocage des niveaux">
        Pour débloquer les niveaux d'investissement supérieurs, vous devez avoir au moins <strong>1 parrainé inscrit</strong>. Le parrainage est obligatoire pour progresser.
      </Card>
    </>
  );
}
