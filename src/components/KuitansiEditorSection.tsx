import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  User,
  Wallet,
  ChevronDown,
  ChevronUp,
  Printer,
  X,
  Users,
  Calendar,
} from 'lucide-react';
import {
  KuitansiPerjalananDinas,
  RincianBiayaItem,
  RincianKategori,
  CustomFieldDefinition,
  CustomFieldType,
  LampiranDokumenItem,
  PaperSize,
  PegawaiItem,
  SuratPerintahTugas,
} from '../types/spj';

import {
  calculateKuitansiTotal,
  calculateRincianRowTotal,
  formatRupiah,
  terbilangRupiah,
  validateKuitansiInput,
  validateCustomFieldDefinition,
  formatRincianFormula,
  formatKuitansiTravelRange,
  formatIndonesianFormalDate,
} from '../utils/spjCalculations';
import {
  KuitansiDocumentPreview,
  CanvasEditableZone,
} from './KuitansiDocumentPreview';
import { InteractivePaperViewer } from './InteractivePaperViewer';
import { LabeledIcon, InfoTooltip, EmptyStateCard } from './UiPatterns';

interface KuitansiEditorSectionProps {
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansiId: string;
  onSelectKuitansi: (id: string) => void;
  onSaveKuitansi: (updated: KuitansiPerjalananDinas) => void;
  onCreateNewKuitansi: () => void;
  onOpenSyncModal: () => void;
  customFields: CustomFieldDefinition[];
  onAddCustomField: (field: CustomFieldDefinition) => void;
  onUpdateCustomField: (field: CustomFieldDefinition) => void;
  onRemoveCustomField: (fieldId: string) => void;
  onUploadLampiranToDrive?: (
    kuitansiId: string,
    lampiran: LampiranDokumenItem
  ) => Promise<void>;
  onDeleteLampiran?: (kuitansiId: string, lampiran: LampiranDokumenItem) => Promise<void>;
  onDeleteKuitansi?: () => void;
  isGoogleConnected: boolean;
  isUploading?: boolean;
  autoSyncEnabled: boolean;
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
  logoPemprovDataUrl?: string;
  daftarPegawai?: PegawaiItem[];
  sptList?: SuratPerintahTugas[];
}

export const KuitansiEditorSection: React.FC<KuitansiEditorSectionProps> = ({
  kuitansiList,
  activeKuitansiId,
  onSelectKuitansi,
  onSaveKuitansi,
  onCreateNewKuitansi,
  onOpenSyncModal,
  customFields,
  onAddCustomField,
  onUpdateCustomField,
  onRemoveCustomField,
  onDeleteKuitansi,
  isGoogleConnected,
  autoSyncEnabled,
  paperSize,
  onChangePaperSize,
  logoPemprovDataUrl,
  daftarPegawai = [],
  sptList = [],
}) => {
  const currentKuitansi =
    kuitansiList.find((k) => k.id === activeKuitansiId) || kuitansiList[0];

  const [draft, setDraft] = useState<KuitansiPerjalananDinas>(currentKuitansi);
  const [formTab, setFormTab] = useState<CanvasEditableZone>('utama');
  // Canva Mobile Bottom Sheet state: open when user taps a tool in the bottom dock or taps directly on the paper canvas
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  const [showAnggaranDetail, setShowAnggaranDetail] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  // Custom Field Builder State
  const [showCustomFieldBuilder, setShowCustomFieldBuilder] = useState(false);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldShowInPrint, setNewFieldShowInPrint] = useState(true);
  const [customFieldError, setCustomFieldError] = useState<string | null>(null);

  const getTodayIso = (addDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [kuiIsoStart, setKuiIsoStart] = useState<string>(() => getTodayIso(0));
  const [kuiIsoEnd, setKuiIsoEnd] = useState<string>(() => getTodayIso(2));

  const kuiStartPickerRef = React.useRef<HTMLInputElement>(null);
  const kuiEndPickerRef = React.useRef<HTMLInputElement>(null);
  const kuiTtdPickerRef = React.useRef<HTMLInputElement>(null);

  const handleOpenKuiStartPicker = () => {
    const el = kuiStartPickerRef.current;
    if (el) {
      try {
        if (typeof (el as any).showPicker === 'function') {
          (el as any).showPicker();
        } else {
          el.focus();
          el.click();
        }
      } catch {
        el.focus();
        el.click();
      }
    }
  };

  const handleOpenKuiEndPicker = () => {
    const el = kuiEndPickerRef.current;
    if (el) {
      try {
        if (typeof (el as any).showPicker === 'function') {
          (el as any).showPicker();
        } else {
          el.focus();
          el.click();
        }
      } catch {
        el.focus();
        el.click();
      }
    }
  };

  const handleOpenKuiTtdPicker = () => {
    const el = kuiTtdPickerRef.current;
    if (el) {
      try {
        if (typeof (el as any).showPicker === 'function') {
          (el as any).showPicker();
        } else {
          el.focus();
          el.click();
        }
      } catch {
        el.focus();
        el.click();
      }
    }
  };

  const applyKuiDateSelection = (startIso: string, endIso: string) => {
    setKuiIsoStart(startIso);
    setKuiIsoEnd(endIso);

    const formattedRange = formatKuitansiTravelRange(startIso, endIso);
    const next: KuitansiPerjalananDinas = {
      ...draft,
      tanggalPerjalanan: formattedRange,
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    onSaveKuitansi(next);
  };

  const handleKuiTtdDateChange = (isoDate: string) => {
    if (!isoDate) return;
    const formattedDate = formatIndonesianFormalDate(isoDate, false);
    let city = 'Tanjung Selor';
    if (draft.tempatTanggalTtd && draft.tempatTanggalTtd.includes(',')) {
      city = draft.tempatTanggalTtd.split(',')[0].trim() || 'Tanjung Selor';
    }
    const dateOnly = formattedDate.replace(/^[^,]+,\s*/, '');
    const nextVal = `${city}, ${dateOnly}`;
    const next: KuitansiPerjalananDinas = {
      ...draft,
      tempatTanggalTtd: nextVal,
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    onSaveKuitansi(next);
  };

  const prevActiveIdRef = React.useRef<string>(activeKuitansiId);

  React.useEffect(() => {
    const found = kuitansiList.find((k) => k.id === activeKuitansiId);
    if (found) {
      setDraft(found);
      setValidationErrors([]);
      if (
        prevActiveIdRef.current !== activeKuitansiId &&
        found.id.startsWith('kui-dup-')
      ) {
        setFormTab('utama');
        setSaveBanner(
          `Draft kuitansi berhasil diduplikat (${found.noKuitansi}). Silakan ubah Nama Penerima / NIP.`
        );
      }
      prevActiveIdRef.current = activeKuitansiId;
    }
  }, [activeKuitansiId, kuitansiList]);

  // Lock background page scroll when Mobile Bottom Sheet is open
  React.useEffect(() => {
    if (!isMobileSheetOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isMobileSheetOpen]);

  const handleSelectZoneFromCanvas = (zone: CanvasEditableZone) => {
    if (isMobileSheetOpen && formTab === zone) {
      setIsMobileSheetOpen(false);
      return;
    }
    setFormTab(zone);
    setIsMobileSheetOpen(true);
  };

  const handleOpenMobileTool = (zone: CanvasEditableZone) => {
    if (isMobileSheetOpen && formTab === zone) {
      setIsMobileSheetOpen(false);
      return;
    }
    setFormTab(zone);
    setIsMobileSheetOpen(true);
  };

  const handleFieldChange = (field: keyof KuitansiPerjalananDinas, value: string) => {
    const next = { ...draft, [field]: value, updatedAt: new Date().toISOString() };
    setDraft(next);
    onSaveKuitansi(next);
  };

  const handleCustomFieldValueChange = (fieldId: string, value: string) => {
    const nextValues = {
      ...(draft.customFieldValues || {}),
      [fieldId]: value,
    };
    const next: KuitansiPerjalananDinas = {
      ...draft,
      customFieldValues: nextValues,
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    onSaveKuitansi(next);
  };

  const handleCreateCustomField = () => {
    const check = validateCustomFieldDefinition(
      newFieldLabel,
      customFields.map((c) => c.label)
    );
    if (!check.valid) {
      setCustomFieldError(check.error || 'Nama bidang tidak valid.');
      return;
    }
    setCustomFieldError(null);
    const id = `cf-${newFieldLabel
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-3)}`;

    const parsedOptions =
      newFieldType === 'select'
        ? newFieldOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    const newField: CustomFieldDefinition = {
      id,
      label: newFieldLabel.trim(),
      type: newFieldType,
      options:
        parsedOptions && parsedOptions.length > 0
          ? parsedOptions
          : newFieldType === 'select'
            ? ['Opsi 1', 'Opsi 2']
            : undefined,
      required: newFieldRequired,
      showInPrint: newFieldShowInPrint,
    };

    onAddCustomField(newField);
    setNewFieldLabel('');
    setNewFieldOptions('');
    setNewFieldRequired(false);
    setNewFieldShowInPrint(true);
    setShowCustomFieldBuilder(false);
  };

  const handleRincianChange = (
    itemId: string,
    field: keyof RincianBiayaItem,
    value: string | number
  ) => {
    const nextRincian = draft.rincian.map((item) => {
      if (item.id !== itemId) return item;
      return { ...item, [field]: value };
    });
    const next = { ...draft, rincian: nextRincian, updatedAt: new Date().toISOString() };
    setDraft(next);
    onSaveKuitansi(next);
  };

  const handleAddPresetRincian = (
    kategori: RincianKategori,
    uraian: string,
    nominalSatuan: number,
    kuantitas: number,
    satuan: string
  ) => {
    const newItem: RincianBiayaItem = {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      kategori,
      uraian,
      nominalSatuan,
      kuantitas,
      satuan,
    };
    const next = {
      ...draft,
      rincian: [...draft.rincian, newItem],
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    onSaveKuitansi(next);
  };

  const handleRemoveRincianRow = (itemId: string) => {
    if (draft.rincian.length <= 1) {
      setValidationErrors(['Minimal harus terdapat 1 rincian biaya pada kuitansi.']);
      return;
    }
    const next = {
      ...draft,
      rincian: draft.rincian.filter((r) => r.id !== itemId),
      updatedAt: new Date().toISOString(),
    };
    setDraft(next);
    onSaveKuitansi(next);
  };

  const handleExplicitValidateAndSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const check = validateKuitansiInput(draft, customFields);
    const allErrors = [...check.errors];
    if (!draft.nipPenerima || !draft.nipPenerima.trim()) {
      allErrors.push('NIP Pelaksana wajib diisi pada form kuitansi.');
    }
    if (!draft.subKegiatan || !draft.subKegiatan.trim()) {
      allErrors.push('Kode & Nama Sub Kegiatan wajib diisi pada form kuitansi.');
    }
    if (allErrors.length > 0) {
      setValidationErrors(allErrors);
      setSaveBanner(null);
      setFormTab('utama');
      return;
    }
    setValidationErrors([]);
    onSaveKuitansi({ ...draft, updatedAt: new Date().toISOString() });
    setIsMobileSheetOpen(false);
    setSaveBanner(
      autoSyncEnabled && isGoogleConnected
        ? 'Kuitansi valid, disimpan & disinkronkan ke Google Sheets!'
        : 'Kuitansi Perjalanan Dinas berhasil divalidasi & disimpan.'
    );
    setTimeout(() => setSaveBanner(null), 4000);
  };

  const totalKuitansi = calculateKuitansiTotal(draft.rincian);
  const terbilangText = terbilangRupiah(totalKuitansi);

  const renderFormFieldsContent = () => (
    <div className="space-y-4">
      {/* TAB 1: PELAKSANA, TUJUAN, SPT & SUB KEGIATAN */}
      {formTab === 'utama' && (
        <div className="space-y-4">


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="input-atas-nama"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nama Pelaksana / Penerima (A.n) *
              </label>
              <input
                id="input-atas-nama"
                type="text"
                list="datalist-kuitansi-pegawai"
                placeholder="Ketik nama lengkap & gelar pelaksana..."
                value={draft.atasNama}
                onChange={(e) => {
                  const val = e.target.value;
                  const activePeg = (daftarPegawai || []).filter((p) => p.statusActive !== false);
                  const found = activePeg.find(
                    (p) => p.nama.trim().toLowerCase() === val.trim().toLowerCase()
                  );
                  if (found) {
                    const nextCustomFields = { ...(draft.customFieldValues || {}) };
                    if (found.pangkatGolongan) {
                      nextCustomFields['cf-pangkat-gol'] = found.pangkatGolongan;
                    }
                    if (found.jabatan) {
                      nextCustomFields['cf-jabatan'] = found.jabatan;
                    }
                    const next: KuitansiPerjalananDinas = {
                      ...draft,
                      atasNama: found.nama,
                      nipPenerima: found.nip,
                      customFieldValues: nextCustomFields,
                      updatedAt: new Date().toISOString(),
                    };
                    setDraft(next);
                    onSaveKuitansi(next);
                  } else {
                    handleFieldChange('atasNama', val);
                  }
                }}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
              <datalist id="datalist-kuitansi-pegawai">
                {(daftarPegawai || [])
                  .filter((p) => p.statusActive !== false)
                  .sort((a, b) => {
                    const aPrio = a.isPriority ? 1 : 0;
                    const bPrio = b.isPriority ? 1 : 0;
                    if (aPrio !== bPrio) return bPrio - aPrio;
                    return (b.usageCount || 0) - (a.usageCount || 0);
                  })
                  .map((peg) => (
                    <option key={peg.id} value={peg.nama}>
                      {peg.isPriority ? '⭐ [Prioritas] ' : ''}NIP. {peg.nip} {peg.jabatan ? `— ${peg.jabatan}` : ''} {peg.pangkatGolongan ? `(${peg.pangkatGolongan})` : ''}
                    </option>
                  ))}
              </datalist>
            </div>
            <div>
              <label
                htmlFor="input-nip-penerima"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                NIP Pelaksana *
              </label>
              <input
                id="input-nip-penerima"
                type="text"
                placeholder="Ketik 18 digit NIP pelaksana..."
                value={draft.nipPenerima}
                onChange={(e) => handleFieldChange('nipPenerima', e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="input-sub-kegiatan"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Kode &amp; Nama Sub Kegiatan *
            </label>
            <textarea
              id="input-sub-kegiatan"
              rows={2}
              placeholder="Contoh: 1.01.02.1.01.0060 - 5.1.02.04.001.00001 - (Koordinasi, Perencanaan, Supervisi dan Evaluasi Layanan di Bidang Pendidikan)"
              value={draft.subKegiatan}
              onChange={(e) => handleFieldChange('subKegiatan', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div>
            <label
              htmlFor="input-tujuan"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Tujuan Perjalanan Dinas
            </label>
            <input
              id="input-tujuan"
              type="text"
              placeholder="Contoh: Jakarta / Samarinda / Tarakan"
              value={draft.tujuan}
              onChange={(e) => handleFieldChange('tujuan', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {/* INTEGRATED DATE PICKER FOR TANGGAL PERJALANAN KUITANSI */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50/60 p-3.5 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-sky-950">
                    Pilihan Tanggal Perjalanan Kuitansi
                  </h4>
                  <p className="text-[11px] text-sky-800">
                    Pilih tanggal via kalender atau ketik langsung (contoh: 10 s.d 12 April 2026).
                  </p>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-bold text-sky-900">Preset:</span>
                <button
                  type="button"
                  onClick={() => applyKuiDateSelection(getTodayIso(0), getTodayIso(2))}
                  className="px-2 py-0.5 rounded bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Hari Ini (+3 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => applyKuiDateSelection(getTodayIso(1), getTodayIso(3))}
                  className="px-2 py-0.5 rounded bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Besok (+3 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => applyKuiDateSelection(getTodayIso(0), getTodayIso(4))}
                  className="px-2 py-0.5 rounded bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  5 Hari Tugas
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Tanggal Mulai Perjalanan */}
              <div>
                <label
                  htmlFor="input-kui-tgl-mulai"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Tanggal Mulai Perjalanan
                </label>
                <div className="relative flex items-center">
                  <input
                    id="input-kui-tgl-mulai"
                    type="text"
                    placeholder="Contoh: 10 April 2026"
                    value={kuiIsoStart ? formatIndonesianFormalDate(kuiIsoStart, false) : ''}
                    readOnly
                    className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white pr-10 pl-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                  />
                  <div className="absolute right-2.5 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleOpenKuiStartPicker}
                      className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer relative"
                      title="Buka Kalender Pemilih Tanggal"
                    >
                      <Calendar className="w-4 h-4 text-sky-700" />
                      <input
                        ref={kuiStartPickerRef}
                        type="date"
                        value={kuiIsoStart}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          if (!newStart) return;
                          const newEnd = newStart > kuiIsoEnd ? newStart : kuiIsoEnd;
                          applyKuiDateSelection(newStart, newEnd);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Tanggal Selesai Perjalanan */}
              <div>
                <label
                  htmlFor="input-kui-tgl-selesai"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Tanggal Selesai Perjalanan
                </label>
                <div className="relative flex items-center">
                  <input
                    id="input-kui-tgl-selesai"
                    type="text"
                    placeholder="Contoh: 12 April 2026"
                    value={kuiIsoEnd ? formatIndonesianFormalDate(kuiIsoEnd, false) : ''}
                    readOnly
                    className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white pr-10 pl-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
                  />
                  <div className="absolute right-2.5 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleOpenKuiEndPicker}
                      className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer relative"
                      title="Buka Kalender Pemilih Tanggal"
                    >
                      <Calendar className="w-4 h-4 text-sky-700" />
                      <input
                        ref={kuiEndPickerRef}
                        type="date"
                        value={kuiIsoEnd}
                        min={kuiIsoStart}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          if (!newEnd) return;
                          applyKuiDateSelection(kuiIsoStart, newEnd);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="input-no-spt"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Nomor SPT (Surat Perintah Tugas) *
                  </label>
                  <InfoTooltip
                    variant="question"
                    align="left"
                    title="Kunci Penghubung SPJ"
                    content="Nomor SPT dicetak tebal berwarna merah pada kuitansi dan digunakan untuk menautkan Dokumentasi serta Bukti Pengeluaran."
                  />
                </div>
                {sptList && sptList.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (!draft.noSpt) {
                          setValidationErrors(['Isi atau pilih No. SPT terlebih dahulu untuk sinkronisasi data dari Surat Tugas.']);
                          return;
                        }
                        const foundSpt = sptList.find((s) => s.noSpt.trim().toLowerCase() === draft.noSpt.trim().toLowerCase()) || sptList[0];
                        if (foundSpt) {
                          const tujuanVal = foundSpt.tempatTujuan ? foundSpt.tempatTujuan.replace(/[;]/g, '').trim() : draft.tujuan;
                          
                          let kuitansiDateStr = draft.tanggalPerjalanan;
                          try {
                            const parseIndonesianDateStr = (str: string) => {
                              if (!str) return null;
                              const parts = str.replace(/[;,]/g, '').trim().split(/\s+/);
                              const numParts = parts.filter(p => !isNaN(Number(p)));
                              const wordParts = parts.filter(p => isNaN(Number(p)));
                              const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                              if (numParts.length >= 2 && wordParts.length >= 1) {
                                const day = numParts[0];
                                const year = numParts[numParts.length - 1];
                                const month = wordParts.find(w => monthNames.includes(w)) || wordParts[0];
                                return { day, month, year };
                              }
                              return null;
                            };

                            const startParsed = parseIndonesianDateStr(foundSpt.tanggalBerangkat);
                            const endParsed = parseIndonesianDateStr(foundSpt.tanggalHarusKembali);

                            if (startParsed && endParsed) {
                              if (startParsed.year === endParsed.year && startParsed.month === endParsed.month) {
                                kuitansiDateStr = `${startParsed.day} s.d ${endParsed.day} ${endParsed.month} ${endParsed.year}`;
                              } else if (startParsed.year === endParsed.year) {
                                kuitansiDateStr = `${startParsed.day} ${startParsed.month} s.d ${endParsed.day} ${endParsed.month} ${endParsed.year}`;
                              } else {
                                kuitansiDateStr = `${startParsed.day} ${startParsed.month} ${startParsed.year} s.d ${endParsed.day} ${endParsed.month} ${endParsed.year}`;
                              }
                            }
                          } catch {
                            // fallback
                          }

                          const firstPeg = foundSpt.pegawaiList?.[0];
                          const next: KuitansiPerjalananDinas = {
                            ...draft,
                            noSpt: foundSpt.noSpt,
                            tujuan: tujuanVal,
                            tanggalPerjalanan: kuitansiDateStr,
                            untukPengeluaran: foundSpt.maksudPerjalanan || draft.untukPengeluaran,
                            atasNama: firstPeg ? firstPeg.nama : draft.atasNama,
                            nipPenerima: firstPeg ? firstPeg.nip : draft.nipPenerima,
                            updatedAt: new Date().toISOString(),
                          };
                          setDraft(next);
                          onSaveKuitansi(next);
                          setValidationErrors([]);
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-sky-700 hover:bg-sky-800 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Ambil / Sinkronkan seluruh data dari Surat Tugas"
                    >
                      <span>🔄 Tarik Data SPT</span>
                    </button>
                    <span className="text-[10px] text-sky-800 font-bold bg-sky-100 px-1.5 py-0.5 rounded">
                      {sptList.length} SPT
                    </span>
                  </div>
                )}
              </div>



              <input
                id="input-no-spt"
                type="text"
                list="datalist-spt-numbers"
                placeholder="Contoh: 094/83/SPT/UM-Set/DD/IV/2026"
                value={draft.noSpt}
                onChange={(e) => {
                  const val = e.target.value;
                  const foundSpt = (sptList || []).find((s) => s.noSpt.trim().toLowerCase() === val.trim().toLowerCase());
                  if (foundSpt) {
                    const tujuanVal = foundSpt.tempatTujuan
                      ? foundSpt.tempatTujuan.replace(/[;]/g, '').trim()
                      : draft.tujuan;

                    let kuitansiDateStr = draft.tanggalPerjalanan;
                    try {
                      const parseIndonesianDateStr = (str: string) => {
                        if (!str) return null;
                        const parts = str.replace(/[;,]/g, '').trim().split(/\s+/);
                        const numParts = parts.filter(p => !isNaN(Number(p)));
                        const wordParts = parts.filter(p => isNaN(Number(p)));
                        const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                        if (numParts.length >= 2 && wordParts.length >= 1) {
                          const day = numParts[0];
                          const year = numParts[numParts.length - 1];
                          const month = wordParts.find(w => monthNames.includes(w)) || wordParts[0];
                          return { day, month, year };
                        }
                        return null;
                      };

                      const startParsed = parseIndonesianDateStr(foundSpt.tanggalBerangkat);
                      const endParsed = parseIndonesianDateStr(foundSpt.tanggalHarusKembali);

                      if (startParsed && endParsed) {
                        if (startParsed.year === endParsed.year && startParsed.month === endParsed.month) {
                          kuitansiDateStr = `${startParsed.day} s.d ${endParsed.day} ${endParsed.month} ${endParsed.year}`;
                        } else if (startParsed.year === endParsed.year) {
                          kuitansiDateStr = `${startParsed.day} ${startParsed.month} s.d ${endParsed.day} ${endParsed.month} ${endParsed.year}`;
                        } else {
                          kuitansiDateStr = `${startParsed.day} ${startParsed.month} ${startParsed.year} s.d ${endParsed.day} ${endParsed.month} ${endParsed.year}`;
                        }
                      }
                    } catch {
                      // fallback
                    }

                    const next: KuitansiPerjalananDinas = {
                      ...draft,
                      noSpt: foundSpt.noSpt,
                      tujuan: tujuanVal,
                      tanggalPerjalanan: kuitansiDateStr,
                      untukPengeluaran: foundSpt.maksudPerjalanan || draft.untukPengeluaran,
                      updatedAt: new Date().toISOString(),
                    };
                    setDraft(next);
                    onSaveKuitansi(next);
                  } else {
                    handleFieldChange('noSpt', val);
                  }
                }}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-red-700 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
              <datalist id="datalist-spt-numbers">
                {(sptList || []).map((spt) => (
                  <option key={spt.id} value={spt.noSpt}>
                    Tujuan: {spt.tempatTujuan} — {spt.maksudPerjalanan}
                  </option>
                ))}
              </datalist>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label
                  htmlFor="input-tempat-tgl-ttd"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Tempat &amp; Tanggal Tanda Tangan
                </label>
                <InfoTooltip
                  variant="info"
                  align="right"
                  title="Titimangsa Kuitansi"
                  content="Tercetak di atas tanda tangan penerima kuitansi (contoh: Tanjung Selor, 12 April 2026)."
                />
              </div>
              <div className="relative flex items-center">
                <input
                  id="input-tempat-tgl-ttd"
                  type="text"
                  value={draft.tempatTanggalTtd}
                  onChange={(e) => handleFieldChange('tempatTanggalTtd', e.target.value)}
                  className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white pr-10 pl-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
                <div className="absolute right-2.5 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleOpenKuiTtdPicker}
                    className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer relative"
                    title="Pilih Tanggal Titimangsa Kuitansi dari Kalender"
                  >
                    <Calendar className="w-4 h-4 text-sky-700" />
                    <input
                      ref={kuiTtdPickerRef}
                      type="date"
                      onChange={(e) => {
                        handleKuiTtdDateChange(e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="input-untuk-pengeluaran"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Untuk Pengeluaran (Uraian Maksud Perjalanan)
            </label>
            <textarea
              id="input-untuk-pengeluaran"
              rows={2}
              value={draft.untukPengeluaran}
              onChange={(e) => handleFieldChange('untukPengeluaran', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          {/* Collapsible Tahun Anggaran & No. Kuitansi Section */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAnggaranDetail((prev) => !prev)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-semibold text-slate-700 hover:bg-slate-100/80 transition-colors cursor-pointer"
            >
              <span>
                Tahun Anggaran &amp; No. Kuitansi (TA {draft.tahunAnggaran})
              </span>
              {showAnggaranDetail ? (
                <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
              )}
            </button>

            {showAnggaranDetail && (
              <div className="p-3.5 pt-2 border-t border-slate-200/80 space-y-3 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="input-tahun-anggaran"
                      className="block text-[11px] font-medium text-slate-600 mb-1"
                    >
                      Tahun Anggaran
                    </label>
                    <input
                      id="input-tahun-anggaran"
                      type="text"
                      value={draft.tahunAnggaran}
                      onChange={(e) => handleFieldChange('tahunAnggaran', e.target.value)}
                      className="w-full min-h-[38px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <label
                        htmlFor="input-no-kuitansi"
                        className="block text-[11px] font-medium text-slate-600"
                      >
                        No. Kuitansi (Diisi Manual oleh Bendahara)
                      </label>
                      {draft.noKuitansi && (
                        <button
                          type="button"
                          onClick={() => handleFieldChange('noKuitansi', '')}
                          className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer"
                        >
                          Kosongkan
                        </button>
                      )}
                    </div>
                    <input
                      id="input-no-kuitansi"
                      type="text"
                      placeholder="Kosongkan jika diisi manual oleh Bendahara..."
                      value={draft.noKuitansi}
                      onChange={(e) => handleFieldChange('noKuitansi', e.target.value)}
                      className="w-full min-h-[38px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-slate-500">
            Pejabat penandatangan ({draft.namaPenggunaAnggaran} &amp; {draft.namaBendahara})
            mengikuti konfigurasi pada menu <strong>Pengaturan</strong>.
          </p>
        </div>
      )}

      {/* TAB 2: RINCIAN BIAYA PERJALANAN DINAS */}
      {formTab === 'rincian' && (
        <div className="space-y-3.5">
          {/* Quick Preset Buttons dengan InfoTooltip */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-600">
                Tambah Cepat Komponen Biaya:
              </span>
              <InfoTooltip
                variant="question"
                align="left"
                title="Rumus Perhitungan Otomatis"
                content="Setiap baris rincian menghitung Nominal Satuan × Jumlah secara otomatis, lalu menjumlahkannya ke Total Kuitansi beserta kalimat Terbilang."
              />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  handleAddPresetRincian('Uang Harian', 'Uang Harian', 430000, 3, 'hari')
                }
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Uang Harian</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddPresetRincian(
                    'Transportasi',
                    'Transportasi Tanjung Selor - Tarakan (PP)',
                    330000,
                    1,
                    ''
                  )
                }
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Transportasi</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleAddPresetRincian('Penginapan', 'Penginapan Hotel', 620000, 2, 'malam')
                }
                className="min-h-[34px] px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200/80 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Penginapan</span>
              </button>
            </div>
          </div>

          {/* Rincian Rows */}
          <div className="space-y-2.5">
            {draft.rincian.map((item, idx) => {
              const rowSubtotal = calculateRincianRowTotal(
                item.nominalSatuan,
                item.kuantitas
              );
              const formula = formatRincianFormula(item);
              return (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-50/90 border border-slate-200 space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <select
                        aria-label={`Kategori rincian ${idx + 1}`}
                        value={item.kategori}
                        onChange={(e) =>
                          handleRincianChange(
                            item.id,
                            'kategori',
                            e.target.value as RincianKategori
                          )
                        }
                        className="min-h-[32px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-800"
                      >
                        <option value="Uang Harian">Uang Harian</option>
                        <option value="Transportasi">Transportasi</option>
                        <option value="Penginapan">Penginapan</option>
                        <option value="Representasi">Representasi</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        {formatRupiah(rowSubtotal)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveRincianRow(item.id)}
                        className="min-h-[32px] min-w-[32px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                        aria-label={`Hapus rincian ${item.uraian}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`uraian-${item.id}`} className="sr-only">
                      Uraian Rincian #{idx + 1}
                    </label>
                    <input
                      id={`uraian-${item.id}`}
                      type="text"
                      placeholder="Uraian komponen biaya (tercetak di kuitansi)"
                      value={item.uraian}
                      onChange={(e) =>
                        handleRincianChange(item.id, 'uraian', e.target.value)
                      }
                      className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6">
                      <label
                        htmlFor={`nom-${item.id}`}
                        className="block text-[10px] font-medium text-slate-500 mb-0.5"
                      >
                        Nominal Satuan (Rp)
                      </label>
                      <input
                        id={`nom-${item.id}`}
                        type="number"
                        min={0}
                        step={1000}
                        value={item.nominalSatuan}
                        onChange={(e) =>
                          handleRincianChange(
                            item.id,
                            'nominalSatuan',
                            Number(e.target.value) || 0
                          )
                        }
                        className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-900 tabular-nums"
                      />
                    </div>
                    <div className="col-span-3">
                      <label
                        htmlFor={`qty-${item.id}`}
                        className="block text-[10px] font-medium text-slate-500 mb-0.5"
                      >
                        Jumlah
                      </label>
                      <input
                        id={`qty-${item.id}`}
                        type="number"
                        min={1}
                        value={item.kuantitas}
                        onChange={(e) =>
                          handleRincianChange(
                            item.id,
                            'kuantitas',
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900 tabular-nums"
                      />
                    </div>
                    <div className="col-span-3">
                      <label
                        htmlFor={`sat-${item.id}`}
                        className="block text-[10px] font-medium text-slate-500 mb-0.5"
                      >
                        Satuan
                      </label>
                      <input
                        id={`sat-${item.id}`}
                        type="text"
                        placeholder="hari/malam"
                        value={item.satuan}
                        onChange={(e) =>
                          handleRincianChange(item.id, 'satuan', e.target.value)
                        }
                        className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
                    <span>Tampilan cetak:</span>
                    <span className="font-mono text-slate-700">
                      {formula.nominalText}{' '}
                      {formula.multiplierText ? `${formula.multiplierText} = ` : '= '}
                      {formula.subtotalText}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: BIDANG KUSTOM DINAMIS */}
      {formTab === 'kustom' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Bidang Kustom Kuitansi ({customFields.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Tambahkan baris informasi tambahan sesuai kebutuhan SPPD
              </p>
            </div>
            {!showCustomFieldBuilder && customFields.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCustomFieldBuilder(true)}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bidang Baru</span>
              </button>
            )}
          </div>

          {showCustomFieldBuilder && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-bold text-slate-900">
                  Tambah Bidang Kustom Baru
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomFieldBuilder(false)}
                  aria-label="Tutup form bidang kustom"
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {customFieldError && (
                <p role="alert" className="text-xs text-red-600 font-medium">
                  {customFieldError}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="cf-new-label"
                    className="block text-[11px] font-medium text-slate-600 mb-0.5"
                  >
                    Nama / Label Bidang *
                  </label>
                  <input
                    id="cf-new-label"
                    type="text"
                    placeholder="Misal: Nomor SPPD"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cf-new-type"
                    className="block text-[11px] font-medium text-slate-600 mb-0.5"
                  >
                    Tipe Input
                  </label>
                  <select
                    id="cf-new-type"
                    value={newFieldType}
                    onChange={(e) => setNewFieldType(e.target.value as CustomFieldType)}
                    className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  >
                    <option value="text">Teks Bebas</option>
                    <option value="number">Angka / Nomor</option>
                    <option value="date">Tanggal</option>
                    <option value="select">Pilihan Dropdown</option>
                  </select>
                </div>
              </div>

              {newFieldType === 'select' && (
                <div>
                  <label
                    htmlFor="cf-new-options"
                    className="block text-[11px] font-medium text-slate-600 mb-0.5"
                  >
                    Daftar Pilihan (Pisahkan dengan koma)
                  </label>
                  <input
                    id="cf-new-options"
                    type="text"
                    placeholder="Contoh: Speedboat, Pesawat Udara, Kendaraan Dinas"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              )}

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldShowInPrint}
                    onChange={(e) => setNewFieldShowInPrint(e.target.checked)}
                    className="rounded border-slate-300 text-sky-700 w-3.5 h-3.5"
                  />
                  <span>Tampilkan di Cetak</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="rounded border-slate-300 text-sky-700 w-3.5 h-3.5"
                  />
                  <span>Wajib</span>
                </label>
              </div>

              {/* Konsistensi Tombol Aksi di Bagian Bawah Form */}
              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomFieldBuilder(false)}
                  className="min-h-[34px] px-3 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleCreateCustomField}
                  className="min-h-[34px] px-3.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Simpan Bidang</span>
                </button>
              </div>
            </div>
          )}

          {customFields.length === 0 && !showCustomFieldBuilder ? (
            <EmptyStateCard
              variant="kustom"
              title="Belum Ada Bidang Kustom Tambahan"
              description="Tambahkan bidang ekstra seperti Nomor SPPD, Moda Transportasi, atau Kode Rekening apabila diperlukan pada cetakan kuitansi."
              ctaLabel="Buat Bidang Kustom"
              onCtaClick={() => setShowCustomFieldBuilder(true)}
            />
          ) : (
            customFields.length > 0 && (
              <div className="space-y-2.5">
                {customFields.map((cf) => {
                const currentValue = draft.customFieldValues?.[cf.id] || '';
                return (
                  <div
                    key={cf.id}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={`custom-input-${cf.id}`}
                        className="text-xs font-semibold text-slate-800"
                      >
                        {cf.label}
                        {cf.required ? ' *' : ''}
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cf.showInPrint}
                            onChange={(e) =>
                              onUpdateCustomField({
                                ...cf,
                                showInPrint: e.target.checked,
                              })
                            }
                            className="rounded border-slate-300 text-sky-700 w-3.5 h-3.5"
                          />
                          <span>Cetak</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => onRemoveCustomField(cf.id)}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          aria-label={`Hapus bidang kustom ${cf.label}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {cf.type === 'select' ? (
                      <select
                        id={`custom-input-${cf.id}`}
                        value={currentValue}
                        onChange={(e) =>
                          handleCustomFieldValueChange(cf.id, e.target.value)
                        }
                        className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      >
                        <option value="">-- Pilih {cf.label} --</option>
                        {(cf.options || []).map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`custom-input-${cf.id}`}
                        type={cf.type}
                        placeholder={cf.placeholder || `Isi ${cf.label}...`}
                        value={currentValue}
                        onChange={(e) =>
                          handleCustomFieldValueChange(cf.id, e.target.value)
                        }
                        className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                      />
                    )}
                  </div>
                );
              })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`space-y-3 pb-20 lg:pb-0 ${
        isMobileSheetOpen ? 'max-lg:overflow-hidden' : ''
      }`}
    >
      {/* Validation & Save Feedback Banners (Tanpa Header Ganda karena sudah ditangani Compact Studio App Bar) */}
      {validationErrors.length > 0 && (
        <div
          role="alert"
          className="no-print rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-1"
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Mohon periksa kembali isian Kuitansi:</span>
          </div>
          <ul className="list-disc list-inside pl-1 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {saveBanner && (
        <div
          role="status"
          className="no-print rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveBanner}</span>
          </div>
          <button
            type="button"
            onClick={onOpenSyncModal}
            className="underline font-bold text-emerald-800 hover:text-emerald-950 ml-4 whitespace-nowrap cursor-pointer"
          >
            Status Cloud
          </button>
        </div>
      )}

      {/* CANVA STUDIO WORKSPACE:
          - Desktop (lg+): Left Studio Inspector Panel + Right Interactive Paper Canvas
          - Mobile (<lg): Always-visible Interactive Paper Canvas + Slide-Up Bottom Sheet + Bottom Studio Tool Dock */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:block">
        {/* DESKTOP LEFT INSPECTOR PANEL (Hidden on Mobile because Mobile uses Canva Slide-Up Bottom Sheet) */}
        <form
          onSubmit={handleExplicitValidateAndSave}
          className="no-print hidden lg:block lg:col-span-5 bg-white border border-slate-200 rounded-2xl overflow-hidden"
        >
          {/* Step / Category Navigation Tabs Inside Form */}
          <div
            role="tablist"
            aria-label="Bagian Formulir Kuitansi"
            className="grid grid-cols-3 bg-slate-100/80 p-1.5 gap-1 border-b border-slate-200"
          >
            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'utama'}
              onClick={() => setFormTab('utama')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                formTab === 'utama'
                  ? 'bg-white text-sky-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>1. Pelaksana &amp; SPT</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'rincian'}
              onClick={() => setFormTab('rincian')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                formTab === 'rincian'
                  ? 'bg-white text-sky-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>2. Rincian ({draft.rincian.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={formTab === 'kustom'}
              onClick={() => setFormTab('kustom')}
              className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                formTab === 'kustom'
                  ? 'bg-white text-sky-800 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>3. Kustom ({customFields.length})</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            {renderFormFieldsContent()}

            {/* Persistent Total & Terbilang Summary Footer */}
            <div className="pt-3 border-t border-slate-200/80 space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/90 space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-950">Total Kuitansi:</span>
                  <span className="font-extrabold font-mono text-sm text-emerald-900 tabular-nums">
                    {formatRupiah(totalKuitansi)}
                  </span>
                </div>
                <p className="text-[11px] italic text-emerald-900">
                  Terbilang: &ldquo;{terbilangText}&rdquo;
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="submit"
                  className="min-h-[42px] rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Simpan &amp; Validasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak {paperSize}</span>
                </button>
              </div>

              {onDeleteKuitansi && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onDeleteKuitansi}
                    title="Hapus berkas SPJ yang sedang aktif ini"
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-xl border border-red-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Berkas SPJ</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* ALWAYS-VISIBLE INTERACTIVE PAPER CANVAS (Mobile & Desktop) */}
        <div className="lg:col-span-7 lg:sticky lg:top-20 print:block print:w-full">
          <InteractivePaperViewer
            paperSize={paperSize}
            onChangePaperSize={onChangePaperSize}
            documentTitle="Pratinjau Kuitansi Resmi"
            interactiveHint="Ketuk teks pada kertas untuk langsung mengedit"
          >
            <KuitansiDocumentPreview
              kuitansi={{
                ...draft,
                logoPemprovDataUrl: logoPemprovDataUrl ?? draft.logoPemprovDataUrl,
              }}
              customFields={customFields}
              paperSize={paperSize}
              activeZone={isMobileSheetOpen ? formTab : undefined}
              onSelectZone={handleSelectZoneFromCanvas}
            />
          </InteractivePaperViewer>
        </div>
      </div>

      {/* BACKDROP TRANSPARAN & CANVA MOBILE SLIDE-UP BOTTOM SHEET DRAWER (<lg only) */}
      {isMobileSheetOpen && (
        <>
          {/* Layer Backdrop Overlay Lembut di Belakang Bottom Sheet */}
          <div
            role="presentation"
            aria-hidden="true"
            data-testid="mobile-sheet-backdrop"
            onClick={() => setIsMobileSheetOpen(false)}
            className="no-print lg:hidden fixed inset-0 z-40 bg-slate-900/35 backdrop-blur-[2px] transition-opacity"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label="Panel Editor Kuitansi Mobile"
            className="no-print lg:hidden fixed inset-x-0 bottom-16 z-50 bg-white text-slate-900 border-t border-slate-200 rounded-t-3xl shadow-[0_-12px_36px_rgba(15,23,42,0.18)] max-h-[62vh] flex flex-col overflow-hidden"
          >
            {/* Drag Handle Modern & Sheet Header */}
            <div className="px-4 pt-2.5 pb-2.5 border-b border-slate-200/90 bg-slate-50 shrink-0">
              <div className="w-11 h-1.5 rounded-full bg-slate-300 mx-auto mb-2" />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-900">
                  {formTab === 'utama'
                    ? 'Edit Pelaksana, Tujuan & SPT'
                    : formTab === 'rincian'
                      ? `Edit Rincian Biaya (${formatRupiah(totalKuitansi)})`
                      : `Edit Bidang Kustom (${customFields.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => setIsMobileSheetOpen(false)}
                  aria-label="Tutup panel editor"
                  className="min-h-[32px] min-w-[32px] rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-800 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Sheet Content (no-scrollbar + overscroll-contain seperti native mobile app) */}
            <div className="p-4 overflow-y-auto no-scrollbar overscroll-contain space-y-4 flex-1 bg-white text-slate-900">
              {renderFormFieldsContent()}
            </div>

            {/* Sticky Action Footer Konsisten di Bagian Bawah Sheet */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
              {onDeleteKuitansi ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSheetOpen(false);
                    onDeleteKuitansi();
                  }}
                  className="min-h-[40px] px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer inline-flex items-center gap-1"
                  title="Hapus berkas SPJ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="min-h-[40px] px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Selesai
                </button>
                <button
                  type="button"
                  onClick={() => handleExplicitValidateAndSave()}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Simpan</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CANVA MOBILE LIGHT MODE BOTTOM STUDIO TOOL DOCK (<lg only)
          - Tema terang bersih (bg-white/95 + border-slate-200)
          - Tab hanya menyala biru (bg-sky-600 text-white) saat Bottom Sheet untuk tab tersebut sedang TERBUKA
          - Mengklik tab yang sedang aktif otomatis menutup Bottom Sheet (toggle open/close)
          - Saat Bottom Sheet TERTUTUP, tidak ada tab yang menyala biru
          - Tombol Cetak memiliki gaya aksi khusus (emerald) dengan teks dinamis Cetak A4 / Cetak F4 */}
      <div
        role="toolbar"
        aria-label="Alat Editor Kuitansi Mobile"
        className="no-print lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-md text-slate-800 border-t border-slate-200 px-2 py-1.5 flex items-center gap-1.5 shadow-[0_-4px_20px_rgba(15,23,42,0.08)]"
      >
        <div className="grid grid-cols-3 gap-1 flex-1">
          <button
            type="button"
            aria-pressed={isMobileSheetOpen && formTab === 'utama'}
            title={
              isMobileSheetOpen && formTab === 'utama'
                ? 'Ketuk lagi untuk menutup panel Data & SPT'
                : 'Buka panel Data & SPT'
            }
            onClick={() => handleOpenMobileTool('utama')}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
              isMobileSheetOpen && formTab === 'utama'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Data &amp; SPT</span>
          </button>

          <button
            type="button"
            aria-pressed={isMobileSheetOpen && formTab === 'rincian'}
            title={
              isMobileSheetOpen && formTab === 'rincian'
                ? 'Ketuk lagi untuk menutup panel Rincian'
                : 'Buka panel Rincian Biaya'
            }
            onClick={() => handleOpenMobileTool('rincian')}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
              isMobileSheetOpen && formTab === 'rincian'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Rincian ({draft.rincian.length})</span>
          </button>

          <button
            type="button"
            aria-pressed={isMobileSheetOpen && formTab === 'kustom'}
            title={
              isMobileSheetOpen && formTab === 'kustom'
                ? 'Ketuk lagi untuk menutup panel Bidang Kustom'
                : 'Buka panel Bidang Kustom'
            }
            onClick={() => handleOpenMobileTool('kustom')}
            className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
              isMobileSheetOpen && formTab === 'kustom'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Kustom ({customFields.length})</span>
          </button>
        </div>

        <div className="w-px h-8 bg-slate-200 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={() => window.print()}
          aria-label={paperSize === 'F4' ? 'Cetak Kuitansi F4' : 'Cetak Kuitansi A4'}
          className="min-h-[48px] px-3.5 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>{paperSize === 'F4' ? 'Cetak F4' : 'Cetak A4'}</span>
        </button>
      </div>
    </div>
  );
};
