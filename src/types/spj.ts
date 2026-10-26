export type RincianKategori = 'Uang Harian' | 'Transportasi' | 'Penginapan' | 'Representasi' | 'Lainnya';

export type PaperSize = 'A4' | 'F4';

export type CustomFieldType = 'text' | 'number' | 'date' | 'select';

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  options?: string[]; // used when type === 'select'
  required: boolean;
  showInPrint: boolean;
}

export interface LampiranDokumenItem {
  id: string;
  kuitansiId: string;
  noSpt: string;
  namaDokumen: string;
  jenisDokumen: 'SPT' | 'SPPD' | 'Undangan' | 'Boarding Pass / Tiket' | 'Bill Hotel' | 'Foto Kegiatan' | 'Lainnya';
  namaFile: string;
  mimeType: string;
  ukuranBytes: number;
  dataUrl: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  statusSync: 'Lokal' | 'Tersimpan di Drive & Sheets';
  uploadedAt: string;
}

export interface RincianBiayaItem {
  id: string;
  kategori: RincianKategori;
  uraian: string;
  nominalSatuan: number;
  kuantitas: number;
  satuan: string; // e.g., 'hari', 'malam', '' (empty for lump sum / PP)
}

export interface KuitansiPerjalananDinas {
  id: string;
  logoPemprovDataUrl?: string;
  instansiUtama: string;
  namaDinas: string;
  alamatDinasBaris1: string;
  alamatDinasBaris2: string;
  kontakDinas: string;
  tahunAnggaran: string;
  noKuitansi: string;
  subKegiatan: string;
  sudahTerimaDari: string;
  untukPengeluaran: string;
  atasNama: string;
  nipPenerima: string;
  tujuan: string;
  tanggalPerjalanan: string;
  noSpt: string;
  rincian: RincianBiayaItem[];
  tempatTanggalTtd: string;
  jabatanPenggunaAnggaran?: string;
  namaPenggunaAnggaran: string;
  nipPenggunaAnggaran: string;
  jabatanBendahara?: string;
  namaBendahara: string;
  nipBendahara: string;
  customFieldValues?: Record<string, string>;
  lampiranDokumen?: LampiranDokumenItem[];
  statusSync: 'Tersimpan Lokal' | 'Antrean Auto-Sync' | 'Tersinkronisasi Sheets';
  updatedAt: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface DokumentasiPerjalananItem {
  id: string;
  kuitansiId: string;
  noSpt: string;
  judulKegiatan: string;
  tanggalKegiatan: string;
  waktuKegiatan: string;
  lokasiKegiatan: string;
  keterangan: string;
  pelaksana: string;
  fotoDataUrl: string;
  originalFotoDataUrl?: string;
  scanFilter?: ReceiptScanFilter;
  cropPercent?: number;
  rotationAngle?: number; // 0 | 90 | 180 | 270
  mimeType?: string;
  jenisBerkas?: 'Foto Kegiatan' | 'Dokumen Pendukung (PDF/Berkas)';
  driveFileId?: string;
  driveWebViewLink?: string;
  namaFile: string;
  statusSync: 'Lokal' | 'Tersimpan di Drive & Sheets' | 'Gagal Sinkronisasi';
  syncErrorMessage?: string;
  createdAt: string;
}

export type ReceiptScanFilter =
  | 'original'
  | 'lighten'
  | 'magic'
  | 'grayscale'
  | 'bw'
  | 'bw2';

export interface DokumentasiPengeluaranItem {
  id: string;
  kuitansiId: string;
  noSpt: string;
  kategori: RincianKategori;
  namaPengeluaran: string;
  vendorPenyedia: string;
  tanggalBukti: string;
  nomorBukti: string;
  nominal: number;
  catatan: string;
  fotoBuktiDataUrl: string;
  originalFotoDataUrl?: string;
  scanFilter?: ReceiptScanFilter;
  cropPercent?: number; // 0 | 6 | 12
  rotationAngle?: number; // 0 | 90 | 180 | 270
  mimeType?: string;
  jenisBerkas?: 'Foto Nota/Tiket' | 'Dokumen Invoice (PDF/Berkas)';
  driveFileId?: string;
  driveWebViewLink?: string;
  namaFile: string;
  statusSync: 'Lokal' | 'Tersimpan di Drive & Sheets' | 'Gagal Sinkronisasi';
  syncErrorMessage?: string;
  createdAt: string;
}

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime?: string;
}

export interface WorkspaceConfig {
  spreadsheetId: string;
  spreadsheetUrl: string;
  spreadsheetTitle: string;
  rootFolderId: string;
  docKegiatanFolderId: string;
  docPengeluaranFolderId: string;
  autoSyncEnabled: boolean;
  lastSyncedAt: string | null;
}

export type MobileNavMode = 'contextual' | 'main-only' | 'hidden';

export interface PegawaiItem {
  id: string;
  nip: string;
  nama: string;
  jabatan?: string;
  pangkatGolongan?: string;
  statusActive?: boolean; // default true if true or undefined
  isPriority?: boolean;   // default false if false or undefined
  usageCount?: number;    // count of selection times
}

export interface AppSettings {
  logoPemprovDataUrl?: string;
  instansiUtama: string;
  namaDinas: string;
  alamatDinasBaris1: string;
  alamatDinasBaris2: string;
  kontakDinas: string;
  tahunAnggaranDefault: string;
  subKegiatanDefault: string;
  sudahTerimaDariDefault: string;
  kotaTtdDefault: string;
  jabatanPenggunaAnggaran: string;
  namaPenggunaAnggaran: string;
  nipPenggunaAnggaran: string;
  jabatanPptk?: string;
  namaPptk?: string;
  nipPptk?: string;
  jabatanBendahara: string;
  namaBendahara: string;
  nipBendahara: string;
  namaPelaksanaDefault: string;
  nipPelaksanaDefault: string;
  daftarPegawai?: PegawaiItem[];
  defaultPaperSize: PaperSize;
  mobileNavMode?: MobileNavMode;
}

export interface LaporanPelaksanaItem {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
}

export interface LaporanPerjalananDinas {
  id: string;
  sptId: string;
  noSuratTugas: string;
  yangMenugaskan: string;
  maksudPerjalanan: string;
  tujuanPerjalanan: string;
  tanggalPelaksanaan: string;
  catatanRingkas?: string;
  pelaksanaanKegiatan: string;
  hasilYangDicapai: string;
  kesimpulanDanSaran: string;
  penutup: string;
  tempatTandaTangan: string;
  tanggalTandaTangan: string;
  namaPelaksana: string;
  nipPelaksana: string;
  jabatanPelaksana: string;
  daftarPelaksana?: LaporanPelaksanaItem[];
  modelTandaTangan?: 'grid' | 'daftar';
  googleDocId?: string;
  googleDocUrl?: string;
  updatedAt?: string;
}

export interface SuratTugasPegawai {
  id: string;
  nama: string;
  nip: string;
  pangkatGol: string;
  jabatan: string;
}

export interface SpdPengikutItem {
  id: string;
  nama: string;
  tanggalLahir: string;
  keterangan: string;
}

export interface SpdVisumPersinggahanRow {
  id: string; // 'II' | 'III' | 'IV' | 'V'
  labelRomawi: string; // 'II' | 'III' | 'IV' | 'V'
  // Kolom Kiri: Tiba
  tibaDi: string;
  tibaTgl: string;
  tibaKepala: string;
  tibaNip: string;
  // Kolom Kanan: Berangkat
  berangkatDari: string;
  berangkatKe: string;
  berangkatTgl: string;
  berangkatKepala: string;
  berangkatNip: string;
}

export interface SpdVisumBelakangData {
  // Bagian I: Berangkat dari tempat kedudukan
  berangkatDariAwal?: string;
  berangkatKeAwal?: string;
  berangkatTglAwal?: string;
  berangkatKepalaAwal?: string;
  pejabatNamaAwal?: string;
  pejabatPangkatAwal?: string;
  pejabatNipAwal?: string;

  // Bagian II - V: Persinggahan
  persinggahanList?: SpdVisumPersinggahanRow[];

  // Bagian VI: Tiba di tempat kedudukan
  tibaDiAkhir?: string;
  tibaTglAkhir?: string;
  tibaKepalaAkhir?: string;
  pejabatNamaAkhir?: string;
  pejabatPangkatAkhir?: string;
  pejabatNipAkhir?: string;

  // Bagian VI kanan: Keterangan pemeriksaan
  keteranganPemeriksa?: string;

  // Bagian VII: Catatan
  catatanLainLain?: string;

  // Bagian VIII: Klausul Perhatian
  teksPerhatian?: string;
}

export interface SuratPerjalananDinasData {
  lembarKe?: string;
  kodeNo?: string;
  nomorSpd?: string;
  pptkNama?: string;
  pptkNip?: string;
  tingkatBiaya?: string;
  alatAngkut?: string;
  instansiAnggaran?: string;
  akunAnggaran?: string;
  keteranganLain?: string;
  selectedPegawaiId?: string;
  pengikutList?: SpdPengikutItem[];
  visumBelakang?: SpdVisumBelakangData;
  // Pejabat 1 (Atas): Pengguna Anggaran (PA / KPA)
  paJabatan?: string;
  paNama?: string;
  paNip?: string;
  paPangkat?: string;
  // Pejabat 2 (Bawah): Penandatangan SPT (Kepala Dinas / Plt. / Plh.)
  pejabatSptJabatan?: string;
  pejabatSptNama?: string;
  pejabatSptNip?: string;
  pejabatSptPangkat?: string;
  syncPejabatSptWithSpt?: boolean;
}

export interface SuratPerintahTugas {
  id: string;
  kuitansiId?: string;
  noSpt: string;
  dasarList: string[];
  pegawaiList: SuratTugasPegawai[];
  maksudPerjalanan: string;
  tempatBerangkat: string;
  tempatTujuan: string;
  tanggalBerangkat: string;
  tanggalHarusKembali: string;
  lamanyaPerjalanan: string;
  pembebananAnggaran: string;
  tempatDitetapkan: string;
  tanggalDitetapkan: string;
  statusJabatan?: 'definitive' | 'plt' | 'plh' | 'custom';
  jabatanPenandatangan: string;
  namaPenandatangan: string;
  nipPenandatangan: string;
  pangkatPenandatangan: string;
  urutanTtdPangkatNip?: 'pangkat-dulu' | 'nip-dulu';
  fontSizePt?: number;
  spdData?: SuratPerjalananDinasData;
  spdVisumData?: SpdVisumBelakangData;
  updatedAt?: string;
}



