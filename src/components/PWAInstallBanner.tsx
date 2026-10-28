import React, { useState } from 'react';
import { Download, Smartphone, X, Check, Share, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { triggerHaptic } from '../utils/nativeMobile';

interface PWAInstallBannerProps {
  forceShowModal?: boolean;
  onCloseModal?: () => void;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({
  forceShowModal = false,
  onCloseModal,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState<boolean>(false);
  const [isDismissedBanner, setIsDismissedBanner] = useState<boolean>(false);

  const isModalOpen = forceShowModal || showModal;
  const handleClose = () => {
    setShowModal(false);
    onCloseModal?.();
  };

  if (isInstalled) {
    return null;
  }

  return (
    <>
      {/* Top Mobile Banner (if installable and not dismissed) */}
      {isInstallable && !isDismissedBanner && !forceShowModal && (
        <div className="no-print bg-gradient-to-r from-sky-900 via-slate-900 to-sky-950 text-white px-3.5 py-2 flex items-center justify-between border-b border-sky-800/60 shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-700/80 border border-sky-400/30 flex items-center justify-center shrink-0 shadow-inner">
              <Smartphone className="w-4 h-4 text-sky-200" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-sky-100 truncate">Install e-SPJ Mobile</div>
              <div className="text-[10px] text-sky-300/90 truncate">Akses instan dari HP & kerja offline</div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                triggerHaptic('medium');
                const success = await install();
                if (success) {
                  setIsDismissedBanner(true);
                }
              }}
              className="px-2.5 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDismissedBanner(true)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              aria-label="Tutup Banner PWA"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Full Modal (for iOS or manually triggered from Settings) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-700 flex items-center justify-center text-white font-extrabold shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100">Install Aplikasi e-SPJ</h3>
                  <p className="text-xs text-slate-400">Tambahkan ke Layar Utama HP Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-slate-300">
                <p className="font-semibold text-sky-300">Petunjuk Instalasi iPhone / iPad (iOS Safari):</p>
                <ol className="space-y-2.5 bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-900 text-sky-200 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                    <span>Ketuk tombol <strong className="text-white inline-flex items-center gap-1"><Share className="w-3.5 h-3.5 text-sky-400" /> Share (Bagikan)</strong> pada bilah bawah Safari.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-900 text-sky-200 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                    <span>Gulir ke bawah dan pilih <strong className="text-white inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-sky-400" /> Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-900 text-sky-200 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                    <span>Ketuk <strong className="text-white">Tambah (Add)</strong> di sudut kanan atas.</span>
                  </li>
                </ol>
              </div>
            ) : isInstallable ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Aplikasi e-SPJ dapat di-install secara langsung tanpa membuka Google Play Store. Setelah di-install, aplikasi dapat bekerja offline dan diakses langsung dari icon layar utama HP.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    triggerHaptic('success');
                    await install();
                    handleClose();
                  }}
                  className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Install Sekarang</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-xs text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Browser Siap / Sudah Terinstall</span>
                </div>
                <p className="text-[11px] text-amber-300/80">
                  Jika ikon belum muncul di Layar Utama, Anda dapat membukanya melalui menu browser "Tambahkan ke Layar Utama".
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
};
