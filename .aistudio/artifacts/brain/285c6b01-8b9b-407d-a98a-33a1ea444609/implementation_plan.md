# Restrukturisasi Tata Letak Navigasi Atas & Ruang Kerja SPJ (Canva Light Workspace)

Restrukturisasi tata letak navigasi atas pada ruang kerja editor SPJ untuk menghilangkan tumpukan navigasi berlapis, menghilangkan redundansi sub-menu, dan memperluas ruang kerja dokumen A4/F4 yang lapang dan fokus.

---

## 1. Rampingkan Lapisan Navigasi Menjadi Satu Baris Utama
- **Masalah Sebelumnya**: Header ruang kerja SPJ terdiri dari dua baris terpisah yang bertumpuk tebal (Baris 1: Back + Dropdown SPJ + Duplikat; Baris 2: Grid 6 tombol dokumen berukuran besar).
- **Solusi yang Diterapkan**:
  - Menggabungkan kedua baris tersebut menjadi **satu baris navigasi utama yang ramping dan elegan** (`h-13 sm:h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/90`).
  - **Zone Kiri**: Tombol `← Daftar SPJ` yang ergonomis + Pemilih Berkas SPJ Aktif (`#1 Bayu Ramadhan ▾`) yang kompak dengan popup modal pengganti berkas / duplikasi berkas.
  - **Zone Tengah**: **Horizontal Scrollable Pills** (`1. SPT`, `2. SPD`, `3. Visum`, `4. Kuitansi`, `5. Dokumentasi`, `6. Bukti`) dengan scrolling sentuh halus (`overflow-x-auto no-scrollbar scroll-smooth`). Status aktif ditandai dengan warna `bg-sky-700 text-white shadow-xs`, sedangkan inaktif menggunakan tombol pill lembut `bg-slate-100/90 hover:bg-slate-200/80 text-slate-600`.
  - **Zone Kanan**: Tombol aksi cepat `+ Duplikat`.
  - Menghemat lebih dari 50px tinggi vertikal viewport.

---

## 2. Hapus Tombol Sub-Menu yang Berlebihan
- **Masalah Sebelumnya**: Di dalam `SuratTugasEditorSection`, terdapat kotak kartu putih kedua bertuliskan `Dokumen SPPD:` dengan 3 tombol duplikat (`Surat Tugas`, `SPD Depan`, `SPD Belakang`) yang menumpuk di bawah navigasi atas.
- **Solusi yang Diterapkan**:
  - Kotak kartu sub-menu kedua tersebut **dihapus sepenuhnya**.
  - Navigasi pill horizontal di baris utama (`1. SPT`, `2. SPD`, `3. Visum`) kini **langsung mengarahkan dan menampilkan lembar dokumen terkait secara instan** tanpa perantara.
  - Untuk pemilihan pelaksana pada mode SPD/Visum yang memiliki lebih dari 1 pegawai tugas, disediakan *minimal inline pill selector* yang rapi dan hanya muncul bila pegawai $> 1$.

---

## 3. Perluas Ruang Kerja Dokumen (Whitespace)
- Mengembalikan estetika **Canva Light Workspace** (`bg-slate-100`):
  - Area pratinjau kertas cetak A4/F4 Folio kini menjadi titik fokus utama yang lapang, bersih, dan leluasa.
  - Mengurangi beban kognitif pengguna karena tidak ada lagi tumpukan kotak kontrol dan spasi yang sempit.
  - Toolbar aksi editor pada ponsel tetap terjangkau di bagian bawah dengan *safe-area padding*, tanpa tabrakan dengan dock navigasi global.
