import React from 'react';
import { LayoutGrid, FileText, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { SpjSubSectionKey } from './SpjPerjalananSubHome';
import { triggerHaptic } from '../utils/nativeMobile';

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
        triggerHaptic('light');
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
        triggerHaptic('light');
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
        triggerHaptic('light');
        setMainMenu('settings');
      },
    },
  ];

  return (
    <aside
      aria-label="Navigasi Utama Mengambang"
      className={`no-print fixed bottom-[max(0.875rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-[calc(100vw-24px)] select-none pointer-events-auto transition-all duration-300 ${
        isInsideStudio ? 'hidden lg:block' : 'block'
      }`}
    >
      <nav className="flex items-center gap-1 sm:gap-1.5 p-1.5 bg-white/88 backdrop-blur-xl border border-slate-200/90 shadow-[0_12px_36px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.06)] rounded-3xl ring-1 ring-slate-900/5 transition-all duration-300 ease-out">
        {navItems.map((item) => {
          const isActive = mainMenu === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              type="button"
              onClick={item.action}
              aria-current={isActive ? 'page' : undefined}
              title={item.tooltip}
              className={`group relative flex flex-col items-center justify-center px-4 sm:px-5 py-1.5 rounded-2xl transition-colors duration-200 min-w-[64px] sm:min-w-[72px] min-h-[48px] cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/90'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="floating-bottom-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-b from-sky-950 via-sky-900 to-sky-950 shadow-md shadow-sky-950/30 z-0"
                />
              )}

              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 shrink-0 transition-transform ${
                    isActive
                      ? `${item.iconActiveColor} group-hover:scale-110`
                      : 'text-slate-500 group-hover:text-slate-800 group-hover:scale-105'
                  }`}
                />

                {/* Badge counter untuk SPJ Dinas */}
                {typeof item.badge === 'number' && (
                  <span
                    title={`${item.badge} berkas SPJ`}
                    className={`absolute -top-1 -right-3 min-w-[16px] h-4 px-1 text-[9px] rounded-full flex items-center justify-center shadow-xs leading-none ${
                      isActive
                        ? 'font-black bg-amber-400 text-sky-950'
                        : 'font-bold bg-sky-800 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Nama Ikon persis di bawah ikonnya */}
              <span
                className={`relative z-10 text-[10.5px] whitespace-nowrap mt-1 leading-none ${
                  isActive
                    ? 'font-bold tracking-tight text-white'
                    : 'font-medium text-slate-600 group-hover:text-slate-900'
                }`}
              >
                {item.label}
              </span>

              {/* Indikator titik aktif kecil */}
              {isActive ? (
                <motion.span
                  layoutId="floating-bottom-nav-active-dot"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="relative z-10 w-1 h-1 rounded-full bg-emerald-400 mt-1 shadow-[0_0_5px_rgba(52,211,153,0.9)]"
                />
              ) : (
                <span className="relative z-10 w-1 h-1 rounded-full bg-transparent mt-1" />
              )}
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

