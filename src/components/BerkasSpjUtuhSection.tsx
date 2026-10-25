import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Printer,
  FileDown,
  FileCheck,
  ClipboardList,
  Stamp,
  Banknote,
  Camera,
  Receipt,
  Pencil,
  CheckCircle2,
  Layers,
  AlertTriangle,
  Filter,
  Compass,
} from 'lucide-react';
import {
  KuitansiPerjalananDinas,
  SuratPerintahTugas,
  DokumentasiPerjalananItem,
  DokumentasiPengeluaranItem,
  CustomFieldDefinition,
  AppSettings,
  PaperSize,
} from '../types/spj';
import {
  calculateKuitansiTotal,
  formatRupiah,
  getPaperDimensions,
  calculateDocumentationGridDimensions,
  DocumentationPrintGridMode,
} from '../utils/spjCalculations';
import {
  computePrintableDossierPages,
  buildCleanPdfTitle,
  triggerIsolatedSpjPrint,
} from '../utils/printPdf';
import { SuratTugasDocumentPreview } from './SuratTugasDocumentPreview';
import { SuratPerjalananDinasDocumentPreview } from './SuratPerjalananDinasDocumentPreview';
import {
  SuratPerjalananDinasBelakangDocumentPreview,
  getEffectiveVisumData,
} from './SuratPerjalananDinasBelakangDocumentPreview';
import { KuitansiDocumentPreview } from './KuitansiDocumentPreview';
import { SpjSubSectionKey } from './SpjPerjalananSubHome';

export type DossierSectionId =
  | 'all'
  | 'spt'
  | 'spd'
  | 'visum'
  | 'kuitansi'
  | 'dokumentasi'
  | 'pengeluaran';

interface BerkasSpjUtuhSectionProps {
  activeKuitansi: KuitansiPerjalananDinas;
  activeSpt: SuratPerintahTugas;
  docPerjalanan: DokumentasiPerjalananItem[];
  docPengeluaran: DokumentasiPengeluaranItem[];
  customFields: CustomFieldDefinition[];
  appSettings: AppSettings;
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
  onEditSection: (section: SpjSubSectionKey) => void;
}

export const BerkasSpjUtuhSection: React.FC<BerkasSpjUtuhSectionProps> = ({
  activeKuitansi,
  activeSpt,
  docPerjalanan,
  docPengeluaran,
  customFields,
  appSettings,
  paperSize,
  onChangePaperSize,
  onEditSection,
}) => {
  const [printScope, setPrintScope] = useState<DossierSectionId>('all');
  const [activeNavSection, setActiveNavSection] = useState<DossierSectionId>('all');
  const [navBehavior, setNavBehavior] = useState<'jump' | 'filter'>('jump');
  const [stickyTopOffset, setStickyTopOffset] = useState<number>(84);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const chipScrollContainerRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const sectionDomRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isProgrammaticScrollRef = useRef<boolean>(false);

  const spec = getPaperDimensions(paperSize);

  const [previewScale, setPreviewScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const availW = Math.max(260, Math.min(window.innerWidth - 36, 920));
      return Number(Math.min(1, availW / spec.widthPx).toFixed(4));
    }
    return 1;
  });

  // Measure main app sticky header height so our sticky quick-jump bar sits flush underneath
  useEffect(() => {
    const updateHeaderOffset = () => {
      const appHeader = document.querySelector('header.sticky');
      if (appHeader instanceof HTMLElement) {
        setStickyTopOffset(Math.max(48, appHeader.offsetHeight));
      } else {
        setStickyTopOffset(84);
      }
    };
    updateHeaderOffset();
    window.addEventListener('resize', updateHeaderOffset);
    const appHeader = document.querySelector('header.sticky');
    let obs: ResizeObserver | null = null;
    if (appHeader instanceof HTMLElement && typeof ResizeObserver !== 'undefined') {
      obs = new ResizeObserver(updateHeaderOffset);
      obs.observe(appHeader);
    }
    return () => {
      window.removeEventListener('resize', updateHeaderOffset);
      if (obs) obs.disconnect();
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateScale = () => {
      const availW = Math.max(260, el.clientWidth - 24);
      const fit = Math.min(1, availW / spec.widthPx);
      setPreviewScale(Number(fit.toFixed(4)));
    };
    updateScale();
    const obs = new ResizeObserver(updateScale);
    obs.observe(el);
    return () => obs.disconnect();
  }, [spec.widthPx]);

  // Optimal grid for Dokumentasi Kegiatan pages
  const docGridMode = useMemo<DocumentationPrintGridMode>(() => {
    const count = docPerjalanan.length;
    if (count <= 1) return '1x1';
    if (count === 2) return '1x2';
    if (count === 3) return '1x3';
    if (count === 4) return '2x2';
    if (count <= 6) return '2x3';
    return '2x4';
  }, [docPerjalanan.length]);

  const docItemsPerPage = useMemo(() => {
    switch (docGridMode) {
      case '1x1':
        return 1;
      case '1x2':
        return 2;
      case '1x3':
        return 3;
      case '1x4':
      case '2x2':
        return 4;
      case '2x3':
        return 6;
      case '2x4':
        return 8;
      default:
        return 4;
    }
  }, [docGridMode]);

  const paginatedDocPages = useMemo(() => {
    if (docPerjalanan.length === 0) return [[] as DokumentasiPerjalananItem[]];
    const chunks: DokumentasiPerjalananItem[][] = [];
    for (let i = 0; i < docPerjalanan.length; i += docItemsPerPage) {
      chunks.push(docPerjalanan.slice(i, i + docItemsPerPage));
    }
    return chunks;
  }, [docPerjalanan, docItemsPerPage]);

  // Paginate Bukti Pengeluaran (1 or 2 receipts per page cleanly)
  const paginatedExpensePages = useMemo(() => {
    if (docPengeluaran.length === 0) return [[] as DokumentasiPengeluaranItem[]];
    const chunks: DokumentasiPengeluaranItem[][] = [];
    for (let i = 0; i < docPengeluaran.length; i += 2) {
      chunks.push(docPengeluaran.slice(i, i + 2));
    }
    return chunks;
  }, [docPengeluaran]);

  const pagePlan = useMemo(
    () =>
      computePrintableDossierPages({
        docPerjalananCount: docPerjalanan.length,
        docItemsPerPage,
        docPengeluaranCount: docPengeluaran.length,
        expenseItemsPerPage: 2,
      }),
    [docPerjalanan.length, docItemsPerPage, docPengeluaran.length]
  );

  const totalKuitansi = calculateKuitansiTotal(activeKuitansi.rincian);
  const totalPagesCount = pagePlan.totalPrintablePages;

  // Per-Page Completeness Evaluation
  const isSptComplete = Boolean(
    activeSpt.noSpt?.trim() &&
      activeSpt.pegawaiList?.length > 0 &&
      activeSpt.maksudPerjalanan?.trim()
  );
  const isSpdComplete = Boolean(
    activeSpt.tempatBerangkat?.trim() &&
      activeSpt.tempatTujuan?.trim() &&
      activeSpt.tanggalBerangkat
  );
  const isVisumComplete = Boolean(activeSpt.tempatTujuan?.trim());
  const isKuitansiComplete = Boolean(
    totalKuitansi > 0 && activeKuitansi.atasNama?.trim()
  );
  const isDokumentasiComplete = docPerjalanan.length > 0;
  const isPengeluaranComplete = docPengeluaran.length > 0;

  const sectionPills = useMemo<
    Array<{
      id: DossierSectionId;
      num: string;
      label: string;
      editKey?: SpjSubSectionKey;
      icon: React.ComponentType<{ className?: string }>;
      isIncomplete?: boolean;
      warningBadgeText?: string;
      statusBadgeText?: string;
    }>
  >(() => {
    const incompleteCount = [
      !isSptComplete,
      !isSpdComplete,
      !isVisumComplete,
      !isKuitansiComplete,
      !isDokumentasiComplete,
      !isPengeluaranComplete,
    ].filter(Boolean).length;

    return [
      {
        id: 'all',
        num: '1–6',
        label: `Semua Halaman (${totalPagesCount} Hal Cetak)`,
        icon: Layers,
        isIncomplete: incompleteCount > 0,
        warningBadgeText:
          incompleteCount > 0 ? `${incompleteCount} Kosong` : undefined,
        statusBadgeText: incompleteCount === 0 ? 'Lengkap' : undefined,
      },
      {
        id: 'spt',
        num: '1',
        label: 'SPT',
        editKey: 'spt',
        icon: FileCheck,
        isIncomplete: !isSptComplete,
        warningBadgeText: !isSptComplete ? 'Belum Lengkap' : undefined,
      },
      {
        id: 'spd',
        num: '2',
        label: 'SPD Depan',
        editKey: 'spd',
        icon: ClipboardList,
        isIncomplete: !isSpdComplete,
        warningBadgeText: !isSpdComplete ? 'Belum Lengkap' : undefined,
      },
      {
        id: 'visum',
        num: '3',
        label: 'Visum SPD',
        editKey: 'visum',
        icon: Stamp,
        isIncomplete: !isVisumComplete,
        warningBadgeText: !isVisumComplete ? 'Kosong' : undefined,
      },
      {
        id: 'kuitansi',
        num: '4',
        label: 'Kuitansi',
        editKey: 'kuitansi',
        icon: Banknote,
        isIncomplete: !isKuitansiComplete,
        warningBadgeText: !isKuitansiComplete ? 'Rp 0' : undefined,
      },
      {
        id: 'dokumentasi',
        num: '5',
        label: `Dokumentasi (${docPerjalanan.length})`,
        editKey: 'dokumentasi',
        icon: Camera,
        isIncomplete: !isDokumentasiComplete,
        warningBadgeText: !isDokumentasiComplete ? 'Kosong' : undefined,
      },
      {
        id: 'pengeluaran',
        num: '6',
        label: `Bukti Bayar (${docPengeluaran.length})`,
        editKey: 'pengeluaran',
        icon: Receipt,
        isIncomplete: !isPengeluaranComplete,
        warningBadgeText: !isPengeluaranComplete ? 'Kosong' : undefined,
      },
    ];
  }, [
    totalPagesCount,
    isSptComplete,
    isSpdComplete,
    isVisumComplete,
    isKuitansiComplete,
    isDokumentasiComplete,
    isPengeluaranComplete,
    docPerjalanan.length,
    docPengeluaran.length,
  ]);

  const incompleteSections = useMemo(
    () => sectionPills.filter((p) => p.id !== 'all' && p.isIncomplete),
    [sectionPills]
  );

  // Scroll spy to highlight the currently visible page chip while scrolling in 'all' mode
  useEffect(() => {
    if (printScope !== 'all') return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      const orderedIds: Array<Exclude<DossierSectionId, 'all'>> = [
        'spt',
        'spd',
        'visum',
        'kuitansi',
        'dokumentasi',
        'pengeluaran',
      ];
      const threshold = stickyTopOffset + 110;

      // If near the top of the container, highlight 'all'
      if (window.scrollY < 180) {
        setActiveNavSection('all');
        return;
      }

      let currentFound: DossierSectionId = 'all';
      for (const secId of orderedIds) {
        const el = sectionDomRefs.current[secId];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= threshold) {
            currentFound = secId;
          }
        }
      }
      setActiveNavSection(currentFound);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [printScope, stickyTopOffset]);

  // Keep active chip visible inside horizontal scroll bar
  useEffect(() => {
    const activeKey = printScope === 'all' ? activeNavSection : printScope;
    const chipEl = chipRefs.current[activeKey];
    const barEl = chipScrollContainerRef.current;
    if (chipEl && barEl) {
      const chipLeft = chipEl.offsetLeft;
      const chipWidth = chipEl.offsetWidth;
      const barScrollLeft = barEl.scrollLeft;
      const barWidth = barEl.clientWidth;

      if (chipLeft < barScrollLeft + 16 || chipLeft + chipWidth > barScrollLeft + barWidth - 16) {
        barEl.scrollTo({
          left: Math.max(0, chipLeft - barWidth / 2 + chipWidth / 2),
          behavior: 'smooth',
        });
      }
    }
  }, [activeNavSection, printScope]);

  const scrollToSectionAnchor = (sectionId: DossierSectionId) => {
    if (sectionId === 'all') {
      if (containerRef.current) {
        isProgrammaticScrollRef.current = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.setTimeout(() => {
          isProgrammaticScrollRef.current = false;
        }, 650);
      }
      return;
    }

    const targetEl = sectionDomRefs.current[sectionId];
    if (targetEl) {
      isProgrammaticScrollRef.current = true;
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 650);
    }
  };

  const handleChipClick = (sectionId: DossierSectionId) => {
    setActiveNavSection(sectionId);

    if (sectionId === 'all') {
      setPrintScope('all');
      window.setTimeout(() => scrollToSectionAnchor('all'), 40);
      return;
    }

    if (navBehavior === 'filter') {
      setPrintScope(sectionId);
      window.setTimeout(() => scrollToSectionAnchor(sectionId), 50);
    } else {
      // Quick-Jump mode: ensure all pages are shown and smooth-scroll directly to the target page anchor
      if (printScope !== 'all') {
        setPrintScope('all');
        window.setTimeout(() => scrollToSectionAnchor(sectionId), 80);
      } else {
        scrollToSectionAnchor(sectionId);
      }
    }
  };

  const triggerPrintWithTitle = (scope: DossierSectionId, customLabel?: string) => {
    const prevScope = printScope;
    const filePrefix =
      scope === 'all'
        ? 'Berkas_SPJ_Utuh'
        : `SPJ_${(customLabel || scope).replace(/\s+/g, '_')}`;

    const docTitle = buildCleanPdfTitle({
      prefix: filePrefix,
      atasNama: activeKuitansi.atasNama,
      noSpt: activeKuitansi.noSpt,
      paperSize,
    });

    // If printing a single section that is already rendered in the DOM, print its wrapper directly
    if (scope !== 'all' && (prevScope === 'all' || prevScope === scope)) {
      const sectionEl = sectionDomRefs.current[scope];
      if (sectionEl) {
        void triggerIsolatedSpjPrint({
          paperSize,
          documentTitle: docTitle,
          rootElement: sectionEl,
          sheetSelector: '.spj-dossier-sheet',
          allowEmptyPlaceholderIfSingle: false,
        });
        return;
      }
    }

    if (scope !== prevScope) {
      setPrintScope(scope);
      window.setTimeout(() => {
        const targetRoot =
          scope === 'all'
            ? containerRef.current
            : sectionDomRefs.current[scope] || containerRef.current;
        void triggerIsolatedSpjPrint({
          paperSize,
          documentTitle: docTitle,
          rootElement: targetRoot,
          sheetSelector: '.spj-dossier-sheet',
          allowEmptyPlaceholderIfSingle: false,
        }).finally(() => {
          setPrintScope(prevScope);
        });
      }, 90);
    } else {
      void triggerIsolatedSpjPrint({
        paperSize,
        documentTitle: docTitle,
        rootElement: containerRef.current,
        sheetSelector: '.spj-dossier-sheet',
        allowEmptyPlaceholderIfSingle: false,
      });
    }
  };

  const isSectionVisible = (sec: Exclude<DossierSectionId, 'all'>) =>
    printScope === 'all' || printScope === sec;

  // Determine which visible non-empty section is last so fallback @media print never adds a trailing blank page
  const lastPrintableSectionId = useMemo<Exclude<DossierSectionId, 'all'>>(() => {
    if (printScope !== 'all') return printScope;
    if (docPengeluaran.length > 0) return 'pengeluaran';
    if (docPerjalanan.length > 0) return 'dokumentasi';
    return 'kuitansi';
  }, [printScope, docPengeluaran.length, docPerjalanan.length]);

  const renderPageWrapper = (params: {
    key: string;
    anchorId?: string;
    registerRefSection?: Exclude<DossierSectionId, 'all'>;
    pageNumberLabel: string;
    title: string;
    sectionId: Exclude<DossierSectionId, 'all'>;
    editKey: SpjSubSectionKey;
    isIncomplete?: boolean;
    incompleteReason?: string;
    isEmptyAttachmentPage?: boolean;
    isLastPrintablePage?: boolean;
    children: React.ReactNode;
  }) => {
    const scaledW = Math.round(spec.widthPx * previewScale);
    const scaledH = Math.round(spec.minHeightPx * previewScale);

    return (
      <div
        key={params.key}
        id={params.anchorId}
        data-empty-page={params.isEmptyAttachmentPage ? 'true' : undefined}
        ref={(el) => {
          if (params.registerRefSection) {
            sectionDomRefs.current[params.registerRefSection] = el;
          }
        }}
        style={{ scrollMarginTop: `${stickyTopOffset + 68}px` }}
        className={`spj-dossier-page-wrapper space-y-2 min-w-0 max-w-full ${
          params.isEmptyAttachmentPage ? 'spj-empty-printable-page' : ''
        } ${params.isLastPrintablePage ? 'spj-last-printable-wrapper' : ''}`}
      >
        {/* Top Action Bar for Each Page on Screen (Hidden in Print) */}
        <div
          className={`no-print flex flex-wrap items-center justify-between gap-2 bg-white border rounded-xl px-3.5 py-2 shadow-2xs transition-colors ${
            params.isIncomplete
              ? 'border-amber-300 bg-amber-50/30'
              : 'border-slate-200/90'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="px-2 py-0.5 rounded-md bg-sky-700 text-white text-[11px] font-extrabold font-mono shrink-0">
              {params.pageNumberLabel}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {params.title}
            </h3>
            {params.isIncomplete && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold shrink-0">
                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                <span>
                  {params.incompleteReason || 'Masih Kosong (0)'}
                  {params.isEmptyAttachmentPage ? ' · Dilewati Saat Ekspor PDF' : ''}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditSection(params.editKey)}
              className={`min-h-[30px] px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                params.isIncomplete
                  ? 'border-amber-300 bg-amber-100/80 hover:bg-amber-200/80 text-amber-950'
                  : 'border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-slate-700 hover:text-sky-800'
              }`}
            >
              <Pencil className="w-3 h-3 text-sky-700" />
              <span>{params.isIncomplete ? 'Lengkapi Bagian Ini' : 'Edit Bagian Ini'}</span>
            </button>
            {!params.isEmptyAttachmentPage && (
              <button
                type="button"
                onClick={() => triggerPrintWithTitle(params.sectionId, params.title)}
                className="min-h-[30px] px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                title={`Cetak atau simpan PDF khusus ${params.title}`}
              >
                <Printer className="w-3 h-3 text-emerald-700" />
                <span>Cetak Halaman Ini</span>
              </button>
            )}
          </div>
        </div>

        {/* Responsive Scaled Paper Surface on Screen + Exact 1:1 Paper Sheet in Print */}
        <div className="spj-dossier-viewport w-full overflow-x-hidden rounded-2xl bg-slate-200/70 border border-slate-300/80 p-2.5 sm:p-6 flex justify-center items-start">
          <div
            className="spj-dossier-stage relative transition-all duration-150"
            style={{
              width: `${scaledW}px`,
              height: `${scaledH}px`,
            }}
          >
            <div
              data-empty-page={params.isEmptyAttachmentPage ? 'true' : undefined}
              style={{
                width: `${spec.widthPx}px`,
                minHeight: `${spec.minHeightPx}px`,
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
              className="spj-dossier-sheet bg-white text-black shadow-lg border border-slate-300 box-border overflow-hidden"
            >
              {params.children}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const gridDim = calculateDocumentationGridDimensions(paperSize, docGridMode);

  return (
    <div ref={containerRef} className="space-y-3 min-w-0 max-w-full overflow-x-clip">
      {/* Print CSS Rules for Multi-Page Unified PDF Output (Zero Blank Pages) */}
      <style>{`
        @media print {
          @page {
            size: ${spec.cssPageSize};
            margin: 0mm;
          }
          .spj-empty-printable-page {
            display: none !important;
          }
          .spj-dossier-page-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            break-after: page !important;
            page-break-after: always !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .spj-dossier-page-wrapper:last-child,
          .spj-last-printable-wrapper {
            break-after: auto !important;
            page-break-after: auto !important;
          }
          .spj-dossier-viewport {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .spj-dossier-stage {
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .spj-dossier-sheet {
            transform: none !important;
            width: ${paperSize === 'F4' ? '215mm' : '210mm'} !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: ${paperSize === 'F4' ? '328.5mm' : '295.5mm'} !important;
            margin: 0 auto !important;
            padding: 5mm 7mm !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* UNIFIED DOSSIER HEADER PANEL (Hidden in Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>1 Kesatuan Berkas SPJ Perjalanan Dinas Utuh</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {activeKuitansi.atasNama || 'Pelaksana'} — {activeKuitansi.tujuan} ({formatRupiah(totalKuitansi)})
            </h2>
            <p className="text-xs text-slate-500">
              Menyatukan <strong className="text-slate-700">SPT, SPD Depan, Visum, Kuitansi, Dokumentasi, dan Bukti Pembayaran</strong> dalam 1 file cetak / PDF multi-halaman utuh ({totalPagesCount} halaman siap cetak {paperSize} tanpa halaman kosong).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Pilihan Kertas A4 / F4 */}
            <div
              role="group"
              aria-label="Pilih Ukuran Kertas"
              className="inline-flex items-center p-0.5 bg-slate-100 rounded-xl border border-slate-200"
            >
              <button
                type="button"
                onClick={() => onChangePaperSize('A4')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paperSize === 'A4'
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                A4 (210×297)
              </button>
              <button
                type="button"
                onClick={() => onChangePaperSize('F4')}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  paperSize === 'F4'
                    ? 'bg-sky-700 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                F4 Folio (215×330)
              </button>
            </div>

            {/* Tombol Utama: Cetak / Simpan 1 File PDF Utuh */}
            <button
              type="button"
              onClick={() => triggerPrintWithTitle('all')}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
            >
              <FileDown className="w-4 h-4 shrink-0" />
              <span>Cetak / Unduh 1 File PDF Utuh ({totalPagesCount} Hal)</span>
            </button>
          </div>
        </div>

        {/* Peringatan Kelengkapan Sebelum Cetak (Tampil Jika Ada Halaman / Lampiran Kosong) */}
        {incompleteSections.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-amber-50 border border-amber-300/90 px-3.5 py-2.5 text-xs text-amber-950">
            <div className="flex items-start sm:items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-extrabold">Perhatian Sebelum Cetak PDF Utuh: </span>
                <span>
                  Terdapat {incompleteSections.length} bagian yang masih kosong/belum lengkap (
                  {incompleteSections.map((s) => `${s.num}. ${s.label}`).join(', ')}). Lampiran dengan 0 berkas otomatis dilewati saat ekspor PDF agar tidak menimbulkan halaman kosong.
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 shrink-0">
              {!isDokumentasiComplete && (
                <button
                  type="button"
                  onClick={() => onEditSection('dokumentasi')}
                  className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 font-extrabold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>+ Isi Dokumentasi</span>
                </button>
              )}
              {!isPengeluaranComplete && (
                <button
                  type="button"
                  onClick={() => onEditSection('pengeluaran')}
                  className="px-2.5 py-1 rounded-lg bg-amber-200/80 hover:bg-amber-300/80 text-amber-950 font-extrabold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Receipt className="w-3 h-3" />
                  <span>+ Isi Bukti Bayar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* STICKY QUICK-JUMP NAVIGATION & COMPLETENESS BAR (Hidden in Print)     */}
      {/* ===================================================================== */}
      <div
        style={{ top: `${stickyTopOffset}px` }}
        className="no-print sticky z-20 -mx-2.5 sm:mx-0 px-2.5 sm:px-3.5 py-2 bg-white/95 backdrop-blur-md border-y sm:border border-slate-200/90 sm:rounded-2xl shadow-sm space-y-1.5 transition-all"
      >
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0 text-slate-600 font-bold truncate">
            <Compass className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span className="truncate">
              Navigasi Cepat &amp; Status Kelengkapan Halaman:
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {printScope !== 'all' && (
              <button
                type="button"
                onClick={() => triggerPrintWithTitle(printScope)}
                className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>Cetak Bagian Ini</span>
              </button>
            )}

            {/* Mode Toggle: Loncat Cepat (Scroll) vs Filter Bagian */}
            <div
              role="group"
              aria-label="Mode Navigasi Chip"
              className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-bold"
            >
              <button
                type="button"
                onClick={() => {
                  setNavBehavior('jump');
                  if (printScope !== 'all') setPrintScope('all');
                }}
                className={`px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                  navBehavior === 'jump'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ketuk chip untuk menggulir halus (smooth-scroll) langsung ke halaman tersebut"
              >
                Loncat Halaman
              </button>
              <button
                type="button"
                onClick={() => {
                  setNavBehavior('filter');
                  if (activeNavSection !== 'all') {
                    setPrintScope(activeNavSection);
                  }
                }}
                className={`px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  navBehavior === 'filter'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Ketuk chip untuk memfilter tampilan hanya pada bagian tersebut"
              >
                <Filter className="w-2.5 h-2.5" />
                <span>Filter Bagian</span>
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Scrollable Chip Bar */}
        <div
          ref={chipScrollContainerRef}
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {sectionPills.map((pill) => {
            const Icon = pill.icon;
            const active =
              navBehavior === 'filter'
                ? printScope === pill.id
                : activeNavSection === pill.id;
            const hasWarning = Boolean(pill.isIncomplete);

            return (
              <button
                key={pill.id}
                ref={(el) => {
                  chipRefs.current[pill.id] = el;
                }}
                type="button"
                onClick={() => handleChipClick(pill.id)}
                className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  active
                    ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                    : hasWarning && pill.id !== 'all'
                      ? 'bg-amber-50/90 hover:bg-amber-100/80 text-amber-950 border-amber-300'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    active
                      ? 'text-white'
                      : hasWarning && pill.id !== 'all'
                        ? 'text-amber-600'
                        : 'text-sky-700'
                  }`}
                />
                <span>
                  {pill.num}. {pill.label}
                </span>

                {/* Amber Warning Badge when (0) or Incomplete */}
                {pill.warningBadgeText && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold leading-none ${
                      active
                        ? 'bg-amber-300 text-slate-950'
                        : 'bg-amber-200/90 text-amber-950 border border-amber-400/80'
                    }`}
                  >
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-700 shrink-0" />
                    <span>{pill.warningBadgeText}</span>
                  </span>
                )}

                {/* Complete Badge for All Pages when everything is complete */}
                {pill.statusBadgeText && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-extrabold leading-none ${
                      active
                        ? 'bg-emerald-300 text-slate-950'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    <span>{pill.statusBadgeText}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CONTINUOUS MULTI-PAGE OFFICIAL SPJ DOSSIER                            */}
      {/* ===================================================================== */}
      <div className="space-y-6 pt-1">
        {/* HALAMAN 1: SURAT PERINTAH TUGAS (SPT) */}
        {isSectionVisible('spt') &&
          renderPageWrapper({
            key: 'dossier-page-spt',
            anchorId: 'dossier-section-spt',
            registerRefSection: 'spt',
            pageNumberLabel: 'Bagian 1 / 6',
            title: 'Surat Perintah Tugas (SPT)',
            sectionId: 'spt',
            editKey: 'spt',
            isIncomplete: !isSptComplete,
            incompleteReason: 'Data SPT Belum Lengkap',
            isLastPrintablePage: lastPrintableSectionId === 'spt',
            children: (
              <div className="p-8 print:p-2">
                <SuratTugasDocumentPreview
                  spt={activeSpt}
                  appSettings={appSettings}
                  paperSize={paperSize}
                  isPrintMode={true}
                />
              </div>
            ),
          })}

        {/* HALAMAN 2: SURAT PERJALANAN DINAS (SPD DEPAN - 86% LEBAR KERTAS) */}
        {isSectionVisible('spd') &&
          renderPageWrapper({
            key: 'dossier-page-spd',
            anchorId: 'dossier-section-spd',
            registerRefSection: 'spd',
            pageNumberLabel: 'Bagian 2 / 6',
            title: 'Surat Perjalanan Dinas (SPD Depan)',
            sectionId: 'spd',
            editKey: 'spd',
            isIncomplete: !isSpdComplete,
            incompleteReason: 'Data SPD Belum Lengkap',
            isLastPrintablePage: lastPrintableSectionId === 'spd',
            children: (
              <div className="py-4 px-0 print:py-1">
                <SuratPerjalananDinasDocumentPreview
                  spt={activeSpt}
                  appSettings={appSettings}
                  paperSize={paperSize}
                  isPrintMode={true}
                />
              </div>
            ),
          })}

        {/* HALAMAN 3: VISUM PERJALANAN DINAS (SPD BELAKANG) */}
        {isSectionVisible('visum') &&
          renderPageWrapper({
            key: 'dossier-page-visum',
            anchorId: 'dossier-section-visum',
            registerRefSection: 'visum',
            pageNumberLabel: 'Bagian 3 / 6',
            title: 'Lembar Visum Perjalanan Dinas (SPD Belakang)',
            sectionId: 'visum',
            editKey: 'visum',
            isIncomplete: !isVisumComplete,
            incompleteReason: 'Tujuan Visum Kosong',
            isLastPrintablePage: lastPrintableSectionId === 'visum',
            children: (
              <div className="p-7 print:p-2">
                <SuratPerjalananDinasBelakangDocumentPreview
                  spt={activeSpt}
                  paperSize={paperSize}
                  visumData={getEffectiveVisumData(activeSpt)}
                  isPrintMode={true}
                />
              </div>
            ),
          })}

        {/* HALAMAN 4: KUITANSI & RINCIAN BIAYA SPPD */}
        {isSectionVisible('kuitansi') &&
          renderPageWrapper({
            key: 'dossier-page-kuitansi',
            anchorId: 'dossier-section-kuitansi',
            registerRefSection: 'kuitansi',
            pageNumberLabel: 'Bagian 4 / 6',
            title: 'Kuitansi & Rincian Perhitungan Biaya Perjalanan Dinas',
            sectionId: 'kuitansi',
            editKey: 'kuitansi',
            isIncomplete: !isKuitansiComplete,
            incompleteReason: 'Nominal Kuitansi Rp 0',
            isLastPrintablePage: lastPrintableSectionId === 'kuitansi',
            children: (
              <KuitansiDocumentPreview
                kuitansi={activeKuitansi}
                customFields={customFields}
                paperSize={paperSize}
              />
            ),
          })}

        {/* HALAMAN 5+: DOKUMENTASI KEGIATAN PERJALANAN DINAS */}
        {isSectionVisible('dokumentasi') &&
          paginatedDocPages.map((pageItems, pageIdx) =>
            renderPageWrapper({
              key: `dossier-page-doc-${pageIdx}`,
              anchorId: pageIdx === 0 ? 'dossier-section-dokumentasi' : undefined,
              registerRefSection: pageIdx === 0 ? 'dokumentasi' : undefined,
              pageNumberLabel: `Bagian 5 / 6 ${
                paginatedDocPages.length > 1
                  ? `(Lembar ${pageIdx + 1}/${paginatedDocPages.length})`
                  : ''
              }`,
              title: 'Dokumentasi Kegiatan Perjalanan Dinas',
              sectionId: 'dokumentasi',
              editKey: 'dokumentasi',
              isIncomplete: !isDokumentasiComplete,
              incompleteReason: '0 Foto Dokumentasi',
              isEmptyAttachmentPage: pageItems.length === 0,
              isLastPrintablePage:
                lastPrintableSectionId === 'dokumentasi' &&
                pageIdx === paginatedDocPages.length - 1,
              children: (
                <div
                  className="spj-font-calibri mx-auto my-auto flex flex-col justify-between py-4 box-border overflow-hidden"
                  style={{
                    width: `${gridDim.printAreaWidthPx}px`,
                    height: `${gridDim.printAreaHeightPx}px`,
                    maxHeight: `${gridDim.printAreaHeightPx}px`,
                  }}
                >
                  <div className="text-center pb-2 border-b border-black space-y-0.5 shrink-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-black">
                      DOKUMENTASI PERJALANAN DINAS · SPT: {activeKuitansi.noSpt}
                    </p>
                    <h3 className="text-[13px] font-extrabold text-black uppercase leading-snug">
                      {activeKuitansi.untukPengeluaran ||
                        activeKuitansi.tujuan ||
                        'Perjalanan Dinas'}
                    </h3>
                  </div>

                  {pageItems.length === 0 ? (
                    <div className="no-print flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-amber-300 bg-amber-50/40 rounded-xl my-4">
                      <AlertTriangle className="w-6 h-6 text-amber-600 mb-2" />
                      <p className="text-xs text-slate-700 font-semibold">
                        Belum ada foto dokumentasi kegiatan pada berkas SPJ ini (0 lampiran).
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Halaman ini otomatis dilewati saat mencetak / mengunduh PDF agar dokumen bebas halaman kosong.
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditSection('dokumentasi')}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold cursor-pointer"
                      >
                        + Unggah Foto Dokumentasi
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`grid gap-3 w-full flex-1 h-full min-h-0 items-center justify-items-center overflow-hidden pt-2 ${
                        docGridMode === '1x1'
                          ? 'grid-cols-1 grid-rows-1'
                          : docGridMode === '1x2'
                            ? 'grid-cols-1 grid-rows-2'
                            : docGridMode === '1x3'
                              ? 'grid-cols-1 grid-rows-3'
                              : docGridMode === '1x4'
                                ? 'grid-cols-1 grid-rows-4'
                                : docGridMode === '2x2'
                                  ? 'grid-cols-2 grid-rows-2'
                                  : docGridMode === '2x3'
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
                            className="relative border border-slate-300 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center"
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
                              alt={item.judulKegiatan || 'Dokumentasi'}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover block"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            })
          )}

        {/* HALAMAN 6+: BUKTI PEMBAYARAN / PENGELUARAN RIIL */}
        {isSectionVisible('pengeluaran') &&
          paginatedExpensePages.map((expensePageItems, pageIdx) =>
            renderPageWrapper({
              key: `dossier-page-exp-${pageIdx}`,
              anchorId: pageIdx === 0 ? 'dossier-section-pengeluaran' : undefined,
              registerRefSection: pageIdx === 0 ? 'pengeluaran' : undefined,
              pageNumberLabel: `Bagian 6 / 6 ${
                paginatedExpensePages.length > 1
                  ? `(Lembar ${pageIdx + 1}/${paginatedExpensePages.length})`
                  : ''
              }`,
              title: 'Bukti Pembayaran / Pengeluaran Perjalanan Dinas',
              sectionId: 'pengeluaran',
              editKey: 'pengeluaran',
              isIncomplete: !isPengeluaranComplete,
              incompleteReason: '0 Bukti Bayar',
              isEmptyAttachmentPage: expensePageItems.length === 0,
              isLastPrintablePage:
                lastPrintableSectionId === 'pengeluaran' &&
                pageIdx === paginatedExpensePages.length - 1,
              children: (
                <div className="spj-font-calibri w-[86%] max-w-[86%] mx-auto py-5 space-y-4">
                  <div className="text-center pb-2 border-b border-black space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-black">
                      LAMPIRAN BUKTI PEMBAYARAN / PENGELUARAN · SPT: {activeKuitansi.noSpt}
                    </p>
                    <h3 className="text-[13px] font-extrabold text-black uppercase leading-snug">
                      Pelaksana: {activeKuitansi.atasNama} — Tujuan: {activeKuitansi.tujuan}
                    </h3>
                  </div>

                  {expensePageItems.length === 0 ? (
                    <div className="no-print h-[420px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-amber-300 bg-amber-50/40 rounded-xl">
                      <AlertTriangle className="w-6 h-6 text-amber-600 mb-2" />
                      <p className="text-xs text-slate-700 font-semibold">
                        Belum ada scan nota / tiket / bukti pembayaran pada berkas SPJ ini (0 lampiran).
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Halaman ini otomatis dilewati saat mencetak / mengunduh PDF agar dokumen bebas halaman kosong.
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditSection('pengeluaran')}
                        className="mt-3 px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold cursor-pointer"
                      >
                        + Unggah / Scan Bukti Pembayaran
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 w-full">
                      {expensePageItems.map((exp) => (
                        <div
                          key={exp.id}
                          className="w-full border border-slate-300 rounded-lg p-2.5 bg-white break-inside-avoid space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] border-b border-slate-200 pb-1">
                            <span className="font-bold text-black">
                              {exp.kategori}: {exp.namaPengeluaran}
                            </span>
                            <span className="font-extrabold tabular-nums text-black">
                              {formatRupiah(exp.nominal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-center overflow-hidden">
                            <img
                              src={exp.fotoBuktiDataUrl}
                              alt={exp.namaPengeluaran}
                              referrerPolicy="no-referrer"
                              className={`w-full h-auto object-contain mx-auto ${
                                expensePageItems.length === 1
                                  ? paperSize === 'F4'
                                    ? 'max-h-[930px]'
                                    : 'max-h-[810px]'
                                  : paperSize === 'F4'
                                    ? 'max-h-[430px]'
                                    : 'max-h-[380px]'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ),
            })
          )}
      </div>
    </div>
  );
};

