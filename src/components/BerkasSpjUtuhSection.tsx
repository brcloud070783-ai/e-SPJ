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
  Sparkles,
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const spec = getPaperDimensions(paperSize);

  const [previewScale, setPreviewScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const availW = Math.max(260, Math.min(window.innerWidth - 36, 920));
      return Number(Math.min(1, availW / spec.widthPx).toFixed(4));
    }
    return 1;
  });

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

  const totalKuitansi = calculateKuitansiTotal(activeKuitansi.rincian);
  const totalPagesCount =
    4 + paginatedDocPages.length + paginatedExpensePages.length;

  const triggerPrintWithTitle = (scope: DossierSectionId, customLabel?: string) => {
    const prevScope = printScope;
    const prevTitle = document.title;
    const cleanName = (activeKuitansi.atasNama || 'Pelaksana')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_');
    const cleanSpt = (activeKuitansi.noSpt || 'SPT')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 28);

    const filePrefix =
      scope === 'all'
        ? 'Berkas_SPJ_Utuh'
        : `SPJ_${(customLabel || scope).replace(/\s+/g, '_')}`;

    document.title = `${filePrefix}_${cleanName}_${cleanSpt}`;

    if (scope !== prevScope) {
      setPrintScope(scope);
      window.setTimeout(() => {
        window.print();
        document.title = prevTitle;
        setPrintScope(prevScope);
      }, 120);
    } else {
      window.print();
      window.setTimeout(() => {
        document.title = prevTitle;
      }, 300);
    }
  };

  const sectionPills: Array<{
    id: DossierSectionId;
    num: string;
    label: string;
    editKey?: SpjSubSectionKey;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      id: 'all',
      num: '1–6',
      label: `Semua Halaman (${totalPagesCount} Hal)`,
      icon: Layers,
    },
    {
      id: 'spt',
      num: '1',
      label: 'SPT (Surat Tugas)',
      editKey: 'spt',
      icon: FileCheck,
    },
    {
      id: 'spd',
      num: '2',
      label: 'SPD Depan',
      editKey: 'spd',
      icon: ClipboardList,
    },
    {
      id: 'visum',
      num: '3',
      label: 'Visum (SPD Belakang)',
      editKey: 'visum',
      icon: Stamp,
    },
    {
      id: 'kuitansi',
      num: '4',
      label: 'Kuitansi SPPD',
      editKey: 'kuitansi',
      icon: Banknote,
    },
    {
      id: 'dokumentasi',
      num: '5',
      label: `Dokumentasi (${docPerjalanan.length})`,
      editKey: 'dokumentasi',
      icon: Camera,
    },
    {
      id: 'pengeluaran',
      num: '6',
      label: `Bukti Bayar (${docPengeluaran.length})`,
      editKey: 'pengeluaran',
      icon: Receipt,
    },
  ];

  const isSectionVisible = (sec: Exclude<DossierSectionId, 'all'>) =>
    printScope === 'all' || printScope === sec;

  const renderPageWrapper = (params: {
    key: string;
    pageNumberLabel: string;
    title: string;
    sectionId: Exclude<DossierSectionId, 'all'>;
    editKey: SpjSubSectionKey;
    children: React.ReactNode;
  }) => {
    const scaledW = Math.round(spec.widthPx * previewScale);
    const scaledH = Math.round(spec.minHeightPx * previewScale);

    return (
      <div
        key={params.key}
        className="spj-dossier-page-wrapper space-y-2 min-w-0 max-w-full"
      >
        {/* Top Action Bar for Each Page on Screen (Hidden in Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/90 rounded-xl px-3.5 py-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-sky-700 text-white text-[11px] font-extrabold font-mono shrink-0">
              {params.pageNumberLabel}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {params.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onEditSection(params.editKey)}
              className="min-h-[30px] px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-200 text-slate-700 hover:text-sky-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-sky-700" />
              <span>Edit Bagian Ini</span>
            </button>
            <button
              type="button"
              onClick={() => triggerPrintWithTitle(params.sectionId, params.title)}
              className="min-h-[30px] px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
              title={`Cetak atau simpan PDF khusus ${params.title}`}
            >
              <Printer className="w-3 h-3 text-emerald-700" />
              <span>Cetak Halaman Ini</span>
            </button>
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
    <div ref={containerRef} className="space-y-4 min-w-0 max-w-full overflow-x-hidden">
      {/* Print CSS Rules for Multi-Page Unified PDF Output */}
      <style>{`
        @media print {
          @page {
            size: ${spec.cssPageSize};
            margin: 0;
          }
          .spj-dossier-page-wrapper {
            margin: 0 !important;
            padding: 0 !important;
            break-after: page !important;
            page-break-after: always !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .spj-dossier-page-wrapper:last-child {
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
            margin: 0 !important;
            padding: 0 !important;
          }
          .spj-dossier-sheet {
            transform: none !important;
            width: ${paperSize === 'F4' ? '215mm' : '210mm'} !important;
            min-height: ${paperSize === 'F4' ? '330mm' : '297mm'} !important;
            max-height: ${paperSize === 'F4' ? '330mm' : '297mm'} !important;
            margin: 0 auto !important;
            padding: 6mm 8mm !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* UNIFIED DOSSIER CONTROL PANEL (Hidden in Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>1 Kesatuan Berkas SPJ Perjalanan Dinas Utuh</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {activeKuitansi.atasNama || 'Pelaksana'} — {activeKuitansi.tujuan} ({formatRupiah(totalKuitansi)})
            </h2>
            <p className="text-xs text-slate-500">
              Menyatukan <strong className="text-slate-700">SPT, SPD Depan, Visum, Kuitansi, Dokumentasi, dan Bukti Pembayaran</strong> dalam 1 file cetak / PDF multi-halaman utuh ({totalPagesCount} halaman {paperSize}).
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

        {/* Filter Mode Cetak: Semua Halaman (1 File Utuh) vs Per Halaman / Bagian */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Pilih Tampilan &amp; Mode Cetak (Semua Halaman atau Per Bagian):</span>
            </span>
            {printScope !== 'all' && (
              <button
                type="button"
                onClick={() => triggerPrintWithTitle(printScope)}
                className="text-xs font-extrabold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Bagian Ini Saja</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {sectionPills.map((pill) => {
              const Icon = pill.icon;
              const active = printScope === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setPrintScope(pill.id)}
                  className={`min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-all cursor-pointer ${
                    active
                      ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {pill.num}. {pill.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* CONTINUOUS MULTI-PAGE OFFICIAL SPJ DOSSIER                            */}
      {/* ===================================================================== */}
      <div className="space-y-6">
        {/* HALAMAN 1: SURAT PERINTAH TUGAS (SPT) */}
        {isSectionVisible('spt') &&
          renderPageWrapper({
            key: 'dossier-page-spt',
            pageNumberLabel: 'Bagian 1 / 6',
            title: 'Surat Perintah Tugas (SPT)',
            sectionId: 'spt',
            editKey: 'spt',
            children: (
              <div className="p-6 sm:p-10 print:p-2">
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
            pageNumberLabel: 'Bagian 2 / 6',
            title: 'Surat Perjalanan Dinas (SPD Depan)',
            sectionId: 'spd',
            editKey: 'spd',
            children: (
              <div className="py-5 px-0 print:py-1">
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
            pageNumberLabel: 'Bagian 3 / 6',
            title: 'Lembar Visum Perjalanan Dinas (SPD Belakang)',
            sectionId: 'visum',
            editKey: 'visum',
            children: (
              <div className="p-6 sm:p-8 print:p-2">
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
            pageNumberLabel: 'Bagian 4 / 6',
            title: 'Kuitansi & Rincian Perhitungan Biaya Perjalanan Dinas',
            sectionId: 'kuitansi',
            editKey: 'kuitansi',
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
              pageNumberLabel: `Bagian 5 / 6 ${
                paginatedDocPages.length > 1
                  ? `(Lembar ${pageIdx + 1}/${paginatedDocPages.length})`
                  : ''
              }`,
              title: 'Dokumentasi Kegiatan Perjalanan Dinas',
              sectionId: 'dokumentasi',
              editKey: 'dokumentasi',
              children: (
                <div
                  className="mx-auto my-auto flex flex-col justify-between py-4 box-border overflow-hidden"
                  style={{
                    width: `${gridDim.printAreaWidthPx}px`,
                    height: `${gridDim.printAreaHeightPx}px`,
                    maxHeight: `${gridDim.printAreaHeightPx}px`,
                  }}
                >
                  <div className="text-center pb-2 border-b border-slate-950 space-y-0.5 shrink-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      DOKUMENTASI PERJALANAN DINAS · SPT: {activeKuitansi.noSpt}
                    </p>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                      {activeKuitansi.untukPengeluaran ||
                        activeKuitansi.tujuan ||
                        'Perjalanan Dinas'}
                    </h3>
                  </div>

                  {pageItems.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-300 rounded-xl my-4">
                      <p className="text-xs text-slate-500 italic">
                        Belum ada foto dokumentasi kegiatan pada berkas SPJ ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditSection('dokumentasi')}
                        className="no-print mt-3 px-3.5 py-1.5 rounded-xl bg-sky-700 text-white text-xs font-bold cursor-pointer"
                      >
                        + Unggah Foto Dokumentasi
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`grid gap-2.5 sm:gap-3 w-full flex-1 h-full min-h-0 items-center justify-items-center overflow-hidden pt-2 ${
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
              pageNumberLabel: `Bagian 6 / 6 ${
                paginatedExpensePages.length > 1
                  ? `(Lembar ${pageIdx + 1}/${paginatedExpensePages.length})`
                  : ''
              }`,
              title: 'Bukti Pembayaran / Pengeluaran Perjalanan Dinas',
              sectionId: 'pengeluaran',
              editKey: 'pengeluaran',
              children: (
                <div className="w-[86%] max-w-[86%] mx-auto py-6 space-y-4">
                  <div className="text-center pb-2 border-b border-slate-950 space-y-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                      LAMPIRAN BUKTI PEMBAYARAN / PENGELUARAN · SPT: {activeKuitansi.noSpt}
                    </p>
                    <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                      Pelaksana: {activeKuitansi.atasNama} — Tujuan: {activeKuitansi.tujuan}
                    </h3>
                  </div>

                  {expensePageItems.length === 0 ? (
                    <div className="h-[420px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-300 rounded-xl">
                      <p className="text-xs text-slate-500 italic">
                        Belum ada scan nota / tiket / bukti pembayaran pada berkas SPJ ini.
                      </p>
                      <button
                        type="button"
                        onClick={() => onEditSection('pengeluaran')}
                        className="no-print mt-3 px-3.5 py-1.5 rounded-xl bg-sky-700 text-white text-xs font-bold cursor-pointer"
                      >
                        + Unggah / Scan Bukti Pembayaran
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-5 w-full">
                      {expensePageItems.map((exp) => (
                        <div
                          key={exp.id}
                          className="w-full border border-slate-300 rounded-lg p-2.5 bg-white break-inside-avoid space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] border-b border-slate-200 pb-1">
                            <span className="font-bold text-slate-900">
                              {exp.kategori}: {exp.namaPengeluaran}
                            </span>
                            <span className="font-mono font-extrabold text-slate-900">
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
                                    ? 'max-h-[960px]'
                                    : 'max-h-[840px]'
                                  : paperSize === 'F4'
                                    ? 'max-h-[450px]'
                                    : 'max-h-[395px]'
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
