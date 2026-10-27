import React, { createContext, useContext, useRef, useState, useCallback } from 'react';

/**
 * Triggers subtle native haptic feedback on supported mobile devices.
 */
export function triggerHaptic(style: 'light' | 'medium' | 'heavy' = 'light'): void {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      const duration = style === 'heavy' ? 20 : style === 'medium' ? 12 : 7;
      navigator.vibrate(duration);
    }
  } catch {
    // Ignore on unsupported browsers or restricted contexts
  }
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
