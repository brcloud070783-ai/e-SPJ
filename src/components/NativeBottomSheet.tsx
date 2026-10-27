import React from 'react';
import { X } from 'lucide-react';
import { useSwipeToDismissSheet, triggerHaptic } from '../utils/nativeMobile';

interface NativeBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxHeightClass?: string;
  bottomOffsetClass?: string;
  desktopModal?: boolean;
}

/**
 * Interactive iOS/iPadOS-grade Bottom Sheet with drag-to-dismiss physics.
 */
export const NativeBottomSheet: React.FC<NativeBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxHeightClass = 'max-h-[78dvh]',
  bottomOffsetClass = 'bottom-0',
  desktopModal = false,
}) => {
  const { sheetStyle, handleTouchHandlers } = useSwipeToDismissSheet({
    onDismiss: onClose,
  });

  if (!isOpen) return null;

  return (
    <div
      className={`no-print fixed inset-0 z-50 flex flex-col justify-end ${
        desktopModal ? 'sm:items-center sm:justify-center sm:p-4' : 'lg:hidden'
      }`}
    >
      {/* Frosted Backdrop */}
      <div
        role="presentation"
        aria-hidden="true"
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }}
        className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px] animate-in fade-in duration-200"
      />

      {/* Interactive Sheet Surface */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={sheetStyle}
        className={`relative z-10 w-full ${
          desktopModal ? 'sm:max-w-md sm:rounded-3xl' : ''
        } bg-white/98 backdrop-blur-xl text-slate-900 border-t border-slate-200/90 rounded-t-3xl shadow-[0_-14px_40px_rgba(15,23,42,0.2)] flex flex-col overflow-hidden ${maxHeightClass} ${bottomOffsetClass} animate-in slide-in-from-bottom duration-250`}
      >
        {/* Drag Handle & Header Zone (Touch-active for swipe-to-dismiss) */}
        <div
          {...handleTouchHandlers}
          className="px-4 pt-2.5 pb-2.5 border-b border-slate-200/80 bg-slate-50/90 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
        >
          <div className="w-11 h-1.5 rounded-full bg-slate-300/90 mx-auto mb-2" />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[10.5px] text-slate-500 truncate mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              aria-label="Tutup panel"
              className="min-h-[32px] min-w-[32px] rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-90"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Content */}
        <div className="p-4 overflow-y-auto overscroll-contain no-scrollbar flex-1 min-h-0 bg-white">
          {children}
        </div>

        {/* Optional Pinned Footer */}
        {footer && (
          <div className="px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-slate-200/90 bg-slate-50/95 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
