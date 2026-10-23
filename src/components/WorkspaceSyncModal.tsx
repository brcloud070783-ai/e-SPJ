import React, { useState } from 'react';
import {
  X,
  FolderKanban,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Search,
  Link,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { DriveSpreadsheetItem, WorkspaceConfig } from '../types/spj';

interface WorkspaceSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  isLoggingIn: boolean;
  onGoogleLogin: () => Promise<void>;
  onGoogleLogout: () => Promise<void>;
  workspaceConfig: WorkspaceConfig | null;
  onProvisionWorkspace: () => Promise<void>;
  onConnectExistingSpreadsheet: (rawUrlOrId: string) => Promise<void>;
  onLoadDriveSpreadsheets: () => Promise<DriveSpreadsheetItem[]>;
  onToggleAutoSync: (enabled: boolean) => void;
  onSyncAllData: () => Promise<void>;
  isSyncing: boolean;
  syncError: string | null;
  syncSuccessMessage: string | null;
  counts: {
    kuitansi: number;
    dokumentasi: number;
    pengeluaran: number;
    dokumenPendukung: number;
    customFields: number;
  };
}

export const WorkspaceSyncModal: React.FC<WorkspaceSyncModalProps> = ({
  isOpen,
  onClose,
  user,
  isLoggingIn,
  onGoogleLogin,
  onGoogleLogout,
  workspaceConfig,
  onProvisionWorkspace,
  onConnectExistingSpreadsheet,
  onLoadDriveSpreadsheets,
  onToggleAutoSync,
  onSyncAllData,
  isSyncing,
  syncError,
  syncSuccessMessage,
  counts,
}) => {
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [sheetSetupMode, setSheetSetupMode] = useState<'create' | 'existing'>('create');
  const [existingSheetInput, setExistingSheetInput] = useState('');
  const [driveSheets, setDriveSheets] = useState<DriveSpreadsheetItem[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);
  const [showChangeSheet, setShowChangeSheet] = useState(false);

  if (!isOpen) return null;

  const handleConfirmSync = async () => {
    setConfirmOverwrite(false);
    await onSyncAllData();
  };

  const handleFetchDriveSpreadsheets = async () => {
    setIsLoadingSheets(true);
    try {
      const list = await onLoadDriveSpreadsheets();
      setDriveSheets(list);
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingSheetInput.trim()) return;
    await onConnectExistingSpreadsheet(existingSheetInput.trim());
    setShowChangeSheet(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="text-xs text-slate-500">
              Integrasi Cloud Resmi · Google Sheets &amp; Google Drive API
            </div>
            <h2 id="workspace-modal-title" className="text-lg font-bold text-slate-900 mt-0.5">
              Pusat Sinkronisasi Otomatis Google Workspace
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            aria-label="Tutup modal Google Workspace"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Error / Success */}
        {syncError && (
          <div
            role="alert"
            className="rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{syncError}</span>
          </div>
        )}

        {syncSuccessMessage && (
          <div
            role="status"
            className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{syncSuccessMessage}</span>
          </div>
        )}

        {/* Step 1: Google Account Authentication */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              1. Akun Google Workspace Pengguna
            </span>
            {user && (
              <button
                type="button"
                onClick={onGoogleLogout}
                className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar Akun</span>
              </button>
            )}
          </div>

          {!user ? (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                Hubungkan akun Google Anda untuk mengaktifkan unggahan foto &amp; dokumen pendukung ke{' '}
                <strong>Google Drive</strong> serta sinkronisasi otomatis Kuitansi &amp; Bukti Pengeluaran ke{' '}
                <strong>Google Sheets</strong>.
              </p>

              <button
                type="button"
                onClick={onGoogleLogin}
                disabled={isLoggingIn}
                className="gsi-material-button min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center justify-center gap-2.5 shadow-2xs transition-colors cursor-pointer w-full sm:w-auto"
              >
                <div className="w-4 h-4 shrink-0">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="w-full h-full block"
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                </div>
                <span>{isLoggingIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {user.displayName || 'Pengguna Google Workspace'}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-700">Terhubung</span>
            </div>
          )}
        </div>

        {/* Step 2: Create New or Use Existing Google Spreadsheet */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800">
              2. Konfigurasi Google Spreadsheet (Buat Baru atau Gunakan yang Sudah Ada)
            </span>
            {workspaceConfig && (
              <button
                type="button"
                onClick={() => setShowChangeSheet((prev) => !prev)}
                className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
              >
                {showChangeSheet ? 'Batal Ganti' : 'Ganti Spreadsheet'}
              </button>
            )}
          </div>

          {!workspaceConfig || showChangeSheet ? (
            <div className="space-y-3">
              {/* Segmented Switcher: Buat Spreadsheet Baru vs Gunakan Spreadsheet yang Ada */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSheetSetupMode('create')}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    sheetSetupMode === 'create'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buat Spreadsheet Baru
                </button>
                <button
                  type="button"
                  onClick={() => setSheetSetupMode('existing')}
                  className={`flex-1 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    sheetSetupMode === 'existing'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Gunakan Spreadsheet yang Ada
                </button>
              </div>

              {sheetSetupMode === 'create' ? (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Aplikasi akan membuat spreadsheet baru terstruktur dengan 6 tab analitik:{' '}
                    <strong>Ringkasan_Analitik</strong>, <strong>Kuitansi_SPPD</strong>,{' '}
                    <strong>Rincian_Biaya</strong>, <strong>Dokumentasi_Perjalanan</strong>,{' '}
                    <strong>Dokumentasi_Pengeluaran</strong>, dan{' '}
                    <strong>Dokumen_Pendukung_SPJ</strong> beserta folder khusus di Google Drive.
                  </p>
                  <button
                    type="button"
                    disabled={!user || isSyncing}
                    onClick={onProvisionWorkspace}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <FolderKanban className="w-4 h-4" />
                    <span>
                      {isSyncing
                        ? 'Menyiapkan Sheets & Drive...'
                        : 'Buat Spreadsheet Baru & Folder Drive Otomatis'}
                    </span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConnectExisting} className="space-y-3 pt-1">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Masukkan URL atau ID Google Spreadsheet yang sudah ada di Google Drive Anda.
                    Aplikasi akan otomatis menyiapkan tab SPJ yang diperlukan tanpa menghapus data lain.
                  </p>
                  <div>
                    <label
                      htmlFor="input-existing-sheet"
                      className="block text-xs font-medium text-slate-700 mb-1"
                    >
                      URL atau ID Google Spreadsheet
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="input-existing-sheet"
                        type="text"
                        placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA.../edit"
                        value={existingSheetInput}
                        onChange={(e) => setExistingSheetInput(e.target.value)}
                        className="flex-1 min-h-[42px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      />
                      <button
                        type="submit"
                        disabled={!user || isSyncing || !existingSheetInput.trim()}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Link className="w-3.5 h-3.5" />
                        <span>Hubungkan Sheet</span>
                      </button>
                    </div>
                  </div>

                  {user && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleFetchDriveSpreadsheets}
                        disabled={isLoadingSheets}
                        className="text-xs font-semibold text-sky-700 hover:underline flex items-center gap-1.5 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>
                          {isLoadingSheets
                            ? 'Memuat daftar dari Drive...'
                            : 'Cari & Pilih dari Daftar Google Drive Saya'}
                        </span>
                      </button>

                      {driveSheets.length > 0 && (
                        <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                          {driveSheets.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setExistingSheetInput(item.id)}
                              className="w-full px-3 py-2 text-left text-xs hover:bg-sky-50 flex items-center justify-between gap-2"
                            >
                              <span className="font-semibold text-slate-800 truncate">
                                {item.name}
                              </span>
                              <span className="font-mono text-[11px] text-slate-500 shrink-0">
                                Pilih
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </form>
              )}
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                  <div className="truncate">
                    <p className="font-bold text-slate-900 truncate">
                      {workspaceConfig.spreadsheetTitle}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">
                      ID: {workspaceConfig.spreadsheetId}
                    </p>
                  </div>
                </div>
                <a
                  href={workspaceConfig.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-semibold hover:bg-emerald-100 flex items-center gap-1 shrink-0"
                >
                  <span>Buka Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="text-slate-600 px-1 space-y-1">
                <p>
                  Struktur 6 Tab Analitik Aktif: <strong>Ringkasan_Analitik</strong>,{' '}
                  <strong>Kuitansi_SPPD</strong> (+{counts.customFields} Kolom Kustom),{' '}
                  <strong>Rincian_Biaya</strong>, <strong>Dokumentasi_Perjalanan</strong>,{' '}
                  <strong>Dokumentasi_Pengeluaran</strong>, dan{' '}
                  <strong>Dokumen_Pendukung_SPJ</strong>.
                </p>
                {workspaceConfig.lastSyncedAt && (
                  <p className="text-[11px] text-slate-500">
                    Sinkronisasi terakhir: {new Date(workspaceConfig.lastSyncedAt).toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Auto-Sync & Manual Sync Controls */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                3. Sinkronisasi Otomatis (Auto-Sync ke Google Sheets)
              </span>
              <span className="text-[11px] text-slate-500">
                Otomatis menyinkronkan setiap perubahan kuitansi, bukti pengeluaran, dan tautan Drive
              </span>
            </div>

            <label className="inline-flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={workspaceConfig?.autoSyncEnabled ?? true}
                onChange={(e) => onToggleAutoSync(e.target.checked)}
                className="rounded border-slate-300 text-sky-700 focus:ring-sky-600 w-4 h-4"
              />
              <span className="text-xs font-semibold text-slate-800">Auto-Sync Aktif</span>
            </label>
          </div>

          {workspaceConfig && (
            <div className="pt-1">
              {!confirmOverwrite ? (
                <button
                  type="button"
                  disabled={!user || isSyncing}
                  onClick={() => setConfirmOverwrite(true)}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>
                    {isSyncing
                      ? 'Menyinkronkan ke Google Sheets & Drive...'
                      : 'Sinkronkan Semua Data & Tautan Drive Sekarang'}
                  </span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5">
                  <div className="flex items-start gap-2 text-amber-950">
                    <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                      <strong>Konfirmasi Pembaruan Google Sheets &amp; Drive:</strong> Anda akan
                      memperbarui spreadsheet{' '}
                      <strong>&ldquo;{workspaceConfig.spreadsheetTitle}&rdquo;</strong> ({counts.kuitansi}{' '}
                      Kuitansi, {counts.dokumentasi} Dokumentasi Kegiatan, {counts.pengeluaran} Bukti
                      Pengeluaran, dan {counts.dokumenPendukung} Dokumen Pendukung) serta mengunggah
                      berkas lokal ke Google Drive.
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmOverwrite(false)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-semibold text-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmSync}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold"
                    >
                      Ya, Konfirmasi &amp; Perbarui Sheets
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
