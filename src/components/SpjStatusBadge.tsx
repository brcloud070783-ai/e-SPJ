import React from 'react';
import { CheckCircle2, Clock, RefreshCw, AlertCircle } from 'lucide-react';

export type SpjStatusTone = 'yellow' | 'green' | 'blue';

export interface SpjStatusBadgeProps {
  /**
   * Status type determining the color cue:
   * - 'yellow' / 'pending' / 'incomplete': Yellow/Amber for pending/draft/missing proofs
   * - 'green' / 'complete': Green/Emerald for ready to print or 100% complete
   * - 'blue' / 'synced': Blue/Sky for synchronized with sheets/drive or active single-file
   */
  tone?: SpjStatusTone | 'pending' | 'incomplete' | 'complete' | 'synced';
  label?: string;
  size?: 'xs' | 'sm' | 'md';
  showDot?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function resolveStatusTone(
  toneInput?: SpjStatusBadgeProps['tone'],
  isReadyToPrint?: boolean,
  isSynced?: boolean
): SpjStatusTone {
  if (toneInput === 'green' || toneInput === 'complete') return 'green';
  if (toneInput === 'blue' || toneInput === 'synced') return 'blue';
  if (toneInput === 'yellow' || toneInput === 'pending' || toneInput === 'incomplete') return 'yellow';

  if (isReadyToPrint) return 'green';
  if (isSynced) return 'blue';
  return 'yellow';
}

/**
 * Minimal color-coded status badge for SPJ documents
 * Following user specs:
 * - Yellow: Pending / Incomplete
 * - Green: Complete
 * - Blue: Synced
 */
export const SpjStatusBadge: React.FC<SpjStatusBadgeProps> = ({
  tone = 'yellow',
  label,
  size = 'sm',
  showDot = true,
  showIcon = false,
  className = '',
}) => {
  const resolvedTone = resolveStatusTone(tone);

  let defaultLabel = 'Belum Lengkap';
  if (resolvedTone === 'green') defaultLabel = 'Siap Cetak';
  if (resolvedTone === 'blue') defaultLabel = 'Tersinkron';

  const finalLabel = label || defaultLabel;

  const toneStyles = {
    yellow: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200/90',
      dot: 'bg-amber-500',
      icon: 'text-amber-600',
    },
    green: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200/90',
      dot: 'bg-emerald-500',
      icon: 'text-emerald-600',
    },
    blue: {
      badge: 'bg-sky-50 text-sky-800 border-sky-200/90',
      dot: 'bg-sky-500',
      icon: 'text-sky-600',
    },
  }[resolvedTone];

  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5 gap-1 font-semibold',
    sm: 'text-[11px] px-2.5 py-0.5 gap-1.5 font-bold',
    md: 'text-xs px-3 py-1 gap-1.5 font-bold',
  }[size];

  const dotSizes = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors ${toneStyles.badge} ${sizeStyles} ${className}`}
    >
      {showDot && !showIcon && (
        <span className={`rounded-full shrink-0 ${toneStyles.dot} ${dotSizes}`} />
      )}
      {showIcon && (
        <>
          {resolvedTone === 'green' && (
            <CheckCircle2 className={`w-3 h-3 shrink-0 ${toneStyles.icon}`} />
          )}
          {resolvedTone === 'yellow' && (
            <Clock className={`w-3 h-3 shrink-0 ${toneStyles.icon}`} />
          )}
          {resolvedTone === 'blue' && (
            <RefreshCw className={`w-3 h-3 shrink-0 ${toneStyles.icon}`} />
          )}
        </>
      )}
      <span className="truncate">{finalLabel}</span>
    </span>
  );
};

export interface SpjProgressBarProps {
  percent: number;
  tone?: SpjStatusTone | 'auto';
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  labelText?: string;
  className?: string;
}

/**
 * Minimal progress bar with matching color cues
 * - Yellow for incomplete (< 100%)
 * - Green for complete (100%)
 * - Blue for synced
 */
export const SpjProgressBar: React.FC<SpjProgressBarProps> = ({
  percent,
  tone = 'auto',
  size = 'xs',
  showLabel = false,
  labelText,
  className = '',
}) => {
  const safePercent = Math.min(100, Math.max(0, Math.round(percent)));

  const resolvedTone: SpjStatusTone =
    tone === 'auto'
      ? safePercent >= 100
        ? 'green'
        : 'yellow'
      : tone;

  const barColor = {
    yellow: 'bg-amber-500',
    green: 'bg-emerald-500',
    blue: 'bg-sky-500',
  }[resolvedTone];

  const heightClass = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-2.5',
  }[size];

  return (
    <div className={`space-y-1 ${className}`}>
      {showLabel && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
          <span>{labelText || 'Kelengkapan Berkas'}</span>
          <span className="font-mono font-bold text-slate-800">{safePercent}%</span>
        </div>
      )}
      <div className={`w-full ${heightClass} rounded-full bg-slate-100 overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
          style={{ width: `${safePercent}%` }}
        />
      </div>
    </div>
  );
};
