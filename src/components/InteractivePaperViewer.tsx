import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { PaperSize } from '../types/spj';
import {
  getPaperDimensions,
  calculateTouchDistance,
  calculatePinchZoomScale,
} from '../utils/spjCalculations';
import { triggerHaptic, useMobileFocusMode } from '../utils/nativeMobile';

interface InteractivePaperViewerProps {
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
  documentTitle?: string;
  interactiveHint?: string;
  transparentSurface?: boolean;
  zeroPageMargin?: boolean;
  extraControls?: React.ReactNode;
  children: React.ReactNode;
}

export const InteractivePaperViewer: React.FC<InteractivePaperViewerProps> = ({
  paperSize,
  onChangePaperSize,
  documentTitle = 'Pratinjau Cetak',
  interactiveHint,
  transparentSurface = false,
  zeroPageMargin = false,
  extraControls,
  children,
}) => {
  const spec = getPaperDimensions(paperSize);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const { isFocusMode, toggleFocusMode } = useMobileFocusMode();

  const [fitMode, setFitMode] = useState<'width' | 'page'>('width');
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

  // Refs for smooth 2-finger pinch & 1-finger pan when zoomed (like mobile photo gallery)
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

  // Automatically calculate base fit scale so the full A4/F4 width or entire page fits nicely
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateFitScale = () => {
      const availableWidth = Math.max(260, el.clientWidth - (isFocusMode ? 12 : 24));
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

  // Keep sheet height strictly synchronized to official paper height
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

  // Two-finger touch pinch-to-zoom & 1-finger pan handler (smooth gallery-like gesture)
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
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
    <div className="space-y-2 print-page-sheet min-w-0 max-w-full">
      {/* Dynamic @page Print Rule for A4 (210x297mm) vs F4 Folio (215x330mm) */}
      <style>{`
        @media print {
          @page {
            size: ${spec.cssPageSize};
            margin: ${zeroPageMargin ? '0' : spec.cssPageMargin};
          }
        }
      `}</style>

      {/* BILAH KONTROL KERTAS, FONT, ZOOM & MODE FOKUS: 1 Baris Tunggal Ultra-Ringkas Bergaya iOS Glass */}
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

          {/* Mobile Full-Focus Workspace Toggle (<lg): Sembunyikan/Tampilkan Header Studio untuk Ruang Kertas Maksimal */}
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

      {/* Canva Light Style Artboard Stage: Clean light gray (bg-slate-100) outside the white A4/F4 paper with shadow-lg */}
      <div
        ref={viewportRef}
        data-testid="interactive-paper-viewport"
        data-paper-size={paperSize}
        data-user-zoom={userZoom}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
        style={{
          touchAction: isPinching || userZoom > 1.02 ? 'none' : 'pan-y',
        }}
        className="paper-zoom-viewport relative w-full overflow-x-auto overflow-y-hidden rounded-2xl bg-slate-100 border border-slate-200/90 p-1.5 sm:p-6 flex justify-center items-start select-none"
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
              aspectRatio: paperSize === 'F4' ? '215 / 330' : '210 / 297',
              transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${effectiveScale})`,
              transformOrigin: 'top left',
              willChange: isGestureActive ? 'transform' : 'auto',
              position: 'relative',
            }}
            className={`print-only-sheet text-black flex flex-col justify-center items-center ${
              transparentSurface
                ? 'bg-transparent border-none shadow-none'
                : 'bg-white shadow-lg border border-slate-200/90'
            } ${
              isGestureActive ? 'transition-none' : 'transition-transform duration-150 ease-out'
            }`}
          >
            {/* F4 Folio Extension Visual Guide Line: Displays the exact A4 cutoff boundary (297 mm) */}
            {paperSize === 'F4' && (
              <div
                className="no-print absolute left-0 right-0 border-b-2 border-dashed border-sky-400/90 pointer-events-none z-20 flex items-center justify-between px-3"
                style={{ top: `${((1123 / 1247) * 100).toFixed(2)}%` }}
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
    </div>
  );
};
