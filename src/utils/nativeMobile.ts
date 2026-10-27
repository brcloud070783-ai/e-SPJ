import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import type { Variants } from 'framer-motion';

/**
 * Framer Motion directional page & menu transition variants (slide-in & fade-out)
 * modeled after native iOS / Android navigation stacks.
 * - direction > 0: slide in from right, exit fade out to left
 * - direction < 0: slide in from left, exit fade out to right
 * - direction === 0: subtle vertical slide-in & fade-out (depth transition)
 */
export const MOBILE_PAGE_VARIANTS: Variants = {
  enter: (direction: number = 1) => ({
    x: direction > 0 ? 28 : direction < 0 ? -28 : 0,
    y: direction === 0 ? 10 : 0,
    opacity: 0,
    scale: 0.994,
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    transition: {
      x: { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 },
      y: { type: 'spring', stiffness: 380, damping: 34, mass: 0.8 },
      opacity: { duration: 0.18, ease: 'easeOut' },
      scale: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
    },
    transitionEnd: {
      transform: 'none',
    },
  },
  exit: (direction: number = 1) => ({
    x: direction > 0 ? -18 : direction < 0 ? 18 : 0,
    y: direction === 0 ? -6 : 0,
    opacity: 0,
    scale: 0.994,
    transition: {
      duration: 0.14,
      ease: [0.4, 0, 1, 1],
    },
  }),
};

/**
 * Framer Motion compact sub-tab transition variants (slide-in & fade-out)
 * for inspector tabs and bottom-sheet form sub-tabs.
 */
export const MOBILE_TAB_VARIANTS: Variants = {
  enter: (direction: number = 1) => ({
    x: direction >= 0 ? 16 : -16,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: {
      x: { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 },
      opacity: { duration: 0.15, ease: 'easeOut' },
    },
    transitionEnd: {
      transform: 'none',
    },
  },
  exit: (direction: number = 1) => ({
    x: direction >= 0 ? -12 : 12,
    opacity: 0,
    transition: {
      duration: 0.11,
      ease: 'easeIn',
    },
  }),
};

export type HapticStyle =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error';

/**
 * Distinct Web Vibration API patterns (in ms) modeled after native mobile haptics:
 * - light: 8ms subtle tick for tab switches & secondary controls
 * - medium: 15ms crisp tap for primary action buttons (Simpan, PDF, Cetak, + SPJ Baru)
 * - heavy: 25ms firm thud for destructive actions or mode shifts
 * - success: [12, 45, 22] double-pulse celebratory confirmation on successful document save
 * - warning: [18, 40, 18] double alert tap
 * - error: [28, 45, 28, 45, 35] triple alert buzz on validation errors
 */
const HAPTIC_PATTERNS: Record<HapticStyle, number | number[]> = {
  light: 8,
  medium: 15,
  heavy: 25,
  success: [12, 45, 22],
  warning: [18, 40, 18],
  error: [28, 45, 28, 45, 35],
};

let lastTapHapticTimestamp = 0;

/**
 * Triggers native haptic feedback via the Web Vibration API (`navigator.vibrate`)
 * on supported mobile devices.
 */
export function triggerHaptic(style: HapticStyle = 'light'): boolean {
  try {
    if (
      typeof navigator === 'undefined' ||
      typeof navigator.vibrate !== 'function'
    ) {
      return false;
    }

    const now = performance.now();
    const isPattern =
      style === 'success' || style === 'warning' || style === 'error';

    // Prevent duplicate single-tap vibrations within 55ms when global & local handlers both fire
    if (!isPattern && now - lastTapHapticTimestamp < 55) {
      return false;
    }

    if (!isPattern) {
      lastTapHapticTimestamp = now;
    }

    const pattern = HAPTIC_PATTERNS[style] ?? HAPTIC_PATTERNS.light;
    return navigator.vibrate(pattern);
  } catch {
    // Ignore on unsupported browsers or restricted contexts
    return false;
  }
}

/**
 * Global hook that provides automatic tactile Vibration API feedback
 * whenever the user taps primary action buttons or interactive controls.
 */
export function useGlobalButtonHaptics(): void {
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // Only trigger on touch or primary pointer
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'button, [role="button"], [role="tab"], a[href]'
      ) as HTMLElement | null;
      if (!interactive || interactive.hasAttribute('disabled')) return;

      const explicitHaptic = interactive.getAttribute(
        'data-haptic'
      ) as HapticStyle | null;
      if (explicitHaptic && HAPTIC_PATTERNS[explicitHaptic]) {
        triggerHaptic(explicitHaptic);
        return;
      }

      const cls = interactive.className || '';
      const isSubmit = interactive.getAttribute('type') === 'submit';
      const isDestructive =
        cls.includes('bg-red-600') || cls.includes('text-red-700');
      const isPrimaryAction =
        isSubmit ||
        cls.includes('bg-sky-700') ||
        cls.includes('bg-emerald-600') ||
        cls.includes('bg-emerald-700') ||
        cls.includes('bg-slate-900');

      if (isDestructive) {
        triggerHaptic('heavy');
      } else if (isPrimaryAction) {
        triggerHaptic('medium');
      } else {
        triggerHaptic('light');
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, {
      passive: true,
    });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);
}

/**
 * Context for Full-Focus Document Workspace Mode on mobile devices.
 * Allows any InteractivePaperViewer to toggle the outer studio header for maximum canvas focus.
 */
export interface MobileFocusModeContextValue {
  isFocusMode: boolean;
  setIsFocusMode: React.Dispatch<React.SetStateAction<boolean>>;
  toggleFocusMode: () => void;
}

export const MobileFocusModeContext = createContext<MobileFocusModeContextValue>({
  isFocusMode: false,
  setIsFocusMode: () => {},
  toggleFocusMode: () => {},
});

export const useMobileFocusMode = () => useContext(MobileFocusModeContext);

/**
 * Hook providing iOS/iPadOS-style drag-to-dismiss gesture physics for bottom sheets.
 */
interface UseSwipeToDismissOptions {
  onDismiss: () => void;
  threshold?: number;
}

export function useSwipeToDismissSheet({
  onDismiss,
  threshold = 85,
}: UseSwipeToDismissOptions) {
  const [dragY, setDragY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const touchStateRef = useRef<{
    startY: number;
    startTime: number;
    currentY: number;
    active: boolean;
  }>({
    startY: 0,
    startTime: 0,
    currentY: 0,
    active: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1) return;
    const clientY = e.touches[0].clientY;
    touchStateRef.current = {
      startY: clientY,
      startTime: performance.now(),
      currentY: clientY,
      active: true,
    };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLElement>) => {
    if (!touchStateRef.current.active || e.touches.length !== 1) return;
    const clientY = e.touches[0].clientY;
    const deltaY = clientY - touchStateRef.current.startY;
    touchStateRef.current.currentY = clientY;

    if (deltaY < 0) {
      // Subtle upward rubber-band resistance
      setDragY(Math.max(-28, deltaY * 0.18));
    } else {
      setDragY(deltaY);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStateRef.current.active) return;
    touchStateRef.current.active = false;
    setIsDragging(false);

    const deltaY = touchStateRef.current.currentY - touchStateRef.current.startY;
    const elapsed = Math.max(1, performance.now() - touchStateRef.current.startTime);
    const velocity = deltaY / elapsed; // px per ms

    if (deltaY > threshold || (deltaY > 32 && velocity > 0.55)) {
      triggerHaptic('light');
      setDragY(0);
      onDismiss();
    } else {
      setDragY(0);
    }
  }, [onDismiss, threshold]);

  const sheetStyle: React.CSSProperties = {
    transform: dragY !== 0 ? `translate3d(0, ${dragY.toFixed(1)}px, 0)` : undefined,
    transition: isDragging
      ? 'none'
      : 'transform 340ms cubic-bezier(0.32, 0.72, 0, 1), opacity 220ms ease',
    willChange: isDragging ? 'transform' : 'auto',
  };

  return {
    dragY,
    isDragging,
    sheetStyle,
    handleTouchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
