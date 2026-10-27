# Rencana Implementasi Gestur Geser Jari (Horizontal Swipe) pada Tab SPJ

Mengaktifkan pengalaman navigasi *mobile native* menggunakan gestur geser jari (swipe kiri & kanan) untuk berpindah antar-tab dokumen utama maupun antar-sub-tab di dalam formulir editor.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan jawaban klarifikasi yang telah Anda pilih:
> - **Cakupan Gestur**: Diterapkan pada **Keduanya** (Layar Dokumen Utama SPJ dan Formulir Editor / Sub-Tab).
> - **Karakter Respons**: Transisi slide horizontal mulus dengan **getaran haptik ringan** (`triggerHaptic('light')`) di setiap pergantian tab.

---

## 1. Overview & Core Concept

- **Apa Yang Dihasilkan**:
  1. **Dokumen Utama (Layar Kertas/Workspace)**: Pengguna dapat menggeser layar ke kiri untuk maju ke dokumen berikutnya (contoh: dari *1. SPT* → *2. SPD* → *3. Visum* → *4. Kuitansi* → *5. Foto* → *6. Bukti*), atau menggeser ke kanan untuk kembali ke dokumen sebelumnya, tanpa harus meraih bilah atas.
  2. **Formulir Editor (Mobile Bottom Sheet)**: Pengguna dapat menggeser bilah sub-tab atau area formulir ke samping untuk berpindah sub-kategori form secara instan.
  3. **Auto-Center Tab Bar**: Indikator pill tab di bilah navigasi atas otomatis bergulir (*smooth scroll into view*) ke tengah layar sehingga tab yang aktif selalu terlihat jelas.
  4. **Pencegahan Konflik Sentuhan (Intentional Angle Detection)**: Deteksi rasio perpindahan sumbu X vs sumbu Y agar aktivitas membaca dokumen (menggulir vertikal ke atas/bawah) tidak memicu perpindahan tab secara tidak sengaja.

---

## 2. User Experience & Visual Design

- **Alur Gestur Sentuh**:
  - Sentuhan awal (`touchstart`) mencatat koordinat awal (X, Y).
  - Sentuhan gerak (`touchmove`) mendeteksi arah dominan. Jika pengguna sedang menggulir vertikal (misal membaca kertas dokumen ke bawah), gestur swipe horizontal otomatis dibatalkan (*locked to vertical scroll*).
  - Saat jarak geser horizontal mencapai ambang batas ($\ge 48\text{px}$) dengan sudut kemiringan horizontal dominan ($| \Delta X | > 1.5 \times | \Delta Y |$):
    - Tab berpindah ke indeks berikutnya/sebelumnya.
    - Umpan balik getaran haptik berdurasi mikro (10ms) terpicu.
    - Konten berpindah dengan animasi slide mulus.
    - Bilah tab atas bergeser menempatkan pill aktif tepat di tengah pandangan mata.

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Hook Khusus `useSwipeTabs` yang Reusable**
  - *Pendekatan*: Buat hook utilitas `useSwipeTabs({ tabs, activeIndex, onChangeIndex, isEnabled })` yang menangani logika sentuhan, sudut kemiringan, pencegahan konflik input teks, dan haptic feedback secara modular.
  - *Alasan*: Menjamin konsistensi logika geser di seluruh level aplikasi (baik di halaman utama `App.tsx` maupun di formulir `SuratTugasEditorSection.tsx` dan `KuitansiEditorSection.tsx`) tanpa duplikasi kode.
  - *Pencegahan Input Text*: Saat kursor pengguna sedang berada di dalam elemen `<input>`, `<textarea>`, atau `<select>`, gestur swipe otomatis dinonaktifkan agar seleksi kursor teks tidak terganggu.

- **Keputusan 2: Animasi Transisi Terarah (Directional Slide Transition)**
  - *Pendekatan*: Ketika bergeser ke kanan, halaman meluncur masuk dari kiri; ketika bergeser ke kiri, halaman meluncur masuk dari kanan.
  - *Alasan*: Memberikan kontinuitas spasial nyata ala aplikasi iOS/Android native.

---

## 4. Technical Architecture & Implementation Steps

```
┌─────────────────────────────────────────────────────────────┐
│                   useSwipeTabs HOOK                         │
│  • TouchStart (X, Y, timestamp)                             │
│  • TouchMove (Dominant Axis Lock: deltaX vs deltaY)         │
│  • TouchEnd (Threshold >= 48px -> triggerHaptic -> change)  │
│  • Input & BottomSheet Safety Guards                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│   LEVEL 1: MAIN SPJ SUITE    │ │   LEVEL 2: FORM SUB-TABS     │
│ • SPT ↔ SPD ↔ Visum ↔        │ │ • SPT: Kop ↔ Pegawai ↔ TTD   │
│   Kuitansi ↔ Foto ↔ Bukti    │ │ • SPD: No ↔ Pegawai ↔ TTD    │
│ • Auto-scroll top pill bar   │ │ • Kui: Data ↔ Rincian ↔ Kustom│
└──────────────────────────────┘ └──────────────────────────────┘
```

### Langkah Kerja:
1. **Buat Hook `src/hooks/useSwipeTabs.ts`**:
   - Mendeteksi `onTouchStart`, `onTouchMove`, dan `onTouchEnd` dengan proteksi threshold dan rasio aksis.
   - Mengabaikan geser saat menyentuh input/textarea/slider.
2. **Pasang pada Navigasi Dokumen Utama (`App.tsx`)**:
   - Terapkan swipe gesture pada kontainer dokumen utama untuk berpindah di antara urutan langkah 1–6 (`spt` ↔ `spd` ↔ `visum` ↔ `kuitansi` ↔ `dokumentasi` ↔ `pengeluaran`).
   - Sinkronisasi auto-scroll pada bilah pill horizontal atas.
3. **Pasang pada Formulir Editor**:
   - Terapkan swipe gesture pada sub-tab header dan body modal di `SuratTugasEditorSection.tsx` dan `KuitansiEditorSection.tsx`.
4. **Verifikasi & Build**:
   - Jalankan `lint_applet` dan `compile_applet` untuk memastikan nol error.
