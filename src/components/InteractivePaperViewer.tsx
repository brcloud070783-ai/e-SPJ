import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { PaperSize } from '../types/spj';
import {
  getPaperDimensions,
  calculateTouchDistance,
  calculatePinchZoomScale,
} from '../utils/spjCalculations';
import { triggerHaptic, useMobileFocusMode } from '../utils/nativeMobile';

export interface PaperViewerTab {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  content?: React.ReactNode;
}

export interface InteractivePaperViewerProps {
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
  documentTitle?: string;
  interactiveHint?: string;
  transparentSurface?: boolean;
  zeroPageMargin?: boolean;
  extraControls?: React.ReactNode;
  tabs?: PaperViewerTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  onSwipePastEnd?: () => void;
  isActivePaper?: boolean;
  children?: React.ReactNode;
}

export const InteractivePaperViewer: React.FC<InteractivePaperViewerProps> = ({
  paperSize,
  onChangePaperSize,
  zeroPageMargin = false,
  transparentSurface = false,
  extraControls,
  tabs,
  activeTabId,
  onTabChange,
  onSwipePastEnd,
  isActivePaper = true,
  children,
}) => {
  const spec = getPaperDimensions(paperSize);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const { isFocusMode, toggleFocusMode } = useMobileFocusMode();

  const [fitMode] = useState<'width' | 'page'>('width');
  const [baseFitScale, setBaseFitScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const availW = Math.max(260, window.innerWidth - 48);
      return Number(Math.min(1, availW / spec.widthPx).toFixed(4));
    }
    return 1;
  });
  const [sheetNaturalHeight, setSheetNaturalHeight] = useState<number>(spec.minHeightPx);
  const [userZoom, setUserZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // requestAnimationFrame-based Scroll Synchronization Refs
  const tabSnapScrollRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const programmaticTimerRef = useRef<number | null>(null);
  const isProgrammaticTabScrollRef = useRef<boolean>(false);
  const lastSyncedTabIdRef = useRef<string | undefined>(activeTabId);
  const edgeTouchStartRef = useRef<{ x: number; y: number; atEnd: boolean } | null>(null);

  // Synchronize scrollLeft via requestAnimationFrame at 60-120fps without main-thread drag blocking
  const handleTabSnapScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (isProgrammaticTabScrollRef.current) return;

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (!tabs || tabs.length === 0) return;
      const width = container.clientWidth;
      if (width <= 0) return;

      const progress = container.scrollLeft / width;
      const newIndex = Math.min(
        tabs.length - 1,
        Math.max(0, Math.round(progress))
      );
      const targetTab = tabs[newIndex];
      if (targetTab && targetTab.id !== lastSyncedTabIdRef.current) {
        lastSyncedTabIdRef.current = targetTab.id;
        triggerHaptic('light');
        onTabChange?.(targetTab.id);
      }
    });
  };

  // Set initial scrollLeft on mount without animation
  useEffect(() => {
    if (!tabSnapScrollRef.current || !tabs || !activeTabId) return;
    const container = tabSnapScrollRef.current;
    const activeIndex = tabs.findIndex((t) => t.id === activeTabId);
    if (activeIndex >= 0 && container.clientWidth > 0) {
      container.scrollLeft = activeIndex * container.clientWidth;
      lastSyncedTabIdRef.current = activeTabId;
    }
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      if (programmaticTimerRef.current !== null) window.clearTimeout(programmaticTimerRef.current);
    };
  }, []);

  // Synchronize scrollLeft ONLY when activeTabId is changed externally (e.g., clicking top Studio tab bar)
  useEffect(() => {
    if (!tabSnapScrollRef.current || !tabs || !activeTabId) return;
    if (activeTabId === lastSyncedTabIdRef.current) return;

    const container = tabSnapScrollRef.current;
    const activeIndex = tabs.findIndex((t) => t.id === activeTabId);
    if (activeIndex < 0) return;

    lastSyncedTabIdRef.current = activeTabId;
    const targetLeft = activeIndex * container.clientWidth;
    if (Math.abs(container.scrollLeft - targetLeft) > 4) {
      isProgrammaticTabScrollRef.current = true;
      if (programmaticTimerRef.current !== null) {
        window.clearTimeout(programmaticTimerRef.current);
      }
      requestAnimationFrame(() => {
        container.scrollTo({ left: targetLeft, behavior: 'smooth' });
      });
      programmaticTimerRef.current = window.setTimeout(() => {
        isProgrammaticTabScrollRef.current = false;
      }, 420);
    }
  }, [activeTabId]);

  // Refs for smooth 2-finger pinch & 1-finger pan when zoomed
  const pinchStateRef = useRef<{
    active: boolean;
    initialDistance: number;
    initialZoom: number;
    initialMidpoint: { x: number; y: number };
    initialPan: { x: number; y: number };
  }>({
    active: false,
    initialDistance: 0,
    initialZoom: 1,
    initialMidpoint: { x: 0, y: 0 },
    initialPan: { x: 0, y: 0 },
  });

  const panDragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialPan: { x: number; y: number };
  }>({
    active: false,
    startX: 0,
    startY: 0,
    initialPan: { x: 0, y: 0 },
  });

  // Automatically calculate base fit scale so the full A4/F4 width fits nicely
  useEffect(() => {
    const el = tabSnapScrollRef.current;
    if (!el) return;

    const updateFitScale = () => {
      const horizontalPad = isFocusMode ? 6 : el.clientWidth < 640 ? 8 : 32;
      const availableWidth = Math.max(260, el.clientWidth - horizontalPad);
      const availableHeight = Math.max(380, window.innerHeight - (isFocusMode ? 130 : 240));
      const widthFit = availableWidth / spec.widthPx;
      const heightFit = availableHeight / spec.minHeightPx;

      const fit = fitMode === 'page'
        ? Math.min(widthFit, heightFit, 1)
        : Math.min(1, widthFit);

      setBaseFitScale(Number(fit.toFixed(4)));
    };

    updateFitScale();
    const observer = new ResizeObserver(updateFitScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [spec.widthPx, spec.minHeightPx, fitMode, isFocusMode]);

  // Lock natural sheet height to exact A4 (1123px) or F4 (1247px) paper aspect ratio
  useEffect(() => {
    setSheetNaturalHeight(spec.minHeightPx);
  }, [spec.minHeightPx, paperSize]);

  const handleZoomStep = (delta: number) => {
    setUserZoom((prev) => {
      const next = Math.min(2.5, Math.max(0.5, Math.round((prev + delta) * 100) / 100));
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetZoom = () => {
    setUserZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Two-finger touch pinch-to-zoom & 1-finger pan handler
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isProgrammaticTabScrollRef.current = false;
    if (programmaticTimerRef.current !== null) {
      window.clearTimeout(programmaticTimerRef.current);
    }

    if (e.touches.length === 1 && userZoom <= 1.02 && tabs && tabs.length > 0) {
      const activeIdx = tabs.findIndex((t) => t.id === lastSyncedTabIdRef.current);
      edgeTouchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        atEnd: activeIdx === tabs.length - 1,
      };
    } else {
      edgeTouchStartRef.current = null;
    }

    if (e.touches.length === 2) {
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = calculateTouchDistance(p1, p2);
      const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      pinchStateRef.current = {
        active: true,
        initialDistance: dist,
        initialZoom: userZoom,
        initialMidpoint: midpoint,
        initialPan: { ...panOffset },
      };
      panDragRef.current.active = false;
      setIsPinching(true);
      setIsPanning(false);
    } else if (e.touches.length === 1 && userZoom > 1.02) {
      panDragRef.current = {
        active: true,
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        initialPan: { ...panOffset },
      };
      setIsPanning(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStateRef.current.active) {
      const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const currentDist = calculateTouchDistance(p1, p2);
      const nextZoom = calculatePinchZoomScale(
        pinchStateRef.current.initialZoom,
        pinchStateRef.current.initialDistance,
        currentDist,
        0.5,
        2.5
      );

      const currentMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const dx = currentMidpoint.x - pinchStateRef.current.initialMidpoint.x;
      const dy = currentMidpoint.y - pinchStateRef.current.initialMidpoint.y;

      setUserZoom(nextZoom);
      if (nextZoom > 1.02) {
        setPanOffset({
          x: pinchStateRef.current.initialPan.x + dx,
          y: pinchStateRef.current.initialPan.y + dy,
        });
      } else {
        setPanOffset({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && panDragRef.current.active && userZoom > 1.02) {
      const dx = e.touches[0].clientX - panDragRef.current.startX;
      const dy = e.touches[0].clientY - panDragRef.current.startY;
      setPanOffset({
        x: pinchStateRef.current.initialPan.x + dx,
        y: pinchStateRef.current.initialPan.y + dy,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      pinchStateRef.current.active = false;
      setIsPinching(false);
    }
    if (e.touches.length === 0) {
      panDragRef.current.active = false;
      setIsPanning(false);

      if (
        edgeTouchStartRef.current &&
        edgeTouchStartRef.current.atEnd &&
        onSwipePastEnd &&
        e.changedTouches.length > 0
      ) {
        const dx = e.changedTouches[0].clientX - edgeTouchStartRef.current.x;
        const dy = e.changedTouches[0].clientY - edgeTouchStartRef.current.y;
        if (dx < -54 && Math.abs(dx) > Math.abs(dy) * 1.4) {
          onSwipePastEnd();
        }
      }
      edgeTouchStartRef.current = null;
    }
  };

  // Trackpad / Ctrl+Wheel pinch zoom on desktop
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      handleZoomStep(delta);
    }
  };

  const effectiveScale = Number((baseFitScale * userZoom).toFixed(4));
  const scaledWidth = Math.round(spec.widthPx * effectiveScale);
  const scaledHeight = Math.round(sheetNaturalHeight * effectiveScale);
  const zoomPercentage = Math.round(userZoom * 100);
  const isGestureActive = isPinching || isPanning;

  return (
    <div
      data-no-swipe={tabs && tabs.length > 0 ? 'true' : undefined}
      className="space-y-2 print-page-sheet min-w-0 max-w-full"
    >
      {/* Dynamic @page Print Rule for A4 (210x297mm) vs F4 Folio (215x330mm) */}
      <style>{`
        @media print {
          @page {
            size: ${spec.cssPageSize};
            margin: ${zeroPageMargin ? '0' : spec.cssPageMargin};
          }
        }
      `}</style>

      {/* BILAH KONTROL KERTAS, FONT, ZOOM & MODE FOKUS (Tanpa duplikasi bar tab SPT/SPD/Visum) */}
      <div className="no-print sticky top-1 z-20 flex justify-center my-1 px-1">
        <div
          data-testid="compact-floating-toolbar"
          className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/88 backdrop-blur-xl text-slate-800 border border-slate-200/90 rounded-full px-1.5 py-0.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] max-w-full overflow-x-auto no-scrollbar"
        >
          {/* Paper Size Selector (A4 | F4) */}
          <div
            role="group"
            aria-label="Pilih Ukuran Kertas Cetak"
            className="inline-flex items-center p-0.5 bg-slate-100/90 rounded-full border border-slate-200/80 shrink-0"
          >
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onChangePaperSize('A4');
              }}
              title="Kertas A4 (210 × 297 mm)"
              className={`h-6 px-2 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center ${
                paperSize === 'A4'
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onChangePaperSize('F4');
              }}
              title="Kertas F4 Folio (215 × 330 mm)"
              className={`h-6 px-2 rounded-full text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer flex items-center justify-center ${
                paperSize === 'F4'
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              F4
            </button>
          </div>

          {extraControls && (
            <>
              <div className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />
              <div className="shrink-0 flex items-center">{extraControls}</div>
            </>
          )}

          <div className="w-px h-3.5 bg-slate-200 shrink-0" aria-hidden="true" />

          {/* Minimalist Zoom Controls ("- 100% +") */}
          <div className="inline-flex items-center bg-slate-100/90 rounded-full p-0.5 border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                handleZoomStep(-0.15);
              }}
              aria-label="Perkecil tampilan kertas"
              title="Zoom Out (-15%)"
              className="h-6 w-6 rounded-full text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            >
              <ZoomOut className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                handleResetZoom();
              }}
              data-testid="paper-zoom-percentage"
              aria-label="Reset zoom ke ukuran pas layar"
              title="Klik untuk reset zoom"
              className="h-6 px-1.5 text-[11px] font-mono font-bold text-slate-800 hover:bg-white rounded-full transition-colors tabular-nums cursor-pointer flex items-center justify-center"
            >
              {zoomPercentage}%
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                handleZoomStep(0.15);
              }}
              aria-label="Perbesar tampilan kertas"
              title="Zoom In (+15%)"
              className="h-6 w-6 rounded-full text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            >
              <ZoomIn className="w-3 h-3" />
            </button>

            {userZoom !== 1 && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  handleResetZoom();
                }}
                aria-label="Kembalikan posisi kertas"
                title="Reset Zoom"
                className="h-6 w-6 rounded-full text-sky-700 hover:bg-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          {/* Mobile Full-Focus Workspace Toggle (<lg) */}
          <div className="lg:hidden flex items-center shrink-0">
            <div className="w-px h-3.5 bg-slate-200 mr-1 shrink-0" aria-hidden="true" />
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                toggleFocusMode();
              }}
              aria-pressed={isFocusMode}
              title={
                isFocusMode
                  ? 'Keluar Mode Fokus (Tampilkan Navigasi Atas)'
                  : 'Mode Fokus Penuh (Sembunyikan Navigasi Atas)'
              }
              className={`h-6 px-2 rounded-full text-[10.5px] font-bold inline-flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                isFocusMode
                  ? 'bg-sky-700 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/80'
              }`}
            >
              {isFocusMode ? (
                <>
                  <Minimize2 className="w-3 h-3 shrink-0" />
                  <span>Menu</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3 h-3 shrink-0 text-sky-700" />
                  <span>Fokus</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* STAGE CONTAINER WITH rAF SCROLL SYNC & STRICT 1-TAB SNAP STOP */}
      <div
        ref={tabSnapScrollRef}
        data-testid="interactive-paper-viewport"
        data-snap-carousel={tabs && tabs.length > 0 ? 'true' : undefined}
        data-no-swipe={tabs && tabs.length > 0 ? 'true' : undefined}
        data-paper-size={paperSize}
        data-user-zoom={userZoom}
        onScroll={tabs && tabs.length > 0 ? handleTabSnapScroll : undefined}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          scrollSnapType:
            !tabs || tabs.length === 0 || userZoom > 1.02 ? 'none' : 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          overscrollBehaviorX:
            tabs && tabs.length > 0 ? 'contain' : 'auto',
          touchAction: isPinching || userZoom > 1.02 ? 'none' : 'pan-x pan-y',
        }}
        className={`paper-zoom-viewport relative w-full ${
          tabs && tabs.length > 0
            ? 'overflow-x-auto snap-x snap-mandatory'
            : 'overflow-x-hidden'
        } overflow-y-hidden rounded-2xl bg-slate-100 border border-slate-200/90 flex select-none no-scrollbar`}
      >
        {tabs && tabs.length > 0 ? (
          tabs.map((tab) => (
            <div
              key={tab.id}
              style={{
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                minWidth: '100%',
                width: '100%',
                contain: 'layout style paint',
                transform: 'translateZ(0)',
              }}
              className="w-full shrink-0 flex justify-center items-start p-1 sm:p-4 snap-start snap-always"
            >
              <div
                className={`paper-zoom-stage relative ${
                  isGestureActive ? 'transition-none' : 'transition-all duration-150 ease-out'
                }`}
                style={{
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                }}
              >
                <div
                  ref={tab.id === activeTabId ? sheetRef : undefined}
                  data-testid="paper-sheet-surface"
                  style={{
                    width: `${spec.widthPx}px`,
                    height: `${spec.minHeightPx}px`,
                    minHeight: `${spec.minHeightPx}px`,
                    maxHeight: `${spec.minHeightPx}px`,
                    transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${effectiveScale})`,
                    transformOrigin: 'top left',
                    willChange: isGestureActive ? 'transform' : 'auto',
                    position: 'relative',
                  }}
                  className={`${
                    tab.id === activeTabId && isActivePaper ? 'print-only-sheet' : ''
                  } text-black flex flex-col justify-start items-center ${
                    transparentSurface
                      ? 'bg-transparent border-none shadow-none'
                      : 'bg-white shadow-lg border border-slate-200/90'
                  } ${
                    isGestureActive ? 'transition-none' : 'transition-transform duration-150 ease-out'
                  }`}
                >
                  {paperSize === 'F4' && (
                    <div
                      className="no-print absolute left-0 right-0 border-b-2 border-dashed border-sky-400/90 pointer-events-none z-20 flex items-center justify-between px-3"
                      style={{ top: '1123px' }}
                    >
                      <span className="bg-sky-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md tracking-wider shadow-xs uppercase">
                        Batas Panjang Kertas A4 (297 mm)
                      </span>
                      <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md tracking-wider shadow-xs uppercase">
                        Zona Ekstra F4 Folio (+33 mm / +11%)
                      </span>
                    </div>
                  )}

                  {tab.content}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            style={{
              minWidth: '100%',
              width: '100%',
            }}
            className="w-full shrink-0 flex justify-center items-start p-1 sm:p-4"
          >
            <div
              className={`paper-zoom-stage relative ${
                isGestureActive ? 'transition-none' : 'transition-all duration-150 ease-out'
              }`}
              style={{
                width: `${scaledWidth}px`,
                height: `${scaledHeight}px`,
              }}
            >
              <div
                ref={sheetRef}
                data-testid="paper-sheet-surface"
                style={{
                  width: `${spec.widthPx}px`,
                  height: `${spec.minHeightPx}px`,
                  minHeight: `${spec.minHeightPx}px`,
                  maxHeight: `${spec.minHeightPx}px`,
                  transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${effectiveScale})`,
                  transformOrigin: 'top left',
                  willChange: isGestureActive ? 'transform' : 'auto',
                  position: 'relative',
                }}
                className={`${
                  isActivePaper ? 'print-only-sheet' : ''
                } text-black flex flex-col justify-start items-center ${
                  transparentSurface
                    ? 'bg-transparent border-none shadow-none'
                    : 'bg-white shadow-lg border border-slate-200/90'
                } ${
                  isGestureActive ? 'transition-none' : 'transition-transform duration-150 ease-out'
                }`}
              >
                {paperSize === 'F4' && (
                  <div
                    className="no-print absolute left-0 right-0 border-b-2 border-dashed border-sky-400/90 pointer-events-none z-20 flex items-center justify-between px-3"
                    style={{ top: '1123px' }}
                  >
                    <span className="bg-sky-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md tracking-wider shadow-xs uppercase">
                      Batas Panjang Kertas A4 (297 mm)
                    </span>
                    <span className="bg-emerald-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md tracking-wider shadow-xs uppercase">
                      Zona Ekstra F4 Folio (+33 mm / +11%)
                    </span>
                  </div>
                )}

                {children}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
