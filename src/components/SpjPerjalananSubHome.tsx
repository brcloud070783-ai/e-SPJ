import React, { useState, useMemo, useRef } from 'react';
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
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
  Download,
  Upload,
  Sparkles,
  FileSpreadsheet,
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
import {
  extractSpjPeriod,
  downloadSpjBackupJson,
  downloadSpjBackupCsv,
  parseSpjBackupJson,
  SpjBackupPayload,
} from '../utils/spjBackupAndCleanup';
import { InfoTooltip, UnifiedMediaCard } from './UiPatterns';

export type SpjSubSectionKey =
  | 'spt'
  | 'spd'
  | 'visum'
  | 'kuitansi'
  | 'dokumentasi'
  | 'pengeluaran'
  | 'surat-tugas';

type SpjFilterChipKey = 'semua' | 'belum-lengkap' | 'siap-cetak';
type SpjArchiveTabKey = 'aktif' | 'arsip';
type CleanupWizardTabKey = 'periode' | 'sisakan-aktif' | 'kosongkan-semua';

interface SpjPerjalananSubHomeProps {
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  activeSpt?: SuratPerintahTugas;
  sptList?: SuratPerintahTugas[];
  onSelectKuitansi: (id: string) => void;
  onCreateNewKuitansi: () => void;
  onDuplicateKuitansi?: () => void;
  onDeleteKuitansi?: (kuitansi: KuitansiPerjalananDinas) => void;
  onDeleteKuitansiBatch?: (ids: string[]) => void;
  onArchiveKuitansiBatch?: (ids: string[], archive: boolean) => void;
  onRestoreBackupPayload?: (payload: SpjBackupPayload) => void;
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
  sptList = [],
  onSelectKuitansi,
  onCreateNewKuitansi,
  onDuplicateKuitansi,
  onDeleteKuitansi,
  onDeleteKuitansiBatch,
  onArchiveKuitansiBatch,
  onRestoreBackupPayload,
  docPerjalanan,
  docPengeluaran,
  allDocPerjalanan = [],
  allDocPengeluaran = [],
  onOpenSubSection,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<SpjFilterChipKey>('semua');
  const [archiveTab, setArchiveTab] = useState<SpjArchiveTabKey>('aktif');

  // Mode Pilih Banyak (Multi-Select)
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal Asisten Pembersihan Berkas Lama & Sapu Bersih
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState<boolean>(false);
  const [cleanupTab, setCleanupTab] = useState<CleanupWizardTabKey>('periode');
  const [selectedPeriodKeys, setSelectedPeriodKeys] = useState<string[]>([]);

  // Modal Konfirmasi Hapus Permanen + Opsi Unduh Cadangan
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[] | null>(null);
  const [pendingDeleteReason, setPendingDeleteReason] = useState<string>('');
  const [hasDownloadedBackupInModal, setHasDownloadedBackupInModal] = useState<boolean>(false);

  // Input file untuk Impor / Pulihkan Cadangan JSON
  const restoreInputRef = useRef<HTMLInputElement | null>(null);

  const isEmptyAll = kuitansiList.length === 0;

  const totalKuitansi = isEmptyAll ? 0 : calculateKuitansiTotal(activeKuitansi.rincian);
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

  // Evaluasi status setiap berkas SPJ (#1 s.d. terakhir) beserta periode bulan/tahun
  const enrichedSpjRecords = useMemo(() => {
    return kuitansiList.map((item, idx) => {
      const itemTotal = calculateKuitansiTotal(item.rincian);
      const itemExpenses = allDocPengeluaran.filter((e) => e.kuitansiId === item.id);
      const itemPhotos = allDocPerjalanan.filter((d) => d.kuitansiId === item.id);
      const linkedSpt =
        sptList.find((s) => s.kuitansiId === item.id) ||
        (item.id === activeKuitansi.id ? activeSpt : undefined);

      const itemRecon = calculateExpenseReconciliation(itemTotal, itemExpenses);
      const itemFeedback = getReconciliationSemanticFeedback(itemTotal, itemExpenses);
      const itemProgress = calculateSpjStepProgress({
        kuitansi: item,
        spt: linkedSpt,
        docPerjalananCount: itemPhotos.length,
        expenses: itemExpenses,
      });

      const period = extractSpjPeriod(item, linkedSpt);
      const isSiapCetak = itemRecon.status === 'Lengkap & Sesuai' && itemTotal > 0;

      return {
        item,
        sequenceNumber: idx + 1,
        itemTotal,
        itemRecon,
        itemFeedback,
        itemProgress,
        isSiapCetak,
        period,
        photosCount: itemPhotos.length,
        expensesCount: itemExpenses.length,
      };
    });
  }, [
    kuitansiList,
    allDocPengeluaran,
    allDocPerjalanan,
    sptList,
    activeKuitansi.id,
    activeSpt,
  ]);

  const archiveCounts = useMemo(() => {
    const arsip = enrichedSpjRecords.filter((r) => Boolean(r.item.isArchived)).length;
    const aktif = enrichedSpjRecords.length - arsip;
    return { aktif, arsip };
  }, [enrichedSpjRecords]);

  // Filter berdasarkan tab Aktif vs Arsip terlebih dahulu
  const recordsInCurrentTab = useMemo(() => {
    return enrichedSpjRecords.filter((r) =>
      archiveTab === 'arsip' ? Boolean(r.item.isArchived) : !r.item.isArchived
    );
  }, [enrichedSpjRecords, archiveTab]);

  const countsByFilter = useMemo(() => {
    const siapCetak = recordsInCurrentTab.filter((r) => r.isSiapCetak).length;
    const belumLengkap = recordsInCurrentTab.length - siapCetak;
    return {
      semua: recordsInCurrentTab.length,
      belumLengkap,
      siapCetak,
    };
  }, [recordsInCurrentTab]);

  const filteredSpjRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recordsInCurrentTab.filter((record) => {
      if (statusFilter === 'siap-cetak' && !record.isSiapCetak) return false;
      if (statusFilter === 'belum-lengkap' && record.isSiapCetak) return false;

      if (!q) return true;
      const matchNama = (record.item.atasNama || '').toLowerCase().includes(q);
      const matchSpt = (record.item.noSpt || '').toLowerCase().includes(q);
      const matchTujuan = (record.item.tujuan || '').toLowerCase().includes(q);
      const matchNip = (record.item.nipPenerima || '').toLowerCase().includes(q);
      const matchPeriod = record.period.label.toLowerCase().includes(q);
      return matchNama || matchSpt || matchTujuan || matchNip || matchPeriod;
    });
  }, [recordsInCurrentTab, searchQuery, statusFilter]);

  // Daftar pengelompokan periode bulan/tahun untuk Asisten Pembersihan Berkas Lama
  const periodGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        sortKey: string;
        label: string;
        ids: string[];
        totalNilai: number;
        archivedCount: number;
      }
    >();

    for (const rec of enrichedSpjRecords) {
      const existing = map.get(rec.period.sortKey);
      if (existing) {
        existing.ids.push(rec.item.id);
        existing.totalNilai += rec.itemTotal;
        if (rec.item.isArchived) existing.archivedCount += 1;
      } else {
        map.set(rec.period.sortKey, {
          sortKey: rec.period.sortKey,
          label: rec.period.label,
          ids: [rec.item.id],
          totalNilai: rec.itemTotal,
          archivedCount: rec.item.isArchived ? 1 : 0,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [enrichedSpjRecords]);

  // Helper seleksi
  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredIds = useMemo(
    () => filteredSpjRecords.map((r) => r.item.id),
    [filteredSpjRecords]
  );

  const isAllFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const handleToggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const openSafetyDeleteModal = (ids: string[], reasonLabel: string) => {
    if (ids.length === 0) return;
    setHasDownloadedBackupInModal(false);
    setPendingDeleteReason(reasonLabel);
    setPendingDeleteIds(ids);
  };

  const pendingDeleteSummary = useMemo(() => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return null;
    const idSet = new Set(pendingDeleteIds);
    const kuitansiItems = kuitansiList.filter((k) => idSet.has(k.id));
    const totalNilai = kuitansiItems.reduce(
      (sum, k) => sum + calculateKuitansiTotal(k.rincian),
      0
    );
    const photosCount = allDocPerjalanan.filter((d) => idSet.has(d.kuitansiId)).length;
    const expensesCount = allDocPengeluaran.filter((e) => idSet.has(e.kuitansiId)).length;
    const remainingCount = Math.max(0, kuitansiList.length - kuitansiItems.length);

    return {
      kuitansiItems,
      count: kuitansiItems.length,
      totalNilai,
      photosCount,
      expensesCount,
      remainingCount,
    };
  }, [pendingDeleteIds, kuitansiList, allDocPerjalanan, allDocPengeluaran]);

  const handleConfirmBatchDelete = () => {
    if (!pendingDeleteIds || pendingDeleteIds.length === 0) return;
    if (onDeleteKuitansiBatch) {
      onDeleteKuitansiBatch(pendingDeleteIds);
    } else if (onDeleteKuitansi && pendingDeleteSummary?.kuitansiItems[0]) {
      onDeleteKuitansi(pendingDeleteSummary.kuitansiItems[0]);
    }
    setSelectedIds((prev) => prev.filter((id) => !pendingDeleteIds.includes(id)));
    setPendingDeleteIds(null);
    setIsCleanupModalOpen(false);
  };

  const handleImportBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const payload = parseSpjBackupJson(text);
      if (payload && onRestoreBackupPayload) {
        onRestoreBackupPayload(payload);
      }
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Hitung berkas yang dipilih pada tab Periode di Cleanup Modal
  const periodMatchedIds = useMemo(() => {
    if (selectedPeriodKeys.length === 0) return [];
    const keySet = new Set(selectedPeriodKeys);
    return enrichedSpjRecords
      .filter((r) => keySet.has(r.period.sortKey))
      .map((r) => r.item.id);
  }, [enrichedSpjRecords, selectedPeriodKeys]);

  // Berkas selain berkas yang sedang aktif
  const nonActiveIds = useMemo(() => {
    return kuitansiList.filter((k) => k.id !== activeKuitansi.id).map((k) => k.id);
  }, [kuitansiList, activeKuitansi.id]);

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
    <div className="space-y-5 min-w-0 max-w-full overflow-x-hidden pb-16">
      {/* Hidden input untuk pemulihan file cadangan .json */}
      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportBackupFileChange}
        className="hidden"
      />

      {/* 1. DAFTAR RIWAYAT BERKAS SPJ TERPADU + MANAJEMEN ARSIP & PEMBERSIHAN */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-5 shadow-2xs space-y-4 min-w-0 max-w-full overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border-b border-slate-100 pb-3.5 min-w-0">
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 flex flex-wrap items-center gap-2">
              <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
              <span>
                Daftar Berkas SPJ Perjalanan Dinas ({kuitansiList.length} Berkas)
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola berkas aktif, arsipkan berkas selesai, atau bersihkan berkas lama untuk melegakan memori.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {!isEmptyAll && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode((prev) => {
                      if (prev) setSelectedIds([]);
                      return !prev;
                    });
                  }}
                  className={`min-h-[36px] px-2.5 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    isSelectMode
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>{isSelectMode ? 'Selesai Pilih' : 'Pilih Banyak'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (periodGroups.length > 0 && selectedPeriodKeys.length === 0) {
                      setSelectedPeriodKeys([periodGroups[0].sortKey]);
                    }
                    setIsCleanupModalOpen(true);
                  }}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Bersihkan Lama</span>
                </button>
              </>
            )}

            {!isEmptyAll && onDuplicateKuitansi && (
              <button
                type="button"
                onClick={onDuplicateKuitansi}
                className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              >
                <Copy className="w-3.5 h-3.5 shrink-0" />
                <span>Duplikat Aktif</span>
              </button>
            )}

            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ Berkas SPJ Baru</span>
            </button>
          </div>
        </div>

        {/* JIKA 0 BERKAS: TAMPILKAN ZERO-RECORD EMPTY STATE */}
        {isEmptyAll ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-6 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto">
              <FolderOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Daftar SPJ Kosong Sepenuhnya (0 Berkas)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Seluruh berkas SPJ lama beserta lampiran foto telah dibersihkan. Penyimpanan perangkat Anda kini bersih dan siap digunakan untuk membuat berkas SPJ perjalanan dinas baru.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCreateNewKuitansi}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Berkas SPJ Pertama</span>
              </button>
              {onRestoreBackupPayload && (
                <button
                  type="button"
                  onClick={() => restoreInputRef.current?.click()}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-sky-700" />
                  <span>Pulihkan dari Cadangan (.JSON)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* BARIS TAB ARSIP (BERKAS AKTIF vs DIARSIPKAN) + TOMBOL PILIH SEMUA SAAT MODE PILIH */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setArchiveTab('aktif');
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    archiveTab === 'aktif'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-sky-700" />
                  <span>Berkas Aktif ({archiveCounts.aktif})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArchiveTab('arsip');
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    archiveTab === 'arsip'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5 text-amber-700" />
                  <span>Diarsipkan ({archiveCounts.arsip})</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isSelectMode && filteredSpjRecords.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAllFiltered}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {isAllFilteredSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-sky-700" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>
                      {isAllFilteredSelected
                        ? `Batal Pilih Semua (${filteredSpjRecords.length})`
                        : `Pilih Semua Tampilan (${filteredSpjRecords.length})`}
                    </span>
                  </button>
                )}

                {onRestoreBackupPayload && (
                  <button
                    type="button"
                    onClick={() => restoreInputRef.current?.click()}
                    className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
                    title="Pulihkan berkas SPJ dari file cadangan .JSON"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-700" />
                    <span>Impor Cadangan</span>
                  </button>
                )}
              </div>
            </div>

            {/* BARIS PENCARIAN (SEARCH BAR) & FILTER CHIP ("Semua", "Belum Lengkap", "Siap Cetak") */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama pegawai, nomor SPT, tujuan, atau bulan (mis. April 2026)..."
                  aria-label="Cari nama pegawai, nomor SPT, tujuan, atau bulan"
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

            {/* Empty State saat Pencarian / Tab Arsip tidak menemukan hasil */}
            {filteredSpjRecords.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-center space-y-2">
                <p className="text-xs font-bold text-slate-800">
                  {archiveTab === 'arsip' && archiveCounts.arsip === 0
                    ? 'Belum ada berkas SPJ yang diarsipkan.'
                    : 'Tidak ada berkas SPJ yang sesuai dengan pencarian atau filter.'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {archiveTab === 'arsip' && archiveCounts.arsip === 0
                    ? 'Anda dapat mengarsipkan berkas SPJ lama agar daftar utama tetap rapi tanpa harus menghapusnya.'
                    : 'Coba kata kunci lain atau tampilkan semua berkas SPJ.'}
                </p>
                {(searchQuery || statusFilter !== 'semua' || archiveTab === 'arsip') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('semua');
                      setArchiveTab('aktif');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                  >
                    Tampilkan Berkas Aktif
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Tampilan Mobile (< md): Daftar Kartu Ringkas */}
                <div className="md:hidden space-y-2.5 min-w-0">
                  {filteredSpjRecords.map(
                    ({
                      item,
                      sequenceNumber,
                      itemTotal,
                      itemFeedback,
                      itemProgress,
                      isSiapCetak,
                      period,
                    }) => {
                      const isActive = item.id === activeKuitansi.id;
                      const isChecked = selectedIds.includes(item.id);
                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border p-3 space-y-2 transition-colors min-w-0 ${
                            isChecked
                              ? 'bg-sky-50 border-sky-400 ring-1 ring-sky-300'
                              : isActive
                                ? 'bg-sky-50/70 border-sky-200'
                                : 'bg-slate-50/50 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex items-start gap-2 min-w-0 flex-1">
                              {isSelectMode && (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectId(item.id)}
                                  aria-label={`Pilih berkas SPJ ${item.atasNama}`}
                                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600 cursor-pointer shrink-0"
                                />
                              )}
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
                                  {item.nipPenerima ? `NIP ${item.nipPenerima}` : '-'} · {period.label}
                                </p>
                              </div>
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

                            <div className="flex items-center gap-1 shrink-0">
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
                                <button
                                  type="button"
                                  onClick={() => onOpenSubSection('spt')}
                                  className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3 shrink-0" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {onArchiveKuitansiBatch && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onArchiveKuitansiBatch([item.id], !item.isArchived)
                                  }
                                  title={
                                    item.isArchived
                                      ? 'Pulihkan ke daftar aktif'
                                      : 'Arsipkan berkas ini'
                                  }
                                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                >
                                  {item.isArchived ? (
                                    <ArchiveRestore className="w-4 h-4" />
                                  ) : (
                                    <Archive className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  openSafetyDeleteModal(
                                    [item.id],
                                    `Berkas SPJ ${item.atasNama || item.noSpt}`
                                  )
                                }
                                title={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                                aria-label={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                        {isSelectMode && (
                          <th className="py-2.5 px-3 w-9">
                            <input
                              type="checkbox"
                              checked={isAllFilteredSelected}
                              onChange={handleToggleSelectAllFiltered}
                              aria-label="Pilih semua berkas yang tampil"
                              className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600 cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Pelaksana &amp; NIP</th>
                        <th className="py-2.5 px-3">Nomor SPT &amp; Progress (1–6)</th>
                        <th className="py-2.5 px-3">Tujuan &amp; Periode</th>
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
                          period,
                        }) => {
                          const isActive = item.id === activeKuitansi.id;
                          const isChecked = selectedIds.includes(item.id);
                          return (
                            <tr
                              key={item.id}
                              onClick={() => {
                                if (isSelectMode) toggleSelectId(item.id);
                              }}
                              className={`transition-colors ${
                                isChecked
                                  ? 'bg-sky-50/90 font-semibold'
                                  : isActive
                                    ? 'bg-sky-50/60 font-semibold'
                                    : 'hover:bg-slate-50/80'
                              } ${isSelectMode ? 'cursor-pointer' : ''}`}
                            >
                              {isSelectMode && (
                                <td
                                  className="py-2.5 px-3"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleSelectId(item.id)}
                                    aria-label={`Pilih berkas SPJ ${item.atasNama}`}
                                    className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600 cursor-pointer"
                                  />
                                </td>
                              )}
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
                                  {item.tanggalPerjalanan} ·{' '}
                                  <span className="font-semibold text-slate-600">
                                    {period.label}
                                  </span>
                                </p>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                                {formatRupiah(itemTotal)}
                              </td>
                              <td
                                className="py-2.5 px-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                              <td
                                className="py-2.5 px-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
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
                                    <button
                                      type="button"
                                      onClick={() => onOpenSubSection('spt')}
                                      className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      <Pencil className="w-3 h-3 shrink-0" />
                                      <span>Edit</span>
                                    </button>
                                  )}

                                  {onArchiveKuitansiBatch && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onArchiveKuitansiBatch([item.id], !item.isArchived)
                                      }
                                      title={
                                        item.isArchived
                                          ? 'Pulihkan ke daftar aktif'
                                          : 'Arsipkan berkas SPJ ini'
                                      }
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                    >
                                      {item.isArchived ? (
                                        <ArchiveRestore className="w-4 h-4" />
                                      ) : (
                                        <Archive className="w-4 h-4" />
                                      )}
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openSafetyDeleteModal(
                                        [item.id],
                                        `Berkas SPJ ${item.atasNama || item.noSpt}`
                                      )
                                    }
                                    title={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                                    aria-label={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
          </>
        )}
      </div>

      {/* 2. CONTEXT HEADER BERKAS SPJ AKTIF & 6 KARTU MODUL (Tampil bila ada minimal 1 berkas) */}
      {!isEmptyAll && (
        <>
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
                  className="flex-1 sm:flex-initial justify-center min-h-[38px] px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer shadow-2xs"
                >
                  <Pencil className="w-3.5 h-3.5 shrink-0" />
                  <span>Buka Dokumen SPJ (1–6)</span>
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
        </>
      )}

      {/* 4. FLOATING BULK ACTION BAR (Saat Mode Pilih & Ada Berkas Tercentang) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-1.5rem)] max-w-3xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center justify-between sm:justify-start gap-2.5">
            <span className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-extrabold font-mono">
              {selectedIds.length} Dipilih
            </span>
            <span className="text-xs text-slate-300 truncate">
              Pilih aksi massal untuk berkas SPJ yang dicentang
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={() => {
                const selectedItems = kuitansiList.filter((k) =>
                  selectedIds.includes(k.id)
                );
                downloadSpjBackupJson({
                  kuitansiItems: selectedItems,
                  allSptList: sptList,
                  allDocPerjalanan,
                  allDocPengeluaran,
                  filenamePrefix: 'Cadangan_SPJ_Terpilih',
                });
              }}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Cadangan JSON</span>
            </button>

            {onArchiveKuitansiBatch && (
              <button
                type="button"
                onClick={() => {
                  onArchiveKuitansiBatch(selectedIds, archiveTab === 'aktif');
                  setSelectedIds([]);
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                {archiveTab === 'aktif' ? (
                  <>
                    <Archive className="w-3.5 h-3.5" />
                    <span>Arsipkan ({selectedIds.length})</span>
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="w-3.5 h-3.5" />
                    <span>Pulihkan ({selectedIds.length})</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                openSafetyDeleteModal(
                  selectedIds,
                  `${selectedIds.length} Berkas SPJ Terpilih`
                )
              }
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Permanen ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. MODAL ASISTEN PEMBERSIHAN BERKAS LAMA & SAPU BERSIH */}
      {isCleanupModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cleanup-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
        >
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="cleanup-modal-title" className="text-base font-extrabold text-slate-900">
                    Asisten Pembersihan &amp; Pengelolaan Berkas SPJ Lama
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih cara tercepat untuk mengarsipkan atau menghapus berkas SPJ yang sudah tidak dibutuhkan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCleanupModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 3 Tab Mode Pembersihan */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setCleanupTab('periode')}
                className={`py-2 px-2.5 rounded-xl transition-colors cursor-pointer text-center ${
                  cleanupTab === 'periode'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1. Per Bulan / Periode
              </button>
              <button
                type="button"
                onClick={() => setCleanupTab('sisakan-aktif')}
                className={`py-2 px-2.5 rounded-xl transition-colors cursor-pointer text-center ${
                  cleanupTab === 'sisakan-aktif'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2. Sisakan yg Aktif
              </button>
              <button
                type="button"
                onClick={() => setCleanupTab('kosongkan-semua')}
                className={`py-2 px-2.5 rounded-xl transition-colors cursor-pointer text-center ${
                  cleanupTab === 'kosongkan-semua'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3. Kosongkan (0 Berkas)
              </button>
            </div>

            {/* Konten Tab 1: Berdasarkan Bulan / Periode */}
            {cleanupTab === 'periode' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">
                    Pilih Bulan / Periode Perjalanan Dinas:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPeriodKeys.length === periodGroups.length) {
                        setSelectedPeriodKeys([]);
                      } else {
                        setSelectedPeriodKeys(periodGroups.map((g) => g.sortKey));
                      }
                    }}
                    className="text-sky-700 hover:text-sky-900 font-bold cursor-pointer"
                  >
                    {selectedPeriodKeys.length === periodGroups.length
                      ? 'Batal Pilih Semua'
                      : 'Pilih Semua Periode'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {periodGroups.map((grp) => {
                    const isChecked = selectedPeriodKeys.includes(grp.sortKey);
                    return (
                      <label
                        key={grp.sortKey}
                        className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-sky-50 border-sky-300'
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedPeriodKeys((prev) =>
                                prev.includes(grp.sortKey)
                                  ? prev.filter((k) => k !== grp.sortKey)
                                  : [...prev, grp.sortKey]
                              );
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-sky-700"
                          />
                          <div>
                            <p className="font-bold text-slate-900">{grp.label}</p>
                            <p className="text-[11px] text-slate-500">
                              {grp.ids.length} Berkas SPJ
                              {grp.archivedCount > 0 ? ` (${grp.archivedCount} diarsipkan)` : ''}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-slate-800">
                          {formatRupiah(grp.totalNilai)}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    Terpilih: <strong>{periodMatchedIds.length} berkas SPJ</strong>
                  </span>
                  <div className="flex items-center gap-2">
                    {onArchiveKuitansiBatch && (
                      <button
                        type="button"
                        disabled={periodMatchedIds.length === 0}
                        onClick={() => {
                          onArchiveKuitansiBatch(periodMatchedIds, true);
                          setIsCleanupModalOpen(false);
                        }}
                        className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Arsipkan ({periodMatchedIds.length})</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={periodMatchedIds.length === 0}
                      onClick={() =>
                        openSafetyDeleteModal(
                          periodMatchedIds,
                          `${periodMatchedIds.length} Berkas SPJ dari Periode Terpilih`
                        )
                      }
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Permanen ({periodMatchedIds.length})</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Konten Tab 2: Sapu Bersih Kecuali yang Sedang Aktif */}
            {cleanupTab === 'sisakan-aktif' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2 text-xs">
                  <p className="font-extrabold text-sky-950">
                    Berkas yang Tetap Disimpan (1 Berkas Aktif):
                  </p>
                  <div className="p-2.5 rounded-xl bg-white border border-sky-200/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {activeKuitansi.atasNama} — {activeKuitansi.tujuan}
                      </p>
                      <p className="font-mono text-[11px] text-red-700 truncate">
                        {activeKuitansi.noSpt}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 text-[10px] font-bold shrink-0">
                      Tetap Aman
                    </span>
                  </div>
                  <p className="text-slate-600 pt-1">
                    Sebanyak <strong>{nonActiveIds.length} berkas SPJ lainnya</strong> akan diarsipkan atau dihapus permanen.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {onArchiveKuitansiBatch && (
                    <button
                      type="button"
                      disabled={nonActiveIds.length === 0}
                      onClick={() => {
                        onArchiveKuitansiBatch(nonActiveIds, true);
                        setIsCleanupModalOpen(false);
                      }}
                      className="min-h-[40px] px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Archive className="w-4 h-4" />
                      <span>Arsipkan {nonActiveIds.length} Berkas Lainnya</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={nonActiveIds.length === 0}
                    onClick={() =>
                      openSafetyDeleteModal(
                        nonActiveIds,
                        `Sapu Bersih ${nonActiveIds.length} Berkas Lama (Menyisakan 1 Berkas Aktif)`
                      )
                    }
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Sapu Bersih {nonActiveIds.length} Berkas Lainnya</span>
                  </button>
                </div>
              </div>
            )}

            {/* Konten Tab 3: Kosongkan Seluruh Daftar Menjadi 0 Berkas */}
            {cleanupTab === 'kosongkan-semua' && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 space-y-2 text-xs">
                  <p className="font-extrabold text-red-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Kosongkan Daftar Sepenuhnya Menjadi 0 Berkas</span>
                  </p>
                  <p className="text-red-900 leading-relaxed">
                    Seluruh <strong>{kuitansiList.length} berkas SPJ</strong> (aktif maupun arsip) beserta foto kegiatan dan bukti pengeluaran terkait akan dihapus dari daftar sehingga daftar SPJ menjadi <strong>0 berkas</strong>.
                  </p>
                  <p className="text-[11px] text-red-800">
                    Pada langkah konfirmasi berikutnya, Anda tetap diberikan tombol untuk mengunduh cadangan (.JSON / .CSV) terlebih dahulu.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCleanupModalOpen(false)}
                    className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      openSafetyDeleteModal(
                        kuitansiList.map((k) => k.id),
                        `Kosongkan Seluruh Daftar (${kuitansiList.length} Berkas SPJ → Menjadi 0 Berkas)`
                      )
                    }
                    className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Lanjut Kosongkan Semua ({kuitansiList.length} Berkas)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. MODAL KONFIRMASI RINGKAS + OPSI UNDUH CADANGAN SEBELUM HAPUS PERMANEN */}
      {pendingDeleteSummary && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="safety-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="safety-delete-title" className="text-base font-extrabold text-slate-900">
                  Konfirmasi Hapus Permanen ({pendingDeleteSummary.count} Berkas)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pendingDeleteReason}
                </p>
              </div>
            </div>

            {/* Ringkasan Dampak Penghapusan */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Jumlah Berkas SPJ Dihapus:</span>
                <span className="font-mono font-extrabold text-slate-900">
                  {pendingDeleteSummary.count} Berkas SPJ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Nilai Kuitansi:</span>
                <span className="font-mono font-bold text-emerald-800">
                  {formatRupiah(pendingDeleteSummary.totalNilai)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lampiran Ikut Dibersihkan:</span>
                <span className="font-semibold text-slate-800">
                  {pendingDeleteSummary.photosCount} Foto &amp; {pendingDeleteSummary.expensesCount} Nota
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-700">Kondisi Daftar Setelah Hapus:</span>
                <span
                  className={`font-mono ${
                    pendingDeleteSummary.remainingCount === 0
                      ? 'text-red-700'
                      : 'text-sky-800'
                  }`}
                >
                  {pendingDeleteSummary.remainingCount === 0
                    ? '0 Berkas (Kosong Sepenuhnya)'
                    : `Tersisa ${pendingDeleteSummary.remainingCount} Berkas`}
                </span>
              </div>
            </div>

            {/* Pengaman Ekstra: Opsi Unduh Cadangan Dulu (1-Klik) */}
            <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-sky-950">
                  Simpan Cadangan Dulu Sebelum Dihapus (Opsional)
                </p>
                {hasDownloadedBackupInModal && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Terunduh</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-sky-900">
                Unduh salinan berkas ke HP/komputer Anda agar sewaktu-waktu tetap bisa dibuka atau dipulihkan kembali.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    downloadSpjBackupJson({
                      kuitansiItems: pendingDeleteSummary.kuitansiItems,
                      allSptList: sptList,
                      allDocPerjalanan,
                      allDocPengeluaran,
                      filenamePrefix: 'Cadangan_Sebelum_Hapus_SPJ',
                    });
                    setHasDownloadedBackupInModal(true);
                  }}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <span>Cadangan .JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadSpjBackupCsv({
                      kuitansiItems: pendingDeleteSummary.kuitansiItems,
                      allDocPerjalanan,
                      allDocPengeluaran,
                      filenamePrefix: 'Rekap_CSV_SPJ_Dihapus',
                    });
                    setHasDownloadedBackupInModal(true);
                  }}
                  className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>Ringkasan .CSV</span>
                </button>
              </div>
            </div>

            {/* Tombol Eksekusi Hapus Permanen */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingDeleteIds(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
