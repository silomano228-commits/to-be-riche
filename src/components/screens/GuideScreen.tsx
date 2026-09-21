'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Header, LogoImg } from '@/components/shared';

// =====================================================================
// Jeune Élan — Guide complet
// 7 sections : Démarrage, Missions & Images, Gains & Portefeuille,
// Parrainage, Éligibilité & Micro-prêts, Remboursement, Sécurité.
// =====================================================================

type SectionId =
  | 'demarrage'
  | 'missions'
  | 'gains'
  | 'parrainage'
  | 'eligibilite'
  | 'remboursement'
  | 'securite';

interface SectionDef {
  id: SectionId;
  label: string;
  icon: string;
  color: string;
  summary: string;
}

const SECTIONS: SectionDef[] = [
  { id: 'demarrage',    label: 'Démarrage',                 icon: 'fa-rocket',           color: '#22C55E', summary: 'Inscription · vérification téléphone · accès aux missions' },
  { id: 'missions',     label: 'Missions & Images',          icon: 'fa-images',           color: '#F59E0B', summary: 'Générer avec IA externe · uploader · validation · +25 FCFA' },
  { id: 'gains',        label: 'Gains & Portefeuille',       icon: 'fa-wallet',           color: '#3B82F6', summary: '25 FCFA/image · objectif 2 500 F · caution 5 000 F (bloquée)' },
  { id: 'parrainage',   label: 'Parrainage',                 icon: 'fa-users',            color: '#8B5CF6', summary: 'Code JÉ-XXXXXX · 5 filleuls = prêt 5 000 F · 10 = prêt 10 000 F' },
  { id: 'eligibilite',  label: 'Éligibilité & Micro-prêts',  icon: 'fa-check-circle',     color: '#EF4444', summary: 'Conditions · simulateur · décaissement 5 000 F ou 10 000 F' },
  { id: 'remboursement', label: 'Remboursement',             icon: 'fa-hand-holding-usd', color: '#06B6D4', summary: 'Via missions · déduction auto · retard 5j → prélèvement filleuls' },
  { id: 'securite',     label: 'Sécurité & Anti-fraude',     icon: 'fa-shield-alt',       color: '#64748B', summary: 'Vérification · mot de passe · surveillance · sanctions' },
];

export default function GuideScreen() {
  const { user } = useAppStore();
  const [open, setOpen] = useState<Set<SectionId>>(new Set<SectionId>(['demarrage']));

  const toggle = (id: SectionId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!user) return null;

  return (
    <>
      <Header title="Guide" icon="fa-compass" iconColor="#22C55E" />
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#F8FBFA] to-[#F0FDFA]">
        {/* ---------- Hero ---------- */}
        <div className="px-4 pt-4 pb-3">
          <div className="rounded-3xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #22C55E 0%, #14B8A6 100%)' }}>
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/10" />
            <div className="relative flex items-start gap-3">
              <LogoImg className="w-14 h-14 rounded-2xl bg-white/20 p-1.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <h1 className="text-[1.2rem] font-black text-white leading-tight">Guide Jeune Élan</h1>
                <p className="text-[0.72rem] text-white/85 mt-1 leading-relaxed">
                  Missions rémunérées d&apos;images IA et micro-prêts pour la jeunesse.
                  Gagnez, parrainez, empruntez — tout est ici.
                </p>
              </div>
            </div>
            <div className="relative mt-3 flex flex-wrap gap-1.5">
              <Pill icon="fa-rocket" text="Démarrage" />
              <Pill icon="fa-images" text="Missions" />
              <Pill icon="fa-wallet" text="Gains" />
              <Pill icon="fa-hand-holding-usd" text="Micro-prêts" />
            </div>
          </div>
        </div>

        {/* ---------- Quick help ---------- */}
        <div className="px-4 pb-2">
          <div className="rounded-2xl bg-white p-3.5 border border-[#E5E7EB] flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#ECFDF5] flex items-center justify-center shrink-0">
              <i className="fas fa-lightbulb text-[#0F766E] text-[0.85rem]" />
            </div>
            <p className="text-[0.72rem] text-[#4B5563] leading-snug">
              Touchez une section pour la déplier. Trouvez vite la réponse à votre question.
            </p>
          </div>
        </div>

        {/* ---------- Accordion ---------- */}
        <div className="px-4 pb-8 pt-2 space-y-2.5">
          {SECTIONS.map((s) => {
            const isOpen = open.has(s.id);
            return (
              <div key={s.id} className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <button
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left cursor-pointer transition-colors hover:bg-[#F9FAFB] active:bg-[#F3F4F6]"
                  aria-expanded={isOpen}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.color}1A` }}>
                    <i className={`fas ${s.icon} text-[0.95rem]`} style={{ color: s.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.86rem] font-black text-[#1F2937] truncate">{s.label}</div>
                    <div className="text-[0.66rem] text-[#6B7280] truncate">{s.summary}</div>
                  </div>
                  <i className={`fas fa-chevron-down text-[0.7rem] text-[#9CA3AF] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ease-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 pt-1 border-t border-[#F3F4F6]">
                      {s.id === 'demarrage'    && <DemarrageContent />}
                      {s.id === 'missions'     && <MissionsContent />}
                      {s.id === 'gains'        && <GainsContent />}
                      {s.id === 'parrainage'   && <ParrainageContent />}
                      {s.id === 'eligibilite'  && <EligibiliteContent />}
                      {s.id === 'remboursement'&& <RemboursementContent />}
                      {s.id === 'securite'     && <SecuriteContent />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------- Footer note ---------- */}
        <div className="px-4 pb-6">
          <div className="rounded-2xl p-4 text-center" style={{ background: 'linear-gradient(135deg, #ECFDF5, #F0FDFA)', border: '1px solid #A7F3D0' }}>
            <i className="fas fa-shield-halved text-[#0F766E] text-[1.1rem] mb-1.5" />
            <p className="text-[0.72rem] text-[#115E59] leading-relaxed">
              Jeune Élan ne demande <strong>jamais</strong> votre mot de passe.
              Générez vos images avec une IA externe, uploadez-les, gagnez <strong>25 FCFA</strong> par image validée.
              Objectif <strong>2 500 FCFA</strong> + caution <strong>5 000 FCFA</strong> + filleuls = micro-prêt !
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// =====================================================================
// Reusable pieces
// =====================================================================

function Pill({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-sm text-white text-[0.62rem] font-semibold">
      <i className={`fas ${icon} text-[0.55rem]`} />
      {text}
    </span>
  );
}

/** A bullet row with a colored icon. */
function Row({ icon, color, title, children }: { icon: string; color: string; title?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}1A` }}>
        <i className={`fas ${icon} text-[0.7rem]`} style={{ color }} />
      </div>
      <div className="flex-1 text-[0.73rem] text-[#374151] leading-relaxed">
        {title && <span className="font-bold text-[#1F2937]">{title} · </span>}
        {children}
      </div>
    </div>
  );
}

/** A highlighted callout box. */
function Callout({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl p-3 flex items-start gap-2.5" style={{ background: `${color}12`, border: `1px solid ${color}33` }}>
      <i className={`fas ${icon} text-[0.8rem] mt-0.5 shrink-0`} style={{ color }} />
      <div className="text-[0.7rem] text-[#374151] leading-relaxed">{children}</div>
    </div>
  );
}

/** A simple key/value badge row. */
function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[0.72rem]">
      <span className="text-[#6B7280]">{label}</span>
      <span className="font-bold" style={{ color: valueColor || '#1F2937' }}>{value}</span>
    </div>
  );
}

// =====================================================================
// Section contents
// =====================================================================

function DemarrageContent() {
  const green = '#22C55E';
  return (
    <>
      <Row icon="fa-user-plus" color={green} title="Inscription">
        Créez votre compte avec votre <strong>numéro de téléphone</strong>, votre nom, votre email et un mot de passe.
        Un seul numéro = un seul compte.
      </Row>
      <Row icon="fa-mobile-alt" color="#3B82F6" title="Vérification OTP">
        Un code est envoyé par SMS. Entrez-le pour vérifier votre numéro.
        Sans vérification, <strong>aucun accès aux missions</strong>.
      </Row>
      <Row icon="fa-door-open" color="#F59E0B" title="Accès aux missions">
        Téléphone vérifié = accès aux campagnes actives.
        Commencez à <strong>générer et uploader des images</strong> pour gagner.
      </Row>

      <Callout icon="fa-lightbulb" color={green}>
        <strong>Conseil :</strong> gardez votre numéro de téléphone en sécurité.
        Il est lié à votre compte de façon permanente.
      </Callout>

      <Callout icon="fa-exclamation-triangle" color="#EF4444">
        <strong>Attention :</strong> les faux numéros sont détectés automatiquement.
        La création de plusieurs comptes est interdite et surveillée.
      </Callout>
    </>
  );
}

function MissionsContent() {
  const amber = '#F59E0B';
  return (
    <>
      <Row icon="fa-bullhorn" color={amber} title="Consulter les campagnes">
        Les admins créent des campagnes avec un <strong>cahier des charges</strong> précis
        (ex : « Générez une image de voiture Mercedes »). Lisez le brief attentivement.
      </Row>
      <Row icon="fa-wand-magic-sparkles" color="#8B5CF6" title="Générer avec IA externe">
        Utilisez <strong>ChatGPT</strong>, <strong>DALL-E</strong> ou <strong>Midjourney</strong>
        pour générer une image conforme au brief. L&apos;image doit être <strong>originale</strong>.
      </Row>
      <Row icon="fa-cloud-upload-alt" color="#3B82F6" title="Uploader sur Jeune Élan">
        Téléchargez l&apos;image générée. <strong>Maximum 10 images/jour</strong>.
      </Row>
      <Row icon="fa-robot" color="#22C55E" title="Validation automatique IA">
        L&apos;IA vérifie : <strong>conformité au brief</strong>, <strong>originalité</strong>,
        pas de doublon, pas d&apos;image internet.
      </Row>
      <Row icon="fa-coins" color="#22C55E" title="+25 FCFA par image validée">
        Image validée = <strong>25 FCFA</strong>. Max 10 images/jour = <strong>250 FCFA max/jour</strong>.
      </Row>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Gain par image validée" value="25 FCFA" valueColor="#22C55E" />
        <StatRow label="Max images / jour" value="10" valueColor="#1F2937" />
        <StatRow label="Max gains / jour" value="250 FCFA" valueColor="#22C55E" />
        <StatRow label="Objectif gains" value="2 500 FCFA" valueColor="#3B82F6" />
      </div>

      <Callout icon="fa-exclamation-triangle" color="#EF4444">
        <strong>Images trop similaires</strong> = refusées (doublon).
        <strong> Images d&apos;internet</strong> = détectées et refusées.
        Les images disparaissent le <strong>lendemain</strong> pour éviter la saturation.
      </Callout>
    </>
  );
}

function GainsContent() {
  const blue = '#3B82F6';
  return (
    <>
      <Row icon="fa-coins" color="#22C55E" title="Gains missions (25 FCFA/image)">
        Chaque image validée = <strong>25 FCFA</strong>. Les gains s&apos;accumulent dans
        votre portefeuille de missions.
      </Row>
      <Row icon="fa-bullseye" color={blue} title="Objectif 2 500 FCFA">
        Atteignez <strong>2 500 FCFA</strong> de gains validés pour débloquer
        le chemin vers les <strong>micro-prêts</strong>.
      </Row>
      <Row icon="fa-piggy-bank" color="#F59E0B" title="Dépôts personnels">
        Effectuez des dépôts personnels. Ils sont <strong>tracés séparément</strong> des
        gains de missions.
      </Row>
      <Row icon="fa-lock" color="#EF4444" title="Caution 5 000 FCFA (bloquée)">
        Une caution de <strong>5 000 FCFA</strong> est requise pour les micro-prêts.
        Elle est <strong>bloquée et non retirable</strong> — elle sert de garantie.
      </Row>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Gain / image validée" value="25 FCFA" valueColor="#22C55E" />
        <StatRow label="Objectif gains" value="2 500 FCFA" valueColor="#3B82F6" />
        <StatRow label="Caution requise" value="5 000 FCFA" valueColor="#EF4444" />
        <StatRow label="Caution retirable ?" value="Non (bloquée)" valueColor="#EF4444" />
      </div>

      <Callout icon="fa-circle-info" color={blue}>
        <strong>Gains missions</strong> et <strong>dépôts personnels</strong> sont
        suivis séparément. Ne les confondez pas.
      </Callout>

      <Callout icon="fa-exclamation-triangle" color="#EF4444">
        L&apos;objectif de <strong>2 500 FCFA</strong> doit venir <strong>uniquement</strong>{' '}
        des gains d&apos;images validées, pas des dépôts personnels.
      </Callout>
    </>
  );
}

function ParrainageContent() {
  const purple = '#8B5CF6';
  return (
    <>
      <Row icon="fa-share-alt" color={purple} title="Code JÉ-XXXXXX">
        Vous avez un code de parrainage unique. <strong>Partagez-le</strong> pour que
        vos amis s&apos;inscrivent avec.
      </Row>
      <Row icon="fa-user-plus" color="#3B82F6" title="Filleul s'inscrit">
        Quand un nouvel utilisateur s&apos;inscrit avec votre code, il devient votre filleul.
        Mais le parrainage n&apos;est <strong>pas encore validé</strong>.
      </Row>
      <Row icon="fa-images" color="#22C55E" title="Filleul commence à générer">
        Pour valider le parrainage, le filleul doit <strong>avoir généré au moins une image</strong>.
        Un filleul inactif ne compte pas.
      </Row>
      <Row icon="fa-check-circle" color="#F59E0B" title="Parrainage validé">
        <strong>5 filleuls validés</strong> = prêt 5 000 FCFA.
        <strong> 10 filleuls validés</strong> = prêt 10 000 FCFA.
      </Row>

      <div className="mt-2 grid grid-cols-2 gap-2.5">
        <div className="rounded-xl p-3 border" style={{ borderColor: '#8B5CF633', background: '#8B5CF60A' }}>
          <div className="text-[0.82rem] font-black text-[#1F2937]">5 filleuls</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">→ Micro-prêt <strong>5 000 FCFA</strong></div>
        </div>
        <div className="rounded-xl p-3 border" style={{ borderColor: '#22C55E33', background: '#22C55E0A' }}>
          <div className="text-[0.82rem] font-black text-[#1F2937]">10 filleuls</div>
          <div className="text-[0.62rem] text-[#6B7280] leading-snug">→ Micro-prêt <strong>10 000 FCFA</strong></div>
        </div>
      </div>

      <Callout icon="fa-lightbulb" color={purple}>
        Partagez votre code sur <strong>WhatsApp</strong>, <strong>Telegram</strong> et les
        réseaux sociaux pour atteindre plus de personnes rapidement.
      </Callout>

      <Callout icon="fa-shield-halved" color="#EF4444">
        <strong>Anti-fraude :</strong> les faux parrainages et comptes multiples
        sont détectés et entraînent la <strong>suspension du compte</strong>.
      </Callout>
    </>
  );
}

function EligibiliteContent() {
  const red = '#EF4444';
  const LOANS = [
    { amount: '5 000', gains: '2 500', caution: '5 000', refs: 5,  color: '#F59E0B', icon: 'fa-hand-holding-usd' },
    { amount: '10 000', gains: '5 000', caution: '5 000', refs: 10, color: '#22C55E', icon: 'fa-sack-dollar' },
  ];
  return (
    <>
      <Row icon="fa-chart-bar" color={red} title="Simulateur d'éligibilité">
        Consultez le simulateur pour voir <strong>exactement</strong> ce qui vous manque
        pour accéder à un micro-prêt.
      </Row>

      <div className="mt-2 space-y-2">
        {LOANS.map((loan) => (
          <div key={loan.amount} className="rounded-xl p-3 border" style={{ borderColor: `${loan.color}33`, background: `${loan.color}0A` }}>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${loan.color}26` }}>
                <i className={`fas ${loan.icon} text-[0.8rem]`} style={{ color: loan.color }} />
              </div>
              <div className="flex-1">
                <div className="text-[0.78rem] font-black text-[#1F2937]">Micro-prêt {loan.amount} FCFA</div>
              </div>
            </div>
            <div className="text-[0.66rem] text-[#4B5563] space-y-0.5">
              <div className="flex items-center gap-1.5">
                <i className="fas fa-coins text-[0.55rem]" style={{ color: loan.color }} />
                <span>Gains validés : <strong>{loan.gains} FCFA</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <i className="fas fa-lock text-[0.55rem]" style={{ color: loan.color }} />
                <span>Caution : <strong>{loan.caution} FCFA</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <i className="fas fa-users text-[0.55rem]" style={{ color: loan.color }} />
                <span>Filleuls validés : <strong>{loan.refs}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <i className="fas fa-ban text-[0.55rem]" style={{ color: loan.color }} />
                <span>Aucun prêt en retard</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Row icon="fa-paper-plane" color="#3B82F6" title="Demande de prêt">
        Conditions remplies → soumettez votre demande. Le système analyse
        automatiquement et <strong>décaisse</strong> si tout est conforme.
      </Row>

      <Callout icon="fa-lightbulb" color={red}>
        Construisez votre dossier <strong>progressivement</strong> : d&apos;abord
        les gains (missions), puis la caution, puis les filleuls.
      </Callout>

      <Callout icon="fa-exclamation-triangle" color="#EF4444">
        <strong>Impossible d&apos;avoir deux prêts en même temps.</strong>{' '}
        Retard 5+ jours → prélèvement automatique sur les fonds de vos filleuls.
      </Callout>
    </>
  );
}

function RemboursementContent() {
  const cyan = '#06B6D4';
  return (
    <>
      <Row icon="fa-images" color={cyan} title="Continuer les missions">
        Pour rembourser, continuez à accomplir des missions.
        Chaque image validée = <strong>25 FCFA</strong> vers le remboursement.
      </Row>
      <Row icon="fa-calculator" color="#3B82F6" title="Déduction automatique">
        Les gains sont <strong>automatiquement déduits</strong> pour rembourser le prêt.
        Aucune action manuelle requise.
      </Row>
      <Row icon="fa-check-double" color="#22C55E" title="Prêt remboursé">
        Montant total remboursé → prêt clôturé. Vous pouvez demander un <strong>nouveau prêt</strong>.
      </Row>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1 mt-2">
        <StatRow label="Contribution / image" value="25 FCFA" valueColor="#06B6D4" />
        <StatRow label="Max / jour (10 images)" value="250 FCFA" valueColor="#06B6D4" />
        <StatRow label="Prêt 5 000 F → ~20 jours" value="à 250 F/jour" valueColor="#22C55E" />
        <StatRow label="Prêt 10 000 F → ~40 jours" value="à 250 F/jour" valueColor="#F59E0B" />
      </div>

      <Callout icon="fa-lightbulb" color={cyan}>
        Une activité <strong>régulière</strong> de missions assure un remboursement
        fluide. À 10 images/jour, vous remboursez <strong>250 FCFA/jour</strong>.
      </Callout>

      <Callout icon="fa-exclamation-triangle" color="#EF4444">
        <strong>5 jours de retard</strong> → le montant restant est <strong>prélevé
        sur les fonds de vos filleuls</strong>. Continuez à générer pour l&apos;éviter !
      </Callout>
    </>
  );
}

function SecuriteContent() {
  const slate = '#64748B';
  const LEVELS = [
    { name: 'Nouveau',  icon: 'fa-seedling',    color: '#9CA3AF', desc: 'Inscription terminée · pas encore de missions' },
    { name: 'Actif',    icon: 'fa-fire',         color: '#F59E0B', desc: 'A commencé à générer des images' },
    { name: 'Éligible', icon: 'fa-check-circle', color: '#22C55E', desc: 'Remplit toutes les conditions pour un micro-prêt' },
    { name: 'Fiable',   icon: 'fa-shield-halved', color: '#3B82F6', desc: 'Historique solide · prêts remboursés à temps' },
  ];
  return (
    <>
      <Row icon="fa-mobile-alt" color="#22C55E" title="Vérification téléphone">
        Votre numéro est vérifié par <strong>OTP</strong>. Chaque compte
        correspond à une personne réelle.
      </Row>
      <Row icon="fa-key" color="#3B82F6" title="Mot de passe sécurisé">
        Choisissez un mot de passe <strong>fort et unique</strong>.
        Jeune Élan ne vous le demandera <strong>jamais</strong>.
      </Row>
      <Row icon="fa-lock" color="#F59E0B" title="Limitation tentatives connexion">
        Après plusieurs tentatives échouées, le compte est <strong>temporairement verrouillé</strong>.
      </Row>
      <Row icon="fa-eye" color="#EF4444" title="Surveillance activité">
        Le système surveille : <strong>comptes multiples</strong>,
        <strong> images dupliquées</strong>, <strong>parrainages fictifs</strong>,
        <strong> images d&apos;internet</strong>.
      </Row>

      <div className="mt-2">
        <div className="text-[0.72rem] font-black text-[#1F2937] mb-2">Niveaux de confiance</div>
        <div className="space-y-2">
          {LEVELS.map((lvl) => (
            <div key={lvl.name} className="flex items-center gap-2.5 rounded-xl p-2.5 border" style={{ borderColor: `${lvl.color}33`, background: `${lvl.color}0A` }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${lvl.color}26` }}>
                <i className={`fas ${lvl.icon} text-[0.85rem]`} style={{ color: lvl.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[0.78rem] font-black text-[#1F2937]">{lvl.name}</div>
                <div className="text-[0.62rem] text-[#6B7280] leading-snug">{lvl.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Callout icon="fa-shield-halved" color={slate}>
        <strong>Jeune Élan ne demande jamais votre mot de passe.</strong>
        Si quelqu&apos;un le demande, c&apos;est une arnaque.
      </Callout>

      <Callout icon="fa-ban" color="#EF4444">
        <strong>Sanctions :</strong> comptes multiples, images dupliquées,
        parrainages fictifs → <strong>suspension du compte</strong> et perte des gains.
      </Callout>
    </>
  );
}
