import React from 'react';
import {
  Banknote,
  FileCheck,
  ClipboardList,
  Stamp,
  Camera,
  Receipt,
  ArrowRight,
  Plus,
  MapPin,
  User,
  Calendar,
  Trash2,
  Copy,
  FolderOpen,
  CheckCircle2,
  FileBadge,
  Check,
  Pencil,
  Layers,
  Printer,
} from 'lucide-react';
import {
  KuitansiPerjalananDinas,
  DokumentasiPerjalananItem,
  DokumentasiPengeluaranItem,
  SuratPerintahTugas,
} from '../types/spj';
import {
  calculateKuitansiTotal,
  calculateExpenseReconciliation,
  formatRupiah,
} from '../utils/spjCalculations';
import { InfoTooltip, UnifiedMediaCard } from './UiPatterns';

export type SpjSubSectionKey =
  | 'spt'
  | 'spd'
  | 'visum'
  | 'kuitansi'
  | 'dokumentasi'
  | 'pengeluaran'
  | 'berkas-utuh'
  | 'surat-tugas';

interface SpjPerjalananSubHomeProps {
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  activeSpt?: SuratPerintahTugas;
  onSelectKuitansi: (id: string) => void;
  onCreateNewKuitansi: () => void;
  onDuplicateKuitansi?: () => void;
  onDeleteKuitansi?: (kuitansi: KuitansiPerjalananDinas) => void;
  docPerjalanan: DokumentasiPerjalananItem[];
  docPengeluaran: DokumentasiPengeluaranItem[];
  allDocPerjalanan?: DokumentasiPerjalananItem[];
  allDocPengeluaran?: DokumentasiPengeluaranItem[];
  onOpenSubSection: (section: SpjSubSectionKey) => void;
}

export const SpjPerjalananSubHome: React.FC<SpjPerjalananSubHomeProps> = ({
  kuitansiList,
  activeKuitansi,
  activeSpt,
  onSelectKuitansi,
  onCreateNewKuitansi,
  onDuplicateKuitansi,
  onDeleteKuitansi,
  docPerjalanan,
  docPengeluaran,
  onOpenSubSection,
}) => {
  const totalKuitansi = calculateKuitansiTotal(activeKuitansi.rincian);
  const reconciliation = calculateExpenseReconciliation(totalKuitansi, docPengeluaran);
  const formattedUpdatedDate = activeKuitansi.updatedAt
    ? new Date(activeKuitansi.updatedAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : activeKuitansi.tanggalPerjalanan;

  const sptPegawaiCount = activeSpt?.pegawaiList?.length || 1;
  const spdNomor =
    activeSpt?.spdData?.nomorSpd?.trim() || '000.1.2.3/ ... /SPPD/Disdikbud/2026';

  // 6 Komponen Tak Terpisahkan dalam 1 Berkas SPJ Utuh
  const subModules: Array<{
    key: SpjSubSectionKey;
    title: string;
    subtitle: string;
    description: string;
    highlightValue: string;
    metadataItems: string[];
    statusText: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBgClass: string;
  }> = [
    {
      key: 'spt',
      title: '1. Surat Perintah Tugas (SPT)',
      subtitle: 'Halaman 1 · Naskah Penugasan Resmi',
      description:
        'Dasar hukum penugasan, daftar pegawai ditugaskan, maksud perjalanan, waktu, dan penandatangan SPT.',
      highlightValue: activeKuitansi.noSpt || activeSpt?.noSpt || 'Format Resmi',
      metadataItems: [
        `${sptPegawaiCount} Pegawai Ditugaskan`,
        'Tersinkron Otomatis ke SPD & Kuitansi',
      ],
      statusText: 'Halaman 1',
      icon: FileCheck,
      iconBgClass: 'bg-indigo-700 text-white',
    },
    {
      key: 'spd',
      title: '2. Surat Perjalanan Dinas (SPD)',
      subtitle: 'Halaman 2 · Blanko SPD Lembar Depan (86%)',
      description:
        'Lembar depan SPD resmi Disdikbud Kaltara (PPTK, pelaksana, alat angkut, pengikut, dan akun anggaran).',
      highlightValue: spdNomor,
      metadataItems: [
        `Pelaksana: ${activeKuitansi.atasNama || '-'}`,
        'Proporsi Cetak 86% Lebar Kertas',
      ],
      statusText: 'Halaman 2',
      icon: ClipboardList,
      iconBgClass: 'bg-sky-700 text-white',
    },
    {
      key: 'visum',
      title: '3. Visum Perjalanan Dinas',
      subtitle: 'Halaman 3 · SPD Lembar Belakang (I s.d. VIII)',
      description:
        'Lembar pengesahan keberangkatan, transit/tiba di tempat tujuan, tiba kembali, dan pengesahan pejabat.',
      highlightValue: `Tujuan: ${activeKuitansi.tujuan || '-'}`,
      metadataItems: [
        'Blok I s.d. VIII Sesuai Format Resmi',
        'Tersinkron Tempat & Tanggal SPT',
      ],
      statusText: 'Halaman 3',
      icon: Stamp,
      iconBgClass: 'bg-teal-700 text-white',
    },
    {
      key: 'kuitansi',
      title: '4. Kuitansi & Rincian SPPD',
      subtitle: 'Halaman 4 · Kuitansi Perjalanan Dinas',
      description:
        'Rincian perhitungan uang harian, transportasi, dan penginapan terintegrasi dengan Nomor SPT & Sub Kegiatan.',
      highlightValue: formatRupiah(totalKuitansi),
      metadataItems: [
        `${activeKuitansi.rincian.length} Rincian Biaya`,
        `Diperbarui ${formattedUpdatedDate}`,
      ],
      statusText: 'Halaman 4',
      icon: Banknote,
      iconBgClass: 'bg-blue-700 text-white',
    },
    {
      key: 'dokumentasi',
      title: '5. Dokumentasi Kegiatan',
      subtitle: 'Halaman 5 · Foto Kegiatan Lapangan',
      description:
        'Lampiran foto dokumentasi pelaksanaan kegiatan perjalanan dinas dengan tata letak grid 16:9 presisi.',
      highlightValue: `${docPerjalanan.length} Foto Kegiatan`,
      metadataItems: [
        docPerjalanan.length > 0
          ? 'Tergabung dalam 1 Berkas SPJ Utuh'
          : 'Belum ada foto diunggah',
      ],
      statusText: docPerjalanan.length > 0 ? 'Halaman 5 (Siap)' : 'Halaman 5',
      icon: Camera,
      iconBgClass: 'bg-emerald-700 text-white',
    },
    {
      key: 'pengeluaran',
      title: '6. Bukti Pembayaran',
      subtitle: 'Halaman 6 · Tiket, Boarding Pass & Invoice Hotel',
      description:
        'Lampiran hasil scan nota/tiket/bukti pengeluaran riil dengan rekonsiliasi otomatis terhadap kuitansi.',
      highlightValue: `${docPengeluaran.length} Bukti (${reconciliation.persentaseLengkap}%)`,
      metadataItems: [
        `Terbukti ${formatRupiah(reconciliation.totalDocumented)}`,
        `Selisih ${formatRupiah(reconciliation.selisih)}`,
      ],
      statusText: reconciliation.status,
      icon: Receipt,
      iconBgClass: 'bg-amber-600 text-white',
    },
  ];

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-x-hidden">
      {/* SATU CONTEXT HEADER TERPADU: Mengelola 1 Kesatuan Berkas SPJ Utuh */}
      <div className="sm:sticky sm:top-14 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3.5 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 truncate">
              1 Kesatuan Berkas SPJ Perjalanan Dinas Aktif
            </span>
            <InfoTooltip
              variant="info"
              align="left"
              title="1 File Berkas SPJ Utuh"
              content="SPT, SPD Depan, Visum, Kuitansi, Dokumentasi, dan Bukti Pembayaran terikat menjadi 1 berkas utuh yang otomatis tersinkronisasi."
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 min-w-0 w-full lg:w-auto">
            <label htmlFor="subhome-kuitansi-select" className="sr-only">
              Pilih Berkas SPJ Aktif
            </label>
            <select
              id="subhome-kuitansi-select"
              value={activeKuitansi.id}
              onChange={(e) => onSelectKuitansi(e.target.value)}
              className="w-full sm:w-64 min-w-0 max-w-full min-h-[38px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 truncate focus:border-sky-600 focus:bg-white focus:outline-none"
            >
              {kuitansiList.map((item, idx) => (
                <option key={item.id} value={item.id}>
                  Berkas SPJ #{idx + 1} · {item.atasNama || '(Draft)'} — {item.tujuan} (
                  {formatRupiah(calculateKuitansiTotal(item.rincian))})
                </option>
              ))}
            </select>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onOpenSubSection('berkas-utuh')}
                className="flex-1 sm:flex-initial justify-center min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 shrink-0" />
                <span>Cetak / PDF 1 File Utuh</span>
              </button>

              <button
                type="button"
                onClick={onCreateNewKuitansi}
                className="flex-1 sm:flex-initial justify-center min-h-[38px] px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Berkas SPJ Baru</span>
              </button>

              {onDeleteKuitansi && (
                <button
                  type="button"
                  onClick={() => onDeleteKuitansi(activeKuitansi)}
                  title="Hapus berkas SPJ yang sedang aktif"
                  aria-label="Hapus berkas SPJ aktif"
                  className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Hapus</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Baris Ringkas Konteks Tunggal: Nama & NIP | Tujuan & Tanggal | Nomor SPT */}
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 text-sky-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 truncate">
                {activeKuitansi.atasNama || '(Nama Pelaksana Belum Diisi)'}
              </p>
              <p className="text-[11px] font-mono text-slate-500 truncate">
                NIP {activeKuitansi.nipPenerima || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-900 truncate">
                Tujuan: {activeKuitansi.tujuan}
              </p>
              <p className="text-[11px] text-slate-500 truncate inline-flex items-center gap-1 max-w-full">
                <Calendar className="w-3 h-3 shrink-0" />
                <span className="truncate">{activeKuitansi.tanggalPerjalanan}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/80 min-w-0">
            <FileBadge className="w-3.5 h-3.5 text-red-700 shrink-0" />
            <span className="text-[11px] text-slate-500 shrink-0">No. SPT:</span>
            <span className="font-mono font-bold text-red-700 truncate min-w-0">
              {activeKuitansi.noSpt}
            </span>
          </div>
        </div>

        {/* Banner Pintasan: Pratinjau & Unduh 1 File Berkas SPJ Utuh (Halaman 1 s.d. 6) */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-emerald-950">
                1 File Berkas SPJ Utuh (SPT + SPD + Visum + Kuitansi + Dokumentasi + Bukti Pembayaran)
              </p>
              <p className="text-[11px] text-emerald-800">
                Seluruh 6 dokumen sudah disatukan secara berurutan dan siap dicetak/diunduh sebagai 1 file PDF utuh atau diedit per halaman.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenSubSection('spt')}
              className="min-h-[34px] px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-emerald-300 text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-sky-700" />
              <span>Edit Berurutan (1–6)</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenSubSection('berkas-utuh')}
              className="min-h-[34px] px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Buka 1 File Utuh</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 6 KARTU BAGIAN DOKUMEN BERURUTAN (Halaman 1 s.d. 6) */}
      <div
        role="region"
        aria-label="6 Bagian Dokumen Berkas SPJ Perjalanan Dinas"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0 max-w-full"
      >
        {subModules.map((mod) => (
          <UnifiedMediaCard
            key={mod.key}
            symbolIcon={mod.icon}
            symbolBgClass={mod.iconBgClass}
            metadataItems={mod.metadataItems}
            statusText={mod.statusText}
            title={mod.title}
            subtitle={mod.subtitle}
            highlightValue={mod.highlightValue}
            description={mod.description}
            onClick={() => onOpenSubSection(mod.key)}
            footerLeft={
              <span className="text-slate-500 truncate block">
                Bagian dari 1 Berkas SPJ Utuh
              </span>
            }
            footerRight={
              <span className="inline-flex items-center gap-1 font-bold text-sky-700 group-hover:translate-x-0.5 transition-transform">
                <span>Buka</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            }
          />
        ))}
      </div>

      {/* TABEL KELOLA SATU DAFTAR BERKAS SPJ TERPADU */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-3 min-w-0">
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
              <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
              <span>Daftar Berkas SPJ Terpadu (SPT, SPD, Visum, Kuitansi, Dokumentasi &amp; Bukti)</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {kuitansiList.length} Berkas Utuh
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap baris di bawah ini merupakan 1 berkas SPJ utuh yang menyatukan keenam dokumen perjalanan dinas secara otomatis.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onDuplicateKuitansi && (
              <button
                type="button"
                onClick={onDuplicateKuitansi}
                className="flex-1 sm:flex-initial justify-center min-h-[34px] px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Duplikat Berkas Aktif</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="flex-1 sm:flex-initial justify-center min-h-[34px] px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Berkas SPJ Baru</span>
            </button>
          </div>
        </div>

        {/* Tampilan Mobile (< md): Daftar Kartu Ringkas Tanpa Scroll Kanan-Kiri */}
        <div className="md:hidden space-y-2.5 min-w-0">
          {kuitansiList.map((item, idx) => {
            const isActive = item.id === activeKuitansi.id;
            const totalItem = calculateKuitansiTotal(item.rincian);
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-3 space-y-2 transition-colors min-w-0 ${
                  isActive
                    ? 'bg-sky-50/70 border-sky-200'
                    : 'bg-slate-50/50 border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold text-slate-500">
                        #{idx + 1}
                      </span>
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {item.atasNama || '(Nama belum diisi)'}
                      </p>
                    </div>
                    <p className="text-[11px] font-mono text-slate-500 truncate">
                      {item.nipPenerima ? `NIP ${item.nipPenerima}` : '-'}
                    </p>
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold shrink-0">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>Aktif</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 text-[10px] font-medium shrink-0">
                      1 Berkas Utuh
                    </span>
                  )}
                </div>

                <div className="text-[11px] space-y-0.5 min-w-0">
                  <p className="font-mono text-red-700 font-bold truncate">
                    {item.noSpt}
                  </p>
                  <p className="text-slate-600 truncate">
                    {item.tujuan} · {item.tanggalPerjalanan}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 min-w-0">
                  <span className="text-xs font-mono font-extrabold text-slate-900 tabular-nums truncate">
                    {formatRupiah(totalItem)}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isActive ? (
                      <button
                        type="button"
                        onClick={() => onSelectKuitansi(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-sky-50 text-slate-700 hover:text-sky-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Check className="w-3 h-3 shrink-0" />
                        <span>Pilih</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onOpenSubSection('berkas-utuh')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Printer className="w-3 h-3 shrink-0" />
                          <span>PDF Utuh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenSubSection('spt')}
                          className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3 h-3 shrink-0" />
                          <span>Edit</span>
                        </button>
                      </>
                    )}
                    {onDeleteKuitansi && (
                      <button
                        type="button"
                        onClick={() => onDeleteKuitansi(item)}
                        title={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                        aria-label={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tampilan Desktop (md+): Tabel Lengkap */}
        <div className="hidden md:block overflow-x-auto min-w-0 max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/75">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Pelaksana &amp; NIP</th>
                <th className="py-2.5 px-3">Nomor SPT &amp; Kelengkapan</th>
                <th className="py-2.5 px-3">Tujuan &amp; Tanggal</th>
                <th className="py-2.5 px-3 text-right">Nilai Kuitansi</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kuitansiList.map((item, idx) => {
                const isActive = item.id === activeKuitansi.id;
                const totalItem = calculateKuitansiTotal(item.rincian);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isActive ? 'bg-sky-50/60 font-semibold' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">
                        {item.atasNama || '(Nama belum diisi)'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {item.nipPenerima ? `NIP ${item.nipPenerima}` : '-'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono text-red-700 font-bold truncate max-w-[220px]">
                        {item.noSpt}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate max-w-[220px]">
                        SPT · SPD · Visum · Kuitansi · Dok · Bukti
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-slate-800 truncate max-w-[180px]">{item.tujuan}</p>
                      <p className="text-[11px] text-slate-500">{item.tanggalPerjalanan}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(totalItem)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                          1 File Utuh
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => onSelectKuitansi(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3 shrink-0" />
                            <span>Pilih</span>
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenSubSection('berkas-utuh')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              title="Pratinjau & Cetak 1 File SPJ Utuh"
                            >
                              <Printer className="w-3 h-3 shrink-0" />
                              <span>1 File Utuh</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenSubSection('spt')}
                              className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3 h-3 shrink-0" />
                              <span>Edit</span>
                            </button>
                          </>
                        )}
                        {onDeleteKuitansi && (
                          <button
                            type="button"
                            onClick={() => onDeleteKuitansi(item)}
                            title={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                            aria-label={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
