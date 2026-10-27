import React from 'react';
import { LayoutGrid, FileText, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { SpjSubSectionKey } from './SpjPerjalananSubHome';

export type MainMenuKey = 'home' | 'perjalanan-dinas' | 'settings';
export type SpjViewKey = 'sub-home' | SpjSubSectionKey;

interface FloatingBottomNavProps {
  mainMenu: MainMenuKey;
  setMainMenu: (menu: MainMenuKey) => void;
  spjView: SpjViewKey;
  setSpjView: (view: SpjViewKey) => void;
  kuitansiCount: number;
  activeKuitansiTujuan?: string;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  mainMenu,
  setMainMenu,
  spjView,
  setSpjView,
  kuitansiCount,
}) => {
  const isInsideStudio = mainMenu === 'perjalanan-dinas' && spjView !== 'sub-home';

  // Sembunyikan FloatingBottomNav sepenuhnya saat berada di dalam ruang kerja dokumen SPJ
  if (isInsideStudio) {
    return null;
  }

  const navItems = [
    {
      id: 'home' as MainMenuKey,
      label: 'Beranda',
      icon: LayoutGrid,
      iconActiveColor: 'text-emerald-300',
      tooltip: 'Beranda: Dasbor ringkasan & statistik',
      action: () => {
        setMainMenu('home');
      },
    },
    {
      id: 'perjalanan-dinas' as MainMenuKey,
      label: 'SPJ Dinas',
      icon: FileText,
      iconActiveColor: 'text-amber-300',
      badge: kuitansiCount > 0 ? kuitansiCount : undefined,
      tooltip: isInsideStudio
        ? 'SPJ Dinas: Mode Formulir (Ketuk untuk kembali ke Daftar Berkas)'
        : 'SPJ Dinas: Kelola berkas & dokumen perjalanan dinas',
      action: () => {
        setMainMenu('perjalanan-dinas');
        // Jika sudah di menu SPJ dan sedang berada di dalam editor formulir, klik kembali ke daftar berkas
        if (mainMenu === 'perjalanan-dinas' && spjView !== 'sub-home') {
          setSpjView('sub-home');
        }
      },
    },
    {
      id: 'settings' as MainMenuKey,
      label: 'Pengaturan',
      icon: SlidersHorizontal,
      iconActiveColor: 'text-sky-300',
      tooltip: 'Pengaturan: Data dinas, pejabat & kop surat',
      action: () => {
        setMainMenu('settings');
      },
    },
  ];

  return (
    <aside
      aria-label="Navigasi Utama Mengambang"
      className={`no-print fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] select-none pointer-events-auto transition-all duration-300 ${
        isInsideStudio ? 'hidden lg:block' : 'block'
      }`}
    >
      <nav className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_36px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.06)] rounded-3xl ring-1 ring-slate-900/5 transition-all duration-300 ease-out">
        {navItems.map((item) => {
          const isActive = mainMenu === item.id;
          const Icon = item.icon;

          if (isActive) {
            // Item Aktif: Ikon di atas, Nama Ikon di bawah, dengan background pill gelap premium & aksen titik aktif
            return (
              <button
                key={item.id}
                type="button"
                onClick={item.action}
                aria-current="page"
                title={item.tooltip}
                className="group relative flex flex-col items-center justify-center px-4 sm:px-5 py-1.5 rounded-2xl bg-gradient-to-b from-sky-950 via-sky-900 to-sky-950 text-white shadow-md shadow-sky-950/30 transition-all duration-200 min-w-[64px] sm:min-w-[72px] min-h-[48px] cursor-pointer"
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-5 h-5 shrink-0 ${item.iconActiveColor} transition-transform group-hover:scale-110`} />

                  {/* Badge counter untuk SPJ Dinas */}
                  {typeof item.badge === 'number' && (
                    <span
                      title={`${item.badge} berkas SPJ`}
                      className="absolute -top-1 -right-3 min-w-[16px] h-4 px-1 text-[9px] font-black rounded-full bg-amber-400 text-sky-950 flex items-center justify-center shadow-xs leading-none"
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Nama Ikon persis di bawah ikonnya */}
                <span className="text-[10.5px] font-bold tracking-tight text-white whitespace-nowrap mt-1 leading-none">
                  {item.label}
                </span>

                {/* Indikator titik aktif kecil */}
                <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1 shadow-[0_0_5px_rgba(52,211,153,0.9)]" />
              </button>
            );
          }

          // Item Inaktif: Ikon di atas, Nama Ikon di bawah, bersih & responsif saat disentuh/di-hover
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              title={item.tooltip}
              className="group relative flex flex-col items-center justify-center px-3.5 sm:px-4 py-1.5 rounded-2xl text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 active:scale-95 transition-all duration-200 min-w-[60px] sm:min-w-[68px] min-h-[48px] cursor-pointer"
            >
              <div className="relative flex items-center justify-center">
                <Icon className="w-5 h-5 shrink-0 text-slate-500 group-hover:text-slate-800 transition-transform group-hover:scale-105" />

                {/* Badge counter mini saat inaktif */}
                {typeof item.badge === 'number' && (
                  <span
                    title={`${item.badge} berkas SPJ`}
                    className="absolute -top-1 -right-3 min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-sky-800 text-white flex items-center justify-center shadow-xs leading-none"
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Nama Ikon persis di bawah ikonnya */}
              <span className="text-[10.5px] font-medium text-slate-600 group-hover:text-slate-900 whitespace-nowrap mt-1 leading-none">
                {item.label}
              </span>

              {/* Spacer agar tinggi tombol seragam dengan yang aktif */}
              <span className="w-1 h-1 rounded-full bg-transparent mt-1" />
            </button>
          );
        })}

        {/* Khusus saat berada di dalam Ruang Kerja Dokumen SPJ: Shortcut Cepat Kembali ke Daftar Berkas */}
        {isInsideStudio && (
          <>
            <div className="h-8 w-px bg-slate-200 mx-1 shrink-0" />
            <button
              type="button"
              onClick={() => setSpjView('sub-home')}
              title="Kembali ke Daftar Berkas SPJ"
              className="flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl text-sky-900 bg-sky-50 hover:bg-sky-100/90 active:scale-95 border border-sky-200/90 transition-all cursor-pointer min-w-[58px] min-h-[48px]"
            >
              <ArrowLeft className="w-4 h-4 text-sky-700 shrink-0 mb-0.5" />
              <span className="text-[9.5px] font-bold text-sky-800 whitespace-nowrap leading-none">
                Daftar SPJ
              </span>
            </button>
          </>
        )}
      </nav>
    </aside>
  );
};

