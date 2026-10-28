import React, { useRef } from 'react';
import { triggerHaptic } from '../utils/nativeMobile';

interface UseSwipeTabsOptions {
  onSwipeLeft?: () => void; // Geser jari ke kiri (pindah ke tab berikutnya)
  onSwipeRight?: () => void; // Geser jari ke kanan (pindah ke tab sebelumnya)
  isEnabled?: boolean;
  threshold?: number; // Minimum jarak geser untuk aktivasi (default: 46px)
  allowFormControls?: boolean; // Izinkan mulai swipe di atas input/button/select dalam form editor
  stopPropagation?: boolean; // Cegah event swipe bocor ke parent container
}

export function useSwipeTabs({
  onSwipeLeft,
  onSwipeRight,
  isEnabled = true,
  threshold = 46,
  allowFormControls = false,
  stopPropagation = false,
}: UseSwipeTabsOptions) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchCurrentRef = useRef<{ x: number; y: number } | null>(null);
  const isHorizontalGestureRef = useRef<boolean | null>(null);
  const lastTriggerTimeRef = useRef<number>(0);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isEnabled || e.touches.length !== 1) {
      touchStartRef.current = null;
      touchCurrentRef.current = null;
      isHorizontalGestureRef.current = null;
      return;
    }

    const currentTarget = e.currentTarget as HTMLElement | null;
    const target = e.target as HTMLElement | null;

    if (target && currentTarget) {
      // Hanya blokir jika elemen data-no-swipe / data-snap-carousel berada di DALAM container ini (child),
      // bukan ancestor/dirinya sendiri (agar modal dengan data-no-swipe="true" tetap bisa swipe di dalamnya).
      const noSwipeEl = target.closest('[data-no-swipe="true"]');
      if (noSwipeEl && currentTarget.contains(noSwipeEl) && noSwipeEl !== currentTarget) {
        touchStartRef.current = null;
        touchCurrentRef.current = null;
        isHorizontalGestureRef.current = null;
        return;
      }

      const snapCarouselEl = target.closest('[data-snap-carousel="true"]');
      if (
        snapCarouselEl &&
        currentTarget.contains(snapCarouselEl) &&
        snapCarouselEl !== currentTarget
      ) {
        touchStartRef.current = null;
        touchCurrentRef.current = null;
        isHorizontalGestureRef.current = null;
        return;
      }

      // Jangan pernah membajak slider input[type="range"]
      if (target.closest('input[type="range"]')) {
        touchStartRef.current = null;
        touchCurrentRef.current = null;
        isHorizontalGestureRef.current = null;
        return;
      }

      if (!allowFormControls) {
        const tagName = target.tagName.toUpperCase();
        if (
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          tagName === 'BUTTON' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea') ||
          target.closest('select')
        ) {
          touchStartRef.current = null;
          touchCurrentRef.current = null;
          isHorizontalGestureRef.current = null;
          return;
        }
      }
    }

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: performance.now(),
    };
    touchCurrentRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
    isHorizontalGestureRef.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchCurrentRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };

    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Kunci intent arah setelah 10px pergerakan awal
    if (isHorizontalGestureRef.current === null && (absX > 10 || absY > 10)) {
      if (absY * 1.15 >= absX) {
        isHorizontalGestureRef.current = false;
      } else {
        isHorizontalGestureRef.current = true;
      }
    }

    if (isHorizontalGestureRef.current === true && stopPropagation) {
      e.stopPropagation();
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (
      !touchStartRef.current ||
      !touchCurrentRef.current ||
      isHorizontalGestureRef.current !== true
    ) {
      touchStartRef.current = null;
      touchCurrentRef.current = null;
      isHorizontalGestureRef.current = null;
      return;
    }

    const deltaX = touchCurrentRef.current.x - touchStartRef.current.x;
    const deltaY = touchCurrentRef.current.y - touchStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const elapsed = Math.max(1, performance.now() - touchStartRef.current.time);
    const velocityX = absX / elapsed; // px per ms

    touchStartRef.current = null;
    touchCurrentRef.current = null;
    isHorizontalGestureRef.current = null;

    // Izinkan flick cepat (>= 28px dengan kecepatan tinggi) atau swipe mantap (>= threshold)
    const isValidSwipe =
      (absX >= threshold && absX > absY * 1.3) ||
      (absX >= 28 && velocityX > 0.32 && absX > absY * 1.4);

    if (!isValidSwipe) return;

    const now = performance.now();
    if (now - lastTriggerTimeRef.current < 280) {
      return;
    }
    lastTriggerTimeRef.current = now;

    if (stopPropagation) {
      e.stopPropagation();
    }

    if (deltaX < 0 && onSwipeLeft) {
      triggerHaptic('light');
      onSwipeLeft();
    } else if (deltaX > 0 && onSwipeRight) {
      triggerHaptic('light');
      onSwipeRight();
    }
  };

  const onClickCapture = (e: React.MouseEvent) => {
    // Jika baru saja selesai melakukan horizontal swipe, cegah klik tidak sengaja pada tombol/input di bawah jari
    if (performance.now() - lastTriggerTimeRef.current < 260) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onClickCapture,
    style: {
      touchAction: 'pan-y' as const,
    },
  };
}
