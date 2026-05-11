'use client';

import { useState } from 'react';

const STEPS = [
  {
    number: 1,
    icon: 'fa-download',
    title: 'Télécharger Trust Wallet',
    description:
      'Téléchargez l\'application Trust Wallet depuis l\'App Store (iOS) ou Google Play (Android). C\'est le portefeuille crypto le plus populaire et sécurisé.',
    detail: 'Recherchez "Trust Wallet" dans votre store et installez l\'application officielle.',
  },
  {
    number: 2,
    icon: 'fa-wallet',
    title: 'Créer un portefeuille',
    description:
      'Ouvrez l\'application et créez un nouveau portefeuille. Notez et conservez votre phrase de récupération (12 mots) dans un endroit sûr.',
    detail: 'Ne partagez jamais votre phrase de récupération avec qui que ce soit.',
  },
  {
    number: 3,
    icon: 'fa-plus-circle',
    title: 'Ajouter TRX (Tron)',
    description:
      'Appuyez sur l\'icône "+" en haut à droite, puis recherchez "TRX" ou "Tron". Activez le jeton pour le faire apparaître dans votre portefeuille.',
    detail: 'Si vous ne voyez pas TRX, utilisez la barre de recherche et tapez "Tron".',
  },
  {
    number: 4,
    icon: 'fa-copy',
    title: 'Copier votre adresse TRX',
    description:
      'Appuyez sur TRX dans votre portefeuille, puis sur "Recevoir". Votre adresse TRX commence par la lettre "T". Copiez cette adresse.',
    detail: 'L\'adresse TRX ressemble à : TLa2f6VPqDgRE67v1736s7bJ8Ray5wYjU7',
  },
];

export default function TrxGuidePage() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#F2F5F9] flex flex-col font-[Inter]">
      {/* Header */}
      <header className="h-[58px] bg-[rgba(255,255,255,0.88)] backdrop-blur-2xl flex items-center justify-between px-[18px] sticky top-0 z-20 shrink-0 border-b border-[rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(0,0,0,0.04)] text-[#64748B] cursor-pointer border-none text-[0.85rem] transition-transform active:scale-90 no-underline"
          >
            <i className="fas fa-arrow-left"></i>
          </a>
          <h1 className="text-[1rem] font-bold text-[#1A2332]">Guide TRX</h1>
        </div>
        <div className="w-9" />
      </header>

      {/* Content */}
      <div className="flex-1 px-[18px] py-5">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] rounded-2xl p-6 mb-6 relative overflow-hidden border border-[rgba(255,255,255,0.05)]">
          <div className="absolute -top-10 -right-10 w-[150px] h-[150px] bg-[radial-gradient(circle,rgba(0,200,83,0.12),transparent_65%)]" />
          <div className="absolute -bottom-8 -left-6 w-[100px] h-[100px] bg-[radial-gradient(circle,rgba(251,191,36,0.08),transparent_65%)]" />
          <div className="relative z-[1]">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00E676] to-[#00C853] flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(0,200,83,0.3)]">
              <i className="fas fa-question-circle text-white text-[1.5rem]"></i>
            </div>
            <h2 className="text-[1.25rem] font-black text-white mb-1.5">
              Comment trouver votre adresse TRX ?
            </h2>
            <p className="text-[0.82rem] text-[rgba(255,255,255,0.5)] leading-relaxed">
              Suivez ces 4 étapes simples pour localiser et copier votre adresse TRX depuis Trust Wallet.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step) => {
            const isActive = activeStep === step.number;
            return (
              <div
                key={step.number}
                onClick={() => setActiveStep(isActive ? null : step.number)}
                className="bg-white rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)] overflow-hidden cursor-pointer transition-all duration-200"
                style={{
                  borderLeft: isActive ? '3px solid #00C853' : '3px solid transparent',
                }}
              >
                <div className="p-4 flex items-start gap-3.5">
                  {/* Step Number */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-[0.85rem] font-bold shrink-0 transition-colors duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-[#00E676] to-[#00C853] text-white shadow-[0_2px_8px_rgba(0,200,83,0.3)]'
                        : 'bg-[#F1F5F9] text-[#94A3B8]'
                    }`}
                  >
                    {step.number}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <i
                        className={`fas ${step.icon} text-[0.8rem] ${
                          isActive ? 'text-[#00C853]' : 'text-[#94A3B8]'
                        }`}
                      ></i>
                      <h3
                        className={`text-[0.88rem] font-bold ${
                          isActive ? 'text-[#1A2332]' : 'text-[#475569]'
                        }`}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-[0.78rem] text-[#64748B] leading-relaxed">
                      {step.description}
                    </p>

                    {/* Expanded Detail */}
                    {isActive && (
                      <div
                        className="mt-3 p-3 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]"
                        style={{ animation: 'fadeIn 0.25s ease' }}
                      >
                        <div className="flex items-start gap-2">
                          <i className="fas fa-lightbulb text-[#FBBF24] text-[0.75rem] mt-0.5 shrink-0"></i>
                          <p className="text-[0.75rem] text-[#15803D] leading-relaxed font-medium">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Chevron */}
                  <i
                    className={`fas fa-chevron-down text-[0.6rem] text-[#94A3B8] mt-2 shrink-0 transition-transform duration-200 ${
                      isActive ? 'rotate-180' : ''
                    }`}
                  ></i>
                </div>
              </div>
            );
          })}
        </div>

        {/* Step Progress Indicator */}
        <div className="flex items-center justify-center gap-2 mt-6 mb-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[0.7rem] font-bold transition-colors duration-300 ${
                  activeStep !== null && activeStep >= n
                    ? 'bg-gradient-to-br from-[#00E676] to-[#00C853] text-white'
                    : 'bg-[#E2E8F0] text-[#94A3B8]'
                }`}
              >
                {n}
              </div>
              {n < 4 && (
                <div
                  className={`w-6 h-[2px] mx-1 transition-colors duration-300 ${
                    activeStep !== null && activeStep > n
                      ? 'bg-[#00C853]'
                      : 'bg-[#E2E8F0]'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Warning / Tip Section */}
        <div className="rounded-xl p-4 flex items-start gap-3 mb-5 bg-[#FFFBEB] border border-[#FDE68A] border-l-[3px] border-l-[#F59E0B]">
          <div className="w-10 h-10 rounded-xl bg-[#FEF3C7] flex items-center justify-center shrink-0">
            <i className="fas fa-shield-alt text-[#D97706] text-[1rem]"></i>
          </div>
          <div className="flex-1">
            <h4 className="text-[0.85rem] mb-1 font-bold text-[#92400E]">Sécurité importante</h4>
            <p className="text-[0.78rem] leading-relaxed text-[#A16207]">
              Ne partagez <strong>jamais</strong> votre clé privée ou votre phrase de récupération.
              Votre adresse TRX (qui commence par &quot;T&quot;) est la seule information que vous
              pouvez partager en toute sécurité pour recevoir des fonds.
            </p>
          </div>
        </div>

        {/* Additional Tips Card */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3">
            <i className="fas fa-info-circle text-[#2962FF] text-[0.85rem]"></i>
            <h4 className="text-[0.85rem] font-bold text-[#1A2332]">Bon à savoir</h4>
          </div>
          <div className="space-y-2.5">
            {[
              { icon: 'fa-check', text: 'L\'adresse TRX commence toujours par la lettre "T"' },
              { icon: 'fa-check', text: 'L\'adresse fait 34 caractères de long' },
              { icon: 'fa-check', text: 'Vérifiez toujours l\'adresse avant d\'envoyer des TRX' },
              { icon: 'fa-check', text: 'Un petit montant de TRX est nécessaire pour les frais de réseau' },
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2">
                <i className={`fas ${tip.icon} text-[#00C853] text-[0.65rem] mt-1 shrink-0`}></i>
                <p className="text-[0.78rem] text-[#475569] leading-relaxed">{tip.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Back to Home Button */}
        <a
          href="/"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#00E676] to-[#00C853] text-white font-semibold text-[0.88rem] border-none cursor-pointer shadow-[0_4px_20px_rgba(0,200,83,0.2)] font-[Inter] transition-transform active:scale-[0.97] flex items-center justify-center gap-2 no-underline mb-6"
        >
          <i className="fas fa-home"></i> Retour à l&apos;accueil
        </a>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-[0.65rem] text-[#94A3B8] shrink-0">
        Be Rich &copy; 2024 &mdash; Guide TRX
      </footer>

    </div>
  );
}
