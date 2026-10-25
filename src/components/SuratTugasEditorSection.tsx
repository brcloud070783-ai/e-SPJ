import React, { useState } from 'react';
import {
  FileCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Users,
  Printer,
  X,
  User,
  Calendar,
  ClipboardList,
  Stamp,
  PenTool,
  Route,
  Wallet,
  Hash,
  PlaneTakeoff,
  NotebookPen,
  Save,
} from 'lucide-react';
import {
  SuratPerintahTugas,
  SuratTugasPegawai,
  AppSettings,
  PaperSize,
  PegawaiItem,
  SuratPerjalananDinasData,
  SpdPengikutItem,
  SpdVisumBelakangData,
} from '../types/spj';
import {
  SuratTugasDocumentPreview,
  SuratTugasEditableZone,
} from './SuratTugasDocumentPreview';
import {
  SuratPerjalananDinasDocumentPreview,
  SpdEditableZone,
} from './SuratPerjalananDinasDocumentPreview';
import {
  SuratPerjalananDinasBelakangDocumentPreview,
  SpdBelakangEditableZone,
  getEffectiveVisumData,
} from './SuratPerjalananDinasBelakangDocumentPreview';
import { SuratPerjalananDinasBelakangEditor } from './SuratPerjalananDinasBelakangEditor';
import { InteractivePaperViewer } from './InteractivePaperViewer';
import { InfoTooltip } from './UiPatterns';
import {
  formatIndonesianFormalDate,
  calculateTravelDuration,
} from '../utils/spjCalculations';

export type ActiveDocType = 'spd' | 'spd-belakang' | 'spt';

interface SuratTugasEditorSectionProps {
  sptList: SuratPerintahTugas[];
  activeSptId: string;
  onSelectSpt: (id: string) => void;
  onSaveSpt: (updated: SuratPerintahTugas) => void;
  onCreateNewSpt: () => void;
  onDeleteSpt?: () => void;
  appSettings: AppSettings;
  daftarPegawai?: PegawaiItem[];
  paperSize: PaperSize;
  onChangePaperSize: (size: PaperSize) => void;
  activeDocType?: ActiveDocType;
  onChangeDocType?: (docType: ActiveDocType) => void;
}

export const SuratTugasEditorSection: React.FC<SuratTugasEditorSectionProps> = ({
  sptList,
  activeSptId,
  onSelectSpt,
  onSaveSpt,
  onCreateNewSpt,
  onDeleteSpt,
  appSettings,
  daftarPegawai = [],
  paperSize,
  onChangePaperSize,
  activeDocType,
  onChangeDocType,
}) => {
  const currentSpt = sptList.find((s) => s.id === activeSptId) || sptList[0];

  const [draft, setDraft] = useState<SuratPerintahTugas>(currentSpt);
  const [internalDocType, setInternalDocType] = useState<ActiveDocType>(
    activeDocType || 'spt'
  );
  const docType: ActiveDocType = activeDocType || internalDocType;
  const setDocType = (nextType: ActiveDocType) => {
    setInternalDocType(nextType);
    onChangeDocType?.(nextType);
  };
  const [formTab, setFormTab] = useState<SuratTugasEditableZone>('header');
  const [spdTab, setSpdTab] = useState<SpdEditableZone>('header');
  const [spdBelakangTab, setSpdBelakangTab] = useState<SpdBelakangEditableZone>('bagian-1');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  // Snapshot of SPT when opening the mobile bottom-sheet modal so "X" cancels uncommitted edits
  const modalSnapshotRef = React.useRef<SuratPerintahTugas | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);

  const commitOrStageDraft = (next: SuratPerintahTugas) => {
    setDraft(next);
    // When editing in desktop inline panel, persist immediately; when in mobile modal, stage in draft across sub-tabs until "Simpan Perubahan"
    if (!isMobileSheetOpen) {
      onSaveSpt(next);
    }
  };

  const openModalWithZone = (
    nextFormTab?: SuratTugasEditableZone,
    nextSpdTab?: SpdEditableZone,
    nextVisumTab?: SpdBelakangEditableZone
  ) => {
    if (!isMobileSheetOpen) {
      modalSnapshotRef.current = draft;
    }
    if (nextFormTab) setFormTab(nextFormTab);
    if (nextSpdTab) setSpdTab(nextSpdTab);
    if (nextVisumTab) setSpdBelakangTab(nextVisumTab);
    setIsMobileSheetOpen(true);
  };

  const handleCancelAndCloseModal = () => {
    if (modalSnapshotRef.current) {
      setDraft(modalSnapshotRef.current);
      modalSnapshotRef.current = null;
    }
    setValidationErrors([]);
    setIsMobileSheetOpen(false);
  };

  const getTodayIso = (addDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + addDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [isoBerangkat, setIsoBerangkat] = useState<string>(() => getTodayIso(0));
  const [isoKembali, setIsoKembali] = useState<string>(() => getTodayIso(2));

  const applyDateSelection = (startIso: string, endIso: string) => {
    setIsoBerangkat(startIso);
    setIsoKembali(endIso);

    const formattedStart = formatIndonesianFormalDate(startIso, true);
    const formattedEnd = formatIndonesianFormalDate(endIso, true);
    const durationInfo = calculateTravelDuration(startIso, endIso);

    const next: SuratPerintahTugas = {
      ...draft,
      tanggalBerangkat: formattedStart,
      tanggalHarusKembali: formattedEnd,
      lamanyaPerjalanan: durationInfo.formattedText,
      updatedAt: new Date().toISOString(),
    };
    commitOrStageDraft(next);
  };

  const startPickerRef = React.useRef<HTMLInputElement>(null);
  const endPickerRef = React.useRef<HTMLInputElement>(null);

  const handleOpenStartPicker = () => {
    const el = startPickerRef.current;
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

  const handleOpenEndPicker = () => {
    const el = endPickerRef.current;
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

  const prevActiveIdRef = React.useRef<string>(activeSptId);

  React.useEffect(() => {
    const found = sptList.find((s) => s.id === activeSptId);
    if (found) {
      setDraft(found);
      setValidationErrors([]);
      prevActiveIdRef.current = activeSptId;
    }
  }, [activeSptId, sptList]);

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

  // SPD Selected Pelaksana
  const selectedSpdPegawaiId = draft.spdData?.selectedPegawaiId || draft.pegawaiList[0]?.id || '';
  const activeSpdPelaksana = draft.pegawaiList.find((p) => p.id === selectedSpdPegawaiId) || draft.pegawaiList[0] || {
    id: 'default',
    nama: 'Hendry Setyo Utomo',
    nip: '198712112025211028',
    pangkatGol: 'IX',
    jabatan: 'Penata Layanan Operasional',
  };

  const handleSelectZoneFromCanvas = (zone: SuratTugasEditableZone) => {
    openModalWithZone(zone, undefined, undefined);
  };

  const handleSelectSpdZoneFromCanvas = (zone: SpdEditableZone) => {
    openModalWithZone(undefined, zone, undefined);
  };

  // Switching sub-tabs at the bottom dock keeps the modal open and auto-saves to temporary draft state
  const handleOpenMobileTool = (zone: SuratTugasEditableZone) => {
    openModalWithZone(zone, undefined, undefined);
  };

  const handleOpenMobileSpdTool = (zone: SpdEditableZone) => {
    openModalWithZone(undefined, zone, undefined);
  };

  const handleSelectSpdBelakangZoneFromCanvas = (zone: SpdBelakangEditableZone) => {
    openModalWithZone(undefined, undefined, zone);
  };

  const handleOpenMobileSpdBelakangTool = (zone: SpdBelakangEditableZone) => {
    openModalWithZone(undefined, undefined, zone);
  };

  const handleFieldChange = (field: keyof SuratPerintahTugas, value: any) => {
    const next = { ...draft, [field]: value, updatedAt: new Date().toISOString() };
    commitOrStageDraft(next);
  };

  const handleUpdateVisumData = (updated: SpdVisumBelakangData) => {
    const currentSpd = draft.spdData || {};
    const nextSpd = {
      ...currentSpd,
      visumBelakang: updated,
    };
    const next: SuratPerintahTugas = {
      ...draft,
      spdData: nextSpd,
      spdVisumData: updated,
      updatedAt: new Date().toISOString(),
    };
    commitOrStageDraft(next);
  };

  // Handlers for SPD Data
  const handleUpdateSpdData = (nextSpd: SuratPerjalananDinasData) => {
    const next: SuratPerintahTugas = {
      ...draft,
      spdData: nextSpd,
      updatedAt: new Date().toISOString(),
    };
    commitOrStageDraft(next);
  };

  const handleUpdateSpdField = (field: keyof SuratPerjalananDinasData, value: any) => {
    const currentSpd = draft.spdData || {};
    handleUpdateSpdData({
      ...currentSpd,
      [field]: value,
    });
  };

  const handleSelectSpdPegawai = (pegawaiId: string) => {
    const nextSpd: SuratPerjalananDinasData = {
      ...(draft.spdData || {}),
      selectedPegawaiId: pegawaiId,
    };
    handleUpdateSpdData(nextSpd);
  };

  const handleAutoFillPengikutFromSpt = () => {
    const effectivePelaksanaId = draft.spdData?.selectedPegawaiId || draft.pegawaiList[0]?.id;
    const otherEmployees = draft.pegawaiList.filter((p) => p.id !== effectivePelaksanaId);
    const newPengikutList: SpdPengikutItem[] = [];
    for (let i = 0; i < 4; i++) {
      const emp = otherEmployees[i];
      newPengikutList.push({
        id: `pengikut-${i + 1}`,
        nama: emp ? emp.nama : '',
        tanggalLahir: '',
        keterangan: emp ? (emp.jabatan || 'Pelaksana') : '',
      });
    }
    handleUpdateSpdData({
      ...(draft.spdData || {}),
      pengikutList: newPengikutList,
    });
    setSaveBanner('Pengikut berhasil diisi otomatis dari rekan tugas pada SPT.');
    setTimeout(() => setSaveBanner(null), 3000);
  };

  const handleUpdatePengikutRow = (
    index: number,
    field: keyof SpdPengikutItem,
    value: string
  ) => {
    const currentList = [...(draft.spdData?.pengikutList || [
      { id: '1', nama: '', tanggalLahir: '', keterangan: '' },
      { id: '2', nama: '', tanggalLahir: '', keterangan: '' },
      { id: '3', nama: '', tanggalLahir: '', keterangan: '' },
      { id: '4', nama: '', tanggalLahir: '', keterangan: '' },
    ])];
    while (currentList.length < 4) {
      currentList.push({ id: `${currentList.length + 1}`, nama: '', tanggalLahir: '', keterangan: '' });
    }
    currentList[index] = {
      ...currentList[index],
      [field]: value,
    };
    handleUpdateSpdData({
      ...(draft.spdData || {}),
      pengikutList: currentList,
    });
  };

  // Handlers for Dasar Hukum List
  const handleAddDasar = () => {
    const nextDasar = [
      ...draft.dasarList,
      'Peraturan Gubernur / Peraturan terkait pelaksanaan perjalanan dinas;',
    ];
    handleFieldChange('dasarList', nextDasar);
  };

  const handleUpdateDasar = (index: number, value: string) => {
    const nextDasar = draft.dasarList.map((d, i) => (i === index ? value : d));
    handleFieldChange('dasarList', nextDasar);
  };

  const handleRemoveDasar = (index: number) => {
    if (draft.dasarList.length <= 1) return;
    const nextDasar = draft.dasarList.filter((_, i) => i !== index);
    handleFieldChange('dasarList', nextDasar);
  };

  // Handlers for Pegawai List
  const handleAddPegawaiManual = () => {
    const newPeg: SuratTugasPegawai = {
      id: `st-p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nama: 'Nama Pegawai Baru',
      pangkatGol: 'Penata, III/c',
      nip: '198001012010011001',
      jabatan: 'Analis / Pelaksana',
    };
    const nextList = [...draft.pegawaiList, newPeg];
    handleFieldChange('pegawaiList', nextList);
  };

  const handleAddPegawaiFromMaster = (selectedId: string) => {
    if (!selectedId) return;
    const master = daftarPegawai.find((p) => p.id === selectedId);
    if (!master) return;

    // Check if already in list
    const exists = draft.pegawaiList.some((p) => p.nip === master.nip);
    if (exists) {
      setSaveBanner(`Pegawai "${master.nama}" sudah ada dalam daftar tugas.`);
      setTimeout(() => setSaveBanner(null), 3000);
      return;
    }

    const newPeg: SuratTugasPegawai = {
      id: `st-p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      nama: master.nama,
      pangkatGol: master.pangkatGolongan || '-',
      nip: master.nip,
      jabatan: master.jabatan || 'Pelaksana',
    };
    const nextList = [...draft.pegawaiList, newPeg];
    handleFieldChange('pegawaiList', nextList);
  };

  const handleUpdatePegawaiRow = (
    id: string,
    field: keyof SuratTugasPegawai,
    value: string
  ) => {
    const activePeg = (daftarPegawai || []).filter((p) => p.statusActive !== false);
    const nextList = draft.pegawaiList.map((p) => {
      if (p.id !== id) return p;
      if (field === 'nama') {
        const found = activePeg.find(
          (m) => m.nama.trim().toLowerCase() === value.trim().toLowerCase()
        );
        if (found) {
          return {
            ...p,
            nama: found.nama,
            nip: found.nip,
            jabatan: found.jabatan || p.jabatan,
            pangkatGol: found.pangkatGolongan || p.pangkatGol,
          };
        }
      }
      return { ...p, [field]: value };
    });
    handleFieldChange('pegawaiList', nextList);
  };

  const handleRemovePegawaiRow = (id: string) => {
    if (draft.pegawaiList.length <= 1) {
      setValidationErrors(['Minimal harus terdapat 1 pegawai yang ditugaskan pada Surat Tugas.']);
      return;
    }
    const nextList = draft.pegawaiList.filter((p) => p.id !== id);
    handleFieldChange('pegawaiList', nextList);
  };

  const handleExplicitValidateAndSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const errors: string[] = [];
    if (!draft.noSpt || !draft.noSpt.trim()) {
      errors.push('Nomor Surat Perintah Tugas wajib diisi.');
    }
    if (!draft.pegawaiList || draft.pegawaiList.length === 0) {
      errors.push('Minimal harus terdapat 1 pegawai ditugaskan.');
    }
    if (!draft.maksudPerjalanan || !draft.maksudPerjalanan.trim()) {
      errors.push('Maksud Perjalanan Dinas wajib diisi.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      setSaveBanner(null);
      setFormTab('header');
      return;
    }

    setValidationErrors([]);
    const finalSaved = { ...draft, updatedAt: new Date().toISOString() };
    setDraft(finalSaved);
    modalSnapshotRef.current = finalSaved;
    onSaveSpt(finalSaved);
    setIsMobileSheetOpen(false);
    setSaveBanner(
      docType === 'spd-belakang'
        ? 'Visum SPD Lembar 2 berhasil disimpan & disinkronkan.'
        : docType === 'spd'
          ? 'Surat Perjalanan Dinas (SPD) berhasil disimpan & disinkronkan.'
          : 'Surat Perintah Tugas (SPT) berhasil divalidasi & disimpan.'
    );
    setTimeout(() => setSaveBanner(null), 4000);
  };

  const handleClearPengikutRows = () => {
    handleUpdateSpdData({
      ...(draft.spdData || {}),
      pengikutList: [
        { id: '1', nama: '', tanggalLahir: '', keterangan: '' },
        { id: '2', nama: '', tanggalLahir: '', keterangan: '' },
        { id: '3', nama: '', tanggalLahir: '', keterangan: '' },
        { id: '4', nama: '', tanggalLahir: '', keterangan: '' },
      ],
    });
  };

  const handleClearVisumTransitRows = () => {
    const currentVisum = getEffectiveVisumData(draft);
    handleUpdateVisumData({
      ...currentVisum,
      persinggahanList: [
        {
          id: 'II',
          labelRomawi: 'II',
          tibaDi: '',
          tibaTgl: '',
          tibaKepala: '',
          tibaNip: '',
          berangkatDari: '',
          berangkatKe: '',
          berangkatTgl: '',
          berangkatKepala: '',
          berangkatNip: '',
        },
        {
          id: 'III',
          labelRomawi: 'III',
          tibaDi: '',
          tibaTgl: '',
          tibaKepala: '',
          tibaNip: '',
          berangkatDari: '',
          berangkatKe: '',
          berangkatTgl: '',
          berangkatKepala: '',
          berangkatNip: '',
        },
        {
          id: 'IV',
          labelRomawi: 'IV',
          tibaDi: '',
          tibaTgl: '',
          tibaKepala: '',
          tibaNip: '',
          berangkatDari: '',
          berangkatKe: '',
          berangkatTgl: '',
          berangkatKepala: '',
          berangkatNip: '',
        },
        {
          id: 'V',
          labelRomawi: 'V',
          tibaDi: '',
          tibaTgl: '',
          tibaKepala: '',
          tibaNip: '',
          berangkatDari: '',
          berangkatKe: '',
          berangkatTgl: '',
          berangkatKepala: '',
          berangkatNip: '',
        },
      ],
    });
  };

  // FORM INSPECTOR CONTENT FOR SPD (Surat Perjalanan Dinas)
  const renderSpdFormFieldsContent = () => {
    const currentSpd = draft.spdData || {};
    const rawNomorSpd = currentSpd.nomorSpd;
    const effectiveNomorSpd =
      !rawNomorSpd || rawNomorSpd === '000.1.2.3/       /SPPD/Disdikbud/2026'
        ? `000.1.2.3/                  /SPPD/Disdikbud/${new Date().getFullYear()}`
        : rawNomorSpd;

    const currentSpacesCount = (() => {
      const match = effectiveNomorSpd.match(/\/(\s*)\//);
      return match ? match[1].length : 0;
    })();

    const modifySpaces = (delta: number) => {
      const match = effectiveNomorSpd.match(/^(.*?\/)(\s*)(\/.*)$/);
      if (match) {
        const prefix = match[1];
        const spaces = match[2];
        const suffix = match[3];
        const nextLen = Math.max(4, spaces.length + delta);
        handleUpdateSpdField('nomorSpd', `${prefix}${' '.repeat(nextLen)}${suffix}`);
      } else {
        handleUpdateSpdField('nomorSpd', `000.1.2.3/                  /SPPD/Disdikbud/${new Date().getFullYear()}`);
      }
    };

    const setFixedSpaces = (count: number) => {
      const match = effectiveNomorSpd.match(/^(.*?\/)(\s*)(\/.*)$/);
      if (match) {
        const prefix = match[1];
        const suffix = match[3];
        handleUpdateSpdField('nomorSpd', `${prefix}${' '.repeat(count)}${suffix}`);
      } else {
        handleUpdateSpdField('nomorSpd', `000.1.2.3/${' '.repeat(count)}/SPPD/Disdikbud/${new Date().getFullYear()}`);
      }
    };

    const effectivePptkNama = currentSpd.pptkNama ?? (draft.pegawaiList[0]?.nama ? `${draft.pegawaiList[0].nama}/NIP ${draft.pegawaiList[0].nip}` : 'Bayu Ramadhan/NIP 198307072015031002');
    const effectiveAlatAngkut = currentSpd.alatAngkut ?? 'Darat dan Air';
    const effectiveInstansi = currentSpd.instansiAnggaran ?? (appSettings.namaDinas || 'Dinas Pendidikan dan Kebudayaan');
    const effectiveAkun = currentSpd.akunAnggaran ?? (draft.pembebananAnggaran || '1.01.02.1.01.0078 – 5.1.02.04.001.00001');

    return (
      <div className="space-y-4">
        {/* SPD SUB-TAB 1: KOP & NOMOR (Row 1, Lembar Ke, Kode No, Nomor) */}
        {spdTab === 'header' && (
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="input-spd-no" className="block text-xs font-semibold text-slate-700">
                  Nomor Surat Perjalanan Dinas (SPD)
                </label>
                <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono font-semibold">
                  Spasi Manual: {currentSpacesCount} karakter
                </span>
              </div>
              <input
                id="input-spd-no"
                type="text"
                value={effectiveNomorSpd}
                onChange={(e) => handleUpdateSpdField('nomorSpd', e.target.value)}
                placeholder="000.1.2.3/                  /SPPD/Disdikbud/2026"
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600 tracking-wide"
              />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1.5 text-[10.5px]">
                <span className="text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                  Spasi kosong panjang disiapkan untuk penomoran manual.
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => modifySpaces(4)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors cursor-pointer"
                    title="Tambah 4 spasi kosong lagi"
                  >
                    + Tambah Spasi (+4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFixedSpaces(24)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                    title="Atur ke format ekstra panjang (24 spasi)"
                  >
                    Ekstra (24)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFixedSpaces(18)}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                    title="Kembalikan ke standar 18 spasi"
                  >
                    Reset (18)
                  </button>
                  {currentSpacesCount > 8 && (
                    <button
                      type="button"
                      onClick={() => modifySpaces(-4)}
                      className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Kurangi 4 spasi"
                    >
                      -4
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="input-spd-lembar" className="block text-[11px] font-medium text-slate-600 mb-1">
                  Lembar Ke
                </label>
                <input
                  id="input-spd-lembar"
                  type="text"
                  value={currentSpd.lembarKe ?? '...............................................'}
                  onChange={(e) => handleUpdateSpdField('lembarKe', e.target.value.replace(/^[:\s]+/, ''))}
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label htmlFor="input-spd-kode" className="block text-[11px] font-medium text-slate-600 mb-1">
                  Kode No.
                </label>
                <input
                  id="input-spd-kode"
                  type="text"
                  value={currentSpd.kodeNo ?? '...............................................'}
                  onChange={(e) => handleUpdateSpdField('kodeNo', e.target.value.replace(/^[:\s]+/, ''))}
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="input-spd-pptk" className="block text-xs font-semibold text-slate-800">
                  1. Pejabat Pelaksana Teknis Kegiatan (PPTK)
                </label>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  Format Otomatis: Nama/NIP ...
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                  Isian Dokumen (Tersinkron ke Tabel SPD):
                </label>
                <input
                  id="input-spd-pptk"
                  type="text"
                  list="datalist-spd-pptk"
                  value={effectivePptkNama}
                  onChange={(e) => {
                    const val = e.target.value;
                    const activePeg = (daftarPegawai || []).filter((p) => p.statusActive !== false);
                    const found = activePeg.find(
                      (p) => p.nama.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (found) {
                      handleUpdateSpdData({
                        ...currentSpd,
                        pptkNama: `${found.nama}/NIP ${found.nip}`,
                        pptkNip: found.nip,
                      });
                    } else {
                      handleUpdateSpdField('pptkNama', val);
                    }
                  }}
                  placeholder="Contoh: Bayu Ramadhan/NIP 198307072015031002"
                  className="w-full min-h-[40px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
                <datalist id="datalist-spd-pptk">
                  {(daftarPegawai || [])
                    .filter((p) => p.statusActive !== false)
                    .map((p) => (
                      <option key={p.id} value={`${p.nama}/NIP ${p.nip}`}>
                        {p.nama} — {p.jabatan || 'Pelaksana'}
                      </option>
                    ))}
                </datalist>
                <p className="text-[10px] text-slate-500 mt-1">
                  Format otomatis naskah: <span className="font-mono font-semibold">Nama/NIP [Nomor NIP]</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* SPD SUB-TAB 2: PELAKSANA (Row 2 & 3) */}
        {spdTab === 'pelaksana' && (
          <div className="space-y-4">
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-700" />
                  <span>2. Pilih Pegawai Pelaksana SPD (dari SPT)</span>
                </span>
                <span className="text-[10px] bg-sky-200/70 text-sky-900 px-2 py-0.5 rounded font-bold">
                  {draft.pegawaiList.length} Pegawai di SPT
                </span>
              </div>
              <select
                aria-label="Pilih Pegawai Pelaksana SPD"
                value={activeSpdPelaksana.id}
                onChange={(e) => handleSelectSpdPegawai(e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-sky-300 bg-white px-3 py-2 text-xs font-bold text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
              >
                {draft.pegawaiList.map((peg, idx) => (
                  <option key={peg.id} value={peg.id}>
                    {idx + 1}. {peg.nama} — NIP. {peg.nip} ({peg.jabatan || 'Pelaksana'})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-sky-800">
                Data Pangkat, Golongan, dan Jabatan otomatis disesuaikan dari data Surat Tugas yang dipilih.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                3. Rincian Pelaksana Perjalanan Dinas
              </span>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  a. Pangkat dan Golongan
                </label>
                <input
                  type="text"
                  value={activeSpdPelaksana.pangkatGol || '-'}
                  onChange={(e) => handleUpdatePegawaiRow(activeSpdPelaksana.id, 'pangkatGol', e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  b. Jabatan / Instansi
                </label>
                <input
                  type="text"
                  value={activeSpdPelaksana.jabatan || 'Pelaksana'}
                  onChange={(e) => handleUpdatePegawaiRow(activeSpdPelaksana.id, 'jabatan', e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="input-spd-tingkat-biaya" className="block text-[11px] font-medium text-slate-600 mb-1">
                  c. Tingkat Biaya Perjalanan Dinas
                </label>
                <input
                  id="input-spd-tingkat-biaya"
                  type="text"
                  placeholder="Contoh: Tingkat C / Biasa (opsional)"
                  value={currentSpd.tingkatBiaya ?? ''}
                  onChange={(e) => handleUpdateSpdField('tingkatBiaya', e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* SPD SUB-TAB 3: RINCIAN PERJALANAN (Row 4, 5, 6, 7) */}
        {spdTab === 'perjalanan' && (
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                4. Maksud Perjalanan Dinas (Tersinkron dengan SPT)
              </label>
              <textarea
                rows={3}
                value={draft.maksudPerjalanan}
                onChange={(e) => handleFieldChange('maksudPerjalanan', e.target.value)}
                className="w-full rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div>
              <label htmlFor="input-spd-alat-angkut" className="block text-xs font-semibold text-slate-700 mb-1">
                5. Alat Angkut yang Dipergunakan
              </label>
              <input
                id="input-spd-alat-angkut"
                type="text"
                placeholder="Contoh: Darat dan Air / Mobil Dinas"
                value={effectiveAlatAngkut}
                onChange={(e) => handleUpdateSpdField('alatAngkut', e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  6.a. Tempat Berangkat
                </label>
                <input
                  type="text"
                  value={draft.tempatBerangkat}
                  onChange={(e) => handleFieldChange('tempatBerangkat', e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  6.b. Tempat Tujuan
                </label>
                <input
                  type="text"
                  value={draft.tempatTujuan}
                  onChange={(e) => handleFieldChange('tempatTujuan', e.target.value)}
                  className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block">
                7. Waktu &amp; Tanggal Pelaksanaan (Tersinkron SPT)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Lamanya</label>
                  <input
                    type="text"
                    value={draft.lamanyaPerjalanan}
                    onChange={(e) => handleFieldChange('lamanyaPerjalanan', e.target.value)}
                    className="w-full min-h-[36px] rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Berangkat</label>
                  <input
                    type="text"
                    value={draft.tanggalBerangkat}
                    onChange={(e) => handleFieldChange('tanggalBerangkat', e.target.value)}
                    className="w-full min-h-[36px] rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Kembali</label>
                  <input
                    type="text"
                    value={draft.tanggalHarusKembali}
                    onChange={(e) => handleFieldChange('tanggalHarusKembali', e.target.value)}
                    className="w-full min-h-[36px] rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SPD SUB-TAB 4: PENGIKUT (Row 8) */}
        {spdTab === 'pengikut' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                8. Daftar Pengikut (Nama, Tgl Lahir, Keterangan)
              </span>
              <button
                type="button"
                onClick={handleAutoFillPengikutFromSpt}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                title="Salin pegawai lain di SPT secara otomatis ke kolom Pengikut"
              >
                <Users className="w-3.5 h-3.5 text-emerald-700" />
                <span>+ Isi Otomatis dari SPT</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((idx) => {
                const item = currentSpd.pengikutList?.[idx] || { id: `${idx + 1}`, nama: '', tanggalLahir: '', keterangan: '' };
                return (
                  <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Pengikut #{idx + 1}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-1">
                        <label className="block text-[10px] text-slate-500 mb-0.5">Nama Lengkap</label>
                        <input
                          type="text"
                          placeholder="Nama pengikut..."
                          value={item.nama || ''}
                          onChange={(e) => handleUpdatePengikutRow(idx, 'nama', e.target.value)}
                          className="w-full min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Tanggal Lahir</label>
                        <input
                          type="text"
                          placeholder="Contoh: 12-05-1990"
                          value={item.tanggalLahir || ''}
                          onChange={(e) => handleUpdatePengikutRow(idx, 'tanggalLahir', e.target.value)}
                          className="w-full min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Keterangan</label>
                        <input
                          type="text"
                          placeholder="Contoh: Anggota / Pelaksana"
                          value={item.keterangan || ''}
                          onChange={(e) => handleUpdatePengikutRow(idx, 'keterangan', e.target.value)}
                          className="w-full min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SPD SUB-TAB 5: PEMBEBANAN ANGGARAN & KETERANGAN (Row 9 & 10) */}
        {spdTab === 'anggaran' && (
          <div className="space-y-3.5">
            <div>
              <label htmlFor="input-spd-instansi" className="block text-xs font-semibold text-slate-700 mb-1">
                9.a. Instansi Pembebanan Anggaran
              </label>
              <input
                id="input-spd-instansi"
                type="text"
                value={effectiveInstansi}
                onChange={(e) => handleUpdateSpdField('instansiAnggaran', e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="input-spd-akun" className="block text-xs font-semibold text-slate-700 mb-1">
                9.b. Akun Pembebanan Anggaran
              </label>
              <input
                id="input-spd-akun"
                type="text"
                value={effectiveAkun}
                onChange={(e) => handleUpdateSpdField('akunAnggaran', e.target.value)}
                className="w-full min-h-[40px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-semibold text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="input-spd-ket-lain" className="block text-xs font-semibold text-slate-700 mb-1">
                10. Keterangan Lain-lain
              </label>
              <textarea
                id="input-spd-ket-lain"
                rows={2}
                placeholder="-"
                value={currentSpd.keteranganLain ?? ''}
                onChange={(e) => handleUpdateSpdField('keteranganLain', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>
        )}

        {/* SPD SUB-TAB 6: TITIMANGSA & PEJABAT PENANDATANGAN */}
        {spdTab === 'ttd' && (
          <div className="space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dikeluarkan di</label>
                <input
                  type="text"
                  value={draft.tempatDitetapkan}
                  onChange={(e) => handleFieldChange('tempatDitetapkan', e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pada Tanggal</label>
                <input
                  type="text"
                  value={draft.tanggalDitetapkan}
                  onChange={(e) => handleFieldChange('tanggalDitetapkan', e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Penandatangan Dokumen SPD
              </span>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Jabatan</label>
                <input
                  type="text"
                  value={draft.jabatanPenandatangan}
                  onChange={(e) => handleFieldChange('jabatanPenandatangan', e.target.value)}
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Nama Lengkap &amp; Gelar</label>
                <input
                  type="text"
                  value={draft.namaPenandatangan}
                  onChange={(e) => handleFieldChange('namaPenandatangan', e.target.value)}
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">NIP</label>
                <input
                  type="text"
                  value={draft.nipPenandatangan}
                  onChange={(e) => handleFieldChange('nipPenandatangan', e.target.value)}
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-900"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // FORM INSPECTOR CONTENT FOR SPT (Surat Perintah Tugas)
  const renderSptFormFieldsContent = () => (
    <div className="space-y-4">
      {/* TAB 1: KOP SURAT, NOMOR & DASAR HUKUM */}
      {formTab === 'header' && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="input-spt-no"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Nomor Surat Perintah Tugas (SPT) *
            </label>
            <input
              id="input-spt-no"
              type="text"
              placeholder="Contoh: 800.1.11.1/ 11898/SPT/Disdikbud/KU/X/2026"
              value={draft.noSpt}
              onChange={(e) => handleFieldChange('noSpt', e.target.value)}
              className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Dasar Hukum Penugasan ({draft.dasarList.length})
              </span>
              <button
                type="button"
                onClick={handleAddDasar}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Dasar</span>
              </button>
            </div>

            <div className="space-y-2">
              {draft.dasarList.map((dasar, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-6 h-8 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-1">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={2}
                    value={dasar}
                    onChange={(e) => handleUpdateDasar(idx, e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  {draft.dasarList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDasar(idx)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer mt-1"
                      title="Hapus dasar hukum ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PEGAWAI DITUGASKAN */}
      {formTab === 'pegawai' && (
        <div className="space-y-3.5">
          {/* Quick Add from CSV Master Data */}
          {daftarPegawai && daftarPegawai.length > 0 && (() => {
            const activePegawai = daftarPegawai.filter((p) => p.statusActive !== false);
            const prioPegawai = activePegawai.filter((p) => p.isPriority);
            const regularPegawai = activePegawai.filter((p) => !p.isPriority);

            if (activePegawai.length === 0) return null;

            return (
              <div className="bg-indigo-50/80 border border-indigo-200/90 rounded-xl p-3 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Tambah Pegawai dari Master Data:</span>
                  </span>
                  <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md">
                    {activePegawai.length} Pegawai Aktif {prioPegawai.length > 0 ? `(${prioPegawai.length} ⭐)` : ''}
                  </span>
                </div>
                <select
                  aria-label="Pilih pegawai dari database CSV untuk ditambahkan ke Surat Tugas"
                  value=""
                  onChange={(e) => {
                    handleAddPegawaiFromMaster(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full min-h-[38px] rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 cursor-pointer"
                >
                  <option value="">-- Ketuk untuk memilih pegawai (Prioritas di Urutan Atas) --</option>
                  {prioPegawai.length > 0 && (
                    <optgroup label="⭐ Pegawai Prioritas (Sering Muncul)">
                      {prioPegawai.map((peg) => (
                        <option key={peg.id} value={peg.id}>
                          ⭐ {peg.nama} — NIP. {peg.nip} {peg.jabatan ? `(${peg.jabatan})` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label={prioPegawai.length > 0 ? "Pegawai Lainnya" : "Daftar Pegawai"}>
                    {regularPegawai.map((peg) => (
                      <option key={peg.id} value={peg.id}>
                        {peg.nama} — NIP. {peg.nip} {peg.jabatan ? `(${peg.jabatan})` : ''}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            );
          })()}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Daftar Pegawai Ditugaskan ({draft.pegawaiList.length})
            </span>
            <button
              type="button"
              onClick={handleAddPegawaiManual}
              className="min-h-[34px] px-3 py-1 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Manual</span>
            </button>
          </div>

          <div className="space-y-3">
            {draft.pegawaiList.map((peg, idx) => (
              <div
                key={peg.id || idx}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px] font-mono font-bold">
                    Pegawai #{idx + 1}
                  </span>
                  {draft.pegawaiList.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemovePegawaiRow(peg.id)}
                      className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      title="Hapus pegawai dari daftar tugas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Nama Lengkap &amp; Gelar *
                    </label>
                    <input
                      type="text"
                      list="datalist-spt-pegawai"
                      placeholder="Ketik nama pegawai..."
                      value={peg.nama}
                      onChange={(e) =>
                        handleUpdatePegawaiRow(peg.id, 'nama', e.target.value)
                      }
                      className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                    />
                    <datalist id="datalist-spt-pegawai">
                      {(daftarPegawai || [])
                        .filter((p) => p.statusActive !== false)
                        .map((p) => (
                          <option key={p.id} value={p.nama}>
                            NIP. {p.nip} {p.jabatan ? `— ${p.jabatan}` : ''} {p.pangkatGolongan ? `(${p.pangkatGolongan})` : ''}
                          </option>
                        ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      NIP Pegawai
                    </label>
                    <input
                      type="text"
                      value={peg.nip}
                      onChange={(e) =>
                        handleUpdatePegawaiRow(peg.id, 'nip', e.target.value)
                      }
                      className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Pangkat / Golongan
                    </label>
                    <input
                      type="text"
                      value={peg.pangkatGol}
                      onChange={(e) =>
                        handleUpdatePegawaiRow(peg.id, 'pangkatGol', e.target.value)
                      }
                      className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-600 mb-0.5">
                      Jabatan Dinas
                    </label>
                    <input
                      type="text"
                      value={peg.jabatan}
                      onChange={(e) =>
                        handleUpdatePegawaiRow(peg.id, 'jabatan', e.target.value)
                      }
                      className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: DETAIL TUGAS & RINCIAN PERJALANAN */}
      {formTab === 'detail' && (
        <div className="space-y-3.5">
          <div>
            <label
              htmlFor="input-spt-maksud"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Maksud Perjalanan Dinas *
            </label>
            <textarea
              id="input-spt-maksud"
              rows={3}
              placeholder="Contoh: Monitoring dan Peninjauan Lokasi Rencana Kegiatan APBD Perubahan 2026..."
              value={draft.maksudPerjalanan}
              onChange={(e) => handleFieldChange('maksudPerjalanan', e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="input-spt-berangkat-dari"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tempat Berangkat
              </label>
              <input
                id="input-spt-berangkat-dari"
                type="text"
                placeholder="Contoh: Tanjung Selor"
                value={draft.tempatBerangkat}
                onChange={(e) => handleFieldChange('tempatBerangkat', e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="input-spt-tujuan"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Tempat Tujuan
              </label>
              <input
                id="input-spt-tujuan"
                type="text"
                placeholder="Contoh: Kota Tarakan"
                value={draft.tempatTujuan}
                onChange={(e) => handleFieldChange('tempatTujuan', e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* Tanggal & Waktu Pelaksanaan */}
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-sky-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-sky-950">
                    Jadwal Pelaksanaan Perjalanan Dinas
                  </span>
                  <p className="text-[11px] text-sky-800">
                    Klik ikon kalender pada bidang input untuk memilih tanggal, atau ketik langsung.
                  </p>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                <span className="text-[10px] font-bold text-sky-900 mr-0.5">Preset:</span>
                <button
                  type="button"
                  onClick={() => applyDateSelection(getTodayIso(0), getTodayIso(2))}
                  className="px-2.5 py-1 rounded-md bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Hari Ini (+3 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => applyDateSelection(getTodayIso(1), getTodayIso(3))}
                  className="px-2.5 py-1 rounded-md bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  Besok (+3 Hari)
                </button>
                <button
                  type="button"
                  onClick={() => applyDateSelection(getTodayIso(0), getTodayIso(4))}
                  className="px-2.5 py-1 rounded-md bg-white border border-sky-300 hover:bg-sky-100 text-sky-900 text-[11px] font-bold cursor-pointer transition-colors shadow-2xs"
                >
                  5 Hari Tugas
                </button>
              </div>
            </div>

            {/* Single Unified Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="input-spt-tgl-berangkat"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Tanggal Berangkat
                </label>
                <div className="relative flex items-center">
                  <input
                    id="input-spt-tgl-berangkat"
                    type="text"
                    placeholder="Contoh: Kamis, 15 Oktober 2026;"
                    value={draft.tanggalBerangkat}
                    onChange={(e) => handleFieldChange('tanggalBerangkat', e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white pr-10 pl-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  <div className="absolute right-2.5 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleOpenStartPicker}
                      className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer relative"
                      title="Buka Kalender Pemilih Tanggal"
                    >
                      <Calendar className="w-4 h-4 text-sky-700" />
                      <input
                        ref={startPickerRef}
                        type="date"
                        value={isoBerangkat}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          if (!newStart) return;
                          const newEnd = newStart > isoKembali ? newStart : isoKembali;
                          applyDateSelection(newStart, newEnd);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="input-spt-tgl-kembali"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Tanggal Harus Kembali
                </label>
                <div className="relative flex items-center">
                  <input
                    id="input-spt-tgl-kembali"
                    type="text"
                    placeholder="Contoh: Sabtu, 17 Oktober 2026;"
                    value={draft.tanggalHarusKembali}
                    onChange={(e) => handleFieldChange('tanggalHarusKembali', e.target.value)}
                    className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white pr-10 pl-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                  />
                  <div className="absolute right-2.5 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={handleOpenEndPicker}
                      className="p-1.5 rounded-lg text-sky-700 hover:bg-sky-100 transition-colors cursor-pointer relative"
                      title="Buka Kalender Pemilih Tanggal"
                    >
                      <Calendar className="w-4 h-4 text-sky-700" />
                      <input
                        ref={endPickerRef}
                        type="date"
                        value={isoKembali}
                        min={isoBerangkat}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          if (!newEnd) return;
                          applyDateSelection(isoBerangkat, newEnd);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lamanya Perjalanan */}
            <div>
              <label
                htmlFor="input-spt-lama"
                className="block text-xs font-bold text-slate-800 mb-1"
              >
                Lamanya Perjalanan Dinas (Terhitung Otomatis)
              </label>
              <input
                id="input-spt-lama"
                type="text"
                placeholder="Contoh: 3 (tiga) hari;"
                value={draft.lamanyaPerjalanan}
                onChange={(e) => handleFieldChange('lamanyaPerjalanan', e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="input-spt-anggaran"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Pembebanan Anggaran (DPA / Sub Kegiatan)
            </label>
            <textarea
              id="input-spt-anggaran"
              rows={2}
              placeholder="Contoh: DPA Dinas Pendidikan dan Kebudayaan Provinsi Kalimantan Utara Tahun Anggaran 2026..."
              value={draft.pembebananAnggaran}
              onChange={(e) => handleFieldChange('pembebananAnggaran', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
        </div>
      )}

      {/* TAB 4: TITIMANGSA & PEJABAT PENANDATANGAN */}
      {formTab === 'ttd' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label
                htmlFor="input-spt-tempat-ttd"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Ditetapkan di
              </label>
              <input
                id="input-spt-tempat-ttd"
                type="text"
                value={draft.tempatDitetapkan}
                onChange={(e) => handleFieldChange('tempatDitetapkan', e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="input-spt-tgl-ttd"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Pada Tanggal
              </label>
              <input
                id="input-spt-tgl-ttd"
                type="text"
                value={draft.tanggalDitetapkan}
                onChange={(e) => handleFieldChange('tanggalDitetapkan', e.target.value)}
                className="w-full min-h-[42px] rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Pejabat Penandatangan Surat Tugas
            </span>

            <div>
              <label
                htmlFor="input-spt-jabatan-ttd"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Jabatan Penandatangan
              </label>
              <input
                id="input-spt-jabatan-ttd"
                type="text"
                placeholder="Contoh: Plt. Kepala Dinas"
                value={draft.jabatanPenandatangan}
                onChange={(e) => handleFieldChange('jabatanPenandatangan', e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="input-spt-nama-ttd"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Nama Lengkap &amp; Gelar
              </label>
              <input
                id="input-spt-nama-ttd"
                type="text"
                list="datalist-spt-pegawai"
                placeholder="Ketik nama pejabat penandatangan..."
                value={draft.namaPenandatangan}
                onChange={(e) => {
                  const val = e.target.value;
                  const activePeg = (daftarPegawai || []).filter((p) => p.statusActive !== false);
                  const found = activePeg.find(
                    (p) => p.nama.trim().toLowerCase() === val.trim().toLowerCase()
                  );
                  if (found) {
                    const next: SuratPerintahTugas = {
                      ...draft,
                      namaPenandatangan: found.nama,
                      nipPenandatangan: found.nip,
                      jabatanPenandatangan: found.jabatan || draft.jabatanPenandatangan,
                      pangkatPenandatangan: found.pangkatGolongan || draft.pangkatPenandatangan,
                      updatedAt: new Date().toISOString(),
                    };
                    commitOrStageDraft(next);
                  } else {
                    handleFieldChange('namaPenandatangan', val);
                  }
                }}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="input-spt-nip-ttd"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                NIP Penandatangan
              </label>
              <input
                id="input-spt-nip-ttd"
                type="text"
                value={draft.nipPenandatangan}
                onChange={(e) => handleFieldChange('nipPenandatangan', e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="input-spt-pangkat-ttd"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Pangkat / Golongan Penandatangan
              </label>
              <input
                id="input-spt-pangkat-ttd"
                type="text"
                value={draft.pangkatPenandatangan}
                onChange={(e) => handleFieldChange('pangkatPenandatangan', e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      className={`space-y-3 pb-20 lg:pb-0 min-w-0 max-w-full overflow-x-hidden ${
        isMobileSheetOpen ? 'max-lg:overflow-hidden' : ''
      }`}
    >
      {/* 0. DOCUMENT SELECTOR BAR (SPT -> SPD Lembar 1 -> SPD Lembar 2 / Visum) */}
      <div className="no-print bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 max-w-full overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0 w-full xl:w-auto">
          <span className="text-xs font-bold text-slate-700 ml-1 shrink-0">Dokumen SPPD:</span>
          <div className="grid grid-cols-3 p-1 bg-slate-100/90 rounded-xl gap-1 w-full sm:w-auto min-w-0">
            <button
              type="button"
              onClick={() => setDocType('spt')}
              className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                docType === 'spt'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              title="Dokumen Induk Surat Perintah Tugas (SPT)"
            >
              <FileCheck
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                  docType === 'spt' ? 'text-amber-300' : 'text-sky-700'
                }`}
              />
              <span className="truncate">
                Surat Tugas <span className="hidden md:inline">(SPT)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('spd')}
              className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                docType === 'spd'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              title="Surat Perjalanan Dinas Lembar 1 (Depan / Rincian)"
            >
              <ClipboardList
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                  docType === 'spd' ? 'text-sky-200' : 'text-sky-700'
                }`}
              />
              <span className="truncate">
                SPD Depan <span className="hidden md:inline">(Lembar 1)</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setDocType('spd-belakang')}
              className={`min-h-[38px] px-2 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-w-0 ${
                docType === 'spd-belakang'
                  ? 'bg-sky-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
              title="Surat Perjalanan Dinas Lembar 2 (Belakang / Visum Pengesahan)"
            >
              <Stamp
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-colors ${
                  docType === 'spd-belakang' ? 'text-emerald-300' : 'text-emerald-700'
                }`}
              />
              <span className="truncate">
                SPD Belakang <span className="hidden md:inline">(Visum)</span>
              </span>
            </button>
          </div>
        </div>

        {/* When in SPD Mode or SPD Belakang Mode, show employee picker directly in header */}
        {(docType === 'spd' || docType === 'spd-belakang') && (
          <div className="flex items-center gap-2 bg-sky-50/70 border border-sky-200/80 px-2.5 py-1.5 rounded-xl w-full xl:w-auto min-w-0 max-w-full overflow-hidden">
            <span className="text-xs font-bold text-sky-950 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <User className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Pelaksana SPD:</span>
            </span>
            <select
              aria-label="Pilih Pegawai Pelaksana SPD"
              value={selectedSpdPegawaiId}
              onChange={(e) => handleSelectSpdPegawai(e.target.value)}
              className="min-h-[32px] flex-1 min-w-0 w-full max-w-full truncate rounded-lg border border-sky-300 bg-white px-2 py-0.5 text-xs font-bold text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer"
            >
              {draft.pegawaiList.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  {idx + 1}. {p.nama} ({p.jabatan || 'Pelaksana'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Validation Banners */}
      {validationErrors.length > 0 && (
        <div
          role="alert"
          className="no-print rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 space-y-1"
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Mohon periksa kembali isian dokumen:</span>
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
        </div>
      )}

      {/* CANVA WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start print:block min-w-0 max-w-full">
        {/* DESKTOP LEFT INSPECTOR FORM */}
        <form
          onSubmit={handleExplicitValidateAndSave}
          className="no-print hidden lg:block lg:col-span-5 min-w-0 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs"
        >
          {/* Navigation Tabs Depending on Active Document */}
          {docType === 'spd' ? (
            <div
              role="tablist"
              aria-label="Bagian Form Surat Perjalanan Dinas"
              className="grid grid-cols-6 bg-slate-100/80 p-1.5 gap-1 border-b border-slate-200 text-center"
            >
              <button
                type="button"
                role="tab"
                aria-selected={spdTab === 'header'}
                onClick={() => setSpdTab('header')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdTab === 'header'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="1. Kop, No SPD & PPTK"
              >
                <Hash className="w-3 h-3 shrink-0" />
                <span className="truncate">1. No/PPTK</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdTab === 'pelaksana'}
                onClick={() => setSpdTab('pelaksana')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdTab === 'pelaksana'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="2 & 3. Pegawai Pelaksana & Pangkat/Jabatan"
              >
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">2. Pelaksana</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdTab === 'perjalanan'}
                onClick={() => setSpdTab('perjalanan')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdTab === 'perjalanan'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="4-7. Maksud, Angkutan, Tempat & Waktu"
              >
                <Route className="w-3 h-3 shrink-0" />
                <span className="truncate">3. Rincian</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdTab === 'pengikut'}
                onClick={() => setSpdTab('pengikut')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdTab === 'pengikut'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="8. Daftar Pengikut"
              >
                <Users className="w-3 h-3 shrink-0" />
                <span className="truncate">4. Pengikut</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdTab === 'anggaran'}
                onClick={() => setSpdTab('anggaran')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdTab === 'anggaran'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="9 & 10. Pembebanan Anggaran & Ket Lain"
              >
                <Wallet className="w-3 h-3 shrink-0" />
                <span className="truncate">5. Anggaran</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdTab === 'ttd'}
                onClick={() => setSpdTab('ttd')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdTab === 'ttd'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Penandatangan SPD & Pengguna Anggaran"
              >
                <PenTool className="w-3 h-3 shrink-0" />
                <span className="truncate">6. TTD</span>
              </button>
            </div>
          ) : docType === 'spd-belakang' ? (
            <div
              role="tablist"
              aria-label="Bagian Form SPD Lembar 2 (Visum Belakang)"
              className="grid grid-cols-4 bg-slate-100/80 p-1.5 gap-1 border-b border-slate-200 text-center"
            >
              <button
                type="button"
                role="tab"
                aria-selected={spdBelakangTab === 'bagian-1'}
                onClick={() => setSpdBelakangTab('bagian-1')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdBelakangTab === 'bagian-1'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="I. Keberangkatan Awal"
              >
                <PlaneTakeoff className="w-3 h-3 shrink-0" />
                <span className="truncate">I. Berangkat</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdBelakangTab === 'bagian-transit'}
                onClick={() => setSpdBelakangTab('bagian-transit')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdBelakangTab === 'bagian-transit'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="II - V. Persinggahan / Transit"
              >
                <Route className="w-3 h-3 shrink-0" />
                <span className="truncate">II-V. Transit</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdBelakangTab === 'bagian-6'}
                onClick={() => setSpdBelakangTab('bagian-6')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdBelakangTab === 'bagian-6'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="VI. Tiba Kembali & Pengesahan KPA"
              >
                <Stamp className="w-3 h-3 shrink-0" />
                <span className="truncate">VI. Pengesahan</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={spdBelakangTab === 'bagian-catatan'}
                onClick={() => setSpdBelakangTab('bagian-catatan')}
                className={`min-h-[36px] px-1 py-1 rounded-xl text-[11px] font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  spdBelakangTab === 'bagian-catatan'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="VII - VIII. Catatan Lain & Perhatian"
              >
                <NotebookPen className="w-3 h-3 shrink-0" />
                <span className="truncate">VII-VIII. Ket</span>
              </button>
            </div>
          ) : (
            <div
              role="tablist"
              aria-label="Bagian Form Surat Perintah Tugas"
              className="grid grid-cols-4 bg-slate-100/80 p-1.5 gap-1 border-b border-slate-200 text-center"
            >
              <button
                type="button"
                role="tab"
                aria-selected={formTab === 'header'}
                onClick={() => setFormTab('header')}
                className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  formTab === 'header'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1. Kop &amp; No</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={formTab === 'pegawai'}
                onClick={() => setFormTab('pegawai')}
                className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  formTab === 'pegawai'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Pegawai ({draft.pegawaiList.length})</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={formTab === 'detail'}
                onClick={() => setFormTab('detail')}
                className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  formTab === 'detail'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Route className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">3. Detail</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={formTab === 'ttd'}
                onClick={() => setFormTab('ttd')}
                className={`min-h-[38px] px-2 py-1.5 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1 truncate cursor-pointer ${
                  formTab === 'ttd'
                    ? 'bg-white text-sky-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">4. TTD</span>
              </button>
            </div>
          )}

          <div className="p-4 sm:p-5 space-y-4 max-h-[calc(100vh-230px)] overflow-y-auto">
            {docType === 'spd-belakang' ? (
              <SuratPerjalananDinasBelakangEditor
                spt={draft}
                activeZone={spdBelakangTab}
                onSelectZone={setSpdBelakangTab}
                visumData={getEffectiveVisumData(draft)}
                onUpdateVisumData={handleUpdateVisumData}
              />
            ) : docType === 'spd' ? (
              renderSpdFormFieldsContent()
            ) : (
              renderSptFormFieldsContent()
            )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onCreateNewSpt}
              className="min-h-[40px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Data Baru</span>
            </button>

            <button
              type="submit"
              className="min-h-[42px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>

        {/* RIGHT LIVE PAPER CANVAS */}
        <div className="lg:col-span-7 min-w-0 max-w-full space-y-3">
          {docType === 'spd-belakang' ? (
            <InteractivePaperViewer
              paperSize={paperSize}
              onChangePaperSize={onChangePaperSize}
              documentTitle={`SPD Lembar 2 (Visum Belakang) - ${activeSpdPelaksana.nama}`}
              interactiveHint="Ketuk bagian visum pada kertas untuk mengedit detail keberangkatan, transit, atau pengesahan"
            >
              <SuratPerjalananDinasBelakangDocumentPreview
                spt={draft}
                paperSize={paperSize}
                activeZone={spdBelakangTab}
                onSelectZone={handleSelectSpdBelakangZoneFromCanvas}
                visumData={getEffectiveVisumData(draft)}
                onUpdateVisumData={handleUpdateVisumData}
              />
            </InteractivePaperViewer>
          ) : docType === 'spd' ? (
            <InteractivePaperViewer
              paperSize={paperSize}
              onChangePaperSize={onChangePaperSize}
              documentTitle={`Surat Perjalanan Dinas (SPD) - ${activeSpdPelaksana.nama}`}
              interactiveHint="Ketuk elemen tabel atau ketik langsung untuk mengedit bagian Surat Perjalanan Dinas (SPD)"
            >
              <SuratPerjalananDinasDocumentPreview
                spt={draft}
                appSettings={appSettings}
                paperSize={paperSize}
                activeZone={spdTab}
                onSelectZone={handleSelectSpdZoneFromCanvas}
                onUpdateSpdData={handleUpdateSpdData}
                selectedPegawaiId={selectedSpdPegawaiId}
                onSelectPegawaiId={handleSelectSpdPegawai}
              />
            </InteractivePaperViewer>
          ) : (
            <InteractivePaperViewer
              paperSize={paperSize}
              onChangePaperSize={onChangePaperSize}
              documentTitle="Surat Perintah Tugas (SPT)"
              interactiveHint="Ketuk elemen kertas untuk mengedit bagian Surat Perintah Tugas"
            >
              <SuratTugasDocumentPreview
                spt={draft}
                appSettings={appSettings}
                paperSize={paperSize}
                activeZone={formTab}
                onSelectZone={handleSelectZoneFromCanvas}
                onUpdateField={handleFieldChange}
                onUpdateDasar={handleUpdateDasar}
                onUpdatePegawai={handleUpdatePegawaiRow}
              />
            </InteractivePaperViewer>
          )}
        </div>
      </div>

      {/* MOBILE SLIDE-UP BOTTOM SHEET (<lg) */}
      {isMobileSheetOpen && (
        <>
          <div
            className="no-print lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
            onClick={handleCancelAndCloseModal}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={
              docType === 'spd-belakang'
                ? 'Editor SPD Lembar 2 (Visum Belakang)'
                : docType === 'spd'
                ? 'Editor Surat Perjalanan Dinas (SPD)'
                : 'Editor Surat Perintah Tugas (SPT)'
            }
            className="no-print lg:hidden fixed inset-x-0 bottom-16 z-50 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200"
          >
            <div className="p-3 border-b border-slate-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-1 rounded-full bg-slate-300 block shrink-0" />
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {docType === 'spd-belakang'
                      ? 'Editor SPD Lembar 2 (Visum Belakang)'
                      : docType === 'spd'
                      ? 'Editor Surat Perjalanan Dinas (SPD)'
                      : 'Editor Surat Perintah Tugas (SPT)'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block pl-10">
                  Pindah tab otomatis menyimpan draf sementara
                </span>
              </div>
              <button
                type="button"
                onClick={handleCancelAndCloseModal}
                aria-label="Batal / Tutup tanpa menyimpan"
                title="Batal / Tutup tanpa menyimpan"
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              {docType === 'spd-belakang' ? (
                <SuratPerjalananDinasBelakangEditor
                  spt={draft}
                  activeZone={spdBelakangTab}
                  onSelectZone={setSpdBelakangTab}
                  visumData={getEffectiveVisumData(draft)}
                  onUpdateVisumData={handleUpdateVisumData}
                />
              ) : docType === 'spd' ? (
                renderSpdFormFieldsContent()
              ) : (
                renderSptFormFieldsContent()
              )}
            </div>

            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2.5">
              {/* Contextual Destructive Button ("Hapus") ONLY on relevant sub-tabs */}
              {docType === 'spt' && formTab === 'header' && onDeleteSpt && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileSheetOpen(false);
                    onDeleteSpt();
                  }}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                  title="Hapus Berkas SPJ ini"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hapus</span>
                </button>
              )}

              {docType === 'spt' && formTab === 'pegawai' && draft.pegawaiList.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    handleRemovePegawaiRow(draft.pegawaiList[draft.pegawaiList.length - 1].id)
                  }
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                  title="Hapus baris pegawai terakhir"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hapus</span>
                </button>
              )}

              {docType === 'spd' && spdTab === 'pengikut' && (
                <button
                  type="button"
                  onClick={handleClearPengikutRows}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                  title="Kosongkan daftar pengikut"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hapus</span>
                </button>
              )}

              {docType === 'spd-belakang' && spdBelakangTab === 'bagian-transit' && (
                <button
                  type="button"
                  onClick={handleClearVisumTransitRows}
                  className="min-h-[42px] px-3.5 py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                  title="Kosongkan baris transit II - V"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Hapus</span>
                </button>
              )}

              {/* Single Primary Action Button ("Simpan Perubahan") */}
              <button
                type="button"
                onClick={() => handleExplicitValidateAndSave()}
                className="flex-1 min-h-[42px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* MOBILE BOTTOM TOOLBAR (<lg) */}
      <div
        role="toolbar"
        aria-label="Alat Editor Dokumen Mobile"
        className="no-print lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-md text-slate-800 border-t border-slate-200 px-2 py-1.5 flex items-center gap-1.5 shadow-lg"
      >
        {docType === 'spd-belakang' ? (
          <div className="grid grid-cols-4 gap-1 flex-1">
            <button
              type="button"
              onClick={() => handleOpenMobileSpdBelakangTool('bagian-1')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdBelakangTab === 'bagian-1'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PlaneTakeoff className="w-4 h-4" />
              <span>Berangkat</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileSpdBelakangTool('bagian-transit')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdBelakangTab === 'bagian-transit'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Route className="w-4 h-4" />
              <span>Transit</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileSpdBelakangTool('bagian-6')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdBelakangTab === 'bagian-6'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Stamp className="w-4 h-4" />
              <span>Pengesahan</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileSpdBelakangTool('bagian-catatan')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdBelakangTab === 'bagian-catatan'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <NotebookPen className="w-4 h-4" />
              <span>Catatan</span>
            </button>
          </div>
        ) : docType === 'spd' ? (
          <div className="grid grid-cols-5 gap-1 flex-1">
            <button
              type="button"
              onClick={() => handleOpenMobileSpdTool('header')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdTab === 'header'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>No/PPTK</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileSpdTool('pelaksana')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdTab === 'pelaksana'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Pelaksana</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileSpdTool('perjalanan')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdTab === 'perjalanan'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Route className="w-4 h-4" />
              <span>Rincian</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileSpdTool('pengikut')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdTab === 'pengikut'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pengikut</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileSpdTool('ttd')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && spdTab === 'ttd'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>TTD</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-1 flex-1">
            <button
              type="button"
              onClick={() => handleOpenMobileTool('header')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && formTab === 'header'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Hash className="w-4 h-4" />
              <span>Kop &amp; No</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileTool('pegawai')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && formTab === 'pegawai'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pegawai ({draft.pegawaiList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileTool('detail')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && formTab === 'detail'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Route className="w-4 h-4" />
              <span>Detail</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenMobileTool('ttd')}
              className={`min-h-[48px] rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-all cursor-pointer ${
                isMobileSheetOpen && formTab === 'ttd'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>TTD</span>
            </button>
          </div>
        )}

        <div className="w-px h-8 bg-slate-200 shrink-0" aria-hidden="true" />

        <button
          type="button"
          onClick={() => window.print()}
          aria-label={
            docType === 'spd-belakang'
              ? 'Cetak SPD Lembar 2 Visum'
              : docType === 'spd'
              ? 'Cetak Surat Perjalanan Dinas'
              : 'Cetak Surat Perintah Tugas'
          }
          className="min-h-[48px] px-3 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>
            {docType === 'spd-belakang'
              ? 'Cetak Visum'
              : docType === 'spd'
              ? 'Cetak SPD'
              : 'Cetak SPT'}
          </span>
        </button>
      </div>
    </div>
  );
};
