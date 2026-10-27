import React, { useState, useMemo, useRef } from 'react';
import {
  Wallet,
  FileText,
  Navigation,
  BadgeCheck,
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
  ChevronDown,
  ChevronUp,
  Clock,
  FileEdit,
  LayoutGrid,
  List,
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
import { SpjStatusBadge, SpjProgressBar } from './SpjStatusBadge';

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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Mode Pilih Banyak (Multi-Select)
  const [isSelectMode, setIsSelectMode] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedCardIds, setExpandedCardIds] = useState<string[]>([]);

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

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

  const activeRecord = useMemo(
    () => enrichedSpjRecords.find((r) => r.item.id === activeKuitansi.id),
    [enrichedSpjRecords, activeKuitansi.id]
  );
  const activeProgressPercent = activeRecord?.itemProgress.progressPercent ?? 0;

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

  // 6 Komponen Tak Terpisahkan dalam 1 Berkas SPJ Utuh (Minimal Badge & Color Cues)
  const subModules = [
    {
      key: 'spt' as SpjSubSectionKey,
      step: '1',
      title: 'SPT',
      microcopy: 'Surat Tugas Resmi',
      statusText: activeKuitansi.noSpt ? 'Selesai' : 'Pending',
      badgeClass: activeKuitansi.noSpt
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-amber-50 text-amber-800 border-amber-200',
      icon: FileText,
      iconColor: 'text-indigo-600 bg-indigo-50',
    },
    {
      key: 'spd' as SpjSubSectionKey,
      step: '2',
      title: 'SPD Depan',
      microcopy: 'Lembar Depan (86%)',
      statusText: 'Tersinkron',
      badgeClass: 'bg-sky-50 text-sky-800 border-sky-200',
      icon: Navigation,
      iconColor: 'text-sky-600 bg-sky-50',
    },
    {
      key: 'visum' as SpjSubSectionKey,
      step: '3',
      title: 'Visum',
      microcopy: 'Lembar Belakang',
      statusText: activeKuitansi.tujuan ? 'Selesai' : 'Pending',
      badgeClass: activeKuitansi.tujuan
        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
        : 'bg-amber-50 text-amber-800 border-amber-200',
      icon: BadgeCheck,
      iconColor: 'text-teal-600 bg-teal-50',
    },
    {
      key: 'kuitansi' as SpjSubSectionKey,
      step: '4',
      title: 'Kuitansi',
      microcopy: `${activeKuitansi.rincian.length} Rincian Biaya`,
      statusText: totalKuitansi > 0 ? formatRupiah(totalKuitansi) : 'Pending',
      badgeClass:
        totalKuitansi > 0
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-mono'
          : 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Wallet,
      iconColor: 'text-blue-600 bg-blue-50',
    },
    {
      key: 'dokumentasi' as SpjSubSectionKey,
      step: '5',
      title: 'Dokumentasi',
      microcopy: 'Foto Lapangan (16:9)',
      statusText: docPerjalanan.length > 0 ? `${docPerjalanan.length} Foto` : 'Pending',
      badgeClass:
        docPerjalanan.length > 0
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Camera,
      iconColor: 'text-emerald-600 bg-emerald-50',
    },
    {
      key: 'pengeluaran' as SpjSubSectionKey,
      step: '6',
      title: 'Bukti Bayar',
      microcopy: 'Tiket & Nota Riil',
      statusText:
        activeReconFeedback.tone === 'emerald' ? 'Lengkap' : 'Belum Lengkap',
      badgeClass:
        activeReconFeedback.tone === 'emerald'
          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
          : 'bg-amber-50 text-amber-800 border-amber-200',
      icon: Receipt,
      iconColor: 'text-amber-600 bg-amber-50',
    },
  ];

  return (
    <div className="space-y-4 min-w-0 max-w-full overflow-x-hidden pb-16">
      {/* Hidden input untuk pemulihan file cadangan .json */}
      <input
        ref={restoreInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleImportBackupFileChange}
        className="hidden"
      />

      {/* 0. IDENTITAS HALAMAN RUANG KERJA SPJ DINAS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1 min-w-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Ruang Kerja SPJ Dinas
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 shrink-0">
              Pengelolaan &amp; Editor Formulir
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Pusat pengelolaan berkas perjalanan dinas, arsip, dan pengisian detail 6 formulir dokumen (SPT, SPD, Visum, Kuitansi, Dokumentasi, &amp; Bukti Riil).
          </p>
        </div>
      </div>

      {/* 1. DAFTAR RIWAYAT BERKAS SPJ TERPADU + MANAJEMEN ARSIP & PEMBERSIHAN */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 min-w-0 max-w-full overflow-hidden">
        {/* Header Bar Ringkas */}
        <div className="flex items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5 min-w-0">
          <div className="min-w-0 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-sky-700 shrink-0" />
            <h2 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
              Daftar Semua Berkas SPJ
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 shrink-0">
              {kuitansiList.length} Berkas
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ SPJ Baru</span>
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
                Daftar SPJ Kosong
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Belum ada berkas perjalanan dinas yang dibuat atau seluruh berkas telah dibersihkan.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onCreateNewKuitansi}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Berkas SPJ</span>
              </button>
              {onRestoreBackupPayload && (
                <button
                  type="button"
                  onClick={() => restoreInputRef.current?.click()}
                  className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-sky-700" />
                  <span>Pulihkan (.json)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* BARIS TABS & UTILITY QUICK ACTIONS (MICROCOPY) */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => {
                    setArchiveTab('aktif');
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    archiveTab === 'aktif'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Aktif ({archiveCounts.aktif})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setArchiveTab('arsip');
                    setSelectedIds([]);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    archiveTab === 'arsip'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Arsip ({archiveCounts.arsip})
                </button>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setIsSelectMode((prev) => {
                      if (prev) setSelectedIds([]);
                      return !prev;
                    });
                  }}
                  className={`min-h-[32px] px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                    isSelectMode
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                  <span>{isSelectMode ? 'Batal' : 'Pilih'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (periodGroups.length > 0 && selectedPeriodKeys.length === 0) {
                      setSelectedPeriodKeys([periodGroups[0].sortKey]);
                    }
                    setIsCleanupModalOpen(true);
                  }}
                  title="Bersihkan berkas lama"
                  className="min-h-[32px] px-2.5 py-1 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>Bersihkan</span>
                </button>

                {onDuplicateKuitansi && (
                  <button
                    type="button"
                    onClick={onDuplicateKuitansi}
                    title="Duplikat berkas aktif"
                    className="min-h-[32px] px-2.5 py-1 rounded-lg border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[11px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 shrink-0" />
                    <span>Duplikat</span>
                  </button>
                )}

                {onRestoreBackupPayload && (
                  <button
                    type="button"
                    onClick={() => restoreInputRef.current?.click()}
                    title="Impor cadangan .JSON"
                    className="min-h-[32px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                    <span>Impor</span>
                  </button>
                )}
              </div>
            </div>

            {/* BARIS PENCARIAN & FILTER STATUS (MICROCOPY) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0 pt-0.5">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, SPT, atau tujuan..."
                  aria-label="Cari nama, SPT, atau tujuan"
                  className="w-full min-h-[36px] pl-8 pr-7 py-1 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Bersihkan pencarian"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  role="group"
                  aria-label="Filter status berkas SPJ"
                  className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl shrink-0 overflow-x-auto"
                >
                  <button
                    type="button"
                    onClick={() => setStatusFilter('semua')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      statusFilter === 'siap-cetak'
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Siap Cetak ({countsByFilter.siapCetak})
                  </button>
                </div>

                {/* View Mode Switcher (Kartu vs Tabel) */}
                <div
                  role="group"
                  aria-label="Mode tampilan berkas SPJ"
                  className="hidden md:flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-xl shrink-0"
                >
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    title="Tampilan Kartu"
                    aria-label="Tampilan Kartu"
                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      viewMode === 'cards'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    title="Tampilan Tabel"
                    aria-label="Tampilan Tabel"
                    className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
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
                {/* Tampilan Kartu SPJ (Mobile selalu kartu; Desktop mengikuti viewMode) */}
                <div
                  className={
                    viewMode === 'cards'
                      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 min-w-0'
                      : 'md:hidden space-y-3 min-w-0'
                  }
                >
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
                      const isExpanded = expandedCardIds.includes(item.id);

                      return (
                        <div
                          key={item.id}
                          className={`rounded-2xl border bg-white p-4 sm:p-5 space-y-3.5 transition-all duration-200 ease-out shadow-xs min-w-0 hover:-translate-y-0.5 hover:shadow-md will-change-transform ${
                            isChecked
                              ? 'border-sky-400 ring-2 ring-sky-200 shadow-sm'
                              : isActive
                                ? 'border-sky-300 ring-1 ring-sky-100 shadow-sm'
                                : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          {/* Header Bar: Checkbox / Sequence, Nama Pelaksana, Status Badge */}
                          <div className="flex items-center justify-between gap-2.5 min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {isSelectMode && (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleSelectId(item.id)}
                                  aria-label={`Pilih berkas SPJ ${item.atasNama}`}
                                  className="w-4 h-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600 cursor-pointer shrink-0"
                                />
                              )}
                              <span className="text-xs font-mono font-bold text-slate-400 shrink-0">
                                #{sequenceNumber}
                              </span>
                              <p className="text-sm font-extrabold text-slate-900 truncate">
                                {item.atasNama || '(Nama Belum Diisi)'}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isActive && (
                                <SpjStatusBadge tone="blue" label="Aktif" size="xs" />
                              )}
                              <SpjStatusBadge
                                tone={isSiapCetak ? 'green' : 'yellow'}
                                label={isSiapCetak ? 'Siap Cetak' : 'Belum Lengkap'}
                                size="xs"
                              />
                            </div>
                          </div>

                          {/* 2-Column Primary Data: Tujuan & Total Biaya */}
                          <div className="grid grid-cols-2 gap-3 text-xs py-2 border-y border-slate-100">
                            <div className="min-w-0">
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Tujuan</span>
                              <span className="font-semibold text-slate-800 truncate block mt-0.5">{item.tujuan || '-'}</span>
                            </div>
                            <div className="min-w-0 text-right">
                              <span className="block text-[10px] uppercase font-semibold text-slate-400">Total Biaya</span>
                              <span className="font-mono font-extrabold text-slate-900 tabular-nums truncate block mt-0.5">
                                {formatRupiah(itemTotal)}
                              </span>
                            </div>
                          </div>

                          {/* Minimalist Progress Bar */}
                          <div className="py-0.5">
                            <SpjProgressBar
                              percent={itemProgress.progressPercent}
                              tone={isSiapCetak ? 'green' : 'yellow'}
                              size="xs"
                              showLabel
                              labelText="Kelengkapan Berkas"
                            />
                          </div>

                          {/* Progressive Disclosure Accordion: Toggle Detail SPT */}
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => toggleExpandCard(item.id)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-900 cursor-pointer transition-colors"
                              aria-expanded={isExpanded}
                            >
                              <span>{isExpanded ? 'Sembunyikan Detail SPT' : 'Lihat Detail SPT & NIP'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                              )}
                            </button>

                            {isExpanded && (
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                                <div className="flex items-start gap-1 font-mono text-slate-700 break-all">
                                  <span className="font-bold text-slate-500 shrink-0">No. SPT:</span>
                                  <span>{item.noSpt}</span>
                                </div>
                                <div className="text-slate-600">
                                  {item.nipPenerima ? `NIP: ${item.nipPenerima}` : 'NIP belum diisi'} · {period.label}
                                </div>
                                <div className="flex items-center gap-2 pt-0.5">
                                  <SpjStatusBadge
                                    tone={isSiapCetak ? 'green' : 'yellow'}
                                    label={`${itemProgress.completedCount}/6 Selesai`}
                                    size="xs"
                                  />
                                  <span className="text-slate-400 font-mono text-[10px]">
                                    {formatRupiah(itemTotal)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Single Primary CTA: Buka SPJ */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectKuitansi(item.id);
                                onOpenSubSection('spt');
                              }}
                              className="flex-1 min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                            >
                              <FileEdit className="w-4 h-4 shrink-0" />
                              <span>Buka SPJ</span>
                            </button>

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
                              className="min-h-[42px] min-w-[42px] p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center shrink-0 border border-slate-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Tampilan Desktop (md+): Tabel Riwayat Lengkap */}
                {viewMode === 'table' && (
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
                                    <SpjStatusBadge tone="blue" label="Aktif" size="xs" />
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
                                <div className="w-32 pt-1">
                                  <SpjProgressBar
                                    percent={itemProgress.progressPercent}
                                    tone={isSiapCetak ? 'green' : 'yellow'}
                                    size="xs"
                                    showLabel
                                    labelText={`${itemProgress.completedCount}/6 Selesai`}
                                  />
                                </div>
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
                                <strong className="font-mono text-slate-900 tabular-nums">
                                  {formatRupiah(itemTotal)}
                                </strong>
                              </td>
                              <td
                                className="py-2.5 px-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isSiapCetak ? (
                                  <SpjStatusBadge tone="green" label="Siap Cetak" size="xs" />
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectKuitansi(item.id);
                                      onOpenSubSection('pengeluaran');
                                    }}
                                    className="cursor-pointer"
                                    title="Ketuk untuk melengkapi bukti"
                                  >
                                    <SpjStatusBadge tone="yellow" label="Belum Lengkap" size="xs" />
                                  </button>
                                )}
                              </td>
                              <td
                                className="py-2.5 px-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectKuitansi(item.id);
                                      onOpenSubSection('spt');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                                  >
                                    <FileEdit className="w-3 h-3 shrink-0" />
                                    <span>Buka SPJ</span>
                                  </button>

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
              )}
            </>
            )}
          </>
        )}
      </div>

      {/* 2. DOKUMEN SPJ AKTIF (1-6) - TAMPILAN MINIMALIS DENGAN MICROCOPY */}
      {!isEmptyAll && (
        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3 min-w-0 max-w-full overflow-hidden">
          {/* Header Bar Berkas Aktif */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2.5 border-b border-slate-100 min-w-0">
            <div className="min-w-0 space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700 truncate">
                  Editor 6 Dokumen SPJ Aktif
                </span>
                <SpjStatusBadge
                  tone={activeProgressPercent >= 100 ? 'green' : 'yellow'}
                  label={activeProgressPercent >= 100 ? 'Siap Cetak' : 'Belum Lengkap'}
                  size="xs"
                />
                <SpjStatusBadge tone="blue" label="Tersinkron" size="xs" />
              </div>
              <p className="text-xs font-bold text-slate-800 truncate">
                {activeKuitansi.atasNama || 'Pelaksana'} · {activeKuitansi.tujuan || 'Tujuan'}
              </p>
              <div className="w-full max-w-xs">
                <SpjProgressBar
                  percent={activeProgressPercent}
                  tone={activeProgressPercent >= 100 ? 'green' : 'yellow'}
                  size="xs"
                  showLabel
                  labelText="Kelengkapan Berkas Aktif"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenSubSection('spt')}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto shrink-0"
            >
              <Pencil className="w-3.5 h-3.5 shrink-0" />
              <span>Buka Formulir (1–6)</span>
            </button>
          </div>

          {/* 6 Bagian Dokumen dalam Grid Micro-Card Ringkas */}
          <div
            role="region"
            aria-label="6 Bagian Dokumen SPJ"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5 min-w-0 max-w-full"
          >
            {subModules.map((mod) => (
              <button
                key={mod.key}
                type="button"
                onClick={() => onOpenSubSection(mod.key)}
                className="flex flex-col justify-between p-2.5 rounded-xl border border-slate-200/90 bg-slate-50/60 hover:bg-white hover:border-sky-300 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md will-change-transform text-left cursor-pointer group shadow-2xs min-h-[84px]"
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    #{mod.step}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md border truncate max-w-[85px] ${mod.badgeClass}`}
                  >
                    {mod.statusText}
                  </span>
                </div>

                <div className="mt-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${mod.iconColor}`}>
                      <mod.icon className="w-3 h-3" />
                    </div>
                    <span className="text-xs font-extrabold text-slate-900 truncate group-hover:text-sky-800">
                      {mod.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {mod.microcopy}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. FLOATING BULK ACTION BAR (Saat Mode Pilih & Ada Berkas Tercentang — Diposisikan di atas FloatingBottomNav) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 sm:bottom-28 left-1/2 -translate-x-1/2 z-40 w-[calc(100vw-1.5rem)] max-w-3xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
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
