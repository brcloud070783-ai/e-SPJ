import { useRef } from 'react';
import { triggerHaptic } from '../utils/nativeMobile';

interface UseSwipeTabsOptions {
  onSwipeLeft?: () => void; // Swipe jari dari kanan ke kiri (Pindah ke tab berikutnya)
  onSwipeRight?: () => void; // Swipe jari dari kiri ke kanan (Pindah ke tab sebelumnya)
  isEnabled?: boolean;
  threshold?: number; // Minimum jarak geser dalam pixel (default: 45px)
  maxDurationMs?: number; // Maksimum durasi sentuhan untuk dianggap gestur swipe (default: 500ms)
}

export function useSwipeTabs({
  onSwipeLeft,
  onSwipeRight,
  isEnabled = true,
  threshold = 45,
  maxDurationMs = 500,
}: UseSwipeTabsOptions) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMoveRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (!isEnabled || e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target) {
      // Abaikan swipe jika sentuhan dimulai di elemen formulir teks, slider, atau tombol
      const tagName = target.tagName.toUpperCase();
      if (
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        target.isContentEditable ||
        target.closest('[data-no-swipe="true"]') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('select')
      ) {
        touchStartRef.current = null;
        return;
      }
    }

    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchMoveRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchMoveRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchMoveRef.current) {
      touchStartRef.current = null;
      touchMoveRef.current = null;
      return;
    }

    const deltaX = touchMoveRef.current.x - touchStartRef.current.x;
    const deltaY = touchMoveRef.current.y - touchStartRef.current.y;
    const duration = Date.now() - touchStartRef.current.time;

    touchStartRef.current = null;
    touchMoveRef.current = null;

    // Pastikan gestur cukup cepat (bukan drag lambat) dan jarak horizontal dominan
    if (duration > maxDurationMs) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Kriteria swipe horizontal dominan:
    // 1. Melebihi threshold (misal 45px)
    // 2. Perpindahan X minimal 1.4 kali lebih besar dari perpindahan Y (bukan scroll vertikal)
    if (absX >= threshold && absX > absY * 1.4) {
      if (deltaX < 0 && onSwipeLeft) {
        // Geser ke kiri -> Maju ke tab berikutnya
        triggerHaptic('light');
        onSwipeLeft();
      } else if (deltaX > 0 && onSwipeRight) {
        // Geser ke kanan -> Mundur ke tab sebelumnya
        triggerHaptic('light');
        onSwipeRight();
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
