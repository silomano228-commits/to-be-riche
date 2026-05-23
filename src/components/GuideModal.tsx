'use client';

import { useState } from 'react';
import { type GuideSection } from '@/lib/guides';

// ==================== GUIDE MODAL (Full overlay) ====================
export function GuideModal({ guide, open, onClose }: { guide: GuideSection; open: boolean; onClose: () => void }) {
  const [activeStep, setActiveStep] = useState(0);
  const [showTips, setShowTips] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);

  if (!open) return null;

  const step = guide.steps[activeStep];
  const isLast = activeStep === guide.steps.length - 1;
  const isFirst = activeStep === 0;

  return (
    <div className="fixed inset-0 bg-[rgba(6,10,20,0.6)] backdrop-blur-sm z-[7000] flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl w-[92%] max-w-[380px] max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()} style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
        {/* Header */}
        <div className="relative p-5 pb-4 overflow-hidden" style={{ background: `linear-gradient(135deg, ${guide.color}15, ${guide.color}05)` }}>
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-10" style={{ background: guide.color }} />
          <button onClick={onClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[rgba(0,0,0,0.06)] flex items-center justify-center border-none cursor-pointer text-[#64748B] text-[0.7rem] hover:bg-[rgba(0,0,0,0.1)]">✕</button>
          <div className="flex items-center gap-3 relative z-[1]">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: guide.color + '20' }}>
              <i className={`fas ${guide.icon} text-[1rem]`} style={{ color: guide.color }}></i>
            </div>
            <div>
              <h3 className="text-[1rem] font-bold text-[#1A2332]">{guide.title}</h3>
              <p className="text-[0.7rem] text-[#64748B]">{guide.description}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex gap-1 mt-3 relative z-[1]">
            {guide.steps.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] rounded-full transition-all duration-300" style={{ backgroundColor: i <= activeStep ? guide.color : '#E2E8F0' }} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          {/* Step */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: step.color + '15' }}>
                <i className={`fas ${step.icon} text-[0.75rem]`} style={{ color: step.color }}></i>
              </div>
              <h4 className="text-[0.88rem] font-bold text-[#1A2332]">{step.title}</h4>
            </div>
            <p className="text-[0.78rem] text-[#475569] leading-relaxed pl-10">{step.description}</p>
          </div>

          {/* Tips */}
          {guide.tips && guide.tips.length > 0 && (
            <div className="mb-3">
              <button onClick={() => setShowTips(!showTips)} className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#3B82F6] bg-transparent border-none cursor-pointer p-0">
                <i className={`fas fa-chevron-${showTips ? 'down' : 'right'} text-[0.55rem]`}></i>
                <i className="fas fa-lightbulb text-[#FBBF24]"></i> Conseils ({guide.tips.length})
              </button>
              {showTips && (
                <div className="mt-2 bg-[#EFF6FF] rounded-xl p-3 border border-[#BFDBFE]" style={{ animation: 'tIn 0.2s ease-out' }}>
                  {guide.tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                      <span className="text-[#3B82F6] text-[0.65rem] mt-[2px]">💡</span>
                      <span className="text-[0.72rem] text-[#1E40AF] leading-relaxed">{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Warnings */}
          {guide.warnings && guide.warnings.length > 0 && (
            <div className="mb-3">
              <button onClick={() => setShowWarnings(!showWarnings)} className="flex items-center gap-1.5 text-[0.72rem] font-semibold text-[#EF4444] bg-transparent border-none cursor-pointer p-0">
                <i className={`fas fa-chevron-${showWarnings ? 'down' : 'right'} text-[0.55rem]`}></i>
                <i className="fas fa-exclamation-triangle text-[#EF4444]"></i> Avertissements ({guide.warnings.length})
              </button>
              {showWarnings && (
                <div className="mt-2 bg-[#FEF2F2] rounded-xl p-3 border border-[#FECACA]" style={{ animation: 'tIn 0.2s ease-out' }}>
                  {guide.warnings.map((warn, i) => (
                    <div key={i} className="flex items-start gap-2 mb-1.5 last:mb-0">
                      <span className="text-[#EF4444] text-[0.65rem] mt-[2px]">⚠️</span>
                      <span className="text-[0.72rem] text-[#991B1B] leading-relaxed">{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-5 py-3 border-t border-[#F1F5F9] flex items-center justify-between">
          <button
            onClick={() => { setActiveStep(Math.max(0, activeStep - 1)); setShowTips(false); setShowWarnings(false); }}
            disabled={isFirst}
            className={`py-2 px-4 rounded-lg text-[0.78rem] font-semibold border-none cursor-pointer transition-all ${isFirst ? 'text-[#CBD5E1] cursor-not-allowed' : 'text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0]'}`}
          >
            <i className="fas fa-chevron-left mr-1 text-[0.6rem]"></i> Précédent
          </button>
          <span className="text-[0.7rem] text-[#94A3B8] font-medium">{activeStep + 1} / {guide.steps.length}</span>
          {isLast ? (
            <button onClick={onClose} className="py-2 px-4 rounded-lg text-[0.78rem] font-semibold border-none cursor-pointer text-white transition-transform active:scale-95" style={{ backgroundColor: guide.color }}>
              Compris ! <i className="fas fa-check ml-1 text-[0.65rem]"></i>
            </button>
          ) : (
            <button
              onClick={() => { setActiveStep(activeStep + 1); setShowTips(false); setShowWarnings(false); }}
              className="py-2 px-4 rounded-lg text-[0.78rem] font-semibold border-none cursor-pointer text-white transition-transform active:scale-95"
              style={{ backgroundColor: guide.color }}
            >
              Suivant <i className="fas fa-chevron-right ml-1 text-[0.6rem]"></i>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== GUIDE HELP BUTTON ====================
export function GuideHelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-[rgba(59,130,246,0.08)] text-[#3B82F6] cursor-pointer border-none text-[0.75rem] transition-transform active:scale-90"
      title="Guide d'aide"
    >
      <i className="fas fa-question-circle"></i>
    </button>
  );
}

// ==================== GUIDE CARD (for home screen) ====================
export function GuideCard({ guide, onClick }: { guide: GuideSection; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-3.5 text-left shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-[rgba(0,0,0,0.03)] cursor-pointer transition-all active:scale-[0.98] hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: guide.color + '15' }}>
          <i className={`fas ${guide.icon} text-[0.9rem]`} style={{ color: guide.color }}></i>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[0.82rem] font-bold text-[#1A2332]">{guide.title}</div>
          <div className="text-[0.68rem] text-[#64748B]">{guide.description}</div>
          <div className="text-[0.6rem] text-[#94A3B8] mt-0.5">{guide.steps.length} étapes</div>
        </div>
        <i className="fas fa-chevron-right text-[#CBD5E1] text-[0.65rem]"></i>
      </div>
    </button>
  );
}
