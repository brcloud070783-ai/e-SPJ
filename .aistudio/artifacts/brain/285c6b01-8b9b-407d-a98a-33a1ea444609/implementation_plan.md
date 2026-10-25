# Rencana Implementasi: Penyatuan Berkas SPJ Perjalanan Dinas Menjadi 1 File Utuh

## 1. Gambaran Umum Solusi
Menyatukan keenam komponen pertanggungjawaban perjalanan dinas (**1. Surat Perintah Tugas / SPT**, **2. SPD Depan**, **3. Visum / SPD Belakang**, **4. Kuitansi SPPD**, **5. Dokumentasi Kegiatan**, dan **6. Bukti Pembayaran**) ke dalam **1 Berkas SPJ Perjalanan Dinas Terpadu** yang tidak terpisahkan, baik dari sisi manajemen data, ruang kerja pengeditan, maupun hasil cetak/unduh dokumen.

---

## 2. Manajemen Satu Daftar Berkas SPJ Terpadu & Sinkronisasi Otomatis
- **Satu Daftar Berkas SPJ Terpadu**:
  - Menggabungkan pengelolaan berkas sehingga pembuatan berkas baru, pemilihan berkas aktif, penduplikasian, maupun penghapusan berkas otomatis mengelola seluruh 6 dokumen sekaligus dalam satu kesatuan.
  - Menyediakan bilah pemilih **Berkas SPJ Aktif** di bagian atas ruang kerja yang menampilkan informasi ringkas berkas (Nomor SPT/SPD, Nama Pegawai, Tujuan, Tanggal Perjalanan, Total Biaya, serta indikator kelengkapan 6 dokumen).
- **Sinkronisasi Data Otomatis Antar-Dokumen**:
  - Perubahan pada atribut inti di salah satu bagian akan langsung tersinkronisasi ke seluruh bagian dokumen lainnya dalam berkas yang sama:
    - **Pegawai Pelaksana, NIP, Pangkat/Golongan, & Jabatan** (`SPT` $\leftrightarrow$ `SPD Depan` $\leftrightarrow$ `Kuitansi`).
    - **Nomor SPT, Maksud/Uraian Perjalanan, & Tempat Tujuan** (`SPT` $\leftrightarrow$ `SPD Depan` $\leftrightarrow$ `Visum` $\leftrightarrow$ `Kuitansi` $\leftrightarrow$ `Dokumentasi` $\leftrightarrow$ `Bukti Pembayaran`).
    - **Tanggal Berangkat, Tanggal Kembali, & Lama Hari** (`SPT` $\leftrightarrow$ `SPD Depan` $\leftrightarrow$ `Visum` $\leftrightarrow$ `Kuitansi`).
    - **Kode & Nama Sub Kegiatan serta Pejabat/PPTK/Bendahara** (`SPT` $\leftrightarrow$ `SPD` $\leftrightarrow$ `Visum` $\leftrightarrow$ `Kuitansi`).

---

## 3. Ruang Kerja Terpadu Berurutan (1 s.d. 6 + Berkas Utuh)
- **Navigasi Tahapan Dokumen Berurutan**:
  Menyediakan navigasi tab berurutan dalam satu ruang kerja terpadu sehingga pengguna dapat berpindah antar-bagian dokumen tanpa kehilangan konteks berkas yang sedang dikerjakan:
  1. **1. SPT (Surat Perintah Tugas)**
  2. **2. SPD (Halaman Depan)**
  3. **3. Visum (SPD Halaman Belakang)**
  4. **4. Kuitansi & Rincian Biaya**
  5. **5. Dokumentasi Kegiatan**
  6. **6. Bukti Pembayaran (Pengeluaran)**
  7. **Pratinjau & Cetak 1 Berkas Utuh (Semua Halaman)**
- **Tombol Navigasi Cepat ( Sebelumnya / Selanjutnya )**:
  Memudahkan pengisian berurutan mulai dari penerbitan SPT hingga pengunggahan bukti pembayaran dan pencetakan berkas akhir.

---

## 4. Cetak & Unduh 1 File PDF Multi-Halaman Utuh (Plus Opsi Cetak Per Halaman)
- **Mode Cetak / Unduh 1 File SPJ Utuh (Semua Halaman)**:
  - Merender keenam dokumen secara berurutan dalam satu alur dokumen cetak kontinu dengan pemisah halaman otomatis (`page-break` / `break-after: page`) sesuai ukuran kertas pilihan (**A4** atau **F4 Folio**):
    - **Halaman 1**: Surat Perintah Tugas (SPT)
    - **Halaman 2**: Surat Perjalanan Dinas (SPD Depan — skala proporsional 86%)
    - **Halaman 3**: Visum Perjalanan Dinas (SPD Belakang)
    - **Halaman 4**: Kuitansi & Rincian Perhitungan SPPD
    - **Halaman 5+**: Lampiran Dokumentasi Perjalanan Dinas
    - **Halaman 6+**: Lampiran Bukti Pembayaran / Pengeluaran Riil
  - Saat pengguna menekan tombol **"Cetak / Simpan PDF 1 Berkas Utuh"**, browser akan menghasilkan **1 berkas PDF multi-halaman lengkap** yang siap disimpan atau dicetak sekaligus.
- **Opsi Cetak Per Halaman / Bagian**:
  - Pengguna tetap dapat mencetak atau menyimpan PDF hanya untuk bagian/halaman tertentu saja (misalnya hanya mencetak SPT atau hanya mencetak Kuitansi) melalui pilihan mode cetak pada bilah aksi.
