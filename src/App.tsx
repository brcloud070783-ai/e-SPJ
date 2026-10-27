/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Receipt,
  ArrowLeft,
  ChevronDown,
  Plus,
  CheckCircle2,
  Copy,
  Trash2,
  AlertTriangle,
  LayoutGrid,
  Navigation,
  SlidersHorizontal,
  Wallet,
  FileText,
  BadgeCheck,
  Download,
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
  downloadSpjBackupJson,
  SpjBackupPayload,
} from './utils/spjBackupAndCleanup';
import {
  initAuth,
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
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { FloatingBottomNav } from './components/FloatingBottomNav';

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
        if (Array.isArray(parsed)) return parsed;
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
        if (Array.isArray(parsed)) return parsed;
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
  const [isUploading, setIsUploading] = useState(false);

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

  const fallbackKuitansi = applySettingsToKuitansi(
    INITIAL_KUITANSI_LIST[0],
    appSettings
  );

  const activeKuitansi =
    kuitansiList.find((k) => k.id === activeKuitansiId) ||
    kuitansiList.find((k) => !k.isArchived) ||
    kuitansiList[0] ||
    fallbackKuitansi;

  const activeSpt =
    sptList.find((s) => s.kuitansiId === activeKuitansi.id) ||
    sptList.find(
      (s) =>
        s.noSpt &&
        activeKuitansi.noSpt &&
        s.noSpt.trim().toLowerCase() === activeKuitansi.noSpt.trim().toLowerCase()
    ) ||
    sptList.find((s) => s.id === activeSptId) ||
    sptList[0] ||
    INITIAL_SURAT_TUGAS_LIST[0];

  useEffect(() => {
    if (activeSpt && activeSpt.id !== activeSptId) {
      setActiveSptId(activeSpt.id);
    }
  }, [activeKuitansi.id, activeSpt?.id]);

  useEffect(() => {
    if (kuitansiList.length === 0 && spjView !== 'sub-home') {
      setSpjView('sub-home');
    }
  }, [kuitansiList.length, spjView]);

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

    // Sinkronkan atribut inti dari Kuitansi ke SPT/SPD/Visum dalam berkas SPJ yang sama
    setSptList((prev) =>
      prev.map((spt) => {
        const isLinked =
          spt.kuitansiId === updated.id ||
          spt.id === activeSpt?.id;
        if (!isLinked) return spt;

        let nextPegawaiList = [...(spt.pegawaiList || [])];
        if (updated.atasNama && updated.atasNama.trim()) {
          const existingIdx = nextPegawaiList.findIndex(
            (p) =>
              p.nama.trim().toLowerCase() === updated.atasNama.trim().toLowerCase() ||
              (updated.nipPenerima && p.nip === updated.nipPenerima)
          );
          if (existingIdx !== -1) {
            nextPegawaiList[existingIdx] = {
              ...nextPegawaiList[existingIdx],
              nama: updated.atasNama,
              nip: updated.nipPenerima || nextPegawaiList[existingIdx].nip,
            };
          } else if (nextPegawaiList.length > 0) {
            nextPegawaiList[0] = {
              ...nextPegawaiList[0],
              nama: updated.atasNama,
              nip: updated.nipPenerima || nextPegawaiList[0].nip,
            };
          }
        }

        return {
          ...spt,
          kuitansiId: updated.id,
          noSpt: updated.noSpt || spt.noSpt,
          maksudPerjalanan: updated.untukPengeluaran || spt.maksudPerjalanan,
          tempatTujuan: updated.tujuan
            ? `${updated.tujuan.replace(/;$/, '').trim()};`
            : spt.tempatTujuan,
          pegawaiList: nextPegawaiList,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    // Sinkronkan noSpt & pelaksana ke Dokumentasi dan Bukti Pembayaran
    if (updated.noSpt) {
      setDokumentasiPerjalanan((prev) =>
        prev.map((d) =>
          d.kuitansiId === updated.id
            ? {
                ...d,
                noSpt: updated.noSpt,
                pelaksana: updated.atasNama || d.pelaksana,
              }
            : d
        )
      );
      setDokumentasiPengeluaran((prev) =>
        prev.map((e) =>
          e.kuitansiId === updated.id ? { ...e, noSpt: updated.noSpt } : e
        )
      );
    }
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
    const selectedPegId =
      updated.spdData?.selectedPegawaiId || updated.pegawaiList?.[0]?.id;
    const selectedPeg =
      updated.pegawaiList?.find((p) => p.id === selectedPegId) ||
      updated.pegawaiList?.[0];
    const cleanTujuan = updated.tempatTujuan
      ? updated.tempatTujuan.replace(/;$/, '').trim()
      : '';
    const cleanMaksud = updated.maksudPerjalanan
      ? updated.maksudPerjalanan.replace(/;$/, '').trim()
      : '';

    setKuitansiList((prev) =>
      prev.map((item) => {
        const isLinked =
          item.id === updated.kuitansiId ||
          item.id === activeKuitansiId ||
          (item.noSpt &&
            updated.noSpt &&
            item.noSpt.trim().toLowerCase() === updated.noSpt.trim().toLowerCase());
        if (!isLinked) return item;

        return {
          ...item,
          noSpt: updated.noSpt || item.noSpt,
          subKegiatan: syncedSubKegiatan || item.subKegiatan,
          tujuan: cleanTujuan || item.tujuan,
          untukPengeluaran: cleanMaksud || item.untukPengeluaran,
          atasNama: selectedPeg?.nama || item.atasNama,
          nipPenerima: selectedPeg?.nip || item.nipPenerima,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    if (updated.noSpt) {
      const targetKuiId = updated.kuitansiId || activeKuitansiId;
      setDokumentasiPerjalanan((prev) =>
        prev.map((d) =>
          d.kuitansiId === targetKuiId
            ? {
                ...d,
                noSpt: updated.noSpt,
                pelaksana: selectedPeg?.nama || d.pelaksana,
              }
            : d
        )
      );
      setDokumentasiPengeluaran((prev) =>
        prev.map((e) =>
          e.kuitansiId === targetKuiId ? { ...e, noSpt: updated.noSpt } : e
        )
      );
    }
  };

  const handleCreateNewSpt = () => {
    handleCreateNewKuitansi();
  };

  const handleCreateNewKuitansi = () => {
    const nextNumber = kuitansiList.length + 1;
    const nowSuffix = Date.now().toString().slice(-3);
    const newKuitansiId = `kui-2026-00${nextNumber}-${nowSuffix}`;
    const newSptNo = `800.1.11.1/ 1${1898 + nextNumber}/SPT/Disdikbud/KU/X/${appSettings.tahunAnggaranDefault || '2026'}`;
    const currentSpt =
      sptList.find((s) => s.id === activeSptId) ||
      sptList[0] ||
      INITIAL_SURAT_TUGAS_LIST[0];
    const sptSubKeg = extractSubKegiatanFromSpt(currentSpt);

    const newKuitansi: KuitansiPerjalananDinas = {
      ...applySettingsToKuitansi(activeKuitansi, appSettings),
      id: newKuitansiId,
      isArchived: false,
      archivedAt: undefined,
      tahunAnggaran: appSettings.tahunAnggaranDefault || activeKuitansi.tahunAnggaran,
      subKegiatan:
        sptSubKeg ||
        appSettings.subKegiatanDefault ||
        activeKuitansi.subKegiatan ||
        '',
      sudahTerimaDari:
        appSettings.sudahTerimaDariDefault || activeKuitansi.sudahTerimaDari,
      noKuitansi: '',
      atasNama: appSettings.namaPelaksanaDefault || 'Bayu Ramadhan',
      nipPenerima: appSettings.nipPelaksanaDefault || '198307072015031002',
      tujuan: 'Kota Tarakan',
      tanggalPerjalanan: '15 s.d 17 Oktober 2026',
      tempatTanggalTtd: `${appSettings.kotaTtdDefault || 'Tanjung Selor'}, 17 Oktober 2026`,
      noSpt: newSptNo,
      customFieldValues: {},
      lampiranDokumen: [],
      statusSync:
        hasValidToken && workspaceConfig?.spreadsheetId && workspaceConfig.autoSyncEnabled
          ? 'Tersinkronisasi Sheets'
          : 'Tersimpan Lokal',
      updatedAt: new Date().toISOString(),
    };

    const newPegId = `st-p-${Date.now()}-1`;
    const newSpt: SuratPerintahTugas = {
      id: `spt-2026-00${nextNumber}-${nowSuffix}`,
      kuitansiId: newKuitansiId,
      noSpt: newSptNo,
      dasarList: [
        'Peraturan Gubernur Kalimantan Utara Nomor 41 Tahun 2022 Tentang Perubahan Atas Peraturan Gubernur Nomor 25 Tahun 2019, tentang Pedoman Pelaksanaan Perjalanan Dinas;',
        'Telaah Staf Pejabat Pelaksana Teknis Kegiatan perihal pelaksanaan tugas perjalanan dinas lapangan;',
      ],
      pegawaiList: [
        {
          id: newPegId,
          nama: newKuitansi.atasNama,
          pangkatGol: 'Penata, III/c',
          nip: newKuitansi.nipPenerima,
          jabatan: 'Analis Perencanaan & Anggaran',
        },
      ],
      maksudPerjalanan:
        newKuitansi.untukPengeluaran ||
        'Monitoring dan Peninjauan Lokasi Rencana Kegiatan Pelayanan Pendidikan;',
      tempatBerangkat: `${appSettings.kotaTtdDefault || 'Tanjung Selor'};`,
      tempatTujuan: `${newKuitansi.tujuan};`,
      tanggalBerangkat: 'Kamis, 15 Oktober 2026;',
      tanggalHarusKembali: 'Sabtu, 17 Oktober 2026;',
      lamanyaPerjalanan: '3 (tiga) hari;',
      pembebananAnggaran:
        newKuitansi.subKegiatan ||
        'DPA Dinas Pendidikan dan Kebudayaan Provinsi Kalimantan Utara TA 2026',
      tempatDitetapkan: appSettings.kotaTtdDefault || 'Tanjung Selor',
      tanggalDitetapkan: '15 Oktober 2026',
      jabatanPenandatangan: appSettings.jabatanPenggunaAnggaran || 'Plt. Kepala Dinas',
      namaPenandatangan: appSettings.namaPenggunaAnggaran || 'Hasanuddin, S.Pd., M.Si.',
      nipPenandatangan: appSettings.nipPenggunaAnggaran || '197405272007011010',
      pangkatPenandatangan: 'Pembina Tingkat I, IV/b',
      spdData: {
        lembarKe: '...............................................',
        kodeNo: '...............................................',
        nomorSpd: `000.1.2.3/                  /SPPD/Disdikbud/${appSettings.tahunAnggaranDefault || '2026'}`,
        pptkNama: `${newKuitansi.atasNama}/NIP ${newKuitansi.nipPenerima}`,
        pptkNip: newKuitansi.nipPenerima,
        tingkatBiaya: '',
        alatAngkut: 'Darat dan Air',
        instansiAnggaran: appSettings.namaDinas || 'Dinas Pendidikan dan Kebudayaan',
        akunAnggaran: newKuitansi.subKegiatan,
        keteranganLain: '',
        selectedPegawaiId: newPegId,
        pengikutList: [
          { id: '1', nama: '', tanggalLahir: '', keterangan: '' },
          { id: '2', nama: '', tanggalLahir: '', keterangan: '' },
          { id: '3', nama: '', tanggalLahir: '', keterangan: '' },
          { id: '4', nama: '', tanggalLahir: '', keterangan: '' },
        ],
      },
      updatedAt: new Date().toISOString(),
    };

    setKuitansiList((prev) => [newKuitansi, ...prev]);
    setSptList((prev) => [newSpt, ...prev]);
    setActiveKuitansiId(newKuitansi.id);
    setActiveSptId(newSpt.id);
    setMainMenu('perjalanan-dinas');
    setSpjView('spt');
    showToast(`Berkas SPJ Utuh #${nextNumber} (SPT, SPD, Visum & Kuitansi) berhasil dibuat!`);
  };

  const handleDuplicateActiveKuitansi = () => {
    const nextNumber = kuitansiList.length + 1;
    const paddedSeq = String(nextNumber).padStart(3, '0');
    const nowSuffix = Date.now().toString().slice(-3);
    const dupKuiId = `kui-dup-${paddedSeq}-${nowSuffix}`;

    const clonedRincian = activeKuitansi.rincian.map((item, idx) => ({
      ...item,
      id: `rinc-dup-${nowSuffix}-${idx + 1}`,
    }));

    const clonedCustomValues = activeKuitansi.customFieldValues
      ? { ...activeKuitansi.customFieldValues }
      : {};

    const duplicatedKuitansi: KuitansiPerjalananDinas = {
      ...activeKuitansi,
      id: dupKuiId,
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

    const duplicatedSpt: SuratPerintahTugas = {
      ...activeSpt,
      id: `spt-dup-${paddedSeq}-${nowSuffix}`,
      kuitansiId: dupKuiId,
      updatedAt: new Date().toISOString(),
    };

    setKuitansiList((prev) => [duplicatedKuitansi, ...prev]);
    setSptList((prev) => [duplicatedSpt, ...prev]);
    setActiveKuitansiId(duplicatedKuitansi.id);
    setActiveSptId(duplicatedSpt.id);
    setIsSpjSwitcherOpen(false);
    setMainMenu('perjalanan-dinas');
    setSpjView('spt');
    showToast(`Berkas SPJ Utuh berhasil diduplikat!`);
  };

  const promptDeleteKuitansi = (target: KuitansiPerjalananDinas) => {
    setKuitansiToDelete(target);
  };

  const handleDeleteKuitansiBatch = (idsToDelete: string[]) => {
    if (idsToDelete.length === 0) return;
    const idSet = new Set(idsToDelete);

    const remaining = kuitansiList.filter((k) => !idSet.has(k.id));
    const remainingSpt = sptList.filter(
      (s) => !s.kuitansiId || !idSet.has(s.kuitansiId)
    );

    // Cascade delete: bersihkan dokumentasi perjalanan & pengeluaran yang terikat pada SPJ ini
    setDokumentasiPerjalanan((prev) =>
      prev.filter((d) => !idSet.has(d.kuitansiId))
    );
    setDokumentasiPengeluaran((prev) =>
      prev.filter((e) => !idSet.has(e.kuitansiId))
    );

    setKuitansiList(remaining);
    setSptList(remaining.length === 0 ? [] : remainingSpt);

    if (remaining.length === 0) {
      setSpjView('sub-home');
      showToast(
        'Seluruh berkas SPJ berhasil dihapus. Daftar kini kosong (0 berkas).'
      );
    } else {
      if (idSet.has(activeKuitansiId)) {
        const nextActive =
          remaining.find((k) => !k.isArchived) || remaining[0];
        setActiveKuitansiId(nextActive.id);
      }
      showToast(`${idsToDelete.length} berkas SPJ berhasil dihapus permanen.`);
    }
  };

  const handleArchiveKuitansiBatch = (ids: string[], archive: boolean) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const nowIso = new Date().toISOString();

    setKuitansiList((prev) =>
      prev.map((item) =>
        idSet.has(item.id)
          ? {
              ...item,
              isArchived: archive,
              archivedAt: archive ? nowIso : undefined,
            }
          : item
      )
    );

    showToast(
      archive
        ? `${ids.length} berkas SPJ dipindahkan ke Arsip.`
        : `${ids.length} berkas SPJ dipulihkan ke daftar aktif.`
    );
  };

  const handleRestoreBackupPayload = (payload: SpjBackupPayload) => {
    setKuitansiList((prev) => {
      const existingIds = new Set(prev.map((k) => k.id));
      const newItems = payload.kuitansiItems.filter(
        (k) => !existingIds.has(k.id)
      );
      return [...newItems, ...prev];
    });
    if (payload.sptItems.length > 0) {
      setSptList((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newSpts = payload.sptItems.filter((s) => !existingIds.has(s.id));
        return [...newSpts, ...prev];
      });
    }
    if (payload.docPerjalananItems.length > 0) {
      setDokumentasiPerjalanan((prev) => {
        const existingIds = new Set(prev.map((d) => d.id));
        const newDocs = payload.docPerjalananItems.filter(
          (d) => !existingIds.has(d.id)
        );
        return [...newDocs, ...prev];
      });
    }
    if (payload.docPengeluaranItems.length > 0) {
      setDokumentasiPengeluaran((prev) => {
        const existingIds = new Set(prev.map((e) => e.id));
        const newExps = payload.docPengeluaranItems.filter(
          (e) => !existingIds.has(e.id)
        );
        return [...newExps, ...prev];
      });
    }
    if (payload.kuitansiItems[0]) {
      setActiveKuitansiId(payload.kuitansiItems[0].id);
    }
    showToast(
      `${payload.kuitansiItems.length} berkas SPJ berhasil dipulihkan dari cadangan!`
    );
  };

  const handleConfirmDeleteKuitansi = () => {
    if (!kuitansiToDelete) return;
    const targetId = kuitansiToDelete.id;
    setKuitansiToDelete(null);
    handleDeleteKuitansiBatch([targetId]);
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
    shortLabel: string;
    microcopy: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: 'spt',
      stepNum: '1',
      label: 'SPT',
      shortLabel: 'SPT',
      microcopy: 'Surat Perintah Tugas',
      icon: FileText,
    },
    {
      key: 'spd',
      stepNum: '2',
      label: 'SPD',
      shortLabel: 'SPD',
      microcopy: 'SPD Depan',
      icon: Navigation,
    },
    {
      key: 'visum',
      stepNum: '3',
      label: 'Visum',
      shortLabel: 'Visum',
      microcopy: 'SPD Belakang',
      icon: BadgeCheck,
    },
    {
      key: 'kuitansi',
      stepNum: '4',
      label: 'Kuitansi',
      shortLabel: 'Kuitansi',
      microcopy: 'Biaya SPPD',
      icon: Wallet,
    },
    {
      key: 'dokumentasi',
      stepNum: '5',
      label: 'Dokumentasi',
      shortLabel: 'Dokumen',
      microcopy: 'Foto Kegiatan',
      icon: Camera,
    },
    {
      key: 'pengeluaran',
      stepNum: '6',
      label: 'Bukti',
      shortLabel: 'Bukti',
      microcopy: 'Scan Nota / Riil',
      icon: Receipt,
    },
  ];

  const normalizedActiveStepKey: SpjSubSectionKey =
    spjView === 'surat-tugas'
      ? 'spt'
      : spjView === 'sub-home'
        ? 'spt'
        : spjView;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-slate-100 text-slate-900 pb-28 lg:pb-12">
      {/* 1. STUDIO APP BAR (Bersih, Rapi, & Ergonomis di Mobile mau pun Desktop) */}
      {isInsideStudio ? (
        <header className="no-print sticky top-0 z-30 w-full max-w-full bg-white/95 text-slate-900 backdrop-blur-md border-b border-slate-200 shadow-2xs">
          {/* DESKTOP (lg+): Baris tunggal yang proporsional */}
          <div className="hidden lg:flex max-w-7xl mx-auto px-4 sm:px-6 h-16 items-center justify-between gap-4 min-w-0">
            {/* Zone 1: Kembali & Pemilih SPJ */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsSpjSwitcherOpen(false);
                  setSpjView('sub-home');
                }}
                title="Kembali ke Daftar Berkas SPJ"
                className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
              >
                <ArrowLeft className="w-4 h-4 text-sky-700 shrink-0" />
                <span>Daftar SPJ</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSpjSwitcherOpen((prev) => !prev)}
                  aria-expanded={isSpjSwitcherOpen}
                  aria-label="Ganti berkas SPJ aktif"
                  className="max-w-[220px] h-10 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 inline-flex items-center justify-between gap-1.5 truncate cursor-pointer shadow-2xs"
                >
                  <span className="truncate">
                    #{activeKuitansiIndex + 1} {activeKuitansi.atasNama || '(Draft)'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
                {isSpjSwitcherOpen && (
                  <div
                    role="menu"
                    className="absolute top-full mt-1.5 left-0 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Pilih Berkas SPJ</span>
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
            </div>

            {/* Zone 2: 6 Tab Dokumen Desktop (Menyesuaikan proporsional mengisi ruang setelah ikon copy dihapus) */}
            <nav
              aria-label="Navigasi Dokumen SPJ"
              className="flex-1 max-w-2xl grid grid-cols-6 gap-2"
            >
              {studioSteps.map((step) => {
                const StepIcon = step.icon;
                const isActive = normalizedActiveStepKey === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => {
                      setIsSpjSwitcherOpen(false);
                      setSpjView(step.key);
                    }}
                    className={`w-full py-1.5 px-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-700 text-white shadow-xs font-bold'
                        : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-semibold'
                    }`}
                  >
                    <StepIcon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="text-xs leading-none truncate max-w-full">{step.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* MOBILE (<lg): Tanpa ikon copy di kanan, tombol kembali & pemilih berkas SPJ menyesuaikan proporsional */}
          <div className="lg:hidden flex flex-col">
            {/* Mobile Baris 1: Tombol Kembali & Dropdown Pemilih SPJ mengisi penuh secara proporsional */}
            <div className="px-2.5 h-10 flex items-center justify-between gap-2 border-b border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsSpjSwitcherOpen(false);
                  setSpjView('sub-home');
                }}
                className="h-8 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer border border-slate-200/80"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                <span>Daftar SPJ</span>
              </button>

              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setIsSpjSwitcherOpen((prev) => !prev)}
                  aria-expanded={isSpjSwitcherOpen}
                  className="w-full h-8 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-900 inline-flex items-center justify-between gap-1.5 truncate cursor-pointer shadow-2xs"
                >
                  <span className="truncate">
                    #{activeKuitansiIndex + 1} {activeKuitansi.atasNama || '(Draft)'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
                {isSpjSwitcherOpen && (
                  <div
                    role="menu"
                    className="absolute top-full mt-1.5 right-0 w-72 sm:w-80 max-w-[calc(100vw-1.25rem)] bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-xl p-2 z-50 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    <div className="px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Pilih Berkas SPJ</span>
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
                              data-testid={`delete-kuitansi-mobile-${k.id}`}
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
            </div>

            {/* Mobile Baris 2: 6 TAB DOKUMEN PROPORSIONAL DALAM GRID 6-KOLOM */}
            <nav
              aria-label="Navigasi Dokumen SPJ Mobile"
              className="w-full px-2 py-1.5 grid grid-cols-6 gap-1.5 bg-slate-50/90 border-t border-slate-100"
            >
              {studioSteps.map((step) => {
                const StepIcon = step.icon;
                const isActive = normalizedActiveStepKey === step.key;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => {
                      setIsSpjSwitcherOpen(false);
                      setSpjView(step.key);
                    }}
                    className={`h-11 w-full py-1 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-700 text-white shadow-2xs font-bold'
                        : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200/80 font-semibold'
                    }`}
                  >
                    <StepIcon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-white' : 'text-slate-500'
                      }`}
                    />
                    <span className="text-[10px] leading-none text-center truncate max-w-full block">
                      {step.shortLabel}
                    </span>
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
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="#beranda"
              onClick={(e) => {
                e.preventDefault();
                setMainMenu('home');
              }}
              className="text-sm sm:text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
            >
              SAPA Kaltara
            </a>
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-200/80 hidden xs:inline-block">
              Disdikbud Kaltara
            </span>
          </div>

          {/* Zone 2: Menu Utama Desktop (Beranda: Ringkasan, SPJ Dinas: Ruang Kerja, Pengaturan: Kop & Data) */}
          <nav
            aria-label="Menu Utama"
            className="hidden sm:flex items-center gap-2 sm:gap-5 text-xs sm:text-sm font-medium text-slate-600 min-w-0"
          >
            <a
              href="#beranda"
              onClick={(e) => {
                e.preventDefault();
                setMainMenu('home');
              }}
              title="Beranda: Dasbor ringkasan, metrik anggaran, dan status berkas"
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
                mainMenu === 'home'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-700'
                  : 'hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <div className="flex flex-col text-left leading-tight">
                <span>Beranda</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Dasbor & Pantauan</span>
              </div>
            </a>
            <a
              href="#perjalanan-dinas"
              onClick={(e) => {
                e.preventDefault();
                setMainMenu('perjalanan-dinas');
                setSpjView('sub-home');
              }}
              title="SPJ Dinas: Ruang kerja pengelolaan berkas, arsip, dan pengisian 6 formulir dokumen"
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
                mainMenu === 'perjalanan-dinas'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-700'
                  : 'hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <div className="flex flex-col text-left leading-tight">
                <span>SPJ Dinas</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Ruang Kerja & Formulir</span>
              </div>
            </a>
            <a
              href="#pengaturan"
              onClick={(e) => {
                e.preventDefault();
                setMainMenu('settings');
              }}
              title="Pengaturan: Konfigurasi nama dinas, pejabat penandatangan, dan kop surat"
              className={`inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 py-1 ${
                mainMenu === 'settings'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-700'
                  : 'hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <div className="flex flex-col text-left leading-tight">
                <span>Pengaturan</span>
                <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">Data Dinas & Kop</span>
              </div>
            </a>
          </nav>

          {/* Zone 3: PWA Install Button */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
          </div>
        </header>
      )}

      {/* Main Content Container with bottom padding for Floating Pill Bar */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 sm:px-8 py-1.5 sm:py-4 pb-20 sm:pb-28 min-w-0 overflow-x-clip">
        {/* 1. HALAMAN UTAMA (BERANDA): Action Center dengan Executive Summary Grid & Progress 1-6 */}
        {mainMenu === 'home' && (
          <MainHomeSection
            settings={appSettings}
            kuitansiList={kuitansiList}
            activeKuitansi={activeKuitansi}
            activeSpt={activeSpt}
            docPerjalananCount={activeDocPerjalanan.length}
            docPengeluaranList={activeDocPengeluaran}
            allDocPerjalanan={dokumentasiPerjalanan}
            allDocPengeluaran={dokumentasiPengeluaran}
            sptList={sptList}
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
            }}
            onSelectKuitansi={setActiveKuitansiId}
          />
        )}

        {/* 2. SECTION PERJALANAN DINAS: Sub-Home & Ruang Kerja Berurutan 1 Berkas SPJ Utuh */}
        {mainMenu === 'perjalanan-dinas' && (
          <div className="space-y-3 sm:space-y-4 min-w-0 max-w-full">
            {spjView === 'sub-home' ? (
              <SpjPerjalananSubHome
                kuitansiList={kuitansiList}
                activeKuitansi={activeKuitansi}
                activeSpt={activeSpt}
                sptList={sptList}
                onSelectKuitansi={setActiveKuitansiId}
                onCreateNewKuitansi={handleCreateNewKuitansi}
                onDuplicateKuitansi={handleDuplicateActiveKuitansi}
                onDeleteKuitansi={promptDeleteKuitansi}
                onDeleteKuitansiBatch={handleDeleteKuitansiBatch}
                onArchiveKuitansiBatch={handleArchiveKuitansiBatch}
                onRestoreBackupPayload={handleRestoreBackupPayload}
                docPerjalanan={activeDocPerjalanan}
                docPengeluaran={activeDocPengeluaran}
                allDocPerjalanan={dokumentasiPerjalanan}
                allDocPengeluaran={dokumentasiPengeluaran}
                onOpenSubSection={(sub) => setSpjView(sub)}
              />
            ) : (
              <div className="min-w-0 max-w-full space-y-4">
                {spjView === 'kuitansi' && (
                  <KuitansiEditorSection
                    kuitansiList={kuitansiList}
                    activeKuitansiId={activeKuitansi.id}
                    onSelectKuitansi={setActiveKuitansiId}
                    onSaveKuitansi={handleSaveKuitansi}
                    onCreateNewKuitansi={handleCreateNewKuitansi}
                    onDeleteKuitansi={() => promptDeleteKuitansi(activeKuitansi)}
                    onOpenSyncModal={() => {}}
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
                    activeSptId={activeSpt.id}
                  />
                )}

                {(spjView === 'spt' ||
                  spjView === 'spd' ||
                  spjView === 'visum' ||
                  spjView === 'surat-tugas') && (
                  <SuratTugasEditorSection
                    sptList={sptList}
                    activeSptId={activeSpt.id}
                    onSelectSpt={setActiveSptId}
                    onSaveSpt={handleSaveSpt}
                    onCreateNewSpt={handleCreateNewSpt}
                    onDeleteSpt={() => promptDeleteKuitansi(activeKuitansi)}
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
                    activeDocType={
                      spjView === 'spt' || spjView === 'surat-tugas'
                        ? 'spt'
                        : spjView === 'visum'
                          ? 'spd-belakang'
                          : 'spd'
                    }
                    onChangeDocType={(dt) => {
                      setSpjView(
                        dt === 'spt'
                          ? 'spt'
                          : dt === 'spd-belakang'
                            ? 'visum'
                            : 'spd'
                      );
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
                    onOpenSyncModal={() => {}}
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
                    onOpenSyncModal={() => {}}
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
            onOpenWorkspaceModal={() => {}}
            isGoogleConnected={hasValidToken && !!workspaceConfig}
          />
        )}
      </main>

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

            {/* Opsi Unduh Cadangan 1-Klik Sebelum Hapus */}
            <div className="p-3 rounded-2xl bg-sky-50/80 border border-sky-200 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-sky-950">
                Simpan cadangan berkas ini sebelum dihapus?
              </span>
              <button
                type="button"
                onClick={() =>
                  downloadSpjBackupJson({
                    kuitansiItems: [kuitansiToDelete],
                    allSptList: sptList,
                    allDocPerjalanan: dokumentasiPerjalanan,
                    allDocPengeluaran: dokumentasiPengeluaran,
                    filenamePrefix: 'Cadangan_1_Berkas_SPJ',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-100 border border-sky-300 text-sky-900 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-sky-700" />
                <span>Unduh .JSON</span>
              </button>
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

      {/* Floating Action Toast Notification (offset above bottom bar on mobile) */}
      {actionToast && (
        <div
          role="status"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionToast.message}</span>
        </div>
      )}

      {/* Floating Pill Bottom Navigation (Expanding Pill & Elevated Island Dock) */}
      <FloatingBottomNav
        mainMenu={mainMenu}
        setMainMenu={setMainMenu}
        spjView={spjView}
        setSpjView={setSpjView}
        kuitansiCount={kuitansiList.length}
        activeKuitansiTujuan={activeKuitansi?.tujuan}
      />

      {/* Offline Mode Connectivity Indicator */}
      <OfflineIndicator />


    </div>
  );
}
