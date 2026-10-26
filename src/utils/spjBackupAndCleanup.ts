import {
  KuitansiPerjalananDinas,
  SuratPerintahTugas,
  DokumentasiPerjalananItem,
  DokumentasiPengeluaranItem,
} from '../types/spj';
import { calculateKuitansiTotal } from './spjCalculations';

const INDONESIAN_MONTHS: Array<{ name: string; num: number }> = [
  { name: 'januari', num: 1 },
  { name: 'februari', num: 2 },
  { name: 'maret', num: 3 },
  { name: 'april', num: 4 },
  { name: 'mei', num: 5 },
  { name: 'juni', num: 6 },
  { name: 'juli', num: 7 },
  { name: 'agustus', num: 8 },
  { name: 'september', num: 9 },
  { name: 'oktober', num: 10 },
  { name: 'november', num: 11 },
  { name: 'desember', num: 12 },
];

const MONTH_LABELS: Record<number, string> = {
  1: 'Januari',
  2: 'Februari',
  3: 'Maret',
  4: 'April',
  5: 'Mei',
  6: 'Juni',
  7: 'Juli',
  8: 'Agustus',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'Desember',
};

export interface SpjPeriodInfo {
  year: number;
  month: number;
  sortKey: string; // YYYY-MM
  label: string; // e.g., "April 2026"
}

export function extractSpjPeriod(
  kuitansi: KuitansiPerjalananDinas,
  spt?: SuratPerintahTugas
): SpjPeriodInfo {
  const candidates = [
    kuitansi.tanggalPerjalanan,
    kuitansi.tempatTanggalTtd,
    spt?.tanggalBerangkat,
    spt?.tanggalDitetapkan,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let detectedMonth = 0;
  for (const m of INDONESIAN_MONTHS) {
    if (candidates.includes(m.name)) {
      detectedMonth = m.num;
      break;
    }
  }

  const yearMatch = candidates.match(/\b(20\d{2})\b/);
  let detectedYear = yearMatch
    ? parseInt(yearMatch[1], 10)
    : parseInt(kuitansi.tahunAnggaran || '2026', 10) || 2026;

  if (!detectedMonth && kuitansi.updatedAt) {
    const parsed = new Date(kuitansi.updatedAt);
    if (!Number.isNaN(parsed.getTime())) {
      detectedMonth = parsed.getMonth() + 1;
      detectedYear = parsed.getFullYear();
    }
  }

  if (!detectedMonth) {
    detectedMonth = 10; // Default Oktober
  }

  const paddedMonth = String(detectedMonth).padStart(2, '0');
  const sortKey = `${detectedYear}-${paddedMonth}`;
  const label = `${MONTH_LABELS[detectedMonth] || 'Bulan'} ${detectedYear}`;

  return {
    year: detectedYear,
    month: detectedMonth,
    sortKey,
    label,
  };
}

export interface SpjBackupPayload {
  version: string;
  exportedAt: string;
  recordCount: number;
  kuitansiItems: KuitansiPerjalananDinas[];
  sptItems: SuratPerintahTugas[];
  docPerjalananItems: DokumentasiPerjalananItem[];
  docPengeluaranItems: DokumentasiPengeluaranItem[];
}

export function downloadSpjBackupJson(params: {
  kuitansiItems: KuitansiPerjalananDinas[];
  allSptList: SuratPerintahTugas[];
  allDocPerjalanan: DokumentasiPerjalananItem[];
  allDocPengeluaran: DokumentasiPengeluaranItem[];
  filenamePrefix?: string;
}): void {
  const targetIds = new Set(params.kuitansiItems.map((k) => k.id));
  const sptItems = params.allSptList.filter(
    (s) => s.kuitansiId && targetIds.has(s.kuitansiId)
  );
  const docPerjalananItems = params.allDocPerjalanan.filter((d) =>
    targetIds.has(d.kuitansiId)
  );
  const docPengeluaranItems = params.allDocPengeluaran.filter((e) =>
    targetIds.has(e.kuitansiId)
  );

  const payload: SpjBackupPayload = {
    version: 'e-spj-kaltara-backup-v1',
    exportedAt: new Date().toISOString(),
    recordCount: params.kuitansiItems.length,
    kuitansiItems: params.kuitansiItems,
    sptItems,
    docPerjalananItems,
    docPengeluaranItems,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const prefix = params.filenamePrefix || 'Cadangan_Berkas_SPJ';

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${prefix}_${params.kuitansiItems.length}_Berkas_${dateStamp}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function downloadSpjBackupCsv(params: {
  kuitansiItems: KuitansiPerjalananDinas[];
  allDocPerjalanan: DokumentasiPerjalananItem[];
  allDocPengeluaran: DokumentasiPengeluaranItem[];
  filenamePrefix?: string;
}): void {
  const escapeCsvCell = (val: string | number | undefined | null): string => {
    const str = String(val ?? '').replace(/\r?\n/g, ' ').trim();
    if (str.includes(',') || str.includes('"') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'No',
    'Nomor SPT',
    'Nomor Kuitansi',
    'Nama Pelaksana',
    'NIP Pelaksana',
    'Tujuan Perjalanan',
    'Tanggal Perjalanan',
    'Sub Kegiatan',
    'Total Nilai Kuitansi (Rp)',
    'Jumlah Foto Kegiatan',
    'Jumlah Bukti Pengeluaran',
    'Total Bukti Pengeluaran (Rp)',
    'Status Arsip',
  ];

  const rows = params.kuitansiItems.map((item, idx) => {
    const totalKui = calculateKuitansiTotal(item.rincian);
    const photosCount = params.allDocPerjalanan.filter(
      (d) => d.kuitansiId === item.id
    ).length;
    const expenses = params.allDocPengeluaran.filter(
      (e) => e.kuitansiId === item.id
    );
    const totalExpenses = expenses.reduce((acc, e) => acc + (e.nominal || 0), 0);

    return [
      idx + 1,
      item.noSpt,
      item.noKuitansi || '-',
      item.atasNama,
      item.nipPenerima,
      item.tujuan,
      item.tanggalPerjalanan,
      item.subKegiatan,
      totalKui,
      photosCount,
      expenses.length,
      totalExpenses,
      item.isArchived ? 'Diarsipkan' : 'Aktif',
    ]
      .map(escapeCsvCell)
      .join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);
  const prefix = params.filenamePrefix || 'Ringkasan_Berkas_SPJ';

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${prefix}_${params.kuitansiItems.length}_Berkas_${dateStamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function parseSpjBackupJson(rawText: string): SpjBackupPayload | null {
  try {
    const parsed = JSON.parse(rawText);
    if (
      parsed &&
      Array.isArray(parsed.kuitansiItems) &&
      parsed.kuitansiItems.length > 0
    ) {
      return {
        version: parsed.version || 'e-spj-kaltara-backup-v1',
        exportedAt: parsed.exportedAt || new Date().toISOString(),
        recordCount: parsed.kuitansiItems.length,
        kuitansiItems: parsed.kuitansiItems,
        sptItems: Array.isArray(parsed.sptItems) ? parsed.sptItems : [],
        docPerjalananItems: Array.isArray(parsed.docPerjalananItems)
          ? parsed.docPerjalananItems
          : [],
        docPengeluaranItems: Array.isArray(parsed.docPengeluaranItems)
          ? parsed.docPengeluaranItems
          : [],
      };
    }
    return null;
  } catch {
    return null;
  }
}
