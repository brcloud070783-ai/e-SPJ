import React, { useEffect, useRef, useState } from 'react';
import {
  Receipt,
  Trash2,
  Printer,
  UploadCloud,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  LayoutList,
  Link2,
  X,
  RotateCw,
  RotateCcw,
  Crop,
  Sparkles,
  ScanLine,
  MoreVertical,
  RefreshCw,
  HardDrive,
  SlidersHorizontal,
  Eraser,
  Highlighter,
  FlipHorizontal2,
  FlipVertical2,
  Maximize2,
  Undo2,
  Check,
  PenTool,
  ZoomIn,
  ZoomOut,
  FileDown,
} from 'lucide-react';
import {
  DokumentasiPengeluaranItem,
  KuitansiPerjalananDinas,
  RincianKategori,
  PaperSize,
  ReceiptScanFilter,
} from '../types/spj';
import {
  calculateRincianRowTotal,
  formatRupiah,
  getNextRotationAngle,
  detectEffectiveImageOrientation,
} from '../utils/spjCalculations';
import { SAMPLE_RECEIPT_TRANSPORT } from '../data/seedData';
import { InteractivePaperViewer } from './InteractivePaperViewer';
import {
  LabeledIcon,
  EmptyStateCard,
} from './UiPatterns';
import {
  buildCleanPdfTitle,
  triggerIsolatedSpjPrint,
  exportToDirectPdf,
} from '../utils/printPdf';
import {
  CanvasPerspectiveCropper,
  CornerPinPoint,
  CornerPinQuad,
  CropBoxPercent,
  cropBoxToCornerPins,
  cornerPinsToCropBox,
  warpPerspectiveImageToCanvas,
} from './CanvasPerspectiveCropper';

interface DokumentasiPengeluaranSectionProps {
  items: DokumentasiPengeluaranItem[];
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  onAddItem: (item: DokumentasiPengeluaranItem, uploadToDriveNow: boolean) => Promise<void>;
  onUpdateItem?: (item: DokumentasiPengeluaranItem) => void;
  onRetrySyncItem?: (item: DokumentasiPengeluaranItem) => Promise<void>;
  onDeleteItem: (item: DokumentasiPengeluaranItem) => Promise<void>;
  isGoogleConnected: boolean;
  isUploading: boolean;
  onOpenSyncModal: () => void;
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
}

type CamScannerToolTab = 'crop' | 'filter' | 'adjust' | 'markup';
type CropMode = 'perspective' | 'rect';

export type { CornerPinPoint, CornerPinQuad };

interface MarkupStroke {
  tool: 'whiteout' | 'highlighter' | 'redpen';
  size: number;
  points: Array<{ x: number; y: number }>; // normalized 0..1 coordinates
}

const CAMSCANNER_FILTERS: Array<{
  id: ReceiptScanFilter;
  label: string;
  shortLabel: string;
  baseCssFilter: string;
}> = [
  {
    id: 'original',
    label: 'Asli (Original)',
    shortLabel: 'Asli',
    baseCssFilter: 'none',
  },
  {
    id: 'lighten',
    label: 'Cerah (Lighten)',
    shortLabel: 'Cerah',
    baseCssFilter: 'brightness(1.16) contrast(1.15) saturate(1.05)',
  },
  {
    id: 'magic',
    label: 'Warna Ajaib (Magic Color)',
    shortLabel: 'Warna Ajaib',
    baseCssFilter: 'contrast(1.42) brightness(1.09) saturate(1.22)',
  },
  {
    id: 'grayscale',
    label: 'Mode Abu-abu (Gray)',
    shortLabel: 'Abu-abu',
    baseCssFilter: 'grayscale(1) contrast(1.24) brightness(1.05)',
  },
  {
    id: 'bw',
    label: 'Hitam & Putih (B&W)',
    shortLabel: 'H&P Tegas',
    baseCssFilter: 'grayscale(1) contrast(2.15) brightness(1.14)',
  },
  {
    id: 'bw2',
    label: 'H&P 2 (Halus / Cap Aman)',
    shortLabel: 'H&P 2',
    baseCssFilter: 'grayscale(1) contrast(1.62) brightness(1.1)',
  },
];

export function buildCombinedScanCssFilter(
  filter: ReceiptScanFilter = 'original',
  brightnessOffset = 0, // -50 .. +50
  contrastOffset = 0, // -50 .. +50
  clarityOffset = 0 // -50 .. +50
): string {
  const preset = CAMSCANNER_FILTERS.find((f) => f.id === filter);
  const base = preset && preset.baseCssFilter !== 'none' ? preset.baseCssFilter : '';

  const bMult = Math.max(0.4, Math.min(1.8, 1 + brightnessOffset / 100));
  const cMult = Math.max(0.4, Math.min(2.4, 1 + contrastOffset / 80));
  const sMult = Math.max(0, Math.min(2.2, 1 + clarityOffset / 80));

  const manualParts: string[] = [];
  if (brightnessOffset !== 0) manualParts.push(`brightness(${bMult.toFixed(2)})`);
  if (contrastOffset !== 0) manualParts.push(`contrast(${cMult.toFixed(2)})`);
  if (clarityOffset !== 0) manualParts.push(`saturate(${sMult.toFixed(2)})`);

  const combined = [base, ...manualParts].filter(Boolean).join(' ').trim();
  return combined || 'none';
}

/**
 * Smart Paper Boundary, 4-Corner Pin & Auto-Deskew Detector (CamScanner AI-style):
 * 1) Analyzes image pixels to isolate the white/bright receipt paper region from darker/colored backgrounds
 *    (wooden tables, dark surfaces, borders, or shadows).
 * 2) Detects 4 extremal corner pins (tl, tr, br, bl) for perspective cropping.
 * 3) Computes horizontal projection profile variance & paper edge slope across -12°..+12° to detect
 *    document skew/tilt and return the exact straightening angle (`deskewAngle`) so the receipt is level.
 */
async function detectSmartPaperCropAndSkew(
  sourceDataUrl: string,
  mode: 'paper_and_deskew' | 'white_only' | 'deskew_only' = 'paper_and_deskew'
): Promise<{
  cropBox: CropBoxPercent;
  cornerPins: CornerPinQuad;
  deskewAngle: number;
  summary: string;
}> {
  const defaultBox = { top: 6, left: 6, right: 6, bottom: 6 };
  const fallback = {
    cropBox: defaultBox,
    cornerPins: cropBoxToCornerPins(defaultBox),
    deskewAngle: 0,
    summary: 'Area kertas putih & 4 titik sudut terdeteksi otomatis.',
  };

  if (typeof document === 'undefined' || !sourceDataUrl.startsWith('data:image/')) {
    return fallback;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        if (!rawW || !rawH) {
          resolve(fallback);
          return;
        }

        const maxDim = 220;
        const scale = Math.min(1, maxDim / Math.max(rawW, rawH));
        const w = Math.max(32, Math.round(rawW * scale));
        const h = Math.max(32, Math.round(rawH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(fallback);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h).data;

        const lum = new Float32Array(w * h);
        const paperMask = new Uint8Array(w * h);

        let sumLum = 0;
        let borderLumSum = 0;
        let borderCount = 0;
        const borderBand = Math.max(2, Math.round(Math.min(w, h) * 0.05));

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];
            const l = a < 128 ? 255 : 0.299 * r + 0.587 * g + 0.114 * b;
            const chroma = Math.max(r, g, b) - Math.min(r, g, b);
            // Penalize saturated background pixels so white/light-gray paper stands out
            const whiteness = l - chroma * 0.6;
            lum[y * w + x] = whiteness;
            sumLum += whiteness;

            if (
              x < borderBand ||
              x >= w - borderBand ||
              y < borderBand ||
              y >= h - borderBand
            ) {
              borderLumSum += whiteness;
              borderCount++;
            }
          }
        }

        const avgWhite = sumLum / (w * h);
        const borderWhite = borderCount > 0 ? borderLumSum / borderCount : avgWhite;

        // Threshold for white paper pixels
        const threshold =
          mode === 'white_only'
            ? Math.max(158, Math.min(228, Math.max(avgWhite * 0.96, borderWhite + 14)))
            : Math.max(142, Math.min(220, Math.max(avgWhite * 0.9, borderWhite + 10)));

        const rowCounts = new Float32Array(h);
        const colCounts = new Float32Array(w);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const isPaper = lum[y * w + x] >= threshold ? 1 : 0;
            paperMask[y * w + x] = isPaper;
            if (isPaper) {
              rowCounts[y]++;
              colCounts[x]++;
            }
          }
        }

        const minRowRatio = mode === 'white_only' ? 0.42 : 0.32;
        const minColRatio = mode === 'white_only' ? 0.42 : 0.32;

        let topIdx = 0;
        while (topIdx < h * 0.4 && rowCounts[topIdx] / w < minRowRatio) topIdx++;

        let bottomIdx = h - 1;
        while (bottomIdx > h * 0.6 && rowCounts[bottomIdx] / w < minRowRatio) bottomIdx--;

        let leftIdx = 0;
        while (leftIdx < w * 0.4 && colCounts[leftIdx] / h < minColRatio) leftIdx++;

        let rightIdx = w - 1;
        while (rightIdx > w * 0.6 && colCounts[rightIdx] / h < minColRatio) rightIdx--;

        // If the entire image was already white (e.g. digital receipt with outer border),
        // find the inner content/frame boundary and trim outer margin neatly
        let topPct = Math.round((topIdx / h) * 100);
        let bottomPct = Math.round(((h - 1 - bottomIdx) / h) * 100);
        let leftPct = Math.round((leftIdx / w) * 100);
        let rightPct = Math.round(((w - 1 - rightIdx) / w) * 100);

        if (topPct <= 1 && bottomPct <= 1 && leftPct <= 1 && rightPct <= 1) {
          const inset = mode === 'white_only' ? 6 : 4;
          topPct = inset;
          bottomPct = inset;
          leftPct = inset;
          rightPct = inset;
        } else if (mode === 'white_only') {
          // Add 1% inward margin to guarantee zero table/background edge bleed
          topPct = Math.min(40, topPct + 1);
          bottomPct = Math.min(40, bottomPct + 1);
          leftPct = Math.min(40, leftPct + 1);
          rightPct = Math.min(40, rightPct + 1);
        }

        // 2) Auto-Deskew: Estimate skew angle (-10°..+10°) via Horizontal Projection Profile Variance
        // Dark ink/table-line pixels inside the paper region create sharp horizontal row peaks when level
        const x0 = Math.max(2, Math.round(w * (leftPct / 100)));
        const x1 = Math.min(w - 3, Math.round(w * (1 - rightPct / 100)));
        const y0 = Math.max(2, Math.round(h * (topPct / 100)));
        const y1 = Math.min(h - 3, Math.round(h * (1 - bottomPct / 100)));

        const darkPoints: Array<{ x: number; y: number }> = [];
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;

        for (let y = y0; y <= y1; y += 2) {
          for (let x = x0; x <= x1; x += 2) {
            const pIdx = (y * w + x) * 4;
            const pixelL =
              0.299 * imgData[pIdx] +
              0.587 * imgData[pIdx + 1] +
              0.114 * imgData[pIdx + 2];
            if (pixelL < 165) {
              darkPoints.push({ x: x - cx, y: y - cy });
            }
          }
        }

        let bestAngle = 0;
        if (darkPoints.length > 25) {
          let maxVariance = -1;
          const numBins = h;
          const bins = new Float32Array(numBins);

          for (let deg = -10; deg <= 10; deg += 0.5) {
            bins.fill(0);
            const rad = (deg * Math.PI) / 180;
            const sinA = Math.sin(rad);
            const cosA = Math.cos(rad);

            for (let i = 0; i < darkPoints.length; i++) {
              const pt = darkPoints[i];
              const rotY = Math.round(pt.x * sinA + pt.y * cosA + cy);
              if (rotY >= 0 && rotY < numBins) {
                bins[rotY]++;
              }
            }

            let mean = 0;
            for (let b = 0; b < numBins; b++) mean += bins[b];
            mean /= numBins;

            let variance = 0;
            for (let b = 0; b < numBins; b++) {
              const diff = bins[b] - mean;
              variance += diff * diff;
            }
            // Slight preference for 0° if already aligned
            const weightedVar = variance * (1 - Math.abs(deg) * 0.002);
            if (weightedVar > maxVariance) {
              maxVariance = weightedVar;
              bestAngle = deg;
            }
          }
        }

        // Only apply deskew if tilt is noticeable (>= 0.5°)
        const finalDeskew = Math.abs(bestAngle) >= 0.5 ? Number(bestAngle.toFixed(1)) : 0;

        // If deskew rotation is applied, nudge crop box slightly inward so rotated corners stay inside white paper
        const skewMargin = Math.min(6, Math.ceil(Math.abs(finalDeskew) * 0.55));
        const finalCrop: CropBoxPercent = {
          top: Math.max(0, Math.min(40, topPct + skewMargin)),
          left: Math.max(0, Math.min(40, leftPct + skewMargin)),
          right: Math.max(0, Math.min(40, rightPct + skewMargin)),
          bottom: Math.max(0, Math.min(40, bottomPct + skewMargin)),
        };

        // Detect 4 corner pins within the bounded paper region for Perspective Crop
        let tlPin = { x: finalCrop.left, y: finalCrop.top };
        let trPin = { x: 100 - finalCrop.right, y: finalCrop.top };
        let brPin = { x: 100 - finalCrop.right, y: 100 - finalCrop.bottom };
        let blPin = { x: finalCrop.left, y: 100 - finalCrop.bottom };

        let minSum = Infinity;
        let maxSum = -Infinity;
        let minDiff = Infinity; // y - x (Top-Right)
        let maxDiff = -Infinity; // y - x (Bottom-Left)

        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            if (!paperMask[y * w + x]) continue;
            const nx = (x / (w - 1)) * 100;
            const ny = (y / (h - 1)) * 100;
            const sum = nx + ny;
            const diff = ny - nx;
            if (sum < minSum) {
              minSum = sum;
              tlPin = { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 };
            }
            if (sum > maxSum) {
              maxSum = sum;
              brPin = { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 };
            }
            if (diff < minDiff) {
              minDiff = diff;
              trPin = { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 };
            }
            if (diff > maxDiff) {
              maxDiff = diff;
              blPin = { x: Math.round(nx * 10) / 10, y: Math.round(ny * 10) / 10 };
            }
          }
        }

        // Clamp detected pins to reasonable bounds if the paper fills the whole frame
        if (
          tlPin.x <= 2 &&
          tlPin.y <= 2 &&
          brPin.x >= 98 &&
          brPin.y >= 98
        ) {
          const fallbackPins = cropBoxToCornerPins(finalCrop);
          tlPin = fallbackPins.tl;
          trPin = fallbackPins.tr;
          brPin = fallbackPins.br;
          blPin = fallbackPins.bl;
        }

        const skewLabel =
          finalDeskew === 0
            ? 'Posisi kertas sudah tegak lurus (0°)'
            : `Kemiringan diluruskan otomatis (${finalDeskew > 0 ? `+${finalDeskew}` : finalDeskew}°)`;

        resolve({
          cropBox: finalCrop,
          cornerPins: { tl: tlPin, tr: trPin, br: brPin, bl: blPin },
          deskewAngle: finalDeskew,
          summary: `Smart Crop: 4 sudut kertas terdeteksi · ${skewLabel}`,
        });
      } catch {
        resolve(fallback);
      }
    };
    img.onerror = () => resolve(fallback);
    img.src = sourceDataUrl;
  });
}

/**
 * Full CamScanner Canvas Compositor:
 * 1) Applies 4-Point Perspective Homography Warp (when cornerPins / perspective mode is used)
 *    OR custom 4-edge CropBox (top, left, right, bottom %)
 * 2) Applies Rotation (0°, 90°, 180°, 270°), Fine Straightening (deskewAngle), and Flip
 * 3) Cleans non-paper dark perimeter pixels to pure white (#FFFFFF) when cleanWhiteEdges is active
 * 4) Applies CamScanner Filter + Manual Brightness/Contrast/Clarity adjustments
 * 5) Renders Whiteout Eraser, Yellow Highlighter, and Red Pen strokes
 * 6) Renders Official Verification Stamp if enabled
 */
async function renderCamScannerOutputCanvas(params: {
  sourceDataUrl: string;
  cropBox: CropBoxPercent;
  cornerPins?: CornerPinQuad;
  cropMode?: CropMode;
  rotationAngle: number;
  deskewAngle?: number;
  cleanWhiteEdges?: boolean;
  flipH: boolean;
  flipV: boolean;
  scanFilter: ReceiptScanFilter;
  brightness: number;
  contrast: number;
  clarity: number;
  strokes: MarkupStroke[];
  stampText: string;
  mimeType?: string;
}): Promise<{ processedDataUrl: string; width: number; height: number } | null> {
  const {
    sourceDataUrl,
    cropBox,
    cornerPins,
    cropMode = 'rect',
    rotationAngle,
    deskewAngle = 0,
    cleanWhiteEdges = true,
    flipH,
    flipV,
    scanFilter,
    brightness,
    contrast,
    clarity,
    strokes,
    stampText,
    mimeType,
  } = params;

  if (typeof document === 'undefined' || !sourceDataUrl.startsWith('data:image/')) {
    return null;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const rawW = img.naturalWidth || img.width;
        const rawH = img.naturalHeight || img.height;
        if (!rawW || !rawH) {
          resolve(null);
          return;
        }

        // Step 1: Determine cropped/rectified source drawable (either 4-point Perspective Homography or Rectangular Crop)
        let sourceDrawable: HTMLImageElement | HTMLCanvasElement = img;
        let sx = 0;
        let sy = 0;
        let sw = rawW;
        let sh = rawH;

        const warpedCanvas =
          cropMode === 'perspective' && cornerPins
            ? warpPerspectiveImageToCanvas(img, cornerPins)
            : null;

        if (warpedCanvas) {
          sourceDrawable = warpedCanvas;
          sx = 0;
          sy = 0;
          sw = warpedCanvas.width;
          sh = warpedCanvas.height;
        } else {
          const leftRatio = Math.max(0, Math.min(0.45, cropBox.left / 100));
          const topRatio = Math.max(0, Math.min(0.45, cropBox.top / 100));
          const rightRatio = Math.max(0, Math.min(0.45, cropBox.right / 100));
          const bottomRatio = Math.max(0, Math.min(0.45, cropBox.bottom / 100));

          sx = Math.round(rawW * leftRatio);
          sy = Math.round(rawH * topRatio);
          sw = Math.max(16, Math.round(rawW * (1 - leftRatio - rightRatio)));
          sh = Math.max(16, Math.round(rawH * (1 - topRatio - bottomRatio)));
        }

        const normAngle = ((Math.round((rotationAngle || 0) / 90) * 90) % 360 + 360) % 360;
        const swapDims = normAngle === 90 || normAngle === 270;

        const canvas = document.createElement('canvas');
        canvas.width = swapDims ? sh : sw;
        canvas.height = swapDims ? sw : sh;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        // Clean paper background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cssFilter = buildCombinedScanCssFilter(
          scanFilter,
          brightness,
          contrast,
          clarity
        );

        // Zoom compensation when straightening tilted images so corners never show angled gaps
        const deskewRad = (deskewAngle * Math.PI) / 180;
        const deskewScale =
          deskewAngle !== 0 ? 1 + Math.abs(Math.sin(deskewRad)) * 1.18 : 1;

        ctx.save();
        if ('filter' in ctx && cssFilter !== 'none') {
          ctx.filter = cssFilter;
        }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        if (normAngle !== 0 || deskewAngle !== 0) {
          ctx.rotate(((normAngle + deskewAngle) * Math.PI) / 180);
        }
        ctx.scale(
          (flipH ? -1 : 1) * deskewScale,
          (flipV ? -1 : 1) * deskewScale
        );
        ctx.drawImage(sourceDrawable, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
        ctx.restore();

        // Optional White-Paper Perimeter Cleanup: whiten any dark non-paper background pixels near outer edges
        if (cleanWhiteEdges) {
          try {
            const pData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const buf = pData.data;
            const cw = canvas.width;
            const ch = canvas.height;
            const edgeBandX = Math.max(2, Math.round(cw * 0.035));
            const edgeBandY = Math.max(2, Math.round(ch * 0.035));

            for (let y = 0; y < ch; y++) {
              const nearY = y < edgeBandY || y >= ch - edgeBandY;
              for (let x = 0; x < cw; x++) {
                const nearX = x < edgeBandX || x >= cw - edgeBandX;
                if (!nearX && !nearY) continue;
                const i = (y * cw + x) * 4;
                const r = buf[i];
                const g = buf[i + 1];
                const b = buf[i + 2];
                const l = 0.299 * r + 0.587 * g + 0.114 * b;
                const chroma = Math.max(r, g, b) - Math.min(r, g, b);
                // If an outer-edge pixel is dark table shadow or strongly colored background, whiten to clean paper
                if (l < 135 || chroma > 55) {
                  buf[i] = 255;
                  buf[i + 1] = 255;
                  buf[i + 2] = 255;
                }
              }
            }
            ctx.putImageData(pData, 0, 0);
          } catch {
            // Ignore cross-origin canvas read errors if any
          }
        }

        // Draw Markup Strokes (Whiteout Eraser / Stabilo Highlighter / Red Pen)
        if (strokes.length > 0) {
          for (const stroke of strokes) {
            if (stroke.points.length === 0) continue;
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const scaleFactor = Math.max(canvas.width, canvas.height) / 500;
            ctx.lineWidth = stroke.size * scaleFactor;

            if (stroke.tool === 'whiteout') {
              ctx.strokeStyle = '#FFFFFF';
              ctx.globalAlpha = 1;
            } else if (stroke.tool === 'highlighter') {
              ctx.strokeStyle = '#FACC15';
              ctx.globalAlpha = 0.42;
            } else {
              ctx.strokeStyle = '#DC2626';
              ctx.globalAlpha = 0.92;
            }

            ctx.beginPath();
            stroke.points.forEach((pt, idx) => {
              const px = pt.x * canvas.width;
              const py = pt.y * canvas.height;
              if (idx === 0) {
                ctx.moveTo(px, py);
              } else {
                ctx.lineTo(px, py);
              }
            });
            if (stroke.points.length === 1) {
              const p0 = stroke.points[0];
              ctx.lineTo(p0.x * canvas.width + 0.5, p0.y * canvas.height + 0.5);
            }
            ctx.stroke();
            ctx.restore();
          }
        }

        // Draw Official Verification Stamp if enabled
        if (stampText.trim()) {
          ctx.save();
          const fontSize = Math.max(12, Math.round(canvas.width * 0.028));
          ctx.font = `bold ${fontSize}px Calibri, Arial, sans-serif`;
          const text = stampText.trim().toUpperCase();
          const metrics = ctx.measureText(text);
          const padX = Math.round(fontSize * 0.8);
          const padY = Math.round(fontSize * 0.45);
          const boxW = metrics.width + padX * 2;
          const boxH = fontSize + padY * 2;
          const bx = canvas.width - boxW - Math.round(canvas.width * 0.04);
          const by = canvas.height - boxH - Math.round(canvas.height * 0.04);

          ctx.translate(bx + boxW / 2, by + boxH / 2);
          ctx.rotate((-6 * Math.PI) / 180);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
          ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);

          ctx.lineWidth = Math.max(2, Math.round(fontSize * 0.14));
          ctx.strokeStyle = 'rgba(4, 120, 87, 0.88)';
          ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);

          ctx.fillStyle = 'rgba(4, 120, 87, 0.92)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(text, 0, 0);
          ctx.restore();
        }

        const outMime =
          mimeType === 'image/png' || sourceDataUrl.startsWith('data:image/svg')
            ? 'image/png'
            : 'image/jpeg';
        const processedDataUrl = canvas.toDataURL(outMime, 0.92);
        resolve({
          processedDataUrl,
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = sourceDataUrl;
  });
}

export const DokumentasiPengeluaranSection: React.FC<DokumentasiPengeluaranSectionProps> = ({
  items,
  activeKuitansi,
  onAddItem,
  onUpdateItem,
  onRetrySyncItem,
  onDeleteItem,
  isGoogleConnected,
  isUploading,
  onOpenSyncModal,
  paperSize,
  onChangePaperSize,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'printSheet'>('list');
  const [showScanStudio, setShowScanStudio] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Whether we are creating a new receipt scan or editing an existing receipt card
  const [editingExistingItem, setEditingExistingItem] =
    useState<DokumentasiPengeluaranItem | null>(null);

  // Selected Rincian Kuitansi chip (1-tap link to active SPPD line item)
  const [selectedRincianId, setSelectedRincianId] = useState<string>(
    activeKuitansi.rincian[0]?.id || ''
  );

  // CamScanner Studio Active Tool Tab
  const [activeToolTab, setActiveToolTab] = useState<CamScannerToolTab>('crop');

  // CamScanner Studio Image & Transform State
  const [rawFotoDataUrl, setRawFotoDataUrl] = useState<string>(SAMPLE_RECEIPT_TRANSPORT);
  const [namaFile, setNamaFile] = useState<string>('scan_nota_perjalanan.png');
  const [mimeType, setMimeType] = useState<string>('image/png');
  const [jenisBerkas, setJenisBerkas] = useState<
    'Foto Nota/Tiket' | 'Dokumen Invoice (PDF/Berkas)'
  >('Foto Nota/Tiket');

  // 1. Smart Crop, Perspective Corner-Pin, Auto-Deskew & Rotate Tools State
  const [cropMode, setCropMode] = useState<CropMode>('perspective');
  const [cropBox, setCropBox] = useState<CropBoxPercent>({
    top: 5,
    left: 5,
    right: 5,
    bottom: 5,
  });
  const [cornerPins, setCornerPins] = useState<CornerPinQuad>(() =>
    cropBoxToCornerPins({ top: 5, left: 5, right: 5, bottom: 5 })
  );
  const [isPerspectivePreview, setIsPerspectivePreview] = useState<boolean>(false);
  const [perspectivePreviewUrl, setPerspectivePreviewUrl] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<
    null | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'
  >(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [deskewAngle, setDeskewAngle] = useState<number>(0);
  const [cleanWhiteEdges, setCleanWhiteEdges] = useState<boolean>(true);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // 2. Filter Tool State
  const [scanFilter, setScanFilter] = useState<ReceiptScanFilter>('magic');

  // 3. Adjust Sliders State (-50 to +50)
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [clarity, setClarity] = useState<number>(0);

  // 4. Markup / Smudge Eraser & Highlighter State
  const [markupTool, setMarkupTool] = useState<'whiteout' | 'highlighter' | 'redpen'>(
    'whiteout'
  );
  const [brushSize, setBrushSize] = useState<number>(14);
  const [strokes, setStrokes] = useState<MarkupStroke[]>([]);
  const [isDrawingStroke, setIsDrawingStroke] = useState<boolean>(false);

  // 5. Stamp / Label State
  const [stampText, setStampText] = useState<string>('');

  const [uploadToDriveNow, setUploadToDriveNow] = useState(true);
  const [isProcessingScan, setIsProcessingScan] = useState(false);

  // Gallery card states
  const [imageOrientations, setImageOrientations] = useState<
    Record<string, 'portrait' | 'landscape' | 'square'>
  >({});
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [rotatingItemId, setRotatingItemId] = useState<string | null>(null);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] =
    useState<DokumentasiPengeluaranItem | null>(null);

  const stageBoundsRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setActionToast(null);
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSelectedRincianId(activeKuitansi.rincian[0]?.id || '');
  }, [activeKuitansi.id, activeKuitansi.rincian]);

  // Lock background scroll when CamScanner Studio is open
  useEffect(() => {
    if (!showScanStudio) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [showScanStudio]);

  // Close 3-dot card action menu when clicking outside
  useEffect(() => {
    if (!openMenuItemId) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-exp-action-menu]')) {
        setOpenMenuItemId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [openMenuItemId]);

  // Handle interactive dragging of Corner-Pin Perspective handles or Rectangular Crop handles (mouse + touch)
  useEffect(() => {
    if (!draggingHandle) return;

    const updateCropFromClientXY = (clientX: number, clientY: number) => {
      const el = stageBoundsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const relX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const relY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      if (cropMode === 'perspective') {
        setIsPerspectivePreview(false);
        setCornerPins((prev) => {
          const next: CornerPinQuad = {
            tl: { ...prev.tl },
            tr: { ...prev.tr },
            br: { ...prev.br },
            bl: { ...prev.bl },
          };
          const clampX = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
          const clampY = (v: number) => Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;

          if (draggingHandle === 'tl') {
            next.tl.x = clampX(Math.min(relX, prev.tr.x - 8));
            next.tl.y = clampY(Math.min(relY, prev.bl.y - 8));
          } else if (draggingHandle === 'tr') {
            next.tr.x = clampX(Math.max(relX, prev.tl.x + 8));
            next.tr.y = clampY(Math.min(relY, prev.br.y - 8));
          } else if (draggingHandle === 'br') {
            next.br.x = clampX(Math.max(relX, prev.bl.x + 8));
            next.br.y = clampY(Math.max(relY, prev.tr.y + 8));
          } else if (draggingHandle === 'bl') {
            next.bl.x = clampX(Math.min(relX, prev.br.x - 8));
            next.bl.y = clampY(Math.max(relY, prev.tl.y + 8));
          } else if (draggingHandle === 't') {
            const maxY = Math.min(prev.bl.y, prev.br.y) - 8;
            const newY = clampY(Math.min(relY, maxY));
            next.tl.y = newY;
            next.tr.y = newY;
          } else if (draggingHandle === 'b') {
            const minY = Math.max(prev.tl.y, prev.tr.y) + 8;
            const newY = clampY(Math.max(relY, minY));
            next.bl.y = newY;
            next.br.y = newY;
          } else if (draggingHandle === 'l') {
            const maxX = Math.min(prev.tr.x, prev.br.x) - 8;
            const newX = clampX(Math.min(relX, maxX));
            next.tl.x = newX;
            next.bl.x = newX;
          } else if (draggingHandle === 'r') {
            const minX = Math.max(prev.tl.x, prev.bl.x) + 8;
            const newX = clampX(Math.max(relX, minX));
            next.tr.x = newX;
            next.br.x = newX;
          }

          setCropBox(cornerPinsToCropBox(next));
          return next;
        });
        return;
      }

      setCropBox((prev) => {
        const next = { ...prev };
        const maxLeft = 100 - prev.right - 20;
        const maxRight = 100 - prev.left - 20;
        const maxTop = 100 - prev.bottom - 20;
        const maxBottom = 100 - prev.top - 20;

        if (draggingHandle.includes('l')) {
          next.left = Math.round(Math.max(0, Math.min(40, Math.min(maxLeft, relX))));
        }
        if (draggingHandle.includes('r')) {
          next.right = Math.round(
            Math.max(0, Math.min(40, Math.min(maxRight, 100 - relX)))
          );
        }
        if (draggingHandle.includes('t')) {
          next.top = Math.round(Math.max(0, Math.min(40, Math.min(maxTop, relY))));
        }
        if (draggingHandle.includes('b')) {
          next.bottom = Math.round(
            Math.max(0, Math.min(40, Math.min(maxBottom, 100 - relY)))
          );
        }
        setCornerPins(cropBoxToCornerPins(next));
        return next;
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateCropFromClientXY(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        if (e.cancelable) e.preventDefault();
        updateCropFromClientXY(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onEnd = () => setDraggingHandle(null);

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
  }, [draggingHandle, cropMode]);

  const filteredItems = items;

  // Toggle live perspective-flattened preview on the canvas
  const handleTogglePerspectivePreview = async () => {
    if (isPerspectivePreview) {
      setIsPerspectivePreview(false);
      return;
    }
    const sourceUrl = rawFotoDataUrl || SAMPLE_RECEIPT_TRANSPORT;
    const img = new Image();
    img.onload = () => {
      const warped = warpPerspectiveImageToCanvas(img, cornerPins);
      if (warped) {
        setPerspectivePreviewUrl(warped.toDataURL('image/jpeg', 0.92));
        setIsPerspectivePreview(true);
        triggerToast('Pratinjau hasil potong perspektif 4-sudut aktif');
      }
    };
    img.src = sourceUrl;
  };

  // Run Smart Cropping, 4-Corner Pin Detection & Auto-Deskew on current image
  const handleRunSmartCrop = async (
    mode: 'paper_and_deskew' | 'white_only' | 'deskew_only',
    customUrl?: string
  ) => {
    setIsPerspectivePreview(false);
    const targetUrl = customUrl || rawFotoDataUrl || SAMPLE_RECEIPT_TRANSPORT;
    const detected = await detectSmartPaperCropAndSkew(targetUrl, mode);
    if (mode !== 'deskew_only') {
      setCropBox(detected.cropBox);
      setCornerPins(detected.cornerPins);
    }
    if (mode === 'white_only') {
      setCleanWhiteEdges(true);
    } else if (mode === 'deskew_only') {
      setDeskewAngle(detected.deskewAngle);
    } else {
      setDeskewAngle(detected.deskewAngle);
      setCleanWhiteEdges(true);
    }
  };

  // Open CamScanner Studio for a new scan
  const handleOpenNewScanStudio = () => {
    setEditingExistingItem(null);
    setSelectedRincianId(activeKuitansi.rincian[0]?.id || '');
    setRawFotoDataUrl(SAMPLE_RECEIPT_TRANSPORT);
    setNamaFile('scan_nota_perjalanan.png');
    setScanFilter('magic');
    const initialBox = { top: 5, left: 5, right: 5, bottom: 5 };
    setCropMode('perspective');
    setCropBox(initialBox);
    setCornerPins(cropBoxToCornerPins(initialBox));
    setIsPerspectivePreview(false);
    setPerspectivePreviewUrl(null);
    setRotationAngle(0);
    setDeskewAngle(0);
    setCleanWhiteEdges(true);
    setFlipH(false);
    setFlipV(false);
    setBrightness(0);
    setContrast(0);
    setClarity(0);
    setStrokes([]);
    setStampText('');
    setActiveToolTab('crop');
    setShowScanStudio(true);
  };

  // Open CamScanner Studio to edit an existing receipt card
  const handleOpenEditExistingCard = (exp: DokumentasiPengeluaranItem) => {
    setOpenMenuItemId(null);
    setEditingExistingItem(exp);
    setRawFotoDataUrl(exp.originalFotoDataUrl || exp.fotoBuktiDataUrl);
    setNamaFile(exp.namaFile);
    setMimeType(exp.mimeType || 'image/jpeg');
    setScanFilter(exp.scanFilter || 'magic');
    const c = exp.cropPercent ?? 5;
    const initialBox = { top: c, left: c, right: c, bottom: c };
    setCropMode('perspective');
    setCropBox(initialBox);
    setCornerPins(cropBoxToCornerPins(initialBox));
    setIsPerspectivePreview(false);
    setPerspectivePreviewUrl(null);
    setRotationAngle(exp.rotationAngle || 0);
    setDeskewAngle(0);
    setCleanWhiteEdges(true);
    setFlipH(false);
    setFlipV(false);
    setBrightness(0);
    setContrast(0);
    setClarity(0);
    setStrokes([]);
    setStampText('');
    setActiveToolTab('crop');
    setShowScanStudio(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNamaFile(file.name);
    setMimeType(file.type || 'image/png');
    setRotationAngle(0);
    setDeskewAngle(0);
    setFlipH(false);
    setFlipV(false);
    setStrokes([]);
    setIsPerspectivePreview(false);
    setPerspectivePreviewUrl(null);
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setJenisBerkas('Dokumen Invoice (PDF/Berkas)');
    } else {
      setJenisBerkas('Foto Nota/Tiket');
      setScanFilter('magic');
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result;
        setRawFotoDataUrl(dataUrl);
        if (!isPdf) {
          void handleRunSmartCrop('paper_and_deskew', dataUrl);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle drawing strokes on the receipt in 'markup' mode
  const getNormalizedPoint = (
    clientX: number,
    clientY: number
  ): { x: number; y: number } | null => {
    const el = stageBoundsRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height)),
    };
  };

  const handleStartMarkupStroke = (clientX: number, clientY: number) => {
    if (activeToolTab !== 'markup') return;
    const pt = getNormalizedPoint(clientX, clientY);
    if (!pt) return;
    setIsDrawingStroke(true);
    setStrokes((prev) => [
      ...prev,
      {
        tool: markupTool,
        size: brushSize,
        points: [pt],
      },
    ]);
  };

  const handleMoveMarkupStroke = (clientX: number, clientY: number) => {
    if (!isDrawingStroke || activeToolTab !== 'markup') return;
    const pt = getNormalizedPoint(clientX, clientY);
    if (!pt) return;
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      return [
        ...prev.slice(0, -1),
        {
          ...last,
          points: [...last.points, pt],
        },
      ];
    });
  };

  const handleEndMarkupStroke = () => {
    setIsDrawingStroke(false);
  };

  const handleRotateLeft90 = () => {
    setRotationAngle((prev) => ((prev - 90) % 360 + 360) % 360);
  };

  const handleRotateRight90 = () => {
    setRotationAngle((prev) => getNextRotationAngle(prev));
  };

  const handleSaveScannedReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingScan(true);

    try {
      const sourceUrl = rawFotoDataUrl || SAMPLE_RECEIPT_TRANSPORT;
      const scanned =
        jenisBerkas === 'Foto Nota/Tiket'
          ? await renderCamScannerOutputCanvas({
              sourceDataUrl: sourceUrl,
              cropBox,
              cornerPins,
              cropMode,
              rotationAngle,
              deskewAngle,
              cleanWhiteEdges,
              flipH,
              flipV,
              scanFilter,
              brightness,
              contrast,
              clarity,
              strokes,
              stampText,
              mimeType,
            })
          : null;

      const finalPhoto = scanned ? scanned.processedDataUrl : sourceUrl;
      const effectiveBox =
        cropMode === 'perspective' ? cornerPinsToCropBox(cornerPins) : cropBox;
      const avgCrop = Math.round(
        (effectiveBox.top +
          effectiveBox.left +
          effectiveBox.right +
          effectiveBox.bottom) /
          4
      );

      // If editing an existing card, update it in place
      if (editingExistingItem) {
        onUpdateItem?.({
          ...editingExistingItem,
          fotoBuktiDataUrl: finalPhoto,
          originalFotoDataUrl: sourceUrl,
          scanFilter,
          cropPercent: avgCrop,
          rotationAngle: 0,
        });
        setShowScanStudio(false);
        setEditingExistingItem(null);
        triggerToast('Perubahan hasil scan nota berhasil diterapkan');
        return;
      }

      const seqNum = items.length + 1;
      const finalFileName = namaFile || `scan_bukti_${seqNum}.jpg`;

      const matchedRincian =
        activeKuitansi.rincian.find((r) => r.id === selectedRincianId) ||
        activeKuitansi.rincian[0];

      const resolvedKategori: RincianKategori =
        matchedRincian?.kategori || 'Transportasi';
      const resolvedUraian = matchedRincian
        ? matchedRincian.uraian
        : `Bukti Pengeluaran #${seqNum}`;
      const resolvedNominal = matchedRincian
        ? calculateRincianRowTotal(
            matchedRincian.nominalSatuan,
            matchedRincian.kuantitas
          )
        : 0;

      const newItem: DokumentasiPengeluaranItem = {
        id: `exp-${Date.now()}`,
        kuitansiId: activeKuitansi.id,
        noSpt: activeKuitansi.noSpt,
        kategori: resolvedKategori,
        jenisBerkas,
        mimeType,
        namaPengeluaran: resolvedUraian,
        vendorPenyedia: activeKuitansi.tujuan || 'Sesuai Bukti Fisik',
        tanggalBukti: new Date().toISOString().slice(0, 10),
        nomorBukti: `SCAN-#${seqNum}`,
        nominal: resolvedNominal,
        catatan: `Hasil scan CamScanner (${resolvedUraian}) — SPT ${activeKuitansi.noSpt}.`,
        fotoBuktiDataUrl: finalPhoto,
        originalFotoDataUrl: sourceUrl,
        scanFilter,
        cropPercent: avgCrop,
        rotationAngle: 0,
        namaFile: finalFileName,
        statusSync: 'Lokal',
        createdAt: new Date().toISOString(),
      };

      await onAddItem(newItem, isGoogleConnected && uploadToDriveNow);
      setShowScanStudio(false);
      triggerToast('Hasil scan nota berhasil disimpan');
    } finally {
      setIsProcessingScan(false);
    }
  };

  // Quick 90° rotation directly on a gallery card with instant spinner & toast feedback
  const handleRotateExistingCard = async (exp: DokumentasiPengeluaranItem) => {
    setRotatingItemId(exp.id);
    try {
      const nextAngle = getNextRotationAngle(exp.rotationAngle || 0);
      const currentOri = imageOrientations[exp.id] || 'landscape';
      const flippedOri: 'portrait' | 'landscape' | 'square' =
        currentOri === 'landscape'
          ? 'portrait'
          : currentOri === 'portrait'
            ? 'landscape'
            : 'square';

      const rotated = await renderCamScannerOutputCanvas({
        sourceDataUrl: exp.fotoBuktiDataUrl,
        cropBox: { top: 0, left: 0, right: 0, bottom: 0 },
        rotationAngle: 90,
        deskewAngle: 0,
        cleanWhiteEdges: false,
        flipH: false,
        flipV: false,
        scanFilter: 'original',
        brightness: 0,
        contrast: 0,
        clarity: 0,
        strokes: [],
        stampText: '',
        mimeType: exp.mimeType,
      });

      const newOri = rotated
        ? detectEffectiveImageOrientation(rotated.width, rotated.height, 0)
        : flippedOri;

      setImageOrientations((prev) => ({
        ...prev,
        [exp.id]: newOri,
      }));

      onUpdateItem?.({
        ...exp,
        fotoBuktiDataUrl: rotated ? rotated.processedDataUrl : exp.fotoBuktiDataUrl,
        rotationAngle: nextAngle,
      });
      triggerToast(
        `Orientasi nota diputar 90° (${newOri === 'portrait' ? 'Potret' : 'Lanskap'})`
      );
    } finally {
      setRotatingItemId(null);
      setOpenMenuItemId(null);
    }
  };

  const handleRetrySync = async (exp: DokumentasiPengeluaranItem) => {
    setOpenMenuItemId(null);
    if (!onRetrySyncItem) {
      onOpenSyncModal();
      return;
    }
    setRetryingItemId(exp.id);
    try {
      await onRetrySyncItem(exp);
      triggerToast('Sinkronisasi bukti pengeluaran diproses');
    } finally {
      setRetryingItemId(null);
    }
  };

  const handleDetectCardOrientation = (
    itemId: string,
    e: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const ori = detectEffectiveImageOrientation(
      img.naturalWidth,
      img.naturalHeight,
      0
    );
    setImageOrientations((prev) =>
      prev[itemId] === ori ? prev : { ...prev, [itemId]: ori }
    );
  };

  const confirmAndDelete = async () => {
    if (!confirmDeleteTarget) return;
    await onDeleteItem(confirmDeleteTarget);
    setConfirmDeleteTarget(null);
    triggerToast('Bukti pengeluaran dihapus');
  };

  const liveCssFilter = buildCombinedScanCssFilter(
    scanFilter,
    brightness,
    contrast,
    clarity
  );

  const avgInsetPercent = Math.round(
    (cropBox.top + cropBox.left + cropBox.right + cropBox.bottom) / 4
  );

  // Active corner coordinate for live precision badge when dragging in perspective mode
  const activePinCoord =
    draggingHandle === 'tl'
      ? { label: 'Sudut Kiri Atas (TL)', pt: cornerPins.tl }
      : draggingHandle === 'tr'
        ? { label: 'Sudut Kanan Atas (TR)', pt: cornerPins.tr }
        : draggingHandle === 'br'
          ? { label: 'Sudut Kanan Bawah (BR)', pt: cornerPins.br }
          : draggingHandle === 'bl'
            ? { label: 'Sudut Kiri Bawah (BL)', pt: cornerPins.bl }
            : null;

  return (
    <div className="space-y-2.5 sm:space-y-4 relative">
      {/* Instant Visual Toast Feedback */}
      {actionToast && (
        <div
          role="status"
          aria-live="polite"
          className="no-print fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-slate-900/95 text-white text-xs font-bold shadow-lg border border-slate-700 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

      {/* Header Bar Ringkas Canva Light Style */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3 bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
        <LabeledIcon
          size="sm"
          icon={Receipt}
          iconBgClass="bg-amber-600 text-white"
          label="3. Foto/Scan Bukti Pengeluaran"
          tooltipVariant="info"
          tooltipTitle="CamScanner Smart Crop & Perspective Corner-Pin Studio"
          tooltipContent="Dilengkapi Corner-Pin Perspective Cropping (4 titik sudut bebas untuk meluruskan foto nota yang miring/trapesium), Smart Cropping kertas putih, 6 Filter Scan, dan Penghapus Noda."
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Floating Island View Switcher */}
          <div className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Galeri Scan Nota</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('printSheet')}
              className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                viewMode === 'printSheet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Lembar Cetak Bukti</span>
            </button>
          </div>

          {items.length > 0 && !showScanStudio && (
            <button
              type="button"
              onClick={handleOpenNewScanStudio}
              data-testid="open-scan-expense-btn"
              className="w-full sm:w-auto min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ScanLine className="w-3.5 h-3.5" />
              <span>+ Scan / Unggah Nota</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CAMSCANNER FULL EDIT TOOLS STUDIO MODAL (Canva Light Workspace Theme) */}
      {/* ===================================================================== */}
      {showScanStudio && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="camscanner-studio-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowScanStudio(false);
            }
          }}
        >
          <form
            onSubmit={handleSaveScannedReceipt}
            className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden"
          >
            {/* 1. Top Studio Header Bar */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200 bg-white shrink-0">
              <div className="w-11 h-1.5 rounded-full bg-slate-300 mx-auto mb-2 sm:hidden" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <h2
                    id="camscanner-studio-title"
                    className="text-xs sm:text-sm font-extrabold text-slate-900 truncate"
                  >
                    {editingExistingItem
                      ? `Edit Scan: ${editingExistingItem.namaPengeluaran}`
                      : 'Scan & Edit Nota'}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div
                    className="relative min-h-[34px] px-3 py-1 rounded-full bg-slate-100 hover:bg-sky-50 active:bg-sky-100 text-slate-800 hover:text-sky-800 border border-slate-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer overflow-hidden select-none"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-sky-700 pointer-events-none" />
                    <span className="pointer-events-none">Pilih Foto Galeri</span>
                    <input
                      id="exp-file-input"
                      type="file"
                      accept="image/*"
                      aria-label="Pilih Foto Galeri"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScanStudio(false)}
                    aria-label="Tutup studio scan"
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Interactive CamScanner Canvas Stage & Active Tool Controls */}
            <div className="p-3 sm:p-4 overflow-y-auto no-scrollbar overscroll-contain space-y-2.5 flex-1 bg-slate-100">
              <div className="relative w-full h-60 sm:h-72 rounded-2xl bg-slate-200/80 border border-slate-300/90 flex items-center justify-center overflow-hidden p-4 select-none">
                {/* Badge when viewing live perspective-rectified preview */}
                {isPerspectivePreview && (
                  <div className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1.5 bg-emerald-700 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-md">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Pratinjau Hasil Perspektif</span>
                  </div>
                )}

                {activeToolTab === 'crop' &&
                cropMode === 'perspective' &&
                !isPerspectivePreview ? (
                  <CanvasPerspectiveCropper
                    imageSrc={rawFotoDataUrl || SAMPLE_RECEIPT_TRANSPORT}
                    points={cornerPins}
                    onChangePoints={(nextPins) => {
                      setIsPerspectivePreview(false);
                      setCornerPins(nextPins);
                      setCropBox(cornerPinsToCropBox(nextPins));
                    }}
                    cssFilter={liveCssFilter}
                    rotationDeg={rotationAngle + deskewAngle}
                    zoomLevel={zoomLevel}
                    flipH={flipH}
                    flipV={flipV}
                    showHandles={true}
                  />
                ) : (
                  <div
                    ref={stageBoundsRef}
                    onMouseDown={(e) => handleStartMarkupStroke(e.clientX, e.clientY)}
                    onMouseMove={(e) => handleMoveMarkupStroke(e.clientX, e.clientY)}
                    onMouseUp={handleEndMarkupStroke}
                    onMouseLeave={handleEndMarkupStroke}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        handleStartMarkupStroke(
                          e.touches[0].clientX,
                          e.touches[0].clientY
                        );
                      }
                    }}
                    onTouchMove={(e) => {
                      if (e.touches.length === 1) {
                        handleMoveMarkupStroke(
                          e.touches[0].clientX,
                          e.touches[0].clientY
                        );
                      }
                    }}
                    onTouchEnd={handleEndMarkupStroke}
                    className={`relative inline-flex items-center justify-center bg-white shadow-lg rounded-lg ${
                      activeToolTab === 'markup' ? 'cursor-crosshair' : ''
                    }`}
                  >
                    <div className="relative overflow-hidden rounded-lg flex items-center justify-center">
                      <img
                        src={
                          isPerspectivePreview && perspectivePreviewUrl
                            ? perspectivePreviewUrl
                            : rawFotoDataUrl || SAMPLE_RECEIPT_TRANSPORT
                        }
                        alt="Kanvas edit pindaian nota"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        style={{
                          filter: liveCssFilter,
                          transform: `rotate(${rotationAngle + deskewAngle}deg) scale(${zoomLevel}) scaleX(${
                            flipH ? -1 : 1
                          }) scaleY(${flipV ? -1 : 1})`,
                        }}
                        className="max-h-52 sm:max-h-64 w-auto object-contain transition-transform duration-150 pointer-events-none"
                      />

                      {/* Live SVG Overlay for Eraser (Whiteout), Highlighter, and Red Pen Strokes */}
                      {strokes.length > 0 && (
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          className="pointer-events-none absolute inset-0 w-full h-full"
                        >
                          {strokes.map((st, sIdx) => {
                            const d = st.points
                              .map(
                                (p, pIdx) =>
                                  `${pIdx === 0 ? 'M' : 'L'} ${(p.x * 100).toFixed(2)} ${(
                                    p.y * 100
                                  ).toFixed(2)}`
                              )
                              .join(' ');
                            const strokeColor =
                              st.tool === 'whiteout'
                                ? '#FFFFFF'
                                : st.tool === 'highlighter'
                                  ? 'rgba(250, 204, 21, 0.45)'
                                  : 'rgba(220, 38, 38, 0.9)';
                            return (
                              <path
                                key={sIdx}
                                d={d}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth={st.size / 3.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            );
                          })}
                        </svg>
                      )}

                      {/* Live Official Stamp Preview */}
                      {stampText.trim() && (
                        <div className="pointer-events-none absolute bottom-3 right-3 -rotate-6 px-2.5 py-1 rounded-md border-2 border-emerald-700 bg-white/90 text-emerald-800 text-[10px] font-extrabold tracking-wider uppercase shadow-xs">
                          {stampText}
                        </div>
                      )}

                      {/* MODE B: RECTANGULAR CROP BOX OVERLAY */}
                      {activeToolTab === 'crop' && cropMode === 'rect' && (
                        <div
                          className="pointer-events-none absolute border-2 border-emerald-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.38)] transition-all duration-75"
                          style={{
                            top: `${cropBox.top}%`,
                            left: `${cropBox.left}%`,
                            right: `${cropBox.right}%`,
                            bottom: `${cropBox.bottom}%`,
                          }}
                        >
                          <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                            <div className="border-r border-b border-emerald-400/45" />
                            <div className="border-r border-b border-emerald-400/45" />
                            <div className="border-b border-emerald-400/45" />
                            <div className="border-r border-b border-emerald-400/45" />
                            <div className="border-r border-b border-emerald-400/45" />
                            <div className="border-b border-emerald-400/45" />
                            <div className="border-r border-emerald-400/45" />
                            <div className="border-r border-emerald-400/45" />
                            <div />
                          </div>
                        </div>
                      )}
                    </div>

                  {/* Interactive 8-Point Handles for RECTANGULAR Crop Mode */}
                  {activeToolTab === 'crop' && cropMode === 'rect' && (
                    <>
                      {(
                        [
                          {
                            id: 'tl',
                            style: { top: `${cropBox.top}%`, left: `${cropBox.left}%` },
                          },
                          {
                            id: 'tr',
                            style: { top: `${cropBox.top}%`, right: `${cropBox.right}%` },
                          },
                          {
                            id: 'bl',
                            style: {
                              bottom: `${cropBox.bottom}%`,
                              left: `${cropBox.left}%`,
                            },
                          },
                          {
                            id: 'br',
                            style: {
                              bottom: `${cropBox.bottom}%`,
                              right: `${cropBox.right}%`,
                            },
                          },
                        ] as const
                      ).map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          aria-label={`Titik potong sudut ${h.id}`}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setDraggingHandle(h.id);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            setDraggingHandle(h.id);
                          }}
                          style={h.style}
                          className={`absolute w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-md cursor-grab active:cursor-grabbing z-20 ${
                            h.id === 'tl'
                              ? '-translate-x-1/2 -translate-y-1/2'
                              : h.id === 'tr'
                                ? 'translate-x-1/2 -translate-y-1/2'
                                : h.id === 'bl'
                                  ? '-translate-x-1/2 translate-y-1/2'
                                  : 'translate-x-1/2 translate-y-1/2'
                          }`}
                        />
                      ))}

                      <button
                        type="button"
                        aria-label="Titik potong atas"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('t');
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('t');
                        }}
                        style={{
                          top: `${cropBox.top}%`,
                          left: `${50 + (cropBox.left - cropBox.right) / 2}%`,
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-2.5 rounded-full bg-white border-2 border-emerald-600 shadow-xs cursor-ns-resize z-20"
                      />
                      <button
                        type="button"
                        aria-label="Titik potong bawah"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('b');
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('b');
                        }}
                        style={{
                          bottom: `${cropBox.bottom}%`,
                          left: `${50 + (cropBox.left - cropBox.right) / 2}%`,
                        }}
                        className="absolute -translate-x-1/2 translate-y-1/2 w-6 h-2.5 rounded-full bg-white border-2 border-emerald-600 shadow-xs cursor-ns-resize z-20"
                      />
                      <button
                        type="button"
                        aria-label="Titik potong kiri"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('l');
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('l');
                        }}
                        style={{
                          left: `${cropBox.left}%`,
                          top: `${50 + (cropBox.top - cropBox.bottom) / 2}%`,
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-6 rounded-full bg-white border-2 border-emerald-600 shadow-xs cursor-ew-resize z-20"
                      />
                      <button
                        type="button"
                        aria-label="Titik potong kanan"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('r');
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          setDraggingHandle('r');
                        }}
                        style={{
                          right: `${cropBox.right}%`,
                          top: `${50 + (cropBox.top - cropBox.bottom) / 2}%`,
                        }}
                        className="absolute translate-x-1/2 -translate-y-1/2 w-2.5 h-6 rounded-full bg-white border-2 border-emerald-600 shadow-xs cursor-ew-resize z-20"
                      />
                    </>
                  )}
                </div>
                )}
              </div>

              {/* ================================================================= */}
              {/* 3. CONTEXTUAL SUB-TOOLBAR FOR ACTIVE CAMSCANNER TOOL              */}
              {/* ================================================================= */}
              <div className="bg-white border border-slate-200 rounded-2xl p-2.5 shadow-2xs">
                {/* TAB 1: SMART CROPPING, PERSPECTIVE CORNER-PIN & ROTATE */}
                {activeToolTab === 'crop' && (
                  <div className="space-y-2">
                    {/* Crop Mode Switcher: Perspective Crop (Corner-Pin) vs Persegi */}
                    <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-1 flex-1 min-w-[220px]">
                        <button
                          type="button"
                          onClick={() => {
                            setCropMode('perspective');
                            setIsPerspectivePreview(false);
                          }}
                          data-testid="crop-mode-perspective-btn"
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            cropMode === 'perspective'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-white/70'
                          }`}
                        >
                          <Crop className="w-3.5 h-3.5 shrink-0" />
                          <span>Perspective Crop (Corner-Pin)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCropMode('rect');
                            setIsPerspectivePreview(false);
                            setCropBox(cornerPinsToCropBox(cornerPins));
                          }}
                          data-testid="crop-mode-rect-btn"
                          className={`min-h-[32px] px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            cropMode === 'rect'
                              ? 'bg-sky-700 text-white shadow-2xs'
                              : 'text-slate-700 hover:bg-white/70'
                          }`}
                        >
                          <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Potong Persegi</span>
                        </button>
                      </div>

                      {cropMode === 'perspective' && (
                        <button
                          type="button"
                          onClick={() => void handleTogglePerspectivePreview()}
                          data-testid="perspective-preview-btn"
                          className={`min-h-[32px] px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center justify-center gap-1.5 border transition-colors cursor-pointer ${
                            isPerspectivePreview
                              ? 'bg-amber-500 text-slate-950 border-amber-600'
                              : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {isPerspectivePreview
                              ? 'Edit Pin Sudut'
                              : 'Pratinjau Perspektif'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Smart Detection & Perspective Helper Presets */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => void handleRunSmartCrop('paper_and_deskew')}
                        data-testid="smart-crop-paper-btn"
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Deteksi 4 Sudut</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRunSmartCrop('white_only')}
                        data-testid="smart-crop-white-only-btn"
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ScanLine className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Kertas Putih</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRunSmartCrop('deskew_only')}
                        data-testid="smart-deskew-btn"
                        className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                        <span>Luruskan</span>
                      </button>
                    </div>

                    {/* Corner-Pin Quick Trapezoid / Perspective Presets when in Perspective Mode */}
                    {cropMode === 'perspective' && (
                      <div className="bg-emerald-50/60 border border-emerald-200/90 rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-[10.5px] font-bold text-emerald-950">
                          Tarik 4 titik sudut bebas di atas nota atau pilih bantu sudut:
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPerspectivePreview(false);
                              setCornerPins({
                                tl: { x: 14, y: 6 },
                                tr: { x: 86, y: 6 },
                                br: { x: 95, y: 94 },
                                bl: { x: 5, y: 94 },
                              });
                            }}
                            className="px-2 py-0.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-[10.5px] font-bold text-emerald-900 cursor-pointer"
                          >
                            Miring Atas
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPerspectivePreview(false);
                              setCornerPins({
                                tl: { x: 5, y: 6 },
                                tr: { x: 95, y: 6 },
                                br: { x: 86, y: 94 },
                                bl: { x: 14, y: 94 },
                              });
                            }}
                            className="px-2 py-0.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-[10.5px] font-bold text-emerald-900 cursor-pointer"
                          >
                            Miring Bawah
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPerspectivePreview(false);
                              const aligned = cropBoxToCornerPins(cropBox);
                              setCornerPins(aligned);
                            }}
                            className="px-2 py-0.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-[10.5px] font-bold text-slate-700 cursor-pointer"
                          >
                            Ratakan Sudut
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Compact Straighten Slider & Edge Whitening Toggle */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <span className="text-[11px] font-bold text-slate-700 shrink-0">
                          Luruskan
                        </span>
                        <input
                          type="range"
                          min={-15}
                          max={15}
                          step={0.5}
                          value={deskewAngle}
                          onChange={(e) => setDeskewAngle(Number(e.target.value))}
                          aria-label="Slider Pelurus Kemiringan Kertas"
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                        <span className="font-mono text-[11px] font-bold text-emerald-700 w-9 text-right shrink-0">
                          {deskewAngle > 0 ? `+${deskewAngle}°` : `${deskewAngle}°`}
                        </span>
                        {deskewAngle !== 0 && (
                          <button
                            type="button"
                            onClick={() => setDeskewAngle(0)}
                            className="text-[11px] font-bold text-sky-700 hover:underline shrink-0 cursor-pointer"
                          >
                            0°
                          </button>
                        )}
                      </div>

                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-700 font-semibold shrink-0">
                        <input
                          type="checkbox"
                          checked={cleanWhiteEdges}
                          onChange={(e) => setCleanWhiteEdges(e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 w-3.5 h-3.5"
                        />
                        <span>Putihkan Tepi</span>
                      </label>
                    </div>

                    {/* Zoom In / Zoom Out Controls Bar */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-bold text-slate-700">Zoom Tampilan</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.25))}
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Perkecil (Zoom Out)"
                        >
                          <ZoomOut className="w-3.5 h-3.5 text-sky-700" />
                          <span>-</span>
                        </button>
                        <span className="font-mono text-xs font-bold text-slate-800 w-12 text-center">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                          className="px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Perbesar (Zoom In)"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-sky-700" />
                          <span>+</span>
                        </button>
                        {zoomLevel !== 1 && (
                          <button
                            type="button"
                            onClick={() => setZoomLevel(1)}
                            className="text-[11px] font-bold text-sky-700 hover:underline px-1 cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bar Alat Putar 90° & Balik */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      <button
                        type="button"
                        onClick={handleRotateLeft90}
                        data-testid="camscanner-rotate-left"
                        className="min-h-[36px] px-2 py-1 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 text-slate-700 hover:text-sky-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-sky-700" />
                        <span>Kiri</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRotateRight90}
                        data-testid="scan-rotate-btn"
                        className="min-h-[36px] px-2 py-1 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 text-slate-700 hover:text-sky-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-sky-700" />
                        <span>Kanan</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFlipH((prev) => !prev)}
                        className={`min-h-[36px] px-2 py-1 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                          flipH
                            ? 'bg-sky-700 text-white border-sky-700'
                            : 'bg-slate-50 hover:bg-sky-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <FlipHorizontal2 className="w-3.5 h-3.5" />
                        <span>Balik H</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFlipV((prev) => !prev)}
                        className={`min-h-[36px] px-2 py-1 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                          flipV
                            ? 'bg-sky-700 text-white border-sky-700'
                            : 'bg-slate-50 hover:bg-sky-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <FlipVertical2 className="w-3.5 h-3.5" />
                        <span>Balik V</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleRunSmartCrop('paper_and_deskew')}
                        data-testid="scan-crop-auto"
                        className="min-h-[36px] px-2 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ScanLine className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Auto-Fit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const fullBox = { top: 0, left: 0, right: 0, bottom: 0 };
                          setCropBox(fullBox);
                          setCornerPins(cropBoxToCornerPins(fullBox));
                          setIsPerspectivePreview(false);
                          setDeskewAngle(0);
                        }}
                        data-testid="scan-crop-full"
                        className="min-h-[36px] px-2 py-1 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Penuh</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: FILTER PEMINDAI CAMSCANNER */}
                {activeToolTab === 'filter' && (
                  <div
                    role="group"
                    aria-label="Filter Pemindaian CamScanner"
                    className="grid grid-cols-3 sm:grid-cols-6 gap-2"
                  >
                    {CAMSCANNER_FILTERS.map((fOpt) => {
                      const isSelected = scanFilter === fOpt.id;
                      return (
                        <button
                          key={fOpt.id}
                          type="button"
                          onClick={() => setScanFilter(fOpt.id)}
                          data-testid={`scan-filter-${fOpt.id}`}
                          className={`p-1.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 bg-slate-50 hover:bg-white'
                          }`}
                        >
                          <div className="w-full h-11 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center relative">
                            <img
                              src={rawFotoDataUrl || SAMPLE_RECEIPT_TRANSPORT}
                              alt={fOpt.shortLabel}
                              referrerPolicy="no-referrer"
                              style={{
                                filter:
                                  fOpt.baseCssFilter !== 'none'
                                    ? fOpt.baseCssFilter
                                    : undefined,
                              }}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <span className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </div>
                          <span
                            className={`text-[10.5px] font-bold leading-tight ${
                              isSelected ? 'text-emerald-900' : 'text-slate-700'
                            }`}
                          >
                            {fOpt.shortLabel}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TAB 3: SESUAIKAN (MANUAL BRIGHTNESS, CONTRAST, CLARITY SLIDERS) */}
                {activeToolTab === 'adjust' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">Kecerahan</span>
                          <span className="font-mono font-bold text-sky-700">
                            {brightness > 0 ? `+${brightness}` : brightness}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          aria-label="Slider Kecerahan"
                          className="w-full accent-sky-700 cursor-pointer"
                        />
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">Kontras</span>
                          <span className="font-mono font-bold text-sky-700">
                            {contrast > 0 ? `+${contrast}` : contrast}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={contrast}
                          onChange={(e) => setContrast(Number(e.target.value))}
                          aria-label="Slider Kontras"
                          className="w-full accent-sky-700 cursor-pointer"
                        />
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">Ketajaman</span>
                          <span className="font-mono font-bold text-sky-700">
                            {clarity > 0 ? `+${clarity}` : clarity}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-50}
                          max={50}
                          value={clarity}
                          onChange={(e) => setClarity(Number(e.target.value))}
                          aria-label="Slider Ketajaman Warna"
                          className="w-full accent-sky-700 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: BERSIHKAN NODA & STABILO */}
                {activeToolTab === 'markup' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setMarkupTool('whiteout')}
                        className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
                          markupTool === 'whiteout'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Eraser className="w-3.5 h-3.5" />
                        <span>Penghapus</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMarkupTool('highlighter')}
                        className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
                          markupTool === 'highlighter'
                            ? 'bg-amber-400 text-slate-950 border-amber-500'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Highlighter className="w-3.5 h-3.5" />
                        <span>Stabilo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMarkupTool('redpen')}
                        className={`min-h-[34px] px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 cursor-pointer ${
                          markupTool === 'redpen'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <PenTool className="w-3.5 h-3.5" />
                        <span>Pena</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      {[
                        { size: 8, label: 'S' },
                        { size: 14, label: 'M' },
                        { size: 24, label: 'L' },
                      ].map((b) => (
                        <button
                          key={b.size}
                          type="button"
                          onClick={() => setBrushSize(b.size)}
                          className={`px-2.5 py-1 rounded-lg font-bold border cursor-pointer ${
                            brushSize === b.size
                              ? 'bg-sky-700 text-white border-sky-700'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={strokes.length === 0}
                        onClick={() => setStrokes((prev) => prev.slice(0, -1))}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={strokes.length === 0}
                        onClick={() => setStrokes([])}
                        className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-40 text-red-700 font-bold cursor-pointer"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!editingExistingItem && isGoogleConnected && (
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer px-1">
                  <input
                    type="checkbox"
                    checked={uploadToDriveNow}
                    onChange={(e) => setUploadToDriveNow(e.target.checked)}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-600 w-4 h-4"
                  />
                  <span>Simpan ke Google Drive &amp; Sheets</span>
                </label>
              )}
            </div>

            {/* 4. Fixed CamScanner Bottom Tool Switcher & Action Footer */}
            <div className="px-4 sm:px-5 pt-3 pb-4 border-t border-slate-200 bg-white space-y-3 shrink-0">
              <div
                role="tablist"
                aria-label="Menu Alat Edit CamScanner"
                className="grid grid-cols-4 gap-1.5 bg-slate-100 border border-slate-200/80 rounded-2xl p-1"
              >
                {(
                  [
                    { id: 'crop', label: 'Potong', icon: Crop },
                    { id: 'filter', label: 'Filter', icon: Sparkles },
                    { id: 'adjust', label: 'Kontras', icon: SlidersHorizontal },
                    { id: 'markup', label: 'Hapus', icon: Eraser },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const active = activeToolTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveToolTab(tab.id)}
                      data-testid={`camscanner-tab-${tab.id}`}
                      className={`min-h-[42px] px-1.5 py-1 rounded-xl text-[10.5px] sm:text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate max-w-full">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowScanStudio(false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || isProcessingScan}
                  data-testid="submit-expense-btn"
                  className="min-h-[42px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {isUploading || isProcessingScan
                      ? 'Memproses...'
                      : editingExistingItem
                        ? 'Terapkan Perubahan Scan'
                        : 'Simpan Hasil Scan'}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODE 1: LIST OF SCANNED EXPENSE PROOFS */}
      {viewMode === 'list' ? (
        filteredItems.length === 0 ? (
          !showScanStudio ? (
            <EmptyStateCard
              variant="pengeluaran"
              title="Belum Ada Bukti Pengeluaran"
              description="Pindai (scan) foto tiket transportasi, invoice hotel, atau tanda terima dengan alat Smart Crop CamScanner."
              ctaLabel="Buka CamScanner & Unggah Nota"
              onCtaClick={handleOpenNewScanStudio}
              secondaryHint={activeKuitansi.noSpt}
            />
          ) : null
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((exp, idx) => {
              const orientation = imageOrientations[exp.id] || 'landscape';
              const isMenuOpen = openMenuItemId === exp.id;
              const isRotatingThis = rotatingItemId === exp.id;
              const isRetrying = retryingItemId === exp.id;
              const isSynced = exp.statusSync === 'Tersimpan di Drive & Sheets';
              const isFailed = exp.statusSync === 'Gagal Sinkronisasi';
              const activeScanFilter = exp.scanFilter || 'original';
              const scanBadgeLabel =
                activeScanFilter === 'magic'
                  ? 'Magic Scan'
                  : CAMSCANNER_FILTERS.find((f) => f.id === activeScanFilter)
                      ?.shortLabel || 'Scan';

              return (
                <article
                  key={exp.id}
                  data-testid={`expense-card-${idx + 1}`}
                  data-orientation={orientation}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                >
                  <div>
                    {/* Pratinjau Hasil Scan Nota + Tombol Cepat Edit Scan & Putar 90° */}
                    <div className="aspect-4/3 bg-slate-100 relative overflow-hidden border-b border-slate-100 flex items-center justify-center p-2.5">
                      <img
                        src={exp.fotoBuktiDataUrl}
                        alt={exp.namaPengeluaran}
                        referrerPolicy="no-referrer"
                        onLoad={(e) => handleDetectCardOrientation(exp.id, e)}
                        className="max-w-full max-h-full w-auto h-auto object-contain mx-auto bg-white rounded-lg shadow-xs"
                      />

                      {/* Badge Orientasi & Mode Scan dengan Kontras Tegas */}
                      <span className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white border border-white/15 shadow-xs text-[10.5px] font-bold">
                        {orientation === 'portrait' ? 'Potret' : 'Lanskap'} -{' '}
                        {scanBadgeLabel}
                      </span>

                      {/* Tombol Aksi Cepat: Edit Scan (CamScanner) & Putar 90° */}
                      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditExistingCard(exp)}
                          data-testid={`edit-scan-btn-${idx + 1}`}
                          title="Buka peralatan edit CamScanner (Potong, Filter, Kontras, Stabilo)"
                          className="min-h-[32px] px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Edit Scan</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRotateExistingCard(exp)}
                          disabled={isRotatingThis}
                          data-testid={`rotate-expense-btn-${idx + 1}`}
                          title="Putar orientasi foto nota 90°"
                          className="min-h-[32px] px-2.5 py-1 rounded-xl bg-white/95 hover:bg-sky-50 text-slate-900 hover:text-sky-800 border border-slate-200 shadow-sm text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RotateCw
                            className={`w-3 h-3 text-sky-700 ${
                              isRotatingThis ? 'animate-spin' : ''
                            }`}
                          />
                          <span>{isRotatingThis ? '...' : '90°'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Isi Informasi Bukti & Menu Titik Tiga */}
                    <div className="p-4 sm:p-5 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-[11px] font-semibold text-slate-500 truncate">
                            {exp.kategori} · {exp.tanggalBukti}
                          </p>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                            {exp.namaPengeluaran}
                          </h3>
                        </div>

                        {/* Menu Aksi Titik Tiga */}
                        <div className="relative shrink-0" data-exp-action-menu>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuItemId((prev) =>
                                prev === exp.id ? null : exp.id
                              )
                            }
                            aria-label={`Menu aksi bukti ${exp.namaPengeluaran}`}
                            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {isMenuOpen && (
                            <div
                              role="menu"
                              className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-30 space-y-0.5"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleOpenEditExistingCard(exp)}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer"
                              >
                                <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Buka Studio Edit CamScanner</span>
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleRotateExistingCard(exp)}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2 cursor-pointer"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-sky-700" />
                                <span>Putar Nota (Rotate 90°)</span>
                              </button>

                              <div className="my-1 border-t border-slate-100" />

                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuItemId(null);
                                  setConfirmDeleteTarget(exp);
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus Bukti Pengeluaran</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-lg font-extrabold font-mono text-slate-900 tabular-nums">
                        {formatRupiah(exp.nominal)}
                      </p>

                      <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">SPT: {exp.noSpt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Sinkronisasi & Retry dengan Kontras Tegas */}
                  <div
                    className={`px-4 py-3 border-t flex items-center justify-between gap-2 text-xs ${
                      isFailed
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : isSynced
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    {isFailed ? (
                      <>
                        <span className="font-bold text-red-800 flex items-center gap-1.5 truncate">
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span>Gagal Sinkron (Aman di Lokal)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRetrySync(exp)}
                          disabled={isRetrying}
                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRetrying ? 'animate-spin' : ''}`} />
                          <span>{isRetrying ? 'Mencoba...' : 'Coba Lagi'}</span>
                        </button>
                      </>
                    ) : isSynced ? (
                      <>
                        <span className="font-bold text-emerald-800 flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Tersimpan di Drive &amp; Sheets</span>
                        </span>
                        {exp.driveWebViewLink && (
                          <a
                            href={exp.driveWebViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-sky-700 hover:underline inline-flex items-center gap-1 shrink-0"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Drive</span>
                          </a>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate">
                          <HardDrive className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Arsip Lokal ({exp.statusSync})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRetrySync(exp)}
                          disabled={isRetrying}
                          className="font-bold text-sky-700 hover:underline inline-flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                          <span>{isRetrying ? 'Memproses...' : 'Sinkronkan'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* VIEW MODE 2: PRINTABLE LAMPIRAN BUKTI PENGELUARAN (1 Baris 1 Gambar, Anti Terpotong A4/F4) */
        <div className="space-y-3">
          <div className="no-print flex flex-wrap items-center justify-between gap-2.5 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">Lembar Cetak Bukti Pengeluaran:</strong>{' '}
              Menampilkan hasil pindai (scan) fisik nota, tiket, atau invoice pada lembar kertas {paperSize} (1 baris 1 gambar).
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={items.length === 0 || isExportingPdf}
                onClick={async () => {
                  setIsExportingPdf(true);
                  try {
                    await exportToDirectPdf({
                      paperSize,
                      documentTitle: buildCleanPdfTitle({
                        prefix: 'Bukti_Pengeluaran_SPJ',
                        atasNama: activeKuitansi.atasNama,
                        noSpt: activeKuitansi.noSpt,
                        paperSize,
                      }),
                      sheetSelector: '.print-only-sheet',
                    });
                  } catch (err: any) {
                    alert(err?.message || 'Gagal mengekspor PDF');
                  } finally {
                    setIsExportingPdf(false);
                  }
                }}
                className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors ${
                  items.length === 0 || isExportingPdf
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-sky-700 hover:bg-sky-800 text-white cursor-pointer'
                }`}
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? 'Memproses PDF...' : 'Ekspor PDF'}</span>
              </button>

              <button
                type="button"
                disabled={items.length === 0}
                onClick={() => {
                  void triggerIsolatedSpjPrint({
                    paperSize,
                    documentTitle: buildCleanPdfTitle({
                      prefix: 'Bukti_Pengeluaran_SPJ',
                      atasNama: activeKuitansi.atasNama,
                      noSpt: activeKuitansi.noSpt,
                      paperSize,
                    }),
                    sheetSelector: '.print-only-sheet',
                  });
                }}
                className={`min-h-[38px] px-4 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-colors ${
                  items.length === 0
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Bukti ({paperSize})</span>
              </button>
            </div>
          </div>

          <InteractivePaperViewer
            paperSize={paperSize}
            onChangePaperSize={onChangePaperSize}
            documentTitle="Lampiran Bukti Pengeluaran"
          >
            <div
              data-empty-page={items.length === 0 ? 'true' : undefined}
              className={`print-only-sheet kuitansi-official-font bg-white text-black w-full ${
                items.length === 0 ? 'spj-empty-printable-page' : ''
              } ${
                paperSize === 'F4'
                  ? 'px-0 py-7 min-h-[1247px] print:px-0 print:py-2 print:min-h-0 print:h-auto'
                  : 'px-0 py-6 min-h-[1123px] print:px-0 print:py-2 print:min-h-0 print:h-auto'
              }`}
            >
              <div className="w-[86%] max-w-[86%] mx-auto print:w-[86%] print:max-w-[86%] print:mx-auto">
                {items.length === 0 ? (
                  <div className="no-print h-[420px] flex items-center justify-center text-xs text-slate-400 italic">
                    Belum ada hasil scan nota/tiket untuk dicetak.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 w-full">
                    {items.map((exp) => (
                      <div
                        key={exp.id}
                        className="w-full bg-white overflow-hidden break-inside-avoid flex items-center justify-center"
                      >
                        <img
                          src={exp.fotoBuktiDataUrl}
                          alt={exp.namaPengeluaran}
                          referrerPolicy="no-referrer"
                          className={`w-full h-auto object-contain mx-auto break-inside-avoid ${
                            paperSize === 'F4' ? 'max-h-[1160px]' : 'max-h-[1040px]'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </InteractivePaperViewer>
        </div>
      )}

      {/* Confirmation Modal for Deleting Expense Proof */}
      {confirmDeleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-exp-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 id="delete-exp-title" className="text-base font-bold text-slate-900">
              Hapus Bukti Pengeluaran?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghapus bukti pengeluaran{' '}
              <strong>&ldquo;{confirmDeleteTarget.namaPengeluaran}&rdquo;</strong> senilai{' '}
              <strong>{formatRupiah(confirmDeleteTarget.nominal)}</strong>
              {confirmDeleteTarget.driveFileId
                ? ' beserta file bukti terkait di Google Drive.'
                : '.'}{' '}
              Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmAndDelete}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Ya, Hapus Bukti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
