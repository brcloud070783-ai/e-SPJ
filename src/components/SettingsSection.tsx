import React, { useEffect, useState, useMemo } from 'react';
import {
  Settings,
  UserCheck,
  Building2,
  Printer,
  CheckCircle2,
  RotateCcw,
  Save,
  Upload,
  Download,
  FileSpreadsheet,
  Trash2,
  Users,
  Plus,
  Image as ImageIcon,
  Pencil,
  Check,
  X,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Star,
  Ban,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { AppSettings, PaperSize, PegawaiItem } from '../types/spj';
import { INITIAL_APP_SETTINGS, INITIAL_DAFTAR_PEGAWAI } from '../data/seedData';
import { KaltaraEmblem } from './KaltaraEmblem';
import { LabeledIcon, InfoTooltip } from './UiPatterns';
import {
  serializePegawaiCsv,
  parsePegawaiCsv,
  mergePegawaiList,
} from '../utils/spjCalculations';

interface SettingsSectionProps {
  settings: AppSettings;
  daftarPegawai: PegawaiItem[];
  paperSize: PaperSize;
  onSaveSettings: (nextSettings: AppSettings, applyToExistingKuitansi: boolean) => void;
  onUpdateDaftarPegawai: (nextList: PegawaiItem[]) => void;
  onChangePaperSize: (size: PaperSize) => void;
  onOpenWorkspaceModal: () => void;
  isGoogleConnected: boolean;
}

function readAndResizeLogoFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file logo.'));
    reader.onload = () => {
      const rawDataUrl = String(reader.result || '');
      if (file.type === 'image/svg+xml') {
        resolve(rawDataUrl);
        return;
      }
      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        const maxDim = 360;
        let width = img.naturalWidth || 200;
        let height = img.naturalHeight || 240;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(rawDataUrl);
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function triggerCsvDownload(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  settings,
  daftarPegawai,
  paperSize,
  onSaveSettings,
  onUpdateDaftarPegawai,
  onChangePaperSize,
  onOpenWorkspaceModal,
  isGoogleConnected,
}) => {
  const [draft, setDraft] = useState<AppSettings>({ ...settings });
  const [applyToExisting, setApplyToExisting] = useState<boolean>(true);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // State Form Tambah Pegawai Baru
  const [newPegawaiNip, setNewPegawaiNip] = useState('');
  const [newPegawaiNama, setNewPegawaiNama] = useState('');
  const [newPegawaiJabatan, setNewPegawaiJabatan] = useState('');
  const [newPegawaiPangkat, setNewPegawaiPangkat] = useState('');
  const [pegawaiError, setPegawaiError] = useState<string | null>(null);

  // State Import CSV & Pencarian
  const [csvImportMode, setCsvImportMode] = useState<'merge' | 'replace'>('merge');
  const [pegawaiSearchQuery, setPegawaiSearchQuery] = useState('');

  // State Edit Inline Pegawai
  const [editingPegawaiId, setEditingPegawaiId] = useState<string | null>(null);
  const [editPegawaiNip, setEditPegawaiNip] = useState('');
  const [editPegawaiNama, setEditPegawaiNama] = useState('');
  const [editPegawaiJabatan, setEditPegawaiJabatan] = useState('');
  const [editPegawaiPangkat, setEditPegawaiPangkat] = useState('');

  useEffect(() => {
    setDraft({ ...settings });
  }, [settings]);

  const handleField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const showToastBanner = (msg: string) => {
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(null), 4500);
  };

  const handleUploadLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const logoDataUrl = await readAndResizeLogoFile(file);
      const nextDraft: AppSettings = {
        ...draft,
        logoPemprovDataUrl: logoDataUrl,
      };
      setDraft(nextDraft);
      onSaveSettings(nextDraft, true);
      showToastBanner('Logo Pemprov berhasil diunggah dan diterapkan pada Kop Surat Kuitansi!');
    } catch {
      showToastBanner('Gagal memproses file gambar logo. Pastikan format PNG, JPG, atau SVG.');
    } finally {
      e.target.value = '';
    }
  };

  const handleResetLogoDefault = () => {
    const nextDraft: AppSettings = {
      ...draft,
      logoPemprovDataUrl: '',
    };
    setDraft(nextDraft);
    onSaveSettings(nextDraft, true);
    showToastBanner('Logo Kop Surat dikembalikan ke Lambang Provinsi Kalimantan Utara bawaan.');
  };

  // Employee Management Handlers
  const handleAddPegawai = () => {
    const cleanNip = newPegawaiNip.trim();
    const cleanNama = newPegawaiNama.trim();
    const cleanJabatan = newPegawaiJabatan.trim();
    const cleanPangkat = newPegawaiPangkat.trim();

    if (!cleanNip) {
      setPegawaiError('NIP Pegawai wajib diisi.');
      return;
    }
    if (!cleanNama) {
      setPegawaiError('Nama Pegawai wajib diisi.');
      return;
    }

    const newItem: PegawaiItem = {
      id: `peg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nip: cleanNip,
      nama: cleanNama,
      jabatan: cleanJabatan || undefined,
      pangkatGolongan: cleanPangkat || undefined,
    };

    const nextList = [...daftarPegawai, newItem];
    onUpdateDaftarPegawai(nextList);
    setNewPegawaiNip('');
    setNewPegawaiNama('');
    setNewPegawaiJabatan('');
    setNewPegawaiPangkat('');
    setPegawaiError(null);
    showToastBanner(`Pegawai "${cleanNama}" berhasil ditambahkan ke tabel Master Pegawai.`);
  };

  const handleStartEditPegawai = (peg: PegawaiItem) => {
    setEditingPegawaiId(peg.id);
    setEditPegawaiNip(peg.nip);
    setEditPegawaiNama(peg.nama);
    setEditPegawaiJabatan(peg.jabatan || '');
    setEditPegawaiPangkat(peg.pangkatGolongan || '');
  };

  const handleSaveEditPegawai = (id: string) => {
    const cleanNip = editPegawaiNip.trim();
    const cleanNama = editPegawaiNama.trim();
    if (!cleanNip || !cleanNama) return;

    const nextList = daftarPegawai.map((p) =>
      p.id === id
        ? {
            ...p,
            nip: cleanNip,
            nama: cleanNama,
            jabatan: editPegawaiJabatan.trim() || undefined,
            pangkatGolongan: editPegawaiPangkat.trim() || undefined,
          }
        : p
    );
    onUpdateDaftarPegawai(nextList);
    setEditingPegawaiId(null);
    showToastBanner(`Data pegawai "${cleanNama}" berhasil diperbarui.`);
  };

  const handleDeletePegawai = (peg: PegawaiItem) => {
    const nextList = daftarPegawai.filter((p) => p.id !== peg.id);
    onUpdateDaftarPegawai(nextList);
    showToastBanner(`Pegawai "${peg.nama}" dihapus dari daftar.`);
  };

  const handleDownloadPegawaiCsv = () => {
    const sourceList = daftarPegawai.length > 0 ? daftarPegawai : INITIAL_DAFTAR_PEGAWAI;
    const csvContent = serializePegawaiCsv(sourceList, true);
    triggerCsvDownload('daftar_pegawai_disdikbud_kaltara.csv', csvContent);
    showToastBanner(
      `File CSV (${sourceList.length} baris pegawai) berhasil diunduh.`
    );
  };

  const handleDownloadTemplateCsv = () => {
    const templateRows: PegawaiItem[] = [
      {
        id: 'tpl-1',
        nip: '198307072015031002',
        nama: 'Bayu Ramadhan',
        jabatan: 'Analis Perencanaan & Anggaran',
        pangkatGolongan: 'Penata Muda Tk. I (III/b)',
      },
      {
        id: 'tpl-2',
        nip: '197405272007011010',
        nama: 'Hasanuddin, S.Pd., M.Si',
        jabatan: 'Pengguna Anggaran',
        pangkatGolongan: 'Pembina Tk. I (IV/b)',
      },
    ];
    const csvContent = serializePegawaiCsv(templateRows, true);
    triggerCsvDownload('template_data_pegawai.csv', csvContent);
    showToastBanner(
      'Template CSV berhasil diunduh. Silakan isi di Excel/Spreadsheet lalu unggah kembali melalui tombol Upload CSV.'
    );
  };

  const handleUploadPegawaiCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => {
      setPegawaiError('Gagal membaca file CSV yang dipilih.');
      e.target.value = '';
    };
    reader.onload = () => {
      const text = String(reader.result || '');
      const parsed = parsePegawaiCsv(text);

      if (parsed.items.length === 0) {
        setPegawaiError(
          parsed.errors[0] ||
            'Tidak ditemukan data pegawai yang valid di dalam file CSV. Pastikan kolom: NIP Pegawai, Nama Pegawai, Nama Jabatan, Pangkat Golongan.'
        );
        e.target.value = '';
        return;
      }

      setPegawaiError(null);
      let nextList: PegawaiItem[];
      let summaryMsg = '';

      if (csvImportMode === 'replace') {
        nextList = parsed.items;
        summaryMsg = `Berhasil mengimpor ${parsed.items.length} data pegawai dari CSV (menggantikan daftar sebelumnya).`;
      } else {
        const mergedResult = mergePegawaiList(daftarPegawai, parsed.items);
        nextList = mergedResult.merged;
        summaryMsg = `CSV berhasil diimpor: ${mergedResult.addedCount} pegawai baru ditambahkan, ${mergedResult.updatedCount} pegawai diperbarui (Total: ${nextList.length} pegawai).`;
      }

      onUpdateDaftarPegawai(nextList);
      showToastBanner(summaryMsg);
      e.target.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleAssignPegawaiAsRole = (peg: PegawaiItem, role: 'pa' | 'bendahara') => {
    const nextDraft: AppSettings =
      role === 'pa'
        ? {
            ...draft,
            namaPenggunaAnggaran: peg.nama,
            nipPenggunaAnggaran: peg.nip,
          }
        : {
            ...draft,
            namaBendahara: peg.nama,
            nipBendahara: peg.nip,
          };
    setDraft(nextDraft);
    onSaveSettings(nextDraft, applyToExisting);
    showToastBanner(
      role === 'pa'
        ? `${peg.nama} ditetapkan sebagai Pengguna Anggaran / KPA.`
        : `${peg.nama} ditetapkan sebagai Bendahara Pengeluaran.`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(draft, applyToExisting);
    onChangePaperSize(draft.defaultPaperSize);
    showToastBanner(
      applyToExisting
        ? 'Pengaturan pejabat penandatangan, logo & kop surat berhasil disimpan dan diterapkan ke seluruh berkas Kuitansi SPJ!'
        : 'Pengaturan default berhasil disimpan untuk pembuatan Kuitansi SPJ berikutnya.'
    );
  };

  const handleResetDefaults = () => {
    setDraft(INITIAL_APP_SETTINGS);
    onSaveSettings(INITIAL_APP_SETTINGS, true);
    onUpdateDaftarPegawai(INITIAL_DAFTAR_PEGAWAI);
    onChangePaperSize(INITIAL_APP_SETTINGS.defaultPaperSize);
    showToastBanner('Pengaturan dikembalikan ke standar Dinas Pendidikan dan Kebudayaan Kaltara.');
  };

  // State Filter Status Pegawai
  const [pegawaiFilterStatus, setPegawaiFilterStatus] = useState<'semua' | 'aktif' | 'nonaktif' | 'prioritas'>('semua');

  const handleToggleStatusPegawai = (peg: PegawaiItem) => {
    const nextStatus = peg.statusActive === false ? true : false;
    const nextList = daftarPegawai.map((p) =>
      p.id === peg.id ? { ...p, statusActive: nextStatus } : p
    );
    onUpdateDaftarPegawai(nextList);
    showToastBanner(
      nextStatus
        ? `Pegawai "${peg.nama}" diaktifkan kembali (dapat dipilih pada form SPJ).`
        : `Pegawai "${peg.nama}" dinonaktifkan (disembunyikan dari pilihan auto-fill).`
    );
  };

  const handleTogglePriorityPegawai = (peg: PegawaiItem) => {
    const nextPrio = !peg.isPriority;
    const nextList = daftarPegawai.map((p) =>
      p.id === peg.id ? { ...p, isPriority: nextPrio } : p
    );
    onUpdateDaftarPegawai(nextList);
    showToastBanner(
      nextPrio
        ? `Pegawai "${peg.nama}" ditandai sebagai Prioritas (tampil di posisi teratas pilihan).`
        : `Pegawai "${peg.nama}" dilepas dari daftar prioritas.`
    );
  };

  // State Pengurutan / Sorting Data Pegawai
  type SortField = 'nama' | 'nip' | 'jabatan' | 'pangkat' | 'status' | 'prioritas' | 'default';
  type SortDir = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('default');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') {
        setSortDir('desc');
      } else {
        setSortField('default');
        setSortDir('asc');
      }
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Filtered & Sorted pegawai based on status, search query, and sorting selection
  const filteredPegawai = useMemo(() => {
    const query = pegawaiSearchQuery.trim().toLowerCase();
    const filtered = daftarPegawai.filter((peg) => {
      if (pegawaiFilterStatus === 'aktif' && peg.statusActive === false) return false;
      if (pegawaiFilterStatus === 'nonaktif' && peg.statusActive !== false) return false;
      if (pegawaiFilterStatus === 'prioritas' && !peg.isPriority) return false;

      if (!query) return true;
      return (
        peg.nama.toLowerCase().includes(query) ||
        peg.nip.toLowerCase().includes(query) ||
        (peg.jabatan && peg.jabatan.toLowerCase().includes(query)) ||
        (peg.pangkatGolongan && peg.pangkatGolongan.toLowerCase().includes(query))
      );
    });

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'nama':
          comparison = a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
          break;
        case 'nip':
          comparison = a.nip.localeCompare(b.nip, 'id', { numeric: true });
          break;
        case 'jabatan':
          comparison = (a.jabatan || '').localeCompare(b.jabatan || '', 'id', { sensitivity: 'base' });
          break;
        case 'pangkat':
          comparison = (a.pangkatGolongan || '').localeCompare(b.pangkatGolongan || '', 'id', { sensitivity: 'base' });
          break;
        case 'status': {
          const actA = a.statusActive !== false ? 1 : 0;
          const actB = b.statusActive !== false ? 1 : 0;
          comparison = actB - actA;
          break;
        }
        case 'prioritas': {
          const prioA = a.isPriority ? 1 : 0;
          const prioB = b.isPriority ? 1 : 0;
          comparison = prioB - prioA;
          break;
        }
        case 'default':
        default: {
          const prioA = a.isPriority ? 1 : 0;
          const prioB = b.isPriority ? 1 : 0;
          if (prioA !== prioB) return prioB - prioA;
          return a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' });
        }
      }

      return sortDir === 'asc' ? comparison : -comparison;
    });
  }, [daftarPegawai, pegawaiFilterStatus, pegawaiSearchQuery, sortField, sortDir]);

  // State Multi-Select Checkboxes & Mass Actions
  const [selectedPegawaiIds, setSelectedPegawaiIds] = useState<string[]>([]);

  const handleToggleSelectPegawai = (id: string) => {
    setSelectedPegawaiIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredPegawai.map((p) => p.id);
    const isAllSelected =
      allFilteredIds.length > 0 &&
      allFilteredIds.every((id) => selectedPegawaiIds.includes(id));

    if (isAllSelected) {
      setSelectedPegawaiIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedPegawaiIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleBulkSetStatus = (targetActive: boolean, useFiltered = false) => {
    const targetIds = useFiltered
      ? filteredPegawai.map((p) => p.id)
      : selectedPegawaiIds;

    if (targetIds.length === 0) return;

    const targetSet = new Set(targetIds);
    const nextList = daftarPegawai.map((p) =>
      targetSet.has(p.id) ? { ...p, statusActive: targetActive } : p
    );
    onUpdateDaftarPegawai(nextList);
    if (!useFiltered) setSelectedPegawaiIds([]);
    showToastBanner(
      targetActive
        ? `Berhasil mengaktifkan ${targetIds.length} pegawai!`
        : `Berhasil menonaktifkan ${targetIds.length} pegawai (disembunyikan dari pilihan SPJ)!`
    );
  };

  const handleBulkSetPriority = (targetPrio: boolean) => {
    if (selectedPegawaiIds.length === 0) return;
    const targetSet = new Set(selectedPegawaiIds);
    const nextList = daftarPegawai.map((p) =>
      targetSet.has(p.id) ? { ...p, isPriority: targetPrio } : p
    );
    onUpdateDaftarPegawai(nextList);
    setSelectedPegawaiIds([]);
    showToastBanner(
      targetPrio
        ? `Berhasil menandai ${selectedPegawaiIds.length} pegawai sebagai Prioritas!`
        : `Berhasil melepaskan prioritas ${selectedPegawaiIds.length} pegawai.`
    );
  };

  const handleBulkDelete = () => {
    if (selectedPegawaiIds.length === 0) return;
    const targetSet = new Set(selectedPegawaiIds);
    const count = selectedPegawaiIds.length;
    const nextList = daftarPegawai.filter((p) => !targetSet.has(p.id));
    onUpdateDaftarPegawai(nextList);
    setSelectedPegawaiIds([]);
    showToastBanner(`Berhasil menghapus ${count} data pegawai dari master.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700">
            <Settings className="w-3.5 h-3.5" />
            <span>Konfigurasi Sistem e-SPJ</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Pengaturan Instansi, Logo, Master Pegawai (CSV) &amp; Pejabat
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Unggah logo Pemprov, kelola dan impor database pegawai via file CSV untuk otomatisasi input kuitansi SPJ.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Standar Disdikbud</span>
        </button>
      </div>

      {savedMessage && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 flex items-center gap-2.5 shadow-2xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* SECTION 1: UPLOAD LOGO PEMPROV & IDENTITAS KOP SURAT DINAS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3">
          <LabeledIcon
            size="sm"
            icon={Building2}
            iconBgClass="bg-emerald-50 text-emerald-700 border border-emerald-200/70"
            label="1. Upload Logo Pemprov & Identitas Kop Surat Dinas"
            microcopy="Unggah file logo Pemerintah Provinsi (PNG/JPG/SVG) dan sesuaikan teks kop surat kuitansi."
            tooltipVariant="question"
            tooltipTitle="Logo Pemprov & Kop Surat Naskah Dinas"
            tooltipContent="Logo yang diunggah otomatis tampil pada pojok kiri atas Kop Surat Kuitansi Perjalanan Dinas saat dilihat maupun dicetak."
          />
        </div>

        {/* Kartu Upload Logo Pemprov */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="w-24 h-28 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center p-2 shrink-0">
            <KaltaraEmblem
              className="w-18 h-22"
              logoDataUrl={draft.logoPemprovDataUrl}
            />
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                Logo Pemerintah Provinsi pada Kop Surat
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  draft.logoPemprovDataUrl
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {draft.logoPemprovDataUrl ? 'Logo Kustom Aktif' : 'Logo Bawaan Kaltara'}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Unggah gambar logo resmi Pemerintah Provinsi dengan latar transparan (disarankan format <strong>PNG</strong> atau <strong>SVG</strong>) agar tercetak tajam di bagian kiri Kop Surat Kuitansi.
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <label
                htmlFor="setting-upload-logo-pemprov"
                className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Logo Pemprov</span>
                <input
                  id="setting-upload-logo-pemprov"
                  data-testid="input-upload-logo-pemprov"
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp,image/*"
                  onChange={handleUploadLogoChange}
                  className="sr-only"
                />
              </label>

              {draft.logoPemprovDataUrl && (
                <button
                  type="button"
                  onClick={handleResetLogoDefault}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Gunakan Logo Bawaan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="setting-instansi-utama"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Instansi Pemerintah
            </label>
            <input
              id="setting-instansi-utama"
              type="text"
              value={draft.instansiUtama}
              onChange={(e) => handleField('instansiUtama', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="setting-nama-dinas"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Nama Dinas / OPD
            </label>
            <input
              id="setting-nama-dinas"
              type="text"
              value={draft.namaDinas}
              onChange={(e) => handleField('namaDinas', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="setting-tahun-anggaran"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Tahun Anggaran Default
            </label>
            <input
              id="setting-tahun-anggaran"
              type="text"
              value={draft.tahunAnggaranDefault}
              onChange={(e) => handleField('tahunAnggaranDefault', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="setting-alamat-1"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Alamat Kop Surat Baris 1
            </label>
            <input
              id="setting-alamat-1"
              type="text"
              value={draft.alamatDinasBaris1}
              onChange={(e) => handleField('alamatDinasBaris1', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="setting-alamat-2"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Alamat Kop Surat Baris 2 &amp; Telepon
            </label>
            <input
              id="setting-alamat-2"
              type="text"
              value={draft.alamatDinasBaris2}
              onChange={(e) => handleField('alamatDinasBaris2', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="setting-kontak-dinas"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Laman Web &amp; Pos-el Kop Surat
            </label>
            <input
              id="setting-kontak-dinas"
              type="text"
              value={draft.kontakDinas}
              onChange={(e) => handleField('kontakDinas', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="setting-terima-dari"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Kalimat &ldquo;Sudah Terima Dari&rdquo; Default
            </label>
            <input
              id="setting-terima-dari"
              type="text"
              value={draft.sudahTerimaDariDefault}
              onChange={(e) => handleField('sudahTerimaDariDefault', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: KELOLA DATA PEGAWAI & IMPORT / EXPORT CSV */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <LabeledIcon
            size="sm"
            icon={Users}
            iconBgClass="bg-indigo-50 text-indigo-700 border border-indigo-200/70"
            label="2. Kelola Data Pegawai & Import / Export CSV"
            microcopy="Unggah file CSV pegawai untuk mengotomatiskan pengisian Nama, NIP, dan Jabatan saat membuat SPJ Kuitansi."
            tooltipVariant="info"
            tooltipTitle="Database Pegawai dari File CSV"
            tooltipContent="File CSV yang diunggah akan tersimpan di Local Storage. Saat membuat kuitansi baru, Anda dapat memilih pegawai langsung dari dropdown tanpa mengetik ulang."
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplateCsv}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Template CSV</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPegawaiCsv}
              className="min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-700" />
              <span>Ekspor CSV ({daftarPegawai.length})</span>
            </button>
          </div>
        </div>

        {/* Banner Upload CSV & Mode Selection */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs sm:text-sm font-extrabold text-indigo-950">
                Otomatisasi Input Pegawai via Upload CSV
              </h3>
              <p className="text-xs text-indigo-800/80 leading-relaxed mt-0.5">
                Format kolom CSV wajib: <strong>NIP Pegawai, Nama Pegawai, Nama Jabatan, Pangkat Golongan</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="setting-upload-pegawai-csv"
                className="min-h-[40px] px-4 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer shrink-0"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah File CSV</span>
                <input
                  id="setting-upload-pegawai-csv"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={handleUploadPegawaiCsv}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-indigo-900 border-t border-indigo-100 pt-2.5">
            <span className="font-semibold text-indigo-950">Mode Impor CSV:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="csvImportMode"
                value="merge"
                checked={csvImportMode === 'merge'}
                onChange={() => setCsvImportMode('merge')}
                className="text-indigo-700 focus:ring-indigo-600"
              />
              <span>Gabungkan &amp; Perbarui Data</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="csvImportMode"
                value="replace"
                checked={csvImportMode === 'replace'}
                onChange={() => setCsvImportMode('replace')}
                className="text-indigo-700 focus:ring-indigo-600"
              />
              <span>Gantikan Seluruh Daftar</span>
            </label>
          </div>
        </div>

        {pegawaiError && (
          <div role="alert" className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 font-medium">
            {pegawaiError}
          </div>
        )}

        {/* Form Tambah Pegawai Manual */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
            Tambah Pegawai Manual ke Master Data
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="input-new-peg-nip" className="block text-[11px] font-medium text-slate-600 mb-1">
                NIP Pegawai *
              </label>
              <input
                id="input-new-peg-nip"
                type="text"
                placeholder="18 digit NIP..."
                value={newPegawaiNip}
                onChange={(e) => setNewPegawaiNip(e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="input-new-peg-nama" className="block text-[11px] font-medium text-slate-600 mb-1">
                Nama Lengkap &amp; Gelar *
              </label>
              <input
                id="input-new-peg-nama"
                type="text"
                placeholder="Nama pegawai..."
                value={newPegawaiNama}
                onChange={(e) => setNewPegawaiNama(e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="input-new-peg-jabatan" className="block text-[11px] font-medium text-slate-600 mb-1">
                Nama Jabatan
              </label>
              <input
                id="input-new-peg-jabatan"
                type="text"
                placeholder="Jabatan dinas..."
                value={newPegawaiJabatan}
                onChange={(e) => setNewPegawaiJabatan(e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="input-new-peg-pangkat" className="block text-[11px] font-medium text-slate-600 mb-1">
                Pangkat / Golongan
              </label>
              <input
                id="input-new-peg-pangkat"
                type="text"
                placeholder="Golongan (III/c)..."
                value={newPegawaiPangkat}
                onChange={(e) => setNewPegawaiPangkat(e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddPegawai}
              className="min-h-[38px] px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Pegawai</span>
            </button>
          </div>
        </div>

        {/* Tabel Master Data Pegawai */}
        <div className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 mr-1">
                Filter Status:
              </span>
              <button
                type="button"
                onClick={() => setPegawaiFilterStatus('semua')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  pegawaiFilterStatus === 'semua'
                    ? 'bg-slate-900 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua ({daftarPegawai.length})
              </button>
              <button
                type="button"
                onClick={() => setPegawaiFilterStatus('aktif')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  pegawaiFilterStatus === 'aktif'
                    ? 'bg-emerald-700 text-white font-bold'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                Aktif ({daftarPegawai.filter((p) => p.statusActive !== false).length})
              </button>
              <button
                type="button"
                onClick={() => setPegawaiFilterStatus('prioritas')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                  pegawaiFilterStatus === 'prioritas'
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Prioritas ({daftarPegawai.filter((p) => p.isPriority).length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPegawaiFilterStatus('nonaktif')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  pegawaiFilterStatus === 'nonaktif'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Non-Aktif ({daftarPegawai.filter((p) => p.statusActive === false).length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                  Urutkan:
                </span>
                <select
                  value={`${sortField}-${sortDir}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'default') {
                      setSortField('default');
                      setSortDir('asc');
                    } else {
                      const [f, d] = val.split('-') as [SortField, SortDir];
                      setSortField(f);
                      setSortDir(d || 'asc');
                    }
                  }}
                  className="min-h-[36px] rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer shadow-2xs"
                >
                  <option value="default">⭐ Standar (Prioritas &amp; Nama)</option>
                  <option value="nama-asc">🔤 Nama Pegawai (A - Z)</option>
                  <option value="nama-desc">🔤 Nama Pegawai (Z - A)</option>
                  <option value="nip-asc">🔢 NIP Pegawai (Terkecil - Terbesar)</option>
                  <option value="nip-desc">🔢 NIP Pegawai (Terbesar - Terkecil)</option>
                  <option value="prioritas-asc">⭐ Prioritas Teratas</option>
                  <option value="status-asc">✅ Status Aktif Teratas</option>
                  <option value="jabatan-asc">💼 Jabatan (A - Z)</option>
                  <option value="pangkat-asc">🎖️ Pangkat / Golongan (A - Z)</option>
                </select>
              </div>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari NIP, Nama, Jabatan..."
                  value={pegawaiSearchQuery}
                  onChange={(e) => setPegawaiSearchQuery(e.target.value)}
                  className="w-full min-h-[36px] rounded-xl border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>
          </div>

          {/* Action Bar / Quick Actions */}
          {selectedPegawaiIds.length > 0 ? (
            <div className="rounded-xl border border-sky-300 bg-sky-50 p-3 flex flex-wrap items-center justify-between gap-2 shadow-xs animate-fadeIn">
              <div className="flex items-center gap-2 font-bold text-xs text-sky-950">
                <span className="px-2 py-0.5 rounded-md bg-sky-700 text-white font-mono text-[11px]">
                  {selectedPegawaiIds.length}
                </span>
                <span>Pegawai Terpilih</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => handleBulkSetStatus(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                  title="Menonaktifkan semua pegawai yang dicentang dari pilihan SPJ"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Non-Aktifkan Terpilih</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetStatus(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                  title="Mengaktifkan kembali pegawai terpilih"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aktifkan Terpilih</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetPriority(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                  <span>Set Prioritas</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSetPriority(false)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-medium inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Star className="w-3.5 h-3.5 text-slate-400" />
                  <span>Off Prioritas</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPegawaiIds([])}
                  className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-[11px] underline cursor-pointer ml-1"
                >
                  Batal Pilih
                </button>
              </div>
            </div>
          ) : (
            filteredPegawai.some((p) => p.statusActive !== false) &&
            (pegawaiSearchQuery.trim() !== '' || pegawaiFilterStatus === 'aktif') && (
              <div className="flex flex-wrap items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs gap-2">
                <span className="text-slate-600 font-medium">
                  Perlu menonaktifkan seluruh hasil filter ({filteredPegawai.filter((p) => p.statusActive !== false).length} pegawai)?
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkSetStatus(false, true)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Ban className="w-3.5 h-3.5 text-amber-400" />
                  <span>Non-Aktifkan Semua ({filteredPegawai.filter((p) => p.statusActive !== false).length}) Hasil Filter</span>
                </button>
              </div>
            )
          )}

          <div className="rounded-xl border border-slate-200 overflow-x-auto bg-white">
            <table className="w-full text-left text-xs text-slate-800 border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredPegawai.length > 0 &&
                        filteredPegawai.every((p) => selectedPegawaiIds.includes(p.id))
                      }
                      ref={(el) => {
                        if (el) {
                          const allFilteredIds = filteredPegawai.map((p) => p.id);
                          const isAllSelected =
                            allFilteredIds.length > 0 &&
                            allFilteredIds.every((id) => selectedPegawaiIds.includes(id));
                          const isSomeSelected =
                            allFilteredIds.some((id) => selectedPegawaiIds.includes(id)) &&
                            !isAllSelected;
                          el.indeterminate = isSomeSelected;
                        }
                      }}
                      onChange={handleSelectAllFiltered}
                      className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                      title="Centang Semua / Batal Pilih"
                    />
                  </th>
                  <th className="p-3 w-10 text-center">#</th>

                  <th
                    onClick={() => handleToggleSort('nip')}
                    className="p-3 min-w-[130px] select-none cursor-pointer hover:bg-slate-200/80 transition-colors"
                    title="Ketuk untuk mengurutkan berdasarkan NIP Pegawai"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>NIP Pegawai</span>
                      {sortField === 'nip' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('nama')}
                    className="p-3 min-w-[170px] select-none cursor-pointer hover:bg-slate-200/80 transition-colors"
                    title="Ketuk untuk mengurutkan berdasarkan Nama Pegawai"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Pegawai</span>
                      {sortField === 'nama' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('jabatan')}
                    className="p-3 min-w-[150px] select-none cursor-pointer hover:bg-slate-200/80 transition-colors"
                    title="Ketuk untuk mengurutkan berdasarkan Nama Jabatan"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Nama Jabatan</span>
                      {sortField === 'jabatan' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('pangkat')}
                    className="p-3 min-w-[130px] select-none cursor-pointer hover:bg-slate-200/80 transition-colors"
                    title="Ketuk untuk mengurutkan berdasarkan Pangkat / Golongan"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Pangkat / Gol.</span>
                      {sortField === 'pangkat' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('status')}
                    className="p-3 min-w-[100px] text-center select-none cursor-pointer hover:bg-slate-200/80 transition-colors"
                    title="Ketuk untuk mengurutkan berdasarkan Status"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      {sortField === 'status' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </th>

                  <th
                    onClick={() => handleToggleSort('prioritas')}
                    className="p-3 min-w-[110px] text-center select-none cursor-pointer hover:bg-slate-200/80 transition-colors"
                    title="Ketuk untuk mengurutkan berdasarkan Prioritas"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Prioritas</span>
                      {sortField === 'prioritas' ? (
                        sortDir === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-sky-700 font-bold shrink-0" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 hover:opacity-100 shrink-0" />
                      )}
                    </div>
                  </th>

                  <th className="p-3 text-right min-w-[180px]">Aksi &amp; Peran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPegawai.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-500 text-xs">
                      Tidak ada data pegawai yang cocok dengan filter / pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredPegawai.map((peg, idx) => {
                    const isEditing = editingPegawaiId === peg.id;
                    const isPa = draft.nipPenggunaAnggaran === peg.nip;
                    const isBendahara = draft.nipBendahara === peg.nip;
                    const isActive = peg.statusActive !== false;
                    const isPrio = Boolean(peg.isPriority);
                    const isChecked = selectedPegawaiIds.includes(peg.id);

                    if (isEditing) {
                      return (
                        <tr key={peg.id} className="bg-sky-50/50">
                          <td className="p-3 text-center"></td>
                          <td className="p-3 text-center font-mono font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editPegawaiNip}
                              onChange={(e) => setEditPegawaiNip(e.target.value)}
                              className="w-full min-h-[32px] rounded-md border border-sky-300 bg-white px-2 py-1 text-xs font-mono"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editPegawaiNama}
                              onChange={(e) => setEditPegawaiNama(e.target.value)}
                              className="w-full min-h-[32px] rounded-md border border-sky-300 bg-white px-2 py-1 text-xs font-semibold"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editPegawaiJabatan}
                              onChange={(e) => setEditPegawaiJabatan(e.target.value)}
                              className="w-full min-h-[32px] rounded-md border border-sky-300 bg-white px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={editPegawaiPangkat}
                              onChange={(e) => setEditPegawaiPangkat(e.target.value)}
                              className="w-full min-h-[32px] rounded-md border border-sky-300 bg-white px-2 py-1 text-xs"
                            />
                          </td>
                          <td className="p-2 text-center" colSpan={2}>
                            <span className="text-[10px] text-slate-500">Mode Edit</span>
                          </td>
                          <td className="p-2 text-right space-x-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEditPegawai(peg.id)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Simpan</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPegawaiId(null)}
                              className="px-2 py-1 rounded-md border border-slate-300 bg-white text-slate-600 text-[11px] cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={peg.id}
                        className={`transition-colors ${
                          isChecked
                            ? 'bg-sky-50/70'
                            : !isActive
                            ? 'bg-slate-50/90 text-slate-400 opacity-75'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectPegawai(peg.id)}
                            className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center font-mono font-medium text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-mono font-medium text-slate-900">{peg.nip}</td>
                        <td className="p-3 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{peg.nama}</span>
                            {isPrio && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-0.5">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-600 shrink-0" />
                                <span>Prioritas</span>
                              </span>
                            )}
                            {!isActive && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700">
                                Non-Aktif
                              </span>
                            )}
                          </div>
                          {(isPa || isBendahara) && (
                            <div className="flex gap-1 mt-0.5">
                              {isPa && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-0.5">
                                  <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                                  <span>Pengguna Anggaran</span>
                                </span>
                              )}
                              {isBendahara && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-100 text-sky-800 border border-sky-200 inline-flex items-center gap-0.5">
                                  <Wallet className="w-2.5 h-2.5 shrink-0" />
                                  <span>Bendahara</span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{peg.jabatan || '-'}</td>
                        <td className="p-3 text-slate-600">{peg.pangkatGolongan || '-'}</td>

                        {/* Status Toggle Button */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatusPegawai(peg)}
                            title={
                              isActive
                                ? 'Ketuk untuk menonaktifkan pegawai dari daftar pilihan SPJ'
                                : 'Ketuk untuk mengaktifkan kembali pegawai ini'
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 border border-slate-300 hover:bg-slate-300'
                            }`}
                          >
                            {isActive ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>Aktif</span>
                              </>
                            ) : (
                              <>
                                <Ban className="w-3 h-3 text-slate-500 shrink-0" />
                                <span>Non-Aktif</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Prioritas Toggle Button */}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePriorityPegawai(peg)}
                            title={
                              isPrio
                                ? 'Pegawai prioritas (selalu di urutan atas). Ketuk untuk melepas'
                                : 'Ketuk untuk jadikan pegawai prioritas / sering dipilih'
                            }
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                              isPrio
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <Star
                              className={`w-3 h-3 shrink-0 ${
                                isPrio ? 'fill-amber-500 text-amber-600' : 'text-slate-400'
                              }`}
                            />
                            <span>{isPrio ? 'Prioritas' : 'Biasa'}</span>
                          </button>
                        </td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!isPa && (
                              <button
                                type="button"
                                title="Tetapkan pegawai ini sebagai Pengguna Anggaran"
                                onClick={() => handleAssignPegawaiAsRole(peg, 'pa')}
                                className="px-2 py-1 rounded-md border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <ShieldCheck className="w-3 h-3 text-amber-700 shrink-0" />
                                <span>Set PA</span>
                              </button>
                            )}
                            {!isBendahara && (
                              <button
                                type="button"
                                title="Tetapkan pegawai ini sebagai Bendahara Pengeluaran"
                                onClick={() => handleAssignPegawaiAsRole(peg, 'bendahara')}
                                className="px-2 py-1 rounded-md border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-900 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Wallet className="w-3 h-3 text-sky-700 shrink-0" />
                                <span>Set Bendahara</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleStartEditPegawai(peg)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-sky-700 hover:bg-slate-100 cursor-pointer"
                              title="Edit Data Pegawai"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeletePegawai(peg)}
                              className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              title="Hapus Pegawai"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 3: PEJABAT PENANDATANGAN */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <LabeledIcon
              size="sm"
              icon={UserCheck}
              iconBgClass="bg-sky-50 text-sky-700 border border-sky-200/70"
              label="3. Pejabat yang Bertanda Tangan (Kuitansi & SPJ)"
              microcopy="Nama dan NIP pejabat di bawah ini otomatis dicetak pada bagian tanda tangan Kuitansi Perjalanan Dinas."
              tooltipVariant="info"
              tooltipTitle="Sentralisasi Pejabat Penandatangan"
              tooltipContent="Pengaturan ini menghindari pengetikan berulang nama Pengguna Anggaran dan Bendahara pada setiap pembuatan kuitansi baru."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Pengguna Anggaran / KPA */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Pejabat Penyetuju (PA / KPA)
              </span>

              <div>
                <label
                  htmlFor="setting-jabatan-pa"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Jabatan Penandatangan Setuju
                </label>
                <input
                  id="setting-jabatan-pa"
                  type="text"
                  value={draft.jabatanPenggunaAnggaran}
                  onChange={(e) => handleField('jabatanPenggunaAnggaran', e.target.value)}
                  placeholder="Contoh: Pengguna Anggaran / Kuasa Pengguna Anggaran"
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="setting-nama-pa"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Nama Lengkap &amp; Gelar Pengguna Anggaran
                </label>
                <input
                  id="setting-nama-pa"
                  type="text"
                  value={draft.namaPenggunaAnggaran}
                  onChange={(e) => handleField('namaPenggunaAnggaran', e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="setting-nip-pa"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  NIP Pengguna Anggaran
                </label>
                <input
                  id="setting-nip-pa"
                  type="text"
                  value={draft.nipPenggunaAnggaran}
                  onChange={(e) => handleField('nipPenggunaAnggaran', e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                />
              </div>
            </div>

            {/* Bendahara Pengeluaran */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Bendahara Pengeluaran / Pembantu
              </span>

              <div>
                <label
                  htmlFor="setting-jabatan-bendahara"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Jabatan Bendahara
                </label>
                <input
                  id="setting-jabatan-bendahara"
                  type="text"
                  value={draft.jabatanBendahara}
                  onChange={(e) => handleField('jabatanBendahara', e.target.value)}
                  placeholder="Contoh: Bendahara Pengeluaran"
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="setting-nama-bendahara"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Nama Lengkap &amp; Gelar Bendahara
                </label>
                <input
                  id="setting-nama-bendahara"
                  type="text"
                  value={draft.namaBendahara}
                  onChange={(e) => handleField('namaBendahara', e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label
                  htmlFor="setting-nip-bendahara"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  NIP Bendahara
                </label>
                <input
                  id="setting-nip-bendahara"
                  type="text"
                  value={draft.nipBendahara}
                  onChange={(e) => handleField('nipBendahara', e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 items-center">
            <div>
              <label
                htmlFor="setting-kota-ttd"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Kota Tempat Tanda Tangan Default
              </label>
              <input
                id="setting-kota-ttd"
                type="text"
                value={draft.kotaTtdDefault}
                onChange={(e) => handleField('kotaTtdDefault', e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: PREFERENSI CETAK */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <LabeledIcon
              size="sm"
              icon={Printer}
              iconBgClass="bg-amber-50 text-amber-700 border border-amber-200/70"
              label="4. Preferensi Kertas Cetak"
              microcopy="Atur ukuran kertas default (A4 atau F4 Folio) untuk pratinjau dan pencetakan dokumen."
              tooltipVariant="info"
              tooltipTitle="Ukuran Kertas A4 vs F4 Folio"
              tooltipContent="A4 berukuran 210 × 297 mm, sedangkan F4 (Folio) berukuran 215 × 330 mm yang umum digunakan untuk berkas SPJ pemerintahan."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="block text-xs font-medium text-slate-700">
                  Ukuran Kertas Cetak Default
                </span>
                <InfoTooltip
                  variant="question"
                  align="left"
                  title="Pratinjau & Cetak Kertas"
                  content="Pilihan ini menentukan ukuran lembar default saat Anda membuka pratinjau cetak Kuitansi maupun Lampiran."
                />
              </div>
              <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleField('defaultPaperSize', 'A4')}
                  className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    draft.defaultPaperSize === 'A4'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  A4 (210 × 297 mm)
                </button>
                <button
                  type="button"
                  onClick={() => handleField('defaultPaperSize', 'F4')}
                  className={`min-h-[38px] px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    draft.defaultPaperSize === 'F4'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  F4 Folio (215 × 330 mm)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={applyToExisting}
              onChange={(e) => setApplyToExisting(e.target.checked)}
              className="rounded border-slate-300 text-sky-700 focus:ring-sky-600 w-4 h-4"
            />
            <span>
              Terapkan perubahan logo, nama pejabat &amp; kop surat ke <strong>seluruh Kuitansi SPJ yang sudah ada</strong>
            </span>
          </label>

          <button
            type="submit"
            className="min-h-[46px] px-6 py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  );
};
