import React from 'react';
import {
  FolderOpen,
  ArrowRight,
  Banknote,
  FileEdit,
  Camera,
  Receipt,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  AppSettings,
  KuitansiPerjalananDinas,
  DokumentasiPengeluaranItem,
} from '../types/spj';
import {
  calculateKuitansiTotal,
  calculateExpenseReconciliation,
  formatRupiah,
} from '../utils/spjCalculations';
import { KaltaraEmblem } from './KaltaraEmblem';
import { LabeledIcon, InfoTooltip } from './UiPatterns';
import { SpjSubSectionKey } from './SpjPerjalananSubHome';

interface MainHomeSectionProps {
  settings: AppSettings;
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  docPerjalananCount: number;
  docPengeluaranList: DokumentasiPengeluaranItem[];
  isCloudSynced: boolean;
  onEnterSpjPerjalananDinas: () => void;
  onOpenStudioModule: (sub: SpjSubSectionKey) => void;
  onCreateNewKuitansi: () => void;
}

export const MainHomeSection: React.FC<MainHomeSectionProps> = ({
  settings,
  kuitansiList,
  activeKuitansi,
  docPerjalananCount,
  docPengeluaranList,
  isCloudSynced,
  onEnterSpjPerjalananDinas,
  onOpenStudioModule,
  onCreateNewKuitansi,
}) => {
  const activeTotal = calculateKuitansiTotal(activeKuitansi.rincian);
  const reconciliation = calculateExpenseReconciliation(activeTotal, docPengeluaranList);
  const localDraftCount = kuitansiList.filter((k) => k.statusSync === 'Tersimpan Lokal').length;

  return (
    <section aria-labelledby="hero-spj-title" className="space-y-5 py-2 sm:py-4 min-w-0 max-w-full overflow-x-hidden">
      {/* 1. ACTIONABLE HERO & RINGKASAN METRIK NYATA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 space-y-6 min-w-0 max-w-full overflow-hidden">
        {/* Baris Identitas & Sapaan Dashboard */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 min-w-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <KaltaraEmblem className="w-10 h-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
                  {settings.namaDinas}
                </p>
                <InfoTooltip
                  variant="info"
                  align="left"
                  title="Pejabat Penandatangan Aktif"
                  content={`PA: ${settings.namaPenggunaAnggaran} · Bendahara: ${settings.namaBendahara}`}
                />
              </div>
              <h1
                id="hero-spj-title"
                className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight break-words"
              >
                Dashboard SPJ Perjalanan Dinas
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="flex-1 sm:flex-initial justify-center min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>SPJ Baru</span>
            </button>
            <button
              type="button"
              onClick={onEnterSpjPerjalananDinas}
              className="flex-1 sm:flex-initial justify-center min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Semua Berkas ({kuitansiList.length})</span>
            </button>
          </div>
        </div>

        {/* 3 Metrik Nyata (Actionable Metrics Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 min-w-0">
          {/* Metrik 1: Jumlah Berkas SPJ */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-1 min-w-0">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Status Berkas SPJ</span>
              <Clock className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            </div>
            <p className="text-lg font-extrabold font-mono text-slate-900 tabular-nums truncate">
              {localDraftCount > 0
                ? `${localDraftCount} Berkas SPJ`
                : `${kuitansiList.length} Berkas SPJ`}
            </p>
            <p className="text-[11px] text-slate-500">
              Tersimpan di perangkat &amp; siap dicetak
            </p>
          </div>

          {/* Metrik 2: Total Rekonsiliasi Tertunda */}
          <button
            type="button"
            onClick={() => onOpenStudioModule('pengeluaran')}
            className="text-left rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30 p-4 space-y-1 transition-colors cursor-pointer min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Selisih Rekonsiliasi Bukti</span>
              {reconciliation.selisih === 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              )}
            </div>
            <p className="text-lg font-extrabold font-mono text-slate-900 tabular-nums truncate">
              {formatRupiah(reconciliation.selisih)}
            </p>
            <p className="text-[11px] text-slate-500">
              Kelengkapan bukti: {reconciliation.persentaseLengkap}% ({docPengeluaranList.length}{' '}
              nota) · Ketuk untuk lengkapi →
            </p>
          </button>

          {/* Metrik 3: Dokumentasi Kegiatan */}
          <button
            type="button"
            onClick={() => onOpenStudioModule('dokumentasi')}
            className="text-left rounded-xl border border-slate-200 hover:border-emerald-400 bg-slate-50/70 hover:bg-emerald-50/30 p-4 space-y-1 transition-colors cursor-pointer min-w-0"
          >
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Dokumentasi Kegiatan</span>
              <Camera className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            </div>
            <p className="text-lg font-extrabold font-mono text-slate-900 tabular-nums truncate">
              {docPerjalananCount} Berkas
            </p>
            <p className="text-[11px] text-slate-500">
              {docPerjalananCount > 0
                ? 'Siap dilampirkan pada lembar cetak →'
                : 'Belum ada foto kegiatan · Ketuk untuk unggah →'}
            </p>
          </button>
        </div>

        {/* Kartu Akses 1-Klik ke SPJ Terakhir yang Diedit */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 min-w-0 overflow-hidden">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-sky-800 font-bold min-w-0">
              <span className="shrink-0">SPJ Terakhir Diedit</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono break-all sm:break-normal min-w-0">{activeKuitansi.noSpt}</span>
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 truncate">
              {activeKuitansi.atasNama} — Tujuan {activeKuitansi.tujuan}
            </h2>
            <p className="text-xs text-slate-600 break-words">
              Nilai Kuitansi:{' '}
              <strong className="font-mono text-slate-900">{formatRupiah(activeTotal)}</strong> (
              {activeKuitansi.rincian.length} rincian) · Tanggal: {activeKuitansi.tanggalPerjalanan}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenStudioModule('berkas-utuh')}
              className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>1 File SPJ Utuh (PDF)</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
            <button
              type="button"
              onClick={() => onOpenStudioModule('spt')}
              className="w-full sm:w-auto justify-center min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileEdit className="w-3.5 h-3.5 shrink-0" />
              <span>Edit Berkas SPJ (1–6)</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>

        {/* 3 Labeled Icons + Microcopy (Pintasan 1-Klik ke Tahapan Studio SPJ Terpadu) */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => onOpenStudioModule('spt')}
            className="text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LabeledIcon
              size="sm"
              icon={Banknote}
              iconBgClass="bg-sky-50 text-sky-700 border border-sky-200/70"
              label="1–4. SPT, SPD, Visum & Kuitansi"
              microcopy="Edit naskah SPT, SPD Depan, Visum & Kuitansi SPPD."
            />
          </button>
          <button
            type="button"
            onClick={() => onOpenStudioModule('dokumentasi')}
            className="text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LabeledIcon
              size="sm"
              icon={Camera}
              iconBgClass="bg-emerald-50 text-emerald-700 border border-emerald-200/70"
              label="5. Dokumentasi Kegiatan"
              microcopy="Unggah foto kegiatan lapangan dalam berkas SPJ."
            />
          </button>
          <button
            type="button"
            onClick={() => onOpenStudioModule('pengeluaran')}
            className="text-left p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <LabeledIcon
              size="sm"
              icon={Receipt}
              iconBgClass="bg-amber-50 text-amber-700 border border-amber-200/70"
              label="6. Bukti Pembayaran"
              microcopy="Scan nota, tiket & invoice terintegrasi 1 berkas."
            />
          </button>
        </div>
      </div>
    </section>
  );
};
