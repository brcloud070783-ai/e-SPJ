/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Camera,
  Receipt,
  Cloud,
  ArrowLeft,
  ChevronDown,
  Plus,
  CheckCircle2,
  ChevronRight,
  Copy,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  KuitansiPerjalananDinas,
  DokumentasiPerjalananItem,
  DokumentasiPengeluaranItem,
  CustomFieldDefinition,
  LampiranDokumenItem,
  WorkspaceConfig,
  PaperSize,
  AppSettings,
  PegawaiItem,
  SuratPerintahTugas,
} from './types/spj';
import {
  INITIAL_KUITANSI_LIST,
  INITIAL_DOKUMENTASI_PERJALANAN,
  INITIAL_DOKUMENTASI_PENGELUARAN,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_APP_SETTINGS,
  INITIAL_DAFTAR_PEGAWAI,
  INITIAL_SURAT_TUGAS_LIST,
} from './data/seedData';
import {
  applySettingsToKuitansi,
  calculateKuitansiTotal,
  formatRupiah,
  extractSubKegiatanFromSpt,
} from './utils/spjCalculations';
import {
  initAuth,
  googleSignIn,
  logout,
  provisionWorkspaceStorage,
  connectExistingSpreadsheet,
  listUserSpreadsheetsInDrive,
  uploadFileToDriveFolder,
  deleteFileFromDrive,
  syncAllRecordsToSheets,
} from './services/googleWorkspace';
import { MainHomeSection } from './components/MainHomeSection';
import {
  SpjPerjalananSubHome,
  SpjSubSectionKey,
} from './components/SpjPerjalananSubHome';
import { SettingsSection } from './components/SettingsSection';
import { KuitansiEditorSection } from './components/KuitansiEditorSection';
import { SuratTugasEditorSection } from './components/SuratTugasEditorSection';
import { DokumentasiPerjalananSection } from './components/DokumentasiPerjalananSection';
import { DokumentasiPengeluaranSection } from './components/DokumentasiPengeluaranSection';
import { WorkspaceSyncModal } from './components/WorkspaceSyncModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

type MainMenuKey = 'home' | 'perjalanan-dinas' | 'settings';
type SpjViewKey = 'sub-home' | SpjSubSectionKey;

const STORAGE_KEYS = {
  KUITANSI: 'espj_kaltara_kuitansi_v2',
  DOK_PERJALANAN: 'espj_kaltara_dok_perjalanan_v2',
  DOK_PENGELUARAN: 'espj_kaltara_dok_pengeluaran_v2',
  CUSTOM_FIELDS: 'espj_kaltara_custom_fields_v2',
  WORKSPACE_CFG: 'espj_kaltara_workspace_cfg_v2',
  PAPER_SIZE: 'espj_kaltara_paper_size_v2',
  APP_SETTINGS: 'espj_kaltara_app_settings_v2',
  DAFTAR_PEGAWAI: 'espj_kaltara_daftar_pegawai_v2',
  SURAT_TUGAS: 'espj_kaltara_surat_tugas_v2',
};

export default function App() {
  const [mainMenu, setMainMenu] = useState<MainMenuKey>('home');
  const [spjView, setSpjView] = useState<SpjViewKey>('sub-home');
  const [isSpjSwitcherOpen, setIsSpjSwitcherOpen] = useState<boolean>(false);

  const [appSettings, setAppSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...INITIAL_APP_SETTINGS, ...parsed };
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_APP_SETTINGS;
  });

  const [paperSize, setPaperSize] = useState<PaperSize>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PAPER_SIZE);
      if (saved === 'A4' || saved === 'F4') return saved;
    } catch {
      // ignore
    }
    return 'A4';
  });

  const [daftarPegawai, setDaftarPegawai] = useState<PegawaiItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DAFTAR_PEGAWAI);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return appSettings.daftarPegawai ?? INITIAL_DAFTAR_PEGAWAI;
  });

  const [sptList, setSptList] = useState<SuratPerintahTugas[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SURAT_TUGAS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_SURAT_TUGAS_LIST;
  });

  const [activeSptId, setActiveSptId] = useState<string>(
    () => sptList[0]?.id || 'spt-2026-001'
  );

  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_FIELDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_CUSTOM_FIELDS;
  });

  const [kuitansiList, setKuitansiList] = useState<KuitansiPerjalananDinas[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.KUITANSI);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_KUITANSI_LIST;
  });

  const [activeKuitansiId, setActiveKuitansiId] = useState<string>(
    () => kuitansiList[0]?.id || 'kui-2026-001'
  );

  const [dokumentasiPerjalanan, setDokumentasiPerjalanan] = useState<
    DokumentasiPerjalananItem[]
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOK_PERJALANAN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_DOKUMENTASI_PERJALANAN;
  });

  const [dokumentasiPengeluaran, setDokumentasiPengeluaran] = useState<
    DokumentasiPengeluaranItem[]
  >(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DOK_PENGELUARAN);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return INITIAL_DOKUMENTASI_PENGELUARAN;
  });

  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfig | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WORKSPACE_CFG);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Google Auth State (Access token is cached in memory inside googleWorkspace.ts)
  const [user, setUser] = useState<User | null>(null);
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // SPJ Deletion & Action Toast state
  const [kuitansiToDelete, setKuitansiToDelete] = useState<KuitansiPerjalananDinas | null>(null);
  const [actionToast, setActionToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setActionToast({ message, type });
    setTimeout(() => {
      setActionToast((curr) => (curr?.message === message ? null : curr));
    }, 3500);
  };

  const autoSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setHasValidToken(true);
      },
      () => {
        setUser(null);
        setHasValidToken(false);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_FIELDS, JSON.stringify(customFields));
    } catch {
      // ignore
    }
  }, [customFields]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.KUITANSI, JSON.stringify(kuitansiList));
    } catch {
      // ignore
    }
  }, [kuitansiList]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.DOK_PERJALANAN,
        JSON.stringify(dokumentasiPerjalanan)
      );
    } catch {
      // ignore
    }
  }, [dokumentasiPerjalanan]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.DOK_PENGELUARAN,
        JSON.stringify(dokumentasiPengeluaran)
      );
    } catch {
      // ignore
    }
  }, [dokumentasiPengeluaran]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.DAFTAR_PEGAWAI,
        JSON.stringify(daftarPegawai)
      );
    } catch {
      // ignore
    }
  }, [daftarPegawai]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEYS.SURAT_TUGAS,
        JSON.stringify(sptList)
      );
    } catch {
      // ignore
    }
  }, [sptList]);

  useEffect(() => {
    try {
      if (workspaceConfig) {
        localStorage.setItem(STORAGE_KEYS.WORKSPACE_CFG, JSON.stringify(workspaceConfig));
      }
    } catch {
      // ignore
    }
  }, [workspaceConfig]);

  // Automatic Background Sync to Google Sheets when data or custom fields change
  useEffect(() => {
    if (
      !hasValidToken ||
      !workspaceConfig?.spreadsheetId ||
      !workspaceConfig.autoSyncEnabled
    ) {
      return;
    }

    if (autoSyncTimerRef.current) {
      window.clearTimeout(autoSyncTimerRef.current);
    }

    autoSyncTimerRef.current = window.setTimeout(async () => {
      try {
        await syncAllRecordsToSheets({
          spreadsheetId: workspaceConfig.spreadsheetId,
          kuitansiList,
          dokumentasiPerjalanan,
          dokumentasiPengeluaran,
          customFields,
        });
        setWorkspaceConfig((prev) =>
          prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : prev
        );
      } catch (err) {
        console.error('Auto-sync ke Google Sheets tertunda:', err);
      }
    }, 1200);

    return () => {
      if (autoSyncTimerRef.current) {
        window.clearTimeout(autoSyncTimerRef.current);
      }
    };
  }, [
    kuitansiList,
    dokumentasiPerjalanan,
    dokumentasiPengeluaran,
    customFields,
    hasValidToken,
    workspaceConfig?.spreadsheetId,
    workspaceConfig?.autoSyncEnabled,
  ]);

  const activeKuitansi =
    kuitansiList.find((k) => k.id === activeKuitansiId) || kuitansiList[0];

  const handleSaveKuitansi = (updated: KuitansiPerjalananDinas) => {
    const syncStatus: KuitansiPerjalananDinas['statusSync'] =
      hasValidToken && workspaceConfig?.spreadsheetId && workspaceConfig.autoSyncEnabled
        ? 'Tersinkronisasi Sheets'
        : 'Tersimpan Lokal';

    setKuitansiList((prev) =>
      prev.map((item) =>
        item.id === updated.id ? { ...updated, statusSync: syncStatus } : item
      )
    );
  };

  const handleSaveSettings = (
    nextSettings: AppSettings,
    applyToExistingKuitansi: boolean
  ) => {
    setAppSettings(nextSettings);
    try {
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(nextSettings));
    } catch {
      // ignore
    }

    if (applyToExistingKuitansi) {
      setKuitansiList((prev) =>
        prev.map((item) => ({
          ...applySettingsToKuitansi(item, nextSettings),
          updatedAt: new Date().toISOString(),
        }))
      );
    }
  };

  const handleUpdateDaftarPegawai = (nextList: PegawaiItem[]) => {
    setDaftarPegawai(nextList);
    try {
      localStorage.setItem(STORAGE_KEYS.DAFTAR_PEGAWAI, JSON.stringify(nextList));
    } catch {
      // ignore
    }
  };

  const handleSaveSpt = (updated: SuratPerintahTugas) => {
    setSptList((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
    const syncedSubKegiatan = extractSubKegiatanFromSpt(updated);
    if (syncedSubKegiatan) {
      setKuitansiList((prev) =>
        prev.map((item) => {
          const isLinked =
            item.id === updated.kuitansiId ||
            (item.noSpt &&
              updated.noSpt &&
              item.noSpt.trim().toLowerCase() === updated.noSpt.trim().toLowerCase()) ||
            item.id === activeKuitansiId;
          if (!isLinked) return item;
          return {
            ...item,
            subKegiatan: syncedSubKegiatan,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    }
  };

  const handleCreateNewSpt = () => {
    const nextSeq = sptList.length + 1;
    const newSpt: SuratPerintahTugas = {
      id: `spt-2026-00${nextSeq}-${Date.now().toString().slice(-3)}`,
      noSpt: `800.1.11.1/ 1${1898 + nextSeq}/SPT/Disdikbud/KU/X/${appSettings.tahunAnggaranDefault || '2026'}`,
      dasarList: [
        'Peraturan Gubernur Kalimantan Utara Nomor 41 Tahun 2022 Tentang Perubahan Atas Peraturan Gubernur Nomor 25 Tahun 2019, tentang Pedoman Pelaksanaan Perjalanan Dinas;',
        'Telaah Staf Pejabat Pelaksana Teknis Kegiatan perihal pelaksanaan tugas perjalanan dinas lapangan;',
      ],
      pegawaiList: [
        {
          id: `st-p-${Date.now()}-1`,
          nama: activeKuitansi.atasNama || appSettings.namaPelaksanaDefault || 'Bayu Ramadhan',
          pangkatGol: 'Penata, III/c',
          nip: activeKuitansi.nipPenerima || appSettings.nipPelaksanaDefault || '198307072015031002',
          jabatan: 'Analis Perencanaan & Anggaran',
        },
      ],
      maksudPerjalanan: activeKuitansi.untukPengeluaran || 'Monitoring dan Peninjauan Lokasi Rencana Kegiatan Pelayanan Pendidikan;',
      tempatBerangkat: `${appSettings.kotaTtdDefault || 'Tanjung Selor'};`,
      tempatTujuan: `${activeKuitansi.tujuan || 'Kota Tarakan'};`,
      tanggalBerangkat: 'Kamis, 15 Oktober 2026;',
      tanggalHarusKembali: 'Sabtu, 17 Oktober 2026;',
      lamanyaPerjalanan: '3 (tiga) hari;',
      pembebananAnggaran: activeKuitansi.subKegiatan || 'DPA Dinas Pendidikan dan Kebudayaan Provinsi Kalimantan Utara TA 2026',
      tempatDitetapkan: appSettings.kotaTtdDefault || 'Tanjung Selor',
      tanggalDitetapkan: '15 Oktober 2026',
      jabatanPenandatangan: appSettings.jabatanPenggunaAnggaran || 'Plt. Kepala Dinas',
      namaPenandatangan: appSettings.namaPenggunaAnggaran || 'Hasanuddin, S.Pd., M.Si.',
      nipPenandatangan: appSettings.nipPenggunaAnggaran || '197405272007011010',
      pangkatPenandatangan: 'Pembina Tingkat I, IV/b',
      updatedAt: new Date().toISOString(),
    };

    setSptList((prev) => [newSpt, ...prev]);
    setActiveSptId(newSpt.id);
    setMainMenu('perjalanan-dinas');
    setSpjView('surat-tugas');
    showToast(`Surat Perintah Tugas #${nextSeq} berhasil dibuat!`);
  };

  const handleCreateNewKuitansi = () => {
    const nextNumber = kuitansiList.length + 1;
    const currentSpt =
      sptList.find((s) => s.id === activeSptId) || sptList[0];
    const sptSubKeg = extractSubKegiatanFromSpt(currentSpt);
    const newKuitansi: KuitansiPerjalananDinas = {
      ...applySettingsToKuitansi(activeKuitansi, appSettings),
      id: `kui-2026-00${nextNumber}-${Date.now().toString().slice(-3)}`,
      tahunAnggaran: appSettings.tahunAnggaranDefault || activeKuitansi.tahunAnggaran,
      subKegiatan:
        sptSubKeg ||
        appSettings.subKegiatanDefault ||
        activeKuitansi.subKegiatan ||
        '',
      sudahTerimaDari:
        appSettings.sudahTerimaDariDefault || activeKuitansi.sudahTerimaDari,
      noKuitansi: '',
      atasNama: '',
      nipPenerima: '',
      tujuan: 'Tanjung Selor - Tarakan (PP)',
      tanggalPerjalanan: '10 s.d 12 April 2026',
      tempatTanggalTtd: `${appSettings.kotaTtdDefault || 'Tanjung Selor'}, 12 April 2026`,
      noSpt: `094/${40 + nextNumber}/SPT/UM-Set/DD/IV/${appSettings.tahunAnggaranDefault || '2026'}`,
      customFieldValues: {},
      lampiranDokumen: [],
      statusSync:
        hasValidToken && workspaceConfig?.spreadsheetId && workspaceConfig.autoSyncEnabled
          ? 'Tersinkronisasi Sheets'
          : 'Tersimpan Lokal',
      updatedAt: new Date().toISOString(),
    };
    setKuitansiList((prev) => [newKuitansi, ...prev]);
    setActiveKuitansiId(newKuitansi.id);
    setMainMenu('perjalanan-dinas');
    setSpjView('kuitansi');
    showToast(`SPJ #${nextNumber} berhasil dibuat!`);
  };

  const handleDuplicateActiveKuitansi = () => {
    const nextNumber = kuitansiList.length + 1;
    const paddedSeq = String(nextNumber).padStart(3, '0');
    const nowSuffix = Date.now().toString().slice(-3);

    const clonedRincian = activeKuitansi.rincian.map((item, idx) => ({
      ...item,
      id: `rinc-dup-${nowSuffix}-${idx + 1}`,
    }));

    const clonedCustomValues = activeKuitansi.customFieldValues
      ? { ...activeKuitansi.customFieldValues }
      : {};

    const duplicatedKuitansi: KuitansiPerjalananDinas = {
      ...activeKuitansi,
      id: `kui-dup-${paddedSeq}-${nowSuffix}`,
      noKuitansi: '',
      rincian: clonedRincian,
      customFieldValues: clonedCustomValues,
      lampiranDokumen: [],
      statusSync:
        hasValidToken && workspaceConfig?.spreadsheetId && workspaceConfig.autoSyncEnabled
          ? 'Tersinkronisasi Sheets'
          : 'Tersimpan Lokal',
      updatedAt: new Date().toISOString(),
    };

    setKuitansiList((prev) => [duplicatedKuitansi, ...prev]);
    setActiveKuitansiId(duplicatedKuitansi.id);
    setIsSpjSwitcherOpen(false);
    setMainMenu('perjalanan-dinas');
    setSpjView('kuitansi');
  };

  const promptDeleteKuitansi = (target: KuitansiPerjalananDinas) => {
    setKuitansiToDelete(target);
  };

  const handleConfirmDeleteKuitansi = () => {
    if (!kuitansiToDelete) return;
    const targetId = kuitansiToDelete.id;
    const targetLabel = kuitansiToDelete.atasNama || kuitansiToDelete.noSpt || 'SPJ';

    // 1. Hapus berkas dari kuitansiList
    const remaining = kuitansiList.filter((k) => k.id !== targetId);

    // 2. Cascade delete: bersihkan dokumentasi perjalanan & pengeluaran yang terikat pada SPJ ini
    setDokumentasiPerjalanan((prev) => prev.filter((d) => d.kuitansiId !== targetId));
    setDokumentasiPengeluaran((prev) => prev.filter((e) => e.kuitansiId !== targetId));

    // 3. Fallback jika seluruh SPJ terhapus: sediakan SPJ draft baru agar aplikasi selalu stabil
    if (remaining.length === 0) {
      const freshBlank: KuitansiPerjalananDinas = {
        ...applySettingsToKuitansi(INITIAL_KUITANSI_LIST[0], appSettings),
        id: `kui-2026-001-${Date.now().toString().slice(-4)}`,
        noKuitansi: `001/KUI-SPPD/DISDIKBUD/IV/${appSettings.tahunAnggaranDefault || '2026'}`,
        atasNama: '',
        nipPenerima: '',
        subKegiatan: '',
        tujuan: 'Tanjung Selor - Tarakan (PP)',
        tanggalPerjalanan: '10 s.d 12 April 2026',
        tempatTanggalTtd: `${appSettings.kotaTtdDefault || 'Tanjung Selor'}, 12 April 2026`,
        noSpt: `094/41/SPT/UM-Set/DD/IV/2026`,
        lampiranDokumen: [],
        statusSync: 'Tersimpan Lokal',
        updatedAt: new Date().toISOString(),
      };
      setKuitansiList([freshBlank]);
      setActiveKuitansiId(freshBlank.id);
    } else {
      setKuitansiList(remaining);
      if (activeKuitansiId === targetId) {
        setActiveKuitansiId(remaining[0].id);
      }
    }

    setKuitansiToDelete(null);
    showToast(`Berkas SPJ (${targetLabel}) berhasil dihapus.`);
  };

  const handleAddCustomField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => [...prev, field]);
  };

  const handleUpdateCustomField = (updated: CustomFieldDefinition) => {
    setCustomFields((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item))
    );
  };

  const handleRemoveCustomField = (fieldId: string) => {
    setCustomFields((prev) => prev.filter((item) => item.id !== fieldId));
  };

  const handleUploadLampiranToDrive = async (
    kuitansiId: string,
    lampiran: LampiranDokumenItem
  ) => {
    let finalLampiran = lampiran;
    if (hasValidToken && workspaceConfig?.docKegiatanFolderId) {
      setIsUploading(true);
      try {
        const uploaded = await uploadFileToDriveFolder({
          dataUrl: lampiran.dataUrl,
          fileName: lampiran.namaFile,
          mimeType: lampiran.mimeType,
          folderId: workspaceConfig.docKegiatanFolderId,
          description: `Dokumen Pendukung SPJ (${lampiran.jenisDokumen}): ${lampiran.namaDokumen} — SPT ${lampiran.noSpt}`,
        });
        finalLampiran = {
          ...lampiran,
          driveFileId: uploaded.id,
          driveWebViewLink: uploaded.webViewLink,
          statusSync: 'Tersimpan di Drive & Sheets',
        };
      } catch (err) {
        console.error('Unggah lampiran ke Drive gagal, disimpan lokal:', err);
      } finally {
        setIsUploading(false);
      }
    }

    setKuitansiList((prev) =>
      prev.map((k) => {
        if (k.id !== kuitansiId) return k;
        const existing = k.lampiranDokumen || [];
        return {
          ...k,
          lampiranDokumen: [finalLampiran, ...existing],
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleDeleteLampiran = async (
    kuitansiId: string,
    lampiran: LampiranDokumenItem
  ) => {
    if (lampiran.driveFileId && hasValidToken) {
      try {
        await deleteFileFromDrive(lampiran.driveFileId);
      } catch (err) {
        console.error('Gagal menghapus lampiran di Drive:', err);
      }
    }
    setKuitansiList((prev) =>
      prev.map((k) => {
        if (k.id !== kuitansiId) return k;
        return {
          ...k,
          lampiranDokumen: (k.lampiranDokumen || []).filter((l) => l.id !== lampiran.id),
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setSyncError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setHasValidToken(true);
        setSyncSuccessMessage(
          `Berhasil terhubung sebagai ${res.user.email}. Silakan buat Spreadsheet baru atau hubungkan Spreadsheet yang sudah ada.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      setSyncError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    setUser(null);
    setHasValidToken(false);
    setSyncSuccessMessage(null);
  };

  const handleProvisionWorkspace = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMessage(null);
    try {
      const cfg = await provisionWorkspaceStorage(
        workspaceConfig?.autoSyncEnabled ?? true
      );
      setWorkspaceConfig(cfg);
      await syncAllRecordsToSheets({
        spreadsheetId: cfg.spreadsheetId,
        kuitansiList,
        dokumentasiPerjalanan,
        dokumentasiPengeluaran,
        customFields,
      });
      setKuitansiList((prev) =>
        prev.map((k) => ({ ...k, statusSync: 'Tersinkronisasi Sheets' }))
      );
      setSyncSuccessMessage(
        'Spreadsheet baru & Folder Google Drive berhasil dibuat, serta seluruh data SPJ telah disinkronkan!'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menyiapkan penyimpanan Google Workspace.';
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectExistingSpreadsheet = async (rawUrlOrId: string) => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMessage(null);
    try {
      const cfg = await connectExistingSpreadsheet(
        rawUrlOrId,
        workspaceConfig,
        workspaceConfig?.autoSyncEnabled ?? true
      );
      setWorkspaceConfig(cfg);
      await syncAllRecordsToSheets({
        spreadsheetId: cfg.spreadsheetId,
        kuitansiList,
        dokumentasiPerjalanan,
        dokumentasiPengeluaran,
        customFields,
      });
      setKuitansiList((prev) =>
        prev.map((k) => ({ ...k, statusSync: 'Tersinkronisasi Sheets' }))
      );
      setSyncSuccessMessage(
        `Berhasil terhubung ke Spreadsheet "${cfg.spreadsheetTitle}" & menyinkronkan data SPJ!`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menghubungkan Spreadsheet yang dipilih.';
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = (enabled: boolean) => {
    if (workspaceConfig) {
      setWorkspaceConfig({
        ...workspaceConfig,
        autoSyncEnabled: enabled,
      });
    }
  };

  const handleSyncAllData = async () => {
    if (!workspaceConfig) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMessage(null);
    try {
      // 1. Upload any unsynced supporting documents attached to Kuitansi
      const updatedKuitansiList: KuitansiPerjalananDinas[] = [];
      for (const k of kuitansiList) {
        const updatedLampiran: LampiranDokumenItem[] = [];
        for (const lamp of k.lampiranDokumen || []) {
          if (!lamp.driveFileId && workspaceConfig.docKegiatanFolderId) {
            const uploaded = await uploadFileToDriveFolder({
              dataUrl: lamp.dataUrl,
              fileName: lamp.namaFile,
              mimeType: lamp.mimeType,
              folderId: workspaceConfig.docKegiatanFolderId,
              description: `Dokumen Pendukung SPJ (${lamp.jenisDokumen}): ${lamp.namaDokumen} — SPT ${k.noSpt}`,
            });
            updatedLampiran.push({
              ...lamp,
              driveFileId: uploaded.id,
              driveWebViewLink: uploaded.webViewLink,
              statusSync: 'Tersimpan di Drive & Sheets',
            });
          } else {
            updatedLampiran.push({
              ...lamp,
              statusSync: 'Tersimpan di Drive & Sheets',
            });
          }
        }
        updatedKuitansiList.push({
          ...k,
          lampiranDokumen: updatedLampiran,
          statusSync: 'Tersinkronisasi Sheets',
        });
      }

      // 2. Upload any unsynced activity photos / docs to Drive
      const updatedDocPerjalanan: DokumentasiPerjalananItem[] = [];
      for (const docItem of dokumentasiPerjalanan) {
        if (!docItem.driveFileId && workspaceConfig.docKegiatanFolderId) {
          const uploaded = await uploadFileToDriveFolder({
            dataUrl: docItem.fotoDataUrl,
            fileName: docItem.namaFile,
            mimeType: docItem.mimeType,
            folderId: workspaceConfig.docKegiatanFolderId,
            description: `${docItem.judulKegiatan} (${docItem.noSpt})`,
          });
          updatedDocPerjalanan.push({
            ...docItem,
            driveFileId: uploaded.id,
            driveWebViewLink: uploaded.webViewLink,
            statusSync: 'Tersimpan di Drive & Sheets',
          });
        } else {
          updatedDocPerjalanan.push({
            ...docItem,
            statusSync: 'Tersimpan di Drive & Sheets',
          });
        }
      }

      // 3. Upload any unsynced expense proofs to Drive
      const updatedDocPengeluaran: DokumentasiPengeluaranItem[] = [];
      for (const expItem of dokumentasiPengeluaran) {
        if (!expItem.driveFileId && workspaceConfig.docPengeluaranFolderId) {
          const uploaded = await uploadFileToDriveFolder({
            dataUrl: expItem.fotoBuktiDataUrl,
            fileName: expItem.namaFile,
            mimeType: expItem.mimeType,
            folderId: workspaceConfig.docPengeluaranFolderId,
            description: `${expItem.namaPengeluaran} - Rp${expItem.nominal} (${expItem.noSpt})`,
          });
          updatedDocPengeluaran.push({
            ...expItem,
            driveFileId: uploaded.id,
            driveWebViewLink: uploaded.webViewLink,
            statusSync: 'Tersimpan di Drive & Sheets',
          });
        } else {
          updatedDocPengeluaran.push({
            ...expItem,
            statusSync: 'Tersimpan di Drive & Sheets',
          });
        }
      }

      setKuitansiList(updatedKuitansiList);
      setDokumentasiPerjalanan(updatedDocPerjalanan);
      setDokumentasiPengeluaran(updatedDocPengeluaran);

      await syncAllRecordsToSheets({
        spreadsheetId: workspaceConfig.spreadsheetId,
        kuitansiList: updatedKuitansiList,
        dokumentasiPerjalanan: updatedDocPerjalanan,
        dokumentasiPengeluaran: updatedDocPengeluaran,
        customFields,
      });

      setWorkspaceConfig({
        ...workspaceConfig,
        lastSyncedAt: new Date().toISOString(),
      });
      setSyncSuccessMessage(
        'Seluruh Kuitansi, Bidang Kustom, Dokumentasi Kegiatan, Bukti Pengeluaran, dan Tautan Google Drive berhasil disinkronkan ke Google Sheets!'
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Gagal menyinkronkan data ke Google Workspace.';
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddDokumentasiPerjalanan = async (
    newItem: DokumentasiPerjalananItem,
    uploadToDriveNow: boolean
  ) => {
    let finalItem = newItem;
    if (uploadToDriveNow && hasValidToken && workspaceConfig?.docKegiatanFolderId) {
      setIsUploading(true);
      try {
        const uploaded = await uploadFileToDriveFolder({
          dataUrl: newItem.fotoDataUrl,
          fileName: newItem.namaFile,
          mimeType: newItem.mimeType,
          folderId: workspaceConfig.docKegiatanFolderId,
          description: `${newItem.judulKegiatan} (${newItem.noSpt})`,
        });
        finalItem = {
          ...newItem,
          driveFileId: uploaded.id,
          driveWebViewLink: uploaded.webViewLink,
          statusSync: 'Tersimpan di Drive & Sheets',
          syncErrorMessage: undefined,
        };
      } catch (err) {
        console.error('Upload ke Drive gagal, disimpan lokal:', err);
        finalItem = {
          ...newItem,
          statusSync: 'Gagal Sinkronisasi',
          syncErrorMessage:
            'Koneksi internet / unggah Google Drive terputus di lapangan. Berkas aman di perangkat — ketuk Coba Lagi saat sinyal stabil.',
        };
      } finally {
        setIsUploading(false);
      }
    }
    setDokumentasiPerjalanan((prev) => [finalItem, ...prev]);
  };

  const handleUpdateDokumentasiPerjalanan = (
    updatedItem: DokumentasiPerjalananItem
  ) => {
    setDokumentasiPerjalanan((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleRetrySyncDokumentasiPerjalanan = async (
    item: DokumentasiPerjalananItem
  ) => {
    if (!hasValidToken || !workspaceConfig?.docKegiatanFolderId) {
      setIsSyncModalOpen(true);
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadFileToDriveFolder({
        dataUrl: item.fotoDataUrl,
        fileName: item.namaFile,
        mimeType: item.mimeType,
        folderId: workspaceConfig.docKegiatanFolderId,
        description: `${item.judulKegiatan} (${item.noSpt})`,
      });
      setDokumentasiPerjalanan((prev) =>
        prev.map((curr) =>
          curr.id === item.id
            ? {
                ...curr,
                driveFileId: uploaded.id,
                driveWebViewLink: uploaded.webViewLink,
                statusSync: 'Tersimpan di Drive & Sheets',
                syncErrorMessage: undefined,
              }
            : curr
        )
      );
    } catch (err) {
      console.error('Retry upload ke Drive gagal:', err);
      setDokumentasiPerjalanan((prev) =>
        prev.map((curr) =>
          curr.id === item.id
            ? {
                ...curr,
                statusSync: 'Gagal Sinkronisasi',
                syncErrorMessage:
                  'Gagal mengunggah ulang ke Google Drive. Periksa koneksi internet lalu ketuk Coba Lagi.',
              }
            : curr
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDokumentasiPerjalanan = async (
    target: DokumentasiPerjalananItem
  ) => {
    if (target.driveFileId && hasValidToken) {
      try {
        await deleteFileFromDrive(target.driveFileId);
      } catch (err) {
        console.error('Gagal menghapus file Drive:', err);
      }
    }
    setDokumentasiPerjalanan((prev) => prev.filter((i) => i.id !== target.id));
  };

  const handleAddDokumentasiPengeluaran = async (
    newItem: DokumentasiPengeluaranItem,
    uploadToDriveNow: boolean
  ) => {
    let finalItem = newItem;
    if (uploadToDriveNow && hasValidToken && workspaceConfig?.docPengeluaranFolderId) {
      setIsUploading(true);
      try {
        const uploaded = await uploadFileToDriveFolder({
          dataUrl: newItem.fotoBuktiDataUrl,
          fileName: newItem.namaFile,
          mimeType: newItem.mimeType,
          folderId: workspaceConfig.docPengeluaranFolderId,
          description: `${newItem.namaPengeluaran} (${newItem.noSpt})`,
        });
        finalItem = {
          ...newItem,
          driveFileId: uploaded.id,
          driveWebViewLink: uploaded.webViewLink,
          statusSync: 'Tersimpan di Drive & Sheets',
          syncErrorMessage: undefined,
        };
      } catch (err) {
        console.error('Upload bukti ke Drive gagal, disimpan lokal:', err);
        finalItem = {
          ...newItem,
          statusSync: 'Gagal Sinkronisasi',
          syncErrorMessage:
            'Koneksi internet / unggah Google Drive terputus. Bukti pengeluaran aman tersimpan di perangkat — ketuk Coba Lagi saat sinyal stabil.',
        };
      } finally {
        setIsUploading(false);
      }
    }
    setDokumentasiPengeluaran((prev) => [finalItem, ...prev]);
  };

  const handleUpdateDokumentasiPengeluaran = (
    updatedItem: DokumentasiPengeluaranItem
  ) => {
    setDokumentasiPengeluaran((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleRetrySyncDokumentasiPengeluaran = async (
    item: DokumentasiPengeluaranItem
  ) => {
    if (!hasValidToken || !workspaceConfig?.docPengeluaranFolderId) {
      setIsSyncModalOpen(true);
      return;
    }
    setIsUploading(true);
    try {
      const uploaded = await uploadFileToDriveFolder({
        dataUrl: item.fotoBuktiDataUrl,
        fileName: item.namaFile,
        mimeType: item.mimeType,
        folderId: workspaceConfig.docPengeluaranFolderId,
        description: `${item.namaPengeluaran} (${item.noSpt})`,
      });
      setDokumentasiPengeluaran((prev) =>
        prev.map((curr) =>
          curr.id === item.id
            ? {
                ...curr,
                driveFileId: uploaded.id,
                driveWebViewLink: uploaded.webViewLink,
                statusSync: 'Tersimpan di Drive & Sheets',
                syncErrorMessage: undefined,
              }
            : curr
        )
      );
    } catch (err) {
      console.error('Retry upload bukti ke Drive gagal:', err);
      setDokumentasiPengeluaran((prev) =>
        prev.map((curr) =>
          curr.id === item.id
            ? {
                ...curr,
                statusSync: 'Gagal Sinkronisasi',
                syncErrorMessage:
                  'Gagal mengunggah ulang bukti ke Google Drive. Periksa koneksi internet lalu ketuk Coba Lagi.',
              }
            : curr
        )
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDokumentasiPengeluaran = async (
    target: DokumentasiPengeluaranItem
  ) => {
    if (target.driveFileId && hasValidToken) {
      try {
        await deleteFileFromDrive(target.driveFileId);
      } catch (err) {
        console.error('Gagal menghapus bukti di Drive:', err);
      }
    }
    setDokumentasiPengeluaran((prev) => prev.filter((i) => i.id !== target.id));
  };

  const activeDocPerjalanan = dokumentasiPerjalanan.filter(
    (d) => d.kuitansiId === activeKuitansi.id
  );
  const activeDocPengeluaran = dokumentasiPengeluaran.filter(
    (e) => e.kuitansiId === activeKuitansi.id
  );
  const totalDokumenPendukung = kuitansiList.reduce(
    (sum, k) => sum + (k.lampiranDokumen?.length || 0),
    0
  );

  const isInsideStudio = mainMenu === 'perjalanan-dinas' && spjView !== 'sub-home';
  const isCloudSynced = Boolean(user && hasValidToken && workspaceConfig);
  const activeKuitansiIndex = Math.max(
    0,
    kuitansiList.findIndex((k) => k.id === activeKuitansi.id)
  );

  const studioSteps: Array<{
    key: SpjSubSectionKey;
    stepNum: string;
    label: string;
    microcopy: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: 'kuitansi',
      stepNum: '1',
      label: 'Kuitansi',
      microcopy: 'Cetak SPPD',
      icon: FileText,
    },
    {
      key: 'dokumentasi',
      stepNum: '2',
      label: 'Dokumentasi',
      microcopy: 'Foto & Berkas',
      icon: Camera,
    },
    {
      key: 'pengeluaran',
      stepNum: '3',
      label: 'Bukti',
      microcopy: 'Scan Nota',
      icon: Receipt,
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col bg-slate-100 text-slate-900 pb-3 sm:pb-6">
      {/* 1. COMPACT STUDIO APP BAR (Tampil HANYA saat di dalam mode kerja/editor Studio — Tema Terang Bersih) */}
      {isInsideStudio ? (
        <header className="no-print sticky top-0 z-30 w-full max-w-full bg-white/95 text-slate-900 backdrop-blur-md border-b border-slate-200 shadow-2xs">
          {/* Baris 1: Tombol Kembali + Pemilih Berkas SPJ Compact + Tombol "+ Duplikat" + Ikon Cloud Sync */}
          <div className="max-w-7xl mx-auto px-2 sm:px-6 h-10 sm:h-11 flex items-center justify-between gap-1.5 sm:gap-2 relative min-w-0">
            <button
              type="button"
              onClick={() => {
                setIsSpjSwitcherOpen(false);
                setSpjView('sub-home');
              }}
              className="min-h-[30px] px-2 py-1 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>Kembali</span>
            </button>

            {/* Judul / Nomor SPJ Aktif + Tombol Sekunder "+ Duplikat" */}
            <div className="relative min-w-0 flex-1 flex items-center justify-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsSpjSwitcherOpen((prev) => !prev)}
                aria-expanded={isSpjSwitcherOpen}
                aria-label="Ganti berkas SPJ aktif"
                className="max-w-full min-h-[34px] px-2.5 sm:px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/90 text-xs font-bold text-slate-900 inline-flex items-center gap-1.5 min-w-0 transition-colors cursor-pointer"
              >
                <span className="truncate">
                  SPJ #{activeKuitansiIndex + 1} · {activeKuitansi.atasNama}
                </span>
                <span className="hidden md:inline text-slate-500 font-normal">
                  ({activeKuitansi.noSpt})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>

              {/* Tombol Aksi Sekunder "+ Duplikat" untuk menduplikasi Kuitansi aktif */}
              <button
                type="button"
                onClick={handleDuplicateActiveKuitansi}
                data-testid="duplicate-kuitansi-button"
                title="Gandakan (clone) kuitansi aktif menjadi draft baru untuk pelaksana lain"
                className="min-h-[34px] px-2 sm:px-2.5 py-1 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-xs font-bold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                <span className="hidden sm:inline">+ Duplikat</span>
              </button>

              {isSpjSwitcherOpen && (
                <div
                  role="menu"
                  className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1"
                >
                  <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Pilih Berkas SPJ Aktif</span>
                    <span>{kuitansiList.length} Berkas</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {kuitansiList.map((k, idx) => {
                      const isSelected = k.id === activeKuitansi.id;
                      return (
                        <div
                          key={k.id}
                          className={`w-full text-left px-2 py-1.5 rounded-xl text-xs flex items-center justify-between gap-1 transition-colors ${
                            isSelected
                              ? 'bg-sky-50 text-sky-900 font-bold border border-sky-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setActiveKuitansiId(k.id);
                              setIsSpjSwitcherOpen(false);
                            }}
                            className="min-w-0 flex-1 text-left cursor-pointer flex items-center justify-between gap-2 p-1"
                          >
                            <div className="min-w-0">
                              <p className="truncate">
                                SPJ #{idx + 1} · {k.atasNama || '(Nama belum diisi)'} — {k.tujuan}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 truncate">
                                {k.noSpt} · {formatRupiah(calculateKuitansiTotal(k.rincian))}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-sky-700 shrink-0" />
                            )}
                          </button>

                          <button
                            type="button"
                            data-testid={`delete-kuitansi-${k.id}`}
                            title="Hapus berkas SPJ ini"
                            aria-label={`Hapus berkas SPJ ${k.atasNama || k.noSpt}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsSpjSwitcherOpen(false);
                              promptDeleteKuitansi(k);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-1 border-t border-slate-100 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpjSwitcherOpen(false);
                        handleDuplicateActiveKuitansi();
                      }}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>+ Duplikat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSpjSwitcherOpen(false);
                        handleCreateNewKuitansi();
                      }}
                      className="min-h-[36px] px-2.5 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ SPJ Baru</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Ikon Cloud Sync dengan Titik Indikator Warna (Tanpa Teks Panjang) */}
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              aria-label={
                isCloudSynced
                  ? 'Status Cloud: Tersinkronisasi ke Google Sheets & Drive'
                  : 'Status Cloud: Tersimpan Lokal (Ketuk untuk hubungkan Google Workspace)'
              }
              title={
                isCloudSynced
                  ? 'Tersinkronisasi (Google Sheets & Drive Aktif)'
                  : 'Lokal (Ketuk untuk sinkronisasi Cloud)'
              }
              className="relative w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-sky-700" />
              <span
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white ${
                  isCloudSynced ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
            </button>
          </div>

          {/* Baris 2: Grid 3 Kolom Proporsional & Ringkas (Semua 3 Tahapan Tampil Utuh Tanpa Terpotong: Icon + Label + Microcopy) */}
          <div className="border-t border-slate-100 bg-slate-50/90">
            <nav
              aria-label="Tahapan Modul SPJ"
              className="max-w-7xl mx-auto px-1.5 sm:px-6 py-1 grid grid-cols-3 gap-1 sm:gap-2"
            >
              {studioSteps.map((step) => {
                const StepIcon = step.icon;
                const isActive = spjView === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => {
                      setIsSpjSwitcherOpen(false);
                      setSpjView(step.key);
                    }}
                    className={`min-w-0 px-1 sm:px-2.5 py-1 rounded-xl flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-0.5 sm:gap-2 text-center sm:text-left border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-700 text-white border-sky-700 shadow-2xs'
                        : 'bg-white hover:bg-slate-100/80 text-slate-700 hover:text-slate-900 border-slate-200/80'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-100 text-sky-700'
                      }`}
                    >
                      <StepIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                    </div>
                    <div className="min-w-0 max-w-full flex flex-col leading-tight">
                      <span className="text-[9.5px] sm:text-xs font-bold tracking-tight truncate">
                        {step.stepNum}.{step.label}
                      </span>
                      <span
                        className={`text-[8.5px] sm:text-[10px] font-medium truncate ${
                          isActive ? 'text-sky-100' : 'text-slate-500'
                        }`}
                      >
                        {step.microcopy}
                      </span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>
      ) : (
        /* 2. TOP NAVBAR UTAMA (Tampil saat di Beranda, Sub-Home SPJ, atau Pengaturan — Anti Overflow) */
        <header className="no-print sticky top-0 z-30 w-full max-w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-8 h-14 flex items-center justify-between gap-2 sm:gap-6">
          {/* Zone 1: Brand Wordmark */}
          <a
            href="#beranda"
            onClick={(e) => {
              e.preventDefault();
              setMainMenu('home');
            }}
            className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            e-SPJ Kaltara
          </a>

          {/* Zone 2: Menu Utama (Beranda, SPJ Dinas, Pengaturan) */}
          <nav
            aria-label="Menu Utama"
            className="flex items-center gap-2.5 sm:gap-6 text-xs sm:text-sm font-medium text-slate-600 min-w-0"
          >
            <a
              href="#beranda"
              onClick={(e) => {
                e.preventDefault();
                setMainMenu('home');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                mainMenu === 'home'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Beranda
            </a>
            <a
              href="#perjalanan-dinas"
              onClick={(e) => {
                e.preventDefault();
                setMainMenu('perjalanan-dinas');
                setSpjView('sub-home');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                mainMenu === 'perjalanan-dinas'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-700'
                  : 'hover:text-slate-900'
              }`}
            >
              <span>SPJ Dinas</span>
            </a>
            <a
              href="#pengaturan"
              onClick={(e) => {
                e.preventDefault();
                setMainMenu('settings');
              }}
              className={`transition-colors whitespace-nowrap shrink-0 py-1 ${
                mainMenu === 'settings'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-700'
                  : 'hover:text-slate-900'
              }`}
            >
              Pengaturan
            </a>
          </nav>

          {/* Zone 3: Ikon Cloud Sync dengan Indikator Titik Warna (Hijau = Tersinkron, Kuning = Lokal) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:block">
              <PWAInstallButton />
            </div>
            <button
              type="button"
              onClick={() => setIsSyncModalOpen(true)}
              aria-label={
                isCloudSynced
                  ? 'Status Cloud: Tersinkronisasi ke Google Sheets & Drive'
                  : 'Status Cloud: Tersimpan Lokal (Ketuk untuk hubungkan Google Workspace)'
              }
              title={
                isCloudSynced
                  ? 'Hijau: Tersinkron ke Google Sheets & Drive'
                  : 'Kuning: Tersimpan Lokal (Ketuk untuk hubungkan Cloud)'
              }
              className="relative w-9 h-9 sm:w-auto sm:px-3 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shrink-0 transition-colors cursor-pointer"
            >
              <Cloud className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="hidden sm:inline">
                {isCloudSynced ? 'Tersinkron' : 'Lokal'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isCloudSynced ? 'bg-emerald-400' : 'bg-amber-400'
                } absolute top-1.5 right-1.5 sm:static`}
              />
            </button>
          </div>
        </header>
      )}

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2.5 sm:px-8 py-2.5 sm:py-5 min-w-0 overflow-x-hidden">
        {/* 1. HALAMAN UTAMA (BERANDA): Actionable Dashboard dengan Metrik Nyata & Akses 1-Klik */}
        {mainMenu === 'home' && (
          <MainHomeSection
            settings={appSettings}
            kuitansiList={kuitansiList}
            activeKuitansi={activeKuitansi}
            docPerjalananCount={activeDocPerjalanan.length}
            docPengeluaranList={activeDocPengeluaran}
            isCloudSynced={isCloudSynced}
            onEnterSpjPerjalananDinas={() => {
              setMainMenu('perjalanan-dinas');
              setSpjView('sub-home');
            }}
            onOpenStudioModule={(sub) => {
              setMainMenu('perjalanan-dinas');
              setSpjView(sub);
            }}
            onCreateNewKuitansi={() => {
              handleCreateNewKuitansi();
              setMainMenu('perjalanan-dinas');
              setSpjView('kuitansi');
            }}
          />
        )}

        {/* 2. SECTION PERJALANAN DINAS: Sub-Home & 4 Studio Modul */}
        {mainMenu === 'perjalanan-dinas' && (
          <div className="space-y-3 sm:space-y-4 min-w-0 max-w-full">
            {spjView === 'sub-home' ? (
              <SpjPerjalananSubHome
                kuitansiList={kuitansiList}
                activeKuitansi={activeKuitansi}
                onSelectKuitansi={setActiveKuitansiId}
                onCreateNewKuitansi={handleCreateNewKuitansi}
                onDuplicateKuitansi={handleDuplicateActiveKuitansi}
                onDeleteKuitansi={promptDeleteKuitansi}
                docPerjalanan={activeDocPerjalanan}
                docPengeluaran={activeDocPengeluaran}
                allDocPerjalanan={dokumentasiPerjalanan}
                allDocPengeluaran={dokumentasiPengeluaran}
                onOpenSubSection={(sub) => setSpjView(sub)}
              />
            ) : (
              <div className="min-w-0 max-w-full">
                {spjView === 'kuitansi' && (
                  <KuitansiEditorSection
                    kuitansiList={kuitansiList}
                    activeKuitansiId={activeKuitansi.id}
                    onSelectKuitansi={setActiveKuitansiId}
                    onSaveKuitansi={handleSaveKuitansi}
                    onCreateNewKuitansi={handleCreateNewKuitansi}
                    onDeleteKuitansi={() => promptDeleteKuitansi(activeKuitansi)}
                    onOpenSyncModal={() => setIsSyncModalOpen(true)}
                    customFields={customFields}
                    onAddCustomField={handleAddCustomField}
                    onUpdateCustomField={handleUpdateCustomField}
                    onRemoveCustomField={handleRemoveCustomField}
                    onUploadLampiranToDrive={handleUploadLampiranToDrive}
                    onDeleteLampiran={handleDeleteLampiran}
                    isGoogleConnected={hasValidToken && !!workspaceConfig}
                    isUploading={isUploading}
                    autoSyncEnabled={workspaceConfig?.autoSyncEnabled ?? true}
                    paperSize={paperSize}
                    onChangePaperSize={(size) => {
                      setPaperSize(size);
                      try {
                        localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, size);
                      } catch {
                        // ignore
                      }
                    }}
                    logoPemprovDataUrl={appSettings.logoPemprovDataUrl}
                    daftarPegawai={daftarPegawai}
                    sptList={sptList}
                    activeSptId={activeSptId}
                  />
                )}

                {spjView === 'surat-tugas' && (
                  <SuratTugasEditorSection
                    sptList={sptList}
                    activeSptId={activeSptId}
                    onSelectSpt={setActiveSptId}
                    onSaveSpt={handleSaveSpt}
                    onCreateNewSpt={handleCreateNewSpt}
                    appSettings={appSettings}
                    daftarPegawai={daftarPegawai}
                    paperSize={paperSize}
                    onChangePaperSize={(size) => {
                      setPaperSize(size);
                      try {
                        localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, size);
                      } catch {
                        // ignore
                      }
                    }}
                  />
                )}

                {spjView === 'dokumentasi' && (
                  <DokumentasiPerjalananSection
                    items={activeDocPerjalanan}
                    kuitansiList={kuitansiList}
                    activeKuitansi={activeKuitansi}
                    onAddItem={handleAddDokumentasiPerjalanan}
                    onUpdateItem={handleUpdateDokumentasiPerjalanan}
                    onRetrySyncItem={handleRetrySyncDokumentasiPerjalanan}
                    onDeleteItem={handleDeleteDokumentasiPerjalanan}
                    isGoogleConnected={hasValidToken && !!workspaceConfig}
                    isUploading={isUploading}
                    onOpenSyncModal={() => setIsSyncModalOpen(true)}
                    paperSize={paperSize}
                    onChangePaperSize={(size) => {
                      setPaperSize(size);
                      try {
                        localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, size);
                      } catch {
                        // ignore
                      }
                    }}
                  />
                )}

                {spjView === 'pengeluaran' && (
                  <DokumentasiPengeluaranSection
                    items={activeDocPengeluaran}
                    kuitansiList={kuitansiList}
                    activeKuitansi={activeKuitansi}
                    onAddItem={handleAddDokumentasiPengeluaran}
                    onUpdateItem={handleUpdateDokumentasiPengeluaran}
                    onRetrySyncItem={handleRetrySyncDokumentasiPengeluaran}
                    onDeleteItem={handleDeleteDokumentasiPengeluaran}
                    isGoogleConnected={hasValidToken && !!workspaceConfig}
                    isUploading={isUploading}
                    onOpenSyncModal={() => setIsSyncModalOpen(true)}
                    paperSize={paperSize}
                    onChangePaperSize={(size) => {
                      setPaperSize(size);
                      try {
                        localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, size);
                      } catch {
                        // ignore
                      }
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. MENU PENGATURAN (SETTINGS) */}
        {mainMenu === 'settings' && (
          <SettingsSection
            settings={appSettings}
            daftarPegawai={daftarPegawai}
            onUpdateDaftarPegawai={handleUpdateDaftarPegawai}
            paperSize={paperSize}
            onSaveSettings={handleSaveSettings}
            onChangePaperSize={(size) => {
              setPaperSize(size);
              try {
                localStorage.setItem(STORAGE_KEYS.PAPER_SIZE, size);
              } catch {
                // ignore
              }
            }}
            onOpenWorkspaceModal={() => setIsSyncModalOpen(true)}
            isGoogleConnected={hasValidToken && !!workspaceConfig}
          />
        )}
      </main>

      {/* Google Workspace Sync Modal */}
      <WorkspaceSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        user={user}
        isLoggingIn={isLoggingIn}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
        workspaceConfig={workspaceConfig}
        onProvisionWorkspace={handleProvisionWorkspace}
        onConnectExistingSpreadsheet={handleConnectExistingSpreadsheet}
        onLoadDriveSpreadsheets={listUserSpreadsheetsInDrive}
        onToggleAutoSync={handleToggleAutoSync}
        onSyncAllData={handleSyncAllData}
        isSyncing={isSyncing}
        syncError={syncError}
        syncSuccessMessage={syncSuccessMessage}
        counts={{
          kuitansi: kuitansiList.length,
          dokumentasi: dokumentasiPerjalanan.length,
          pengeluaran: dokumentasiPengeluaran.length,
          dokumenPendukung: totalDokumenPendukung,
          customFields: customFields.length,
        }}
      />

      {/* Modal Dialog Konfirmasi Hapus Berkas SPJ */}
      {kuitansiToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="delete-modal-title" className="text-base font-extrabold text-slate-900">
                  Hapus Berkas SPJ?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini permanen. Seluruh rincian biaya kuitansi serta foto dan bukti pengeluaran yang terhubung akan ikut dibersihkan.
                </p>
              </div>
            </div>

            {/* Rincian Berkas SPJ yang Akan Dihapus */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nomor SPT:</span>
                <span className="font-mono font-bold text-red-700">{kuitansiToDelete.noSpt}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pelaksana:</span>
                <span className="font-bold text-slate-900">
                  {kuitansiToDelete.atasNama || '(Nama Belum Diisi)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">NIP Pelaksana:</span>
                <span className="font-mono text-slate-700">{kuitansiToDelete.nipPenerima || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tujuan:</span>
                <span className="text-slate-800 truncate max-w-[200px]">{kuitansiToDelete.tujuan}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold">
                <span className="text-slate-700">Total Kuitansi:</span>
                <span className="font-mono text-emerald-800 text-sm">
                  {formatRupiah(calculateKuitansiTotal(kuitansiToDelete.rincian))}
                </span>
              </div>
              {(() => {
                const relatedPhotos = dokumentasiPerjalanan.filter(
                  (d) => d.kuitansiId === kuitansiToDelete.id
                ).length;
                const relatedExpenses = dokumentasiPengeluaran.filter(
                  (e) => e.kuitansiId === kuitansiToDelete.id
                ).length;
                if (relatedPhotos > 0 || relatedExpenses > 0) {
                  return (
                    <div className="pt-2 border-t border-slate-200 text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-xl flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>
                        {relatedPhotos} Foto Kegiatan &amp; {relatedExpenses} Bukti Nota terkait akan ikut dihapus.
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Tombol Aksi */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setKuitansiToDelete(null)}
                className="min-h-[42px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteKuitansi}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Permanen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Toast Notification */}
      {actionToast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast.message}</span>
        </div>
      )}

      {/* Offline Mode Connectivity Indicator */}
      <OfflineIndicator />


    </div>
  );
}
