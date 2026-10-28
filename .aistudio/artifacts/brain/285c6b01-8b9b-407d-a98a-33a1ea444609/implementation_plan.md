# Native Mobile UX & PWA Integration Plan - E-SPJ Disdikbud

Rencana peningkatan pengalaman pengguna agar aplikasi **E-SPJ (Surat Perintah Tugas & Perjalanan Dinas)** memiliki performa, tampilan, dan nuansa yang identik dengan aplikasi mobile native Android/iOS.

## User Review & Critical Decisions

> [!IMPORTANT]
> Berdasarkan konfirmasi pada tahap klarifikasi, fitur-fitur native berikut akan diimplementasikan secara komprehensif:
> 1. **Bottom Navigation Bar Native**: Bar navigasi bawah serasa Android/iOS dengan efek haptic, indikator aktif, dan *badge* informasi cepat.
> 2. **Progressive Web App (PWA) Offline & Installable**: Integrasi `vite-plugin-pwa`, Service Worker, Web App Manifest, ikon maskable, dan tombol *Install App* langsung di UI/Settings.
> 3. **Gestur Pull-to-Refresh**: Tarik layar ke bawah untuk menyegarkan data atau memperbarui tampilan SPT/Kuitansi secara responsif.
> 4. **Haptic Feedback Responsif**: Respon getaran mikro pada pemicu haptic (`navigator.vibrate`) untuk setiap interaksi tombol penting.
> 5. **Long-Press Context Menu (Tekan Tahan)**: Menu aksi cepat bergaya mobile (Cetak, Edit, Salin, Hapus) yang muncul saat menekan tahan baris SPT/Kuitansi.

---

## 1. Overview & Core Concept

- **Tujuan**: Transformasi pengalaman antarmuka web E-SPJ menjadi aplikasi mobile native penuh yang siap di-install ke HP Android/iOS, beroperasi saat offline, dan memiliki respon sentuhan yang sangat halus (*fluid touch gestures*).
- **Target Pengguna**: Pegawai dan Administrator Dinas Pendidikan dan Kebudayaan yang mengakses sistem pembuatan SPJ melalui perangkat smartphone saat melakukan perjalanan dinas atau di lapangan.
- **Nilai Utama**: Aksesibilitas instan dari Home Screen HP, kemudahan navigasi jempol (*one-thumb navigation*), respon getaran mikro nyata, serta kestabilan saat koneksi internet lambat/offline.

---

## 2. User Experience & Visual Design

### Native Mobile Layout & Bottom Navigation Bar
- **Bottom Bar Structure**: Bar navigasi menempel di bagian bawah layar mobile (`lg:hidden`) dengan 4 tab utama:
  - 📋 **Surat Tugas (SPT/SPD)**: Akses cepat ke pembuatan & preview SPT, SPD, dan Visum.
  - 🧾 **Kuitansi**: Pengelolaan rincian biaya perjalanan dan kuitansi.
  - 📷 **Foto & Bukti**: Lampiran dokumentasi dan nota digital.
  - ⚙️ **Pengaturan & PWA**: Pengaturan dinas, daftar pegawai, dan status instalasi PWA.
- **Micro-Interactions**:
  - Pindah tab dengan animasi *spring* halus pada *indicator pill*.
  - Getaran *light haptic vibration* saat menekan tab navigasi.

### Native Touch Gestures
- **Pull-to-Refresh Container**:
  - Komponen wrapper pada halaman utama mobile yang mendeteksi tarikan ke bawah saat di bagian paling atas (`scrollTop === 0`).
  - Indikator putar *spinner* bergaya Android Material You dengan feedback haptic saat ambang batas (*threshold*) tercapai.
- **Long-Press Context Menu**:
  - Deteksi sentuhan tahan selama ~500ms pada kartu SPT/Kuitansi.
  - Memunculkan *action sheet* atau modal popover bawah (*bottom sheet*) berisi opsi: **Cetak PDF**, **Lihat Preview**, **Duplikat Data**, dan **Hapus**.

### PWA & Offline Experience
- **In-App Install Banner/Button**:
  - Tombol **"Install Aplikasi HP"** di bagian atas / menu Pengaturan yang mendeteksi `beforeinstallprompt`.
  - Panduan khusus instalasi untuk perangkat iOS Safari.
- **Offline Banner**:
  - Notifikasi mikro tidak mengganggu di bagian bawah layar jika perangkat kehilangan koneksi internet.

---

## 3. Key Product Decisions & Trade-Offs

- **Keputusan 1: Service Worker `vite-plugin-pwa` dengan Workbox Cache**
  - *Pendekatan*: Menggunakan `vite-plugin-pwa` dengan opsi `registerType: 'autoUpdate'` dan precaching aset statis (HTML, JS, CSS, Font Google, dan SVG icons).
  - *Alasan*: Menjamin aplikasi tetap dapat dibuka dan digunakan untuk membuat/mencetak dokumen tanpa koneksi internet.

- **Keputusan 2: Bottom Navigation Bar khusus Layar Mobile (`lg:hidden`)**
  - *Pendekatan*: Menampilkan Bottom Nav Bar di layar HP (`< lg`) tanpa mengganggu atau merusak tampilan Desktop (*Header* atas tetap aktif untuk layar komputer/laptop).
  - *Alasan*: Menjaga efisiensi navigasi jempol di HP sambil mempertahankan produktivitas layar lebar di laptop.

- **Keputusan 3: Custom Haptic Engine (`useNativeHaptics`)**
  - *Pendekatan*: Wrapper khusus `navigator.vibrate([10])` dengan pemeriksaan kompatibilitas Android/Web API.
  - *Alasan*: Memberikan umpan balik taktil nyata yang membedakan aplikasi web biasa dengan aplikasi native.

---

## 4. Technical Architecture & Data Strategy

### Visual Architecture & Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        E-SPJ PWA Mobile Shell                          │
├────────────────────────────────────────────────────────────────────────┤
│  [Offline / PWA Status Banner]                                         │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    PullToRefreshContainer                        │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │
│  │  │              Main View Content (SPT / SPD)                 │  │  │
│  │  │  ┌──────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ LongPressWrapper (Cards / List Items)                │  │  │  │
│  │  │  │   └─> triggers LongPressContextMenu                  │  │  │  │
│  │  │  └──────────────────────────────────────────────────────┘  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │            Mobile Bottom Navigation Bar (lg:hidden)              │  │
│  │   [ 📋 SPT/SPD ]   [ 🧾 Kuitansi ]   [ 📷 Foto ]   [ ⚙️ Options ] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

### Component & Hook Responsibilities
1. `vite.config.ts`: Konfigurasi `VitePWA` plugin, manifest JSON (`name: 'E-SPJ Mobile'`, `short_name: 'E-SPJ'`, `theme_color: '#0284c7'`, icons 192x192 & 512x512).
2. `src/hooks/usePWAInstall.ts`: Hook untuk menangkap `beforeinstallprompt`, status `isInstalled`, dan trigger instalasi.
3. `src/hooks/usePullToRefresh.ts`: Hook penanganan touch move vertical untuk mendeteksi gestur tarik refresh.
4. `src/hooks/useLongPress.ts`: Hook penanganan timer touch start/end untuk memicu menu kontekstual tekan tahan.
5. `src/components/MobileBottomNav.tsx`: Bar navigasi bawah khusus mobile dengan efek haptic.
6. `src/components/PWAInstallModal.tsx`: Banner/Modal promosi instalasi aplikasi PWA.
