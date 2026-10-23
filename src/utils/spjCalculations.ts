export interface RincianCalcItem {
  id: string;
  uraian: string;
  nominalSatuan: number;
  kuantitas: number;
  satuan: string;
}

export interface ExpenseCalcItem {
  id: string;
  kategori: string;
  nominal: number;
}

const SATUAN_WORDS = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
  'sebelas',
];

export function terbilangInt(n: number): string {
  const num = Math.floor(Math.abs(n));
  if (num === 0) return '';
  if (num < 12) {
    return SATUAN_WORDS[num];
  }
  if (num < 20) {
    return `${terbilangInt(num - 10)} belas`.trim();
  }
  if (num < 100) {
    const puluhan = Math.floor(num / 10);
    const sisa = num % 10;
    return `${terbilangInt(puluhan)} puluh ${terbilangInt(sisa)}`.trim();
  }
  if (num < 200) {
    return `seratus ${terbilangInt(num - 100)}`.trim();
  }
  if (num < 1000) {
    const ratusan = Math.floor(num / 100);
    const sisa = num % 100;
    return `${terbilangInt(ratusan)} ratus ${terbilangInt(sisa)}`.trim();
  }
  if (num < 2000) {
    return `seribu ${terbilangInt(num - 1000)}`.trim();
  }
  if (num < 1000000) {
    const ribuan = Math.floor(num / 1000);
    const sisa = num % 1000;
    return `${terbilangInt(ribuan)} ribu ${terbilangInt(sisa)}`.trim();
  }
  if (num < 1000000000) {
    const jutaan = Math.floor(num / 1000000);
    const sisa = num % 1000000;
    return `${terbilangInt(jutaan)} juta ${terbilangInt(sisa)}`.trim();
  }
  if (num < 1000000000000) {
    const miliaran = Math.floor(num / 1000000000);
    const sisa = num % 1000000000;
    return `${terbilangInt(miliaran)} miliar ${terbilangInt(sisa)}`.trim();
  }
  return '';
}

/**
 * Converts a numeric Rupiah amount into Indonesian formal terbilang text.
 * Example: 2860000 -> "Dua juta delapan ratus enam puluh ribu rupiah"
 */
export function terbilangRupiah(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Nol rupiah';
  }
  const raw = terbilangInt(amount).replace(/\s+/g, ' ').trim();
  if (!raw) return 'Nol rupiah';
  const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1);
  return `${capitalized} rupiah`;
}

/**
 * Formats a number in Indonesian Rupiah style matching Gambar 1 ("Rp2.860.000").
 */
export function formatRupiah(amount: number, withPrefix = true): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  const formatted = Math.abs(safe)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = safe < 0 ? '-' : '';
  return withPrefix ? `${sign}Rp${formatted}` : `${sign}${formatted}`;
}

export function calculateRincianRowTotal(nominalSatuan: number, kuantitas: number): number {
  const unit = Number.isFinite(nominalSatuan) ? Math.max(0, nominalSatuan) : 0;
  const qty = Number.isFinite(kuantitas) ? Math.max(0, kuantitas) : 0;
  return Math.round(unit * qty);
}

export function calculateKuitansiTotal(rincian: RincianCalcItem[]): number {
  return rincian.reduce(
    (sum, item) => sum + calculateRincianRowTotal(item.nominalSatuan, item.kuantitas),
    0
  );
}

/**
 * Formats the calculation description column in the Kuitansi table:
 * - If satuan is provided and kuantitas >= 1 (e.g. 430000, 3, 'hari') -> "Rp430.000 x 3 hari"
 * - If satuan is empty and kuantitas === 1 (e.g. 850000, 1, '') -> "Rp850.000"
 */
export function formatRincianFormula(item: RincianCalcItem): {
  nominalText: string;
  multiplierText: string;
  subtotalText: string;
} {
  const nominalText = formatRupiah(item.nominalSatuan);
  const subtotalText = formatRupiah(calculateRincianRowTotal(item.nominalSatuan, item.kuantitas));
  const cleanSatuan = (item.satuan || '').trim();

  if (item.kuantitas === 1 && cleanSatuan === '') {
    return {
      nominalText,
      multiplierText: '',
      subtotalText,
    };
  }

  const multiplierText = cleanSatuan
    ? `x  ${item.kuantitas}  ${cleanSatuan}`
    : `x  ${item.kuantitas}`;

  return {
    nominalText,
    multiplierText,
    subtotalText,
  };
}

export function calculateExpenseReconciliation(
  kuitansiTotal: number,
  expenses: ExpenseCalcItem[]
): {
  totalDocumented: number;
  selisih: number;
  persentaseLengkap: number;
  status: 'Lengkap & Sesuai' | 'Belum Lengkap' | 'Melebihi Kuitansi';
  byCategory: Record<string, number>;
} {
  const byCategory: Record<string, number> = {};
  let totalDocumented = 0;

  for (const exp of expenses) {
    const val = Number.isFinite(exp.nominal) ? Math.max(0, Math.round(exp.nominal)) : 0;
    totalDocumented += val;
    byCategory[exp.kategori] = (byCategory[exp.kategori] || 0) + val;
  }

  const selisih = kuitansiTotal - totalDocumented;
  const persentaseLengkap =
    kuitansiTotal > 0 ? Math.min(100, Math.round((totalDocumented / kuitansiTotal) * 100)) : 0;

  let status: 'Lengkap & Sesuai' | 'Belum Lengkap' | 'Melebihi Kuitansi' = 'Belum Lengkap';
  if (kuitansiTotal > 0 && selisih === 0) {
    status = 'Lengkap & Sesuai';
  } else if (selisih < 0) {
    status = 'Melebihi Kuitansi';
  }

  return {
    totalDocumented,
    selisih,
    persentaseLengkap,
    status,
    byCategory,
  };
}

export function validateKuitansiInput(
  input: {
    atasNama?: string;
    tujuan?: string;
    noSpt?: string;
    untukPengeluaran?: string;
    rincian?: RincianCalcItem[];
    customFieldValues?: Record<string, string>;
  },
  requiredCustomFields: { id: string; label: string; required: boolean }[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input.atasNama || !input.atasNama.trim()) {
    errors.push('Nama penerima (A.n) wajib diisi.');
  }
  if (!input.tujuan || !input.tujuan.trim()) {
    errors.push('Tujuan perjalanan dinas wajib diisi.');
  }
  if (!input.noSpt || !input.noSpt.trim()) {
    errors.push('Nomor SPT wajib diisi.');
  }
  if (!input.untukPengeluaran || !input.untukPengeluaran.trim()) {
    errors.push('Uraian Untuk Pengeluaran wajib diisi.');
  }
  if (!input.rincian || input.rincian.length === 0) {
    errors.push('Minimal harus terdapat 1 rincian biaya perjalanan dinas.');
  } else {
    const total = calculateKuitansiTotal(input.rincian);
    if (total <= 0) {
      errors.push('Total rincian biaya harus lebih besar dari Rp0.');
    }
  }

  for (const field of requiredCustomFields) {
    if (field.required) {
      const val = input.customFieldValues?.[field.id];
      if (!val || !val.trim()) {
        errors.push(`Bidang kustom "${field.label}" wajib diisi.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extracts a Google Spreadsheet ID from either a full Google Sheets URL or a direct ID string.
 */
export function extractSpreadsheetIdFromInput(rawInput: string): string | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Validates a new custom field definition before adding it to the Kuitansi form schema.
 */
export function validateCustomFieldDefinition(
  label: string,
  existingLabels: string[]
): { valid: boolean; error?: string } {
  const clean = (label || '').trim();
  if (!clean) {
    return { valid: false, error: 'Nama/label bidang kustom tidak boleh kosong.' };
  }
  if (clean.length > 48) {
    return { valid: false, error: 'Nama bidang kustom maksimal 48 karakter.' };
  }
  const duplicate = existingLabels.some(
    (item) => item.trim().toLowerCase() === clean.toLowerCase()
  );
  if (duplicate) {
    return { valid: false, error: `Bidang "${clean}" sudah ada pada formulir kuitansi.` };
  }
  return { valid: true };
}

export interface PaperDimensionSpec {
  size: 'A4' | 'F4';
  label: string;
  shortLabel: string;
  widthMm: number;
  heightMm: number;
  widthPx: number;
  minHeightPx: number;
  cssPageSize: string;
  cssPageMargin: string;
}

/**
 * Returns exact physical and pixel dimensions for A4 (210x297mm) and F4/Folio (215x330mm).
 */
export function getPaperDimensions(size: 'A4' | 'F4'): PaperDimensionSpec {
  if (size === 'F4') {
    return {
      size: 'F4',
      label: 'F4 / Folio (215 × 330 mm)',
      shortLabel: 'F4 (215×330mm)',
      widthMm: 215,
      heightMm: 330,
      widthPx: 812,
      minHeightPx: 1247,
      cssPageSize: '215mm 330mm',
      cssPageMargin: '12mm 0mm',
    };
  }
  return {
    size: 'A4',
    label: 'A4 (210 × 297 mm)',
    shortLabel: 'A4 (210×297mm)',
    widthMm: 210,
    heightMm: 297,
    widthPx: 794,
    minHeightPx: 1123,
    cssPageSize: '210mm 297mm',
    cssPageMargin: '10mm 0mm',
  };
}

export type DocumentationPrintGridMode = '1x1' | '1x2' | '1x3' | '1x4' | '2x2' | '2x3' | '2x4';

export interface DocumentationGridDimensions {
  paperSize: 'A4' | 'F4';
  gridMode: DocumentationPrintGridMode;
  paperSpec: PaperDimensionSpec;
  printAreaWidthPx: number;
  printAreaHeightPx: number;
  printAreaWidthMm: number;
  printAreaHeightMm: number;
  cols: number;
  rows: number;
  cellWidthPx: number;
  cellHeightPx: number;
  boxWidthPx: number;
  boxHeightPx: number;
  isHeightConstrained: boolean;
  aspectRatioDisplay: string;
}

/**
 * Calculates exact symmetrical 16:9 photo grid dimensions within the 90% printable area of A4 or F4.
 * Guarantees that F4 Folio uses its taller vertical space (1247px vs 1123px / 297mm vs 267.3mm) appropriately.
 */
export function calculateDocumentationGridDimensions(
  paperSize: 'A4' | 'F4',
  gridMode: DocumentationPrintGridMode,
  headerHeightPx = 95
): DocumentationGridDimensions {
  const paperSpec = getPaperDimensions(paperSize);
  const printAreaWidthPx = Math.round(paperSpec.widthPx * 0.90);
  const printAreaHeightPx = Math.round(paperSpec.minHeightPx * 0.90);
  const printAreaWidthMm = Number((paperSpec.widthMm * 0.90).toFixed(1));
  const printAreaHeightMm = Number((paperSpec.heightMm * 0.90).toFixed(1));

  const [cols, rows] = gridMode.split('x').map(Number);
  const gapPx = 12;

  const totalGapX = (cols - 1) * gapPx;
  const totalGapY = (rows - 1) * gapPx;

  const cellWidthPx = Math.max(80, (printAreaWidthPx - totalGapX) / cols);
  const cellHeightPx = Math.max(80, (printAreaHeightPx - headerHeightPx - totalGapY) / rows);

  const targetRatio = 16 / 9;
  const cellRatio = cellWidthPx / cellHeightPx;
  const isHeightConstrained = cellRatio > targetRatio;

  let boxWidthPx: number;
  let boxHeightPx: number;

  if (isHeightConstrained) {
    boxHeightPx = Math.floor(cellHeightPx);
    boxWidthPx = Math.floor(boxHeightPx * targetRatio);
  } else {
    boxWidthPx = Math.floor(cellWidthPx);
    boxHeightPx = Math.floor(boxWidthPx / targetRatio);
  }

  const aspectRatioDisplay = paperSize === 'F4' ? '1 : 1.535' : '1 : 1.414';

  return {
    paperSize,
    gridMode,
    paperSpec,
    printAreaWidthPx,
    printAreaHeightPx,
    printAreaWidthMm,
    printAreaHeightMm,
    cols,
    rows,
    cellWidthPx: Math.round(cellWidthPx),
    cellHeightPx: Math.round(cellHeightPx),
    boxWidthPx,
    boxHeightPx,
    isHeightConstrained,
    aspectRatioDisplay,
  };
}

/**
 * Computes Euclidean distance between two touch points for 2-finger pinch-to-zoom.
 */
export function calculateTouchDistance(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

/**
 * Computes clamped zoom scale from a two-finger pinch gesture.
 */
export function calculatePinchZoomScale(
  initialScale: number,
  initialDistance: number,
  currentDistance: number,
  minScale = 0.4,
  maxScale = 2.5
): number {
  if (!Number.isFinite(initialDistance) || initialDistance <= 0) {
    return Math.min(maxScale, Math.max(minScale, initialScale));
  }
  const ratio = currentDistance / initialDistance;
  const raw = initialScale * ratio;
  const clamped = Math.min(maxScale, Math.max(minScale, raw));
  return Math.round(clamped * 100) / 100;
}

export interface SignatoryAndKopSettings {
  logoPemprovDataUrl?: string;
  instansiUtama: string;
  namaDinas: string;
  alamatDinasBaris1: string;
  alamatDinasBaris2: string;
  kontakDinas: string;
  jabatanPenggunaAnggaran: string;
  namaPenggunaAnggaran: string;
  nipPenggunaAnggaran: string;
  jabatanBendahara: string;
  namaBendahara: string;
  nipBendahara: string;
}

/**
 * Applies updated official agency header and signatory settings onto a Kuitansi record.
 */
export function applySettingsToKuitansi<T extends Record<string, any>>(
  kuitansi: T,
  settings: SignatoryAndKopSettings
): T {
  return {
    ...kuitansi,
    ...(settings.logoPemprovDataUrl !== undefined
      ? { logoPemprovDataUrl: settings.logoPemprovDataUrl }
      : {}),
    instansiUtama: settings.instansiUtama.trim() || kuitansi.instansiUtama,
    namaDinas: settings.namaDinas.trim() || kuitansi.namaDinas,
    alamatDinasBaris1: settings.alamatDinasBaris1.trim() || kuitansi.alamatDinasBaris1,
    alamatDinasBaris2: settings.alamatDinasBaris2.trim() || kuitansi.alamatDinasBaris2,
    kontakDinas: settings.kontakDinas.trim() || kuitansi.kontakDinas,
    jabatanPenggunaAnggaran:
      settings.jabatanPenggunaAnggaran.trim() || 'Pengguna Anggaran',
    namaPenggunaAnggaran:
      settings.namaPenggunaAnggaran.trim() || kuitansi.namaPenggunaAnggaran,
    nipPenggunaAnggaran:
      settings.nipPenggunaAnggaran.trim() || kuitansi.nipPenggunaAnggaran,
    jabatanBendahara:
      settings.jabatanBendahara.trim() || 'Bendahara Pengeluaran',
    namaBendahara: settings.namaBendahara.trim() || kuitansi.namaBendahara,
    nipBendahara: settings.nipBendahara.trim() || kuitansi.nipBendahara,
  };
}

/**
 * Generates sequential smart batch names for multi-file documentation uploads
 * (e.g. "Foto Kegiatan #1", "Foto Kegiatan #2", or "Dokumen Pendukung #1").
 */
export function generateSmartBatchDocTitle(params: {
  customTitle: string;
  sequenceNumber: number;
  batchSize: number;
  jenisBerkas?: 'Foto Kegiatan' | 'Dokumen Pendukung (PDF/Berkas)';
}): string {
  const cleanTitle = params.customTitle.trim();
  const isPdfDoc = params.jenisBerkas === 'Dokumen Pendukung (PDF/Berkas)';
  const defaultPrefix = isPdfDoc ? 'Dokumen Pendukung' : 'Foto Kegiatan';

  if (!cleanTitle) {
    return `${defaultPrefix} #${params.sequenceNumber}`;
  }
  if (params.batchSize > 1) {
    return `${cleanTitle} — ${defaultPrefix} #${params.sequenceNumber}`;
  }
  return cleanTitle;
}

/**
 * Computes the next 90-degree clockwise rotation angle (0 -> 90 -> 180 -> 270 -> 0).
 */
export function getNextRotationAngle(currentAngle = 0): number {
  const normalized = ((Math.round(currentAngle / 90) * 90) % 360 + 360) % 360;
  return (normalized + 90) % 360;
}

/**
 * Detects effective image orientation ('portrait' | 'landscape' | 'square')
 * accounting for both intrinsic dimensions and any applied 90°/270° rotation.
 */
export function detectEffectiveImageOrientation(
  naturalWidth: number,
  naturalHeight: number,
  rotationAngle = 0
): 'portrait' | 'landscape' | 'square' {
  if (!naturalWidth || !naturalHeight || naturalWidth <= 0 || naturalHeight <= 0) {
    return 'landscape';
  }
  const normalizedAngle = ((Math.round(rotationAngle / 90) * 90) % 360 + 360) % 360;
  const isSwapped = normalizedAngle === 90 || normalizedAngle === 270;
  const effectiveWidth = isSwapped ? naturalHeight : naturalWidth;
  const effectiveHeight = isSwapped ? naturalWidth : naturalHeight;
  const ratio = effectiveWidth / effectiveHeight;

  if (ratio < 0.92) return 'portrait';
  if (ratio > 1.08) return 'landscape';
  return 'square';
}

export interface ExpenseValidationResult {
  valid: boolean;
  errors: string[];
  missingFields: Array<'kategori' | 'namaPengeluaran' | 'nominal' | 'vendorPenyedia'>;
}

/**
 * Strict blocking validation for Bukti Pengeluaran (Nota, Tiket, Invoice Hotel).
 * Ensures Kategori, Uraian Pengeluaran, Nominal (> 0), and Vendor are valid before saving.
 */
export function validateExpenseInput(input: {
  kategori?: string;
  namaPengeluaran?: string;
  nominal?: number;
  vendorPenyedia?: string;
}): ExpenseValidationResult {
  const errors: string[] = [];
  const missingFields: ExpenseValidationResult['missingFields'] = [];

  if (!input.kategori || !input.kategori.trim()) {
    errors.push('Kategori biaya wajib dipilih.');
    missingFields.push('kategori');
  }
  if (!input.namaPengeluaran || !input.namaPengeluaran.trim()) {
    errors.push('Uraian Pengeluaran wajib diisi (contoh: Tiket Speedboat / Invoice Hotel).');
    missingFields.push('namaPengeluaran');
  }
  if (
    typeof input.nominal !== 'number' ||
    !Number.isFinite(input.nominal) ||
    input.nominal <= 0
  ) {
    errors.push('Nominal bukti pengeluaran wajib diisi lebih dari Rp0.');
    missingFields.push('nominal');
  }
  if (input.vendorPenyedia !== undefined && !input.vendorPenyedia.trim()) {
    errors.push('Nama penyedia / vendor wajib diisi.');
    missingFields.push('vendorPenyedia');
  }

  return {
    valid: errors.length === 0,
    errors,
    missingFields,
  };
}

export interface PegawaiCsvRecord {
  id: string;
  nip: string;
  nama: string;
  jabatan?: string;
  pangkatGolongan?: string;
  statusActive?: boolean;
  isPriority?: boolean;
  usageCount?: number;
}

export const PEGAWAI_CSV_HEADERS = [
  'NIP Pegawai',
  'Nama Pegawai',
  'Nama Jabatan',
  'Pangkat Golongan',
  'Status',
  'Prioritas',
] as const;

function escapeCsvCell(value: string): string {
  const clean = (value ?? '').trim();
  if (
    clean.includes(',') ||
    clean.includes(';') ||
    clean.includes('"') ||
    clean.includes('\n') ||
    clean.includes('\r')
  ) {
    return `"${clean.replace(/"/g, '""')}"`;
  }
  return clean;
}

/**
 * Serializes a list of Pegawai records into CSV format with exact columns:
 * NIP Pegawai,Nama Pegawai,Nama Jabatan,Pangkat Golongan,Status,Prioritas
 */
export function serializePegawaiCsv(
  items: PegawaiCsvRecord[],
  includeBom = true
): string {
  const headerLine = PEGAWAI_CSV_HEADERS.join(',');
  const rows = items.map((item) =>
    [
      escapeCsvCell(item.nip || ''),
      escapeCsvCell(item.nama || ''),
      escapeCsvCell(item.jabatan || ''),
      escapeCsvCell(item.pangkatGolongan || ''),
      escapeCsvCell(item.statusActive === false ? 'Non-Aktif' : 'Aktif'),
      escapeCsvCell(item.isPriority ? 'Ya' : 'Tidak'),
    ].join(',')
  );
  const content = [headerLine, ...rows].join('\r\n');
  return includeBom ? `\uFEFF${content}` : content;
}

function splitCsvRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function detectCsvDelimiter(sampleLine: string): string {
  let inQuotes = false;
  let commaCount = 0;
  let semicolonCount = 0;
  let tabCount = 0;

  for (let i = 0; i < sampleLine.length; i++) {
    const ch = sampleLine[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (ch === ',') commaCount++;
      else if (ch === ';') semicolonCount++;
      else if (ch === '\t') tabCount++;
    }
  }

  if (semicolonCount > commaCount && semicolonCount >= tabCount) return ';';
  if (tabCount > commaCount && tabCount > semicolonCount) return '\t';
  return ',';
}

function cleanExcelFormulaText(raw: string): string {
  let cleaned = raw.trim();
  // Handle Excel text formula e.g. ="198307072015031002"
  if (/^="\s*.*\s*"$/.test(cleaned)) {
    cleaned = cleaned.replace(/^="/, '').replace(/"$/, '').trim();
  }
  // Handle leading apostrophe e.g. '198307072015031002
  if (cleaned.startsWith("'")) {
    cleaned = cleaned.slice(1).trim();
  }
  return cleaned;
}

export interface ParsePegawaiCsvResult {
  items: PegawaiCsvRecord[];
  skippedCount: number;
  errors: string[];
}

/**
 * Parses CSV text containing Pegawai data with columns:
 * NIP Pegawai | Nama Pegawai | Nama Jabatan | Pangkat Golongan | Status | Prioritas
 * Automatically supports ',', ';', or Tab delimiters and quoted fields.
 */
export function parsePegawaiCsv(csvText: string): ParsePegawaiCsvResult {
  const normalized = (csvText || '').replace(/^\uFEFF/, '').trim();
  if (!normalized) {
    return {
      items: [],
      skippedCount: 0,
      errors: ['File CSV kosong atau tidak memiliki isi data.'],
    };
  }

  const rawLines = normalized
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (rawLines.length === 0) {
    return {
      items: [],
      skippedCount: 0,
      errors: ['File CSV tidak memiliki baris data.'],
    };
  }

  const delimiter = detectCsvDelimiter(rawLines[0]);
  const firstRowCells = splitCsvRow(rawLines[0], delimiter).map((c) =>
    cleanExcelFormulaText(c)
  );

  // Detect whether first row is a header
  const lowerFirst = firstRowCells.map((c) =>
    c.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  );

  const isHeaderRow = lowerFirst.some(
    (h) =>
      h === 'nip' ||
      h.includes('nip pegawai') ||
      h.includes('nama pegawai') ||
      h.includes('nama jabatan') ||
      h.includes('pangkat') ||
      h.includes('status') ||
      h.includes('prioritas')
  );

  let nipIdx = 0;
  let namaIdx = 1;
  let jabatanIdx = 2;
  let pangkatIdx = 3;
  let statusIdx = 4;
  let prioritasIdx = 5;

  if (isHeaderRow) {
    const foundNip = lowerFirst.findIndex((h) => h.includes('nip'));
    const foundNama = lowerFirst.findIndex(
      (h, idx) =>
        idx !== foundNip &&
        (h.includes('nama pegawai') ||
          h === 'nama' ||
          h.includes('nama lengkap') ||
          (h.includes('nama') && !h.includes('jabatan')))
    );
    const foundJabatan = lowerFirst.findIndex((h) => h.includes('jabatan'));
    const foundPangkat = lowerFirst.findIndex(
      (h) => h.includes('pangkat') || h.includes('golongan')
    );
    const foundStatus = lowerFirst.findIndex((h) => h.includes('status') || h.includes('aktif'));
    const foundPrioritas = lowerFirst.findIndex((h) => h.includes('prioritas') || h.includes('favorit'));

    if (foundNip !== -1) nipIdx = foundNip;
    if (foundNama !== -1) namaIdx = foundNama;
    if (foundJabatan !== -1) jabatanIdx = foundJabatan;
    if (foundPangkat !== -1) pangkatIdx = foundPangkat;
    if (foundStatus !== -1) statusIdx = foundStatus;
    if (foundPrioritas !== -1) prioritasIdx = foundPrioritas;
  }

  const startRow = isHeaderRow ? 1 : 0;
  const items: PegawaiCsvRecord[] = [];
  const errors: string[] = [];
  let skippedCount = 0;

  for (let r = startRow; r < rawLines.length; r++) {
    const cells = splitCsvRow(rawLines[r], delimiter).map((c) =>
      cleanExcelFormulaText(c)
    );

    // Ignore completely blank rows
    if (cells.every((c) => !c)) {
      continue;
    }

    const nip = (cells[nipIdx] || '').trim();
    const nama = (cells[namaIdx] || '').trim();
    const jabatan = (cells[jabatanIdx] || '').trim();
    const pangkatGolongan = (cells[pangkatIdx] || '').trim();
    const statusRaw = (cells[statusIdx] || '').trim().toLowerCase();
    const prioritasRaw = (cells[prioritasIdx] || '').trim().toLowerCase();

    if (!nip && !nama) {
      skippedCount++;
      continue;
    }

    if (!nama || !nip) {
      skippedCount++;
      errors.push(
        `Baris ${r + 1}: NIP Pegawai dan Nama Pegawai wajib terisi keduanya.`
      );
      continue;
    }

    const isNonActive =
      statusRaw.includes('non') ||
      statusRaw.includes('inaktif') ||
      statusRaw.includes('tidak') ||
      statusRaw === '0' ||
      statusRaw === 'false';

    const isPrio =
      prioritasRaw.includes('ya') ||
      prioritasRaw.includes('1') ||
      prioritasRaw.includes('true') ||
      prioritasRaw.includes('prio') ||
      prioritasRaw.includes('favorit');

    items.push({
      id: `peg-csv-${Date.now()}-${r}-${Math.random().toString(36).slice(2, 6)}`,
      nip,
      nama,
      jabatan: jabatan || undefined,
      pangkatGolongan: pangkatGolongan || undefined,
      statusActive: !isNonActive,
      isPriority: isPrio,
    });
  }

  return {
    items,
    skippedCount,
    errors,
  };
}

/**
 * Merges imported Pegawai CSV items into an existing Pegawai list.
 * If an item has the same normalized NIP (or same normalized Nama if NIP matches),
 * updates existing record; otherwise appends as a new record.
 */
export function mergePegawaiList(
  existing: PegawaiCsvRecord[],
  imported: PegawaiCsvRecord[]
): { merged: PegawaiCsvRecord[]; addedCount: number; updatedCount: number } {
  const result = existing.map((item) => ({ ...item }));
  let addedCount = 0;
  let updatedCount = 0;

  for (const incoming of imported) {
    const cleanIncomingNip = incoming.nip.replace(/\s+/g, '').toLowerCase();
    const existingIndex = result.findIndex(
      (e) => e.nip.replace(/\s+/g, '').toLowerCase() === cleanIncomingNip
    );

    if (existingIndex !== -1) {
      const prev = result[existingIndex];
      result[existingIndex] = {
        ...prev,
        nip: incoming.nip,
        nama: incoming.nama,
        jabatan: incoming.jabatan ?? prev.jabatan,
        pangkatGolongan: incoming.pangkatGolongan ?? prev.pangkatGolongan,
        statusActive: incoming.statusActive ?? prev.statusActive ?? true,
        isPriority: incoming.isPriority ?? prev.isPriority ?? false,
      };
      updatedCount++;
    } else {
      result.push({
        statusActive: true,
        isPriority: false,
        ...incoming,
      });
      addedCount++;
    }
  }

  return {
    merged: result,
    addedCount,
    updatedCount,
  };
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/**
 * Formats an ISO YYYY-MM-DD date string or Date object into formal Indonesian government format.
 * Example: '2026-10-15' -> 'Kamis, 15 Oktober 2026;'
 */
export function formatIndonesianFormalDate(dateInput: string | Date, withSemicolon = true): string {
  if (!dateInput) return '';
  let d: Date;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      d = new Date(dateInput);
    }
  } else {
    d = dateInput;
  }

  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  const dayName = DAY_NAMES[d.getDay()];
  const dayNum = d.getDate();
  const monthName = MONTH_NAMES[d.getMonth()];
  const yearNum = d.getFullYear();

  const formatted = `${dayName}, ${dayNum} ${monthName} ${yearNum}`;
  return withSemicolon ? `${formatted};` : formatted;
}

/**
 * Calculates travel duration in days between departure and return dates.
 * Returns formatted text like "3 (tiga) hari;"
 */
export function calculateTravelDuration(
  startDateIsoStr: string,
  endDateIsoStr: string
): { days: number; formattedText: string } {
  if (!startDateIsoStr || !endDateIsoStr) {
    return { days: 1, formattedText: '1 (satu) hari;' };
  }

  const startParts = startDateIsoStr.split('-');
  const endParts = endDateIsoStr.split('-');

  if (startParts.length !== 3 || endParts.length !== 3) {
    return { days: 1, formattedText: '1 (satu) hari;' };
  }

  const start = new Date(
    parseInt(startParts[0], 10),
    parseInt(startParts[1], 10) - 1,
    parseInt(startParts[2], 10)
  );
  const end = new Date(
    parseInt(endParts[0], 10),
    parseInt(endParts[1], 10) - 1,
    parseInt(endParts[2], 10)
  );

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { days: 1, formattedText: '1 (satu) hari;' };
  }

  const startMs = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endMs = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  const diffMs = endMs - startMs;
  const days = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);

  const terbilang = terbilangInt(days) || 'satu';
  return {
    days,
    formattedText: `${days} (${terbilang}) hari;`,
  };
}

/**
 * Formats start and end ISO date strings into Kuitansi travel date range format.
 * Examples:
 * - '2026-04-10', '2026-04-12' -> '10 s.d 12 April 2026'
 * - '2026-04-28', '2026-05-02' -> '28 April s.d 2 Mei 2026'
 * - '2025-12-28', '2026-01-02' -> '28 Desember 2025 s.d 2 Januari 2026'
 * - '2026-04-10', '2026-04-10' -> '10 April 2026'
 */
export function formatKuitansiTravelRange(startDateIso: string, endDateIso: string): string {
  if (!startDateIso) return '';
  if (!endDateIso || startDateIso === endDateIso) {
    const parts = startDateIso.split('-');
    if (parts.length !== 3) return startDateIso;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(d.getTime())) return startDateIso;
    return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  const sParts = startDateIso.split('-');
  const eParts = endDateIso.split('-');
  if (sParts.length !== 3 || eParts.length !== 3) return `${startDateIso} s.d ${endDateIso}`;

  const start = new Date(parseInt(sParts[0], 10), parseInt(sParts[1], 10) - 1, parseInt(sParts[2], 10));
  const end = new Date(parseInt(eParts[0], 10), parseInt(eParts[1], 10) - 1, parseInt(eParts[2], 10));

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return `${startDateIso} s.d ${endDateIso}`;

  const sDay = start.getDate();
  const sMonth = MONTH_NAMES[start.getMonth()];
  const sYear = start.getFullYear();

  const eDay = end.getDate();
  const eMonth = MONTH_NAMES[end.getMonth()];
  const eYear = end.getFullYear();

  if (sYear === eYear && sMonth === eMonth) {
    return `${sDay} s.d ${eDay} ${eMonth} ${eYear}`;
  } else if (sYear === eYear) {
    return `${sDay} ${sMonth} s.d ${eDay} ${eMonth} ${eYear}`;
  } else {
    return `${sDay} ${sMonth} ${sYear} s.d ${eDay} ${eMonth} ${eYear}`;
  }
}




