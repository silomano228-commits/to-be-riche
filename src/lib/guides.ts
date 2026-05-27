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
      description: 'C\'est votre compte central. Tous les dépôts (TRX ou YAS) arrivent ici et les retraits partent d\'ici. C\'est le hub de vos finances sur Be Rich.',
      icon: 'fa-wallet',
      color: '#00C853',
    },
    {
      title: '2. Compte d\'Investissement',
      description: 'Transférez des fonds ici pour investir dans les plans Starter, Growth, Premium ou Elite. Chaque plan offre un taux de rendement par cycle (5% à 12.5%).',
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
      description: 'Investissez dans des projets d\'entreprise virtuels (Court, Moyen, Long ou Ultra terme) avec des rendements potentiels de +15% à +95%.',
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
      description: 'Cliquez sur "Déposer" sur le compte Principal. Deux méthodes : TRX (crypto) ou YAS (mobile money). Suivez les instructions et soumettez. L\'admin approuvera votre dépôt.',
      icon: 'fa-arrow-down',
      color: '#00C853',
    },
  ],
  tips: [
    'Les transferts VERS les comptes Investissement/Trading/Projet ont des frais de 2%.',
    'Les transferts RETOUR vers le Principal sont sans frais.',
    'Minimum de transfert : 2 $.',
    'Minimum de dépôt : 10 $ en TRX ou 6 000 FCFA en YAS.',
  ],
  warnings: [
    'Attendez la confirmation de l\'admin avant de considérer un dépôt comme validé.',
    'Vérifiez bien l\'adresse TRX ou le numéro YAS avant d\'envoyer.',
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
      description: '4 niveaux disponibles : Starter (2-5$, 5%/cycle, 35 cycles), Growth (5.5-10$, 7.5%/cycle, 25 cycles), Premium (10.5-20$, 9.5%/cycle, 20 cycles) et Elite (20.5-50$, 12.5%/cycle, 20 cycles).',
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
    'Si vous avez été parrainé, 5% de vos gains d\'investissement sont reversés au parrain.',
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
      description: 'Le trading se fait depuis votre Compte de Trading. Transférez des fonds depuis le Compte Principal si nécessaire (frais de 2% sur le transfert).',
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
      description: 'À la fin du délai, le résultat est calculé automatiquement. Gagné = +75% à 85% de votre mise. Perdu = -100% de votre mise. Match nul = remboursement intégral.',
      icon: 'fa-trophy',
      color: '#FBBF24',
    },
  ],
  tips: [
    'Le gain est compris entre 75% et 85% de votre mise.',
    'Commencez par des petites mises pour vous familiariser.',
    'Vous pouvez avoir plusieurs trades en même temps.',
    'Le résultat est déterminé par la variation du prix d\'entrée vs le prix de sortie.',
  ],
  warnings: [
    'Le trading comporte des risques importants. Vous pouvez perdre toute votre mise.',
    'Ne misez jamais plus que ce que vous pouvez vous permettre de perdre.',
    'Le trading est risqué par nature — la majorité des trades sont perdants.',
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
      description: '4 types disponibles : Court terme (5j, +15-28%), Moyen terme (10j, +30-48%), Long terme (20j, +50-68%), Ultra long (30j, +70-95%).',
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
      description: 'Cliquez sur un type de projet, entrez le montant (minimum 5$) et confirmez. Un nom d\'entreprise est généré automatiquement (ex: Alpha Tech Startup).',
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
      description: 'Quand le projet est terminé, un bouton "Réclamer" apparaît. Le rendement final (entre min et max) est calculé aléatoirement. Le capital + les gains sont ajoutés à votre Compte de Projet.',
      icon: 'fa-gift',
      color: '#FBBF24',
    },
  ],
  tips: [
    'Plus la durée est longue, plus le rendement potentiel est élevé.',
    'Le rendement final est aléatoire entre le min et le max indiqués.',
    'Vous pouvez lancer plusieurs projets en même temps.',
    'Minimum d\'investissement par projet : 5$.',
    'Tous les projets aboutissent — pas de risque de crash.',
  ],
  warnings: [
    'Vous ne pouvez pas annuler un projet en cours.',
    'Assurez-vous d\'avoir les fonds nécessaires avant de lancer un projet.',
    'Pensez à réclamer vos gains une fois le projet terminé.',
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
      description: 'Avant de pouvoir retirer, vous devez : avoir effectué au moins un dépôt approuvé, attendre 48h après votre premier dépôt, et avoir suffisamment de filleuls selon la formule.',
      icon: 'fa-shield-alt',
      color: '#EF4444',
    },
    {
      title: '2. Solde suffisant',
      description: 'Les retraits se font depuis le Compte Principal (minimum 5$). Si vos fonds sont sur un autre compte, transférez-les d\'abord vers le Principal (sans frais).',
      icon: 'fa-wallet',
      color: '#00C853',
    },
    {
      title: '3. Méthode de retrait TRX',
      description: 'Entrez le montant à retirer et votre adresse TRX (Trust Wallet, minimum 20 caractères). L\'admin vous enverra les TRX à cette adresse.',
      icon: 'fa-paper-plane',
      color: '#3B82F6',
    },
    {
      title: '4. Méthode de retrait YAS',
      description: 'Entrez le montant à retirer et votre numéro de compte YAS (8 chiffres, préfixe 90-93 ou 70-73). Le montant sera converti en FCFA et envoyé sur votre compte YAS.',
      icon: 'fa-mobile-alt',
      color: '#22C55E',
    },
    {
      title: '5. Conversion TRX → YAS',
      description: 'Vous pouvez aussi convertir vos TRX en FCFA via YAS. Indiquez votre adresse TRX (pour envoyer les TRX à l\'admin) et votre numéro YAS (pour recevoir les FCFA).',
      icon: 'fa-exchange-alt',
      color: '#8B5CF6',
    },
    {
      title: '6. Approbation admin',
      description: 'Quel que soit le mode, le retrait est en attente jusqu\'à l\'approbation de l\'admin. Vous serez notifié quand c\'est traité.',
      icon: 'fa-check-double',
      color: '#00C853',
    },
  ],
  tips: [
    'Les transferts des comptes secondaires vers le Principal sont sans frais.',
    'Vérifiez bien votre adresse TRX ou numéro YAS avant de soumettre.',
    'Utilisez une adresse TRC-20 (commence par T) pour les retraits TRX.',
    'Un seul retrait en attente à la fois.',
    'Minimum de retrait : 5$.',
  ],
  warnings: [
    'Délai de 48h obligatoire après le premier dépôt.',
    'Filleuls requis selon la formule : Filleuls ≥ max(1, ceil(N° retrait / 2)). Exemple : 1er retrait = 1 filleul, 3ème = 2, 5ème = 3.',
    'Sans filleuls suffisants, vos retraits seront bloqués.',
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
      title: '3. Bonus de premier dépôt (20%)',
      description: 'Quand votre filleul effectue son premier dépôt (TRX ou YAS), vous recevez automatiquement un bonus de 20% du montant sur votre Compte Principal. Ce bonus ne déduit rien du compte de votre filleul.',
      icon: 'fa-gift',
      color: '#00C853',
    },
    {
      title: '4. Bonus sur gains d\'investissement (5%)',
      description: 'Chaque fois que votre filleul réclame ses gains d\'investissement, vous recevez 5% de ces gains. Ce bonus est crédité sur le compte de l\'administrateur.',
      icon: 'fa-chart-line',
      color: '#22C55E',
    },
    {
      title: '5. Suivre vos filleuls',
      description: 'Dans votre profil, consultez la liste de vos filleuls et leur statut (actif/inactif). Un filleul est "actif" s\'il a effectué au moins un dépôt.',
      icon: 'fa-list',
      color: '#3B82F6',
    },
    {
      title: '6. Condition de retrait',
      description: 'Pour pouvoir retirer, vous devez avoir des filleuls : Filleuls requis = max(1, ceil(N° retrait / 2)). Parrainez activement pour ne pas être bloqué.',
      icon: 'fa-exclamation-circle',
      color: '#EF4444',
    },
  ],
  tips: [
    'Partagez votre code sur les réseaux sociaux pour atteindre plus de personnes.',
    'Le bonus de 20% sur le premier dépôt est automatique — pas besoin de le réclamer.',
    'Plus vous avez de filleuls actifs, plus vous gagnez de bonus et plus vous pouvez retirer.',
    'Un filleul "actif" est quelqu\'un qui a effectué au moins un dépôt approuvé.',
  ],
  warnings: [
    'Sans filleuls suffisants, vos retraits seront bloqués.',
    'Formule : Filleuls requis = max(1, ceil(N° retrait / 2)).',
    'Exemple : 1er retrait = 1 filleul requis, 2ème = 1, 3ème = 2, 4ème = 2, 5ème = 3.',
  ],
};

// ==================== DEPOSIT GUIDE ====================
export const DEPOSIT_GUIDE: GuideSection = {
  id: 'deposit',
  title: 'Dépôts TRX & YAS',
  description: 'Comment alimenter votre compte',
  icon: 'fa-arrow-down',
  color: '#00C853',
  steps: [
    {
      title: '1. Dépôt par TRX (Crypto)',
      description: 'Cliquez "Déposer" et choisissez TRX. Achetez des TRX sur un exchange (Binance, KuCoin...), envoyez-les à l\'adresse admin affichée, puis soumettez le montant en USD (minimum 10$).',
      icon: 'fa-coins',
      color: '#FBBF24',
    },
    {
      title: '2. Vérifier l\'adresse TRX',
      description: 'L\'adresse TRX de l\'admin s\'affiche dans l\'app. Envoyez uniquement des TRX sur le réseau TRC-20 (TRON) à cette adresse.',
      icon: 'fa-qrcode',
      color: '#3B82F6',
    },
    {
      title: '3. Dépôt par YAS (Mobile Money)',
      description: 'Cliquez "Déposer" et choisissez YAS. Entrez le montant en FCFA (minimum 6 000 FCFA) et votre numéro de compte YAS (8 chiffres, préfixe 90-93 ou 70-73).',
      icon: 'fa-mobile-alt',
      color: '#22C55E',
    },
    {
      title: '4. Taux de conversion',
      description: 'Pour TRX : le taux est automatiquement récupéré depuis Binance. Pour YAS : 1$ = 600 FCFA (taux configuré par l\'admin). Le système calcule l\'équivalent automatiquement.',
      icon: 'fa-calculator',
      color: '#8B5CF6',
    },
    {
      title: '5. Attendre la confirmation',
      description: 'L\'admin vérifiera la transaction et approuvera votre dépôt. Le solde sera crédité sur votre Compte Principal. Vous ne pouvez avoir qu\'un dépôt en attente à la fois.',
      icon: 'fa-check-circle',
      color: '#00C853',
    },
  ],
  tips: [
    'Deux méthodes de dépôt : TRX (crypto) ou YAS (mobile money).',
    'Vérifiez que vous envoyez bien sur le réseau TRC-20 (TRON) pour les dépôts TRX.',
    'Le taux TRX/USD est mis à jour automatiquement depuis Binance.',
    'Conservez le hash de transaction comme preuve en cas de problème.',
    'Pour YAS, utilisez un numéro valide (8 chiffres commençant par 90-93 ou 70-73).',
  ],
  warnings: [
    'N\'envoyez QUE des TRX à l\'adresse TRX indiquée.',
    'Les envois sur un mauvais réseau seront perdus.',
    'Minimum de dépôt : 10$ en TRX ou 6 000 FCFA en YAS.',
    'Un seul dépôt en attente à la fois (TRX ou YAS).',
  ],
};

// ==================== CHAT & SUPPORT GUIDE ====================
export const CHAT_GUIDE: GuideSection = {
  id: 'chat',
  title: 'Assistance & Support',
  description: 'Chat IA et support admin',
  icon: 'fa-headset',
  color: '#8B5CF6',
  steps: [
    {
      title: '1. Chatbot IA',
      description: 'Besoin d\'aide ? Discutez avec notre assistant IA intégré. Il peut répondre à vos questions sur le fonctionnement de Be Rich, les investissements, les retraits, etc.',
      icon: 'fa-robot',
      color: '#8B5CF6',
    },
    {
      title: '2. Conseils d\'investissement',
      description: 'Le chatbot peut vous donner des conseils personnalisés sur les stratégies d\'investissement, les plans disponibles et les meilleures pratiques.',
      icon: 'fa-lightbulb',
      color: '#FBBF24',
    },
    {
      title: '3. Escalade vers l\'admin',
      description: 'Si le chatbot ne peut pas résoudre votre problème, il crée automatiquement un ticket de support. Vous pouvez aussi escalader manuellement vers un administrateur.',
      icon: 'fa-exclamation-triangle',
      color: '#EF4444',
    },
    {
      title: '4. Conversation avec l\'admin',
      description: 'Une fois le ticket créé, vous pouvez échanger en direct avec un administrateur via le chat. Les réponses sont envoyées en temps réel.',
      icon: 'fa-comments',
      color: '#3B82F6',
    },
  ],
  tips: [
    'Le chatbot IA est disponible 24h/24 pour répondre à vos questions.',
    'Décrivez votre problème clairement pour obtenir une meilleure aide.',
    'L\'escalade automatique se déclenche si le chatbot détecte que vous avez besoin d\'un humain.',
  ],
  warnings: [
    'Le chatbot IA peut faire des erreurs — vérifiez les informations importantes.',
    'Pour les problèmes urgents (retraits bloqués, dépôts manquants), demandez l\'admin directement.',
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
  CHAT_GUIDE,
];
