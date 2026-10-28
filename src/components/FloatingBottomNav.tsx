import React from 'react';
import { LayoutGrid, FileText, SlidersHorizontal, Download } from 'lucide-react';
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
  isPwaInstallable?: boolean;
  onOpenPwaInstall?: () => void;
}

export const FloatingBottomNav: React.FC<FloatingBottomNavProps> = ({
  mainMenu,
  setMainMenu,
  spjView,
  setSpjView,
  kuitansiCount,
  isPwaInstallable = false,
  onOpenPwaInstall,
}) => {
  const isInsideStudio = mainMenu === 'perjalanan-dinas' && spjView !== 'sub-home';

  // Sembunyikan sepenuhnya saat berada di dalam ruang kerja dokumen SPJ (1-6)
  // agar toolbar bawah dokumen ("Ubah Formulir | PDF | Cetak") tidak pernah tertutup.
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
      tooltip: 'SPJ Dinas: Kelola berkas & dokumen perjalanan dinas',
      action: () => {
        triggerHaptic('light');
        setMainMenu('perjalanan-dinas');
        setSpjView('sub-home');
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
      aria-label="Navigasi Utama"
      className="no-print fixed inset-x-0 bottom-0 sm:inset-x-auto sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 z-40 sm:max-w-[calc(100vw-24px)] select-none pointer-events-auto"
    >
      <nav className="flex items-center justify-around sm:justify-center gap-1 sm:gap-1.5 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-1.5 bg-white/95 sm:bg-white/90 backdrop-blur-xl border-t sm:border border-slate-200/90 shadow-[0_-4px_20px_rgba(15,23,42,0.08)] sm:shadow-[0_12px_36px_rgba(15,23,42,0.16),0_2px_6px_rgba(15,23,42,0.06)] sm:rounded-3xl sm:ring-1 sm:ring-slate-900/5 transition-all duration-200 ease-out">
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
              className={`group relative flex-1 sm:flex-initial flex flex-col items-center justify-center px-3 sm:px-5 py-1.5 rounded-2xl transition-colors duration-200 min-w-[68px] sm:min-w-[76px] min-h-[46px] cursor-pointer ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/90'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="floating-bottom-nav-active-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-2xl bg-gradient-to-b from-sky-950 via-sky-900 to-sky-950 shadow-md shadow-sky-950/25 z-0"
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

              <span
                className={`relative z-10 text-[10.5px] whitespace-nowrap mt-1 leading-none ${
                  isActive
                    ? 'font-bold tracking-tight text-white'
                    : 'font-medium text-slate-600 group-hover:text-slate-900'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {isPwaInstallable && onOpenPwaInstall && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onOpenPwaInstall();
            }}
            className="flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200/80 min-w-[60px] min-h-[46px] transition-all cursor-pointer"
            title="Install Aplikasi ke Layar Utama HP"
          >
            <Download className="w-4 h-4 text-sky-700 shrink-0" />
            <span className="text-[10px] mt-1 font-bold leading-none whitespace-nowrap">
              Install
            </span>
          </button>
        )}
      </nav>
    </aside>
  );
};
