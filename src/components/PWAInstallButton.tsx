import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleTrigger = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleTrigger}
        className="min-h-[40px] px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        aria-label="Instal Aplikasi PWA e-SPJ"
      >
        <Download className="w-3.5 h-3.5 text-sky-700 shrink-0" />
        <span>{isIOS ? 'Instal di iOS' : 'Instal Aplikasi'}</span>
      </button>

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center text-sky-700 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="pwa-install-title" className="text-base font-bold text-slate-900">
                    Pasang e-SPJ Kaltara di Perangkat Anda
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akses cepat dari layar utama HP &amp; dukungan mode luring (PWA)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center"
                aria-label="Tutup panduan instalasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200">
              {isIOS ? (
                <>
                  <p className="font-semibold text-slate-900">Panduan Safari (iPhone / iPad):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed">
                    <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah browser Safari.</li>
                    <li>Gulir ke bawah lalu pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.</li>
                    <li>Ketuk <strong>Tambah</strong> di pojok kanan atas.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p className="font-semibold text-slate-900">Panduan Chrome / Edge (Android &amp; Desktop):</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed">
                    <li>Klik ikon <strong>Instal Aplikasi</strong> pada bilah alamat (address bar) browser Anda, atau buka menu titik tiga di pojok kanan atas.</li>
                    <li>Pilih <strong>Instal aplikasi (Install app)</strong> atau <strong>Tambahkan ke Layar Utama</strong>.</li>
                  </ol>
                </>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
