// ==================== GUIDE DATA ====================
// All guide content for the Be Rich app

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

// ==================== WALLET GUIDE ====================
export const WALLET_GUIDE: GuideSection = {
  id: 'wallet',
  title: 'Portefeuille & Comptes',
  description: 'Gérez vos 4 comptes et vos transferts',
  icon: 'fa-wallet',
  color: '#00C853',
  steps: [
    {
      title: '1. Compte Principal',
      description: 'C\'est votre compte central. Tous les dépôts arrivent ici et les retraits partent d\'ici. C\'est le hub de vos finances sur Be Rich.',
      icon: 'fa-wallet',
      color: '#00C853',
    },
    {
      title: '2. Compte d\'Investissement',
      description: 'Transférez des fonds ici pour investir dans les plans Micro, Standard, High Yield ou Elite. Chaque plan offre un taux de rendement par cycle.',
      icon: 'fa-chart-line',
      color: '#22C55E',
    },
    {
      title: '3. Compte de Trading',
      description: 'Alimentez ce compte pour faire du trading binaire (HAUT/BAS). Misez sur la direction du marché et gagnez jusqu\'à 85% en quelques minutes.',
      icon: 'fa-bolt',
      color: '#3B82F6',
    },
    {
      title: '4. Compte de Projet',
      description: 'Investissez dans des projets d\'entreprise virtuels (Court, Moyen, Long ou Ultra terme) avec des rendements potentiels de +40% à +150%.',
      icon: 'fa-building',
      color: '#F97316',
    },
    {
      title: '5. Transferts entre comptes',
      description: 'Cliquez sur "Verser" pour envoyer du Principal vers un autre compte (frais de 2%). Cliquez sur "Retirer" pour ramener les fonds vers le Principal (sans frais).',
      icon: 'fa-exchange-alt',
      color: '#8B5CF6',
    },
    {
      title: '6. Déposer des fonds',
      description: 'Cliquez sur "Déposer" sur le compte Principal. Envoyez des TRX à l\'adresse admin indiquée, puis soumettez le montant en USD. L\'admin approuvera votre dépôt.',
      icon: 'fa-arrow-down',
      color: '#00C853',
    },
  ],
  tips: [
    'Les transferts VERS les comptes Investissement/Trading/Projet ont des frais de 2%.',
    'Les transferts RETOUR vers le Principal sont sans frais.',
    'Minimum de transfert : 2 $.',
    'Minimum de dépôt : 10 $.',
  ],
  warnings: [
    'Attendez la confirmation de l\'admin avant de considérer un dépôt comme validé.',
    'Vérifiez bien l\'adresse TRX avant d\'envoyer.',
  ],
};

// ==================== INVEST GUIDE ====================
export const INVEST_GUIDE: GuideSection = {
  id: 'invest',
  title: 'Investissements',
  description: 'Plans de rendement quotidien',
  icon: 'fa-chart-line',
  color: '#22C55E',
  steps: [
    {
      title: '1. Choisir un niveau',
      description: '4 niveaux disponibles : Micro (2-5$, 5%/cycle), Standard (5.5-10$, 7.5%/cycle), High Yield (10.5-20$, 9.5%/cycle) et Elite (20.5-50$, 12.5%/cycle).',
      icon: 'fa-layer-group',
      color: '#22C55E',
    },
    {
      title: '2. Alimenter votre compte',
      description: 'Assurez-vous d\'avoir assez de fonds sur votre Compte d\'Investissement. Si besoin, transférez depuis le Compte Principal via le Portefeuille.',
      icon: 'fa-wallet',
      color: '#00C853',
    },
    {
      title: '3. Créer un investissement',
      description: 'Cliquez sur un niveau, entrez le montant souhaité (entre le min et le max du niveau), et confirmez. Le montant est déduit de votre compte d\'investissement.',
      icon: 'fa-plus-circle',
      color: '#3B82F6',
    },
    {
      title: '4. Réclamer vos gains',
      description: 'Chaque cycle (24h), vous pouvez réclamer vos gains. Un bouton "Réclamer" vert apparaît quand c\'est possible. Les gains sont ajoutés à votre Compte d\'Investissement.',
      icon: 'fa-gift',
      color: '#FBBF24',
    },
    {
      title: '5. Fin de l\'investissement',
      description: 'Après tous les cycles, l\'investissement est terminé. Le montant investi est retourné sur votre Compte d\'Investissement automatiquement.',
      icon: 'fa-check-circle',
      color: '#00C853',
    },
  ],
  tips: [
    'Plus le niveau est élevé, plus le taux de rendement est important.',
    'Réclamez vos gains chaque jour pour maximiser vos profits.',
    'Vous pouvez avoir plusieurs investissements actifs en même temps.',
    'Le gain potentiel maximum = Montant × Taux × Nombre de cycles.',
  ],
  warnings: [
    'Vous ne pouvez pas annuler un investissement en cours.',
    'Assurez-vous d\'avoir les fonds nécessaires avant de créer un investissement.',
  ],
};

// ==================== TRADING GUIDE ====================
export const TRADING_GUIDE: GuideSection = {
  id: 'trading',
  title: 'Trading Ultra Market',
  description: 'Misez sur la direction du marché',
  icon: 'fa-bolt',
  color: '#3B82F6',
  steps: [
    {
      title: '1. Alimenter votre compte',
      description: 'Le trading se fait depuis votre Compte de Trading. Transférez des fonds depuis le Compte Principal si nécessaire.',
      icon: 'fa-wallet',
      color: '#00C853',
    },
    {
      title: '2. Choisir le montant',
      description: 'Entrez le montant de votre mise (entre 1$ et 5$). Ce montant sera déduit de votre Compte de Trading au lancement du trade.',
      icon: 'fa-dollar-sign',
      color: '#FBBF24',
    },
    {
      title: '3. Choisir la direction',
      description: 'Sélectionnez HAUT ↑ si vous pensez que le marché va monter, ou BAS ↓ si vous pensez qu\'il va baisser.',
      icon: 'fa-arrows-alt-v',
      color: '#3B82F6',
    },
    {
      title: '4. Choisir la durée',
      description: 'Sélectionnez la durée du trade : 1 min, 3 min, 5 min ou 10 min. Plus la durée est courte, plus c\'est rapide.',
      icon: 'fa-clock',
      color: '#8B5CF6',
    },
    {
      title: '5. Résultat',
      description: 'À la fin du délai, le résultat est calculé automatiquement. Gagné = +85% de votre mise. Perdu = -100% de votre mise. Match nul = remboursement.',
      icon: 'fa-trophy',
      color: '#FBBF24',
    },
  ],
  tips: [
    'Le gain maximum est de 85% de votre mise.',
    'Commencez par des petites mises pour vous familiariser.',
    'Vous pouvez avoir plusieurs trades en même temps.',
    'Le résultat est déterminé par la variation du prix d\'entrée vs le prix de sortie.',
  ],
  warnings: [
    'Le trading comporte des risques. Vous pouvez perdre toute votre mise.',
    'Ne misez jamais plus que ce que vous pouvez vous permettre de perdre.',
    'Le taux de perte est de 60% — le trading est risqué par nature.',
  ],
};

// ==================== ENTERPRISE GUIDE ====================
export const ENTERPRISE_GUIDE: GuideSection = {
  id: 'enterprise',
  title: 'Projets d\'Entreprise',
  description: 'Investissez dans des projets virtuels',
  icon: 'fa-building',
  color: '#F97316',
  steps: [
    {
      title: '1. Choisir un type de projet',
      description: '4 types disponibles : Court terme (5j, +40-60%), Moyen terme (10j, +60-75%), Long terme (20j, +80-100%), Ultra long (30j, +100-150%).',
      icon: 'fa-layer-group',
      color: '#F97316',
    },
    {
      title: '2. Alimenter votre compte',
      description: 'Les projets se financent depuis votre Compte de Projet. Transférez des fonds depuis le Compte Principal via le Portefeuille si nécessaire.',
      icon: 'fa-wallet',
      color: '#00C853',
    },
    {
      title: '3. Lancer un projet',
      description: 'Cliquez sur un type de projet, entrez le montant (minimum 5$) et confirmez. Un nom d\'entreprise est généré automatiquement.',
      icon: 'fa-rocket',
      color: '#EF4444',
    },
    {
      title: '4. Suivre la progression',
      description: 'Chaque projet a une barre de progression montrant les jours écoulés. Le projet se termine automatiquement quand la durée est atteinte.',
      icon: 'fa-chart-bar',
      color: '#3B82F6',
    },
    {
      title: '5. Réclamer les gains',
      description: 'Quand le projet est terminé, un bouton "Réclamer" apparaît. Le rendement final (entre min et max) est calculé aléatoirement et ajouté à votre Compte de Projet.',
      icon: 'fa-gift',
      color: '#FBBF24',
    },
  ],
  tips: [
    'Plus la durée est longue, plus le rendement potentiel est élevé.',
    'Le rendement final est aléatoire entre le min et le max indiqués.',
    'Vous pouvez lancer plusieurs projets en même temps.',
    'Minimum d\'investissement par projet : 5$.',
  ],
  warnings: [
    '⚠️ Chaque type de projet a un risque de crash : Court=5%, Moyen=10%, Long=15%, Ultra=20%.',
    'En cas de crash, vous perdez tout le montant investi dans ce projet.',
    'Investissez prudemment et diversifiez vos projets.',
  ],
};

// ==================== WITHDRAW GUIDE ====================
export const WITHDRAW_GUIDE: GuideSection = {
  id: 'withdraw',
  title: 'Retraits',
  description: 'Comment retirer vos gains',
  icon: 'fa-arrow-up',
  color: '#F59E0B',
  steps: [
    {
      title: '1. Conditions préalables',
      description: 'Avant de pouvoir retirer, vous devez : avoir effectué au moins un dépôt approuvé, et attendre 48h après votre premier dépôt.',
      icon: 'fa-shield-alt',
      color: '#EF4444',
    },
    {
      title: '2. Solde suffisant',
      description: 'Les retraits se font depuis le Compte Principal. Si vos fonds sont sur un autre compte, transférez-les d\'abord vers le Principal (sans frais).',
      icon: 'fa-wallet',
      color: '#00C853',
    },
    {
      title: '3. Demande de retrait',
      description: 'Entrez le montant à retirer et votre adresse TRX (Trust Wallet). Le retrait sera en attente jusqu\'à l\'approbation de l\'admin.',
      icon: 'fa-paper-plane',
      color: '#3B82F6',
    },
    {
      title: '4. Approbation admin',
      description: 'L\'admin vérifie et approuve votre retrait. Les TRX sont envoyés à votre adresse. Vous serez notifié quand c\'est fait.',
      icon: 'fa-check-double',
      color: '#00C853',
    },
  ],
  tips: [
    'Les transferts des comptes secondaires vers le Principal sont sans frais.',
    'Vérifiez bien votre adresse TRX avant de soumettre.',
    'Utilisez une adresse TRC-20 (commence par T).',
  ],
  warnings: [
    'Délai de 48h obligatoire après le premier dépôt.',
    'Après le 3ème retrait, vous devez avoir au moins 1 filleul (parrainage).',
    'Tous les 2 retraits supplémentaires, 1 filleul de plus est requis.',
    'Assurez-vous que l\'adresse TRX est correcte. Les transactions crypto sont irréversibles.',
  ],
};

// ==================== REFERRAL GUIDE ====================
export const REFERRAL_GUIDE: GuideSection = {
  id: 'referral',
  title: 'Parrainage',
  description: 'Parrainez et gagnez ensemble',
  icon: 'fa-users',
  color: '#FBBF24',
  steps: [
    {
      title: '1. Votre code de parrainage',
      description: 'Chaque utilisateur reçoit un code unique (format BR-XXXXXX). Partagez ce code avec vos amis pour qu\'ils s\'inscrivent.',
      icon: 'fa-key',
      color: '#FBBF24',
    },
    {
      title: '2. Comment parrainer',
      description: 'Partagez votre code via le bouton "Partager" ou copiez-le et envoyez-le manuellement. Vos amis entrent ce code lors de l\'inscription.',
      icon: 'fa-share-alt',
      color: '#3B82F6',
    },
    {
      title: '3. Suivre vos filleuls',
      description: 'Dans votre profil, consultez la liste de vos filleuls et leur statut (actif/inactif). Un filleul est "actif" s\'il a investi.',
      icon: 'fa-list',
      color: '#22C55E',
    },
    {
      title: '4. Pourquoi parrainer ?',
      description: 'Après votre 3ème retrait, vous devez avoir au moins 1 filleul pour continuer à retirer. Tous les 2 retraits suivants, 1 filleul supplémentaire est requis.',
      icon: 'fa-exclamation-circle',
      color: '#EF4444',
    },
  ],
  tips: [
    'Partagez votre code sur les réseaux sociaux pour atteindre plus de personnes.',
    'Un filleul "actif" est quelqu\'un qui a effectué au moins un investissement.',
    'Plus vous avez de filleuls, plus vous pouvez retirer fréquemment.',
  ],
  warnings: [
    'Sans filleuls, vos retraits seront bloqués après le 3ème retrait.',
    'Formule : Filleuls requis = ceil((N° retrait - 2) / 2) pour N° ≥ 3.',
  ],
};

// ==================== DEPOSIT GUIDE ====================
export const DEPOSIT_GUIDE: GuideSection = {
  id: 'deposit',
  title: 'Dépôts TRX',
  description: 'Comment alimenter votre compte',
  icon: 'fa-arrow-down',
  color: '#00C853',
  steps: [
    {
      title: '1. Obtenir des TRX',
      description: 'Achetez des TRX (TRON) sur un exchange (Binance, KuCoin...) et transférez-les vers votre wallet Trust Wallet ou similaire.',
      icon: 'fa-coins',
      color: '#FBBF24',
    },
    {
      title: '2. Envoyer à l\'adresse admin',
      description: 'Dans l\'app, cliquez "Déposer" sur le compte Principal. L\'adresse TRX de l\'admin s\'affiche. Envoyez vos TRX à cette adresse.',
      icon: 'fa-paper-plane',
      color: '#3B82F6',
    },
    {
      title: '3. Soumettre le dépôt',
      description: 'Entrez le montant en USD que vous souhaitez déposer (minimum 10$). Le système calculera l\'équivalent en TRX selon le taux actuel.',
      icon: 'fa-calculator',
      color: '#8B5CF6',
    },
    {
      title: '4. Attendre la confirmation',
      description: 'L\'admin vérifiera la transaction sur la blockchain et approuvera votre dépôt. Le solde sera crédité sur votre Compte Principal.',
      icon: 'fa-check-circle',
      color: '#00C853',
    },
  ],
  tips: [
    'Vérifiez que vous envoyez bien sur le réseau TRC-20 (TRON).',
    'Le taux TRX/USD est mis à jour par l\'admin.',
    'Conservez le hash de transaction comme preuve en cas de problème.',
  ],
  warnings: [
    'N\'envoyez QUE des TRX à l\'adresse indiquée.',
    'Les envois sur un mauvais réseau seront perdus.',
    'Minimum de dépôt : 10$.',
  ],
};

// ==================== ALL GUIDES ====================
export const ALL_GUIDES: GuideSection[] = [
  WALLET_GUIDE,
  DEPOSIT_GUIDE,
  INVEST_GUIDE,
  TRADING_GUIDE,
  ENTERPRISE_GUIDE,
  WITHDRAW_GUIDE,
  REFERRAL_GUIDE,
];
