import {
  KuitansiPerjalananDinas,
  DokumentasiPerjalananItem,
  DokumentasiPengeluaranItem,
  CustomFieldDefinition,
  AppSettings,
  PegawaiItem,
  SuratPerintahTugas,
} from '../types/spj';

export const INITIAL_DAFTAR_PEGAWAI: PegawaiItem[] = [
  {
    id: 'peg-1',
    nip: '198307072015031002',
    nama: 'Bayu Ramadhan',
    jabatan: 'Analis Perencanaan & Anggaran',
    pangkatGolongan: 'Penata Muda Tk. I (III/b)',
  },
  {
    id: 'peg-2',
    nip: '197405272007011010',
    nama: 'Hasanuddin, S.Pd., M.Si',
    jabatan: 'Pengguna Anggaran',
    pangkatGolongan: 'Pembina Tk. I (IV/b)',
  },
  {
    id: 'peg-3',
    nip: '199203042018021001',
    nama: 'Kevin Albertus PS, A.Md.',
    jabatan: 'Bendahara Pengeluaran',
    pangkatGolongan: 'Penata Muda (III/a)',
  },
  {
    id: 'peg-4',
    nip: '197501012005011002',
    nama: 'Dr. H. Ahmad Fauzi, M.Pd.',
    jabatan: 'Kepala Bidang Pembinaan SMA',
    pangkatGolongan: 'Pembina (IV/a)',
  },
  {
    id: 'peg-5',
    nip: '199002022019032005',
    nama: 'Siti Rahmawati, S.E.',
    jabatan: 'Pengelola Keuangan',
    pangkatGolongan: 'Penata (III/c)',
  },
];

export const INITIAL_APP_SETTINGS: AppSettings = {
  logoPemprovDataUrl: '',
  instansiUtama: 'PEMERINTAH PROVINSI KALIMANTAN UTARA',
  namaDinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  alamatDinasBaris1: 'Jalan Kol. Soetadji Nomor 009 RT. 095 (Gedung Gabungan Dinas 2, Lantai 1),',
  alamatDinasBaris2: 'Tanjung Selor, Bulungan, Kalimantan Utara 77212 Telepon Seluler 082352465546',
  kontakDinas: 'Laman http://disdikbud.kaltaraprov.go.id, Pos-el kaltara.pendidikan@gmail.com',
  tahunAnggaranDefault: '2026',
  subKegiatanDefault:
    '1.01.02.1.01.0060 - 5.1.02.04.001.00001 - (Koordinasi, Perencanaan, Supervisi dan Evaluasi Layanan di Bidang Pendidikan )',
  sudahTerimaDariDefault:
    'Bendahara Pengeluaran Dinas Pendidikan dan Kebudayaan Provinsi Kalimantan Utara',
  kotaTtdDefault: 'Tanjung Selor',
  jabatanPenggunaAnggaran: 'Pengguna Anggaran',
  namaPenggunaAnggaran: 'Hasanuddin, S.Pd., M.Si',
  nipPenggunaAnggaran: '197405272007011010',
  jabatanPptk: 'Pejabat Pelaksana Teknis Kegiatan (PPTK)',
  namaPptk: 'Dr. H. Ahmad Fauzi, M.Pd.',
  nipPptk: '197501012005011002',
  jabatanBendahara: 'Bendahara Pengeluaran',
  namaBendahara: 'Kevin Albertus PS, A.Md.',
  nipBendahara: '199203042018021001',
  namaPelaksanaDefault: 'Bayu Ramadhan',
  nipPelaksanaDefault: '198307072015031002',
  daftarPegawai: INITIAL_DAFTAR_PEGAWAI,
  defaultPaperSize: 'A4',
  mobileNavMode: 'contextual',
};

function createSvgDataUri(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const INITIAL_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    id: 'cf-no-sppd',
    label: 'Nomor SPPD',
    type: 'text',
    placeholder: 'Contoh: 090/039/SPPD/DISDIKBUD/I/2026',
    required: false,
    showInPrint: true,
  },
  {
    id: 'cf-pangkat-gol',
    label: 'Pangkat / Golongan',
    type: 'select',
    options: [
      'Penata Muda (III/a)',
      'Penata Muda Tk. I (III/b)',
      'Penata (III/c)',
      'Penata Tk. I (III/d)',
      'Pembina (IV/a)',
      'Pembina Tk. I (IV/b)',
    ],
    required: false,
    showInPrint: false,
  },
];

export const SAMPLE_DOC_PHOTO_1 = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="800" height="520">
  <defs>
    <linearGradient id="roomBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <rect width="800" height="520" fill="url(#roomBg)"/>
  <!-- Window light -->
  <rect x="50" y="40" width="220" height="190" rx="6" fill="#bae6fd" stroke="#94a3b8" stroke-width="4"/>
  <line x1="160" y1="40" x2="160" y2="230" stroke="#94a3b8" stroke-width="4"/>
  <line x1="50" y1="135" x2="270" y2="135" stroke="#94a3b8" stroke-width="4"/>
  <!-- Whiteboard / Banner -->
  <rect x="310" y="42" width="440" height="130" rx="6" fill="#0f172a"/>
  <text x="530" y="82" font-family="sans-serif" font-size="16" font-weight="bold" fill="#facc15" text-anchor="middle">SUPERVISI &amp; EVALUASI LAYANAN PENDIDIKAN</text>
  <text x="530" y="108" font-family="sans-serif" font-size="13" fill="#ffffff" text-anchor="middle">Tindak Lanjut Temuan BPK Penggunaan Anggaran Sekolah</text>
  <text x="530" y="134" font-family="sans-serif" font-size="12" fill="#94a3b8" text-anchor="middle">Kabupaten Nunukan · 01 April 2026</text>
  <!-- Conference Table -->
  <polygon points="100,360 700,360 760,480 40,480" fill="#78350f"/>
  <rect x="40" y="480" width="720" height="18" fill="#451a03"/>
  <!-- People Silhouettes & Laptops -->
  <circle cx="240" cy="260" r="34" fill="#334155"/>
  <path d="M185,360 C185,310 295,310 295,360 Z" fill="#0284c7"/>
  <circle cx="400" cy="252" r="36" fill="#1e293b"/>
  <path d="M340,360 C340,305 460,305 460,360 Z" fill="#854d0e"/>
  <circle cx="560" cy="260" r="34" fill="#334155"/>
  <path d="M505,360 C505,310 615,310 615,360 Z" fill="#0f766e"/>
  <!-- Laptops & Folders on table -->
  <rect x="220" y="340" width="70" height="42" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
  <rect x="370" y="380" width="90" height="55" rx="3" fill="#fef08a" stroke="#ca8a04" stroke-width="2"/>
  <rect x="520" y="342" width="70" height="42" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
  <!-- Timestamp Watermark -->
  <rect x="24" y="454" width="350" height="42" rx="6" fill="#0f172a" fill-opacity="0.82"/>
  <text x="40" y="474" font-family="monospace" font-size="12" fill="#f8fafc">01 Apr 2026 09:30 WITA · Kab. Nunukan</text>
  <text x="40" y="490" font-family="monospace" font-size="11" fill="#38bdf8">SPT: 094/39/SPT/UM-Set/DD/I/2026</text>
</svg>
`);

export const SAMPLE_DOC_PHOTO_2 = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" width="800" height="520">
  <rect width="800" height="520" fill="#f8fafc"/>
  <!-- Bookshelf / Archive Cabinet -->
  <rect x="60" y="50" width="240" height="330" rx="6" fill="#cbd5e1" stroke="#64748b" stroke-width="3"/>
  <line x1="60" y1="150" x2="300" y2="150" stroke="#64748b" stroke-width="3"/>
  <line x1="60" y1="250" x2="300" y2="250" stroke="#64748b" stroke-width="3"/>
  <rect x="80" y="75" width="28" height="72" fill="#0284c7"/>
  <rect x="114" y="75" width="28" height="72" fill="#0f766e"/>
  <rect x="148" y="75" width="28" height="72" fill="#b45309"/>
  <rect x="80" y="175" width="32" height="72" fill="#1d4ed8"/>
  <rect x="118" y="175" width="32" height="72" fill="#dc2626"/>
  <!-- Verification Desk Card -->
  <rect x="340" y="60" width="400" height="320" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="340" y="60" width="400" height="54" rx="10" fill="#0f172a"/>
  <text x="540" y="93" font-family="sans-serif" font-size="15" font-weight="bold" fill="#ffffff" text-anchor="middle">LEMBAR VERIFIKASI ANGGARAN SEKOLAH</text>
  <rect x="372" y="140" width="180" height="14" rx="4" fill="#334155"/>
  <rect x="372" y="170" width="320" height="10" rx="3" fill="#94a3b8"/>
  <rect x="372" y="192" width="290" height="10" rx="3" fill="#94a3b8"/>
  <rect x="372" y="214" width="310" height="10" rx="3" fill="#94a3b8"/>
  <rect x="372" y="254" width="160" height="44" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
  <text x="452" y="281" font-family="sans-serif" font-size="13" font-weight="bold" fill="#15803d" text-anchor="middle">TERVERIFIKASI</text>
  <!-- Timestamp Watermark -->
  <rect x="24" y="454" width="365" height="42" rx="6" fill="#0f172a" fill-opacity="0.82"/>
  <text x="40" y="474" font-family="monospace" font-size="12" fill="#f8fafc">02 Apr 2026 14:15 WITA · Satuan Pendidikan</text>
  <text x="40" y="490" font-family="monospace" font-size="11" fill="#38bdf8">Pelaksana: Bayu Ramadhan</text>
</svg>
`);

export const SAMPLE_SPT_DOC = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <rect width="600" height="420" fill="#f1f5f9"/>
  <rect x="60" y="24" width="480" height="372" rx="8" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <rect x="60" y="24" width="480" height="54" rx="8" fill="#1e293b"/>
  <text x="300" y="50" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff" text-anchor="middle">SURAT PERINTAH TUGAS (SPT)</text>
  <text x="300" y="68" font-family="monospace" font-size="12" fill="#93c5fd" text-anchor="middle">Nomor: 094/39/SPT/UM-Set/DD/I/2026</text>
  <text x="90" y="114" font-family="sans-serif" font-size="12" fill="#475569">Dasar Penugasan</text>
  <text x="230" y="114" font-family="sans-serif" font-size="12" fill="#0f172a">: DPA Disdikbud Prov. Kalimantan Utara TA 2026</text>
  <text x="90" y="142" font-family="sans-serif" font-size="12" fill="#475569">Ditugaskan Kepada</text>
  <text x="230" y="142" font-family="sans-serif" font-size="13" font-weight="bold" fill="#0f172a">: Bayu Ramadhan (NIP 198307072015031002)</text>
  <text x="90" y="170" font-family="sans-serif" font-size="12" fill="#475569">Tujuan Dinas</text>
  <text x="230" y="170" font-family="sans-serif" font-size="12" fill="#0f172a">: Tanjung Selor - Nunukan (PP)</text>
  <text x="90" y="198" font-family="sans-serif" font-size="12" fill="#475569">Tanggal Dinas</text>
  <text x="230" y="198" font-family="sans-serif" font-size="12" fill="#0f172a">: 01 s.d 03 April 2026</text>
  <rect x="350" y="290" width="160" height="58" rx="6" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="430" y="316" font-family="sans-serif" font-size="12" font-weight="bold" fill="#15803d" text-anchor="middle">DOKUMEN PENDUKUNG</text>
  <text x="430" y="334" font-family="monospace" font-size="11" fill="#166534" text-anchor="middle">TERLAMPIR DI SPJ</text>
</svg>
`);

export const SAMPLE_RECEIPT_TRANSPORT = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <rect width="600" height="420" fill="#e2e8f0"/>
  <rect x="50" y="34" width="500" height="352" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <rect x="50" y="34" width="500" height="62" rx="10" fill="#0284c7"/>
  <text x="80" y="64" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">TIKET TRANSPORTASI LAUT / SPEEDBOAT PP</text>
  <text x="80" y="83" font-family="monospace" font-size="12" fill="#e0f2fe">RUTE: TANJUNG SELOR - TARAKAN - NUNUKAN (PP)</text>
  <text x="80" y="132" font-family="sans-serif" font-size="13" fill="#475569">Nama Penumpang</text>
  <text x="240" y="132" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">: Bayu Ramadhan</text>
  <text x="80" y="162" font-family="sans-serif" font-size="13" fill="#475569">Tanggal Perjalanan</text>
  <text x="240" y="162" font-family="sans-serif" font-size="13" fill="#0f172a">: 01 s.d 03 April 2026</text>
  <text x="80" y="192" font-family="sans-serif" font-size="13" fill="#475569">No. Tiket / Boarding</text>
  <text x="240" y="192" font-family="monospace" font-size="13" fill="#0f172a">: SB-KTR-2026-040188</text>
  <line x1="80" y1="220" x2="520" y2="220" stroke="#cbd5e1" stroke-dasharray="6,4" stroke-width="2"/>
  <text x="80" y="260" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">TOTAL TARIF (PP)</text>
  <text x="520" y="262" font-family="monospace" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="end">Rp850.000</text>
  <rect x="370" y="294" width="145" height="46" rx="6" fill="none" stroke="#16a34a" stroke-width="3"/>
  <text x="442" y="322" font-family="sans-serif" font-size="15" font-weight="bold" fill="#16a34a" text-anchor="middle">LUNAS / PAID</text>
</svg>
`);

export const SAMPLE_RECEIPT_HOTEL = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <rect width="600" height="420" fill="#e2e8f0"/>
  <rect x="50" y="34" width="500" height="352" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <rect x="50" y="34" width="500" height="62" rx="10" fill="#0f172a"/>
  <text x="80" y="64" font-family="sans-serif" font-size="16" font-weight="bold" fill="#facc15">HOTEL NUNUKAN — GUEST FOLIO INVOICE</text>
  <text x="80" y="83" font-family="monospace" font-size="12" fill="#cbd5e1">KABUPATEN NUNUKAN, KALIMANTAN UTARA</text>
  <text x="80" y="132" font-family="sans-serif" font-size="13" fill="#475569">Nama Tamu</text>
  <text x="240" y="132" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">: Bayu Ramadhan</text>
  <text x="80" y="160" font-family="sans-serif" font-size="13" fill="#475569">Check-In / Check-Out</text>
  <text x="240" y="160" font-family="sans-serif" font-size="13" fill="#0f172a">: 01 Apr 2026 – 03 Apr 2026 (2 Malam)</text>
  <text x="80" y="188" font-family="sans-serif" font-size="13" fill="#475569">Tarif Kamar</text>
  <text x="240" y="188" font-family="monospace" font-size="13" fill="#0f172a">: Rp360.000 x 2 malam</text>
  <line x1="80" y1="220" x2="520" y2="220" stroke="#cbd5e1" stroke-dasharray="6,4" stroke-width="2"/>
  <text x="80" y="260" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">TOTAL PEMBAYARAN</text>
  <text x="520" y="262" font-family="monospace" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="end">Rp720.000</text>
  <rect x="370" y="294" width="145" height="46" rx="6" fill="none" stroke="#dc2626" stroke-width="3"/>
  <text x="442" y="322" font-family="sans-serif" font-size="15" font-weight="bold" fill="#dc2626" text-anchor="middle">PAID / STAMPED</text>
</svg>
`);

export const SAMPLE_RECEIPT_HARIAN = createSvgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420" width="600" height="420">
  <rect width="600" height="420" fill="#e2e8f0"/>
  <rect x="50" y="34" width="500" height="352" rx="10" fill="#ffffff" stroke="#94a3b8" stroke-width="2"/>
  <rect x="50" y="34" width="500" height="62" rx="10" fill="#047857"/>
  <text x="80" y="64" font-family="sans-serif" font-size="16" font-weight="bold" fill="#ffffff">DAFTAR PENERIMAAN UANG HARIAN SPPD</text>
  <text x="80" y="83" font-family="monospace" font-size="12" fill="#d1fae5">DISDIKBUD PROVINSI KALIMANTAN UTARA · TA 2026</text>
  <text x="80" y="132" font-family="sans-serif" font-size="13" fill="#475569">Nama Pelaksana</text>
  <text x="240" y="132" font-family="sans-serif" font-size="14" font-weight="bold" fill="#0f172a">: Bayu Ramadhan</text>
  <text x="80" y="160" font-family="sans-serif" font-size="13" fill="#475569">Durasi Dinas</text>
  <text x="240" y="160" font-family="sans-serif" font-size="13" fill="#0f172a">: 3 Hari (01 s.d 03 April 2026)</text>
  <text x="80" y="188" font-family="sans-serif" font-size="13" fill="#475569">Perhitungan</text>
  <text x="240" y="188" font-family="monospace" font-size="13" fill="#0f172a">: Rp430.000 x 3 hari</text>
  <line x1="80" y1="220" x2="520" y2="220" stroke="#cbd5e1" stroke-dasharray="6,4" stroke-width="2"/>
  <text x="80" y="260" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155">JUMLAH DITERIMA</text>
  <text x="520" y="262" font-family="monospace" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="end">Rp1.290.000</text>
  <rect x="370" y="294" width="145" height="46" rx="6" fill="none" stroke="#047857" stroke-width="3"/>
  <text x="442" y="322" font-family="sans-serif" font-size="14" font-weight="bold" fill="#047857" text-anchor="middle">DITERIMA PENUH</text>
</svg>
`);

export const INITIAL_KUITANSI_LIST: KuitansiPerjalananDinas[] = [
  {
    id: 'kui-2026-001',
    instansiUtama: 'PEMERINTAH PROVINSI KALIMANTAN UTARA',
    namaDinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
    alamatDinasBaris1: 'Jalan Kol. Soetadji Nomor 009 RT. 095 (Gedung Gabungan Dinas 2, Lantai 1),',
    alamatDinasBaris2: 'Tanjung Selor, Bulungan, Kalimantan Utara 77212 Telepon Seluler 082352465546',
    kontakDinas: 'Laman http://disdikbud.kaltaraprov.go.id, Pos-el kaltara.pendidikan@gmail.com',
    tahunAnggaran: '2026',
    noKuitansi: '',
    subKegiatan:
      '1.01.02.1.01.0078 - 5.1.02.04.001.00001 - (Penyelenggaraan Proses Belajar bagi Peserta Didik)',
    sudahTerimaDari:
      'Bendahara Pengeluaran Dinas Pendidikan dan Kebudayaan Provinsi Kalimantan Utara',
    untukPengeluaran:
      'Pendampingan Kepala Dinas dalam rangka tindak lanjut temuan BPK terkait penggunaan anggaran sekolah pada satuan pendidikan di Kabupaten Nunukan',
    atasNama: 'Bayu Ramadhan',
    nipPenerima: '198307072015031002',
    tujuan: 'Tanjung Selor - Nunukan (PP)',
    tanggalPerjalanan: '01 s.d 03 April 2026',
    noSpt: '094/39/SPT/UM-Set/DD/I/2026',
    rincian: [
      {
        id: 'r-1',
        kategori: 'Uang Harian',
        uraian: 'Uang harian',
        nominalSatuan: 430000,
        kuantitas: 3,
        satuan: 'hari',
      },
      {
        id: 'r-2',
        kategori: 'Transportasi',
        uraian: 'Transportasi Tanjung Selor - Tarakan - Nunukan',
        nominalSatuan: 850000,
        kuantitas: 1,
        satuan: '',
      },
      {
        id: 'r-3',
        kategori: 'Penginapan',
        uraian: 'Hotel Nunukan',
        nominalSatuan: 360000,
        kuantitas: 2,
        satuan: 'malam',
      },
    ],
    tempatTanggalTtd: 'Tanjung Selor, 06 April 2026',
    jabatanPenggunaAnggaran: 'Pengguna Anggaran',
    namaPenggunaAnggaran: 'Hasanuddin, S.Pd., M.Si',
    nipPenggunaAnggaran: '197405272007011010',
    jabatanBendahara: 'Bendahara Pengeluaran',
    namaBendahara: 'Kevin Albertus PS, A.Md.',
    nipBendahara: '199203042018021001',
    customFieldValues: {
      'cf-no-sppd': '090/039/SPPD/DISDIKBUD/I/2026',
      'cf-pangkat-gol': 'Penata (III/c)',
    },
    lampiranDokumen: [
      {
        id: 'lamp-spt-001',
        kuitansiId: 'kui-2026-001',
        noSpt: '094/39/SPT/UM-Set/DD/I/2026',
        namaDokumen: 'Surat Perintah Tugas (SPT) Kabupaten Nunukan',
        jenisDokumen: 'SPT',
        namaFile: 'SPT_094_39_Bayu_Ramadhan_Nunukan.pdf',
        mimeType: 'application/pdf',
        ukuranBytes: 245800,
        dataUrl: SAMPLE_SPT_DOC,
        statusSync: 'Lokal',
        uploadedAt: '2026-04-01T08:00:00.000Z',
      },
    ],
    statusSync: 'Tersimpan Lokal',
    updatedAt: '2026-04-06T09:00:00.000Z',
  },
];

export const INITIAL_DOKUMENTASI_PERJALANAN: DokumentasiPerjalananItem[] = [
  {
    id: 'doc-keg-001',
    kuitansiId: 'kui-2026-001',
    noSpt: '094/39/SPT/UM-Set/DD/I/2026',
    judulKegiatan: 'Pendampingan & Koordinasi Tindak Lanjut Temuan BPK di Satuan Pendidikan Nunukan',
    tanggalKegiatan: '2026-04-01',
    waktuKegiatan: '09:30 WITA',
    lokasiKegiatan: 'Cabang Dinas Pendidikan & Satuan Pendidikan Kab. Nunukan',
    keterangan:
      'Mendampingi Kepala Dinas Pendidikan dan Kebudayaan Prov. Kaltara dalam rapat koordinasi evaluasi penggunaan anggaran sekolah bersama kepala satuan pendidikan di Kabupaten Nunukan.',
    pelaksana: 'Bayu Ramadhan',
    fotoDataUrl: SAMPLE_DOC_PHOTO_1,
    mimeType: 'image/png',
    jenisBerkas: 'Foto Kegiatan',
    namaFile: 'dokumentasi_pendampingan_nunukan_01apr2026.png',
    statusSync: 'Lokal',
    createdAt: '2026-04-01T09:30:00.000Z',
  },
  {
    id: 'doc-keg-002',
    kuitansiId: 'kui-2026-001',
    noSpt: '094/39/SPT/UM-Set/DD/I/2026',
    judulKegiatan: 'Verifikasi Dokumen SPJ & Buku Kas Penggunaan Anggaran Sekolah',
    tanggalKegiatan: '2026-04-02',
    waktuKegiatan: '14:15 WITA',
    lokasiKegiatan: 'SMAN 1 Nunukan, Kabupaten Nunukan',
    keterangan:
      'Pemeriksaan kelengkapan bukti pertanggungjawaban penggunaan dana BOS/BOP dan rekonsiliasi tindak lanjut atas temuan pemeriksaan BPK.',
    pelaksana: 'Bayu Ramadhan',
    fotoDataUrl: SAMPLE_DOC_PHOTO_2,
    mimeType: 'image/png',
    jenisBerkas: 'Foto Kegiatan',
    namaFile: 'verifikasi_dokumen_sekolah_nunukan_02apr2026.png',
    statusSync: 'Lokal',
    createdAt: '2026-04-02T14:15:00.000Z',
  },
];

export const INITIAL_DOKUMENTASI_PENGELUARAN: DokumentasiPengeluaranItem[] = [
  {
    id: 'exp-001',
    kuitansiId: 'kui-2026-001',
    noSpt: '094/39/SPT/UM-Set/DD/I/2026',
    kategori: 'Uang Harian',
    namaPengeluaran: 'Uang Harian Perjalanan Dinas (3 Hari x Rp430.000)',
    vendorPenyedia: 'Bendahara Pengeluaran Disdikbud Prov. Kaltara',
    tanggalBukti: '2026-04-03',
    nomorBukti: 'UH-SPPD/094/IV/2026',
    nominal: 1290000,
    catatan: 'Uang harian perjalanan dinas dalam provinsi ke Kabupaten Nunukan selama 3 hari (01 s.d 03 April 2026).',
    fotoBuktiDataUrl: SAMPLE_RECEIPT_HARIAN,
    mimeType: 'image/png',
    jenisBerkas: 'Foto Nota/Tiket',
    namaFile: 'bukti_uang_harian_bayu_ramadhan.png',
    statusSync: 'Lokal',
    createdAt: '2026-04-03T16:00:00.000Z',
  },
  {
    id: 'exp-002',
    kuitansiId: 'kui-2026-001',
    noSpt: '094/39/SPT/UM-Set/DD/I/2026',
    kategori: 'Transportasi',
    namaPengeluaran: 'Transportasi Tanjung Selor - Tarakan - Nunukan (PP)',
    vendorPenyedia: 'Armada Speedboat Reguler Kalimantan Utara',
    tanggalBukti: '2026-04-03',
    nomorBukti: 'SB-KTR-2026-040188',
    nominal: 850000,
    catatan: 'Tiket transportasi laut pulang-pergi rute Tanjung Selor – Tarakan – Nunukan.',
    fotoBuktiDataUrl: SAMPLE_RECEIPT_TRANSPORT,
    mimeType: 'image/png',
    jenisBerkas: 'Foto Nota/Tiket',
    namaFile: 'tiket_transport_tanjungselor_nunukan_pp.png',
    statusSync: 'Lokal',
    createdAt: '2026-04-03T17:00:00.000Z',
  },
  {
    id: 'exp-003',
    kuitansiId: 'kui-2026-001',
    noSpt: '094/39/SPT/UM-Set/DD/I/2026',
    kategori: 'Penginapan',
    namaPengeluaran: 'Hotel Nunukan (2 Malam x Rp360.000)',
    vendorPenyedia: 'Hotel Nunukan Kalimantan Utara',
    tanggalBukti: '2026-04-03',
    nomorBukti: 'INV-HN-20260403-09',
    nominal: 720000,
    catatan: 'Biaya menginap 2 malam (Check-in 01 April 2026, Check-out 03 April 2026) di Kabupaten Nunukan.',
    fotoBuktiDataUrl: SAMPLE_RECEIPT_HOTEL,
    mimeType: 'image/png',
    jenisBerkas: 'Foto Nota/Tiket',
    namaFile: 'invoice_hotel_nunukan_2malam.png',
    statusSync: 'Lokal',
    createdAt: '2026-04-03T11:00:00.000Z',
  },
];

export const INITIAL_SURAT_TUGAS_LIST: SuratPerintahTugas[] = [
  {
    id: 'spt-2026-001',
    kuitansiId: 'kui-2026-001',
    noSpt: '800.1.11.1/ 11898/SPT/Disdikbud/KU/X/2026',
    dasarList: [
      'Peraturan Gubernur Kalimantan Utara Nomor 41 Tahun 2022 Tentang Perubahan Atas Peraturan Gubernur Nomor 25 Tahun 2019, tentang Pedoman Pelaksanaan Perjalanan Dinas;',
      'Telaah Staf Pejabat Pelaksana Teknis Kegiatan Bidang PSMA tanggal 08 Oktober 2026 Perihal: Monitoring dan Peninjauan Lokasi Rencana Kegiatan APBD Perubahan 2026 serta Progres Pekerjaan di SMAN 5 Tarakan;',
    ],
    pegawaiList: [
      {
        id: 'st-p-1',
        nama: 'Bayu Ramadhan',
        pangkatGol: 'Penata, III/c',
        nip: '198307072015031002',
        jabatan: 'Pranta KomputerAhli Pertama',
      },
      {
        id: 'st-p-2',
        nama: 'Ismail, A.Md.',
        pangkatGol: 'Penata Muda, III/b',
        nip: '198203092011011002',
        jabatan: 'Pengolah Data dan Informasi',
      },
      {
        id: 'st-p-3',
        nama: 'Hendry Setyo Utomo',
        pangkatGol: 'IX',
        nip: '198712112025211028',
        jabatan: 'Penata Layanan Operasional',
      },
    ],
    maksudPerjalanan:
      'Monitoring dan Peninjauan Lokasi Rencana Kegiatan APBD Perubahan 2026 di SMAN 4 Tarakan, SMAN 2 Tarakan serta Progres Pekerjaan di SMAN 5 Tarakan;',
    tempatBerangkat: 'Tanjung Selor;',
    tempatTujuan: 'Kota Tarakan;',
    tanggalBerangkat: 'Kamis, 15 Oktober 2026;',
    tanggalHarusKembali: 'Sabtu, 17 Oktober 2026;',
    lamanyaPerjalanan: '3 (tiga) hari;',
    pembebananAnggaran:
      'DPA Dinas Pendidikan dan Kebudayaan Provinsi Kalimantan Utara Tahun Anggaran 2026, Kegiatan Penyelenggaraan Proses Belajar bagi Peserta Didik, Kode Kegiatan 1.01.02.1.01.0078 – 5.1.02.04.001.00001;',
    tempatDitetapkan: 'Tanjung Selor',
    tanggalDitetapkan: '15 Oktober 2026',
    jabatanPenandatangan: 'Plt. Kepala Dinas',
    namaPenandatangan: 'Hasanuddin, S.Pd., M.Si.',
    nipPenandatangan: '197405272007011010',
    pangkatPenandatangan: 'Pembina Tingkat I, IV/b',
    spdData: {
      lembarKe: '...............................................',
      kodeNo: '...............................................',
      nomorSpd: '000.1.2.3/                  /SPPD/Disdikbud/2026',
      pptkNama: 'Bayu Ramadhan/NIP 198307072015031002',
      pptkNip: '198307072015031002',
      tingkatBiaya: '',
      alatAngkut: 'Darat dan Air',
      instansiAnggaran: 'Dinas Pendidikan dan Kebudayaan',
      akunAnggaran: '1.01.02.1.01.0078 – 5.1.02.04.001.00001',
      keteranganLain: '',
      selectedPegawaiId: 'st-p-3',
      pengikutList: [
        { id: '1', nama: '', tanggalLahir: '', keterangan: '' },
        { id: '2', nama: '', tanggalLahir: '', keterangan: '' },
        { id: '3', nama: '', tanggalLahir: '', keterangan: '' },
        { id: '4', nama: '', tanggalLahir: '', keterangan: '' },
      ],
    },
    updatedAt: '2026-10-15T08:00:00.000Z',
  },
];
