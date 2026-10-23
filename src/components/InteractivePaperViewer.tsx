import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Sparkles, X } from 'lucide-react';
import { PaperSize } from '../types/spj';
import {
  getPaperDimensions,
  calculateTouchDistance,
  calculatePinchZoomScale,
} from '../utils/spjCalculations';

interface InteractivePaperViewerProps {
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
  documentTitle?: string;
  interactiveHint?: string;
  transparentSurface?: boolean;
  zeroPageMargin?: boolean;
  children: React.ReactNode;
}

export const InteractivePaperViewer: React.FC<InteractivePaperViewerProps> = ({
  paperSize,
  onChangePaperSize,
  documentTitle = 'Pratinjau Cetak',
  interactiveHint,
  transparentSurface = false,
  zeroPageMargin = false,
  children,
}) => {
  const spec = getPaperDimensions(paperSize);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const [fitMode, setFitMode] = useState<'width' | 'page'>('width');
  const [baseFitScale, setBaseFitScale] = useState<number>(1);
  const [sheetNaturalHeight, setSheetNaturalHeight] = useState<number>(spec.minHeightPx);
  const [userZoom, setUserZoom] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [isHintDismissed, setIsHintDismissed] = useState<boolean>(false);

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
      const availableWidth = Math.max(260, el.clientWidth - 24);
      const availableHeight = Math.max(380, window.innerHeight - 240);
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
  }, [spec.widthPx, spec.minHeightPx, fitMode]);

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
    <div className="space-y-2 print-page-sheet">
      {/* Dynamic @page Print Rule for A4 (210x297mm) vs F4 Folio (215x330mm) */}
      <style>{`
        @media print {
          @page {
            size: ${spec.cssPageSize};
            margin: ${zeroPageMargin ? '0' : spec.cssPageMargin};
          }
        }
      `}</style>

      {/* Canva Light Workspace Floating Island Toolbar (bg-white/90 backdrop-blur-md, rounded-full, shadow-md, border-slate-200) */}
      <div className="no-print flex justify-center">
        <div className="w-full sm:w-auto inline-flex flex-wrap items-center justify-between sm:justify-center gap-2 sm:gap-3 bg-white/95 backdrop-blur-md text-slate-800 border border-slate-200 rounded-2xl sm:rounded-full px-3 py-1.5 shadow-md">
          {/* Left: Thumb-Friendly Paper Size Selector ("A4 210×297", "F4 Folio 215×330") */}
          <div
            role="group"
            aria-label="Pilih Ukuran Kertas Cetak"
            className="inline-flex items-center p-0.5 bg-slate-100 rounded-full border border-slate-200/80 shrink-0"
          >
            <button
              type="button"
              onClick={() => onChangePaperSize('A4')}
              title="Kertas A4 (210 × 297 mm) — Rasio Standar 1 : 1.414"
              className={`min-h-[32px] px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                paperSize === 'A4'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>A4</span>
              <span className="text-[10px] opacity-80 font-mono hidden sm:inline">(210×297)</span>
            </button>
            <button
              type="button"
              onClick={() => onChangePaperSize('F4')}
              title="Kertas F4 Folio (215 × 330 mm) — Rasio Jenjang 1 : 1.535 (+33mm Lebih Tinggi)"
              className={`min-h-[32px] px-3 py-1 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                paperSize === 'F4'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>F4 Folio</span>
              <span className="text-[10px] opacity-80 font-mono hidden sm:inline">(215×330)</span>
            </button>
          </div>

          {/* Mode Pas Layar vs Pas Halaman Penuh */}
          <div className="hidden sm:inline-flex items-center p-0.5 bg-slate-100 rounded-full border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                setFitMode('width');
                setUserZoom(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              title="Pas Lebar (Tampilan Nyaman)"
              className={`min-h-[30px] px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                fitMode === 'width'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pas Lebar
            </button>
            <button
              type="button"
              onClick={() => {
                setFitMode('page');
                setUserZoom(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              title="Pas 1 Halaman Penuh (Memperlihatkan Proporsi Tinggi & Rasio A4 vs F4)"
              className={`min-h-[30px] px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                fitMode === 'page'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pas Halaman
            </button>
          </div>

          <div className="hidden sm:block w-px h-5 bg-slate-200 shrink-0" aria-hidden="true" />

          {/* Right: Minimalist Zoom Controls ("- 100% +") */}
          <div className="inline-flex items-center bg-slate-100 rounded-full p-0.5 border border-slate-200/80 shrink-0">
            <button
              type="button"
              onClick={() => handleZoomStep(-0.15)}
              aria-label="Perkecil tampilan kertas"
              className="min-h-[32px] min-w-[32px] rounded-full text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              data-testid="paper-zoom-percentage"
              aria-label="Reset zoom ke ukuran pas layar"
              className="min-h-[32px] px-2.5 text-xs font-mono font-bold text-slate-800 hover:bg-white rounded-full transition-colors tabular-nums cursor-pointer"
            >
              {zoomPercentage}%
            </button>

            <button
              type="button"
              onClick={() => handleZoomStep(0.15)}
              aria-label="Perbesar tampilan kertas"
              className="min-h-[32px] min-w-[32px] rounded-full text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            {userZoom !== 1 && (
              <button
                type="button"
                onClick={handleResetZoom}
                aria-label="Kembalikan posisi kertas"
                className="min-h-[32px] min-w-[32px] rounded-full text-sky-700 hover:bg-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Single-Line Compact Microcopy Hint with Dismiss "x" Button & Exact Aspect Ratio Pill */}
      {!isHintDismissed && (
        <div className="no-print flex items-center justify-between gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-slate-200/80 text-[11px] text-slate-600 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0 truncate">
            <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span className="truncate">
              {interactiveHint
                ? `${interactiveHint} · ${spec.label}`
                : `${documentTitle} (${spec.label})`}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[10px] font-bold shrink-0">
              Rasio Kertas: {paperSize === 'F4' ? '1 : 1.535 (+33mm Folio)' : '1 : 1.414 (Standar A4)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsHintDismissed(true)}
            aria-label="Sembunyikan petunjuk"
            className="w-5 h-5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

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
        className="paper-zoom-viewport relative w-full overflow-x-auto overflow-y-hidden rounded-2xl bg-slate-100 border border-slate-200/90 p-3 sm:p-7 flex justify-center items-start select-none"
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
            {/* Top Paper Format Watermark Tag */}
            <div className="no-print absolute top-2 right-3 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-slate-900/5 border border-slate-300/80 text-slate-700 backdrop-blur-xs">
                <span className={`w-2 h-2 rounded-full ${paperSize === 'F4' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                {paperSize === 'F4' ? 'Kertas F4 Folio · 215 × 330 mm (Rasio 1:1.535)' : 'Kertas A4 · 210 × 297 mm (Rasio 1:1.414)'}
              </span>
            </div>

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
