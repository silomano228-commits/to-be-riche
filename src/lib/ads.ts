// Company advertisement catalog for tab-change popup ads.
// Same companies as the video platform (Chinese/Japanese/Indian + more).
// Each ad has a distinct `layout` so popups look visibly different.

export type AdLayout =
  | 'hero'        // big centered icon + headline + CTA
  | 'split'       // icon left, text right
  | 'banner'      // wide top banner style
  | 'card'        // product-card style with price/tagline
  | 'quote'       // big quote / slogan style
  | 'stats';      // number/stat highlight style

export interface AdItem {
  id: string;
  company: string;
  category: 'chinois' | 'japonais' | 'indien' | 'coréen' | 'américain' | 'européen';
  headline: string;
  subheadline: string;
  tagline: string;
  cta: string;
  gradient: string;
  icon: string;
  layout: AdLayout;
  accent: string; // accent color for details
}

export const AD_CATALOG: AdItem[] = [
  // ===== Chinese companies =====
  { id: 'ad-huawei', company: 'Huawei', category: 'chinois', headline: 'Connecter le monde', subheadline: 'La technologie 5G qui rapproche les gens partout.', tagline: '5G Innovation', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #C2410C 0%, #DC2626 100%)', icon: 'fa-mobile-screen', layout: 'hero', accent: '#FED7AA' },
  { id: 'ad-xiaomi', company: 'Xiaomi', category: 'chinois', headline: 'La technologie pour tous', subheadline: 'Innovation accessible à chaque budget.', tagline: 'Mi Fan', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #EA580C 0%, #F59E0B 100%)', icon: 'fa-mobile-button', layout: 'split', accent: '#FEF3C7' },
  { id: 'ad-byd', company: 'BYD', category: 'chinois', headline: 'Roulez vers demain', subheadline: 'Véhicules électriques pour un avenir vert.', tagline: 'Green Drive', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)', icon: 'fa-car-side', layout: 'banner', accent: '#BBF7D0' },
  { id: 'ad-alibaba', company: 'Alibaba', category: 'chinois', headline: 'Le commerce sans frontières', subheadline: 'Tout ce dont vous avez besoin, au meilleur prix.', tagline: 'Global Trade', cta: 'Acheter', gradient: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)', icon: 'fa-cart-shopping', layout: 'card', accent: '#FDE68A' },
  { id: 'ad-dji', company: 'DJI', category: 'chinois', headline: 'Capturez l\'instant', subheadline: 'Des drones qui voient plus loin.', tagline: 'Sky View', cta: 'Explorer', gradient: 'linear-gradient(160deg, #0F172A 0%, #334155 100%)', icon: 'fa-helicopter', layout: 'quote', accent: '#94A3B8' },
  { id: 'ad-tencent', company: 'Tencent', category: 'chinois', headline: 'Le divertissement connecté', subheadline: 'Jeux, musique, réseaux — tout au même endroit.', tagline: '1.3 Md d\'utilisateurs', cta: 'Rejoindre', gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', icon: 'fa-gamepad', layout: 'stats', accent: '#BFDBFE' },
  { id: 'ad-lenovo', company: 'Lenovo', category: 'chinois', headline: 'L\'innovation au quotidien', subheadline: 'PC, serveurs et solutions cloud.', tagline: 'Top 1 PC mondial', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)', icon: 'fa-laptop', layout: 'split', accent: '#FECACA' },
  { id: 'ad-oppo', company: 'Oppo', category: 'chinois', headline: 'Photographiez la vie', subheadline: 'Appareils photo mobiles nouvelle génération.', tagline: 'Capture Every Detail', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #047857 0%, #10B981 100%)', icon: 'fa-camera', layout: 'card', accent: '#A7F3D0' },
  { id: 'ad-hisense', company: 'Hisense', category: 'chinois', headline: 'La maison intelligente', subheadline: 'TV, électroménager, climatisation connectée.', tagline: 'Smart Living', cta: 'Explorer', gradient: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 100%)', icon: 'fa-house-laptop', layout: 'banner', accent: '#FED7AA' },
  { id: 'ad-zte', company: 'ZTE', category: 'chinois', headline: 'Réseaux du futur', subheadline: 'Infrastructure télécom mondiale.', tagline: '5G Pioneer', cta: 'En savoir plus', gradient: 'linear-gradient(160deg, #1E3A8A 0%, #1E40AF 100%)', icon: 'fa-tower-cell', layout: 'quote', accent: '#BFDBFE' },

  // ===== Japanese companies =====
  { id: 'ad-toyota', company: 'Toyota', category: 'japonais', headline: 'Mobiliser demain', subheadline: 'La route vers l\'avenir commence ici.', tagline: 'Hybrid Electric', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)', icon: 'fa-car', layout: 'hero', accent: '#FECACA' },
  { id: 'ad-sony', company: 'Sony', category: 'japonais', headline: 'L\'âme du divertissement', subheadline: 'Vivez l\'émotion. Sans compromis.', tagline: 'PlayStation 5', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', icon: 'fa-gamepad', layout: 'split', accent: '#BFDBFE' },
  { id: 'ad-nintendo', company: 'Nintendo', category: 'japonais', headline: 'Jouons ensemble', subheadline: 'Le jeu prend vie.', tagline: 'Switch', cta: 'Jouer', gradient: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)', icon: 'fa-gamepad', layout: 'card', accent: '#FECACA' },
  { id: 'ad-honda', company: 'Honda', category: 'japonais', headline: 'La puissance des rêves', subheadline: 'L\'innovation au service de votre mobilité.', tagline: 'Power of Dreams', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', icon: 'fa-motorcycle', layout: 'banner', accent: '#BFDBFE' },
  { id: 'ad-panasonic', company: 'Panasonic', category: 'japonais', headline: 'Pour une vie meilleure', subheadline: 'Des technologies qui simplifient votre quotidien.', tagline: 'A Better Life', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%)', icon: 'fa-house-laptop', layout: 'quote', accent: '#BFDBFE' },
  { id: 'ad-canon', company: 'Canon', category: 'japonais', headline: 'Capturez l\'instant', subheadline: 'Appareils photo professionnels et grand public.', tagline: 'See Impossible', cta: 'Explorer', gradient: 'linear-gradient(135deg, #991B1B 0%, #DC2626 100%)', icon: 'fa-camera-retro', layout: 'stats', accent: '#FECACA' },
  { id: 'ad-nissan', company: 'Nissan', category: 'japonais', headline: 'L\'innovation continue', subheadline: 'Voitures électriques Leaf et Ariya.', tagline: 'Innovation for All', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0891B2 100%)', icon: 'fa-car-side', layout: 'split', accent: '#BAE6FD' },
  { id: 'ad-suzuki', company: 'Suzuki', category: 'japonais', headline: 'Compact et malin', subheadline: 'Voitures et motos efficaces.', tagline: 'Way of Life', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', icon: 'fa-motorcycle', layout: 'card', accent: '#BFDBFE' },
  { id: 'ad-hitachi', company: 'Hitachi', category: 'japonais', headline: 'Inspirez le prochain', subheadline: 'Solutions industrielles et IoT.', tagline: 'Inspire the Next', cta: 'En savoir plus', gradient: 'linear-gradient(160deg, #0F172A 0%, #475569 100%)', icon: 'fa-industry', layout: 'hero', accent: '#94A3B8' },
  { id: 'ad-sharp', company: 'Sharp', category: 'japonais', headline: 'La clarté absolue', subheadline: 'Écrans, TV et électronique grand public.', tagline: 'Be Sharp', cta: 'Explorer', gradient: 'linear-gradient(135deg, #7C2D12 0%, #EA580C 100%)', icon: 'fa-tv', layout: 'banner', accent: '#FED7AA' },
  { id: 'ad-mitsubishi', company: 'Mitsubishi', category: 'japonais', headline: 'Conduire le changement', subheadline: 'Voitures électriques et hybrides.', tagline: 'Drive@earth', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)', icon: 'fa-car', layout: 'quote', accent: '#FECACA' },

  // ===== Indian companies =====
  { id: 'ad-tata', company: 'Tata', category: 'indien', headline: 'Bâtir l\'avenir', subheadline: 'Des solutions pour chaque aspect de la vie.', tagline: 'We Are Tata', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', icon: 'fa-building', layout: 'hero', accent: '#BFDBFE' },
  { id: 'ad-reliance', company: 'Reliance', category: 'indien', headline: 'Vivre mieux ensemble', subheadline: 'Énergie, communication, commerce — tout au même endroit.', tagline: 'Growth is Life', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #15803D 0%, #22C55E 100%)', icon: 'fa-bolt', layout: 'split', accent: '#BBF7D0' },
  { id: 'ad-infosys', company: 'Infosys', category: 'indien', headline: 'Naviguer dans le futur', subheadline: 'La technologie qui propulse votre entreprise.', tagline: 'Navigate Your Next', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', icon: 'fa-laptop-code', layout: 'card', accent: '#BFDBFE' },
  { id: 'ad-mahindra', company: 'Mahindra', category: 'indien', headline: 'Rise for Good', subheadline: 'Des véhicules robustes pour tous les terrains.', tagline: 'Drive Rise', cta: 'Explorer', gradient: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)', icon: 'fa-truck-pickup', layout: 'banner', accent: '#FECACA' },
  { id: 'ad-flipkart', company: 'Flipkart', category: 'indien', headline: 'Le shopping abordable', subheadline: 'Des millions de produits à prix imbattables.', tagline: 'Big Billion Days', cta: 'Acheter', gradient: 'linear-gradient(135deg, #C2410C 0%, #EA580C 100%)', icon: 'fa-bag-shopping', layout: 'stats', accent: '#FED7AA' },
  { id: 'ad-paytm', company: 'Paytm', category: 'indien', headline: 'Payez en toute simplicité', subheadline: 'Paiements mobiles et wallets digitaux.', tagline: 'Paytm Karo', cta: 'Rejoindre', gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0891B2 100%)', icon: 'fa-wallet', layout: 'quote', accent: '#BAE6FD' },
  { id: 'ad-ola', company: 'Ola', category: 'indien', headline: 'Vos déplacements, notre priorité', subheadline: 'VTC et scooters électriques.', tagline: 'Ola Electric', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #15803D 0%, #16A34A 100%)', icon: 'fa-taxi', layout: 'card', accent: '#BBF7D0' },
  { id: 'ad-airtel', company: 'Bharti Airtel', category: 'indien', headline: 'Connecter l\'Inde', subheadline: 'Télécom, internet et TV.', tagline: 'The Smartphone Network', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', icon: 'fa-signal', layout: 'hero', accent: '#BFDBFE' },
  { id: 'ad-wipro', company: 'Wipro', category: 'indien', headline: 'Pensée appliquée', subheadline: 'Services IT et conseil mondial.', tagline: 'Apply Thought', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)', icon: 'fa-lightbulb', layout: 'split', accent: '#E9D5FF' },
  { id: 'ad-tatamotors', company: 'Tata Motors', category: 'indien', headline: 'Conduire le changement', subheadline: 'Voitures, utilitaires et véhicules commerciaux.', tagline: 'Connecting Aspirations', cta: 'Explorer', gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', icon: 'fa-truck', layout: 'banner', accent: '#BFDBFE' },

  // ===== Korean companies =====
  { id: 'ad-samsung', company: 'Samsung', category: 'coréen', headline: 'Inspirez le monde', subheadline: 'Smartphones, TV, électroménager high-tech.', tagline: 'Galaxy AI', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', icon: 'fa-mobile-screen', layout: 'hero', accent: '#BFDBFE' },
  { id: 'ad-lg', company: 'LG', category: 'coréen', headline: 'Life\'s Good', subheadline: 'Électronique et électroménager innovant.', tagline: 'Innovation for a Better Life', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)', icon: 'fa-tv', layout: 'card', accent: '#FECACA' },
  { id: 'ad-hyundai', company: 'Hyundai', category: 'coréen', headline: 'New Thinking. New Possibilities.', subheadline: 'Voitures hybrides et électriques.', tagline: 'Ioniq', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #0C4A6E 0%, #0891B2 100%)', icon: 'fa-car', layout: 'split', accent: '#BAE6FD' },
  { id: 'ad-kia', company: 'Kia', category: 'coréen', headline: 'Movement that inspires', subheadline: 'SUV et véhicules électriques EV.', tagline: 'EV6 / EV9', cta: 'Explorer', gradient: 'linear-gradient(135deg, #C2410C 0%, #EA580C 100%)', icon: 'fa-car-side', layout: 'banner', accent: '#FED7AA' },

  // ===== American companies =====
  { id: 'ad-tesla', company: 'Tesla', category: 'américain', headline: 'Accélérez l\'avenir durable', subheadline: 'Voitures électriques et énergie solaire.', tagline: '0-100 en 2.1s', cta: 'Voir plus', gradient: 'linear-gradient(160deg, #0F172A 0%, #334155 100%)', icon: 'fa-bolt', layout: 'stats', accent: '#94A3B8' },
  { id: 'ad-apple', company: 'Apple', category: 'américain', headline: 'Think Different', subheadline: 'iPhone, Mac, iPad et services.', tagline: 'iPhone 15 Pro', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)', icon: 'fa-mobile-screen-button', layout: 'quote', accent: '#D1D5DB' },
  { id: 'ad-microsoft', company: 'Microsoft', category: 'américain', headline: 'Empower everyone', subheadline: 'Windows, Office, Azure, Surface.', tagline: 'Cloud Power', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)', icon: 'fa-display', layout: 'hero', accent: '#BFDBFE' },
  { id: 'ad-google', company: 'Google', category: 'américain', headline: 'Organiser l\'information mondiale', subheadline: 'Recherche, Android, Cloud, IA.', tagline: 'Gemini AI', cta: 'Explorer', gradient: 'linear-gradient(135deg, #15803D 0%, #22C55E 100%)', icon: 'fa-magnifying-glass', layout: 'card', accent: '#BBF7D0' },
  { id: 'ad-amazon', company: 'Amazon', category: 'américain', headline: 'Tout pour vous', subheadline: 'Commerce, Prime, AWS, Alexa.', tagline: 'Prime Day', cta: 'Acheter', gradient: 'linear-gradient(135deg, #C2410C 0%, #F59E0B 100%)', icon: 'fa-box', layout: 'banner', accent: '#FED7AA' },
  { id: 'ad-meta', company: 'Meta', category: 'américain', headline: 'Connecter le monde', subheadline: 'Facebook, Instagram, WhatsApp, Quest.', tagline: 'Meta Quest 3', cta: 'Rejoindre', gradient: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', icon: 'fa-users', layout: 'split', accent: '#BFDBFE' },

  // ===== European companies =====
  { id: 'ad-bmw', company: 'BMW', category: 'européen', headline: 'Le plaisir de conduire', subheadline: 'Berlines et SUV de luxe allemands.', tagline: 'Sheer Driving Pleasure', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #1E3A8A 0%, #1E40AF 100%)', icon: 'fa-car', layout: 'hero', accent: '#BFDBFE' },
  { id: 'ad-mercedes', company: 'Mercedes-Benz', category: 'européen', headline: 'The Best or Nothing', subheadline: 'Voitures de luxe et électriques EQ.', tagline: 'EQS', cta: 'Découvrir', gradient: 'linear-gradient(160deg, #0F172A 0%, #475569 100%)', icon: 'fa-car-side', layout: 'quote', accent: '#94A3B8' },
  { id: 'ad-nike', company: 'Nike', category: 'américain', headline: 'Just Do It', subheadline: 'Chaussures, vêtements et équipement sportif.', tagline: 'Air Max', cta: 'Acheter', gradient: 'linear-gradient(135deg, #1F2937 0%, #374151 100%)', icon: 'fa-shoe-prints', layout: 'stats', accent: '#D1D5DB' },
  { id: 'ad-cocacola', company: 'Coca-Cola', category: 'américain', headline: 'Taste the Feeling', subheadline: 'Boissons rafraîchissantes mondiales.', tagline: 'Open Happiness', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #B91C1C 0%, #DC2626 100%)', icon: 'fa-mug-hot', layout: 'card', accent: '#FECACA' },
  { id: 'ad-louisvuitton', company: 'Louis Vuitton', category: 'européen', headline: 'L\'art du voyage', subheadline: 'Maroquinerie et luxe français.', tagline: 'Since 1854', cta: 'Explorer', gradient: 'linear-gradient(135deg, #7C2D12 0%, #C2410C 100%)', icon: 'fa-bag-shopping', layout: 'banner', accent: '#FED7AA' },
];

export function getRandomAd(excludeId?: string): AdItem {
  const available = excludeId ? AD_CATALOG.filter((a) => a.id !== excludeId) : AD_CATALOG;
  return available[Math.floor(Math.random() * available.length)];
}

export function getAdById(id: string): AdItem | undefined {
  return AD_CATALOG.find((a) => a.id === id);
}
