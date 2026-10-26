# Rencana Implementasi: Penataan Jabatan & Tanda Tangan SPT, SPD (2 Pejabat Bertingkat), dan Visum SPPD

## 1. Gambaran Umum Solusi

Menyempurnakan tata kelola data pejabat penandatangan dan susunan blok tanda tangan pada 3 dokumen resmi perjalanan dinas sesuai regulasi administrasi pemerintahan:
1. **Surat Perintah Tugas (SPT)**: Fleksibilitas status jabatan penandatangan (*Kepala Dinas*, *Plt. Kepala Dinas*, *Plh. Kepala Dinas*, atau *Kustom*).
2. **Surat Perjalanan Dinas (SPD - Lembar Depan)**: Ditandatangani oleh **2 pejabat bertingkat** (meskipun bisa diemban oleh orang yang sama):
   - **Bagian Atas**: Pengguna Anggaran (PA / KPA)
   - **Bagian Bawah**: Pejabat Penandatangan SPT (Kepala Dinas / Plt. / Plh.)
3. **Visum SPPD (Lembar Belakang)**: Ditandatangani oleh pejabat yang menandatangani SPT (pada Blok I Keberangkatan & Blok VI Pengesahan Kembali), terhubung otomatis (*auto-sync*) dengan opsi ubah manual (*override*).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATA PEJABAT PENANDATANGAN                      │
├────────────────────────────────────────────────────────────────────────┤
│ 1. PENANDATANGAN SPT:                                                  │
│    [ Kepala Dinas ] [ Plt. Kepala Dinas ] [ Plh. Kepala Dinas ] [Kustom]│
│    Nama, Pangkat/Golongan, NIP                                         │
│                                                                        │
│ 2. PENGGUNA ANGGARAN (PA/KPA) - UNTUK SPD LEMBAR DEPAN:                │
│    [✓ Gunakan Pejabat dari Pengaturan Instansi / Custom Input]         │
│    Jabatan: Pengguna Anggaran / Kuasa Pengguna Anggaran                │
│    Nama, Pangkat/Golongan, NIP                                         │
└────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│               TATA LETAK CETAK / PREVIEW DOKUMEN                       │
├────────────────────────────────────────────────────────────────────────┤
│ A. SPT (Surat Perintah Tugas)                                          │
│    └─ Blok Tanda Tangan Tunggal: Kepala Dinas / Plt. / Plh.            │
│                                                                        │
│ B. SPD LEMBAR DEPAN (2 Pejabat Bertingkat di Sisi Kanan Bawah)        │
│    ┌────────────────────────────────────────────────────────────┐      │
│    │ Dikeluarkan di: [Tempat], Pada tanggal: [Tanggal]          │      │
│    │ PENGGUNA ANGGARAN                                          │      │
│    │ (tanda tangan & stempel)                                   │      │
│    │ [Nama Pengguna Anggaran]                                   │      │
│    │ [Pangkat / NIP]                                            │      │
│    ├────────────────────────────────────────────────────────────┤      │
│    │ KEPALA DINAS / PLT. / PLH. [Nama Instansi]                 │      │
│    │ (Selaku Pejabat Penandatangan SPT)                         │      │
│    │ (tanda tangan)                                             │      │
│    │ [Nama Pejabat SPT]                                         │      │
│    │ [Pangkat / NIP]                                            │      │
│    └────────────────────────────────────────────────────────────┘      │
│                                                                        │
│ C. VISUM SPPD (Lembar Belakang)                                        │
│    └─ Blok I & Blok VI: Otomatis disahkan oleh Pejabat SPT             │
│       (disertai opsi edit khusus jika ada pelimpahan kewenangan)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Rincian Perubahan & Keputusan Pengguna

Berdasarkan jawaban Anda:
1. **Selektor Cepat Status Jabatan SPT**:
   - Pilihan cepat sekali klik: **Kepala Dinas**, **Plt. Kepala Dinas**, **Plh. Kepala Dinas**, serta mode **Teks Kustom** (misal: *Pj. Kepala Dinas*, *Sekretaris Dinas a.n. Kepala Dinas*).
   - Penulisan gelar, nama instansi, NIP, dan pangkat otomatis disesuaikan dengan format resmi tata naskah dinas.
2. **Format Tanda Tangan SPD Lembar Depan**:
   - Disusun bertingkat vertikal di sisi kanan dokumen:
     - **Tingkat Atas**: Pengguna Anggaran (PA / KPA) lengkap dengan tempat & tanggal penetapan SPD.
     - **Tingkat Bawah**: Pejabat Penandatangan SPT (Kepala Dinas / Plt. / Plh.).
   - Menghindari halaman meluap (*page break*) pada ukuran F4/Folio dan A4 dengan manajemen spasi yang presisi.
3. **Sinkronisasi Otomatis Visum SPPD (Lembar Belakang)**:
   - Blok keberangkatan (Blok I) dan blok akhir pengesahan/tiba kembali (Blok VI) otomatis mengambil data dari Pejabat Penandatangan SPT.
   - Tetap menyediakan tombol / kolom sunting manual jika dalam kondisi tertentu visum disahkan oleh pejabat berbeda.

---

## 3. Rencana Komponen & File yang Dimodifikasi

1. **`src/types/spj.ts`**:
   - Tambahkan properti struktur pejabat pada `SuratPerjalananDinasData`:
     - `paNama`, `paNip`, `paPangkat`, `paJabatan` (untuk Pengguna Anggaran).
     - `pejabatSptNama`, `pejabatSptNip`, `pejabatSptPangkat`, `pejabatSptJabatan` (untuk Pejabat Penandatangan SPT).
   - Tambahkan status jabatan SPT (`statusJabatan: 'definif' | 'plt' | 'plh' | 'custom'`).
2. **`src/components/SuratTugasEditorSection.tsx`**:
   - Pada kartu SPT: sediakan tombol pilihan cepat *[Kepala Dinas]*, *[Plt. Kepala Dinas]*, *[Plh. Kepala Dinas]*, dan *[Kustom]*.
   - Pada kartu SPD: sediakan seksi ringkas pengaturan 2 penandatangan (Pengguna Anggaran dan Pejabat SPT) dengan opsi sinkronisasi 1-klik dari Pengaturan Instansi.
   - Pada kartu Visum: tampilkan indikator bahwa penandatangan Blok I & VI tersinkronisasi dengan Pejabat SPT, disertai tombol *Ubah Manual*.
3. **`src/components/SuratPerjalananDinasDocumentPreview.tsx` (SPD Lembar Depan)**:
   - Render blok tanda tangan ganda bertingkat:
     - Blok Atas: Pengguna Anggaran (PA / KPA)
     - Blok Bawah: Pejabat Penandatangan SPT
   - Pastikan tinggi dokumen tetap pas 1 halaman penuh (F4/Folio & A4) tanpa terpotong atau menimbulkan halaman kosong saat diekspor ke PDF.
4. **`src/components/SuratPerjalananDinasBelakangDocumentPreview.tsx` (Visum SPPD)**:
   - Hubungkan penandatangan Blok I dan Blok VI dengan data penandatangan SPT secara konsisten.
5. **`src/components/BerkasSpjUtuhSection.tsx`**:
   - Pastikan ekspor PDF gabungan seluruh berkas SPJ menampilkan susunan tanda tangan baru dengan tipografi tajam dan tata letak yang konsisten.

---

## 4. Validasi & Pengujian

- Uji coba pergantian status jabatan (*Kepala Dinas* ⇄ *Plt.* ⇄ *Plh.* ⇄ *Kustom*) pada SPT dan verifikasi sinkronisasinya ke SPD dan Visum.
- Uji coba bila Pengguna Anggaran adalah orang yang sama atau orang yang berbeda dengan Penandatangan SPT.
- Verifikasi hasil render cetak SPD Lembar Depan pada tampilan layar HP, tablet, dan desktop, serta pastikan dokumen tetap 1 halaman utuh saat dicetak/diekspor PDF.
- Jalankan `compile_applet` untuk memastikan tidak ada eror tipe data atau sintaks.
