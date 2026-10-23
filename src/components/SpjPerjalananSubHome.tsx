import {
  FileText,
  Camera,
  Receipt,
  Building2,
  ArrowRight,
  Plus,
  MapPin,
  User,
  Calendar,
  Trash2,
  Copy,
  FolderOpen,
  CheckCircle2,
} from 'lucide-react';
import {
  KuitansiPerjalananDinas,
  DokumentasiPerjalananItem,
  DokumentasiPengeluaranItem,
} from '../types/spj';
import {
  calculateKuitansiTotal,
  calculateExpenseReconciliation,
  formatRupiah,
} from '../utils/spjCalculations';
import { InfoTooltip, UnifiedMediaCard } from './UiPatterns';

export type SpjSubSectionKey = 'kuitansi' | 'surat-tugas' | 'dokumentasi' | 'pengeluaran';

interface SpjPerjalananSubHomeProps {
  kuitansiList: KuitansiPerjalananDinas[];
  activeKuitansi: KuitansiPerjalananDinas;
  onSelectKuitansi: (id: string) => void;
  onCreateNewKuitansi: () => void;
  onDuplicateKuitansi?: () => void;
  onDeleteKuitansi?: (kuitansi: KuitansiPerjalananDinas) => void;
  docPerjalanan: DokumentasiPerjalananItem[];
  docPengeluaran: DokumentasiPengeluaranItem[];
  allDocPerjalanan?: DokumentasiPerjalananItem[];
  allDocPengeluaran?: DokumentasiPengeluaranItem[];
  onOpenSubSection: (section: SpjSubSectionKey) => void;
}

export const SpjPerjalananSubHome: React.FC<SpjPerjalananSubHomeProps> = ({
  kuitansiList,
  activeKuitansi,
  onSelectKuitansi,
  onCreateNewKuitansi,
  onDuplicateKuitansi,
  onDeleteKuitansi,
  docPerjalanan,
  docPengeluaran,
  allDocPerjalanan,
  allDocPengeluaran,
  onOpenSubSection,
}) => {
  const totalKuitansi = calculateKuitansiTotal(activeKuitansi.rincian);
  const reconciliation = calculateExpenseReconciliation(totalKuitansi, docPengeluaran);
  const formattedUpdatedDate = activeKuitansi.updatedAt
    ? new Date(activeKuitansi.updatedAt).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : activeKuitansi.tanggalPerjalanan;

  // Kartu Modul 1 sampai 4 fokus menampilkan status progres tanpa mengulang Nama, NIP, Tujuan, atau Nomor SPT
  const subModules: Array<{
    key: SpjSubSectionKey;
    title: string;
    subtitle: string;
    description: string;
    highlightValue: string;
    metadataItems: string[];
    statusText: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBgClass: string;
  }> = [
    {
      key: 'kuitansi',
      title: '1. Kuitansi',
      subtitle: 'Kuitansi Perjalanan Dinas (SPPD)',
      description:
        'Studio kanvas kuitansi interaktif (ketuk elemen kertas untuk edit) dengan cetak A4 / F4 Folio.',
      highlightValue: formatRupiah(totalKuitansi),
      metadataItems: [
        `${activeKuitansi.rincian.length} Rincian Biaya`,
        `Diperbarui ${formattedUpdatedDate}`,
      ],
      statusText: activeKuitansi.statusSync,
      icon: FileText,
      iconBgClass: 'bg-sky-700 text-white',
    },
    {
      key: 'surat-tugas',
      title: '2. Surat Tugas (SPT) & SPD',
      subtitle: 'Naskah SPT & Blanko SPD Resmi',
      description:
        'Editor naskah Surat Perintah Tugas (SPT) dan Blanko Surat Perjalanan Dinas (SPD) resmi Disdikbud Kaltara dengan integrasi data otomatis.',
      highlightValue: activeKuitansi.noSpt || 'Format Resmi Disdikbud',
      metadataItems: [
        'SPT & Blanko SPD Terintegrasi',
        'Cetak Resmi A4 / F4 Folio',
      ],
      statusText: 'Format Resmi',
      icon: Building2,
      iconBgClass: 'bg-indigo-700 text-white',
    },
    {
      key: 'dokumentasi',
      title: '3. Dokumentasi',
      subtitle: 'Foto Kegiatan & Dokumen Pendukung SPJ',
      description:
        'Unggah foto kegiatan lapangan serta berkas pendukung perjalanan dinas (SPT, SPPD, Undangan).',
      highlightValue: `${docPerjalanan.length} Berkas`,
      metadataItems: [
        docPerjalanan.length > 0
          ? 'Siap dicetak pada lembar lampiran'
          : 'Belum ada unggahan berkas',
      ],
      statusText: docPerjalanan.length > 0 ? 'Tersedia' : 'Kosong',
      icon: Camera,
      iconBgClass: 'bg-emerald-700 text-white',
    },
    {
      key: 'pengeluaran',
      title: '4. Foto/Scan Bukti Pengeluaran',
      subtitle: 'Nota, Tiket, Boarding Pass & Invoice Hotel',
      description:
        'Unggah foto/scan bukti pengeluaran riil dan pantau rekonsiliasi otomatis terhadap nilai kuitansi.',
      highlightValue: `Rekonsiliasi ${reconciliation.persentaseLengkap}%`,
      metadataItems: [
        `${docPengeluaran.length} Bukti (${formatRupiah(reconciliation.totalDocumented)})`,
        `Selisih ${formatRupiah(reconciliation.selisih)}`,
      ],
      statusText: reconciliation.status,
      icon: Receipt,
      iconBgClass: 'bg-amber-600 text-white',
    },
  ];

  return (
    <div className="space-y-5">
      {/* SATU STICKY CONTEXT HEADER: Menampilkan Nomor SPT, Nama Pelaksana, NIP, dan Tujuan satu kali saja */}
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-sky-700">
              Konteks Berkas SPJ Aktif
            </span>
            <InfoTooltip
              variant="info"
              align="left"
              title="Konteks Tunggal SPJ"
              content="Informasi Pelaksana, NIP, Tujuan, dan Nomor SPT di bawah berlaku untuk keempat modul di halaman ini."
            />
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="subhome-kuitansi-select" className="sr-only">
              Pilih Berkas SPJ Aktif
            </label>
            <select
              id="subhome-kuitansi-select"
              value={activeKuitansi.id}
              onChange={(e) => onSelectKuitansi(e.target.value)}
              className="flex-1 sm:w-64 min-h-[38px] rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900 focus:border-sky-600 focus:bg-white focus:outline-none"
            >
              {kuitansiList.map((item, idx) => (
                <option key={item.id} value={item.id}>
                  SPJ #{idx + 1} · {item.atasNama} — {item.tujuan} (
                  {formatRupiah(calculateKuitansiTotal(item.rincian))})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="min-h-[38px] px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>SPJ Baru</span>
            </button>

            {onDeleteKuitansi && (
              <button
                type="button"
                onClick={() => onDeleteKuitansi(activeKuitansi)}
                title="Hapus berkas SPJ yang sedang aktif"
                aria-label="Hapus berkas SPJ aktif"
                className="min-h-[38px] px-2.5 sm:px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold inline-flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hapus SPJ</span>
              </button>
            )}
          </div>
        </div>

        {/* Baris Ringkas Konteks Tunggal: Nama & NIP | Tujuan & Tanggal | Nomor SPT */}
        <div className="pt-2.5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <User className="w-4 h-4 text-sky-700 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{activeKuitansi.atasNama}</p>
              <p className="text-[11px] font-mono text-slate-500 truncate">
                NIP {activeKuitansi.nipPenerima}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-emerald-700 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">Tujuan: {activeKuitansi.tujuan}</p>
              <p className="text-[11px] text-slate-500 truncate inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{activeKuitansi.tanggalPerjalanan}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200/80">
            <span className="text-[11px] text-slate-500">No. SPT:</span>
            <span className="font-mono font-bold text-red-700 truncate">
              {activeKuitansi.noSpt}
            </span>
          </div>
        </div>
      </div>

      {/* 4 KARTU MODUL: Fokus murni pada status progres tanpa pengulangan Nama, NIP, Tujuan, atau SPT */}
      <div
        role="region"
        aria-label="Daftar Modul SPJ Perjalanan Dinas"
        className="grid grid-cols-1 sm:grid-cols-2 gap-4"
      >
        {subModules.map((mod) => (
          <UnifiedMediaCard
            key={mod.key}
            symbolIcon={mod.icon}
            symbolBgClass={mod.iconBgClass}
            metadataItems={mod.metadataItems}
            statusText={mod.statusText}
            title={mod.title}
            subtitle={mod.subtitle}
            highlightValue={mod.highlightValue}
            description={mod.description}
            onClick={() => onOpenSubSection(mod.key)}
            footerLeft={
              <span className="text-slate-500">Ketuk untuk membuka ruang kerja</span>
            }
            footerRight={
              <span className="inline-flex items-center gap-1 font-bold text-sky-700 group-hover:translate-x-0.5 transition-transform">
                <span>Buka</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            }
          />
        ))}
      </div>

      {/* 5. TABEL KELOLA BERKAS SPJ: Memudahkan melihat seluruh SPJ, beralih berkas, duplikasi, dan hapus berkas SPJ */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-sky-700" />
              <span>Daftar Seluruh Berkas SPJ</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {kuitansiList.length} Berkas
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih berkas aktif, pratinjau kuitansi, gandakan data, atau hapus berkas SPJ yang pernah dibuat.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onDuplicateKuitansi && (
              <button
                type="button"
                onClick={onDuplicateKuitansi}
                className="min-h-[34px] px-2.5 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplikat Aktif</span>
              </button>
            )}
            <button
              type="button"
              onClick={onCreateNewKuitansi}
              className="min-h-[34px] px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ SPJ Baru</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold bg-slate-50/75">
                <th className="py-2.5 px-3">No</th>
                <th className="py-2.5 px-3">Pelaksana &amp; NIP</th>
                <th className="py-2.5 px-3">Nomor SPT &amp; Kuitansi</th>
                <th className="py-2.5 px-3">Tujuan &amp; Tanggal</th>
                <th className="py-2.5 px-3 text-right">Nilai Kuitansi</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {kuitansiList.map((item, idx) => {
                const isActive = item.id === activeKuitansi.id;
                const totalItem = calculateKuitansiTotal(item.rincian);
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isActive ? 'bg-sky-50/60 font-semibold' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-slate-500 font-mono">
                      #{idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-bold text-slate-900 truncate max-w-[180px]">
                        {item.atasNama || '(Nama belum diisi)'}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500">
                        {item.nipPenerima ? `NIP ${item.nipPenerima}` : '-'}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="font-mono text-red-700 font-bold truncate max-w-[200px]">
                        {item.noSpt}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
                        {item.noKuitansi}
                      </p>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-slate-800 truncate max-w-[180px]">{item.tujuan}</p>
                      <p className="text-[11px] text-slate-500">{item.tanggalPerjalanan}</p>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatRupiah(totalItem)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Aktif</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px]">
                          Tersimpan
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isActive ? (
                          <button
                            type="button"
                            onClick={() => onSelectKuitansi(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-800 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Pilih
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onOpenSubSection('kuitansi')}
                            className="px-2.5 py-1 rounded-lg bg-sky-700 hover:bg-sky-800 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        {onDeleteKuitansi && (
                          <button
                            type="button"
                            onClick={() => onDeleteKuitansi(item)}
                            title={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                            aria-label={`Hapus berkas SPJ ${item.atasNama || item.noSpt}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
