import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Banknote, Camera, Settings2, Download } from 'lucide-react';
import { triggerHaptic } from '../utils/nativeMobile';

export type MobileTabType = 'spt' | 'kuitansi' | 'foto' | 'pengaturan';

interface MobileBottomNavProps {
  activeTab: MobileTabType;
  onChangeTab: (tab: MobileTabType) => void;
  isPwaInstallable?: boolean;
  onOpenPwaInstall?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  isPwaInstallable = false,
  onOpenPwaInstall,
}) => {
  const tabs: Array<{ id: MobileTabType; label: string; icon: React.ElementType }> = [
    { id: 'spt', label: 'Surat SPJ', icon: FileText },
    { id: 'kuitansi', label: 'Kuitansi', icon: Banknote },
    { id: 'foto', label: 'Foto Bukti', icon: Camera },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings2 },
  ];

  return (
    <nav className="no-print lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-2 py-1.5 shadow-2xl transition-all">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onChangeTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-3 min-w-[68px] rounded-xl transition-all cursor-pointer select-none ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-bottom-nav-pill"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  className="absolute inset-0 bg-sky-950/80 border border-sky-500/30 rounded-xl z-0"
                />
              )}
              <Icon className={`relative z-10 w-5 h-5 transition-transform ${isActive ? 'scale-110 text-sky-400' : ''}`} />
              <span className="relative z-10 text-[10.5px] mt-1 font-semibold tracking-tight">
                {tab.label}
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
            className="flex flex-col items-center justify-center py-1 px-2 text-amber-400 hover:text-amber-300 font-bold transition-all cursor-pointer animate-pulse"
            title="Install App HP"
          >
            <Download className="w-5 h-5" />
            <span className="text-[10px] mt-1 font-bold">Install</span>
          </button>
        )}
      </div>
    </nav>
  );
};
