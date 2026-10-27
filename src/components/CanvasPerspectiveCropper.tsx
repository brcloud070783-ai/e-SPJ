import React, { useEffect, useRef, useState } from 'react';

export interface CornerPinPoint {
  x: number; // 0..100 (% of image width)
  y: number; // 0..100 (% of image height)
}

export interface CornerPinQuad {
  tl: CornerPinPoint; // Top-Left
  tr: CornerPinPoint; // Top-Right
  br: CornerPinPoint; // Bottom-Right
  bl: CornerPinPoint; // Bottom-Left
}

export interface CropBoxPercent {
  top: number; // 0..40 (%)
  left: number; // 0..40 (%)
  right: number; // 0..40 (% inset from right)
  bottom: number; // 0..40 (% inset from bottom)
}

export const DEFAULT_CORNER_PINS: CornerPinQuad = {
  tl: { x: 4, y: 4 },
  tr: { x: 96, y: 4 },
  br: { x: 96, y: 96 },
  bl: { x: 4, y: 96 },
};

export function cropBoxToCornerPins(box: CropBoxPercent): CornerPinQuad {
  return {
    tl: { x: box.left, y: box.top },
    tr: { x: 100 - box.right, y: box.top },
    br: { x: 100 - box.right, y: 100 - box.bottom },
    bl: { x: box.left, y: 100 - box.bottom },
  };
}

export function cornerPinsToCropBox(pins: CornerPinQuad): CropBoxPercent {
  const left = Math.round(Math.max(0, Math.min(40, (pins.tl.x + pins.bl.x) / 2)));
  const right = Math.round(
    Math.max(0, Math.min(40, 100 - (pins.tr.x + pins.br.x) / 2))
  );
  const top = Math.round(Math.max(0, Math.min(40, (pins.tl.y + pins.tr.y) / 2)));
  const bottom = Math.round(
    Math.max(0, Math.min(40, 100 - (pins.bl.y + pins.br.y) / 2))
  );
  return { top, left, right, bottom };
}

/**
 * Solves the 3x3 Projective Homography matrix H mapping destination rectangle
 * (0,0)->tl, (w,0)->tr, (w,h)->br, (0,h)->bl in source pixel coordinates.
 */
export function computeInverseHomography(
  outW: number,
  outH: number,
  tl: { x: number; y: number },
  tr: { x: number; y: number },
  br: { x: number; y: number },
  bl: { x: number; y: number }
): number[] | null {
  const src = [
    { u: 0, v: 0, x: tl.x, y: tl.y },
    { u: outW, v: 0, x: tr.x, y: tr.y },
    { u: outW, v: outH, x: br.x, y: br.y },
    { u: 0, v: outH, x: bl.x, y: bl.y },
  ];

  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const { u, v, x, y } = src[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x, x]);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y, y]);
  }

  const n = 8;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    let maxVal = Math.abs(A[col][col]);
    for (let row = col + 1; row < n; row++) {
      const val = Math.abs(A[row][col]);
      if (val > maxVal) {
        maxVal = val;
        pivot = row;
      }
    }
    if (maxVal < 1e-10) return null;
    if (pivot !== col) {
      const tmp = A[col];
      A[col] = A[pivot];
      A[pivot] = tmp;
    }

    const diag = A[col][col];
    for (let j = col; j <= n; j++) {
      A[col][j] /= diag;
    }

    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = A[row][col];
      if (Math.abs(factor) < 1e-12) continue;
      for (let j = col; j <= n; j++) {
        A[row][j] -= factor * A[col][j];
      }
    }
  }

  return [
    A[0][8],
    A[1][8],
    A[2][8],
    A[3][8],
    A[4][8],
    A[5][8],
    A[6][8],
    A[7][8],
    1,
  ];
}

/**
 * Warps a 4-point quadrilateral region (tl, tr, br, bl in 0..100% coordinates) from `img`
 * into a flat, perspective-rectified HTMLCanvasElement using projective homography
 * and bilinear pixel interpolation.
 */
export function warpPerspectiveImageToCanvas(
  img: HTMLImageElement,
  pins: CornerPinQuad
): HTMLCanvasElement | null {
  const rawW = img.naturalWidth || img.width;
  const rawH = img.naturalHeight || img.height;
  if (!rawW || !rawH) return null;

  const maxProcessDim = 1400;
  const procScale = Math.min(1, maxProcessDim / Math.max(rawW, rawH));
  const srcW = Math.max(32, Math.round(rawW * procScale));
  const srcH = Math.max(32, Math.round(rawH * procScale));

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return null;
  srcCtx.drawImage(img, 0, 0, srcW, srcH);

  let srcImageData: ImageData;
  try {
    srcImageData = srcCtx.getImageData(0, 0, srcW, srcH);
  } catch {
    return null;
  }
  const srcBuf = srcImageData.data;

  const tl = { x: (pins.tl.x / 100) * (srcW - 1), y: (pins.tl.y / 100) * (srcH - 1) };
  const tr = { x: (pins.tr.x / 100) * (srcW - 1), y: (pins.tr.y / 100) * (srcH - 1) };
  const br = { x: (pins.br.x / 100) * (srcW - 1), y: (pins.br.y / 100) * (srcH - 1) };
  const bl = { x: (pins.bl.x / 100) * (srcW - 1), y: (pins.bl.y / 100) * (srcH - 1) };

  const topEdge = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const bottomEdge = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftEdge = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightEdge = Math.hypot(br.x - tr.x, br.y - tr.y);

  const outW = Math.max(32, Math.round(Math.max(topEdge, bottomEdge)));
  const outH = Math.max(32, Math.round(Math.max(leftEdge, rightEdge)));

  const H = computeInverseHomography(outW - 1, outH - 1, tl, tr, br, bl);
  if (!H) return null;

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = outW;
  dstCanvas.height = outH;
  const dstCtx = dstCanvas.getContext('2d');
  if (!dstCtx) return null;

  const dstImageData = dstCtx.createImageData(outW, outH);
  const dstBuf = dstImageData.data;

  const [h00, h01, h02, h10, h11, h12, h20, h21] = H;
  const maxX = srcW - 1;
  const maxY = srcH - 1;

  for (let v = 0; v < outH; v++) {
    const rowNumX = h01 * v + h02;
    const rowNumY = h11 * v + h12;
    const rowDen = h21 * v + 1;

    for (let u = 0; u < outW; u++) {
      const denom = h20 * u + rowDen;
      const sx = (h00 * u + rowNumX) / denom;
      const sy = (h10 * u + rowNumY) / denom;

      const dstIdx = (v * outW + u) * 4;
      if (sx < 0 || sx > maxX || sy < 0 || sy > maxY) {
        dstBuf[dstIdx] = 255;
        dstBuf[dstIdx + 1] = 255;
        dstBuf[dstIdx + 2] = 255;
        dstBuf[dstIdx + 3] = 255;
        continue;
      }

      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 < maxX ? x0 + 1 : x0;
      const y1 = y0 < maxY ? y0 + 1 : y0;
      const dx = sx - x0;
      const dy = sy - y0;
      const w00 = (1 - dx) * (1 - dy);
      const w10 = dx * (1 - dy);
      const w01 = (1 - dx) * dy;
      const w11 = dx * dy;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      dstBuf[dstIdx] =
        srcBuf[i00] * w00 +
        srcBuf[i10] * w10 +
        srcBuf[i01] * w01 +
        srcBuf[i11] * w11;
      dstBuf[dstIdx + 1] =
        srcBuf[i00 + 1] * w00 +
        srcBuf[i10 + 1] * w10 +
        srcBuf[i01 + 1] * w01 +
        srcBuf[i11 + 1] * w11;
      dstBuf[dstIdx + 2] =
        srcBuf[i00 + 2] * w00 +
        srcBuf[i10 + 2] * w10 +
        srcBuf[i01 + 2] * w01 +
        srcBuf[i11 + 2] * w11;
      dstBuf[dstIdx + 3] = 255;
    }
  }

  dstCtx.putImageData(dstImageData, 0, 0);
  return dstCanvas;
}

export type DraggablePinId = 'tl' | 'tr' | 'br' | 'bl' | 't' | 'b' | 'l' | 'r';

export interface CanvasPerspectiveCropperProps {
  /** Image data URL or URL to render on the interactive perspective cropper canvas */
  imageSrc: string;
  /** Current 4 corner pins (0..100% normalized coordinates) */
  points: CornerPinQuad;
  /** Callback fired whenever the user drags any of the 4 corner handles or edge midpoints */
  onChangePoints: (nextPoints: CornerPinQuad) => void;
  /** Optional CSS filter string for live preview */
  cssFilter?: string;
  /** Optional rotation + deskew angle in degrees */
  rotationDeg?: number;
  /** Optional zoom level */
  zoomLevel?: number;
  /** Optional horizontal flip */
  flipH?: boolean;
  /** Optional vertical flip */
  flipV?: boolean;
  /** Whether the interactive 4-corner handles and perspective overlay should be shown */
  showHandles?: boolean;
  /** Optional children overlay (e.g. markup strokes / stamp preview) */
  children?: React.ReactNode;
}

/**
 * Interactive HTML5 Canvas Perspective Cropper (`react-perspective-cropper` pattern):
 * Renders the document image on a `<canvas>`, draws the 4-corner perspective polygon,
 * shaded exterior mask, 3x3 projective grid lines, and provides 4 draggable corner-pin
 * handles (`tl`, `tr`, `br`, `bl`) + 4 edge handles (`t`, `r`, `b`, `l`) with a real-time
 * canvas magnifier loupe so users can corner-pin tilted receipts into a flat rectangle.
 */
export const CanvasPerspectiveCropper: React.FC<CanvasPerspectiveCropperProps> = ({
  imageSrc,
  points,
  onChangePoints,
  cssFilter = 'none',
  rotationDeg = 0,
  zoomLevel = 1,
  flipH = false,
  flipV = false,
  showHandles = true,
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const loadedImgRef = useRef<HTMLImageElement | null>(null);

  const [draggingPin, setDraggingPin] = useState<DraggablePinId | null>(null);
  const [imgDimensions, setImgDimensions] = useState<{ w: number; h: number }>({
    w: 400,
    h: 520,
  });

  // Load source image for canvas rendering & loupe zoom
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      loadedImgRef.current = img;
      setImgDimensions({
        w: img.naturalWidth || img.width || 400,
        h: img.naturalHeight || img.height || 520,
      });
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw the perspective polygon, exterior mask, and 3x3 grid on the HTML5 overlay canvas
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    if (!showHandles) return;

    const tl = { x: (points.tl.x / 100) * cw, y: (points.tl.y / 100) * ch };
    const tr = { x: (points.tr.x / 100) * cw, y: (points.tr.y / 100) * ch };
    const br = { x: (points.br.x / 100) * cw, y: (points.br.y / 100) * ch };
    const bl = { x: (points.bl.x / 100) * cw, y: (points.bl.y / 100) * ch };

    // 1. Shaded exterior mask using even-odd winding rule
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cw, ch);
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.44)';
    ctx.fill('evenodd');
    ctx.restore();

    // 2. Internal 3x3 bilinear perspective guide grid
    ctx.save();
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.68)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([5, 5]);

    for (const t of [1 / 3, 2 / 3]) {
      const topX = tl.x + (tr.x - tl.x) * t;
      const topY = tl.y + (tr.y - tl.y) * t;
      const botX = bl.x + (br.x - bl.x) * t;
      const botY = bl.y + (br.y - bl.y) * t;

      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(botX, botY);
      ctx.stroke();

      const leftX = tl.x + (bl.x - tl.x) * t;
      const leftY = tl.y + (bl.y - tl.y) * t;
      const rightX = tr.x + (br.x - tr.x) * t;
      const rightY = tr.y + (br.y - tr.y) * t;

      ctx.beginPath();
      ctx.moveTo(leftX, leftY);
      ctx.lineTo(rightX, rightY);
      ctx.stroke();
    }
    ctx.restore();

    // 3. Crisp outer quadrilateral border connecting the 4 corner pins
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw corner L-brackets at each of the 4 pins on the canvas
    const corners = [tl, tr, br, bl];
    for (const c of corners) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#10B981';
      ctx.fill();
    }
    ctx.restore();
  }, [points, showHandles, imgDimensions]);

  // Draw the zoomed-in corner magnifier loupe on its dedicated HTML5 canvas while dragging a corner
  useEffect(() => {
    if (!draggingPin || !['tl', 'tr', 'br', 'bl'].includes(draggingPin)) return;
    const loupeCanvas = loupeCanvasRef.current;
    const img = loadedImgRef.current;
    if (!loupeCanvas || !img) return;
    const ctx = loupeCanvas.getContext('2d');
    if (!ctx) return;

    const pt = points[draggingPin as 'tl' | 'tr' | 'br' | 'bl'];
    const lw = loupeCanvas.width;
    const lh = loupeCanvas.height;
    ctx.clearRect(0, 0, lw, lh);

    const rawW = img.naturalWidth || img.width;
    const rawH = img.naturalHeight || img.height;
    const cx = (pt.x / 100) * rawW;
    const cy = (pt.y / 100) * rawH;
    const patchRadius = Math.max(18, Math.min(rawW, rawH) * 0.08);

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, lw, lh);
    ctx.drawImage(
      img,
      cx - patchRadius,
      cy - patchRadius,
      patchRadius * 2,
      patchRadius * 2,
      0,
      0,
      lw,
      lh
    );

    // Crosshair inside loupe canvas
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(lw / 2, 0);
    ctx.lineTo(lw / 2, lh);
    ctx.moveTo(0, lh / 2);
    ctx.lineTo(lw, lh / 2);
    ctx.stroke();
  }, [draggingPin, points]);

  // Handle pointer/touch/mouse dragging of the 4 corner pins and 4 edge midpoints
  useEffect(() => {
    if (!draggingPin) return;

    const updateFromClientXY = (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const relX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const relY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      const clampX = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
      const clampY = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;

      const next: CornerPinQuad = {
        tl: { ...points.tl },
        tr: { ...points.tr },
        br: { ...points.br },
        bl: { ...points.bl },
      };

      if (draggingPin === 'tl') {
        next.tl.x = clampX(Math.min(relX, points.tr.x - 6));
        next.tl.y = clampY(Math.min(relY, points.bl.y - 6));
      } else if (draggingPin === 'tr') {
        next.tr.x = clampX(Math.max(relX, points.tl.x + 6));
        next.tr.y = clampY(Math.min(relY, points.br.y - 6));
      } else if (draggingPin === 'br') {
        next.br.x = clampX(Math.max(relX, points.bl.x + 6));
        next.br.y = clampY(Math.max(relY, points.tr.y + 6));
      } else if (draggingPin === 'bl') {
        next.bl.x = clampX(Math.min(relX, points.br.x - 6));
        next.bl.y = clampY(Math.max(relY, points.tl.y + 6));
      } else if (draggingPin === 't') {
        const maxY = Math.min(points.bl.y, points.br.y) - 6;
        const newY = clampY(Math.min(relY, maxY));
        next.tl.y = newY;
        next.tr.y = newY;
      } else if (draggingPin === 'b') {
        const minY = Math.max(points.tl.y, points.tr.y) + 6;
        const newY = clampY(Math.max(relY, minY));
        next.bl.y = newY;
        next.br.y = newY;
      } else if (draggingPin === 'l') {
        const maxX = Math.min(points.tr.x, points.br.x) - 6;
        const newX = clampX(Math.min(relX, maxX));
        next.tl.x = newX;
        next.bl.x = newX;
      } else if (draggingPin === 'r') {
        const minX = Math.max(points.tl.x, points.bl.x) + 6;
        const newX = clampX(Math.max(relX, minX));
        next.tr.x = newX;
        next.br.x = newX;
      }

      onChangePoints(next);
    };

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateFromClientXY(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (e.cancelable) e.preventDefault();
        updateFromClientXY(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onEnd = () => setDraggingPin(null);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [draggingPin, points, onChangePoints]);

  const activePinInfo =
    draggingPin === 'tl'
      ? { label: 'Kiri Atas (TL)', pt: points.tl }
      : draggingPin === 'tr'
        ? { label: 'Kanan Atas (TR)', pt: points.tr }
        : draggingPin === 'br'
          ? { label: 'Kanan Bawah (BR)', pt: points.br }
          : draggingPin === 'bl'
            ? { label: 'Kiri Bawah (BL)', pt: points.bl }
            : null;

  return (
    <div
      ref={containerRef}
      data-testid="perspective-cropper-stage"
      className="relative inline-flex items-center justify-center bg-white shadow-lg rounded-lg select-none"
    >
      {/* Live Canvas Corner Magnifier Loupe HUD while dragging any of the 4 corner handles */}
      {activePinInfo && (
        <div
          className={`pointer-events-none fixed sm:absolute top-3 ${
            activePinInfo.pt.x < 45 ? 'right-3' : 'left-3'
          } z-40 flex items-center gap-2 bg-slate-900/95 text-white px-2.5 py-1.5 rounded-xl border border-emerald-400/70 shadow-xl`}
        >
          <canvas
            ref={loupeCanvasRef}
            width={44}
            height={44}
            className="w-10 h-10 rounded-lg border border-emerald-400 bg-white shrink-0"
          />
          <div className="text-[10px] leading-tight">
            <div className="font-extrabold text-emerald-300">{activePinInfo.label}</div>
            <div className="font-mono text-white/90">
              X: {activePinInfo.pt.x.toFixed(1)}% · Y: {activePinInfo.pt.y.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div className="relative overflow-hidden rounded-lg flex items-center justify-center">
        <img
          src={imageSrc}
          alt="Kanvas Perspective Crop Bukti"
          referrerPolicy="no-referrer"
          draggable={false}
          style={{
            filter: cssFilter,
            transform: `rotate(${rotationDeg}deg) scale(${zoomLevel}) scaleX(${
              flipH ? -1 : 1
            }) scaleY(${flipV ? -1 : 1})`,
          }}
          className="max-h-52 sm:max-h-64 w-auto object-contain transition-transform duration-150 pointer-events-none"
        />

        {/* HTML5 Canvas Perspective Crop Overlay (Polygon + Mask + 3x3 Grid) */}
        <canvas
          ref={overlayCanvasRef}
          width={360}
          height={360}
          className="pointer-events-none absolute inset-0 w-full h-full"
        />

        {children}
      </div>

      {/* 4 Draggable Corner-Pin Handles (TL, TR, BR, BL) + 4 Edge Handles */}
      {showHandles && (
        <>
          {(
            [
              { id: 'tl', pt: points.tl, title: 'Sudut Kiri Atas (TL)' },
              { id: 'tr', pt: points.tr, title: 'Sudut Kanan Atas (TR)' },
              { id: 'br', pt: points.br, title: 'Sudut Kanan Bawah (BR)' },
              { id: 'bl', pt: points.bl, title: 'Sudut Kiri Bawah (BL)' },
            ] as const
          ).map((h) => {
            const isDragging = draggingPin === h.id;
            return (
              <button
                key={h.id}
                type="button"
                title={h.title}
                data-testid={`corner-pin-${h.id}`}
                aria-label={h.title}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setDraggingPin(h.id);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setDraggingPin(h.id);
                }}
                style={{
                  left: `${h.pt.x}%`,
                  top: `${h.pt.y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 sm:w-6 sm:h-6 rounded-full border-2 border-white shadow-md cursor-grab active:cursor-grabbing z-20 flex items-center justify-center transition-transform touch-none ${
                  isDragging
                    ? 'bg-sky-600 scale-125 ring-4 ring-sky-400/50'
                    : 'bg-emerald-500 hover:scale-110'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white pointer-events-none" />
              </button>
            );
          })}

          {/* 4 Edge Midpoint Handles (T, R, B, L) */}
          {(
            [
              {
                id: 't',
                x: (points.tl.x + points.tr.x) / 2,
                y: (points.tl.y + points.tr.y) / 2,
                cls: 'w-6 h-2.5 cursor-ns-resize',
                label: 'Sisi Atas',
              },
              {
                id: 'b',
                x: (points.bl.x + points.br.x) / 2,
                y: (points.bl.y + points.br.y) / 2,
                cls: 'w-6 h-2.5 cursor-ns-resize',
                label: 'Sisi Bawah',
              },
              {
                id: 'l',
                x: (points.tl.x + points.bl.x) / 2,
                y: (points.tl.y + points.bl.y) / 2,
                cls: 'w-2.5 h-6 cursor-ew-resize',
                label: 'Sisi Kiri',
              },
              {
                id: 'r',
                x: (points.tr.x + points.br.x) / 2,
                y: (points.tr.y + points.br.y) / 2,
                cls: 'w-2.5 h-6 cursor-ew-resize',
                label: 'Sisi Kanan',
              },
            ] as const
          ).map((edge) => (
            <button
              key={edge.id}
              type="button"
              aria-label={edge.label}
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingPin(edge.id);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setDraggingPin(edge.id);
              }}
              style={{
                left: `${edge.x}%`,
                top: `${edge.y}%`,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-emerald-600 shadow-xs z-20 touch-none ${edge.cls}`}
            />
          ))}
        </>
      )}
    </div>
  );
};
