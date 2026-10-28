import { useRef, useCallback } from 'react';
import { triggerHaptic } from '../utils/nativeMobile';

interface UseLongPressOptions {
  onLongPress: (e: React.TouchEvent | React.MouseEvent) => void;
  onClick?: (e: React.TouchEvent | React.MouseEvent) => void;
  delay?: number; // ms to press before triggering (default 480ms)
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 480,
}: UseLongPressOptions) {
  const timeoutRef = useRef<number | null>(null);
  const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isLongPressTriggeredRef = useRef<boolean>(false);

  const start = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      isLongPressTriggeredRef.current = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      startPosRef.current = { x: clientX, y: clientY };

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        triggerHaptic('heavy');
        onLongPress(e);
      }, delay);
    },
    [delay, onLongPress]
  );

  const move = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (timeoutRef.current === null) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const deltaX = Math.abs(clientX - startPosRef.current.x);
    const deltaY = Math.abs(clientY - startPosRef.current.y);

    // Cancel if dragged more than 8px
    if (deltaX > 8 || deltaY > 8) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const clear = useCallback(
    (e: React.TouchEvent | React.MouseEvent, shouldTriggerClick = true) => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (shouldTriggerClick && !isLongPressTriggeredRef.current && onClick) {
        onClick(e);
      }
    },
    [onClick]
  );

  return {
    onMouseDown: (e: React.MouseEvent) => start(e),
    onTouchStart: (e: React.TouchEvent) => start(e),
    onMouseMove: (e: React.MouseEvent) => move(e),
    onTouchMove: (e: React.TouchEvent) => move(e),
    onMouseUp: (e: React.MouseEvent) => clear(e),
    onTouchEnd: (e: React.TouchEvent) => clear(e),
    onMouseLeave: (e: React.MouseEvent) => clear(e, false),
    onTouchCancel: (e: React.TouchEvent) => clear(e, false),
  };
}
