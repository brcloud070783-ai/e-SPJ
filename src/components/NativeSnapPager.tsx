import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { triggerHaptic } from '../utils/nativeMobile';

export interface NativeSnapSlide {
  id: string;
  content: React.ReactNode;
}

export interface NativeSnapPagerProps {
  tabs: NativeSnapSlide[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onScrollProgress?: (progress: number) => void;
  className?: string;
  slideClassName?: string;
  disabled?: boolean;
  stopPropagation?: boolean;
  ariaLabel?: string;
  dataTestId?: string;
}

/**
 * Native CSS Horizontal Scroll-Snap Carousel (`scroll-snap-type: x mandatory` + `scroll-snap-stop: always`)
 * with 60-120fps `requestAnimationFrame` scroll synchronization and 1:1 real-time finger tracking.
 * Identical in physics to the SPT <-> SPD <-> Visum paper carousel.
 */
export const NativeSnapPager: React.FC<NativeSnapPagerProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onScrollProgress,
  className = '',
  slideClassName = '',
  disabled = false,
  stopPropagation = false,
  ariaLabel,
  dataTestId,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const programmaticTimerRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef<boolean>(false);
  const isTouchingRef = useRef<boolean>(false);
  const lastWidthRef = useRef<number>(0);
  const lastSyncedTabIdRef = useRef<string>(activeTabId);
  const activeTabIdRef = useRef<string>(activeTabId);
  activeTabIdRef.current = activeTabId;

  // Position scrollLeft synchronously before paint on mount & whenever container width changes (e.g., modal open / resize)
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || tabs.length === 0) return;

    const syncInstantPosition = () => {
      const idx = tabs.findIndex((t) => t.id === activeTabIdRef.current);
      if (idx >= 0 && container.clientWidth > 0) {
        lastWidthRef.current = container.clientWidth;
        const targetLeft = idx * container.clientWidth;
        if (Math.abs(container.scrollLeft - targetLeft) > 2) {
          isProgrammaticScrollRef.current = true;
          container.scrollLeft = targetLeft;
          window.setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 60);
        }
        lastSyncedTabIdRef.current = activeTabIdRef.current;
      }
    };

    syncInstantPosition();

    const observer = new ResizeObserver(() => {
      if (
        !isProgrammaticScrollRef.current &&
        !isTouchingRef.current &&
        Math.abs(container.clientWidth - lastWidthRef.current) > 1
      ) {
        syncInstantPosition();
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (programmaticTimerRef.current !== null) {
        window.clearTimeout(programmaticTimerRef.current);
      }
    };
  }, [tabs.length]);

  // Smoothly scroll when activeTabId is changed externally (e.g., tapping a tab button in the header)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || tabs.length === 0) return;
    if (activeTabId === lastSyncedTabIdRef.current) return;

    const activeIndex = tabs.findIndex((t) => t.id === activeTabId);
    if (activeIndex < 0) return;

    lastSyncedTabIdRef.current = activeTabId;
    const width = container.clientWidth;
    if (width <= 0) return;

    const targetLeft = activeIndex * width;
    if (Math.abs(container.scrollLeft - targetLeft) > 4) {
      isProgrammaticScrollRef.current = true;
      if (programmaticTimerRef.current !== null) {
        window.clearTimeout(programmaticTimerRef.current);
      }
      requestAnimationFrame(() => {
        container.scrollTo({ left: targetLeft, behavior: 'smooth' });
      });
      programmaticTimerRef.current = window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 420);
    }
  }, [activeTabId, tabs]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const container = e.currentTarget;
    if (isProgrammaticScrollRef.current) return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (tabs.length === 0) return;
      const width = container.clientWidth;
      if (width <= 0) return;

      const progress = container.scrollLeft / width;
      onScrollProgress?.(progress);
      const newIndex = Math.min(
        tabs.length - 1,
        Math.max(0, Math.round(progress))
      );
      const targetTab = tabs[newIndex];
      if (targetTab && targetTab.id !== lastSyncedTabIdRef.current) {
        lastSyncedTabIdRef.current = targetTab.id;
        triggerHaptic('light');
        onTabChange(targetTab.id);
      }
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isTouchingRef.current = true;
    isProgrammaticScrollRef.current = false;
    if (programmaticTimerRef.current !== null) {
      window.clearTimeout(programmaticTimerRef.current);
      programmaticTimerRef.current = null;
    }
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    isTouchingRef.current = false;
    if (stopPropagation) {
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={containerRef}
      role={ariaLabel ? 'region' : undefined}
      aria-label={ariaLabel}
      data-testid={dataTestId}
      data-snap-carousel="true"
      data-no-swipe="true"
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        scrollSnapType: disabled ? 'none' : 'x mandatory',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
        overscrollBehaviorX: 'contain',
        touchAction: disabled ? 'pan-y' : 'pan-x pan-y',
      }}
      className={`w-full max-w-full overflow-x-auto overflow-y-hidden print:overflow-visible print:block flex no-scrollbar snap-x snap-mandatory [&_input:not([type=range])]:touch-pan-x [&_input:not([type=range])]:touch-pan-y [&_textarea]:touch-pan-x [&_textarea]:touch-pan-y [&_select]:touch-pan-x [&_select]:touch-pan-y [&_button]:touch-pan-x [&_button]:touch-pan-y ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            style={{
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              minWidth: '100%',
              width: '100%',
            }}
            className={`w-full min-w-full shrink-0 snap-start snap-always ${
              isActive ? '' : 'print:hidden'
            } ${slideClassName}`}
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
};
