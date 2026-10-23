import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  KuitansiPerjalananDinas,
  DokumentasiPerjalananItem,
  DokumentasiPengeluaranItem,
  CustomFieldDefinition,
  DriveSpreadsheetItem,
  WorkspaceConfig,
} from '../types/spj';
import {
  calculateKuitansiTotal,
  terbilangRupiah,
  calculateRincianRowTotal,
  calculateExpenseReconciliation,
  extractSpreadsheetIdFromInput,
} from '../utils/spjCalculations';

export const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const REQUIRED_SHEET_TABS = [
  'Ringkasan_Analitik',
  'Kuitansi_SPPD',
  'Rincian_Biaya',
  'Dokumentasi_Perjalanan',
  'Dokumentasi_Pengeluaran',
  'Dokumen_Pendukung_SPJ',
];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses Google Workspace.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

async function createDriveFolder(name: string, parentId?: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token akses tidak tersedia. Silakan login terlebih dahulu.');

  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal membuat folder Google Drive (${res.status}): ${errText}`);
  }
  const data = await res.json();
  return data.id;
}

async function ensureDriveFoldersExist(existingConfig?: WorkspaceConfig | null): Promise<{
  rootFolderId: string;
  docKegiatanFolderId: string;
  docPengeluaranFolderId: string;
}> {
  if (
    existingConfig?.rootFolderId &&
    existingConfig?.docKegiatanFolderId &&
    existingConfig?.docPengeluaranFolderId
  ) {
    return {
      rootFolderId: existingConfig.rootFolderId,
      docKegiatanFolderId: existingConfig.docKegiatanFolderId,
      docPengeluaranFolderId: existingConfig.docPengeluaranFolderId,
    };
  }
  const rootFolderId = await createDriveFolder('e-SPJ_Disdikbud_Kaltara_2026');
  const docKegiatanFolderId = await createDriveFolder(
    '01_Dokumentasi_Perjalanan_Dinas',
    rootFolderId
  );
  const docPengeluaranFolderId = await createDriveFolder(
    '02_Dokumentasi_Bukti_Pengeluaran',
    rootFolderId
  );
  return { rootFolderId, docKegiatanFolderId, docPengeluaranFolderId };
}

export async function listUserSpreadsheetsInDrive(): Promise<DriveSpreadsheetItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');

  const q = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink,modifiedTime)&orderBy=modifiedTime desc&pageSize=15`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal memuat daftar Google Sheets dari Drive (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return Array.isArray(data.files) ? data.files : [];
}

export async function provisionWorkspaceStorage(autoSyncEnabled = true): Promise<WorkspaceConfig> {
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');

  const folders = await ensureDriveFoldersExist(null);

  const spreadsheetTitle = 'Database e-SPJ Perjalanan Dinas - Disdikbud Kaltara 2026';
  const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: spreadsheetTitle,
      },
      sheets: REQUIRED_SHEET_TABS.map((title) => ({
        properties: { title, gridProperties: { frozenRowCount: 1 } },
      })),
    }),
  });

  if (!createSheetRes.ok) {
    const errText = await createSheetRes.text();
    throw new Error(`Gagal membuat Google Sheets (${createSheetRes.status}): ${errText}`);
  }

  const sheetData = await createSheetRes.json();
  const spreadsheetId: string = sheetData.spreadsheetId;
  const spreadsheetUrl: string =
    sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle,
    ...folders,
    autoSyncEnabled,
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function connectExistingSpreadsheet(
  rawIdOrUrl: string,
  existingConfig?: WorkspaceConfig | null,
  autoSyncEnabled = true
): Promise<WorkspaceConfig> {
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');

  const spreadsheetId = extractSpreadsheetIdFromInput(rawIdOrUrl);
  if (!spreadsheetId) {
    throw new Error('URL atau ID Google Spreadsheet tidak valid.');
  }

  // 1. Fetch spreadsheet metadata to verify access and inspect existing sheet tabs
  const getRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,properties.title,sheets.properties.title`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!getRes.ok) {
    const errText = await getRes.text();
    throw new Error(
      `Tidak dapat mengakses Spreadsheet (${getRes.status}). Pastikan ID benar dan file dibuat/dibuka melalui aplikasi ini: ${errText}`
    );
  }

  const meta = await getRes.json();
  const spreadsheetTitle: string =
    meta.properties?.title || 'Spreadsheet e-SPJ Perjalanan Dinas';
  const spreadsheetUrl: string =
    meta.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const existingTabs = new Set<string>(
    (meta.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title || '')
  );

  const missingTabs = REQUIRED_SHEET_TABS.filter((tab) => !existingTabs.has(tab));
  if (missingTabs.length > 0) {
    const batchAddRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: missingTabs.map((title) => ({
            addSheet: {
              properties: {
                title,
                gridProperties: { frozenRowCount: 1 },
              },
            },
          })),
        }),
      }
    );

    if (!batchAddRes.ok) {
      const errText = await batchAddRes.text();
      throw new Error(`Gagal menambahkan tab struktur SPJ ke Spreadsheet (${batchAddRes.status}): ${errText}`);
    }
  }

  const folders = await ensureDriveFoldersExist(existingConfig);

  return {
    spreadsheetId,
    spreadsheetUrl,
    spreadsheetTitle,
    ...folders,
    autoSyncEnabled,
    lastSyncedAt: new Date().toISOString(),
  };
}

function dataUrlToBlob(dataUrl: string, fallbackMime = 'image/png'): { blob: Blob; mimeType: string } {
  const parts = dataUrl.split(',');
  const header = parts[0] || '';
  const body = parts[1] || '';
  const mimeMatch = header.match(/data:([^;,]+)/);
  const mimeType = mimeMatch ? mimeMatch[1] : fallbackMime;

  if (header.includes(';base64')) {
    const byteString = atob(body);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return { blob: new Blob([ab], { type: mimeType }), mimeType };
  } else {
    const decoded = decodeURIComponent(body);
    return { blob: new Blob([decoded], { type: mimeType }), mimeType };
  }
}

export async function uploadFileToDriveFolder(params: {
  dataUrl: string;
  fileName: string;
  mimeType?: string;
  folderId: string;
  description: string;
}): Promise<{ id: string; webViewLink: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');

  const { blob } = dataUrlToBlob(params.dataUrl, params.mimeType || 'application/octet-stream');
  const metadata = {
    name: params.fileName,
    description: params.description,
    parents: params.folderId ? [params.folderId] : undefined,
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob, params.fileName);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal mengunggah berkas ke Google Drive (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

// Keep alias for backward compatibility
export const uploadImageToDriveFolder = uploadFileToDriveFolder;

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Gagal menghapus file dari Google Drive (${res.status}): ${errText}`);
  }
}

export async function syncAllRecordsToSheets(params: {
  spreadsheetId: string;
  kuitansiList: KuitansiPerjalananDinas[];
  dokumentasiPerjalanan: DokumentasiPerjalananItem[];
  dokumentasiPengeluaran: DokumentasiPengeluaranItem[];
  customFields?: CustomFieldDefinition[];
}): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');

  const customFields = params.customFields || [];

  // 1. Tab Ringkasan_Analitik (Mudah dibaca & dianalisis oleh bendahara/auditor)
  const analitikRows: (string | number)[][] = [
    [
      'ID Kuitansi',
      'No. SPT',
      'Atas Nama Pelaksana',
      'Tujuan Perjalanan',
      'Tanggal Perjalanan',
      'Total Kuitansi SPPD (Rp)',
      'Total Bukti Pengeluaran Riil (Rp)',
      'Selisih Rekonsiliasi (Rp)',
      'Persentase Kelengkapan Bukti (%)',
      'Status Rekonsiliasi',
      'Jml Foto Kegiatan',
      'Jml Bukti Pengeluaran',
      'Jml Dokumen Pendukung (SPT/SPPD)',
      'Tautan Dokumen Drive',
    ],
  ];

  params.kuitansiList.forEach((k) => {
    const totalKuitansi = calculateKuitansiTotal(k.rincian);
    const relatedExpenses = params.dokumentasiPengeluaran.filter((e) => e.kuitansiId === k.id);
    const relatedDocs = params.dokumentasiPerjalanan.filter((d) => d.kuitansiId === k.id);
    const lampiran = k.lampiranDokumen || [];
    const recon = calculateExpenseReconciliation(totalKuitansi, relatedExpenses);

    const allDriveLinks = [
      ...lampiran.map((l) => l.driveWebViewLink).filter(Boolean),
      ...relatedDocs.map((d) => d.driveWebViewLink).filter(Boolean),
      ...relatedExpenses.map((e) => e.driveWebViewLink).filter(Boolean),
    ];

    analitikRows.push([
      k.id,
      k.noSpt,
      k.atasNama,
      k.tujuan,
      k.tanggalPerjalanan,
      totalKuitansi,
      recon.totalDocumented,
      recon.selisih,
      recon.persentaseLengkap,
      recon.status,
      relatedDocs.length,
      relatedExpenses.length,
      lampiran.length,
      allDriveLinks.length > 0 ? allDriveLinks.join(' | ') : 'Belum ada tautan Drive',
    ]);
  });

  // 2. Tab Kuitansi_SPPD (termasuk kolom dinamis dari Custom Fields!)
  const customFieldHeaders = customFields.map((cf) => `[Kustom] ${cf.label}`);
  const kuitansiRows: (string | number)[][] = [
    [
      'ID Kuitansi',
      'Tahun Anggaran',
      'No. Kuitansi',
      'Sub Kegiatan',
      'Sudah Terima Dari',
      'Sebesar (Rp)',
      'Terbilang Rupiah',
      'Untuk Pengeluaran',
      'Atas Nama (A.n)',
      'NIP Penerima',
      'Tujuan',
      'Tanggal Perjalanan',
      'No. SPT',
      'Tempat & Tgl TTD',
      'Pengguna Anggaran',
      'NIP Pengguna Anggaran',
      'Bendahara Pengeluaran',
      'NIP Bendahara',
      ...customFieldHeaders,
      'Tautan Drive Dokumen Pendukung',
      'Waktu Update',
    ],
    ...params.kuitansiList.map((k) => {
      const total = calculateKuitansiTotal(k.rincian);
      const customValues = customFields.map((cf) => k.customFieldValues?.[cf.id] || '-');
      const lampiranLinks = (k.lampiranDokumen || [])
        .map((l) => (l.driveWebViewLink ? `${l.namaDokumen}: ${l.driveWebViewLink}` : l.namaFile))
        .join(' ; ');

      return [
        k.id,
        k.tahunAnggaran,
        k.noKuitansi || '-',
        k.subKegiatan,
        k.sudahTerimaDari,
        total,
        terbilangRupiah(total),
        k.untukPengeluaran,
        k.atasNama,
        k.nipPenerima,
        k.tujuan,
        k.tanggalPerjalanan,
        k.noSpt,
        k.tempatTanggalTtd,
        k.namaPenggunaAnggaran,
        k.nipPenggunaAnggaran,
        k.namaBendahara,
        k.nipBendahara,
        ...customValues,
        lampiranLinks || '-',
        k.updatedAt,
      ];
    }),
  ];

  // 3. Tab Rincian_Biaya
  const rincianRows: (string | number)[][] = [
    [
      'ID Kuitansi',
      'No. SPT',
      'Atas Nama',
      'Tujuan',
      'No. Urut',
      'Kategori Biaya',
      'Uraian Rincian Biaya',
      'Nominal Satuan (Rp)',
      'Kuantitas',
      'Satuan',
      'Subtotal (Rp)',
    ],
  ];

  params.kuitansiList.forEach((k) => {
    k.rincian.forEach((r, idx) => {
      rincianRows.push([
        k.id,
        k.noSpt,
        k.atasNama,
        k.tujuan,
        idx + 1,
        r.kategori,
        r.uraian,
        r.nominalSatuan,
        r.kuantitas,
        r.satuan || 'paket/PP',
        calculateRincianRowTotal(r.nominalSatuan, r.kuantitas),
      ]);
    });
  });

  // 4. Tab Dokumentasi_Perjalanan
  const docPerjalananRows = [
    [
      'ID Dokumentasi',
      'ID Kuitansi Terkait',
      'No. SPT Terkait',
      'Jenis Berkas',
      'Judul Kegiatan',
      'Tanggal',
      'Waktu',
      'Lokasi',
      'Pelaksana',
      'Keterangan Kegiatan',
      'Nama File',
      'ID File Google Drive',
      'Tautan Google Drive',
    ],
    ...params.dokumentasiPerjalanan.map((d) => [
      d.id,
      d.kuitansiId,
      d.noSpt,
      d.jenisBerkas || 'Foto Kegiatan',
      d.judulKegiatan,
      d.tanggalKegiatan,
      d.waktuKegiatan,
      d.lokasiKegiatan,
      d.pelaksana,
      d.keterangan,
      d.namaFile,
      d.driveFileId || '-',
      d.driveWebViewLink || 'Tersimpan Lokal',
    ]),
  ];

  // 5. Tab Dokumentasi_Pengeluaran
  const docPengeluaranRows = [
    [
      'ID Pengeluaran',
      'ID Kuitansi Terkait',
      'No. SPT Terkait',
      'Kategori Biaya',
      'Jenis Berkas',
      'Uraian Pengeluaran',
      'Vendor / Penyedia',
      'Tanggal Bukti',
      'Nomor Bukti / Invoice',
      'Nominal (Rp)',
      'Catatan',
      'Nama File Bukti',
      'ID File Google Drive',
      'Tautan Google Drive',
    ],
    ...params.dokumentasiPengeluaran.map((e) => [
      e.id,
      e.kuitansiId,
      e.noSpt,
      e.kategori,
      e.jenisBerkas || 'Foto Nota/Tiket',
      e.namaPengeluaran,
      e.vendorPenyedia,
      e.tanggalBukti,
      e.nomorBukti,
      e.nominal,
      e.catatan,
      e.namaFile,
      e.driveFileId || '-',
      e.driveWebViewLink || 'Tersimpan Lokal',
    ]),
  ];

  // 6. Tab Dokumen_Pendukung_SPJ (SPT, SPPD, Undangan, Boarding Pass, dll. yang ditautkan ke Kuitansi)
  const pendukungRows: (string | number)[][] = [
    [
      'ID Dokumen',
      'ID Kuitansi Terkait',
      'No. SPT Terkait',
      'Atas Nama Pelaksana',
      'Jenis Dokumen',
      'Nama Dokumen Pendukung',
      'Nama File',
      'Tipe MIME',
      'ID File Google Drive',
      'Tautan Google Drive',
      'Waktu Unggah',
    ],
  ];

  params.kuitansiList.forEach((k) => {
    (k.lampiranDokumen || []).forEach((lamp) => {
      pendukungRows.push([
        lamp.id,
        k.id,
        k.noSpt,
        k.atasNama,
        lamp.jenisDokumen,
        lamp.namaDokumen,
        lamp.namaFile,
        lamp.mimeType,
        lamp.driveFileId || '-',
        lamp.driveWebViewLink || 'Tersimpan Lokal',
        lamp.uploadedAt,
      ]);
    });
  });

  const batchBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: 'Ringkasan_Analitik!A1', values: analitikRows },
      { range: 'Kuitansi_SPPD!A1', values: kuitansiRows },
      { range: 'Rincian_Biaya!A1', values: rincianRows },
      { range: 'Dokumentasi_Perjalanan!A1', values: docPerjalananRows },
      { range: 'Dokumentasi_Pengeluaran!A1', values: docPengeluaranRows },
      { range: 'Dokumen_Pendukung_SPJ!A1', values: pendukungRows },
    ],
  };

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${params.spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchBody),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal menyinkronkan data ke Google Sheets (${res.status}): ${errText}`);
  }
}

export async function createOrUpdateGoogleDocForLaporan(params: {
  title: string;
  htmlContent: string;
  folderId?: string;
  existingFileId?: string;
}): Promise<{ id: string; webViewLink: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('Silakan masuk dengan akun Google terlebih dahulu.');

  const metadata: Record<string, unknown> = {
    name: params.title,
    mimeType: 'application/vnd.google-apps.document',
  };
  if (params.folderId && !params.existingFileId) {
    metadata.parents = [params.folderId];
  }

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
    params.htmlContent +
    closeDelimiter;

  let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
  let method = 'POST';

  if (params.existingFileId) {
    url = `https://www.googleapis.com/upload/drive/v3/files/${params.existingFileId}?uploadType=multipart&fields=id,name,webViewLink`;
    method = 'PATCH';
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal menyimpan Google Doc (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://docs.google.com/document/d/${data.id}/edit`,
  };
}

