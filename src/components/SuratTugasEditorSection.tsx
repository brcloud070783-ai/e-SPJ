import React, { useState, useDeferredValue } from 'react';
import {
  FileCheck,
  FileText,
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
  BadgeCheck,
  PenLine,
  MapPin,
  Wallet,
  Navigation,
  Save,
  FileDown,
  Pencil,
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
  ALLOWED_SPT_FONT_SIZES,
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
import {
  buildCleanPdfTitle,
  triggerIsolatedSpjPrint,
  exportToDirectPdf,
} from '../utils/printPdf';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useSwipeToDismissSheet,
  triggerHaptic,
  MOBILE_TAB_VARIANTS,
} from '../utils/nativeMobile';
import { useSwipeTabs } from '../hooks/useSwipeTabs';

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

  React.useEffect(() => {
    if (activeDocType && activeDocType !== internalDocType) {
      setInternalDocType(activeDocType);
    }
  }, [activeDocType, internalDocType]);
  const [formTab, setFormTab] = useState<SuratTugasEditableZone>('header');
  const [spdTab, setSpdTab] = useState<SpdEditableZone>('header');
  const [spdBelakangTab, setSpdBelakangTab] = useState<SpdBelakangEditableZone>('bagian-1');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
  // Snapshot of SPT when opening the mobile bottom-sheet modal so "X" cancels uncommitted edits
  const modalSnapshotRef = React.useRef<SuratPerintahTugas | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const deferredDraft = useDeferredValue(draft);

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
    triggerHaptic('light');
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

  const { sheetStyle: mobileSheetStyle, handleTouchHandlers: mobileSheetTouchHandlers } =
    useSwipeToDismissSheet({
      onDismiss: handleCancelAndCloseModal,
    });

  const sptSubTabs: SuratTugasEditableZone[] = ['header', 'pegawai', 'detail', 'ttd'];
  const spdSubTabs: SpdEditableZone[] = ['header', 'pelaksana', 'perjalanan', 'pengikut', 'ttd'];
  const spdBelakangSubTabs: SpdBelakangEditableZone[] = [
    'bagian-1',
    'bagian-transit',
    'bagian-6',
    'bagian-catatan',
  ];

  const handleSubTabSwipeLeft = () => {
    if (docType === 'spd-belakang') {
      const idx = spdBelakangSubTabs.indexOf(spdBelakangTab);
      if (idx >= 0 && idx < spdBelakangSubTabs.length - 1) {
        setSpdBelakangTab(spdBelakangSubTabs[idx + 1]);
      }
    } else if (docType === 'spd') {
      const idx = spdSubTabs.indexOf(spdTab);
      if (idx >= 0 && idx < spdSubTabs.length - 1) {
        setSpdTab(spdSubTabs[idx + 1]);
      }
    } else {
      const idx = sptSubTabs.indexOf(formTab);
      if (idx >= 0 && idx < sptSubTabs.length - 1) {
        setFormTab(sptSubTabs[idx + 1]);
      }
    }
  };

  const handleSubTabSwipeRight = () => {
    if (docType === 'spd-belakang') {
      const idx = spdBelakangSubTabs.indexOf(spdBelakangTab);
      if (idx > 0) {
        setSpdBelakangTab(spdBelakangSubTabs[idx - 1]);
      }
    } else if (docType === 'spd') {
      const idx = spdSubTabs.indexOf(spdTab);
      if (idx > 0) {
        setSpdTab(spdSubTabs[idx - 1]);
      }
    } else {
      const idx = sptSubTabs.indexOf(formTab);
      if (idx > 0) {
        setFormTab(sptSubTabs[idx - 1]);
      }
    }
  };

  const formSubTabSwipeHandlers = useSwipeTabs({
    onSwipeLeft: handleSubTabSwipeLeft,
    onSwipeRight: handleSubTabSwipeRight,
    isEnabled: isMobileSheetOpen,
  });

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
      triggerHaptic('error');
      setValidationErrors(errors);
      setSaveBanner(null);
      setFormTab('header');
      return;
    }

    triggerHaptic('success');
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

        {/* SPD SUB-TAB 3: RINCIAN PERJALANAN & ANGGARAN (Row 4, 5, 6, 7, 9, 10) */}
        {(spdTab === 'perjalanan' || spdTab === 'anggaran') && (
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

            <div className="space-y-2 pt-2 border-t border-slate-200">
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

            <div className="space-y-3 pt-2.5 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block">
                9 &amp; 10. Pembebanan Anggaran &amp; Keterangan Lain
              </span>
              <div>
                <label htmlFor="input-spd-instansi" className="block text-[11px] font-medium text-slate-600 mb-1">
                  9.a. Instansi Pembebanan Anggaran
                </label>
                <input
                  id="input-spd-instansi"
                  type="text"
                  value={effectiveInstansi}
                  onChange={(e) => handleUpdateSpdField('instansiAnggaran', e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="input-spd-akun" className="block text-[11px] font-medium text-slate-600 mb-1">
                  9.b. Kode Rekening / Akun Anggaran
                </label>
                <input
                  id="input-spd-akun"
                  type="text"
                  value={effectiveAkun}
                  onChange={(e) => handleUpdateSpdField('akunAnggaran', e.target.value)}
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label htmlFor="input-spd-ket-lain" className="block text-[11px] font-medium text-slate-600 mb-1">
                  10. Keterangan Lain-lain
                </label>
                <textarea
                  id="input-spd-ket-lain"
                  rows={2}
                  placeholder="-"
                  value={currentSpd.keteranganLain ?? ''}
                  onChange={(e) => handleUpdateSpdField('keteranganLain', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* SPD SUB-TAB 4: PENGIKUT (Row 8) */}
        {spdTab === 'pengikut' && (
          <div className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                8. Daftar Pengikut (4 Baris)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClearPengikutRows}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Kosongkan daftar pengikut"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Kosongkan</span>
                </button>
                <button
                  type="button"
                  onClick={handleAutoFillPengikutFromSpt}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors"
                  title="Salin pegawai lain di SPT secara otomatis ke kolom Pengikut"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-700" />
                  <span>+ Isi dari SPT</span>
                </button>
              </div>
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

        {/* SPD SUB-TAB 5: TITIMANGSA & PEJABAT PENANDATANGAN */}
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

            {/* 1. PEJABAT SPT: PENANDATANGAN SPT (KANAN BAWAH DALAM KOTAK) */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-slate-700 text-white text-[10px] flex items-center justify-center font-mono">1</span>
                  <span>Penandatangan SPT (Kanan Bawah Kotak)</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateSpdData({
                      ...currentSpd,
                      pejabatSptJabatan: draft.jabatanPenandatangan,
                      pejabatSptNama: draft.namaPenandatangan,
                      pejabatSptNip: draft.nipPenandatangan,
                      pejabatSptPangkat: draft.pangkatPenandatangan,
                    });
                  }}
                  className="text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                  title="Tarik langsung dari data penandatangan SPT"
                >
                  🔄 Sinkronkan SPT
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Jabatan Penandatangan SPT</label>
                <input
                  type="text"
                  value={currentSpd.pejabatSptJabatan ?? draft.jabatanPenandatangan}
                  onChange={(e) => handleUpdateSpdField('pejabatSptJabatan', e.target.value)}
                  placeholder="Contoh: Plt. Kepala Dinas"
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Nama Lengkap &amp; Gelar</label>
                <input
                  type="text"
                  list="datalist-spt-pegawai"
                  value={currentSpd.pejabatSptNama ?? draft.namaPenandatangan}
                  onChange={(e) => {
                    const val = e.target.value;
                    const activePeg = (daftarPegawai || []).filter((p) => p.statusActive !== false);
                    const found = activePeg.find(
                      (p) => p.nama.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (found) {
                      handleUpdateSpdData({
                        ...currentSpd,
                        pejabatSptNama: found.nama,
                        pejabatSptNip: found.nip,
                        pejabatSptPangkat: found.pangkatGolongan || draft.pangkatPenandatangan,
                      });
                    } else {
                      handleUpdateSpdField('pejabatSptNama', val);
                    }
                  }}
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Pangkat / Golongan</label>
                  <input
                    type="text"
                    value={currentSpd.pejabatSptPangkat ?? draft.pangkatPenandatangan}
                    onChange={(e) => handleUpdateSpdField('pejabatSptPangkat', e.target.value)}
                    className="w-full min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">NIP</label>
                  <input
                    type="text"
                    value={currentSpd.pejabatSptNip ?? draft.nipPenandatangan}
                    onChange={(e) => handleUpdateSpdField('pejabatSptNip', e.target.value)}
                    className="w-full min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* 2. PENGGUNA ANGGARAN (TENGAH BAWAH DOKUMEN) */}
            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/90 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-sky-200/60">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-sky-700 text-white text-[10px] flex items-center justify-center font-mono">2</span>
                  <span>Pengguna Anggaran (Tengah Bawah Dokumen)</span>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateSpdData({
                        ...currentSpd,
                        paJabatan: appSettings.jabatanPenggunaAnggaran || 'Pengguna Anggaran',
                        paNama: appSettings.namaPenggunaAnggaran || 'Hasanuddin, S.Pd, M.Si',
                        paNip: appSettings.nipPenggunaAnggaran || '197405272007011010',
                        paPangkat: 'Pembina Tingkat I, IV/b',
                      });
                    }}
                    className="text-[10px] font-semibold text-sky-800 bg-white hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                    title="Tarik data PA dari Pengaturan Instansi"
                  >
                    Dari Pengaturan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdateSpdData({
                        ...currentSpd,
                        paJabatan: 'Pengguna Anggaran',
                        paNama: draft.namaPenandatangan,
                        paNip: draft.nipPenandatangan,
                        paPangkat: draft.pangkatPenandatangan,
                      });
                    }}
                    className="text-[10px] font-semibold text-sky-800 bg-white hover:bg-sky-100 border border-sky-300 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                    title="Samakan orang dengan penandatangan SPT"
                  >
                    Sama Pejabat SPT
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Jabatan PA / KPA</label>
                <input
                  type="text"
                  value={currentSpd.paJabatan ?? (appSettings.jabatanPenggunaAnggaran || 'Pengguna Anggaran')}
                  onChange={(e) => handleUpdateSpdField('paJabatan', e.target.value)}
                  placeholder="Contoh: Pengguna Anggaran / Kuasa Pengguna Anggaran"
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-0.5">Nama Lengkap &amp; Gelar PA</label>
                <input
                  type="text"
                  list="datalist-spt-pegawai"
                  value={currentSpd.paNama ?? (appSettings.namaPenggunaAnggaran || draft.namaPenandatangan)}
                  onChange={(e) => {
                    const val = e.target.value;
                    const activePeg = (daftarPegawai || []).filter((p) => p.statusActive !== false);
                    const found = activePeg.find(
                      (p) => p.nama.trim().toLowerCase() === val.trim().toLowerCase()
                    );
                    if (found) {
                      handleUpdateSpdData({
                        ...currentSpd,
                        paNama: found.nama,
                        paNip: found.nip,
                        paPangkat: found.pangkatGolongan || 'Pembina Tingkat I, IV/b',
                      });
                    } else {
                      handleUpdateSpdField('paNama', val);
                    }
                  }}
                  placeholder="Nama Pengguna Anggaran..."
                  className="w-full min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Pangkat / Golongan</label>
                  <input
                    type="text"
                    value={currentSpd.paPangkat ?? 'Pembina Tingkat I, IV/b'}
                    onChange={(e) => handleUpdateSpdField('paPangkat', e.target.value)}
                    placeholder="Pembina Tingkat I, IV/b"
                    className="w-full min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">NIP</label>
                  <input
                    type="text"
                    value={currentSpd.paNip ?? (appSettings.nipPenggunaAnggaran || draft.nipPenandatangan)}
                    onChange={(e) => handleUpdateSpdField('paNip', e.target.value)}
                    placeholder="1974..."
                    className="w-full min-h-[34px] rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-mono text-slate-900"
                  />
                </div>
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

          {onDeleteSpt && (
            <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500">
                Ingin menghapus seluruh berkas SPJ ini?
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsMobileSheetOpen(false);
                  onDeleteSpt();
                }}
                className="min-h-[34px] px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-xs font-bold text-red-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Hapus Berkas SPJ ini"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Hapus Berkas SPJ</span>
              </button>
            </div>
          )}
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 block">
              Pejabat Penandatangan Surat Tugas (SPT)
            </span>

            {/* Quick Status Selector: Kepala Dinas, Plt, Plh, Kustom */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Pilih Cepat Status Jabatan:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2">
                {[
                  { label: 'Kepala Dinas', val: 'Kepala Dinas', status: 'definitive' as const },
                  { label: 'Plt. Kepala Dinas', val: 'Plt. Kepala Dinas', status: 'plt' as const },
                  { label: 'Plh. Kepala Dinas', val: 'Plh. Kepala Dinas', status: 'plh' as const },
                  { label: 'Teks Kustom...', val: draft.jabatanPenandatangan || '', status: 'custom' as const },
                ].map((item) => {
                  const currentNorm = (draft.jabatanPenandatangan || '').trim().toLowerCase();
                  const isMatch =
                    item.status === 'definitive'
                      ? currentNorm === 'kepala dinas' || currentNorm.startsWith('kepala dinas')
                      : item.status === 'plt'
                      ? currentNorm.includes('plt')
                      : item.status === 'plh'
                      ? currentNorm.includes('plh')
                      : !currentNorm.includes('plt') &&
                        !currentNorm.includes('plh') &&
                        !currentNorm.startsWith('kepala dinas');

                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        let newJabatan = item.val;
                        if (item.status === 'definitive') {
                          newJabatan = 'Kepala Dinas';
                        } else if (item.status === 'plt') {
                          newJabatan = 'Plt. Kepala Dinas';
                        } else if (item.status === 'plh') {
                          newJabatan = 'Plh. Kepala Dinas';
                        }
                        const next: SuratPerintahTugas = {
                          ...draft,
                          statusJabatan: item.status,
                          jabatanPenandatangan: newJabatan,
                          updatedAt: new Date().toISOString(),
                        };
                        commitOrStageDraft(next);
                      }}
                      className={`min-h-[34px] px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer text-center flex items-center justify-center ${
                        isMatch
                          ? 'bg-sky-700 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="input-spt-jabatan-ttd"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Teks Jabatan Resmi pada Naskah SPT
              </label>
              <input
                id="input-spt-jabatan-ttd"
                type="text"
                placeholder="Contoh: Plt. Kepala Dinas / Kepala Dinas Pendidikan..."
                value={draft.jabatanPenandatangan}
                onChange={(e) => handleFieldChange('jabatanPenandatangan', e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
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
                      namaPenandatangan: found.nama.trim(),
                      nipPenandatangan: found.nip.trim().replace(/^NIP\.?\s*/i, ''),
                      jabatanPenandatangan: (found.jabatan || draft.jabatanPenandatangan).trim(),
                      pangkatPenandatangan: (found.pangkatGolongan || draft.pangkatPenandatangan).trim(),
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
                htmlFor="input-spt-pangkat-ttd"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Pangkat / Golongan Penandatangan
              </label>
              <input
                id="input-spt-pangkat-ttd"
                type="text"
                placeholder="Contoh: Pembina Tingkat I, IV/b"
                value={draft.pangkatPenandatangan}
                onChange={(e) => handleFieldChange('pangkatPenandatangan', e.target.value.trimStart())}
                onBlur={(e) => handleFieldChange('pangkatPenandatangan', e.target.value.trim())}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900"
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
                placeholder="Contoh: 197405272007011010"
                value={draft.nipPenandatangan}
                onChange={(e) => handleFieldChange('nipPenandatangan', e.target.value.trimStart().replace(/^NIP\.?\s*/i, ''))}
                onBlur={(e) => handleFieldChange('nipPenandatangan', e.target.value.trim().replace(/^NIP\.?\s*/i, ''))}
                className="w-full min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono text-slate-900"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Awalan &quot;NIP &quot; akan otomatis dicetak rapi dan sejajar lurus rata kiri dengan Nama dan Pangkat.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                Urutan Baris Tanda Tangan:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFieldChange('urutanTtdPangkatNip', 'pangkat-dulu')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold border text-center transition-colors cursor-pointer ${
                    (draft.urutanTtdPangkatNip ?? 'pangkat-dulu') === 'pangkat-dulu'
                      ? 'bg-sky-50 border-sky-600 text-sky-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Nama → Pangkat → NIP
                </button>
                <button
                  type="button"
                  onClick={() => handleFieldChange('urutanTtdPangkatNip', 'nip-dulu')}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold border text-center transition-colors cursor-pointer ${
                    draft.urutanTtdPangkatNip === 'nip-dulu'
                      ? 'bg-sky-50 border-sky-600 text-sky-900 font-bold'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Nama → NIP → Pangkat
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Ukuran Font SPT (Standar 11.5pt, min. 9.5pt):
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800">
                  {draft.fontSizePt ? `${draft.fontSizePt} pt (Manual)` : 'Auto (Pas 1 Halaman)'}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                <button
                  type="button"
                  onClick={() => handleFieldChange('fontSizePt', undefined)}
                  className={`py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                    draft.fontSizePt === undefined
                      ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                  title="Sesuaikan otomatis agar pas 1 halaman (11.5pt s.d. 9.5pt)"
                >
                  Auto
                </button>
                {[11.5, 11.0, 10.5, 10.0, 9.5].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleFieldChange('fontSizePt', size)}
                    className={`py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                      draft.fontSizePt === size
                        ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {size}pt
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Font standar 11.5pt. Jika halaman melebihi 1 lembar, sistem otomatis mengecilkan bertahap hingga maksimal paling kecil 9.5pt agar pas 1 halaman penuh.
              </p>
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
      {/* Selector Pelaksana SPD (Hanya muncul jika terdapat lebih dari 1 pegawai pada mode SPD/Visum) */}
      {(docType === 'spd' || docType === 'spd-belakang') && draft.pegawaiList.length > 1 && (
        <div className="no-print flex items-center justify-between gap-2 bg-white/95 border border-slate-200/90 px-3 py-1.5 rounded-2xl shadow-2xs max-w-full overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950 shrink-0">
            <User className="w-3.5 h-3.5 text-sky-700 shrink-0" />
            <span>Pilih Pelaksana SPD ({draft.pegawaiList.length} Pegawai):</span>
          </div>
          <select
            aria-label="Pilih Pegawai Pelaksana SPD"
            value={selectedSpdPegawaiId}
            onChange={(e) => handleSelectSpdPegawai(e.target.value)}
            className="min-h-[30px] rounded-lg border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-600 cursor-pointer max-w-full truncate"
          >
            {draft.pegawaiList.map((p, idx) => (
              <option key={p.id} value={p.id}>
                {idx + 1}. {p.nama} ({p.jabatan || 'Pelaksana'})
              </option>
            ))}
          </select>
        </div>
      )}

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
          {/* Unified Native Segmented Control Sub-Tabs (Desktop Inspector) */}
          <div className="p-2.5 bg-slate-100/90 border-b border-slate-200/90">
            {docType === 'spd' ? (
              <div
                role="tablist"
                aria-label="Bagian Form Surat Perjalanan Dinas"
                className="grid grid-cols-5 bg-slate-200/75 p-1 gap-1 rounded-2xl text-center"
              >
                {[
                  { key: 'header', label: 'No & PPTK', icon: FileText },
                  { key: 'pelaksana', label: 'Pelaksana', icon: User },
                  { key: 'perjalanan', label: 'Rincian', icon: MapPin },
                  { key: 'pengikut', label: 'Pengikut', icon: Users },
                  { key: 'ttd', label: 'TTD', icon: PenLine },
                ].map((t) => {
                  const TIcon = t.icon;
                  const normalizedSpdTab = spdTab === 'anggaran' ? 'perjalanan' : spdTab;
                  const isTabActive = normalizedSpdTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={isTabActive}
                      onClick={() => {
                        triggerHaptic('light');
                        setSpdTab(t.key as SpdEditableZone);
                      }}
                      className={`relative h-12 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none overflow-hidden ${
                        isTabActive
                          ? 'text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
                      }`}
                    >
                      {isTabActive && (
                        <motion.span
                          layoutId="desktop-spd-subtab-pill"
                          transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                          className="absolute inset-0 rounded-xl bg-sky-700 shadow-xs z-0"
                        />
                      )}
                      <TIcon
                        className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                          isTabActive ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      <span className="relative z-10 text-[10.5px] leading-none tracking-tight whitespace-nowrap">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : docType === 'spd-belakang' ? (
              <div
                role="tablist"
                aria-label="Bagian Form SPD Lembar 2 (Visum Belakang)"
                className="grid grid-cols-4 bg-slate-200/75 p-1 gap-1 rounded-2xl text-center"
              >
                {[
                  { key: 'bagian-1', label: 'I. Berangkat', icon: Navigation },
                  { key: 'bagian-transit', label: 'II-V. Transit', icon: MapPin },
                  { key: 'bagian-6', label: 'VI. Tiba', icon: BadgeCheck },
                  { key: 'bagian-catatan', label: 'VII. Catatan', icon: FileText },
                ].map((t) => {
                  const TIcon = t.icon;
                  const isTabActive = spdBelakangTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={isTabActive}
                      onClick={() => {
                        triggerHaptic('light');
                        setSpdBelakangTab(t.key as SpdBelakangEditableZone);
                      }}
                      className={`relative h-12 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none overflow-hidden ${
                        isTabActive
                          ? 'text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
                      }`}
                    >
                      {isTabActive && (
                        <motion.span
                          layoutId="desktop-visum-subtab-pill"
                          transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                          className="absolute inset-0 rounded-xl bg-sky-700 shadow-xs z-0"
                        />
                      )}
                      <TIcon
                        className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                          isTabActive ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      <span className="relative z-10 text-[10.5px] leading-none tracking-tight whitespace-nowrap">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                role="tablist"
                aria-label="Bagian Form Surat Perintah Tugas"
                className="grid grid-cols-4 bg-slate-200/75 p-1 gap-1 rounded-2xl text-center"
              >
                {[
                  { key: 'header', label: 'Kop & No', icon: FileText },
                  { key: 'pegawai', label: `Pegawai (${draft.pegawaiList.length})`, icon: Users },
                  { key: 'detail', label: 'Detail', icon: MapPin },
                  { key: 'ttd', label: 'TTD', icon: PenLine },
                ].map((t) => {
                  const TIcon = t.icon;
                  const isTabActive = formTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={isTabActive}
                      onClick={() => {
                        triggerHaptic('light');
                        setFormTab(t.key as SuratTugasEditableZone);
                      }}
                      className={`relative h-12 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none overflow-hidden ${
                        isTabActive
                          ? 'text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 font-semibold'
                      }`}
                    >
                      {isTabActive && (
                        <motion.span
                          layoutId="desktop-spt-subtab-pill"
                          transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                          className="absolute inset-0 rounded-xl bg-sky-700 shadow-xs z-0"
                        />
                      )}
                      <TIcon
                        className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                          isTabActive ? 'text-white' : 'text-slate-500'
                        }`}
                      />
                      <span className="relative z-10 text-[10.5px] leading-none tracking-tight whitespace-nowrap">
                        {t.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5 h-[560px] overflow-y-auto overscroll-contain bg-white">
            <motion.div
              key={
                docType === 'spd-belakang'
                  ? `visum-${spdBelakangTab}`
                  : docType === 'spd'
                    ? `spd-${spdTab}`
                    : `spt-${formTab}`
              }
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            >
              {docType === 'spd-belakang' ? (
                <SuratPerjalananDinasBelakangEditor
                  spt={draft}
                  activeZone={spdBelakangTab}
                  onSelectZone={setSpdBelakangTab}
                  visumData={getEffectiveVisumData(draft)}
                  onUpdateVisumData={handleUpdateVisumData}
                  hideInternalTabs={true}
                />
              ) : docType === 'spd' ? (
                renderSpdFormFieldsContent()
              ) : (
                renderSptFormFieldsContent()
              )}
            </motion.div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={onCreateNewSpt}
              className="min-h-[40px] px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Data Baru</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isExportingPdf}
                onClick={async () => {
                  setIsExportingPdf(true);
                  try {
                    const prefix =
                      docType === 'spd-belakang'
                        ? 'SPD_Visum_Belakang'
                        : docType === 'spd'
                        ? 'SPD_Depan'
                        : 'Surat_Perintah_Tugas';
                    await exportToDirectPdf({
                      paperSize,
                      documentTitle: buildCleanPdfTitle({
                        prefix,
                        atasNama: activeSpdPelaksana.nama,
                        noSpt: draft.noSpt,
                        paperSize,
                      }),
                      sheetSelector: '.print-only-sheet',
                    });
                  } catch (err: any) {
                    alert(err?.message || 'Gagal mengekspor PDF');
                  } finally {
                    setIsExportingPdf(false);
                  }
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExportingPdf ? 'Memproses PDF...' : 'Ekspor PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const prefix =
                    docType === 'spd-belakang'
                      ? 'SPD_Visum_Belakang'
                      : docType === 'spd'
                      ? 'SPD_Depan'
                      : 'Surat_Perintah_Tugas';
                  void triggerIsolatedSpjPrint({
                    paperSize,
                    documentTitle: buildCleanPdfTitle({
                      prefix,
                      atasNama: activeSpdPelaksana.nama,
                      noSpt: draft.noSpt,
                      paperSize,
                    }),
                    sheetSelector: '.print-only-sheet',
                    zeroPageMargin: docType === 'spd-belakang',
                  });
                }}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {docType === 'spd-belakang'
                    ? `Cetak Visum (${paperSize})`
                    : docType === 'spd'
                    ? `Cetak SPD (${paperSize})`
                    : `Cetak SPT (${paperSize})`}
                </span>
              </button>

              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
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
                spt={deferredDraft}
                paperSize={paperSize}
                activeZone={spdBelakangTab}
                onSelectZone={handleSelectSpdBelakangZoneFromCanvas}
                visumData={getEffectiveVisumData(deferredDraft)}
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
                spt={deferredDraft}
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
              extraControls={
                <label className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 rounded-full px-2 h-6 text-[11px] font-bold text-slate-700 cursor-pointer">
                  <span className="text-slate-500">Font:</span>
                  <select
                    aria-label="Ukuran Font SPT"
                    value={draft.fontSizePt ?? 'auto'}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleFieldChange('fontSizePt', val === 'auto' ? undefined : Number(val));
                    }}
                    className="bg-transparent font-bold text-sky-800 focus:outline-none cursor-pointer"
                  >
                    <option value="auto">Auto (1 Hal)</option>
                    {ALLOWED_SPT_FONT_SIZES.map((size) => (
                      <option key={size} value={size}>
                        {size} pt
                      </option>
                    ))}
                  </select>
                </label>
              }
            >
              <SuratTugasDocumentPreview
                spt={deferredDraft}
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

      {/* MOBILE SLIDE-UP BOTTOM SHEET (<lg) — Uniform Fixed Height & Native Segmented Tabs */}
      {isMobileSheetOpen && (
        <>
          <div
            className="no-print lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[3px] animate-in fade-in duration-150"
            onClick={handleCancelAndCloseModal}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            style={mobileSheetStyle}
            aria-label={
              docType === 'spd-belakang'
                ? 'Editor SPD Lembar 2 (Visum Belakang)'
                : docType === 'spd'
                ? 'Editor Surat Perjalanan Dinas (SPD)'
                : 'Editor Surat Perintah Tugas (SPT)'
            }
            className="no-print lg:hidden fixed inset-x-0 bottom-0 z-50 bg-white/98 backdrop-blur-xl rounded-t-3xl shadow-[0_-14px_40px_rgba(15,23,42,0.22)] border-t border-slate-200/90 h-[82dvh] max-h-[82dvh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
          >
            {/* Drag Handle & Sheet Header */}
            <div
              {...mobileSheetTouchHandlers}
              className="pt-2.5 pb-2 px-4 border-b border-slate-200/80 flex flex-col gap-1.5 shrink-0 bg-slate-50/95 rounded-t-3xl cursor-grab active:cursor-grabbing touch-none select-none"
            >
              <div className="w-11 h-1.5 rounded-full bg-slate-300/90 mx-auto" />
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs font-extrabold text-slate-900 truncate block">
                    {docType === 'spd-belakang'
                      ? 'Editor SPD Lembar 2 (Visum Belakang)'
                      : docType === 'spd'
                      ? 'Editor Surat Perjalanan Dinas (SPD)'
                      : 'Editor Surat Perintah Tugas (SPT)'}
                  </span>
                  <span className="text-[10.5px] text-slate-500 block truncate">
                    Tarik ke bawah untuk menutup • Pindah tab menyimpan draf sementara
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelAndCloseModal}
                  aria-label="Batal / Tutup tanpa menyimpan"
                  title="Batal / Tutup tanpa menyimpan"
                  className="w-8 h-8 rounded-full bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-900 flex items-center justify-center cursor-pointer shrink-0 transition-transform active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Unified Native Segmented Control Sub-Tab Bar (100% Equal Height & Width) with Swipe Support */}
            <div
              {...formSubTabSwipeHandlers}
              className="px-3 py-2 border-b border-slate-200/80 bg-slate-100/90 shrink-0 relative z-10"
            >
              {docType === 'spd-belakang' ? (
                <div
                  role="tablist"
                  aria-label="Bagian Form SPD Lembar 2"
                  className="grid grid-cols-4 gap-1 p-1 bg-slate-200/75 rounded-2xl text-center"
                >
                  {[
                    { key: 'bagian-1', label: 'I. Berangkat', icon: Navigation },
                    { key: 'bagian-transit', label: 'II-V. Transit', icon: MapPin },
                    { key: 'bagian-6', label: 'VI. Tiba', icon: BadgeCheck },
                    { key: 'bagian-catatan', label: 'VII. Catatan', icon: FileText },
                  ].map((t) => {
                    const TIcon = t.icon;
                    const isTabActive = spdBelakangTab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={isTabActive}
                        onClick={() => {
                          triggerHaptic('light');
                          setSpdBelakangTab(t.key as SpdBelakangEditableZone);
                        }}
                        className={`relative h-12 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none overflow-hidden ${
                          isTabActive
                            ? 'text-white font-bold'
                            : 'text-slate-600 hover:text-slate-900 font-semibold'
                        }`}
                      >
                        {isTabActive && (
                          <motion.span
                            layoutId="mobile-visum-subtab-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                            className="absolute inset-0 rounded-xl bg-sky-700 shadow-xs z-0"
                          />
                        )}
                        <TIcon
                          className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                            isTabActive ? 'text-white' : 'text-slate-500'
                          }`}
                        />
                        <span className="relative z-10 text-[10.5px] leading-none tracking-tight whitespace-nowrap">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : docType === 'spd' ? (
                <div
                  role="tablist"
                  aria-label="Bagian Form Surat Perjalanan Dinas"
                  className="grid grid-cols-5 gap-1 p-1 bg-slate-200/75 rounded-2xl text-center"
                >
                  {[
                    { key: 'header', label: 'No & PPTK', icon: FileText },
                    { key: 'pelaksana', label: 'Pelaksana', icon: User },
                    { key: 'perjalanan', label: 'Rincian', icon: MapPin },
                    { key: 'pengikut', label: 'Pengikut', icon: Users },
                    { key: 'ttd', label: 'TTD', icon: PenLine },
                  ].map((t) => {
                    const TIcon = t.icon;
                    const normalizedSpdTab = spdTab === 'anggaran' ? 'perjalanan' : spdTab;
                    const isTabActive = normalizedSpdTab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={isTabActive}
                        onClick={() => {
                          triggerHaptic('light');
                          setSpdTab(t.key as SpdEditableZone);
                        }}
                        className={`relative h-12 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none overflow-hidden ${
                          isTabActive
                            ? 'text-white font-bold'
                            : 'text-slate-600 hover:text-slate-900 font-semibold'
                        }`}
                      >
                        {isTabActive && (
                          <motion.span
                            layoutId="mobile-spd-subtab-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                            className="absolute inset-0 rounded-xl bg-sky-700 shadow-xs z-0"
                          />
                        )}
                        <TIcon
                          className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                            isTabActive ? 'text-white' : 'text-slate-500'
                          }`}
                        />
                        <span className="relative z-10 text-[10.5px] leading-none tracking-tight whitespace-nowrap">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div
                  role="tablist"
                  aria-label="Bagian Form Surat Perintah Tugas"
                  className="grid grid-cols-4 gap-1 p-1 bg-slate-200/75 rounded-2xl text-center"
                >
                  {[
                    { key: 'header', label: 'Kop & No', icon: FileText },
                    { key: 'pegawai', label: `Pegawai (${draft.pegawaiList.length})`, icon: Users },
                    { key: 'detail', label: 'Detail', icon: MapPin },
                    { key: 'ttd', label: 'TTD', icon: PenLine },
                  ].map((t) => {
                    const TIcon = t.icon;
                    const isTabActive = formTab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={isTabActive}
                        onClick={() => {
                          triggerHaptic('light');
                          setFormTab(t.key as SuratTugasEditableZone);
                        }}
                        className={`relative h-12 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer select-none overflow-hidden ${
                          isTabActive
                            ? 'text-white font-bold'
                            : 'text-slate-600 hover:text-slate-900 font-semibold'
                        }`}
                      >
                        {isTabActive && (
                          <motion.span
                            layoutId="mobile-spt-subtab-pill"
                            transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                            className="absolute inset-0 rounded-xl bg-sky-700 shadow-xs z-0"
                          />
                        )}
                        <TIcon
                          className={`relative z-10 w-3.5 h-3.5 shrink-0 ${
                            isTabActive ? 'text-white' : 'text-slate-500'
                          }`}
                        />
                        <span className="relative z-10 text-[10.5px] leading-none tracking-tight whitespace-nowrap">
                          {t.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scrollable Sheet Content (Constant height container with Swipe Support) */}
            <div
              {...formSubTabSwipeHandlers}
              className="p-4 overflow-y-auto overscroll-contain no-scrollbar flex-1 min-h-0 bg-white"
            >
              <motion.div
                key={
                  docType === 'spd-belakang'
                    ? `mob-visum-${spdBelakangTab}`
                    : docType === 'spd'
                      ? `mob-spd-${spdTab}`
                      : `mob-spt-${formTab}`
                }
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              >
                {docType === 'spd-belakang' ? (
                  <SuratPerjalananDinasBelakangEditor
                    spt={draft}
                    activeZone={spdBelakangTab}
                    onSelectZone={setSpdBelakangTab}
                    visumData={getEffectiveVisumData(draft)}
                    onUpdateVisumData={handleUpdateVisumData}
                    hideInternalTabs={true}
                  />
                ) : docType === 'spd' ? (
                  renderSpdFormFieldsContent()
                ) : (
                  renderSptFormFieldsContent()
                )}
              </motion.div>
            </div>

            {/* Consistent Pinned Footer Across All Sub-Tabs */}
            <div className="px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-slate-50/95 border-t border-slate-200/90 flex items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleCancelAndCloseModal}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold text-slate-700 inline-flex items-center justify-center cursor-pointer shrink-0 transition-colors"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => handleExplicitValidateAndSave()}
                className="flex-1 min-h-[44px] px-5 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              >
                <Save className="w-4 h-4 shrink-0" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* MOBILE CONTEXTUAL ACTION TOOLBAR (<lg) — Ringkas & Hemat Ruang Kerja */}
      <div
        role="toolbar"
        aria-label="Alat Aksi Dokumen Mobile"
        className="no-print lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md text-slate-800 border-t border-slate-200/90 px-2.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-between gap-1.5 shadow-md"
      >
        {/* 1. Tombol Aksi Utama: Ubah Data (Buka Form Editor) */}
        <button
          type="button"
          onClick={() => setIsMobileSheetOpen((prev) => !prev)}
          aria-expanded={isMobileSheetOpen}
          aria-label="Buka formulir editor data"
          className={`h-9 flex-1 px-3 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
            isMobileSheetOpen
              ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-2xs'
              : 'bg-slate-50 border-slate-300 text-slate-800 hover:bg-slate-100'
          }`}
        >
          <Pencil className="w-3.5 h-3.5 text-sky-700 shrink-0" />
          <span>{isMobileSheetOpen ? 'Tutup Formulir' : 'Ubah Formulir'}</span>
        </button>

        {/* 2. Aksi Dokumen: Ekspor PDF */}
        <button
          type="button"
          disabled={isExportingPdf}
          onClick={async () => {
            setIsExportingPdf(true);
            try {
              const prefix =
                docType === 'spd-belakang'
                  ? 'SPD_Visum_Belakang'
                  : docType === 'spd'
                  ? 'SPD_Depan'
                  : 'Surat_Perintah_Tugas';
              await exportToDirectPdf({
                paperSize,
                documentTitle: buildCleanPdfTitle({
                  prefix,
                  atasNama: activeSpdPelaksana.nama,
                  noSpt: draft.noSpt,
                  paperSize,
                }),
                sheetSelector: '.print-only-sheet',
              });
            } catch (err: any) {
              alert(err?.message || 'Gagal mengekspor PDF');
            } finally {
              setIsExportingPdf(false);
            }
          }}
          className="h-9 px-3.5 rounded-lg flex items-center justify-center gap-1 text-xs font-bold bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
        >
          <FileDown className="w-3.5 h-3.5" />
          <span>{isExportingPdf ? '...' : 'PDF'}</span>
        </button>

        {/* 3. Aksi Dokumen: Cetak */}
        <button
          type="button"
          onClick={() => {
            const prefix =
              docType === 'spd-belakang'
                ? 'SPD_Visum_Belakang'
                : docType === 'spd'
                ? 'SPD_Depan'
                : 'Surat_Perintah_Tugas';
            void triggerIsolatedSpjPrint({
              paperSize,
              documentTitle: buildCleanPdfTitle({
                prefix,
                atasNama: activeSpdPelaksana.nama,
                noSpt: draft.noSpt,
                paperSize,
              }),
              sheetSelector: '.print-only-sheet',
              zeroPageMargin: docType === 'spd-belakang',
            });
          }}
          aria-label={
            docType === 'spd-belakang'
              ? 'Cetak SPD Lembar 2 Visum'
              : docType === 'spd'
              ? 'Cetak Surat Perjalanan Dinas'
              : 'Cetak Surat Perintah Tugas'
          }
          className="h-9 px-3.5 rounded-lg flex items-center justify-center gap-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors shrink-0 cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Cetak</span>
        </button>
      </div>
    </div>
  );
};
