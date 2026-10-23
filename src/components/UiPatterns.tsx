import React, { useEffect, useRef, useState } from 'react';
import { HelpCircle, Info, ArrowRight } from 'lucide-react';

/**
 * 1. TOOLTIPS / COACHMARKS
 * Menggabungkan ikon (? atau i) dengan teks microcopy edukatif
 * saat pengguna mengarahkan kursor (hover) atau mengetuknya (tap/click).
 */
export interface InfoTooltipProps {
  title?: string;
  content: string;
  variant?: 'question' | 'info';
  align?: 'left' | 'center' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  variant = 'question',
  align = 'center',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const alignClass =
    align === 'left'
      ? 'left-0'
      : align === 'right'
        ? 'right-0'
        : 'left-1/2 -translate-x-1/2';

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-label={title || content}
        aria-expanded={open}
        className="w-5 h-5 rounded-full text-slate-400 hover:text-sky-700 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 inline-flex items-center justify-center transition-colors cursor-pointer"
      >
        {variant === 'question' ? (
          <HelpCircle className="w-3.5 h-3.5" />
        ) : (
          <Info className="w-3.5 h-3.5" />
        )}
      </button>

      {open && (
        <span
          role="tooltip"
          className={`absolute bottom-full mb-2 ${alignClass} z-50 w-64 sm:w-72 rounded-xl bg-slate-900 text-white p-3 shadow-lg border border-slate-700/80 text-left pointer-events-auto`}
        >
          {title && (
            <span className="block text-[11px] font-bold text-sky-300 mb-1">
              {title}
            </span>
          )}
          <span className="block text-[11px] font-normal text-slate-100 leading-relaxed">
            {content}
          </span>
        </span>
      )}
    </span>
  );
};

/**
 * 2. ICON + LABEL (LABELED ICON DENGAN MICROCOPY)
 * Ikon visual disandingkan langsung dengan label utama dan teks penjelasan pendek (microcopy)
 * untuk memperjelas fungsi atau maknanya.
 */
export interface LabeledIconProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  microcopy?: string;
  iconBgClass?: string;
  tooltipTitle?: string;
  tooltipContent?: string;
  tooltipVariant?: 'question' | 'info';
  size?: 'sm' | 'md';
}

export const LabeledIcon: React.FC<LabeledIconProps> = ({
  icon: IconComponent,
  label,
  microcopy,
  iconBgClass = 'bg-sky-50 text-sky-700 border border-sky-200/70',
  tooltipTitle,
  tooltipContent,
  tooltipVariant = 'info',
  size = 'md',
}) => {
  return (
    <div
      className={`flex ${
        microcopy ? 'items-start' : 'items-center'
      } gap-2.5 sm:gap-3 min-w-0`}
    >
      <div
        className={`${
          size === 'sm' ? 'w-8 h-8 sm:w-9 sm:h-9 rounded-xl' : 'w-9 h-9 sm:w-10 sm:h-10 rounded-xl'
        } ${iconBgClass} flex items-center justify-center shrink-0 ${
          microcopy ? 'mt-0.5' : ''
        }`}
      >
        <IconComponent className={size === 'sm' ? 'w-4 h-4' : 'w-4 h-4 sm:w-5 sm:h-5'} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className={`${
              size === 'sm' ? 'text-xs sm:text-sm' : 'text-[13px] sm:text-base'
            } font-bold text-slate-900 leading-tight`}
          >
            {label}
          </span>
          {tooltipContent && (
            <InfoTooltip
              title={tooltipTitle || label}
              content={tooltipContent}
              variant={tooltipVariant}
            />
          )}
        </div>
        {microcopy && (
          <p className="text-[11px] sm:text-xs text-slate-500 leading-snug mt-0.5 line-clamp-2 sm:line-clamp-none">
            {microcopy}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * 3. EMPTY STATE / ILLUSTRATION CARD
 * Komponen visual yang menggabungkan ilustrasi/gambar dengan judul,
 * teks penjelasan (microcopy), dan tombol aksi (Call to Action) secara ringkas agar tampil utuh tanpa scroll.
 */
export type EmptyIllustrationVariant =
  | 'dokumentasi'
  | 'pengeluaran'
  | 'kustom'
  | 'laporan';

export interface EmptyStateCardProps {
  variant: EmptyIllustrationVariant;
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  secondaryHint?: string;
}

const EmptyIllustrationSvg: React.FC<{ variant: EmptyIllustrationVariant }> = ({
  variant,
}) => {
  if (variant === 'dokumentasi') {
    return (
      <svg
        viewBox="0 0 180 120"
        className="w-24 h-16 sm:w-28 sm:h-20 mx-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="20" y="18" width="140" height="88" rx="14" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="34" y="30" width="68" height="52" rx="8" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.8" />
        <circle cx="52" cy="46" r="6" fill="#0284C7" />
        <path d="M38 74L56 56L70 68L82 58L98 74H38Z" fill="#38BDF8" />
        <rect x="112" y="34" width="34" height="8" rx="4" fill="#94A3B8" />
        <rect x="112" y="48" width="26" height="6" rx="3" fill="#CBD5E1" />
        <rect x="112" y="60" width="30" height="6" rx="3" fill="#CBD5E1" />
        <circle cx="142" cy="88" r="16" fill="#0369A1" />
        <path d="M142 81V95M135 88H149" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'pengeluaran') {
    return (
      <svg
        viewBox="0 0 180 120"
        className="w-24 h-16 sm:w-28 sm:h-20 mx-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="38" y="12" width="104" height="96" rx="12" fill="#FFFBEB" stroke="#F59E0B" strokeWidth="2" />
        <rect x="54" y="28" width="48" height="8" rx="4" fill="#D97706" />
        <rect x="54" y="44" width="72" height="6" rx="3" fill="#FCD34D" />
        <rect x="54" y="56" width="56" height="6" rx="3" fill="#FCD34D" />
        <rect x="54" y="74" width="40" height="10" rx="4" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
        <circle cx="132" cy="84" r="18" fill="#D97706" />
        <path d="M126 84H138M132 78V90" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (variant === 'kustom') {
    return (
      <svg
        viewBox="0 0 180 120"
        className="w-24 h-16 sm:w-28 sm:h-20 mx-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect x="24" y="20" width="132" height="80" rx="12" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
        <rect x="40" y="36" width="100" height="18" rx="6" fill="white" stroke="#0284C7" strokeWidth="1.8" />
        <rect x="48" y="42" width="46" height="6" rx="3" fill="#0284C7" />
        <rect x="40" y="64" width="100" height="18" rx="6" fill="white" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="48" y="70" width="64" height="6" rx="3" fill="#94A3B8" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 180 120"
      className="w-24 h-16 sm:w-28 sm:h-20 mx-auto"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="34" y="14" width="112" height="92" rx="12" fill="#EEF2FF" stroke="#6366F1" strokeWidth="2" />
      <rect x="50" y="30" width="54" height="8" rx="4" fill="#4338CA" />
      <rect x="50" y="46" width="80" height="6" rx="3" fill="#A5B4FC" />
      <rect x="50" y="58" width="70" height="6" rx="3" fill="#A5B4FC" />
      <rect x="50" y="70" width="60" height="6" rx="3" fill="#A5B4FC" />
      <circle cx="128" cy="84" r="15" fill="#4338CA" />
      <path d="M122 84L126 88L135 79" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  variant,
  title,
  description,
  ctaLabel,
  onCtaClick,
  secondaryHint,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-center max-w-2xl mx-auto space-y-2.5 shadow-xs">
      <EmptyIllustrationSvg variant={variant} />

      <div className="space-y-1 max-w-md mx-auto">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
          {title}
        </h2>
        <p className="text-[11px] sm:text-xs text-slate-600 leading-snug">
          {description}
        </p>
      </div>

      {ctaLabel && onCtaClick && (
        <div className="pt-0.5">
          <button
            type="button"
            onClick={onCtaClick}
            className="min-h-[38px] sm:min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <span>{ctaLabel}</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      )}

      {secondaryHint && (
        <p className="text-[10.5px] text-slate-400 truncate">{secondaryHint}</p>
      )}
    </div>
  );
};

/**
 * 4. UNIFIED CARD COMPONENT
 * Elemen UI berbentuk kartu yang menyatukan media (gambar/simbol), teks utama,
 * dan microcopy (seperti metadata atau keterangan waktu) ke dalam satu wadah yang padu.
 */
export interface UnifiedMediaCardProps {
  mediaImageUrl?: string;
  mediaAlt?: string;
  mediaAspectRatio?: '16/10' | '4/3';
  symbolIcon?: React.ComponentType<{ className?: string }>;
  symbolBgClass?: string;
  metadataItems: string[];
  statusText?: string;
  title: string;
  subtitle?: string;
  highlightValue?: string;
  description?: string;
  detailRows?: Array<{
    icon: React.ComponentType<{ className?: string }>;
    text: React.ReactNode;
  }>;
  footerLeft?: React.ReactNode;
  footerRight?: React.ReactNode;
  onClick?: () => void;
}

export const UnifiedMediaCard: React.FC<UnifiedMediaCardProps> = ({
  mediaImageUrl,
  mediaAlt,
  mediaAspectRatio = '16/10',
  symbolIcon: SymbolIcon,
  symbolBgClass = 'bg-sky-700 text-white',
  metadataItems,
  statusText,
  title,
  subtitle,
  highlightValue,
  description,
  detailRows,
  footerLeft,
  footerRight,
  onClick,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <article
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
        onClick ? 'hover:border-sky-400 hover:shadow-xs cursor-pointer group' : ''
      }`}
    >
      <div>
        {/* Media Slot: Image Thumbnail with Resilient Fallback */}
        {mediaImageUrl && !imgError ? (
          <div
            className={`${
              mediaAspectRatio === '4/3' ? 'aspect-4/3' : 'aspect-16/10'
            } bg-slate-100 relative overflow-hidden border-b border-slate-100`}
          >
            <img
              src={mediaImageUrl}
              alt={mediaAlt || title}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        <div className="p-5 space-y-3">
          {/* Unboxed Microcopy Metadata Row (Zero-Pill Discipline) */}
          {metadataItems.length > 0 && (
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {metadataItems.map((meta, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span aria-hidden="true">·</span>}
                    <span className="truncate">{meta}</span>
                  </React.Fragment>
                ))}
              </div>
              {statusText && (
                <span className="font-medium text-slate-700 shrink-0">{statusText}</span>
              )}
            </div>
          )}

          {/* Symbol + Primary Text Header */}
          <div className="flex items-start gap-3.5">
            {SymbolIcon && (
              <div
                className={`w-12 h-12 rounded-2xl ${symbolBgClass} flex items-center justify-center shrink-0`}
              >
                <SymbolIcon className="w-6 h-6" />
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-0.5">
              <h2 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition-colors leading-snug">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs font-medium text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Highlight Numeric Value (e.g., Rupiah Nominal) */}
          {highlightValue && (
            <p className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
              {highlightValue}
            </p>
          )}

          {/* Main Explanatory Microcopy */}
          {description && (
            <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
          )}

          {/* Structured Supporting Metadata Rows */}
          {detailRows && detailRows.length > 0 && (
            <div className="pt-2.5 space-y-1.5 text-xs text-slate-500 border-t border-slate-100">
              {detailRows.map((row, idx) => {
                const RowIcon = row.icon;
                return (
                  <div key={idx} className="flex items-center gap-1.5 min-w-0">
                    <RowIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{row.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Unified Card Footer */}
      {(footerLeft || footerRight) && (
        <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          <div className="min-w-0">{footerLeft}</div>
          <div className="shrink-0">{footerRight}</div>
        </div>
      )}
    </article>
  );
};
