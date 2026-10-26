import type { PaperSize } from '../types/spj';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PrintableDossierPagePlan {
  totalScreenPages: number;
  totalPrintablePages: number;
  hasPrintableDokumentasi: boolean;
  hasPrintablePengeluaran: boolean;
  excludedEmptySections: string[];
}

/**
 * Computes the exact page count for screen preview vs PDF export so that
 * empty attachment sections (0 photos / 0 receipts) never produce blank pages in the exported PDF.
 */
export function computePrintableDossierPages(params: {
  docPerjalananCount: number;
  docItemsPerPage: number;
  docPengeluaranCount: number;
  expenseItemsPerPage?: number;
}): PrintableDossierPagePlan {
  const safeDocPerPage = Math.max(1, params.docItemsPerPage || 4);
  const safeExpPerPage = Math.max(1, params.expenseItemsPerPage || 2);

  const hasPrintableDokumentasi = params.docPerjalananCount > 0;
  const hasPrintablePengeluaran = params.docPengeluaranCount > 0;

  const screenDocPages = hasPrintableDokumentasi
    ? Math.ceil(params.docPerjalananCount / safeDocPerPage)
    : 1;
  const screenExpPages = hasPrintablePengeluaran
    ? Math.ceil(params.docPengeluaranCount / safeExpPerPage)
    : 1;

  const printDocPages = hasPrintableDokumentasi
    ? Math.ceil(params.docPerjalananCount / safeDocPerPage)
    : 0;
  const printExpPages = hasPrintablePengeluaran
    ? Math.ceil(params.docPengeluaranCount / safeExpPerPage)
    : 0;

  const excludedEmptySections: string[] = [];
  if (!hasPrintableDokumentasi) {
    excludedEmptySections.push('5. Dokumentasi (0)');
  }
  if (!hasPrintablePengeluaran) {
    excludedEmptySections.push('6. Bukti Bayar (0)');
  }

  return {
    totalScreenPages: 4 + screenDocPages + screenExpPages,
    totalPrintablePages: 4 + printDocPages + printExpPages,
    hasPrintableDokumentasi,
    hasPrintablePengeluaran,
    excludedEmptySections,
  };
}

/**
 * Builds a clean, filesystem-safe PDF document title for mobile & desktop Save-as-PDF dialogs.
 */
export function buildCleanPdfTitle(params: {
  prefix: string;
  atasNama?: string;
  noSpt?: string;
  paperSize?: PaperSize;
}): string {
  const cleanPrefix = (params.prefix || 'SPJ_Perjalanan_Dinas')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const cleanName = (params.atasNama || 'Pelaksana')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 32);

  const cleanSpt = (params.noSpt || 'SPT')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 28);

  const sizeSuffix = params.paperSize ? `_${params.paperSize}` : '';
  return [cleanPrefix, cleanName, cleanSpt].filter(Boolean).join('_') + sizeSuffix;
}

export interface TriggerIsolatedSpjPrintOptions {
  paperSize: PaperSize;
  documentTitle?: string;
  rootElement?: HTMLElement | null;
  sheetSelector?: string;
  zeroPageMargin?: boolean;
  allowEmptyPlaceholderIfSingle?: boolean;
}

const ISOLATED_PORTAL_ID = 'spj-isolated-print-root';

function syncFormValuesToClone(sourceRoot: Element, cloneRoot: Element) {
  const srcInputs = sourceRoot.querySelectorAll('input, textarea, select');
  const cloneInputs = cloneRoot.querySelectorAll('input, textarea, select');
  srcInputs.forEach((srcEl, idx) => {
    const cloneEl = cloneInputs[idx];
    if (!cloneEl) return;
    if (srcEl instanceof HTMLInputElement && cloneEl instanceof HTMLInputElement) {
      cloneEl.value = srcEl.value;
      cloneEl.setAttribute('value', srcEl.value);
      if (srcEl.type === 'checkbox' || srcEl.type === 'radio') {
        cloneEl.checked = srcEl.checked;
      }
    } else if (
      srcEl instanceof HTMLTextAreaElement &&
      cloneEl instanceof HTMLTextAreaElement
    ) {
      cloneEl.value = srcEl.value;
      cloneEl.textContent = srcEl.value;
    } else if (srcEl instanceof HTMLSelectElement && cloneEl instanceof HTMLSelectElement) {
      cloneEl.value = srcEl.value;
    }
  });
}

function cleanClonedSheetForPrint(clonedSheet: HTMLElement) {
  // 1. Remove all screen-only elements and empty placeholder sections so they never appear in PDF
  clonedSheet
    .querySelectorAll(
      '.no-print, .spj-empty-printable-page, [data-empty-page="true"], [data-no-print="true"]'
    )
    .forEach((el) => el.remove());

  // 2. Reset inline scaling and fixed pixel dimensions on the root sheet so it adapts 100% to any PDF paper width
  clonedSheet.style.transform = 'none';
  clonedSheet.style.transformOrigin = 'top left';
  clonedSheet.style.width = '100%';
  clonedSheet.style.maxWidth = '100%';
  clonedSheet.style.height = 'auto';
  clonedSheet.style.minHeight = '0';
  clonedSheet.style.maxHeight = 'none';
  clonedSheet.style.aspectRatio = 'auto';
  clonedSheet.style.boxShadow = 'none';
  clonedSheet.style.border = 'none';
  clonedSheet.style.margin = '0 auto';
  clonedSheet.style.overflow = 'visible';

  // 3. Strip fixed pixel widths/heights on inner sheet containers so nothing is ever clipped horizontally or vertically
  clonedSheet
    .querySelectorAll<HTMLElement>(
      '.print-only-sheet, .spj-dossier-sheet, .kuitansi-sheet-container, .spt-doc, .spd-doc, .documentation-print-area'
    )
    .forEach((inner) => {
      inner.style.transform = 'none';
      inner.style.width = '100%';
      inner.style.maxWidth = '100%';
      inner.style.height = 'auto';
      inner.style.minHeight = '0';
      inner.style.maxHeight = 'none';
      inner.style.aspectRatio = 'auto';
      inner.style.boxShadow = 'none';
      inner.style.border = 'none';
      inner.style.overflow = 'visible';
    });

  // 4. Also sanitize any descendant with large hardcoded pixel widths (> 450px) or heights (> 600px)
  clonedSheet.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    const w = el.style.width;
    if (w && w.endsWith('px')) {
      const pxVal = parseFloat(w);
      if (!Number.isNaN(pxVal) && pxVal >= 450) {
        el.style.width = '100%';
        el.style.maxWidth = '100%';
      }
    }
    const minH = el.style.minHeight;
    if (minH && minH.endsWith('px')) {
      const pxVal = parseFloat(minH);
      if (!Number.isNaN(pxVal) && pxVal >= 400) {
        el.style.minHeight = '0';
      }
    }
    const h = el.style.height;
    if (h && h.endsWith('px')) {
      const pxVal = parseFloat(h);
      if (!Number.isNaN(pxVal) && pxVal >= 600) {
        el.style.height = 'auto';
      }
    }
    const maxH = el.style.maxHeight;
    if (maxH && maxH.endsWith('px')) {
      const pxVal = parseFloat(maxH);
      if (!Number.isNaN(pxVal) && pxVal >= 700) {
        el.style.maxHeight = 'none';
      }
    }
  });
}

async function waitForFontsAndImages(portalEl: HTMLElement): Promise<void> {
  const timeoutPromise = new Promise<void>((resolve) => {
    window.setTimeout(resolve, 450);
  });

  const workPromise = (async () => {
    try {
      if (typeof document !== 'undefined' && 'fonts' in document && document.fonts?.ready) {
        await document.fonts.ready;
      }
    } catch {
      // ignore font readiness errors
    }

    const images = Array.from(portalEl.querySelectorAll('img'));
    await Promise.all(
      images.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete && img.naturalWidth > 0) {
              resolve();
              return;
            }
            const done = () => {
              img.removeEventListener('load', done);
              img.removeEventListener('error', done);
              resolve();
            };
            img.addEventListener('load', done);
            img.addEventListener('error', done);
          })
      )
    );
  })();

  await Promise.race([workPromise, timeoutPromise]);
}

let activeCleanupFn: (() => void) | null = null;

/**
 * Mobile & Desktop Isolated Print / PDF Export Engine.
 * - Isolates only the active printable paper sheets into a direct body child (`#spj-isolated-print-root`)
 *   and hides `#root` during `@media print` so mobile scroll positions, sticky headers, and scaled stages
 *   never cause blank pages or right-edge clipping.
 * - Uses 100% fluid page width (`width: 100% !important`) inside `@media print` so Android Print Spooler
 *   (`ISO A4`, `ISO A4s`, `Letter`, `F4`) never clips the right side of any page.
 * - Keeps the print portal alive while the mobile print spooler is open (since `window.print()` is
 *   non-blocking on Android Chrome and the user may take 10-60s to change paper size and tap Save PDF).
 */
export async function triggerIsolatedSpjPrint(
  options: TriggerIsolatedSpjPrintOptions
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Clean up any previous print session first
  if (activeCleanupFn) {
    activeCleanupFn();
    activeCleanupFn = null;
  }

  const {
    paperSize,
    documentTitle,
    rootElement,
    sheetSelector = '.spj-dossier-sheet, .print-only-sheet',
    zeroPageMargin = false,
    allowEmptyPlaceholderIfSingle = false,
  } = options;

  const searchRoot: ParentNode = rootElement || document;
  const rawCandidates = Array.from(
    searchRoot.querySelectorAll<HTMLElement>(sheetSelector)
  );

  // Deduplicate nested matches (keep outermost sheet)
  const outermostSheets = rawCandidates.filter(
    (el) => !rawCandidates.some((other) => other !== el && other.contains(el))
  );

  // Filter out empty placeholder pages so PDF export has zero blank pages
  let printableSheets = outermostSheets.filter((sheet) => {
    const wrapper = sheet.closest('[data-empty-page="true"], .spj-empty-printable-page');
    if (wrapper || sheet.getAttribute('data-empty-page') === 'true') {
      return false;
    }
    const textContent = (sheet.innerText || sheet.textContent || '').trim();
    const hasImages = sheet.querySelectorAll('img').length > 0;
    return textContent.length > 0 || hasImages;
  });

  if (printableSheets.length === 0 && allowEmptyPlaceholderIfSingle && outermostSheets.length > 0) {
    printableSheets = [outermostSheets[0]];
  }

  if (printableSheets.length === 0) {
    window.print();
    return;
  }

  let portal = document.getElementById(ISOLATED_PORTAL_ID);
  if (!portal) {
    portal = document.createElement('div');
    portal.id = ISOLATED_PORTAL_ID;
    document.body.appendChild(portal);
  }
  portal.innerHTML = '';

  const pageWidthMm = paperSize === 'F4' ? '215mm' : '210mm';
  const pageHeightMm = paperSize === 'F4' ? '330mm' : '297mm';
  const pagePadding = zeroPageMargin ? '0mm 0mm' : '4mm 0mm';

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @media print {
      @page {
        size: ${pageWidthMm} ${pageHeightMm};
        margin: 0mm;
      }
      #${ISOLATED_PORTAL_ID} {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        overflow: visible !important;
      }
      #${ISOLATED_PORTAL_ID} .spj-isolated-print-page {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        padding: ${pagePadding} !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        background: #ffffff !important;
        color: #000000 !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      #${ISOLATED_PORTAL_ID} .spj-isolated-print-page-break {
        break-after: page !important;
        page-break-after: always !important;
      }
      #${ISOLATED_PORTAL_ID} .spj-isolated-print-page-last {
        break-after: auto !important;
        page-break-after: auto !important;
      }
    }
  `;
  portal.appendChild(styleEl);

  printableSheets.forEach((sourceSheet, idx) => {
    const isLast = idx === printableSheets.length - 1;
    const pageSection = document.createElement('section');
    pageSection.className = `spj-isolated-print-page ${
      isLast ? 'spj-isolated-print-page-last' : 'spj-isolated-print-page-break'
    }`;

    const cloned = sourceSheet.cloneNode(true) as HTMLElement;
    syncFormValuesToClone(sourceSheet, cloned);
    cleanClonedSheetForPrint(cloned);

    pageSection.appendChild(cloned);
    portal!.appendChild(pageSection);
  });

  const prevTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  document.body.classList.add('spj-is-printing');

  await waitForFontsAndImages(portal);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.body.classList.remove('spj-is-printing');
    if (portal) {
      portal.innerHTML = '';
    }
    if (documentTitle) {
      document.title = prevTitle;
    }
    window.removeEventListener('pointerdown', handleUserReturnInteraction);
    window.removeEventListener('keydown', handleUserReturnInteraction);
  };

  // On Android Chrome, window.print() is non-blocking and afterprint can fire immediately while the
  // Android Print Spooler ("Simpan sebagai PDF") is still open for 10-60 seconds!
  // Because #spj-isolated-print-root is display:none in @media screen, keeping it in the DOM until
  // the user actually touches/clicks the app again guarantees the print spooler never loses its content.
  const handleUserReturnInteraction = () => {
    window.setTimeout(cleanup, 300);
  };

  activeCleanupFn = cleanup;

  window.setTimeout(() => {
    window.addEventListener('pointerdown', handleUserReturnInteraction, { once: true });
    window.addEventListener('keydown', handleUserReturnInteraction, { once: true });
  }, 1500);

  window.print();
}

export interface ExportDirectPdfOptions {
  paperSize: PaperSize;
  documentTitle: string;
  sheetSelector?: string;
  rootElement?: HTMLElement | null;
  onProgress?: (status: string) => void;
}

/**
 * Direct High-Fidelity PDF File Exporter.
 * Converts active printable sheets into vector/raster PDF files with 100% exact layout, font, logo, and dimension rendering.
 */
export async function exportToDirectPdf(
  options: ExportDirectPdfOptions
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const {
    paperSize,
    documentTitle,
    rootElement,
    sheetSelector = '.spj-dossier-sheet, .print-only-sheet',
    onProgress,
  } = options;

  onProgress?.('Menyiapkan halaman PDF...');

  const searchRoot: ParentNode = rootElement || document;
  const rawCandidates = Array.from(
    searchRoot.querySelectorAll<HTMLElement>(sheetSelector)
  );

  const outermostSheets = rawCandidates.filter(
    (el) => !rawCandidates.some((other) => other !== el && other.contains(el))
  );

  let printableSheets = outermostSheets.filter((sheet) => {
    const wrapper = sheet.closest('[data-empty-page="true"], .spj-empty-printable-page');
    if (wrapper || sheet.getAttribute('data-empty-page') === 'true') {
      return false;
    }
    const textContent = (sheet.innerText || sheet.textContent || '').trim();
    const hasImages = sheet.querySelectorAll('img').length > 0;
    return textContent.length > 0 || hasImages;
  });

  if (printableSheets.length === 0 && outermostSheets.length > 0) {
    printableSheets = [outermostSheets[0]];
  }

  if (printableSheets.length === 0) {
    throw new Error('Tidak ada lembar cetak yang dapat diekspor.');
  }

  const widthMm = paperSize === 'F4' ? 215 : 210;
  const heightMm = paperSize === 'F4' ? 330 : 297;
  const widthPx = paperSize === 'F4' ? 812 : 794;
  const heightPx = paperSize === 'F4' ? 1247 : 1123;

  const pdf = new jsPDF({
    unit: 'mm',
    format: [widthMm, heightMm],
    orientation: 'portrait',
    compress: true,
  });

  // Create temporary container for pristine off-screen canvas rendering
  const renderContainer = document.createElement('div');
  renderContainer.style.position = 'fixed';
  renderContainer.style.left = '-9999px';
  renderContainer.style.top = '-9999px';
  renderContainer.style.width = `${widthPx}px`;
  renderContainer.style.zIndex = '-9999';
  renderContainer.style.background = '#ffffff';
  document.body.appendChild(renderContainer);

  try {
    for (let idx = 0; idx < printableSheets.length; idx++) {
      const sourceSheet = printableSheets[idx];
      onProgress?.(`Memproses halaman ${idx + 1} dari ${printableSheets.length}...`);

      const cloned = sourceSheet.cloneNode(true) as HTMLElement;
      syncFormValuesToClone(sourceSheet, cloned);
      cleanClonedSheetForPrint(cloned);

      // Force explicit paper dimensions, white background, and pure black text
      cloned.style.width = `${widthPx}px`;
      cloned.style.minWidth = `${widthPx}px`;
      cloned.style.maxWidth = `${widthPx}px`;
      cloned.style.height = `${heightPx}px`;
      cloned.style.minHeight = `${heightPx}px`;
      cloned.style.maxHeight = `${heightPx}px`;
      cloned.style.margin = '0';
      cloned.style.padding = '0';
      cloned.style.transform = 'none';
      cloned.style.background = '#ffffff';
      cloned.style.color = '#000000';
      cloned.style.boxShadow = 'none';
      cloned.style.border = 'none';
      cloned.style.overflow = 'hidden';

      renderContainer.innerHTML = '';
      renderContainer.appendChild(cloned);

      await waitForFontsAndImages(renderContainer);

      const canvas = await html2canvas(cloned, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: widthPx,
        height: heightPx,
        windowWidth: widthPx,
        windowHeight: heightPx,
      });

      const imgData = canvas.toDataURL('image/png', 1.0);

      if (idx > 0) {
        pdf.addPage([widthMm, heightMm], 'portrait');
      }

      pdf.addImage(imgData, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
    }

    onProgress?.('Mengunduh berkas PDF...');
    const filename = documentTitle.endsWith('.pdf') ? documentTitle : `${documentTitle}.pdf`;
    pdf.save(filename);
  } finally {
    if (document.body.contains(renderContainer)) {
      document.body.removeChild(renderContainer);
    }
  }
}
