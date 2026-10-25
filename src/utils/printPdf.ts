import type { PaperSize } from '../types/spj';

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
  // Remove all screen-only elements so they cannot occupy space or cause blank pages
  clonedSheet
    .querySelectorAll('.no-print, .spj-empty-printable-page, [data-no-print="true"]')
    .forEach((el) => el.remove());

  // Reset inline scaling and fixed pixel heights on the root sheet
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

  // Also strip fixed min-h-[1123px] / min-h-[1247px] classes or inline heights on inner wrappers
  clonedSheet
    .querySelectorAll<HTMLElement>(
      '.print-only-sheet, .spj-dossier-sheet, .kuitansi-sheet-container'
    )
    .forEach((inner) => {
      inner.style.transform = 'none';
      inner.style.height = 'auto';
      inner.style.minHeight = '0';
      inner.style.maxHeight = 'none';
      inner.style.aspectRatio = 'auto';
      inner.style.boxShadow = 'none';
      inner.style.border = 'none';
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

/**
 * Mobile & Desktop Isolated Print / PDF Export Engine.
 * - Isolates only the active printable paper sheets into a direct body child (`#spj-isolated-print-root`)
 *   and hides `#root` during `@media print` so mobile scroll positions, sticky headers, and scaled stages
 *   never cause blank pages or shrunk mobile fonts.
 * - Automatically strips empty attachment placeholder pages (`data-empty-page="true"`).
 * - Guarantees only pages `0 .. N-2` have `break-after: page`, while the final page `N-1` has `break-after: auto`.
 */
export async function triggerIsolatedSpjPrint(
  options: TriggerIsolatedSpjPrintOptions
): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

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

  // Deduplicate nested matches (e.g., if a .print-only-sheet contains another .print-only-sheet, keep outermost)
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
  // 1mm safety buffer below physical paper height prevents browser subpixel overflow from creating blank pages
  const safeMaxHeightMm = paperSize === 'F4' ? '328.5mm' : '295.5mm';
  const pagePadding = zeroPageMargin ? '2mm 3mm' : '5mm 7mm';

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @media print {
      @page {
        size: ${pageWidthMm} ${pageHeightMm};
        margin: 0mm;
      }
      #${ISOLATED_PORTAL_ID} {
        display: block !important;
        width: ${pageWidthMm} !important;
        margin: 0 auto !important;
        padding: 0 !important;
        background: #ffffff !important;
      }
      #${ISOLATED_PORTAL_ID} .spj-isolated-print-page {
        display: block !important;
        width: ${pageWidthMm} !important;
        max-width: ${pageWidthMm} !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: ${safeMaxHeightMm} !important;
        padding: ${pagePadding} !important;
        margin: 0 auto !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        background: #ffffff !important;
        color: #000000 !important;
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

  const prevScrollX = window.scrollX;
  const prevScrollY = window.scrollY;

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
    window.scrollTo(prevScrollX, prevScrollY);
    window.removeEventListener('afterprint', cleanup);
  };

  window.addEventListener('afterprint', cleanup, { once: true });

  // Scroll to top before calling window.print() so mobile browsers (iOS Safari / Android Chrome)
  // do not insert leading blank space above the first printed page
  window.scrollTo(0, 0);

  try {
    window.print();
  } finally {
    // Fallback cleanup for mobile browsers that return focus after closing print preview
    window.setTimeout(cleanup, 1200);
  }
}
