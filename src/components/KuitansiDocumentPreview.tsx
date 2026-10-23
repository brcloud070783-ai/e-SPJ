import React from 'react';
import { KuitansiPerjalananDinas, CustomFieldDefinition, PaperSize } from '../types/spj';
import {
  calculateKuitansiTotal,
  terbilangRupiah,
  formatRupiah,
  formatRincianFormula,
} from '../utils/spjCalculations';
import { KaltaraEmblem } from './KaltaraEmblem';

export type CanvasEditableZone = 'utama' | 'rincian' | 'kustom';

interface KuitansiDocumentPreviewProps {
  kuitansi: KuitansiPerjalananDinas;
  customFields?: CustomFieldDefinition[];
  paperSize?: PaperSize;
  activeZone?: CanvasEditableZone | null;
  onSelectZone?: (zone: CanvasEditableZone) => void;
}

export const KuitansiDocumentPreview: React.FC<KuitansiDocumentPreviewProps> = ({
  kuitansi,
  customFields = [],
  paperSize = 'A4',
  activeZone = null,
  onSelectZone,
}) => {
  const totalAmount = calculateKuitansiTotal(kuitansi.rincian);
  const terbilangText = terbilangRupiah(totalAmount);

  const printableCustomFields = customFields.filter(
    (cf) => cf.showInPrint && kuitansi.customFieldValues?.[cf.id]?.trim()
  );

  const isF4 = paperSize === 'F4';
  const isInteractive = typeof onSelectZone === 'function';

  // Maksimal 85% dari tinggi kertas (A4: 85% dari 1123px = 954px, F4: 85% dari 1247px = 1060px)
  const maxContentHeightPx = isF4 ? 1060 : 954;

  const getZoneClasses = (zone: CanvasEditableZone) => {
    if (!isInteractive) return '';
    const isSelected = activeZone === zone;
    return `relative rounded-sm transition-all cursor-pointer print:ring-0 print:bg-transparent ${
      isSelected
        ? 'ring-2 ring-sky-500 bg-sky-50/30 print:bg-transparent'
        : 'hover:ring-1 hover:ring-sky-400/80 hover:bg-sky-50/15'
    }`;
  };

  const renderCanvaSelectionBadge = (zone: CanvasEditableZone, label: string) => {
    if (!isInteractive || activeZone !== zone) return null;
    return (
      <span className="no-print absolute -top-5 left-0 z-10 px-2 py-0.5 rounded-t-md bg-sky-600 text-white font-sans text-[10px] font-bold tracking-wide shadow-2xs pointer-events-none">
        {label} · Ketuk untuk edit
      </span>
    );
  };

  return (
    <div
      data-testid="kuitansi-official-sheet"
      data-paper-format={paperSize}
      className={`kuitansi-official-font bg-white text-black w-full leading-tight select-text ${
        isF4
          ? 'px-0 pt-6 pb-6 min-h-[1247px] print:px-0 print:pt-2 print:pb-2 print:min-h-0'
          : 'px-0 pt-5 pb-5 min-h-[1123px] print:px-0 print:pt-1.5 print:pb-2 print:min-h-0'
      }`}
    >
      {/* Pembatas lebar isi 85% dari lebar kertas & tinggi maksimal 85% tinggi kertas */}
      <div
        data-testid="kuitansi-content-area"
        style={{
          width: '85%',
          maxWidth: '85%',
          maxHeight: `${maxContentHeightPx}px`,
        }}
        className="w-[85%] max-w-[85%] mx-auto print:w-[85%] print:max-w-[85%] print:mx-auto print:max-h-[85vh]"
      >
        {/* KOP SURAT PEMPROV KALIMANTAN UTARA - DISDIKBUD (Rapat secara vertikal) */}
        <div className="flex items-center gap-3.5 pb-1.5 border-b-[2.5px] border-black relative">
          <div className="shrink-0 pl-0.5">
            <KaltaraEmblem
              className="w-15 h-19"
              logoDataUrl={kuitansi.logoPemprovDataUrl}
            />
          </div>
          <div className="flex-1 text-center pr-1 leading-tight">
            <p className="text-[16px] tracking-wide font-normal uppercase text-black leading-tight">
              {kuitansi.instansiUtama}
            </p>
            <h2 className="text-[18px] font-bold uppercase text-black leading-tight mt-0.5">
              {kuitansi.namaDinas}
            </h2>
            <p className="text-[11.5px] text-black mt-0.5 leading-tight">
              {kuitansi.alamatDinasBaris1}
            </p>
            <p className="text-[11.5px] text-black leading-tight">
              {kuitansi.alamatDinasBaris2}
            </p>
            <p className="text-[11.5px] text-black leading-tight">
              {kuitansi.kontakDinas}
            </p>
          </div>
        </div>
        {/* Garis ganda bawah kop surat */}
        <div className="border-t border-black mt-[2px] mb-1.5" />

        {/* ZONA CANVA 1A: Tahun Anggaran, No. Kuitansi & Sub Kegiatan */}
        <div
          onClick={() => onSelectZone?.('utama')}
          className={getZoneClasses('utama')}
          title={
            isInteractive
              ? 'Ketuk untuk mengedit Informasi Anggaran & Sub Kegiatan'
              : undefined
          }
        >
          {renderCanvaSelectionBadge('utama', '1. Pelaksana, SPT & Anggaran')}
          <div className="flex justify-end text-[12.5px] text-black mb-0.5 leading-tight">
            <span>Tahun Anggaran &nbsp;&nbsp;{kuitansi.tahunAnggaran}</span>
          </div>

          <div className="text-[12.5px] space-y-0.5 mb-2 leading-tight">
            <div className="grid grid-cols-[130px_12px_1fr] items-start">
              <span>No. Kuitansi</span>
              <span>:</span>
              <span className="font-mono">
                {kuitansi.noKuitansi || (
                  <span className="no-print text-slate-400 italic font-sans font-normal">
                    [Diisi manual oleh Bendahara]
                  </span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-[130px_12px_1fr] items-start">
              <span>Sub Kegiatan</span>
              <span>:</span>
              <span className="leading-tight">
                {kuitansi.subKegiatan || (
                  <span className="no-print text-slate-400 italic">
                    [Isi Kode &amp; Nama Sub Kegiatan di Form Kuitansi]
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Judul KUITANSI */}
        <div className={`text-center ${isF4 ? 'my-2.5' : 'my-2'}`}>
          <h3 className="text-[18px] font-bold tracking-wider uppercase text-black leading-tight">
            KUITANSI
          </h3>
        </div>

        {/* Isi Utama Kuitansi (Spasi vertikal rapat) */}
        <div className={`text-[12.5px] leading-tight ${isF4 ? 'space-y-2' : 'space-y-1.5'}`}>
          {/* Sudah terima dari */}
          <div
            onClick={() => onSelectZone?.('utama')}
            className={`grid grid-cols-[130px_12px_1fr] items-baseline ${getZoneClasses('utama')}`}
          >
            <span>Sudah terima dari</span>
            <span>:</span>
            <span>{kuitansi.sudahTerimaDari}</span>
          </div>

          {/* ZONA CANVA 2A: Sebesar & Terbilang Rupiah */}
          <div
            onClick={() => onSelectZone?.('rincian')}
            className={`space-y-1 ${getZoneClasses('rincian')}`}
            title={isInteractive ? 'Ketuk untuk mengedit Rincian Biaya' : undefined}
          >
            {renderCanvaSelectionBadge('rincian', '2. Rincian Biaya & Total')}
            {/* Sebesar */}
            <div className="grid grid-cols-[130px_12px_1fr] items-baseline">
              <span>Sebesar</span>
              <span>:</span>
              <span
                data-testid="kuitansi-total-display"
                className="text-[15.5px] font-bold tabular-nums text-black leading-tight"
              >
                {formatRupiah(totalAmount)}
              </span>
            </div>

            {/* Terbilang Rupiah dengan Kotak Border Hijau Tua sesuai Gambar 1 */}
            <div className="grid grid-cols-[130px_12px_1fr] items-center">
              <span>Terbilang Rupiah</span>
              <span>:</span>
              <div
                data-testid="kuitansi-terbilang-display"
                className="border-[1.5px] border-emerald-800 px-2 py-0.5 italic text-[13px] text-black bg-white leading-tight"
              >
                {terbilangText}
              </div>
            </div>
          </div>

          {/* Untuk Pengeluaran */}
          <div className="grid grid-cols-[130px_12px_1fr] items-start">
            <span>Untuk Pengeluaran</span>
            <span>:</span>
            <div className="space-y-1.5 min-w-0">
              {/* ZONA CANVA 1B: Uraian, A.n, Tujuan, Tanggal, No. SPT */}
              <div
                onClick={() => onSelectZone?.('utama')}
                className={`space-y-1 ${getZoneClasses('utama')}`}
                title={
                  isInteractive
                    ? 'Ketuk untuk mengedit Pelaksana, Tujuan & No. SPT'
                    : undefined
                }
              >
                <p className="leading-tight">{kuitansi.untukPengeluaran}</p>

                <div className="pt-0.5 space-y-0.5 leading-tight">
                  <div className="grid grid-cols-[110px_12px_1fr] items-baseline">
                    <span>A.n</span>
                    <span>:</span>
                    <span>
                      {kuitansi.atasNama || (
                        <span className="no-print text-slate-400 italic">
                          [Isi Nama Pelaksana di Form Kuitansi]
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-[110px_12px_1fr] items-baseline">
                    <span>Tujuan</span>
                    <span>:</span>
                    <span>{kuitansi.tujuan}</span>
                  </div>
                  <div className="grid grid-cols-[110px_12px_1fr] items-baseline">
                    <span>Tanggal</span>
                    <span>:</span>
                    <span>{kuitansi.tanggalPerjalanan}</span>
                  </div>
                  <div className="grid grid-cols-[110px_12px_1fr] items-baseline">
                    <span>No. SPT</span>
                    <span>:</span>
                    <span className="text-red-600 font-medium">{kuitansi.noSpt}</span>
                  </div>
                </div>
              </div>

              {/* ZONA CANVA 3: Dynamic Custom Fields Marked as Show In Print */}
              {printableCustomFields.length > 0 && (
                <div
                  onClick={() => onSelectZone?.('kustom')}
                  className={`space-y-0.5 ${getZoneClasses('kustom')}`}
                  title={isInteractive ? 'Ketuk untuk mengedit Bidang Kustom' : undefined}
                >
                  {renderCanvaSelectionBadge('kustom', '3. Bidang Kustom')}
                  {printableCustomFields.map((cf) => (
                    <div
                      key={cf.id}
                      data-testid={`kuitansi-custom-field-print-${cf.id}`}
                      className="grid grid-cols-[110px_12px_1fr] items-baseline leading-tight"
                    >
                      <span className="truncate">{cf.label}</span>
                      <span>:</span>
                      <span>{kuitansi.customFieldValues?.[cf.id]}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ZONA CANVA 2B: Tabel Rincian Biaya */}
              <div
                onClick={() => onSelectZone?.('rincian')}
                className={`pt-1 ${getZoneClasses('rincian')}`}
                title={isInteractive ? 'Ketuk untuk mengedit Rincian Biaya' : undefined}
              >
                <p className="mb-0.5 leading-tight">Dengan rincian :</p>
                <div className="space-y-0.5">
                  {kuitansi.rincian.map((item, idx) => {
                    const formatted = formatRincianFormula(item);
                    return (
                      <div
                        key={item.id}
                        className="grid grid-cols-[20px_1fr_165px_100px] gap-x-2 items-baseline text-[12.5px] leading-tight"
                      >
                        <span className="tabular-nums">{idx + 1}</span>
                        <div className="pr-1">
                          <span>{item.uraian}</span>
                        </div>
                        <span className="tabular-nums whitespace-nowrap text-left">
                          {formatted.nominalText}
                          {formatted.multiplierText ? (
                            <span className="ml-1.5">{formatted.multiplierText}</span>
                          ) : null}
                        </span>
                        <span className="tabular-nums text-right font-normal">
                          {formatted.subtotalText}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bagian Tanda Tangan (Penerima, Pengguna Anggaran, Bendahara Pengeluaran) - Rapat secara vertikal */}
        <div
          onClick={() => onSelectZone?.('utama')}
          className={`${isF4 ? 'mt-5' : 'mt-3.5'} text-[12.5px] leading-tight ${getZoneClasses('utama')}`}
          title={
            isInteractive
              ? 'Ketuk untuk mengedit Tempat/Tanggal Tanda Tangan & Penerima'
              : undefined
          }
        >
          <div className="grid grid-cols-[1fr_240px]">
            <div />
            <div>
              <p className="leading-tight">{kuitansi.tempatTanggalTtd}</p>
              <p className="leading-tight">Penerima,</p>
              <div className={isF4 ? 'h-12' : 'h-10'} />
              <p className="font-normal text-black leading-tight">
                {kuitansi.atasNama || (
                  <span className="no-print text-slate-400 italic">
                    [Isi Nama Pelaksana]
                  </span>
                )}
              </p>
              <p className="tabular-nums leading-tight">
                NIP{' '}
                {kuitansi.nipPenerima || (
                  <span className="no-print text-slate-400 italic">
                    [Isi NIP Pelaksana]
                  </span>
                )}
              </p>
            </div>
          </div>

          <div
            className={`${isF4 ? 'mt-4' : 'mt-2.5'} grid grid-cols-[1fr_240px] gap-4 items-start leading-tight`}
          >
            <div>
              <p className="leading-tight">Menyetujui</p>
              <p className="leading-tight">
                {kuitansi.jabatanPenggunaAnggaran || 'Pengguna Anggaran'}
              </p>
              <div className={isF4 ? 'h-12' : 'h-10'} />
              <p className="text-black leading-tight">{kuitansi.namaPenggunaAnggaran}</p>
              <p className="tabular-nums leading-tight">
                NIP {kuitansi.nipPenggunaAnggaran}
              </p>
            </div>

            <div>
              <p className="invisible select-none leading-tight" aria-hidden="true">
                &nbsp;
              </p>
              <p className="leading-tight">
                {kuitansi.jabatanBendahara
                  ? `${kuitansi.jabatanBendahara.replace(/,+$/, '')},`
                  : 'Bendahara Pengeluaran,'}
              </p>
              <div className={isF4 ? 'h-12' : 'h-10'} />
              <p className="text-black leading-tight">{kuitansi.namaBendahara}</p>
              <p className="tabular-nums leading-tight">NIP {kuitansi.nipBendahara}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
