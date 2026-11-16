import React from 'react';
import { Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { triggerHaptic } from '../utils/nativeMobile';

export interface WizardStepItem {
  key: string;
  stepNumber: number;
  shortLabel: string;
  title: string;
  subtitle: string;
}

export interface FormStepperHeaderProps {
  steps: WizardStepItem[];
  activeKey: string;
  onSelectStep: (key: string) => void;
  className?: string;
}

/**
 * Linear Stepper Wizard Header with Step Indicator Circles, Connecting Lines,
 * Active Step Title/Subtitle, and Linear Progress Bar.
 * Replaces nested sub-tab bars inside the SPJ Form Editors.
 */
export const FormStepperHeader: React.FC<FormStepperHeaderProps> = ({
  steps,
  activeKey,
  onSelectStep,
  className = '',
}) => {
  if (steps.length === 0) return null;

  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === activeKey)
  );
  const currentStep = steps[activeIndex] || steps[0];
  const progressPercent = Math.round(((activeIndex + 1) / steps.length) * 100);
  const hasPrev = activeIndex > 0;
  const hasNext = activeIndex < steps.length - 1;

  return (
    <div
      role="region"
      aria-label="Indikator Langkah Pengisian Formulir"
      data-testid="form-stepper-wizard-header"
      className={`no-print bg-slate-50/95 border-b border-slate-200/90 px-4 py-3 select-none shrink-0 space-y-2.5 ${className}`}
    >
      {/* 1. Numbered Stepper Nodes with Connecting Track */}
      <div className="relative flex items-center justify-between gap-1">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;
          const isLast = idx === steps.length - 1;

          return (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  onSelectStep(step.key);
                }}
                aria-current={isCurrent ? 'step' : undefined}
                title={`Langkah ${step.stepNumber}: ${step.title}`}
                className="group relative z-10 flex flex-col items-center gap-1 min-w-[52px] py-0.5 cursor-pointer focus:outline-none"
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold font-mono tabular-nums transition-all duration-200 ${
                    isCurrent
                      ? 'bg-sky-700 text-white ring-4 ring-sky-100 shadow-xs scale-105'
                      : isCompleted
                        ? 'bg-emerald-600 text-white group-hover:bg-emerald-700'
                        : 'bg-slate-200/90 text-slate-600 group-hover:bg-slate-300'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  ) : (
                    step.stepNumber
                  )}
                </span>
                <span
                  className={`text-[10.5px] leading-tight whitespace-nowrap truncate max-w-[74px] transition-colors ${
                    isCurrent
                      ? 'font-extrabold text-sky-900'
                      : isCompleted
                        ? 'font-semibold text-emerald-800'
                        : 'font-medium text-slate-500'
                  }`}
                >
                  {step.shortLabel}
                </span>
              </button>

              {!isLast && (
                <div
                  aria-hidden="true"
                  className="flex-1 h-0.5 rounded-full bg-slate-200 overflow-hidden -mt-4 mx-0.5"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      idx < activeIndex ? 'w-full bg-emerald-500' : 'w-0 bg-sky-600'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* 2. Active Step Context Bar + Quick Prev/Next Stepper Buttons */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-sky-700 tabular-nums shrink-0">
              Langkah {currentStep.stepNumber}/{steps.length}
            </span>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
              {currentStep.title}
            </h4>
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            {currentStep.subtitle}
          </p>
        </div>

        {/* Linear Prev/Next Step Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => {
              if (hasPrev) {
                triggerHaptic('light');
                onSelectStep(steps[activeIndex - 1].key);
              }
            }}
            aria-label="Langkah sebelumnya"
            title="Langkah sebelumnya"
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => {
              if (hasNext) {
                triggerHaptic('light');
                onSelectStep(steps[activeIndex + 1].key);
              }
            }}
            aria-label="Langkah berikutnya"
            title="Langkah berikutnya"
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-35 disabled:pointer-events-none text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Continuous Linear Progress Track */}
      <div className="w-full h-1.5 rounded-full bg-slate-200/85 overflow-hidden">
        <div
          style={{
            width: `${progressPercent}%`,
            transition: 'width 240ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
          className="h-full rounded-full bg-gradient-to-r from-sky-600 to-emerald-600"
        />
      </div>
    </div>
  );
};

export interface FormStepperFooterProps {
  steps: WizardStepItem[];
  activeKey: string;
  onSelectStep: (key: string) => void;
  onCancel: () => void;
  onSave: () => void;
  cancelLabel?: string;
  saveLabel?: string;
  summaryBanner?: React.ReactNode;
  extraDesktopActions?: React.ReactNode;
  className?: string;
}

/**
 * Sticky Footer Action Bar anchored in the user's thumb zone at the bottom of the Form Editor.
 * Keeps "Batal", "Simpan Perubahan", and Linear Step navigation ("Sebelumnya" / "Lanjut")
 * floating above the bottom edge / keyboard without requiring vertical scrolling.
 */
export const FormStepperFooter: React.FC<FormStepperFooterProps> = ({
  steps,
  activeKey,
  onSelectStep,
  onCancel,
  onSave,
  cancelLabel = 'Batal',
  saveLabel = 'Simpan Perubahan',
  summaryBanner,
  extraDesktopActions,
  className = '',
}) => {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === activeKey)
  );
  const prevStep = activeIndex > 0 ? steps[activeIndex - 1] : null;
  const nextStep = activeIndex < steps.length - 1 ? steps[activeIndex + 1] : null;

  return (
    <div
      role="region"
      aria-label="Bilah Aksi Formulir"
      data-testid="form-stepper-sticky-footer"
      className={`no-print sticky bottom-0 z-30 shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-4 pt-2.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] shadow-[0_-6px_20px_rgba(15,23,42,0.06)] space-y-2.5 ${className}`}
    >
      {summaryBanner}

      {/* Linear Step Navigation Strip (Sebelumnya <-> Langkah Berikutnya) */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {prevStep ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onSelectStep(prevStep.key);
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Langkah {prevStep.stepNumber}: {prevStep.shortLabel}
            </span>
          </button>
        ) : (
          <span className="text-[11px] font-medium text-slate-400">
            Awal Formulir (Langkah 1/{steps.length})
          </span>
        )}

        {nextStep ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onSelectStep(nextStep.key);
            }}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ml-auto"
          >
            <span className="truncate">
              Lanjut: {nextStep.shortLabel}
            </span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        ) : (
          <span className="text-[11px] font-bold text-emerald-700 ml-auto">
            Langkah Terakhir ({steps.length}/{steps.length})
          </span>
        )}
      </div>

      {/* Primary Thumb-Zone Action Buttons: Batal & Simpan Perubahan */}
      <div className="flex items-center justify-between gap-2.5">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onCancel();
          }}
          className="min-h-[46px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 active:scale-[0.99] text-xs sm:text-sm font-bold text-slate-700 inline-flex items-center justify-center cursor-pointer shrink-0 transition-all"
        >
          <span>{cancelLabel}</span>
        </button>

        {extraDesktopActions}

        <button
          type="button"
          onClick={() => {
            triggerHaptic('medium');
            onSave();
          }}
          className="flex-1 min-h-[46px] px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 active:scale-[0.99] text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
        >
          <Save className="w-4 h-4 shrink-0" />
          <span>{saveLabel}</span>
        </button>
      </div>
    </div>
  );
};
