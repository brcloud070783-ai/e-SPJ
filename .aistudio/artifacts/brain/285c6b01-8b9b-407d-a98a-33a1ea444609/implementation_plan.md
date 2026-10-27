# Rencana Implementasi: Transformasi Pengalaman Mobile Native Bergaya iOS / iPadOS (e-SPJ Kaltara)

Transformasi menyeluruh antarmuka dan fisika interaksi **SAPA Kaltara (e-SPJ)** agar menanggalkan kesan halaman web biasa di dalam peramban dan bertransformasi menjadi aplikasi *mobile native* kelas satu bergaya **iOS / iPadOS** yang sangat luwes, responsif terhadap gestur sentuhan, bebas efek *rubber-band* peramban, dan memiliki mode ruang kerja dokumen fokus penuh.

---

## Keputusan Pengguna & Kesepakatan Fitur Utama

Berdasarkan preferensi yang telah dikonfirmasi:
1. **4 Pilar Pengalaman Mobile Native**:
   - **Fixed App Shell & Kunci Overscroll Browser**: Mengunci kerangka aplikasi pada tinggi layar dinamis (`100dvh`) dengan kontainer gulir internal yang terisolasi serta mematikan pantulan *pull-to-refresh* / *overscroll* bawaan peramban.
   - **Animasi Transisi Halus Antar Halaman & Tab**: Perpindahan berarah (*directional slide & spring fade*) saat berpindah antar menu utama (*Beranda*, *SPJ Dinas*, *Pengaturan*) maupun antar tab dokumen (*1. SPT* s.d. *6. Bukti*).
   - **Efek Tekan Tombol Membal & Kunci Blok Teks**: Umpan balik pegas mikro (`active:scale-[0.97]`), penghapusan sorotan biru kasar saat disentuh (`-webkit-tap-highlight-color: transparent`), penguncian seleksi teks pada elemen kontrol UI (`user-select: none`), serta getaran haptik halus (`navigator.vibrate`) pada perangkat yang mendukung.
   - **Bottom Sheet Interaktif dengan Gestur Tarik-Tutup (*Swipe-to-Dismiss*)**: Laci bawah dan modal pengeditan di ponsel dilengkapi bilah pegangan (*grab handle*) yang mengikuti pergerakan jari secara *real-time* dan otomatis menutup ketika ditarik ke bawah melewati ambang batas.
2. **Gaya Animasi & Respons Sentuhan**:
   - Mengadopsi kurva pegas **iOS / iPadOS** (`cubic-bezier(0.32, 0.72, 0, 1)` dan `cubic-bezier(0.22, 1, 0.36, 1)`) yang dipadukan dengan permukaan kaca buram (*frosted glass* `backdrop-blur-xl`).
3. **Tata Letak Ruang Kerja Dokumen SPJ di Layar HP**:
   - **Fokus Penuh dengan Toolbar Mengambang Ringkas**: Memaksimalkan porsi kanvas kertas A4/F4 di layar ponsel dengan menyatukan navigasi atas menjadi bilah kaca ultra-ringkas, dilengkapi tombol **Mode Fokus Layar Penuh** yang dapat menyembunyikan bilah kepala saat pengguna sedang fokus memeriksa atau mengedit naskah.

---

## 1. Gambaran Umum & Konsep Inti

Mengapa sebuah aplikasi web masih terasa seperti "berjalan di browser"? Penyebab utamanya ada pada **perilaku gulir dokumen global**, **transisi tampilan yang patah (instan tanpa inersia)**, **sorotan sentuh bawaan browser**, dan **panel modal statis yang tidak merespons tarikan jari**.

Rencana ini merombak fondasi interaksi aplikasi menjadi arsitektur **Native App Shell**:
- Kerangka luar aplikasi terkunci rapat mengikuti dimensi perangkat (`100dvh`), sehingga bilah atas dan bilah navigasi bawah tidak pernah ikut bergoyang atau memicu perubahan tinggi *address bar* peramban.
- Setiap perpindahan menu dan tab memiliki kesadaran urutan (*spatial index awareness*)—bergeser ke kanan saat melangkah maju (misal dari *1. SPT* ke *2. SPD*) dan bergeser ke kiri saat kembali.
- Sistem pencetakan multi-halaman dan ekspor PDF A4/F4 tetap terlindungi 100%: aturan penguncian `100dvh` dan `overflow: hidden` hanya aktif pada mode layar (`@media screen`), sehingga saat proses cetak atau unduh PDF berlangsung, seluruh halaman kertas tetap ter-render utuh tanpa terpotong.

---

## 2. Pengalaman Pengguna (UX) & Desain Visual

### A. Estetika Permukaan & Fisika Pegas iOS / iPadOS
- **Kurva Animasi Pegas**: Seluruh transisi laci, *bottom sheet*, indikator tab aktif, dan perpindahan halaman menggunakan kurva *spring deceleration* khas iOS (`cubic-bezier(0.32, 0.72, 0, 1)`) yang terasa cepat di awal dan mendarat dengan lembut tanpa patah.
- **Lapisan Kaca Buram (*Translucent Materials*)**: Bilah navigasi atas, *floating dock* bawah, dan *toolbar* kontrol kertas menggunakan efek *frosted glass* (`backdrop-blur-xl bg-white/85`) dengan garis batas halus `border-slate-200/80`.
- **Respons Taktil & Haptik Mikro**:
  - Setiap tombol aksi, kartu berkas SPJ, dan *pill* navigasi merespons sentuhan jari secara instan dengan penyusutan skala halus (`scale(0.97)`) dan pemulihan membal saat dilepas.
  - Getaran haptik mikro (`8ms–12ms`) dipicu secara otomatis pada aksi penting seperti berpindah tab dokumen, menyimpan perubahan, atau menutup *bottom sheet*.

### B. Ergonomi Zona Ibu Jari & Batas 15% Elemen Mengambang
- **Kepatuhan Batas Tinggi Sticky (< 15% Viewport)**:
  - Saat berada di dalam ruang kerja dokumen SPJ di layar ponsel, bilah atas dipadatkan menjadi satu baris terpadu yang menggabungkan tombol kembali, pemilih berkas SPJ (yang kini membuka *bottom sheet* interaktif, bukan *dropdown* sempit), dan *strip* tab 1–6 yang ringkas.
  - Dilengkapi tombol **Mode Fokus Kertas (Layar Penuh)** di sudut *toolbar* mengambang untuk menyembunyikan bilah navigasi atas seketika, memberikan lebih dari **88% area vertikal layar** murni untuk lembar kertas A4/F4.
- **Safe-Area Insets**: Seluruh bilah bawah dan *bottom sheet* menghormati area garis gestur *home indicator* pada iPhone dan Android modern menggunakan `env(safe-area-inset-bottom)`.

---

## 3. Keputusan Produk & Pertimbangan Teknis

| Aspek Pengalaman | Pendekatan Lama (Terasa Seperti Web) | Pendekatan Baru (Setara Aplikasi Native) | Alasan & Manfaat Utama |
| :--- | :--- | :--- | :--- |
| **Struktur Gulir Layar** | Gulir pada `window` / `body` penuh | **Fixed App Shell (`100dvh`)** + Area Gulir Internal Mandiri | Mencegah *address bar* browser naik-turun dan menghilangkan pantulan karet (*rubber-band*) pada kerangka aplikasi. |
| **Perpindahan Halaman & Tab** | Pergantian DOM instan tanpa animasi arah | **Directional Spring Transition** berbasis urutan indeks tab | Otak pengguna memahami posisi spasial halaman (maju ke kanan, mundur ke kiri) dengan sangat mulus. |
| **Pemilih Berkas & Modal di HP** | *Dropdown* melayang & kotak dialog statis | **Interactive Drag-to-Dismiss Bottom Sheet** | Jauh lebih nyaman dijangkau ibu jari satu tangan dan bisa langsung ditarik ke bawah untuk menutup. |
| **Ruang Kerja Kertas SPJ** | Header bertingkat yang memakan ruang vertikal | **Mode Fokus Penuh + Floating Glass Pill Toolbar** | Kertas dokumen A4/F4 tampil jauh lebih besar, bersih, dan leluasa di layar ponsel. |
| **Keamanan Cetak & Ekspor PDF** | Berisiko terpotong jika `overflow: hidden` bocor ke mode cetak | **Isolasi Ketat `@media screen` vs `@media print`** | Menjamin fitur Cetak Langsung dan Unduh PDF tetap menghasilkan seluruh lembar dokumen tanpa cacat. |

---

## 4. Arsitektur Teknis & Alur Interaksi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAPISAN NATIVE APP SHELL (100dvh)                    │
│  • Kunci Overscroll (overscroll-behavior: none, touch-action: pan-y)    │
│  • Kunci Blok Teks UI (user-select: none) & Hapus Tap Highlight         │
│  • Bypass Otomatis saat @media print / body.spj-is-printing             │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
┌───────────────────┐     ┌───────────────────┐     ┌─────────────────────┐
│ FROSTED TOP BAR   │     │ ANIMATED VIEWPORT │     │ INTERACTIVE SHEETS  │
│ & FOCUS TOGGLE    │     │ CONTAINER (<main>)│     │ & FLOATING DOCK     │
├───────────────────┤     ├───────────────────┤     ├─────────────────────┤
│ • Compact 1-Row   │     │ • Momentum Scroll │     │ • Touch Drag Engine │
│   Studio Header   │     │   (-webkit-touch) │     │   (ΔY, Velocity)    │
│ • Mode Fokus      │     │ • Directional     │     │ • Spring Snap-Back  │
│   Penuh (Auto/    │     │   Spring Slide    │     │   atau Dismiss      │
│   Manual Hide)    │     │   (Maju / Mundur) │     │ • Haptic Feedback   │
└───────────────────┘     └───────────────────┘     └─────────────────────┘
```

### Rincian Komponen Arsitektur yang Akan Dibangun:
1. **Sistem Gaya Dasar & Utilitas Taktil Native**:
   - Konfigurasi `@media screen` untuk mengunci *viewport* `100dvh`, mematikan `-webkit-tap-highlight-color`, mengaktifkan `-webkit-overflow-scrolling: touch`, serta menyediakan kelas utilitas animasi transisi halaman berarah (*slide-left*, *slide-right*, *zoom-fade*) dan efek tekan pegas.
   - Utilitas umpan balik haptik ringan yang aman dipanggil di semua peramban.
2. **Komponen `NativeBottomSheet` dengan Gestur *Swipe-to-Dismiss***:
   - Menangani kejadian sentuhan (`onTouchStart`, `onTouchMove`, `onTouchEnd`) pada area kepala/pegangan laci.
   - Menerapkan translasi vertikal `translateY(deltaY)` secara *real-time* saat ditarik ke bawah, dengan efek peredaman (*rubber-band resistance*) jika ditarik ke atas.
   - Jika jarak tarik melampaui ambang batas (misal `> 90px`) atau kecepatan ayunan jari tinggi (*flick down*), laci menutup mulus; jika kurang, laci membal kembali ke posisi semula dengan fisika pegas iOS.
   - Diterapkan pada laci Pemilih Berkas SPJ di ponsel, modal konfirmasi hapus berkas, serta panel laci editor dokumen/nota.
3. **Kontainer Transisi Spasial Antar Tampilan**:
   - Melacak indeks menu utama (`Beranda [0] ↔ SPJ Dinas [1] ↔ Pengaturan [2]`) dan indeks langkah studio (`SPT [1] ↔ SPD [2] ↔ Visum [3] ↔ Kuitansi [4] ↔ Dokumentasi [5] ↔ Bukti [6]`).
   - Mengatur ulang posisi gulir kontainer utama ke puncak secara mulus setiap kali berpindah halaman dan menerapkan animasi masuk berarah yang sesuai.
4. **Mode Fokus Penuh Ruang Kerja Dokumen SPJ**:
   - Menyediakan kontrol **Mode Fokus** pada *floating toolbar* kertas A4/F4 di layar ponsel untuk menyembunyikan/menampilkan bilah kepala studio dengan transisi pegas, sehingga pengguna dapat memeriksa dan mengedit dokumen layaknya menggunakan aplikasi penyunting dokumen *native* di iPad/iPhone.
