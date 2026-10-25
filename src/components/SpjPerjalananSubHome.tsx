import React, { useState, useMemo } from 'react';
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
  Search,
  X,
  AlertTriangle,
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
  getReconciliationSemanticFeedback,
  calculateSpjStepProgress,
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

type SpjFilterChipKey = 'semua' | 'belum-lengkap' | 'siap-cetak';

interface SpjPerjalananSubHomeProps {
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  activeSpt?: SuratPerintahTugas;
  sptList?: SuratPerintahTugas[];
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
  sptList,
  onSelectKuitansi,
  onCreateNewKuitansi,
  onDuplicateKuitansi,
  onDeleteKuitansi,
  docPerjalanan,
  docPengeluaran,
  allDocPerjalanan,
  allDocPengeluaran,
  onOpenSubSection,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<SpjFilterChipKey>('semua');

  const totalKuitansi = calculateKuitansiTotal(activeKuitansi.rincian);
  const reconciliation = calculateExpenseReconciliation(totalKuitansi, docPengeluaran);
  const activeReconFeedback = getReconciliationSemanticFeedback(
    totalKuitansi,
    docPengeluaran
  );
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

  // Evaluasi status setiap berkas SPJ (#1 s.d. terakhir) untuk Search & Filter Chips
  const enrichedSpjRecords = useMemo(() => {
    return kuitansiList.map((item, idx) => {
      const itemTotal = calculateKuitansiTotal(item.rincian);
      const itemExpenses = allDocPengeluaran
        ? allDocPengeluaran.filter((e) => e.kuitansiId === item.id)
        : item.id === activeKuitansi.id
          ? docPengeluaran
          : [];
      const itemPhotos = allDocPerjalanan
        ? allDocPerjalanan.filter((d) => d.kuitansiId === item.id)
        : item.id === activeKuitansi.id
          ? docPerjalanan
          : [];
      const linkedSpt =
        sptList?.find((s) => s.kuitansiId === item.id) ||
        (item.id === activeKuitansi.id ? activeSpt : undefined);

      const itemRecon = calculateExpenseReconciliation(itemTotal, itemExpenses);
      const itemFeedback = getReconciliationSemanticFeedback(itemTotal, itemExpenses);
      const itemProgress = calculateSpjStepProgress({
        kuitansi: item,
        spt: linkedSpt,
        docPerjalananCount: itemPhotos.length,
        expenses: itemExpenses,
      });

      const isSiapCetak = itemRecon.status === 'Lengkap & Sesuai' && itemTotal > 0;

      return {
        item,
        sequenceNumber: idx + 1,
        itemTotal,
        itemRecon,
        itemFeedback,
        itemProgress,
        isSiapCetak,
      };
    });
  }, [
    kuitansiList,
    allDocPengeluaran,
    allDocPerjalanan,
    sptList,
    activeKuitansi.id,
    docPengeluaran,
    docPerjalanan,
    activeSpt,
  ]);

  const countsByFilter = useMemo(() => {
    const siapCetak = enrichedSpjRecords.filter((r) => r.isSiapCetak).length;
    const belumLengkap = enrichedSpjRecords.length - siapCetak;
    return {
      semua: enrichedSpjRecords.length,
      belumLengkap,
      siapCetak,
    };
  }, [enrichedSpjRecords]);

  const filteredSpjRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedSpjRecords.filter((record) => {
      if (statusFilter === 'siap-cetak' && !record.isSiapCetak) return false;
      if (statusFilter === 'belum-lengkap' && record.isSiapCetak) return false;

      if (!q) return true;
      const matchNama = (record.item.atasNama || '').toLowerCase().includes(q);
      const matchSpt = (record.item.noSpt || '').toLowerCase().includes(q);
      const matchTujuan = (record.item.tujuan || '').toLowerCase().includes(q);
      const matchNip = (record.item.nipPenerima || '').toLowerCase().includes(q);
      return matchNama || matchSpt || matchTujuan || matchNip;
    });
  }, [enrichedSpjRecords, searchQuery, statusFilter]);

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
      highlightValue:
        docPengeluaran.length === 0 && totalKuitansi > 0
          ? 'Menunggu Nota (Step 6)'
          : `${docPengeluaran.length} Bukti (${reconciliation.persentaseLengkap}%)`,
      metadataItems: [
        `Terbukti ${formatRupiah(reconciliation.totalDocumented)}`,
        `Selisih ${formatRupiah(reconciliation.selisih)}`,
      ],
      statusText: activeReconFeedback.badgeText,
      icon: Receipt,
      iconBgClass: 'bg-amber-600 text-white',
    },
  ];

  return (
    <div className="space-y-5 min-w-0 max-w-full overflow-x-hidden">
      {/* 1. DAFTAR RIWAYAT BERKAS SPJ TERPADU (#1 S.D. TERAKHIR) + SEARCH BAR & FILTER CHIP DI BAGIAN ATAS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 border-b border-slate-100 pb-3.5 min-w-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
              <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
              <span>Daftar Riwayat Berkas SPJ Terpadu (#1 s.d. #{kuitansiList.length})</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Cari dan filter seluruh berkas SPJ utuh (SPT, SPD, Visum, Kuitansi, Dokumentasi &amp; Bukti Pembayaran).
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onDuplicateKuitansi && (
              <button
                type="button"
                onClick={onDuplicateKuitansi}
                className="flex-1 sm:flex-initial justify-center min-h-[36px] px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Duplikat Aktif</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="flex-1 sm:flex-initial justify-center min-h-[36px] px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Berkas SPJ Baru</span>
            </button>
          </div>
        </div>

        {/* BARIS PENCARIAN (SEARCH BAR) & FILTER CHIP ("Semua", "Belum Lengkap", "Siap Cetak") */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 min-w-0">
          {/* Search Bar: Nama Pegawai / Nomor SPT / Tujuan */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama pegawai, nomor SPT, atau tujuan perjalanan..."
              aria-label="Cari nama pegawai, nomor SPT, atau tujuan"
              className="w-full min-h-[38px] pl-9 pr-8 py-1.5 rounded-xl border border-slate-300 bg-slate-50/70 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Bersihkan pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Chips: "Semua", "Belum Lengkap", "Siap Cetak" */}
          <div
            role="group"
            aria-label="Filter status berkas SPJ"
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto"
          >
            <button
              type="button"
              onClick={() => setStatusFilter('semua')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'semua'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({countsByFilter.semua})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('belum-lengkap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'belum-lengkap'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Belum Lengkap ({countsByFilter.belumLengkap})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('siap-cetak')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                statusFilter === 'siap-cetak'
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Siap Cetak ({countsByFilter.siapCetak})
            </button>
          </div>
        </div>

        {/* Empty State saat Pencarian / Filter tidak menemukan hasil */}
        {filteredSpjRecords.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-center space-y-2">
            <p className="text-xs font-bold text-slate-800">
              Tidak ada berkas SPJ yang sesuai dengan pencarian atau filter.
            </p>
            <p className="text-[11px] text-slate-500">
              Coba kata kunci lain atau tampilkan semua berkas SPJ.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('semua');
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
            >
              Reset Pencarian &amp; Filter
            </button>
          </div>
        ) : (
          <>
            {/* Tampilan Mobile (< md): Daftar Kartu Ringkas Tanpa Scroll Kanan-Kiri */}
            <div className="md:hidden space-y-2.5 min-w-0">
              {filteredSpjRecords.map(
                ({
                  item,
                  sequenceNumber,
                  itemTotal,
                  itemFeedback,
                  itemProgress,
                  isSiapCetak,
                }) => {
                  const isActive = item.id === activeKuitansi.id;
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
                              #{sequenceNumber}
                            </span>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.atasNama || '(Nama belum diisi)'}
                            </p>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 truncate">
                            {item.nipPenerima ? `NIP ${item.nipPenerima}` : '-'}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isSiapCetak ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>Siap Cetak</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span>{itemProgress.completedCount}/6</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[11px] space-y-0.5 min-w-0">
                        <p className="font-mono text-red-700 font-bold truncate">
                          {item.noSpt}
                        </p>
                        <p className="text-slate-600 truncate">
                          {item.tujuan} · {item.tanggalPerjalanan}
                        </p>
                        <p className="text-[10px] text-amber-800 font-semibold truncate">
                          {itemFeedback.badgeText}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between gap-2 min-w-0">
                        <span className="text-xs font-mono font-extrabold text-slate-900 tabular-nums truncate">
                          {formatRupiah(itemTotal)}
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
                }
              )}
            </div>

            {/* Tampilan Desktop (md+): Tabel Riwayat Lengkap */}
            <div className="hidden md:block overflow-x-auto min-w-0 max-w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/75">
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">Pelaksana &amp; NIP</th>
                    <th className="py-2.5 px-3">Nomor SPT &amp; Progress (1–6)</th>
                    <th className="py-2.5 px-3">Tujuan &amp; Tanggal</th>
                    <th className="py-2.5 px-3 text-right">Nilai Kuitansi</th>
                    <th className="py-2.5 px-3 text-center">Status Rekonsiliasi</th>
                    <th className="py-2.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSpjRecords.map(
                    ({
                      item,
                      sequenceNumber,
                      itemTotal,
                      itemFeedback,
                      itemProgress,
                      isSiapCetak,
                    }) => {
                      const isActive = item.id === activeKuitansi.id;
                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isActive
                              ? 'bg-sky-50/60 font-semibold'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-2.5 px-3 text-slate-500 font-mono tabular-nums">
                            #{sequenceNumber}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <p className="font-bold text-slate-900 truncate max-w-[180px]">
                                {item.atasNama || '(Nama belum diisi)'}
                              </p>
                              {isActive && (
                                <span className="text-[10px] font-bold text-sky-700">
                                  (Aktif)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                              {item.nipPenerima ? `NIP ${item.nipPenerima}` : '-'}
                            </p>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-mono text-red-700 font-bold truncate max-w-[220px]">
                              {item.noSpt}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              Progress: {itemProgress.completedCount}/6 Langkah (
                              {itemProgress.progressPercent}%)
                            </p>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="text-slate-800 truncate max-w-[180px]">
                              {item.tujuan}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {item.tanggalPerjalanan}
                            </p>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatRupiah(itemTotal)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isSiapCetak ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                                <span>Siap Cetak 100%</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  onSelectKuitansi(item.id);
                                  onOpenSubSection('pengeluaran');
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 hover:bg-amber-200/80 text-amber-900 border border-amber-300 text-[11px] font-bold whitespace-nowrap cursor-pointer transition-colors"
                                title="Ketuk untuk melengkapi nota di Langkah 6"
                              >
                                <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>{itemFeedback.badgeText}</span>
                              </button>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isActive ? (
                                <button
                                  type="button"
                                  onClick={() => onSelectKuitansi(item.id)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                >
                                  <Check className="w-3 h-3 shrink-0" />
                                  <span>Pilih</span>
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => onOpenSubSection('berkas-utuh')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                    title="Pratinjau & Cetak 1 File SPJ Utuh"
                                  >
                                    <Printer className="w-3 h-3 shrink-0" />
                                    <span>1 File Utuh</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onOpenSubSection('spt')}
                                    className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
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
                    }
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 2. CONTEXT HEADER BERKAS SPJ AKTIF & PINTASAN 1 FILE UTUH */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-3.5 min-w-0 max-w-full overflow-hidden">
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

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenSubSection('spt')}
              className="flex-1 sm:flex-initial justify-center min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Edit Berurutan (1–6)</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenSubSection('berkas-utuh')}
              className="flex-1 sm:flex-initial justify-center min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>Cetak / PDF 1 File Utuh</span>
            </button>
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
              onClick={() => onOpenSubSection('berkas-utuh')}
              className="min-h-[34px] px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Buka 1 File Utuh</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. 6 KARTU BAGIAN DOKUMEN BERURUTAN (Halaman 1 s.d. 6) */}
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
    </div>
  );
};
