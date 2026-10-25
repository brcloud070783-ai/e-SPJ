import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  Printer,
  UploadCloud,
  ExternalLink,
  MapPin,
  User,
  AlertCircle,
  LayoutGrid,
  FileSpreadsheet,
  FileText,
  Link2,
  X,
  RotateCw,
  RotateCcw,
  Crop,
  Sparkles,
  ScanLine,
  MoreVertical,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
} from 'lucide-react';
import {
  DokumentasiPerjalananItem,
  KuitansiPerjalananDinas,
  PaperSize,
  ReceiptScanFilter,
} from '../types/spj';
import { SAMPLE_DOC_PHOTO_1, SAMPLE_SPT_DOC } from '../data/seedData';
import { InteractivePaperViewer } from './InteractivePaperViewer';
import {
  LabeledIcon,
  InfoTooltip,
  EmptyStateCard,
} from './UiPatterns';
import {
  generateSmartBatchDocTitle,
  getNextRotationAngle,
  detectEffectiveImageOrientation,
  getPaperDimensions,
  calculateDocumentationGridDimensions,
  DocumentationPrintGridMode,
} from '../utils/spjCalculations';
import {
  buildCleanPdfTitle,
  triggerIsolatedSpjPrint,
} from '../utils/printPdf';

interface StagedDocFile {
  id: string;
  dataUrl: string;
  originalDataUrl?: string;
  namaFile: string;
  mimeType: string;
  jenisBerkas: 'Foto Kegiatan' | 'Dokumen Pendukung (PDF/Berkas)';
  rotationAngle: number;
  scanFilter?: ReceiptScanFilter;
  cropPercent?: number;
  zoomLevel?: number;
}

interface DokumentasiPerjalananSectionProps {
  items: DokumentasiPerjalananItem[];
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  onAddItem: (item: DokumentasiPerjalananItem, uploadToDriveNow: boolean) => Promise<void>;
  onUpdateItem?: (item: DokumentasiPerjalananItem) => void;
  onRetrySyncItem?: (item: DokumentasiPerjalananItem) => Promise<void>;
  onDeleteItem: (item: DokumentasiPerjalananItem) => Promise<void>;
  isGoogleConnected: boolean;
  isUploading: boolean;
  onOpenSyncModal: () => void;
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
}

type CamScannerToolTab = 'crop' | 'filter' | 'adjust';
type PrintGridMode = DocumentationPrintGridMode;

/**
 * Custom hook to calculate the optimal CSS grid layout (1x1 to 2x4) based on the number of photos.
 * Ensures images occupy 90% of A4/F4 print area with maximum safe margins.
 */
function useOptimalGrid(
  itemsLength: number,
  manualGridMode: PrintGridMode,
  isAutoGrid: boolean
) {
  const optimalGridMode = React.useMemo<PrintGridMode>(() => {
    if (!isAutoGrid) return manualGridMode;
    const count = itemsLength;
    if (count <= 1) return '1x1';
    else if (count === 2) return '1x2';
    else if (count === 3) return '1x3';
    else if (count === 4) return '2x2';
    else if (count <= 6) return '2x3';
    else return '2x4';
  }, [itemsLength, manualGridMode, isAutoGrid]);

  const itemsPerPageCount = React.useMemo(() => {
    switch (optimalGridMode) {
      case '1x1': return 1;
      case '1x2': return 2;
      case '1x3': return 3;
      case '1x4': return 4;
      case '2x2': return 4;
      case '2x3': return 6;
      case '2x4': return 8;
      default: return 4;
    }
  }, [optimalGridMode]);

  return { optimalGridMode, itemsPerPageCount };
}

interface CropBoxPercent {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/**
 * Calculates a 16:9 landscape crop box percent for a given image dimension.
 * Ensures the resulting crop adheres strictly to the 16:9 ratio for the documentation grid.
 */
export function calculate16to9CropBox(
  imgWidth: number,
  imgHeight: number,
  verticalShiftPercent = 0,
  horizontalShiftPercent = 0
): CropBoxPercent {
  if (!imgWidth || !imgHeight) {
    return { top: 10, left: 0, right: 0, bottom: 10 };
  }
  const currentRatio = imgWidth / imgHeight;
  const targetRatio = 16 / 9; // ~1.777778

  if (Math.abs(currentRatio - targetRatio) < 0.01) {
    return { top: 0, left: 0, right: 0, bottom: 0 };
  }

  if (currentRatio > targetRatio) {
    // Image is wider than 16:9 -> trim horizontal sides (left and right)
    const targetW = imgHeight * targetRatio;
    const totalDiffPct = ((imgWidth - targetW) / imgWidth) * 100;
    const baseInset = totalDiffPct / 2;
    const leftInset = Math.max(0, Math.min(46, Math.round(baseInset + horizontalShiftPercent)));
    const rightInset = Math.max(0, Math.min(46, Math.round(totalDiffPct - leftInset)));
    return { top: 0, left: leftInset, right: rightInset, bottom: 0 };
  } else {
    // Image is taller than 16:9 (4:3, square 1:1, or vertical portrait 9:16) -> trim top and bottom
    const targetH = imgWidth / targetRatio;
    const totalInsetPct = ((imgHeight - targetH) / imgHeight) * 100;
    const baseInset = totalInsetPct / 2;
    const topInset = Math.max(0, Math.min(46, Math.round(baseInset + verticalShiftPercent)));
    const bottomInset = Math.max(0, Math.min(46, Math.round(totalInsetPct - topInset)));
    return { top: topInset, left: 0, right: 0, bottom: bottomInset };
  }
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
    label: 'H&P 2 (Halus)',
    shortLabel: 'H&P 2',
    baseCssFilter: 'grayscale(1) contrast(1.62) brightness(1.1)',
  },
];

export function buildCombinedScanCssFilter(
  filter: ReceiptScanFilter = 'original',
  brightnessOffset = 0,
  contrastOffset = 0,
  clarityOffset = 0
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
 * Smart Paper Boundary & Auto-Crop Detector:
 */
async function detectSmartPaperCropAndSkew(
  sourceDataUrl: string
): Promise<{
  cropBox: CropBoxPercent;
  deskewAngle: number;
  summary: string;
}> {
  const fallback = {
    cropBox: { top: 4, left: 4, right: 4, bottom: 4 },
    deskewAngle: 0,
    summary: 'Area foto berhasil dideteksi otomatis.',
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
        const threshold = Math.max(142, Math.min(220, Math.max(avgWhite * 0.9, borderWhite + 10)));

        const rowCounts = new Float32Array(h);
        const colCounts = new Float32Array(w);

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const isPaper = lum[y * w + x] >= threshold ? 1 : 0;
            if (isPaper) {
              rowCounts[y]++;
              colCounts[x]++;
            }
          }
        }

        const minRowRatio = 0.32;
        const minColRatio = 0.32;

        let topIdx = 0;
        while (topIdx < h * 0.4 && rowCounts[topIdx] / w < minRowRatio) topIdx++;

        let bottomIdx = h - 1;
        while (bottomIdx > h * 0.6 && rowCounts[bottomIdx] / w < minRowRatio) bottomIdx--;

        let leftIdx = 0;
        while (leftIdx < w * 0.4 && colCounts[leftIdx] / h < minColRatio) leftIdx++;

        let rightIdx = w - 1;
        while (rightIdx > w * 0.6 && colCounts[rightIdx] / h < minColRatio) rightIdx--;

        let topPct = Math.round((topIdx / h) * 100);
        let bottomPct = Math.round(((h - 1 - bottomIdx) / h) * 100);
        let leftPct = Math.round((leftIdx / w) * 100);
        let rightPct = Math.round(((w - 1 - rightIdx) / w) * 100);

        if (topPct <= 1 && bottomPct <= 1 && leftPct <= 1 && rightPct <= 1) {
          topPct = 4;
          bottomPct = 4;
          leftPct = 4;
          rightPct = 4;
        }

        resolve({
          cropBox: {
            top: Math.max(0, Math.min(30, topPct)),
            left: Math.max(0, Math.min(30, leftPct)),
            right: Math.max(0, Math.min(30, rightPct)),
            bottom: Math.max(0, Math.min(30, bottomPct)),
          },
          deskewAngle: 0,
          summary: 'Smart Crop berhasil mendeteksi area foto.',
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
 * Canvas Compositor for Activity Documentation (Supports Zoom & Crop):
 */
async function renderCamScannerOutputCanvas(params: {
  sourceDataUrl: string;
  cropBox: CropBoxPercent;
  rotationAngle: number;
  zoomLevel: number;
  flipH: boolean;
  flipV: boolean;
  scanFilter: ReceiptScanFilter;
  brightness: number;
  contrast: number;
  clarity: number;
  mimeType?: string;
}): Promise<{ processedDataUrl: string; width: number; height: number } | null> {
  const {
    sourceDataUrl,
    cropBox,
    rotationAngle,
    zoomLevel = 1,
    flipH,
    flipV,
    scanFilter,
    brightness,
    contrast,
    clarity,
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

        const zoomInset = zoomLevel > 1 ? (1 - 1 / zoomLevel) * 50 : 0;
        const effectiveTop = Math.max(0, cropBox.top + zoomInset);
        const effectiveLeft = Math.max(0, cropBox.left + zoomInset);
        const effectiveRight = Math.max(0, cropBox.right + zoomInset);
        const effectiveBottom = Math.max(0, cropBox.bottom + zoomInset);

        const leftRatio = Math.max(0, Math.min(0.48, effectiveLeft / 100));
        const topRatio = Math.max(0, Math.min(0.48, effectiveTop / 100));
        const rightRatio = Math.max(0, Math.min(0.48, effectiveRight / 100));
        const bottomRatio = Math.max(0, Math.min(0.48, effectiveBottom / 100));

        const sx = Math.round(rawW * leftRatio);
        const sy = Math.round(rawH * topRatio);
        const sw = Math.max(16, Math.round(rawW * (1 - leftRatio - rightRatio)));
        const sh = Math.max(16, Math.round(rawH * (1 - topRatio - bottomRatio)));

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

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const cssFilter = buildCombinedScanCssFilter(
          scanFilter,
          brightness,
          contrast,
          clarity
        );

        ctx.save();
        if ('filter' in ctx && cssFilter !== 'none') {
          ctx.filter = cssFilter;
        }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        if (normAngle !== 0) {
          ctx.rotate((normAngle * Math.PI) / 180);
        }
        ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        ctx.drawImage(img, sx, sy, sw, sh, -sw / 2, -sh / 2, sw, sh);
        ctx.restore();

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

/**
 * Helper to automatically crop any image to precise 16:9 landscape aspect ratio.
 */
async function cropImageTo16to9Landscape(
  rawUrl: string,
  mimeType = 'image/png',
  verticalShift = 0,
  horizontalShift = 0
): Promise<string> {
  if (!rawUrl || !rawUrl.startsWith('data:image/')) return rawUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = async () => {
      try {
        const box = calculate16to9CropBox(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          verticalShift,
          horizontalShift
        );
        const res = await renderCamScannerOutputCanvas({
          sourceDataUrl: rawUrl,
          cropBox: box,
          rotationAngle: 0,
          zoomLevel: 1,
          flipH: false,
          flipV: false,
          scanFilter: 'original',
          brightness: 0,
          contrast: 0,
          clarity: 0,
          mimeType,
        });
        resolve(res?.processedDataUrl || rawUrl);
      } catch {
        resolve(rawUrl);
      }
    };
    img.onerror = () => resolve(rawUrl);
    img.src = rawUrl;
  });
}

export const DokumentasiPerjalananSection: React.FC<DokumentasiPerjalananSectionProps> = ({
  items,
  kuitansiList,
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'printSheet'>('cards');
  const [printGridMode, setPrintGridMode] = useState<PrintGridMode>('2x2');
  const [isAutoGrid, setIsAutoGrid] = useState<boolean>(true);

  React.useEffect(() => {
    if (!isAutoGrid) return;
    const count = items.length;
    if (count <= 1) setPrintGridMode('1x1');
    else if (count === 2) setPrintGridMode('1x2');
    else if (count === 3) setPrintGridMode('1x3');
    else if (count === 4) setPrintGridMode('2x2');
    else if (count <= 6) setPrintGridMode('2x3');
    else setPrintGridMode('2x4');
  }, [items.length, isAutoGrid]);
  const [selectedKuitansiId, setSelectedKuitansiId] = useState(activeKuitansi.id);
  const [jenisBerkas, setJenisBerkas] = useState<
    'Foto Kegiatan' | 'Dokumen Pendukung (PDF/Berkas)'
  >('Foto Kegiatan');
  const [judulKegiatan, setJudulKegiatan] = useState('');
  const [tanggalKegiatan, setTanggalKegiatan] = useState('2026-04-02');
  const [waktuKegiatan, setWaktuKegiatan] = useState('10:00 WITA');
  const [lokasiKegiatan, setLokasiKegiatan] = useState(activeKuitansi.tujuan || '');
  const [keterangan, setKeterangan] = useState('');
  const [stagedFiles, setStagedFiles] = useState<StagedDocFile[]>([]);
  const [autoCrop16to9, setAutoCrop16to9] = useState<boolean>(true);
  const [panShiftY, setPanShiftY] = useState<number>(0);
  const [panShiftX, setPanShiftX] = useState<number>(0);
  const [uploadToDriveNow, setUploadToDriveNow] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [imageOrientations, setImageOrientations] = useState<
    Record<string, 'portrait' | 'landscape' | 'square'>
  >({});
  const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
  const [rotatingItemId, setRotatingItemId] = useState<string | null>(null);
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [confirmDeleteTarget, setConfirmDeleteTarget] =
    useState<DokumentasiPerjalananItem | null>(null);

  // Professional Image Editing & Cropping Studio State
  const [showScanStudio, setShowScanStudio] = useState(false);
  const [editingExistingItem, setEditingExistingItem] =
    useState<DokumentasiPerjalananItem | null>(null);
  const [editingStagedFileId, setEditingStagedFileId] = useState<string | null>(null);
  const [activeToolTab, setActiveToolTab] = useState<CamScannerToolTab>('crop');
  const [studioRawUrl, setStudioRawUrl] = useState<string>(SAMPLE_DOC_PHOTO_1);
  const [studioNamaFile, setStudioNamaFile] = useState<string>('dokumentasi.png');
  const [studioMimeType, setStudioMimeType] = useState<string>('image/png');
  const [cropBox, setCropBox] = useState<CropBoxPercent>({ top: 4, left: 4, right: 4, bottom: 4 });
  const [draggingHandle, setDraggingHandle] = useState<null | 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'>(null);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);
  const [scanFilter, setScanFilter] = useState<ReceiptScanFilter>('magic');
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [clarity, setClarity] = useState<number>(0);
  const [isProcessingStudio, setIsProcessingStudio] = useState<boolean>(false);

  const actionMenuContainerRef = useRef<HTMLDivElement | null>(null);
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
    if (!openMenuItemId) return;
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-doc-action-menu]')) {
        setOpenMenuItemId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [openMenuItemId]);

  useEffect(() => {
    if (!showAddForm && !showScanStudio) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [showAddForm, showScanStudio]);

  // Dragging crop box handles
  useEffect(() => {
    if (!draggingHandle) return;
    const updateCropFromXY = (clientX: number, clientY: number) => {
      const el = stageBoundsRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const relX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const relY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

      setCropBox((prev) => {
        const next = { ...prev };
        if (draggingHandle.includes('l')) next.left = Math.round(Math.max(0, Math.min(38, relX)));
        if (draggingHandle.includes('r')) next.right = Math.round(Math.max(0, Math.min(38, 100 - relX)));
        if (draggingHandle.includes('t')) next.top = Math.round(Math.max(0, Math.min(38, relY)));
        if (draggingHandle.includes('b')) next.bottom = Math.round(Math.max(0, Math.min(38, 100 - relY)));
        return next;
      });
    };

    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      updateCropFromXY(e.clientX, e.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) updateCropFromXY(e.touches[0].clientX, e.touches[0].clientY);
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
  }, [draggingHandle]);

  const handleDetectImageOrientation = (
    itemId: string,
    e: React.SyntheticEvent<HTMLImageElement>
  ) => {
    const img = e.currentTarget;
    if (!img.naturalWidth || !img.naturalHeight) return;
    const orientation = detectEffectiveImageOrientation(
      img.naturalWidth,
      img.naturalHeight,
      0
    );
    setImageOrientations((prev) =>
      prev[itemId] === orientation ? prev : { ...prev, [itemId]: orientation }
    );
  };

  const apply16to9Crop = (shiftY = 0, shiftX = 0) => {
    setPanShiftY(shiftY);
    setPanShiftX(shiftX);
    const img = new Image();
    img.onload = () => {
      const box = calculate16to9CropBox(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        shiftY,
        shiftX
      );
      setCropBox(box);
      triggerToast('Preset rasio 16:9 lanskap diterapkan');
    };
    img.src = studioRawUrl;
  };

  const handleOpenStudioForStaged = (staged: StagedDocFile) => {
    const rawUrl = staged.originalDataUrl || staged.dataUrl;
    setEditingExistingItem(null);
    setEditingStagedFileId(staged.id);
    setStudioRawUrl(rawUrl);
    setStudioNamaFile(staged.namaFile);
    setStudioMimeType(staged.mimeType);
    setRotationAngle(staged.rotationAngle || 0);
    setZoomLevel(staged.zoomLevel || 1);
    setScanFilter(staged.scanFilter || 'magic');
    setFlipH(false);
    setFlipV(false);
    setBrightness(0);
    setContrast(0);
    setClarity(0);
    setPanShiftY(0);
    setPanShiftX(0);
    setActiveToolTab('crop');

    // Auto-calculate exact 16:9 landscape crop
    const img = new Image();
    img.onload = () => {
      setCropBox(
        calculate16to9CropBox(img.naturalWidth || img.width, img.naturalHeight || img.height)
      );
    };
    img.src = rawUrl;

    setShowScanStudio(true);
  };

  const handleOpenStudioForGallery = (item: DokumentasiPerjalananItem) => {
    const rawUrl = item.originalFotoDataUrl || item.fotoDataUrl;
    setOpenMenuItemId(null);
    setEditingStagedFileId(null);
    setEditingExistingItem(item);
    setStudioRawUrl(rawUrl);
    setStudioNamaFile(item.namaFile || 'dokumentasi.png');
    setStudioMimeType(item.mimeType || 'image/png');
    setRotationAngle(item.rotationAngle || 0);
    setZoomLevel(1);
    setScanFilter(item.scanFilter || 'magic');
    setFlipH(false);
    setFlipV(false);
    setBrightness(0);
    setContrast(0);
    setClarity(0);
    setPanShiftY(0);
    setPanShiftX(0);
    setActiveToolTab('crop');

    // Auto-calculate exact 16:9 landscape crop
    const img = new Image();
    img.onload = () => {
      setCropBox(
        calculate16to9CropBox(img.naturalWidth || img.width, img.naturalHeight || img.height)
      );
    };
    img.src = rawUrl;

    setShowScanStudio(true);
  };

  const handleBatchCropAllStagedTo16to9 = async () => {
    if (stagedFiles.length === 0) return;
    setIsBatchSaving(true);
    try {
      const updated = await Promise.all(
        stagedFiles.map(async (file) => {
          if (file.jenisBerkas === 'Dokumen Pendukung (PDF/Berkas)' || !file.dataUrl.startsWith('data:image/')) {
            return file;
          }
          const raw = file.originalDataUrl || file.dataUrl;
          const cropped = await cropImageTo16to9Landscape(raw, file.mimeType);
          return {
            ...file,
            dataUrl: cropped,
            cropPercent: 4,
          };
        })
      );
      setStagedFiles(updated);
      triggerToast('Semua foto berhasil disesuaikan ke rasio 16:9 lanskap');
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleRotateItemQuick = async (item: DokumentasiPerjalananItem) => {
    setRotatingItemId(item.id);
    try {
      const nextAngle = getNextRotationAngle(item.rotationAngle || 0);
      const rotated = await renderCamScannerOutputCanvas({
        sourceDataUrl: item.fotoDataUrl,
        cropBox: { top: 0, left: 0, right: 0, bottom: 0 },
        rotationAngle: 90,
        zoomLevel: 1,
        flipH: false,
        flipV: false,
        scanFilter: 'original',
        brightness: 0,
        contrast: 0,
        clarity: 0,
        mimeType: item.mimeType,
      });

      const updated: DokumentasiPerjalananItem = {
        ...item,
        fotoDataUrl: rotated ? rotated.processedDataUrl : item.fotoDataUrl,
        rotationAngle: nextAngle,
      };
      onUpdateItem?.(updated);
      triggerToast('Orientasi foto diputar 90°');
    } finally {
      setRotatingItemId(null);
      setOpenMenuItemId(null);
    }
  };

  const handleSaveStudioEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingStudio(true);
    try {
      const processed = await renderCamScannerOutputCanvas({
        sourceDataUrl: studioRawUrl,
        cropBox,
        rotationAngle,
        zoomLevel,
        flipH,
        flipV,
        scanFilter,
        brightness,
        contrast,
        clarity,
        mimeType: studioMimeType,
      });

      const finalUrl = processed ? processed.processedDataUrl : studioRawUrl;
      const avgCrop = Math.round((cropBox.top + cropBox.left + cropBox.right + cropBox.bottom) / 4);

      if (editingStagedFileId) {
        setStagedFiles((prev) =>
          prev.map((f) =>
            f.id === editingStagedFileId
              ? {
                  ...f,
                  dataUrl: finalUrl,
                  originalDataUrl: studioRawUrl,
                  rotationAngle,
                  zoomLevel,
                  scanFilter,
                  cropPercent: avgCrop,
                }
              : f
          )
        );
        setShowScanStudio(false);
        triggerToast('Penyuntingan foto berhasil diterapkan');
      } else if (editingExistingItem && onUpdateItem) {
        onUpdateItem({
          ...editingExistingItem,
          fotoDataUrl: finalUrl,
          originalFotoDataUrl: studioRawUrl,
          scanFilter,
          cropPercent: avgCrop,
          rotationAngle: 0,
        });
        setShowScanStudio(false);
        setEditingExistingItem(null);
        triggerToast('Perubahan dokumentasi berhasil disimpan');
      }
    } finally {
      setIsProcessingStudio(false);
    }
  };

  const handleRunSmartCrop = async () => {
    const img = new Image();
    img.onload = () => {
      const box = calculate16to9CropBox(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        0
      );
      setCropBox(box);
      setZoomLevel(1);
      triggerToast('Crop rasio 16:9 landscape presisi diterapkan');
    };
    img.src = studioRawUrl;
  };

  const handleRetrySync = async (item: DokumentasiPerjalananItem) => {
    setOpenMenuItemId(null);
    if (!onRetrySyncItem) {
      onOpenSyncModal();
      return;
    }
    setRetryingItemId(item.id);
    try {
      await onRetrySyncItem(item);
      triggerToast('Sinkronisasi berkas dokumentasi diproses');
    } finally {
      setRetryingItemId(null);
    }
  };

  React.useEffect(() => {
    setSelectedKuitansiId(activeKuitansi.id);
    setLokasiKegiatan(activeKuitansi.tujuan || '');
  }, [activeKuitansi.id, activeKuitansi.tujuan]);

  const handleOpenUploadForm = () => {
    setSelectedKuitansiId(activeKuitansi.id);
    setLokasiKegiatan(activeKuitansi.tujuan || '');
    setJudulKegiatan('');
    setKeterangan('');
    setJenisBerkas('Foto Kegiatan');
    setFormError(null);
    setShowAddForm(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray: File[] = Array.from(fileList);
    const readFileAsDataUrl = (file: File): Promise<StagedDocFile> =>
      new Promise((resolve) => {
        const isPdfOrDoc =
          file.type === 'application/pdf' ||
          /\.(pdf|doc|docx|xls|xlsx)$/i.test(file.name);
        const detectedJenis: StagedDocFile['jenisBerkas'] = isPdfOrDoc
          ? 'Dokumen Pendukung (PDF/Berkas)'
          : jenisBerkas;

        const reader = new FileReader();
        reader.onload = async () => {
          const res = typeof reader.result === 'string' ? reader.result : SAMPLE_DOC_PHOTO_1;
          let finalDataUrl = res;
          if (!isPdfOrDoc && autoCrop16to9 && res.startsWith('data:image/')) {
            try {
              finalDataUrl = await cropImageTo16to9Landscape(res, file.type || 'image/png');
            } catch {
              finalDataUrl = res;
            }
          }
          resolve({
            id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dataUrl: finalDataUrl,
            originalDataUrl: res,
            namaFile: file.name,
            mimeType: file.type || 'image/png',
            jenisBerkas: detectedJenis,
            rotationAngle: 0,
            zoomLevel: 1,
            scanFilter: 'magic',
            cropPercent: 4,
          });
        };
        reader.onerror = () => {
          resolve({
            id: `staged-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            dataUrl: isPdfOrDoc ? SAMPLE_SPT_DOC : SAMPLE_DOC_PHOTO_1,
            originalDataUrl: isPdfOrDoc ? SAMPLE_SPT_DOC : SAMPLE_DOC_PHOTO_1,
            namaFile: file.name,
            mimeType: file.type || 'image/png',
            jenisBerkas: detectedJenis,
            rotationAngle: 0,
            zoomLevel: 1,
            scanFilter: 'original',
            cropPercent: 0,
          });
        };
        reader.readAsDataURL(file);
      });

    const newlyStaged = await Promise.all(filesArray.map(readFileAsDataUrl));
    if (newlyStaged.some((f) => f.jenisBerkas === 'Dokumen Pendukung (PDF/Berkas)')) {
      setJenisBerkas('Dokumen Pendukung (PDF/Berkas)');
    }
    setStagedFiles((prev) => [...prev, ...newlyStaged]);
    if (autoCrop16to9 && filesArray.some((f) => !f.type.includes('pdf'))) {
      triggerToast('Foto otomatis disesuaikan ke rasio 16:9 lanskap');
    }
    e.target.value = '';
  };

  const handleRemoveStagedFile = (stagedId: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== stagedId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsBatchSaving(true);

    try {
      const linkedKuitansi =
        kuitansiList.find((k) => k.id === selectedKuitansiId) || activeKuitansi;

      const cleanLokasi = lokasiKegiatan.trim() || linkedKuitansi.tujuan || '-';
      const baseIndex = items.length;
      const nowMs = Date.now();

      const filesToProcess: StagedDocFile[] =
        stagedFiles.length > 0
          ? stagedFiles
          : [
              {
                id: `staged-default-${nowMs}`,
                dataUrl:
                  jenisBerkas === 'Dokumen Pendukung (PDF/Berkas)'
                    ? SAMPLE_SPT_DOC
                    : SAMPLE_DOC_PHOTO_1,
                originalDataUrl:
                  jenisBerkas === 'Dokumen Pendukung (PDF/Berkas)'
                    ? SAMPLE_SPT_DOC
                    : SAMPLE_DOC_PHOTO_1,
                namaFile:
                  jenisBerkas === 'Dokumen Pendukung (PDF/Berkas)'
                    ? `dokumen_pendukung_${nowMs}.pdf`
                    : `dokumentasi_${nowMs}.png`,
                mimeType:
                  jenisBerkas === 'Dokumen Pendukung (PDF/Berkas)'
                    ? 'application/pdf'
                    : 'image/png',
                jenisBerkas,
                rotationAngle: 0,
                zoomLevel: 1,
                scanFilter: 'magic',
                cropPercent: 4,
              },
            ];

      const batchItems: DokumentasiPerjalananItem[] = filesToProcess.map(
        (staged, idx) => {
          const seqNumber = baseIndex + idx + 1;
          const resolvedJenis = staged.jenisBerkas || jenisBerkas;
          const entryTitle = generateSmartBatchDocTitle({
            customTitle: judulKegiatan,
            sequenceNumber: seqNumber,
            batchSize: filesToProcess.length,
            jenisBerkas: resolvedJenis,
          });

          return {
            id: `doc-keg-${nowMs}-${idx + 1}`,
            kuitansiId: linkedKuitansi.id,
            noSpt: linkedKuitansi.noSpt,
            jenisBerkas: resolvedJenis,
            mimeType: staged.mimeType,
            judulKegiatan: entryTitle,
            tanggalKegiatan,
            waktuKegiatan: waktuKegiatan.trim() || '09:00 WITA',
            lokasiKegiatan: cleanLokasi,
            keterangan:
              keterangan.trim() ||
              `Dokumentasi ${entryTitle} pelaksanaan perjalanan dinas ke ${cleanLokasi} sesuai SPT ${linkedKuitansi.noSpt}.`,
            pelaksana: linkedKuitansi.atasNama,
            fotoDataUrl: staged.dataUrl,
            originalFotoDataUrl: staged.originalDataUrl || staged.dataUrl,
            rotationAngle: staged.rotationAngle || 0,
            scanFilter: staged.scanFilter || 'magic',
            cropPercent: staged.cropPercent || 4,
            namaFile: staged.namaFile,
            statusSync: 'Lokal',
            createdAt: new Date(nowMs + idx).toISOString(),
          };
        }
      );

      await Promise.all(
        batchItems.map((item) =>
          onAddItem(item, isGoogleConnected && uploadToDriveNow)
        )
      );

      setJudulKegiatan('');
      setKeterangan('');
      setStagedFiles([]);
      setShowAddForm(false);
      triggerToast(`${batchItems.length} berkas dokumentasi berhasil disimpan`);
    } finally {
      setIsBatchSaving(false);
    }
  };

  const confirmAndDelete = async () => {
    if (!confirmDeleteTarget) return;
    await onDeleteItem(confirmDeleteTarget);
    setConfirmDeleteTarget(null);
    triggerToast('Berkas dokumentasi dihapus');
  };

  const liveCssFilter = buildCombinedScanCssFilter(
    scanFilter,
    brightness,
    contrast,
    clarity
  );

  // Optimal Grid calculation using useOptimalGrid hook
  const { optimalGridMode, itemsPerPageCount } = useOptimalGrid(
    items.length,
    printGridMode,
    isAutoGrid
  );

  const paginatedPages = React.useMemo(() => {
    if (items.length === 0) return [[] as DokumentasiPerjalananItem[]];
    const chunks: DokumentasiPerjalananItem[][] = [];
    for (let i = 0; i < items.length; i += itemsPerPageCount) {
      chunks.push(items.slice(i, i + itemsPerPageCount));
    }
    return chunks;
  }, [items, itemsPerPageCount]);

  return (
    <div
      className="space-y-3 sm:space-y-4 relative"
      ref={actionMenuContainerRef}
    >
      {/* Toast Feedback */}
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

      {/* Header Bar */}
      <div className="no-print flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3 bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
        <LabeledIcon
          size="sm"
          icon={Camera}
          iconBgClass="bg-emerald-700 text-white"
          label="2. Dokumentasi & Berkas SPJ"
          tooltipVariant="info"
          tooltipTitle="Tentang Dokumentasi SPJ & Penyunting Gambar"
          tooltipContent="Unggah foto kegiatan lapangan, gunakan pemotong & penyunting gambar (Zoom In/Out, Smart Crop, Preset Rasio, Filter), dan cetak besar (95% area kertas) dengan pilihan grid 1x1 hingga 2x4."
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Galeri &amp; Berkas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('printSheet')}
              className={`min-h-[32px] sm:min-h-[34px] px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap transition-colors cursor-pointer ${
                viewMode === 'printSheet'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>Lembar Cetak (90%)</span>
            </button>
          </div>

          {items.length > 0 && !showAddForm && (
            <button
              type="button"
              onClick={handleOpenUploadForm}
              className="w-full sm:w-auto min-h-[34px] sm:min-h-[36px] px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Unggah Foto / Dokumen</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 1. PROFESSIONAL IMAGE EDITING & CROPPING SUITE MODAL (NO MARKUP TOOLS) */}
      {/* ===================================================================== */}
      {showScanStudio && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-editor-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowScanStudio(false);
          }}
        >
          <form
            onSubmit={handleSaveStudioEdit}
            className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-3xl border border-slate-200 shadow-2xl max-h-[94vh] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 sm:px-5 py-2.5 border-b border-slate-200 bg-white shrink-0">
              <div className="w-11 h-1.5 rounded-full bg-slate-300 mx-auto mb-2 sm:hidden" />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Crop className="w-4 h-4" />
                  </div>
                  <h2
                    id="image-editor-title"
                    className="text-xs sm:text-sm font-extrabold text-slate-900 truncate"
                  >
                    Penyunting & Pemotong Gambar (Image Cropping & Editing Suite): {studioNamaFile}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScanStudio(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Canvas Stage & Tools */}
            <div className="p-3 sm:p-4 overflow-y-auto no-scrollbar overscroll-contain space-y-2.5 flex-1 bg-slate-100">
              {/* Zoom Controls Toolbar Bar */}
              <div className="flex items-center justify-between bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Zoom Tampilan:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.max(1, prev - 0.25))}
                    title="Perkecil (Zoom Out)"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-extrabold text-sky-800 w-12 text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((prev) => Math.min(3, prev + 0.25))}
                    title="Perbesar (Zoom In)"
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center justify-center cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  {zoomLevel !== 1 && (
                    <button
                      type="button"
                      onClick={() => setZoomLevel(1)}
                      className="px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold text-[11px] cursor-pointer"
                    >
                      Reset 100%
                    </button>
                  )}
                </div>
              </div>

              <div className="relative w-full h-56 sm:h-72 rounded-2xl bg-slate-200/80 border border-slate-300/90 flex items-center justify-center overflow-hidden p-4 select-none">
                <div
                  ref={stageBoundsRef}
                  className="relative inline-flex items-center justify-center bg-white shadow-lg rounded-lg"
                >
                  <div className="relative overflow-hidden rounded-lg flex items-center justify-center">
                    <img
                      src={studioRawUrl}
                      alt={studioNamaFile}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      style={{
                        filter: liveCssFilter,
                        transform: `rotate(${rotationAngle}deg) scale(${zoomLevel}) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                      }}
                      className="max-h-48 sm:max-h-64 w-auto object-contain transition-transform pointer-events-none"
                    />

                    {/* Crop Overlay */}
                    {activeToolTab === 'crop' && (
                      <div
                        className="pointer-events-none absolute border-2 border-sky-500 shadow-[0_0_0_9999px_rgba(15,23,42,0.38)]"
                        style={{
                          top: `${cropBox.top}%`,
                          left: `${cropBox.left}%`,
                          right: `${cropBox.right}%`,
                          bottom: `${cropBox.bottom}%`,
                        }}
                      >
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-sky-700/90 text-white text-[9px] font-extrabold tracking-wider uppercase">
                          16:9 Lanskap
                        </div>
                        <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                          <div className="border-r border-b border-sky-400/40" />
                          <div className="border-r border-b border-sky-400/40" />
                          <div className="border-b border-sky-400/40" />
                          <div className="border-r border-b border-sky-400/40" />
                          <div className="border-r border-b border-sky-400/40" />
                          <div className="border-b border-sky-400/40" />
                          <div className="border-r border-sky-400/40" />
                          <div className="border-r border-sky-400/40" />
                          <div />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Crop Handles */}
                  {activeToolTab === 'crop' &&
                    (
                      [
                        { id: 'tl', style: { top: `${cropBox.top}%`, left: `${cropBox.left}%` } },
                        { id: 'tr', style: { top: `${cropBox.top}%`, right: `${cropBox.right}%` } },
                        { id: 'bl', style: { bottom: `${cropBox.bottom}%`, left: `${cropBox.left}%` } },
                        { id: 'br', style: { bottom: `${cropBox.bottom}%`, right: `${cropBox.right}%` } },
                      ] as const
                    ).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        aria-label={`Crop ${h.id}`}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingHandle(h.id);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          setDraggingHandle(h.id);
                        }}
                        style={h.style}
                        className={`absolute w-5 h-5 rounded-full bg-sky-600 border-2 border-white shadow-md cursor-grab z-20 ${
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
                </div>
              </div>

              {/* Tool Navigation Bar (No Markup Tab) */}
              <div className="flex items-center justify-center gap-1 sm:gap-2 p-1.5 bg-white rounded-2xl border border-slate-200">
                {(
                  [
                    { id: 'crop', label: 'Crop & Rotasi', icon: Crop },
                    { id: 'filter', label: 'Filter Scan', icon: Sparkles },
                    { id: 'adjust', label: 'Cerah/Kontras', icon: SlidersHorizontal },
                  ] as const
                ).map((t) => {
                  const IconComp = t.icon;
                  const isActive = activeToolTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveToolTab(t.id)}
                      className={`min-h-[36px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-sky-700 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tool Panels */}
              <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 space-y-3">
                {activeToolTab === 'crop' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-bold shadow-xs">
                          <Check className="w-3.5 h-3.5" />
                          <span>Rasio 16:9 Lanskap (Grid Cetak)</span>
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                          Format baku untuk seluruh kotak grid dokumentasi
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleRunSmartCrop}
                        className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        <span>Reset ke 16:9 Presisi</span>
                      </button>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-700">
                          Preset Posisi Framing 16:9 Lanskap:
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => apply16to9Crop(-10, 0)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            Fokus Atas
                          </button>
                          <button
                            type="button"
                            onClick={() => apply16to9Crop(0, 0)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            Tengah
                          </button>
                          <button
                            type="button"
                            onClick={() => apply16to9Crop(10, 0)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            Fokus Bawah
                          </button>
                          <button
                            type="button"
                            onClick={() => apply16to9Crop(0, -10)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            Fokus Kiri
                          </button>
                          <button
                            type="button"
                            onClick={() => apply16to9Crop(0, 10)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                          >
                            Fokus Kanan
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                            <span>Geser Framing Vertikal (Atas ↔ Bawah)</span>
                            <span className="font-mono text-sky-700 font-bold">{panShiftY > 0 ? `+${panShiftY}%` : `${panShiftY}%`}</span>
                          </div>
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            value={panShiftY}
                            onChange={(e) => apply16to9Crop(Number(e.target.value), panShiftX)}
                            className="w-full accent-sky-700 cursor-pointer"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                            <span>Geser Framing Horizontal (Kiri ↔ Kanan)</span>
                            <span className="font-mono text-sky-700 font-bold">{panShiftX > 0 ? `+${panShiftX}%` : `${panShiftX}%`}</span>
                          </div>
                          <input
                            type="range"
                            min="-20"
                            max="20"
                            value={panShiftX}
                            onChange={(e) => apply16to9Crop(panShiftY, Number(e.target.value))}
                            className="w-full accent-sky-700 cursor-pointer"
                          />
                        </div>
                      </div>
                      <p className="text-[10.5px] text-slate-500 italic">
                        * Menggeser posisi bingkai tanpa merusak proporsi rasio 16:9 lanskap.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRotationAngle((prev) => ((prev - 90) % 360 + 360) % 360)}
                          className="min-h-[34px] px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-sky-700" />
                          <span>Putar Kiri 90°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRotationAngle((prev) => getNextRotationAngle(prev))}
                          className="min-h-[34px] px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5 text-sky-700" />
                          <span>Putar Kanan 90°</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setFlipH(!flipH)}
                          className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            flipH ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          Flip Horiz
                        </button>
                        <button
                          type="button"
                          onClick={() => setFlipV(!flipV)}
                          className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                            flipV ? 'bg-sky-50 border-sky-300 text-sky-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          Flip Vert
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeToolTab === 'filter' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CAMSCANNER_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setScanFilter(f.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          scanFilter === f.id
                            ? 'bg-sky-50 border-sky-600 text-sky-900 font-bold shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="text-xs font-bold">{f.label}</div>
                      </button>
                    ))}
                  </div>
                )}

                {activeToolTab === 'adjust' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Kecerahan</span>
                        <span>{brightness}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="w-full accent-sky-700"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Kontras</span>
                        <span>{contrast}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={contrast}
                        onChange={(e) => setContrast(Number(e.target.value))}
                        className="w-full accent-sky-700"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>Kejenuhan / Clarity</span>
                        <span>{clarity}</span>
                      </div>
                      <input
                        type="range"
                        min="-50"
                        max="50"
                        value={clarity}
                        onChange={(e) => setClarity(Number(e.target.value))}
                        className="w-full accent-sky-700"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowScanStudio(false)}
                className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isProcessingStudio}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isProcessingStudio ? 'Memproses...' : 'Terapkan & Simpan Foto'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. UPLOAD MULTI-FILE FORM MODAL */}
      {/* ===================================================================== */}
      {showAddForm && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-doc-sheet-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddForm(false);
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="px-5 sm:px-6 pt-3.5 pb-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
              <div className="w-11 h-1.5 rounded-full bg-slate-300 mx-auto mb-2.5 sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2
                    id="add-doc-sheet-title"
                    className="text-sm sm:text-base font-bold text-slate-900"
                  >
                    Unggah Foto Kegiatan atau Dokumen Pendukung
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih banyak foto sekaligus — otomatis diberi nama berurutan (Foto Kegiatan #1, #2, dst.)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-9 h-9 rounded-xl bg-slate-200/70 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto no-scrollbar overscroll-contain space-y-5 flex-1">
              {formError && (
                <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="doc-judul" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Judul Kegiatan / Nama Dokumen (Opsional — Otomatis)
                    </label>
                    <input
                      id="doc-judul"
                      type="text"
                      placeholder="Kosongkan untuk otomatis: Foto Kegiatan #1, #2, dst."
                      value={judulKegiatan}
                      onChange={(e) => setJudulKegiatan(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="doc-tanggal" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Tanggal Kegiatan
                      </label>
                      <input
                        id="doc-tanggal"
                        type="date"
                        value={tanggalKegiatan}
                        onChange={(e) => setTanggalKegiatan(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label htmlFor="doc-waktu" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Waktu (WITA)
                      </label>
                      <input
                        id="doc-waktu"
                        type="text"
                        value={waktuKegiatan}
                        onChange={(e) => setWaktuKegiatan(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="doc-lokasi" className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Lokasi / Satuan Pendidikan Tujuan *
                    </label>
                    <input
                      id="doc-lokasi"
                      type="text"
                      placeholder="Otomatis terisi sesuai tujuan SPT/SPJ aktif..."
                      value={lokasiKegiatan}
                      onChange={(e) => setLokasiKegiatan(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="doc-file-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Pilih Banyak Foto Sekaligus (Multiple)
                      </label>
                      <label
                        htmlFor="doc-file-input"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-sky-600 rounded-2xl p-5 bg-slate-50 cursor-pointer transition-colors min-h-[136px]"
                      >
                        <Camera className="w-7 h-7 text-sky-600 mb-1.5" />
                        <span className="text-xs font-bold text-slate-800 text-center">
                          {stagedFiles.length > 0
                            ? `${stagedFiles.length} Berkas Dipilih · Ketuk untuk Tambah Foto Lagi`
                            : 'Ketuk untuk Pilih Beberapa Foto Sekaligus / Dokumen'}
                        </span>
                        <span className="text-[11px] text-slate-500 mt-0.5 text-center">
                          Bisa pilih banyak foto dari galeri (JPG, PNG, PDF)
                        </span>
                        <input
                          id="doc-file-input"
                          type="file"
                          multiple
                          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                          onChange={handleFileChange}
                          className="sr-only"
                        />
                      </label>
                      <div className="pt-2 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoCrop16to9}
                            onChange={(e) => setAutoCrop16to9(e.target.checked)}
                            className="rounded border-slate-300 text-sky-700 focus:ring-sky-600 w-4 h-4 cursor-pointer"
                          />
                          <span className="flex items-center gap-1.5">
                            <span>Otomatis crop rasio <strong>16:9 Lanskap</strong> saat foto dipilih</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                              Grid Ready
                            </span>
                          </span>
                        </label>
                      </div>
                    </div>

                    {stagedFiles.length > 0 && (
                      <div className="space-y-2">
                        {/* 16:9 Batch Processing Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-sky-50 border border-sky-200 rounded-xl">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-sky-600 animate-pulse" />
                            <span className="text-xs font-bold text-sky-900">
                              Format Foto 16:9 Lanskap (Sesuai Grid Cetak)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleBatchCropAllStagedTo16to9}
                            className="px-3 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                          >
                            <Crop className="w-3.5 h-3.5" />
                            <span>Sesuaikan Semua Foto ke 16:9</span>
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span>Pratinjau ({stagedFiles.length} berkas) — Klik foto untuk sesuaikan crop/posisi 16:9:</span>
                          <button
                            type="button"
                            onClick={() => setStagedFiles([])}
                            className="text-red-600 hover:underline font-medium cursor-pointer"
                          >
                            Hapus Semua
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-52 overflow-y-auto p-1">
                          {stagedFiles.map((file, idx) => {
                            const isImage = file.mimeType.startsWith('image/');
                            return (
                              <div
                                key={file.id}
                                className="relative group rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-2xs"
                              >
                                <div
                                  onClick={() => isImage && handleOpenStudioForStaged(file)}
                                  className="aspect-16/9 w-full bg-slate-100 flex items-center justify-center overflow-hidden cursor-pointer"
                                  title="Klik untuk buka pemotong & penyunting 16:9 gambar"
                                >
                                  {isImage ? (
                                    <img
                                      src={file.dataUrl}
                                      alt={file.namaFile}
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <FileText className="w-7 h-7 text-sky-700" />
                                  )}
                                </div>
                                <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[9px] font-bold flex items-center gap-1 pointer-events-none">
                                  <span>16:9</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => isImage && handleOpenStudioForStaged(file)}
                                  className="absolute bottom-1 left-1 right-1 px-1 py-0.5 rounded-md bg-sky-700/90 hover:bg-sky-800 text-white text-[9.5px] font-bold truncate flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Crop className="w-2.5 h-2.5" />
                                  <span>#{idx + 1} Crop 16:9</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStagedFile(file.id)}
                                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/85 hover:bg-red-600 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {isGoogleConnected && (
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={uploadToDriveNow}
                        onChange={(e) => setUploadToDriveNow(e.target.checked)}
                        className="rounded border-slate-300 text-sky-700 focus:ring-sky-600 w-4 h-4"
                      />
                      <span>
                        Langsung unggah ke <strong>Google Drive</strong> &amp; catat di <strong>Google Sheets</strong>
                      </span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploading || isBatchSaving}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>
                  {isUploading || isBatchSaving
                    ? 'Memproses...'
                    : stagedFiles.length > 1
                      ? `Simpan ${stagedFiles.length} Berkas & Tautkan`
                      : 'Simpan & Tautkan ke SPJ'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. VIEW MODE 1: GALLERY CARDS WITH EDIT & CROP BUTTON */}
      {/* ===================================================================== */}
      {!showAddForm &&
        (viewMode === 'cards' ? (
          items.length === 0 ? (
            <EmptyStateCard
              variant="dokumentasi"
              title="Belum Ada Dokumentasi untuk Entri SPJ Ini"
              description="Unggah foto kegiatan lapangan atau dokumen pendukung (SPT, SPPD, Undangan) untuk ditautkan ke SPJ ini."
              ctaLabel="Unggah Dokumentasi Pertama"
              onCtaClick={handleOpenUploadForm}
              secondaryHint={`${activeKuitansi.tujuan} · ${activeKuitansi.atasNama}`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {items.map((item, idx) => {
                const orientation = imageOrientations[item.id] || 'landscape';
                const isMenuOpen = openMenuItemId === item.id;
                const isRotatingThis = rotatingItemId === item.id;
                const isRetryingThis = retryingItemId === item.id;
                const isSynced = item.statusSync === 'Tersimpan di Drive & Sheets';
                const isFailed = item.statusSync === 'Gagal Sinkronisasi';

                return (
                  <article
                    key={item.id}
                    className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
                  >
                    <div>
                      <div className="aspect-16/10 bg-slate-100 relative overflow-hidden border-b border-slate-100 flex items-center justify-center p-2">
                        <img
                          src={item.fotoDataUrl}
                          alt={item.judulKegiatan || `Foto Kegiatan #${idx + 1}`}
                          referrerPolicy="no-referrer"
                          onLoad={(e) => handleDetectImageOrientation(item.id, e)}
                          className="max-w-full max-h-full w-auto h-auto object-contain mx-auto rounded-lg shadow-xs"
                        />

                        {/* Editor Button on Card */}
                        <button
                          type="button"
                          onClick={() => handleOpenStudioForGallery(item)}
                          className="absolute bottom-2.5 right-2.5 min-h-[34px] px-3 py-1 rounded-xl bg-sky-700 hover:bg-sky-800 text-white shadow-sm text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Crop className="w-3.5 h-3.5" />
                          <span>Edit &amp; Crop</span>
                        </button>
                      </div>

                      <div className="p-4 sm:p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <p className="text-[11px] text-slate-500 truncate">
                              Foto Kegiatan #{idx + 1} · {item.tanggalKegiatan} ({item.waktuKegiatan})
                            </p>
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
                              {item.judulKegiatan || `Foto Kegiatan #${idx + 1}`}
                            </h3>
                          </div>

                          <div className="relative" data-doc-action-menu>
                            <button
                              type="button"
                              onClick={() => setOpenMenuItemId(isMenuOpen ? null : item.id)}
                              aria-label={`Menu tindakan untuk ${item.judulKegiatan}`}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 top-9 w-52 rounded-2xl bg-white border border-slate-200 shadow-xl py-1.5 z-30">
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudioForGallery(item)}
                                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-sky-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Crop className="w-3.5 h-3.5 text-sky-700" />
                                  <span>Edit &amp; Crop Gambar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRotateItemQuick(item)}
                                  disabled={isRotatingThis}
                                  className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-800 hover:bg-sky-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <RotateCw className="w-3.5 h-3.5 text-sky-700" />
                                  <span>{isRotatingThis ? 'Memutar...' : 'Putar 90°'}</span>
                                </button>
                                <div className="h-px bg-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuItemId(null);
                                    setConfirmDeleteTarget(item);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Hapus Berkas</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                            <span className="font-semibold text-slate-800 truncate">{item.lokasiKegiatan}</span>
                          </div>
                          <p className="text-slate-500 leading-relaxed line-clamp-2">{item.keterangan}</p>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 sm:px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isSynced ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700">
                            <HardDrive className="w-3.5 h-3.5" />
                            <span>Tersimpan di Drive</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Gagal Sinkronisasi</span>
                          </span>
                        ) : (
                          <span className="text-slate-500">Tersimpan Lokal</span>
                        )}
                      </div>

                      {isFailed && (
                        <button
                          type="button"
                          onClick={() => handleRetrySync(item)}
                          disabled={isRetryingThis}
                          className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isRetryingThis ? 'animate-spin' : ''}`} />
                          <span>{isRetryingThis ? 'Mengirim...' : 'Coba Lagi'}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )
        ) : (
          /* ===================================================================== */
          /* VIEW MODE 2: PRINT SHEET WITH 90% PAPER USAGE & LARGE GRID (1x1..2x4)  */
          /* ===================================================================== */
          <div className="space-y-4">
            <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-3">
                {/* Paper Size Quick Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700">Kertas:</span>
                  <div
                    role="group"
                    aria-label="Pilih format kertas cetak"
                    className="inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200"
                  >
                    <button
                      type="button"
                      onClick={() => onChangePaperSize('A4')}
                      title="Kertas A4 (210 × 297 mm) — Rasio Standar 1 : 1.414"
                      className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
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
                      className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        paperSize === 'F4'
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>F4 Folio</span>
                      <span className="text-[10px] opacity-80 font-mono hidden sm:inline">(215×330)</span>
                    </button>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-5 bg-slate-200" aria-hidden="true" />

                {/* Grid Mode Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">Grid (90% Area):</span>
                  <select
                    value={printGridMode}
                    onChange={(e) => {
                      setIsAutoGrid(false);
                      setPrintGridMode(e.target.value as PrintGridMode);
                    }}
                    className="min-h-[34px] rounded-xl border border-slate-300 bg-white px-3 py-1 text-xs font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="1x1">Grid 1 x 1 (1 Foto Lanskap 16:9)</option>
                    <option value="1x2">Grid 1 x 2 (2 Foto Lanskap 16:9)</option>
                    <option value="1x3">Grid 1 x 3 (3 Foto Lanskap 16:9)</option>
                    <option value="1x4">Grid 1 x 4 (4 Foto Lanskap 16:9)</option>
                    <option value="2x2">Grid 2 x 2 (4 Foto Lanskap 16:9)</option>
                    <option value="2x3">Grid 2 x 3 (6 Foto Lanskap 16:9)</option>
                    <option value="2x4">Grid 2 x 4 (8 Foto Lanskap 16:9)</option>
                  </select>
                  {isAutoGrid ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase">
                      Auto ({items.length} Foto)
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAutoGrid(true)}
                      className="text-[11px] font-bold text-sky-700 hover:underline cursor-pointer"
                    >
                      Kembali ke Auto
                    </button>
                  )}
                </div>

                {/* Ratio Tag Badge */}
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-[11px] font-bold">
                  <span className={`w-2 h-2 rounded-full ${paperSize === 'F4' ? 'bg-amber-500' : 'bg-sky-500'}`} />
                  {paperSize === 'F4' ? 'Rasio F4: 1 : 1.535 (+33mm Folio)' : 'Rasio A4: 1 : 1.414 (Standar)'}
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  void triggerIsolatedSpjPrint({
                    paperSize,
                    documentTitle: buildCleanPdfTitle({
                      prefix: 'Dokumentasi_Perjalanan_Dinas',
                      atasNama: activeKuitansi.atasNama,
                      noSpt: activeKuitansi.noSpt,
                      paperSize,
                    }),
                    sheetSelector: '.print-only-sheet',
                    zeroPageMargin: true,
                  });
                }}
                className="min-h-[36px] px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Lembar Dokumentasi ({paperSize})</span>
              </button>
            </div>

            <div className="space-y-6">
              {paginatedPages.map((pageItems, pageIdx) => {
                const gridDim = calculateDocumentationGridDimensions(paperSize, optimalGridMode);
                const isLastDocPage = pageIdx === paginatedPages.length - 1;

                return (
                  <div
                    key={`page-${pageIdx}`}
                    className={`documentation-print-sheet ${
                      isLastDocPage ? 'spj-last-printable-wrapper' : 'spj-page-break-after'
                    }`}
                  >
                    {/* Dynamic Precise @media print styles enforcing 90% physical printable area without trailing blank page */}
                    <style>{`
                      @media print {
                        @page {
                          size: ${gridDim.paperSpec.cssPageSize};
                          margin: 0;
                        }
                        .documentation-print-sheet {
                          width: 100% !important;
                          max-width: 100% !important;
                          height: auto !important;
                          min-height: 0 !important;
                          max-height: none !important;
                          margin: 0 auto !important;
                          padding: 0 !important;
                          box-sizing: border-box !important;
                          display: flex !important;
                          flex-direction: column !important;
                          justify-content: center !important;
                          align-items: center !important;
                        }
                        .documentation-print-area {
                          width: 86% !important;
                          max-width: 86% !important;
                          height: auto !important;
                          max-height: none !important;
                          margin: 0 auto !important;
                          padding: 0 !important;
                          box-sizing: border-box !important;
                          display: flex !important;
                          flex-direction: column !important;
                          justify-content: space-between !important;
                          overflow: visible !important;
                        }
                      }
                    `}</style>

                    <InteractivePaperViewer
                      paperSize={paperSize}
                      onChangePaperSize={onChangePaperSize}
                      documentTitle={`LAMPIRAN DOKUMENTASI PERJALANAN DINAS (HALAMAN ${pageIdx + 1})`}
                      zeroPageMargin={true}
                    >
                      {/* Area Cetak: Maksimal 90% Panjang & Lebar Kertas (Margin aman 5% di setiap sisi) */}
                      <div
                        className="documentation-print-area spj-font-calibri mx-auto my-auto flex flex-col justify-between py-2.5 box-border overflow-hidden"
                        style={{
                          width: `${gridDim.printAreaWidthPx}px`,
                          height: `${gridDim.printAreaHeightPx}px`,
                          maxHeight: `${gridDim.printAreaHeightPx}px`,
                        }}
                      >
                        {pageIdx === 0 && (
                          <div className="text-center pb-2 border-b border-slate-950 space-y-0.5 shrink-0">
                            <h3 className="text-[13.5px] font-bold text-slate-900 uppercase">
                              {activeKuitansi.untukPengeluaran || activeKuitansi.tujuan || 'Perjalanan Dinas'}
                            </h3>
                          </div>
                        )}

                        {/* Symmetrical Grid of 16:9 Landscape Boxes Filling the Cells */}
                        <div
                          className={`grid gap-2.5 sm:gap-3 w-full flex-1 h-full min-h-0 items-center justify-items-center overflow-hidden ${
                            optimalGridMode === '1x1'
                              ? 'grid-cols-1 grid-rows-1'
                              : optimalGridMode === '1x2'
                                ? 'grid-cols-1 grid-rows-2'
                                : optimalGridMode === '1x3'
                                  ? 'grid-cols-1 grid-rows-3'
                                  : optimalGridMode === '1x4'
                                    ? 'grid-cols-1 grid-rows-4'
                                    : optimalGridMode === '2x2'
                                      ? 'grid-cols-2 grid-rows-2'
                                      : optimalGridMode === '2x3'
                                        ? 'grid-cols-2 grid-rows-3'
                                        : 'grid-cols-2 grid-rows-4'
                          }`}
                        >
                          {pageItems.map((item) => (
                            <div
                              key={item.id}
                              className="w-full h-full min-h-0 min-w-0 flex items-center justify-center p-0.5"
                            >
                              <div
                                className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center shadow-2xs"
                                style={{
                                  aspectRatio: '16 / 9',
                                  width: `${gridDim.boxWidthPx}px`,
                                  height: `${gridDim.boxHeightPx}px`,
                                  maxWidth: '100%',
                                  maxHeight: '100%',
                                }}
                              >
                                <img
                                  src={item.fotoDataUrl}
                                  alt="Dokumentasi"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover block"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </InteractivePaperViewer>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

      {/* Confirmation Delete Modal */}
      {confirmDeleteTarget && (
        <div
          className="no-print fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Hapus Berkas Dokumentasi?</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus "{confirmDeleteTarget.judulKegiatan}" dari lampiran SPJ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmAndDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
