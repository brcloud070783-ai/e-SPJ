import { useState, useRef, useCallback } from 'react';
import { triggerHaptic } from '../utils/nativeMobile';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  pullThreshold?: number;
  isEnabled?: boolean;
}

export function usePullToRefresh({
  onRefresh,
  pullThreshold = 72,
  isEnabled = true,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const touchStartRef = useRef<{ x: number; y: number; active: boolean; lockedHorizontal: boolean }>({
    x: 0,
    y: 0,
    active: false,
    lockedHorizontal: false,
  });
  const thresholdTriggeredRef = useRef<boolean>(false);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!isEnabled || isRefreshing || e.touches.length !== 1) return;
      const targetEl = e.target as HTMLElement | null;
      if (
        targetEl?.closest(
          'input, textarea, select, [contenteditable="true"], [data-no-swipe="true"], [data-snap-carousel="true"]'
        )
      ) {
        touchStartRef.current.active = false;
        return;
      }

      const container = e.currentTarget;
      if (container.scrollTop <= 2) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          active: true,
          lockedHorizontal: false,
        };
        thresholdTriggeredRef.current = false;
      } else {
        touchStartRef.current.active = false;
      }
    },
    [isEnabled, isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!isEnabled || !touchStartRef.current.active || isRefreshing || e.touches.length !== 1) {
        return;
      }

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const deltaX = currentX - touchStartRef.current.x;
      const deltaY = currentY - touchStartRef.current.y;

      if (touchStartRef.current.lockedHorizontal) return;
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        touchStartRef.current.lockedHorizontal = true;
        setPullDistance(0);
        return;
      }

      if (deltaY > 12 && e.currentTarget.scrollTop <= 2) {
        const distance = Math.min(108, (deltaY - 12) * 0.42);
        setPullDistance(distance);

        if (distance >= pullThreshold && !thresholdTriggeredRef.current) {
          thresholdTriggeredRef.current = true;
          triggerHaptic('medium');
        } else if (distance < pullThreshold && thresholdTriggeredRef.current) {
          thresholdTriggeredRef.current = false;
        }
      } else {
        setPullDistance(0);
      }
    },
    [isEnabled, isRefreshing, pullThreshold]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!touchStartRef.current.active || isRefreshing) return;
    touchStartRef.current.active = false;

    if (pullDistance >= pullThreshold) {
      setIsRefreshing(true);
      setPullDistance(pullThreshold);
      triggerHaptic('success');
      try {
        await onRefresh();
      } finally {
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
        }, 380);
      }
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing, onRefresh, pullDistance, pullThreshold]);

  return {
    pullDistance,
    isRefreshing,
    pullProgress: Math.min(1, pullDistance / pullThreshold),
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
