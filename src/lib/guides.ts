// ==================== GUIDE DATA ====================
// All guide content for the Jeune Élan app
// Plateforme de missions rémunérées d'images et micro-prêts pour la jeunesse

export interface GuideStep {
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  steps: GuideStep[];
  tips?: string[];
  warnings?: string[];
}

// ==================== DÉMARRAGE ====================
export const DEMARRAGE_GUIDE: GuideSection = {
  id: 'demarrage',
  title: 'Démarrage',
  description: 'Inscription, vérification et accès aux missions',
  icon: 'fa-rocket',
  color: '#22C55E',
  steps: [
    {
      title: '1. Inscription',
      description: 'Créez votre compte avec votre numéro de téléphone, votre nom, votre email et un mot de passe sécurisé. Un seul numéro = un seul compte.',
      icon: 'fa-user-plus',
      color: '#22C55E',
    },
    {
      title: '2. Vérification téléphone (OTP)',
      description: 'Un code OTP est envoyé par SMS à votre numéro. Entrez ce code pour vérifier votre numéro. Sans vérification, vous ne pouvez pas accéder aux missions.',
      icon: 'fa-mobile-alt',
      color: '#3B82F6',
    },
    {
      title: '3. Accès aux missions',
      description: 'Une fois votre téléphone vérifié, vous accédez aux campagnes de missions actives. Vous pouvez commencer à générer et uploader des images pour gagner des FCFA.',
      icon: 'fa-door-open',
      color: '#F59E0B',
    },
  ],
  tips: [
    'Gardez votre numéro de téléphone en sécurité — il est lié à votre compte de façon permanente.',
    'Un numéro de téléphone = un seul compte. Ne tentez pas de créer plusieurs comptes.',
    'Vérifiez votre téléphone dès l\'inscription pour ne pas perdre de temps.',
  ],
  warnings: [
    'Les faux numéros de téléphone sont détectés automatiquement. Votre compte sera suspendu si le numéro ne peut pas recevoir le code OTP.',
    'Créer plusieurs comptes avec différents numéros est interdit et détecté par le système anti-fraude.',
  ],
};

// ==================== MISSIONS & IMAGES ====================
export const MISSIONS_GUIDE: GuideSection = {
  id: 'missions',
  title: 'Missions & Images',
  description: 'Générer, uploader et faire valider des images IA',
  icon: 'fa-images',
  color: '#F59E0B',
  steps: [
    {
      title: '1. Consulter les campagnes',
      description: 'Les administrateurs créent des campagnes avec un cahier des charges précis (ex: "Générez une image de voiture Mercedes"). Consultez les campagnes actives et lisez le brief attentivement.',
      icon: 'fa-bullhorn',
      color: '#F59E0B',
    },
    {
      title: '2. Générer l\'image avec une IA externe',
      description: 'Utilisez un outil IA externe (ChatGPT, DALL-E, Midjourney, etc.) pour générer une image qui correspond au brief de la campagne. L\'image doit être originale et conforme aux instructions.',
      icon: 'fa-wand-magic-sparkles',
      color: '#8B5CF6',
    },
    {
      title: '3. Uploader sur Jeune Élan',
      description: 'Téléchargez l\'image générée sur la plateforme Jeune Élan. Vous pouvez soumettre jusqu\'à 10 images par jour maximum.',
      icon: 'fa-cloud-upload-alt',
      color: '#3B82F6',
    },
    {
      title: '4. Validation automatique par IA',
      description: 'Chaque image uploadée est automatiquement analysée par l\'IA de Jeune Élan. Elle vérifie : correspondance au brief, originalité, absence de doublon, image non téléchargée d\'internet.',
      icon: 'fa-robot',
      color: '#22C55E',
    },
    {
      title: '5. +25 FCFA par image validée',
      description: 'Si l\'image est validée, vous gagnez 25 FCFA. Maximum 10 images/jour = 250 FCFA max/jour. Les images refusées ne rapportent rien.',
      icon: 'fa-coins',
      color: '#22C55E',
    },
  ],
  tips: [
    'Utilisez ChatGPT, DALL-E ou Midjourney pour générer vos images — ce sont les outils les plus efficaces.',
    'Suivez le brief de la campagne à la lettre. Une image hors sujet sera refusée.',
    'Maximum 10 images par jour, soit 250 FCFA maximum de gains quotidiens.',
    'Variez vos prompts pour produire des images différentes et éviter les doublons.',
  ],
  warnings: [
    'Les images trop similaires aux images déjà soumises sont automatiquement refusées (détection de doublon).',
    'Les images téléchargées directement d\'internet (sans génération IA) sont détectées et refusées.',
    'Les images soumises disparaissent automatiquement le lendemain pour éviter la saturation du site — générez et uploadez chaque jour.',
  ],
};

// ==================== GAINS & PORTEFEUILLE ====================
export const GAINS_GUIDE: GuideSection = {
  id: 'gains',
  title: 'Gains & Portefeuille',
  description: 'Gains de missions, objectif 2 500 FCFA et caution',
  icon: 'fa-wallet',
  color: '#3B82F6',
  steps: [
    {
      title: '1. Gains de missions (25 FCFA/image)',
      description: 'Chaque image validée vous rapporte 25 FCFA. Ces gains s\'accumulent dans votre portefeuille de gains missions. Suivez votre progression vers l\'objectif.',
      icon: 'fa-coins',
      color: '#22C55E',
    },
    {
      title: '2. Objectif 2 500 FCFA',
      description: 'Vous devez atteindre 2 500 FCFA de gains issus d\'images validées pour débloquer le chemin vers les micro-prêts. C\'est le premier palier important.',
      icon: 'fa-bullseye',
      color: '#3B82F6',
    },
    {
      title: '3. Dépôts personnels',
      description: 'Vous pouvez effectuer des dépôts personnels sur votre portefeuille. Ces dépôts sont tracés séparément des gains de missions.',
      icon: 'fa-piggy-bank',
      color: '#F59E0B',
    },
    {
      title: '4. Caution 5 000 FCFA (bloquée)',
      description: 'Une caution de 5 000 FCFA est requise pour accéder aux micro-prêts. Ce montant est bloqué et ne peut PAS être retiré. Il sert de garantie pour le système.',
      icon: 'fa-lock',
      color: '#EF4444',
    },
  ],
  tips: [
    'Les gains de missions et les dépôts personnels sont suivis séparément dans votre portefeuille.',
    'La caution de 5 000 FCFA est bloquée — vous ne pouvez pas la retirer, même après remboursement d\'un prêt.',
    'Atteindre 2 500 FCFA de gains validés prend au minimum 100 images validées (10 jours à 10 images/jour).',
  ],
  warnings: [
    'Ne confondez pas les gains de missions et la caution — ce sont deux montants distincts avec des rôles différents.',
    'L\'objectif de 2 500 FCFA doit être atteint UNIQUEMENT avec des gains d\'images validées, pas avec des dépôts personnels.',
    'La caution ne sera jamais restituée — elle fait partie des conditions d\'accès aux micro-prêts.',
  ],
};

// ==================== PARRAINAGE ====================
export const PARRAINAGE_GUIDE: GuideSection = {
  id: 'parrainage',
  title: 'Parrainage',
  description: 'Code de parrainage, filleuls validés et paliers',
  icon: 'fa-users',
  color: '#8B5CF6',
  steps: [
    {
      title: '1. Partager votre code JÉ-XXXXXX',
      description: 'Vous disposez d\'un code de parrainage unique au format JÉ-XXXXXX. Partagez-le avec vos amis pour qu\'ils s\'inscrivent avec votre code.',
      icon: 'fa-share-alt',
      color: '#8B5CF6',
    },
    {
      title: '2. Filleul s\'inscrit avec votre code',
      description: 'Quand un nouvel utilisateur s\'inscrit en entrant votre code de parrainage, il devient votre filleul. Mais ce n\'est pas encore suffisant pour valider le parrainage.',
      icon: 'fa-user-plus',
      color: '#3B82F6',
    },
    {
      title: '3. Filleul commence à générer des images',
      description: 'Pour que le parrainage soit validé, votre filleul doit avoir commencé à générer et uploader des images sur les missions. Un filleul inactif ne compte pas.',
      icon: 'fa-images',
      color: '#22C55E',
    },
    {
      title: '4. Parrainage validé',
      description: 'Une fois que votre filleul a généré au moins une image, le parrainage est validé. 5 filleuls validés = prêt de 5 000 FCFA, 10 = prêt de 10 000 FCFA.',
      icon: 'fa-check-circle',
      color: '#F59E0B',
    },
  ],
  tips: [
    '5 filleuls validés sont nécessaires pour le micro-prêt de 5 000 FCFA.',
    '10 filleuls validés sont nécessaires pour le micro-prêt de 10 000 FCFA.',
    'Un filleul doit avoir commencé à générer des images pour que le parrainage compte — l\'inscription seule ne suffit pas.',
    'Partagez votre code sur WhatsApp, Telegram et les réseaux sociaux pour atteindre plus de personnes.',
  ],
  warnings: [
    'Les faux parrainages (comptes créés par vous-même) sont détectés par le système anti-fraude.',
    'Créer plusieurs comptes pour augmenter artificiellement votre nombre de filleuls est strictement interdit.',
    'Tout parrainage frauduleux entraîne la suspension de votre compte et la perte de vos gains.',
  ],
};

// ==================== ÉLIGIBILITÉ & MICRO-PRÊTS ====================
export const ELIGIBILITE_GUIDE: GuideSection = {
  id: 'eligibilite',
  title: 'Éligibilité & Micro-prêts',
  description: 'Conditions, simulateur et demande de prêt',
  icon: 'fa-check-circle',
  color: '#EF4444',
  steps: [
    {
      title: '1. Vérifier votre éligibilité',
      description: 'Consultez le simulateur d\'éligibilité pour voir exactement quelles conditions vous remplissez et ce qui vous manque pour accéder à un micro-prêt.',
      icon: 'fa-chart-bar',
      color: '#EF4444',
    },
    {
      title: '2. Micro-prêt de 5 000 FCFA',
      description: 'Conditions : 2 500 FCFA de gains validés + 5 000 FCFA de caution + 5 filleuls validés + aucun prêt en retard. C\'est le premier palier de prêt.',
      icon: 'fa-hand-holding-usd',
      color: '#F59E0B',
    },
    {
      title: '3. Micro-prêt de 10 000 FCFA',
      description: 'Conditions : 5 000 FCFA de gains validés + 5 000 FCFA de caution + 10 filleuls validés + aucun prêt en retard. Le palier supérieur.',
      icon: 'fa-sack-dollar',
      color: '#22C55E',
    },
    {
      title: '4. Demande de prêt',
      description: 'Une fois les conditions remplies, soumettez votre demande. Le système analyse automatiquement votre dossier et, si tout est conforme, le prêt est décaissé.',
      icon: 'fa-paper-plane',
      color: '#3B82F6',
    },
    {
      title: '5. Décaissement',
      description: 'Le montant du prêt est crédité sur votre portefeuille. Vous pouvez l\'utiliser selon vos besoins. Le remboursement se fera automatiquement via vos futures missions.',
      icon: 'fa-money-bill-wave',
      color: '#22C55E',
    },
  ],
  tips: [
    'Le simulateur vous montre exactement ce qu\'il vous manque pour être éligible — utilisez-le régulièrement.',
    'Construisez votre dossier progressivement : d\'abord les gains (missions), puis la caution, puis les filleuls.',
    'Prêt 5 000 F = 2 500 F gains + 5 000 F caution + 5 filleuls validés.',
    'Prêt 10 000 F = 5 000 F gains + 5 000 F caution + 10 filleuls validés.',
  ],
  warnings: [
    'Vous ne pouvez pas avoir deux prêts en même temps — terminez le remboursement du premier avant de demander le suivant.',
    'Un prêt en retard de 5 jours ou plus déclenche un prélèvement automatique sur les fonds de vos filleuls.',
    'Assurez-vous de pouvoir maintenir une activité régulière de missions avant de demander un prêt.',
  ],
};

// ==================== REMBOURSEMENT ====================
export const REMBOURSEMENT_GUIDE: GuideSection = {
  id: 'remboursement',
  title: 'Remboursement',
  description: 'Rembourser votre prêt via les missions',
  icon: 'fa-hand-holding-usd',
  color: '#06B6D4',
  steps: [
    {
      title: '1. Continuer les missions',
      description: 'Pour rembourser votre prêt, continuez à accomplir des missions régulièrement. Chaque image validée génère 25 FCFA qui contribue au remboursement.',
      icon: 'fa-images',
      color: '#06B6D4',
    },
    {
      title: '2. Déduction automatique des gains',
      description: 'Vos gains de missions sont automatiquement déduits pour rembourser le prêt. Vous n\'avez aucune action manuelle à faire — le système prélève directement.',
      icon: 'fa-calculator',
      color: '#3B82F6',
    },
    {
      title: '3. Prêt entièrement remboursé',
      description: 'Une fois le montant total du prêt remboursé via les déductions automatiques, votre prêt est clôturé. Vous pouvez alors demander un nouveau prêt si besoin.',
      icon: 'fa-check-double',
      color: '#22C55E',
    },
  ],
  tips: [
    'Une activité régulière de missions assure un remboursement fluide et sans stress.',
    'Chaque image validée contribue 25 FCFA au remboursement — à 10 images/jour, c\'est 250 FCFA/jour.',
    'Un prêt de 5 000 FCFA peut être remboursé en 20 jours à 250 FCFA/jour.',
    'Un prêt de 10 000 FCFA peut être remboursé en 40 jours à 250 FCFA/jour.',
  ],
  warnings: [
    'Après 5 jours de retard sur la date limite, le montant restant est automatiquement déduit des fonds de votre réseau de parrainage (filleuls).',
    'Continuez à générer des images régulièrement pour éviter le retard de remboursement et protéger vos filleuls.',
    'Un retard de remboursement peut affecter votre niveau de confiance (Fiable → Actif → Nouveau).',
  ],
};

// ==================== SÉCURITÉ & ANTI-FRAUDE ====================
export const SECURITE_GUIDE: GuideSection = {
  id: 'securite',
  title: 'Sécurité & Anti-fraude',
  description: 'Protection, vérifications et sanctions',
  icon: 'fa-shield-alt',
  color: '#64748B',
  steps: [
    {
      title: '1. Vérification téléphone',
      description: 'Votre numéro de téléphone est vérifié par OTP à l\'inscription. Cela garantit que chaque compte correspond à une personne réelle avec un numéro valide.',
      icon: 'fa-mobile-alt',
      color: '#22C55E',
    },
    {
      title: '2. Mot de passe sécurisé',
      description: 'Choisissez un mot de passe fort et unique. Ne le partagez avec personne — Jeune Élan ne vous le demandera jamais.',
      icon: 'fa-key',
      color: '#3B82F6',
    },
    {
      title: '3. Limitation des tentatives de connexion',
      description: 'Après plusieurs tentatives de connexion échouées, le compte est temporairement verrouillé pour prévenir les accès non autorisés.',
      icon: 'fa-lock',
      color: '#F59E0B',
    },
    {
      title: '4. Surveillance de l\'activité',
      description: 'Le système surveille en permanence les activités suspectes : comptes multiples, images dupliquées, parrainages fictifs, images téléchargées d\'internet.',
      icon: 'fa-eye',
      color: '#EF4444',
    },
  ],
  tips: [
    'Jeune Élan ne vous demandera JAMAIS votre mot de passe — si quelqu\'un le demande, c\'est une arnaque.',
    'Utilisez un mot de passe unique et fort (majuscules, minuscules, chiffres, symboles).',
    'Vérifiez régulièrement l\'activité de votre compte et signalez toute anomalie.',
  ],
  warnings: [
    'La création de plusieurs comptes est détectée et entraîne la suspension de tous les comptes concernés.',
    'Les images dupliquées (soumissions multiples de la même image) sont refusées et peuvent entraîner des sanctions.',
    'Les parrainages fictifs (faux filleuls) sont détectés par le système anti-fraude.',
    'Toute tentative de fraude peut résulter en la suspension définitive de votre compte et la perte de vos gains.',
  ],
};

// ==================== ALL GUIDES ====================
export const ALL_GUIDES: GuideSection[] = [
  DEMARRAGE_GUIDE,
  MISSIONS_GUIDE,
  GAINS_GUIDE,
  PARRAINAGE_GUIDE,
  ELIGIBILITE_GUIDE,
  REMBOURSEMENT_GUIDE,
  SECURITE_GUIDE,
];
