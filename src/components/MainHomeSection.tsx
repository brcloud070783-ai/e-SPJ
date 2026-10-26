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
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-5 min-w-0 max-w-full overflow-visible">
        {/* 1. HEADER IDENTITAS & TOMBOL AKSI UTAMA (+ SPJ Baru & Semua Berkas) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 border-b border-slate-100 pb-4 min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/assets/aistudio/Desain_tanpa_judul__1__e6c53d2b.png"
              alt="SAPA Kaltara Logo"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl object-contain bg-white p-1 shadow-xs border border-slate-200 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
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
                className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight break-words flex items-center gap-2"
              >
                <span>SAPA Kaltara</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200">
                  Perjalanan Dinas
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="flex-1 sm:flex-initial justify-center min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-xs font-bold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ SPJ Baru</span>
            </button>
            <button
              type="button"
              onClick={onEnterSpjPerjalananDinas}
              className="flex-1 sm:flex-initial justify-center min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-700 shrink-0" />
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
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                      Selisih Rekonsiliasi Bukti
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
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
                  <p className="text-[11px] text-slate-500 break-words">
                    {reconFeedback.helperText}
                  </p>
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
            <div className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4 sm:p-5 space-y-4 min-w-0 overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 min-w-0">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold min-w-0">
                    <span className="text-sky-800 shrink-0">SPJ Terakhir Diedit</span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono text-slate-700 break-all sm:break-normal min-w-0">
                      {activeKuitansi.noSpt}
                    </span>
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        activeStepProgress.isReadyToPrint
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {activeStepProgress.isReadyToPrint ? (
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>{activeStepProgress.statusLabel}</span>
                    </span>
                  </div>

                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
                    {activeKuitansi.atasNama || '(Nama Pelaksana Belum Diisi)'} — Tujuan{' '}
                    {activeKuitansi.tujuan}
                  </h2>

                  <p className="text-xs text-slate-600 break-words">
                    Nilai Kuitansi:{' '}
                    <strong className="font-mono text-slate-900 tabular-nums">
                      {formatRupiah(activeTotal)}
                    </strong>{' '}
                    ({activeKuitansi.rincian.length} rincian) · Tanggal:{' '}
                    {activeKuitansi.tanggalPerjalanan}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenStudioModule('spt')}
                    className="flex-1 sm:flex-initial justify-center min-h-[40px] px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-2xs"
                  >
                    <FileEdit className="w-3.5 h-3.5 shrink-0" />
                    <span>Buka Dokumen SPJ (1–6)</span>
                  </button>
                </div>
              </div>

              {/* Visual 6-Step Progress Bar (Langkah 1 s.d. 6) */}
              <div className="pt-3 border-t border-sky-200/70 space-y-2.5">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700">
                    Kelengkapan Berkas SPJ ({activeStepProgress.completedCount}/
                    {activeStepProgress.totalSteps} Langkah)
                  </span>
                  <span className="font-mono font-extrabold text-slate-900 tabular-nums">
                    {activeStepProgress.progressPercent}%{' '}
                    {activeStepProgress.isReadyToPrint ? 'Siap Cetak' : 'Draf'}
                  </span>
                </div>

                {/* Bar Progress Kontinu */}
                <div
                  role="progressbar"
                  aria-valuenow={activeStepProgress.progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Progress kelengkapan 6 langkah berkas SPJ"
                  className="w-full h-2 rounded-full bg-slate-200/90 overflow-hidden"
                >
                  <div
                    className={`h-full transition-all duration-200 ${
                      activeStepProgress.isReadyToPrint ? 'bg-emerald-600' : 'bg-sky-600'
                    }`}
                    style={{ width: `${activeStepProgress.progressPercent}%` }}
                  />
                </div>

                {/* 6 Segmen Langkah Interaktif (1. SPT s.d. 6. Bukti) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                  {activeStepProgress.steps.map((step) => (
                    <button
                      key={step.key}
                      type="button"
                      onClick={() => onOpenStudioModule(step.key)}
                      className={`text-left px-2.5 py-1.5 rounded-xl border text-[11px] transition-colors cursor-pointer flex items-center justify-between gap-1.5 min-w-0 ${
                        step.completed
                          ? 'bg-white border-emerald-200 text-slate-800 hover:border-emerald-400'
                          : 'bg-amber-50/70 border-amber-200/90 text-amber-900 hover:bg-amber-100/60'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate">{step.shortLabel}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          {step.statusDetail}
                        </p>
                      </div>
                      {step.completed ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                    </button>
                  ))}
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
                <p className="text-xs text-slate-500">
                  Menampilkan maksimal 3 berkas SPJ yang masih menunggu kelengkapan nota/tiket (Step 6).
                </p>
              </div>
              <button
                type="button"
                onClick={onEnterSpjPerjalananDinas}
                className="self-start sm:self-auto text-xs font-bold text-sky-700 hover:text-sky-900 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Kelola Semua di Tab SPJ Dinas ({totalBerkasCount})</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            {topThreeIncompleteSpj.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-emerald-950">
                      Seluruh Berkas SPJ Aktif Sudah Lengkap 100%
                    </p>
                    <p className="text-[11px] text-emerald-800">
                      Semua nilai kuitansi telah terekonsiliasi dengan bukti pembayaran dan siap dicetak.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onEnterSpjPerjalananDinas}
                  className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-50 shrink-0 cursor-pointer"
                >
                  Buka SPJ Dinas
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {topThreeIncompleteSpj.map(
                  ({ item, sequenceNumber, itemTotal, itemRecon, itemFeedback, itemProgress }) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors min-w-0"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
                          <span className="font-mono font-bold text-slate-500">
                            #{sequenceNumber}
                          </span>
                          <span className="font-bold text-slate-900 truncate">
                            {item.atasNama || '(Nama belum diisi)'}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-slate-600 truncate">{item.tujuan}</span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-900 border border-amber-300 text-[11px] font-bold">
                            <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                            <span>{itemFeedback.badgeText}</span>
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="font-mono text-red-700 font-semibold truncate">
                            {item.noSpt}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Kuitansi:{' '}
                            <strong className="font-mono text-slate-800 tabular-nums">
                              {formatRupiah(itemTotal)}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Selisih Bukti:{' '}
                            <strong className="font-mono text-amber-800 tabular-nums">
                              {formatRupiah(itemRecon.selisih)}
                            </strong>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-600">
                            Progress {itemProgress.completedCount}/6 ({itemProgress.progressPercent}%)
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
                          className="flex-1 sm:flex-initial justify-center min-h-[36px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <Receipt className="w-3.5 h-3.5 shrink-0" />
                          <span>Unggah Nota (Step 6)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectKuitansi) {
                              onSelectKuitansi(item.id);
                            }
                            onOpenStudioModule('spt');
                          }}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                        >
                          <span>Edit SPJ</span>
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
