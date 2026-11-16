import React, { useState } from 'react';
import {
  FolderOpen,
  ArrowRight,
  FileEdit,
  Camera,
  Receipt,
  Plus,
  CheckCircle2,
  Clock,
  ChevronDown,
  Wallet,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  AppSettings,
  KuitansiPerjalananDinas,
  DokumentasiPengeluaranItem,
  DokumentasiPerjalananItem,
  SuratPerintahTugas,
} from '../types/spj';
import {
  calculateKuitansiTotal,
  calculateExpenseReconciliation,
  getReconciliationSemanticFeedback,
  calculateSpjStepProgress,
  formatRupiah,
} from '../utils/spjCalculations';
import { InfoTooltip } from './UiPatterns';
import { SpjSubSectionKey } from './SpjPerjalananSubHome';
import { SpjProgressBar } from './SpjStatusBadge';
import { triggerHaptic } from '../utils/nativeMobile';

interface MainHomeSectionProps {
  settings: AppSettings;
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  activeSpt?: SuratPerintahTugas;
  docPerjalananCount: number;
  docPengeluaranList: DokumentasiPengeluaranItem[];
  allDocPerjalanan?: DokumentasiPerjalananItem[];
  allDocPengeluaran?: DokumentasiPengeluaranItem[];
  sptList?: SuratPerintahTugas[];
  isCloudSynced: boolean;
  onEnterSpjPerjalananDinas: () => void;
  onOpenStudioModule: (sub: SpjSubSectionKey) => void;
  onCreateNewKuitansi: () => void;
  onSelectKuitansi?: (id: string) => void;
}

export const MainHomeSection: React.FC<MainHomeSectionProps> = ({
  settings,
  kuitansiList,
  activeKuitansi,
  activeSpt,
  docPerjalananCount,
  docPengeluaranList,
  allDocPerjalanan,
  allDocPengeluaran,
  sptList,
  onEnterSpjPerjalananDinas,
  onOpenStudioModule,
  onCreateNewKuitansi,
  onSelectKuitansi,
}) => {
  // Progressive Disclosure states — secondary information is collapsed by default to prevent cognitive overload
  const [isActiveSpjDetailOpen, setIsActiveSpjDetailOpen] = useState(false);
  const [isMetricsAccordionOpen, setIsMetricsAccordionOpen] = useState(false);
  const [isActionAccordionOpen, setIsActionAccordionOpen] = useState(false);

  // Single source of truth from kuitansiList
  const totalBerkasCount = kuitansiList.length;
  const archivedCount = kuitansiList.filter((k) => k.isArchived).length;
  const activeBerkasList = kuitansiList.filter((k) => !k.isArchived);
  const isEmptyAll = totalBerkasCount === 0;

  const activeTotal = isEmptyAll ? 0 : calculateKuitansiTotal(activeKuitansi.rincian);
  const reconciliation = calculateExpenseReconciliation(activeTotal, docPengeluaranList);
  const reconFeedback = getReconciliationSemanticFeedback(activeTotal, docPengeluaranList);

  const activeStepProgress = calculateSpjStepProgress({
    kuitansi: activeKuitansi,
    spt: activeSpt,
    docPerjalananCount,
    expenses: docPengeluaranList,
  });

  const spjWithReconciliation = activeBerkasList.map((item, idx) => {
    const itemTotal = calculateKuitansiTotal(item.rincian);
    const itemExpenses = allDocPengeluaran
      ? allDocPengeluaran.filter((e) => e.kuitansiId === item.id)
      : item.id === activeKuitansi.id
        ? docPengeluaranList
        : [];
    const itemPhotosCount = allDocPerjalanan
      ? allDocPerjalanan.filter((d) => d.kuitansiId === item.id).length
      : item.id === activeKuitansi.id
        ? docPerjalananCount
        : 0;
    const linkedSpt = sptList?.find((s) => s.kuitansiId === item.id);
    const itemRecon = calculateExpenseReconciliation(itemTotal, itemExpenses);
    const itemFeedback = getReconciliationSemanticFeedback(itemTotal, itemExpenses);
    const itemProgress = calculateSpjStepProgress({
      kuitansi: item,
      spt: linkedSpt,
      docPerjalananCount: itemPhotosCount,
      expenses: itemExpenses,
    });

    return {
      item,
      sequenceNumber: idx + 1,
      itemTotal,
      itemExpensesCount: itemExpenses.length,
      itemRecon,
      itemFeedback,
      itemProgress,
    };
  });

  const readyToPrintCount = spjWithReconciliation.filter(
    (entry) => entry.itemProgress.isReadyToPrint
  ).length;
  const draftCount = Math.max(0, activeBerkasList.length - readyToPrintCount);

  const incompleteSpjEntries = spjWithReconciliation.filter(
    (entry) => entry.itemRecon.status === 'Belum Lengkap'
  );
  const topThreeIncompleteSpj = incompleteSpjEntries.slice(0, 3);

  return (
    <section
      aria-labelledby="hero-spj-title"
      className="space-y-5 sm:space-y-6 py-2 sm:py-4 min-w-0 max-w-4xl mx-auto overflow-x-hidden"
    >
      {/* 1. HEADER UTAMA & AKSI CEPAT (Generous Whitespace >= 20px, Large Tap Targets >= 48px) */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xs">
        <div className="flex items-start gap-4 min-w-0">
          <img
            src="/icon.svg"
            alt="Logo SAPA Kaltara"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-contain shrink-0 shadow-2xs"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-xs font-semibold text-slate-500 truncate">
                {settings.namaDinas}
              </p>
              <InfoTooltip
                variant="info"
                align="right"
                position="bottom"
                title="Pejabat Penandatangan Aktif"
                content={`PA: ${settings.namaPenggunaAnggaran} · Bendahara: ${settings.namaBendahara}`}
              />
            </div>

            <h1
              id="hero-spj-title"
              className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug"
            >
              Dasbor SPJ Perjalanan Dinas
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
              Lanjutkan pengisian berkas yang sedang aktif atau buat perjalanan dinas baru.
            </p>
          </div>
        </div>

        {/* Primary & Secondary Action Buttons — Minimum 48px Touch Target & 16px+ Spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onCreateNewKuitansi();
            }}
            className="min-h-[48px] px-5 py-3 rounded-2xl bg-sky-700 hover:bg-sky-800 active:scale-[0.99] text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Buat SPJ Baru</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onEnterSpjPerjalananDinas();
            }}
            title="Pindah ke halaman SPJ Dinas untuk mengelola seluruh berkas dan arsip"
            className="min-h-[48px] px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 active:scale-[0.99] text-slate-800 text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
            <span>Semua Berkas SPJ ({totalBerkasCount})</span>
          </button>
        </div>
      </div>

      {/* 2. KARTU UTAMA: "SPJ TERAKHIR DIEDIT" (Fokus Visual Utama di Beranda) */}
      {isEmptyAll ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto">
            <FolderOpen className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
              Belum Ada Berkas SPJ
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Mulai dengan membuat berkas perjalanan dinas baru atau pulihkan data cadangan di menu SPJ Dinas.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="min-h-[48px] px-5 py-3 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Berkas SPJ Baru</span>
            </button>
            <button
              type="button"
              onClick={onEnterSpjPerjalananDinas}
              className="min-h-[48px] px-5 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 text-sky-700" />
              <span>Buka Menu SPJ &amp; Cadangan</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-7 space-y-5 shadow-2xs">
          {/* Top Kicker & Completion Status */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              SPJ Terakhir Diedit
            </span>
            <span
              className={`text-xs font-bold ${
                activeStepProgress.isReadyToPrint ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {activeStepProgress.isReadyToPrint
                ? 'Siap Cetak 100%'
                : `Kelengkapan ${activeStepProgress.progressPercent}%`}
            </span>
          </div>

          {/* Primary Content: Employee Name, Destination & Total Amount */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5 min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
                {activeKuitansi.atasNama || '(Nama Pelaksana Belum Diisi)'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 truncate">
                {activeKuitansi.tujuan || 'Tujuan belum diisi'}
                {activeKuitansi.tanggalPerjalanan
                  ? ` · ${activeKuitansi.tanggalPerjalanan}`
                  : ''}
              </p>
            </div>

            <div className="sm:text-right shrink-0">
              <span className="block text-xs text-slate-500">Total Kuitansi</span>
              <span className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 tabular-nums">
                {formatRupiah(activeTotal)}
              </span>
            </div>
          </div>

          {/* Clean Progress Bar */}
          <div>
            <SpjProgressBar
              percent={activeStepProgress.progressPercent}
              tone={activeStepProgress.isReadyToPrint ? 'green' : 'yellow'}
              showLabel={false}
              size="sm"
            />
          </div>

          {/* Primary Action & Progressive Disclosure Toggle for Active SPJ Details */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('medium');
                onOpenStudioModule('spt');
              }}
              className="min-h-[48px] px-6 py-3 rounded-2xl bg-sky-700 hover:bg-sky-800 active:scale-[0.99] text-white text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <FileEdit className="w-4 h-4 shrink-0" />
              <span>Lanjutkan Edit SPJ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setIsActiveSpjDetailOpen((prev) => !prev);
              }}
              aria-expanded={isActiveSpjDetailOpen}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <span>
                {isActiveSpjDetailOpen
                  ? 'Sembunyikan Rincian & Pintasan'
                  : 'Rincian SPT & Pintasan Dokumen'}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                  isActiveSpjDetailOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </div>

          {/* Progressive Disclosure Content: Nomor SPT & Direct Module Shortcuts */}
          {isActiveSpjDetailOpen && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <p className="text-xs font-bold text-slate-900">
                  Nomor Surat Perintah Tugas (SPT)
                </p>
                <p className="text-xs sm:text-sm font-mono text-slate-700 break-all">
                  {activeKuitansi.noSpt || '-'}
                </p>
                <p className="text-xs text-slate-500">
                  {activeKuitansi.rincian.length} item rincian biaya ·{' '}
                  {docPerjalananCount} foto kegiatan · {docPengeluaranList.length} nota pengeluaran
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenStudioModule('kuitansi');
                  }}
                  className="min-h-[48px] p-4 rounded-2xl border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/40 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900">
                      4. Kuitansi Dinas
                    </span>
                    <span className="block text-xs text-slate-500 truncate mt-0.5">
                      {activeKuitansi.rincian.length} rincian biaya
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenStudioModule('dokumentasi');
                  }}
                  className="min-h-[48px] p-4 rounded-2xl border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/40 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900">
                      5. Foto Kegiatan
                    </span>
                    <span className="block text-xs text-slate-500 truncate mt-0.5">
                      {docPerjalananCount} foto terunggah
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenStudioModule('pengeluaran');
                  }}
                  className="min-h-[48px] p-4 rounded-2xl border border-slate-200 hover:border-sky-300 bg-white hover:bg-sky-50/40 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-slate-900">
                      6. Bukti Nota
                    </span>
                    <span className="block text-xs text-slate-500 truncate mt-0.5">
                      {docPengeluaranList.length} bukti pengeluaran
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. PROGRESSIVE DISCLOSURE ACCORDION 1: RINGKASAN METRIK & REKONSILIASI BUKTI */}
      {!isEmptyAll && (
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsMetricsAccordionOpen((prev) => !prev);
            }}
            aria-expanded={isMetricsAccordionOpen}
            className="w-full min-h-[68px] p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Ringkasan Status &amp; Rekonsiliasi Bukti
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 truncate">
                  {readyToPrintCount} siap cetak · {draftCount} draf · Selisih bukti{' '}
                  <span className="font-mono font-semibold text-slate-700 tabular-nums">
                    {formatRupiah(reconciliation.selisih)}
                  </span>
                </p>
              </div>
            </div>

            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-200 ${
                  isMetricsAccordionOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {isMetricsAccordionOpen && (
            <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                {/* Kartu Metrik 1: Status Berkas */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onEnterSpjPerjalananDinas();
                  }}
                  className="text-left p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-100/70 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                    <span>Total Berkas SPJ</span>
                    <Clock className="w-4 h-4 text-sky-700 shrink-0" />
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 tabular-nums">
                    {totalBerkasCount} Berkas
                  </p>
                  <p className="text-xs text-slate-500">
                    {readyToPrintCount} siap cetak · {draftCount} draf
                    {archivedCount > 0 ? ` · ${archivedCount} arsip` : ''}
                  </p>
                </button>

                {/* Kartu Metrik 2: Dokumentasi Kegiatan */}
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    onOpenStudioModule('dokumentasi');
                  }}
                  className="text-left p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 hover:bg-slate-100/70 transition-colors cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-500">
                    <span>Dokumentasi Berkas Aktif</span>
                    <Camera className="w-4 h-4 text-emerald-700 shrink-0" />
                  </div>
                  <p className="text-lg sm:text-xl font-extrabold font-mono text-slate-900 tabular-nums">
                    {docPerjalananCount} Foto Kegiatan
                  </p>
                  <p className="text-xs text-slate-500">
                    {docPerjalananCount > 0
                      ? 'Ketuk untuk melihat atau mencetak foto →'
                      : 'Ketuk untuk mengunggah foto kegiatan →'}
                  </p>
                </button>
              </div>

              {/* Kartu Rincian Selisih Rekonsiliasi Bukti */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900">
                      Selisih Rekonsiliasi Bukti Aktif
                    </h4>
                    <span
                      className={`text-xs font-bold ${
                        reconFeedback.tone === 'emerald'
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      · {reconFeedback.tone === 'emerald' ? 'Lengkap & Sesuai' : 'Belum Lengkap'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Nilai Kuitansi:{' '}
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {formatRupiah(activeTotal)}
                    </span>{' '}
                    · Nota Terlampir:{' '}
                    <span className="font-mono font-semibold text-slate-700 tabular-nums">
                      {formatRupiah(reconciliation.totalDocumented)}
                    </span>
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200/80 shrink-0">
                  <div className="sm:text-right">
                    <span className="block text-xs text-slate-500">Selisih Bukti</span>
                    <span
                      className={`text-base sm:text-lg font-extrabold font-mono tabular-nums ${
                        reconciliation.selisih === 0 && activeTotal > 0
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatRupiah(reconciliation.selisih)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      onOpenStudioModule('pengeluaran');
                    }}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-sky-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <Receipt className="w-4 h-4 shrink-0" />
                    <span>Kelola Bukti</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. PROGRESSIVE DISCLOSURE ACCORDION 2: BERKAS PERLU TINDAKAN (BUKTI BELUM LENGKAP) */}
      {!isEmptyAll && (
        <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-2xs">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setIsActionAccordionOpen((prev) => !prev);
            }}
            aria-expanded={isActionAccordionOpen}
            className="w-full min-h-[68px] p-5 sm:p-6 text-left flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  incompleteSpjEntries.length === 0
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {incompleteSpjEntries.length === 0 ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Perlu Tindakan: Bukti Pembayaran Belum Lengkap
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 truncate">
                  {incompleteSpjEntries.length === 0
                    ? 'Seluruh berkas SPJ aktif sudah lengkap 100%'
                    : `${incompleteSpjEntries.length} berkas masih memiliki selisih bukti nota`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <span className="font-mono text-xs font-extrabold text-slate-700 tabular-nums">
                {incompleteSpjEntries.length} Berkas
              </span>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                <ChevronDown
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActionAccordionOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>
          </button>

          {isActionAccordionOpen && (
            <div className="p-5 sm:p-6 pt-0 border-t border-slate-100 space-y-4">
              {topThreeIncompleteSpj.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-emerald-950">
                        Seluruh Berkas SPJ Aktif Sudah Lengkap 100%
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Semua bukti pengeluaran telah sesuai dengan nilai kuitansi.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onEnterSpjPerjalananDinas}
                    className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50 shrink-0 cursor-pointer"
                  >
                    Buka Daftar SPJ
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5 pt-4">
                  {topThreeIncompleteSpj.map(
                    ({ item, sequenceNumber, itemTotal, itemRecon, itemProgress }) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors min-w-0"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-mono text-xs font-bold text-slate-400 tabular-nums">
                              #{sequenceNumber}
                            </span>
                            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                              {item.atasNama || '(Nama belum diisi)'}
                            </h4>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-xs sm:text-sm text-slate-500 truncate">
                              {item.tujuan}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              Total:{' '}
                              <strong className="font-mono font-bold text-slate-900 tabular-nums">
                                {formatRupiah(itemTotal)}
                              </strong>
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span>
                              Kurang bukti:{' '}
                              <strong className="font-mono font-bold text-amber-800 tabular-nums">
                                {formatRupiah(itemRecon.selisih)}
                              </strong>
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="font-mono tabular-nums">
                              Kelengkapan {itemProgress.progressPercent}%
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic('light');
                            if (onSelectKuitansi) {
                              onSelectKuitansi(item.id);
                            }
                            onOpenStudioModule('pengeluaran');
                          }}
                          className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span>Lengkapi Bukti</span>
                        </button>
                      </div>
                    )
                  )}

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        onEnterSpjPerjalananDinas();
                      }}
                      className="min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-sky-700 hover:text-sky-900 hover:bg-sky-50 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Kelola Semua Berkas ({totalBerkasCount})</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
