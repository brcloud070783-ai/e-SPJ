import React from 'react';
import {
  FolderOpen,
  ArrowRight,
  FileEdit,
  Camera,
  Receipt,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
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
import { KaltaraEmblem } from './KaltaraEmblem';
import { InfoTooltip } from './UiPatterns';
import { SpjSubSectionKey } from './SpjPerjalananSubHome';

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
  const [showActiveSptDetails, setShowActiveSptDetails] = React.useState(false);

  // 1. SINKRONISASI STATE: Sumber angka tunggal dari kuitansiList.length
  const totalBerkasCount = kuitansiList.length;
  const archivedCount = kuitansiList.filter((k) => k.isArchived).length;
  const activeBerkasList = kuitansiList.filter((k) => !k.isArchived);
  const isEmptyAll = totalBerkasCount === 0;

  const activeTotal = isEmptyAll ? 0 : calculateKuitansiTotal(activeKuitansi.rincian);
  const reconciliation = calculateExpenseReconciliation(activeTotal, docPengeluaranList);
  const reconFeedback = getReconciliationSemanticFeedback(activeTotal, docPengeluaranList);

  // 2. LOGIKA PROGRESS 1 S.D. 6 LANGKAH UNTUK "SPJ TERAKHIR DIEDIT"
  const activeStepProgress = calculateSpjStepProgress({
    kuitansi: activeKuitansi,
    spt: activeSpt,
    docPerjalananCount,
    expenses: docPengeluaranList,
  });

  // Hitung daftar berkas yang status buktinya "Belum Lengkap" (Maksimal 3 untuk Action Center)
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

  const incompleteSpjEntries = spjWithReconciliation.filter(
    (entry) => entry.itemRecon.status === 'Belum Lengkap'
  );
  const topThreeIncompleteSpj = incompleteSpjEntries.slice(0, 3);

  return (
    <section
      aria-labelledby="hero-spj-title"
      className="space-y-4 sm:space-y-5 py-1.5 sm:py-3 min-w-0 max-w-full overflow-x-hidden"
    >
      {/* BERANDA ACTION CENTER CONTAINER */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 space-y-6 min-w-0 max-w-full overflow-visible shadow-sm">
        {/* 1. HEADER IDENTITAS & TOMBOL AKSI UTAMA (+ SPJ Baru & Semua Berkas) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src="/assets/aistudio/9994effd-8e31-467b-8811-b171984eb176_a0480f98.png"
              alt="SAPA Kaltara Logo"
              className="w-12 h-12 sm:w-13 sm:h-13 rounded-2xl object-contain bg-white p-1 shadow-sm border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
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
                className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight break-words flex items-center gap-2 mt-0.5"
              >
                <span>SAPA Kaltara</span>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                  Perjalanan Dinas
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>+ SPJ Baru</span>
            </button>
            <button
              type="button"
              onClick={onEnterSpjPerjalananDinas}
              className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
            >
              <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
              <span>Semua Berkas ({totalBerkasCount})</span>
            </button>
          </div>
        </div>

        {/* 2. EXECUTIVE SUMMARY GRID (2 Kolom Angka Utama di Atas + 1 Baris Penuh Status Rekonsiliasi di Bawah) */}
        <div
          role="region"
          aria-label="Executive Summary Grid"
          className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden divide-y divide-slate-200/80"
        >
          {/* Baris Atas: 2 Kolom Angka Utama (Hemat Ruang Vertikal Mobile) */}
          <div className="grid grid-cols-2 divide-x divide-slate-200/80">
            {/* Kolom 1: Status Berkas SPJ (Sumber state sama persis dengan tombol Semua Berkas) */}
            <button
              type="button"
              onClick={onEnterSpjPerjalananDinas}
              className="text-left p-3 sm:p-4 hover:bg-white/80 transition-colors cursor-pointer min-w-0 space-y-1"
            >
              <div className="flex items-center justify-between gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500">
                <span className="truncate">Status Berkas SPJ</span>
                <Clock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              </div>
              <p className="text-base sm:text-xl font-extrabold font-mono text-slate-900 tabular-nums truncate">
                {totalBerkasCount} Berkas SPJ
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                  {readyToPrintCount} siap cetak · {activeBerkasList.length - readyToPrintCount} draf
                  {archivedCount > 0 ? ` · ${archivedCount} arsip` : ''}
                </p>
              </button>

              {/* Kolom 2: Dokumentasi Kegiatan */}
              <button
                type="button"
                onClick={() =>
                  isEmptyAll ? onCreateNewKuitansi() : onOpenStudioModule('dokumentasi')
                }
                className="text-left p-3 sm:p-4 hover:bg-white/80 transition-colors cursor-pointer min-w-0 space-y-1"
              >
                <div className="flex items-center justify-between gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500">
                  <span className="truncate">Dokumentasi Kegiatan</span>
                  <Camera className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                </div>
                <p className="text-base sm:text-xl font-extrabold font-mono text-slate-900 tabular-nums truncate">
                  {isEmptyAll ? 0 : docPerjalananCount} Foto
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {isEmptyAll
                    ? 'Buat SPJ baru dulu →'
                    : docPerjalananCount > 0
                      ? 'Tergabung di Halaman 5 →'
                      : 'Unggah di Langkah 5 →'}
                </p>
              </button>
            </div>

            {/* Baris Bawah (1 Baris Penuh): Selisih Rekonsiliasi Bukti + Semantic Feedback Badge */}
            {!isEmptyAll && (
              <button
                type="button"
                onClick={() => onOpenStudioModule('pengeluaran')}
                className="w-full text-left p-3.5 sm:p-4 hover:bg-amber-50/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 min-w-0"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Selisih Rekonsiliasi Bukti
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        reconFeedback.tone === 'emerald'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : reconFeedback.tone === 'red'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-amber-100/90 text-amber-900 border-amber-300'
                      }`}
                    >
                      {reconFeedback.tone === 'emerald' ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-700 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                      )}
                      <span>{reconFeedback.badgeText}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                  <div className="text-left sm:text-right">
                    <span className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400">
                      Selisih Bukti Aktif
                    </span>
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-sky-700 shrink-0">
                    <Receipt className="w-3.5 h-3.5 shrink-0" />
                    <span>Step 6</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* 3. KARTU "SPJ TERAKHIR DIEDIT" ATAU EMPTY STATE 0 BERKAS */}
          {isEmptyAll ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 sm:p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                  Daftar Berkas SPJ Kosong (0 Berkas)
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Seluruh berkas SPJ lama telah dibersihkan. Silakan buat berkas SPJ baru atau pulihkan dari cadangan di menu SPJ Dinas.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={onCreateNewKuitansi}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Buat Berkas SPJ Baru</span>
                </button>
                <button
                  type="button"
                  onClick={onEnterSpjPerjalananDinas}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4 text-sky-700" />
                  <span>Buka Menu SPJ Dinas &amp; Cadangan</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 space-y-4 shadow-sm min-w-0 overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      SPJ Terakhir Diedit
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        activeStepProgress.isReadyToPrint
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-amber-50 text-amber-900 border border-amber-200'
                      }`}
                    >
                      {activeStepProgress.isReadyToPrint ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      )}
                      <span>{activeStepProgress.statusLabel}</span>
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                    {activeKuitansi.atasNama || '(Nama Belum Diisi)'} · {activeKuitansi.tujuan}
                  </h2>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="font-mono font-extrabold text-slate-900 text-sm tabular-nums">
                      {formatRupiah(activeTotal)}
                    </span>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={() => setShowActiveSptDetails((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 cursor-pointer transition-colors"
                      aria-expanded={showActiveSptDetails}
                    >
                      <span>{showActiveSptDetails ? 'Sembunyikan No. SPT' : 'Lihat No. SPT'}</span>
                      {showActiveSptDetails ? (
                        <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>
                  </div>

                  {showActiveSptDetails && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                      <div className="flex items-start gap-1.5 font-mono text-slate-800 break-all">
                        <span className="font-bold text-slate-500 shrink-0">No. SPT:</span>
                        <span>{activeKuitansi.noSpt}</span>
                      </div>
                      <div className="text-slate-500 text-[11px]">
                        Tanggal: {activeKuitansi.tanggalPerjalanan} · {activeKuitansi.rincian.length} rincian biaya
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenStudioModule('spt')}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    <FileEdit className="w-4 h-4 shrink-0" />
                    <span>Buka SPJ</span>
                  </button>
                </div>
              </div>

              {/* Minimalist Progress Bar */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                  <span>Kelengkapan Berkas</span>
                  <span className="font-mono font-bold text-slate-900">{activeStepProgress.progressPercent}% Selesai</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-200 ${
                      activeStepProgress.isReadyToPrint ? 'bg-emerald-600' : 'bg-sky-600'
                    }`}
                    style={{ width: `${activeStepProgress.progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

        {/* 4. ACTION LIST: MAKSIMAL 3 BERKAS DENGAN STATUS BUKTI "BELUM LENGKAP" */}
        {!isEmptyAll && (
          <div className="space-y-3 pt-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Perlu Tindakan: Bukti Pembayaran Belum Lengkap
                </h3>
              </div>
              <button
                type="button"
                onClick={onEnterSpjPerjalananDinas}
                className="self-start sm:self-auto text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Kelola Semua ({totalBerkasCount})</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            {topThreeIncompleteSpj.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950">
                      Seluruh Berkas SPJ Aktif Sudah Lengkap 100%
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onEnterSpjPerjalananDinas}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50 shrink-0 cursor-pointer shadow-xs"
                >
                  Buka SPJ Dinas
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topThreeIncompleteSpj.map(
                  ({ item, sequenceNumber, itemTotal, itemRecon, itemFeedback, itemProgress }) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white hover:border-slate-300 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 transition-all shadow-xs min-w-0"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                          <span className="font-mono font-bold text-slate-400">
                            #{sequenceNumber}
                          </span>
                          <span className="font-extrabold text-slate-900 truncate">
                            {item.atasNama || '(Nama belum diisi)'}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-slate-600 font-medium truncate">{item.tujuan}</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>{itemFeedback.badgeText}</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span>
                            Total:{' '}
                            <strong className="font-mono text-slate-900 tabular-nums">
                              {formatRupiah(itemTotal)}
                            </strong>
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span>
                            Selisih Bukti:{' '}
                            <strong className="font-mono text-amber-800 tabular-nums">
                              {formatRupiah(itemRecon.selisih)}
                            </strong>
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {itemProgress.progressPercent}% Selesai
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectKuitansi) {
                              onSelectKuitansi(item.id);
                            }
                            onOpenStudioModule('pengeluaran');
                          }}
                          className="w-full sm:w-auto min-h-[40px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                        >
                          <FileEdit className="w-3.5 h-3.5 shrink-0" />
                          <span>Buka SPJ</span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
