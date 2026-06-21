// Company advertisement catalog for tab-change popup ads.
// Same companies as the video platform (Chinese/Japanese/Indian).

export interface AdItem {
  id: string;
  company: string;
  category: 'chinois' | 'japonais' | 'indien';
  headline: string;
  subheadline: string;
  tagline: string;
  cta: string;
  gradient: string;
  icon: string;
}

export const AD_CATALOG: AdItem[] = [
  // Chinese companies
  { id: 'ad-huawei', company: 'Huawei', category: 'chinois', headline: 'Connecter le monde', subheadline: 'La technologie qui rapproche les gens.', tagline: '5G Innovation', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #C2410C, #DC2626)', icon: 'fa-mobile-screen' },
  { id: 'ad-xiaomi', company: 'Xiaomi', category: 'chinois', headline: 'La technologie pour tous', subheadline: 'Innovation accessible à chacun.', tagline: 'Mi Fan', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #EA580C, #F59E0B)', icon: 'fa-mobile-button' },
  { id: 'ad-byd', company: 'BYD', category: 'chinois', headline: 'Roulez vers demain', subheadline: 'Véhicules électriques pour un avenir vert.', tagline: 'Green Drive', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #15803D, #16A34A)', icon: 'fa-car-side' },
  { id: 'ad-alibaba', company: 'Alibaba', category: 'chinois', headline: 'Le commerce sans frontières', subheadline: 'Tout ce dont vous avez besoin, au meilleur prix.', tagline: 'Global Trade', cta: 'Acheter', gradient: 'linear-gradient(135deg, #D97706, #F59E0B)', icon: 'fa-cart-shopping' },
  { id: 'ad-dji', company: 'DJI', category: 'chinois', headline: 'Capturez l\'instant', subheadline: 'Des drones qui voient plus loin.', tagline: 'Sky View', cta: 'Explorer', gradient: 'linear-gradient(135deg, #1E293B, #475569)', icon: 'fa-helicopter' },

  // Japanese companies
  { id: 'ad-toyota', company: 'Toyota', category: 'japonais', headline: 'Mobiliser demain', subheadline: 'La route vers l\'avenir commence ici.', tagline: 'Hybrid Electric', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #B91C1C, #DC2626)', icon: 'fa-car' },
  { id: 'ad-sony', company: 'Sony', category: 'japonais', headline: 'L\'âme du divertissement', subheadline: 'Vivez l\'émotion. Sans compromis.', tagline: 'PlayStation 5', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #1E3A8A, #1E40AF)', icon: 'fa-gamepad' },
  { id: 'ad-nintendo', company: 'Nintendo', category: 'japonais', headline: 'Jouons ensemble', subheadline: 'Le jeu prend vie.', tagline: 'Switch', cta: 'Jouer', gradient: 'linear-gradient(135deg, #B91C1C, #EF4444)', icon: 'fa-gamepad' },
  { id: 'ad-honda', company: 'Honda', category: 'japonais', headline: 'La puissance des rêves', subheadline: 'L\'innovation au service de votre mobilité.', tagline: 'Power of Dreams', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #1E40AF, #2563EB)', icon: 'fa-motorcycle' },
  { id: 'ad-panasonic', company: 'Panasonic', category: 'japonais', headline: 'Pour une vie meilleure', subheadline: 'Des technologies qui simplifient votre quotidien.', tagline: 'A Better Life', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #1E3A8A, #3B82F6)', icon: 'fa-house-laptop' },

  // Indian companies
  { id: 'ad-tata', company: 'Tata', category: 'indien', headline: 'Bâtir l\'avenir', subheadline: 'Des solutions pour chaque aspect de la vie.', tagline: 'We Are Tata', cta: 'Découvrir', gradient: 'linear-gradient(135deg, #1E40AF, #3B82F6)', icon: 'fa-building' },
  { id: 'ad-reliance', company: 'Reliance', category: 'indien', headline: 'Vivre mieux ensemble', subheadline: 'Énergie, communication, commerce — tout au même endroit.', tagline: 'Growth is Life', cta: 'En savoir plus', gradient: 'linear-gradient(135deg, #15803D, #22C55E)', icon: 'fa-bolt' },
  { id: 'ad-infosys', company: 'Infosys', category: 'indien', headline: 'Naviguer dans le futur', subheadline: 'La technologie qui propulse votre entreprise.', tagline: 'Navigate Your Next', cta: 'Voir plus', gradient: 'linear-gradient(135deg, #1E3A8A, #1E40AF)', icon: 'fa-laptop-code' },
  { id: 'ad-mahindra', company: 'Mahindra', category: 'indien', headline: 'Rise for Good', subheadline: 'Des véhicules robustes pour tous les terrains.', tagline: 'Drive Rise', cta: 'Explorer', gradient: 'linear-gradient(135deg, #B91C1C, #DC2626)', icon: 'fa-truck-pickup' },
  { id: 'ad-flipkart', company: 'Flipkart', category: 'indien', headline: 'Le shopping abordable', subheadline: 'Des millions de produits à prix imbattables.', tagline: 'Big Billion Days', cta: 'Acheter', gradient: 'linear-gradient(135deg, #C2410C, #EA580C)', icon: 'fa-bag-shopping' },
];

export function getRandomAd(excludeId?: string): AdItem {
  const available = excludeId ? AD_CATALOG.filter((a) => a.id !== excludeId) : AD_CATALOG;
  return available[Math.floor(Math.random() * available.length)];
}
