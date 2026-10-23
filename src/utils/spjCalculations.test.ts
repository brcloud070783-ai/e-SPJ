import test from 'node:test';
import assert from 'node:assert/strict';
import {
  terbilangRupiah,
  formatRupiah,
  calculateRincianRowTotal,
  calculateKuitansiTotal,
  formatRincianFormula,
  calculateExpenseReconciliation,
  validateKuitansiInput,
  extractSpreadsheetIdFromInput,
  validateCustomFieldDefinition,
  getPaperDimensions,
  calculateTouchDistance,
  calculatePinchZoomScale,
  applySettingsToKuitansi,
  generateSmartBatchDocTitle,
  getNextRotationAngle,
  detectEffectiveImageOrientation,
  validateExpenseInput,
  serializePegawaiCsv,
  parsePegawaiCsv,
  mergePegawaiList,
} from './spjCalculations.ts';

test('terbilangRupiah matches Gambar 1 exact string for Rp2.860.000', () => {
  assert.equal(
    terbilangRupiah(2860000),
    'Dua juta delapan ratus enam puluh ribu rupiah'
  );
  assert.equal(terbilangRupiah(1290000), 'Satu juta dua ratus sembilan puluh ribu rupiah');
  assert.equal(terbilangRupiah(850000), 'Delapan ratus lima puluh ribu rupiah');
  assert.equal(terbilangRupiah(720000), 'Tujuh ratus dua puluh ribu rupiah');
  assert.equal(terbilangRupiah(0), 'Nol rupiah');
});

test('formatRupiah formats numbers with dots matching Gambar 1', () => {
  assert.equal(formatRupiah(2860000), 'Rp2.860.000');
  assert.equal(formatRupiah(430000), 'Rp430.000');
  assert.equal(formatRupiah(850000), 'Rp850.000');
  assert.equal(formatRupiah(720000, false), '720.000');
});

test('calculateKuitansiTotal sums Gambar 1 line items accurately', () => {
  const items = [
    { id: '1', uraian: 'Uang harian', nominalSatuan: 430000, kuantitas: 3, satuan: 'hari' },
    { id: '2', uraian: 'Transportasi Tanjung Selor - Tarakan - Nunukan', nominalSatuan: 850000, kuantitas: 1, satuan: '' },
    { id: '3', uraian: 'Hotel Nunukan', nominalSatuan: 360000, kuantitas: 2, satuan: 'malam' },
  ];
  assert.equal(calculateRincianRowTotal(430000, 3), 1290000);
  assert.equal(calculateRincianRowTotal(850000, 1), 850000);
  assert.equal(calculateRincianRowTotal(360000, 2), 720000);
  assert.equal(calculateKuitansiTotal(items), 2860000);
});

test('formatRincianFormula formats unit multipliers and lump-sum transport properly', () => {
  const uangHarian = formatRincianFormula({
    id: '1',
    uraian: 'Uang harian',
    nominalSatuan: 430000,
    kuantitas: 3,
    satuan: 'hari',
  });
  assert.equal(uangHarian.nominalText, 'Rp430.000');
  assert.equal(uangHarian.multiplierText, 'x  3  hari');
  assert.equal(uangHarian.subtotalText, 'Rp1.290.000');

  const transport = formatRincianFormula({
    id: '2',
    uraian: 'Transportasi',
    nominalSatuan: 850000,
    kuantitas: 1,
    satuan: '',
  });
  assert.equal(transport.nominalText, 'Rp850.000');
  assert.equal(transport.multiplierText, '');
  assert.equal(transport.subtotalText, 'Rp850.000');
});

test('calculateExpenseReconciliation reconciles documented expenses against Kuitansi total', () => {
  const expenses = [
    { id: 'e1', kategori: 'Uang Harian', nominal: 1290000 },
    { id: 'e2', kategori: 'Transportasi', nominal: 850000 },
    { id: 'e3', kategori: 'Penginapan', nominal: 720000 },
  ];
  const result = calculateExpenseReconciliation(2860000, expenses);
  assert.equal(result.totalDocumented, 2860000);
  assert.equal(result.selisih, 0);
  assert.equal(result.persentaseLengkap, 100);
  assert.equal(result.status, 'Lengkap & Sesuai');
});

test('validateKuitansiInput validates standard and required custom fields', () => {
  const invalid = validateKuitansiInput({ atasNama: '', tujuan: '' });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.length >= 3);

  const missingCustom = validateKuitansiInput(
    {
      atasNama: 'Bayu Ramadhan',
      tujuan: 'Tanjung Selor - Nunukan (PP)',
      noSpt: '094/39/SPT/UM-Set/DD/I/2026',
      untukPengeluaran: 'Pendampingan Kepala Dinas',
      rincian: [{ id: '1', uraian: 'Uang harian', nominalSatuan: 430000, kuantitas: 3, satuan: 'hari' }],
      customFieldValues: {},
    },
    [{ id: 'cf-sppd', label: 'Nomor SPPD', required: true }]
  );
  assert.equal(missingCustom.valid, false);
  assert.ok(missingCustom.errors.some((e) => e.includes('Nomor SPPD')));

  const valid = validateKuitansiInput(
    {
      atasNama: 'Bayu Ramadhan',
      tujuan: 'Tanjung Selor - Nunukan (PP)',
      noSpt: '094/39/SPT/UM-Set/DD/I/2026',
      untukPengeluaran: 'Pendampingan Kepala Dinas',
      rincian: [{ id: '1', uraian: 'Uang harian', nominalSatuan: 430000, kuantitas: 3, satuan: 'hari' }],
      customFieldValues: { 'cf-sppd': '090/039/SPPD/2026' },
    },
    [{ id: 'cf-sppd', label: 'Nomor SPPD', required: true }]
  );
  assert.equal(valid.valid, true);
  assert.equal(valid.errors.length, 0);
});

test('extractSpreadsheetIdFromInput parses both Google Sheets URLs and direct IDs', () => {
  const fromUrl = extractSpreadsheetIdFromInput(
    'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'
  );
  assert.equal(fromUrl, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  const fromId = extractSpreadsheetIdFromInput('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');
  assert.equal(fromId, '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms');

  assert.equal(extractSpreadsheetIdFromInput(''), null);
  assert.equal(extractSpreadsheetIdFromInput('short'), null);
});

test('validateCustomFieldDefinition prevents empty and duplicate custom field names', () => {
  assert.equal(validateCustomFieldDefinition('', ['Nomor SPPD']).valid, false);
  assert.equal(validateCustomFieldDefinition('nomor sppd', ['Nomor SPPD']).valid, false);
  assert.equal(validateCustomFieldDefinition('Kode Rekening', ['Nomor SPPD']).valid, true);
});

test('getPaperDimensions returns accurate A4 and F4 Folio dimensions', () => {
  const a4 = getPaperDimensions('A4');
  assert.equal(a4.widthMm, 210);
  assert.equal(a4.heightMm, 297);
  assert.equal(a4.cssPageSize, '210mm 297mm');

  const f4 = getPaperDimensions('F4');
  assert.equal(f4.widthMm, 215);
  assert.equal(f4.heightMm, 330);
  assert.equal(f4.cssPageSize, '215mm 330mm');
  assert.ok(f4.minHeightPx > a4.minHeightPx);
});

test('calculateTouchDistance and calculatePinchZoomScale compute 2-finger pinch zoom', () => {
  const dist1 = calculateTouchDistance({ x: 100, y: 100 }, { x: 200, y: 100 });
  assert.equal(dist1, 100);

  const dist2 = calculateTouchDistance({ x: 50, y: 100 }, { x: 200, y: 100 });
  assert.equal(dist2, 150);

  assert.equal(calculatePinchZoomScale(1.0, dist1, dist2), 1.5);
  assert.equal(calculatePinchZoomScale(1.0, 100, 30), 0.4); // clamped to min 0.4
  assert.equal(calculatePinchZoomScale(1.0, 100, 400), 2.5); // clamped to max 2.5
});

test('applySettingsToKuitansi updates signatory officials and agency header cleanly', () => {
  const updated = applySettingsToKuitansi(
    {
      instansiUtama: 'PEMERINTAH PROVINSI KALIMANTAN UTARA',
      namaDinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
      alamatDinasBaris1: 'Alamat Lama 1',
      alamatDinasBaris2: 'Alamat Lama 2',
      kontakDinas: 'Kontak Lama',
      jabatanPenggunaAnggaran: 'Pengguna Anggaran',
      namaPenggunaAnggaran: 'Pejabat Lama',
      nipPenggunaAnggaran: '111',
      jabatanBendahara: 'Bendahara Pengeluaran',
      namaBendahara: 'Bendahara Lama',
      nipBendahara: '222',
    },
    {
      instansiUtama: 'PEMERINTAH PROVINSI KALIMANTAN UTARA',
      namaDinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
      alamatDinasBaris1: 'Jalan Kol. Soetadji No. 009',
      alamatDinasBaris2: 'Tanjung Selor',
      kontakDinas: 'disdikbud.kaltaraprov.go.id',
      jabatanPenggunaAnggaran: 'Kuasa Pengguna Anggaran',
      namaPenggunaAnggaran: 'Dr. H. Ahmad Fauzi, M.Pd.',
      nipPenggunaAnggaran: '197501012005011002',
      jabatanBendahara: 'Bendahara Pengeluaran Pembantu',
      namaBendahara: 'Siti Rahmawati, S.E.',
      nipBendahara: '199002022019032005',
    }
  );
  assert.equal(updated.jabatanPenggunaAnggaran, 'Kuasa Pengguna Anggaran');
  assert.equal(updated.namaPenggunaAnggaran, 'Dr. H. Ahmad Fauzi, M.Pd.');
  assert.equal(updated.nipPenggunaAnggaran, '197501012005011002');
  assert.equal(updated.jabatanBendahara, 'Bendahara Pengeluaran Pembantu');
  assert.equal(updated.namaBendahara, 'Siti Rahmawati, S.E.');
  assert.equal(updated.nipBendahara, '199002022019032005');
});

test('generateSmartBatchDocTitle generates sequential Foto Kegiatan #N names automatically', () => {
  assert.equal(
    generateSmartBatchDocTitle({
      customTitle: '',
      sequenceNumber: 1,
      batchSize: 3,
      jenisBerkas: 'Foto Kegiatan',
    }),
    'Foto Kegiatan #1'
  );
  assert.equal(
    generateSmartBatchDocTitle({
      customTitle: '',
      sequenceNumber: 2,
      batchSize: 3,
      jenisBerkas: 'Foto Kegiatan',
    }),
    'Foto Kegiatan #2'
  );
  assert.equal(
    generateSmartBatchDocTitle({
      customTitle: 'Monitoring SMAN 1',
      sequenceNumber: 3,
      batchSize: 3,
      jenisBerkas: 'Foto Kegiatan',
    }),
    'Monitoring SMAN 1 — Foto Kegiatan #3'
  );
});

test('getNextRotationAngle and detectEffectiveImageOrientation handle 90-degree rotations accurately', () => {
  assert.equal(getNextRotationAngle(0), 90);
  assert.equal(getNextRotationAngle(90), 180);
  assert.equal(getNextRotationAngle(180), 270);
  assert.equal(getNextRotationAngle(270), 0);

  // Landscape photo (1600x900) rotated 90° becomes portrait
  assert.equal(detectEffectiveImageOrientation(1600, 900, 0), 'landscape');
  assert.equal(detectEffectiveImageOrientation(1600, 900, 90), 'portrait');
  assert.equal(detectEffectiveImageOrientation(1600, 900, 180), 'landscape');
  assert.equal(detectEffectiveImageOrientation(1600, 900, 270), 'portrait');
});

test('validateExpenseInput enforces blocking validation on required expense fields', () => {
  const emptyResult = validateExpenseInput({
    kategori: '',
    namaPengeluaran: '   ',
    nominal: 0,
    vendorPenyedia: '',
  });
  assert.equal(emptyResult.valid, false);
  assert.ok(emptyResult.missingFields.includes('kategori'));
  assert.ok(emptyResult.missingFields.includes('namaPengeluaran'));
  assert.ok(emptyResult.missingFields.includes('nominal'));
  assert.ok(emptyResult.missingFields.includes('vendorPenyedia'));

  const validResult = validateExpenseInput({
    kategori: 'Transportasi',
    namaPengeluaran: 'Tiket Speedboat Kaltara Express',
    nominal: 850000,
    vendorPenyedia: 'Kaltara Express',
  });
  assert.equal(validResult.valid, true);
  assert.equal(validResult.errors.length, 0);
});

test('serializePegawaiCsv and parsePegawaiCsv roundtrip 4 columns (NIP Pegawai, Nama Pegawai, Nama Jabatan, Pangkat Golongan)', () => {
  const sample = [
    {
      id: 'p1',
      nip: '198307072015031002',
      nama: 'Bayu Ramadhan',
      jabatan: 'Analis Perencanaan & Anggaran',
      pangkatGolongan: 'Penata Muda Tk. I (III/b)',
    },
    {
      id: 'p2',
      nip: '197405272007011010',
      nama: 'Hasanuddin, S.Pd., M.Si',
      jabatan: 'Pengguna Anggaran',
      pangkatGolongan: 'Pembina Tk. I (IV/b)',
    },
  ];

  const csv = serializePegawaiCsv(sample, true);
  assert.ok(csv.includes('NIP Pegawai,Nama Pegawai,Nama Jabatan,Pangkat Golongan'));
  assert.ok(csv.includes('"Hasanuddin, S.Pd., M.Si"'));

  const parsed = parsePegawaiCsv(csv);
  assert.equal(parsed.errors.length, 0);
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[0].nip, '198307072015031002');
  assert.equal(parsed.items[0].nama, 'Bayu Ramadhan');
  assert.equal(parsed.items[0].jabatan, 'Analis Perencanaan & Anggaran');
  assert.equal(parsed.items[0].pangkatGolongan, 'Penata Muda Tk. I (III/b)');
  assert.equal(parsed.items[1].nama, 'Hasanuddin, S.Pd., M.Si');

  // Also test semicolon-separated CSV from Indonesian Excel
  const excelSemicolonCsv = [
    'NIP Pegawai;Nama Pegawai;Nama Jabatan;Pangkat Golongan',
    "'199203042018021001;Kevin Albertus PS, A.Md.;Bendahara Pengeluaran;Penata Muda (III/a)",
  ].join('\r\n');
  const parsedExcel = parsePegawaiCsv(excelSemicolonCsv);
  assert.equal(parsedExcel.items.length, 1);
  assert.equal(parsedExcel.items[0].nip, '199203042018021001');
  assert.equal(parsedExcel.items[0].nama, 'Kevin Albertus PS, A.Md.');
  assert.equal(parsedExcel.items[0].jabatan, 'Bendahara Pengeluaran');
  assert.equal(parsedExcel.items[0].pangkatGolongan, 'Penata Muda (III/a)');

  const merged = mergePegawaiList(sample, parsedExcel.items);
  assert.equal(merged.addedCount, 1);
  assert.equal(merged.updatedCount, 0);
  assert.equal(merged.merged.length, 3);
});




