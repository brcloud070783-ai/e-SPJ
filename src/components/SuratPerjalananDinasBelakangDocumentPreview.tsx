import React from 'react';
import {
  SuratPerintahTugas,
  PaperSize,
  SpdVisumBelakangData,
  SpdVisumPersinggahanRow,
} from '../types/spj';
import { getPaperDimensions } from '../utils/spjCalculations';

export type SpdBelakangEditableZone =
  | 'bagian-1'
  | 'bagian-transit'
  | 'bagian-6'
  | 'bagian-catatan';

interface SuratPerjalananDinasBelakangDocumentPreviewProps {
  spt: SuratPerintahTugas;
  paperSize: PaperSize;
  activeZone?: SpdBelakangEditableZone;
  onSelectZone?: (zone: SpdBelakangEditableZone) => void;
  visumData?: SpdVisumBelakangData;
  onUpdateVisumData?: (updated: SpdVisumBelakangData) => void;
  isPrintMode?: boolean;
}

export const getEffectiveVisumData = (spt: SuratPerintahTugas): SpdVisumBelakangData => {
  const custom = spt.spdVisumData || spt.spdData?.visumBelakang;
  const cleanStr = (val?: string) => (val || '').replace(/;$/, '').trim();

  const defaultPersinggahan: SpdVisumPersinggahanRow[] = [
    {
      id: 'II',
      labelRomawi: 'II',
      tibaDi: '',
      tibaTgl: '',
      tibaKepala: '',
      tibaNip: '',
      berangkatDari: '',
      berangkatKe: '',
      berangkatTgl: '',
      berangkatKepala: '',
      berangkatNip: '',
    },
    {
      id: 'III',
      labelRomawi: 'III',
      tibaDi: '',
      tibaTgl: '',
      tibaKepala: '',
      tibaNip: '',
      berangkatDari: '',
      berangkatKe: '',
      berangkatTgl: '',
      berangkatKepala: '',
      berangkatNip: '',
    },
    {
      id: 'IV',
      labelRomawi: 'IV',
      tibaDi: '',
      tibaTgl: '',
      tibaKepala: '',
      tibaNip: '',
      berangkatDari: '',
      berangkatKe: '',
      berangkatTgl: '',
      berangkatKepala: '',
      berangkatNip: '',
    },
    {
      id: 'V',
      labelRomawi: 'V',
      tibaDi: '',
      tibaTgl: '',
      tibaKepala: '',
      tibaNip: '',
      berangkatDari: '',
      berangkatKe: '',
      berangkatTgl: '',
      berangkatKepala: '',
      berangkatNip: '',
    },
  ];

  const currentNama = spt.namaPenandatangan || 'Hasanuddin, S.Pd., M.Si.';
  const currentPangkat = spt.pangkatPenandatangan || 'Pembina Tingkat I, IV/b';
  const currentNip = spt.nipPenandatangan || '197405272007101010';
  const currentJabatan = spt.jabatanPenandatangan || 'Plt. Kepala Dinas';

  return {
    berangkatDariAwal:
      custom?.berangkatDariAwal ??
      (cleanStr(spt.tempatBerangkat) || 'Tanjung Selor'),
    berangkatKeAwal:
      custom?.berangkatKeAwal ??
      (cleanStr(spt.tempatTujuan) || 'Tarakan'),
    berangkatTglAwal:
      custom?.berangkatTglAwal ??
      (cleanStr(spt.tanggalBerangkat) || '3 Oktober 2025'),
    berangkatKepalaAwal:
      custom?.berangkatKepalaAwal ?? currentJabatan,
    pejabatNamaAwal:
      custom?.pejabatNamaAwal || currentNama,
    pejabatPangkatAwal:
      custom?.pejabatPangkatAwal || currentPangkat,
    pejabatNipAwal:
      custom?.pejabatNipAwal || currentNip,

    persinggahanList:
      custom?.persinggahanList && custom.persinggahanList.length === 4
        ? custom.persinggahanList
        : defaultPersinggahan,

    tibaDiAkhir:
      custom?.tibaDiAkhir ??
      (cleanStr(spt.tempatBerangkat) || 'Tanjung Selor'),
    tibaTglAkhir:
      custom?.tibaTglAkhir ??
      (cleanStr(spt.tanggalHarusKembali) || '4 Oktober 2025'),
    tibaKepalaAkhir:
      custom?.tibaKepalaAkhir ??
      (currentJabatan.includes('Plt') ? 'Plh. Kepala Dinas' : 'Plh. Kepala Dinas'),
    pejabatNamaAkhir:
      custom?.pejabatNamaAkhir || currentNama,
    pejabatPangkatAkhir:
      custom?.pejabatPangkatAkhir || currentPangkat,
    pejabatNipAkhir:
      custom?.pejabatNipAkhir || currentNip,

    keteranganPemeriksa:
      custom?.keteranganPemeriksa ??
      'Telah diperiksa, dengan keterangan bahwa perjalanan tersebut diatas benar dilakukan atas perintah dan semata-mata untuk kepentingan jabatan dalam waktu yang sesingkat-singkatnya.',

    catatanLainLain: custom?.catatanLainLain ?? '',

    teksPerhatian:
      custom?.teksPerhatian ??
      'PPTK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan keuangan negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealpaannya',
  };
};

export const SuratPerjalananDinasBelakangDocumentPreview: React.FC<
  SuratPerjalananDinasBelakangDocumentPreviewProps
> = ({
  spt,
  paperSize,
  activeZone,
  onSelectZone,
  visumData: propVisumData,
  onUpdateVisumData: _onUpdateVisumData,
  isPrintMode = false,
}) => {
  const spec = getPaperDimensions(paperSize);
  const data = propVisumData || getEffectiveVisumData(spt);

  const getZoneClass = (zone: SpdBelakangEditableZone) => {
    if (isPrintMode || !onSelectZone) return '';
    const isActive = activeZone === zone;
    return `relative cursor-pointer transition-all duration-150 group print:outline-none print:ring-0 print:bg-transparent ${
      isActive
        ? 'outline-2 outline-dashed outline-sky-500 -outline-offset-2 bg-sky-50/45'
        : 'hover:bg-sky-50/30 active:bg-sky-50/50 hover:outline-1 hover:outline-dashed hover:outline-sky-400 hover:-outline-offset-2 active:outline-2 active:outline-dashed active:outline-sky-500'
    }`;
  };

  return (
    <div
      style={{
        width: isPrintMode ? '100%' : `${spec.widthPx}px`,
        minHeight: isPrintMode ? 'auto' : `${spec.minHeightPx}px`,
        fontFamily: "Calibri, 'Carlito', 'Arimo', Arial, Liberation Sans, sans-serif",
      }}
      className={`visum-doc spj-font-calibri mx-auto bg-white text-black leading-tight box-border text-[10.5px] print:min-h-0 print:h-auto print:border-none print:shadow-none print:p-0 print:m-0 ${
        isPrintMode
          ? 'print-only-sheet py-2 px-0 m-0'
          : 'shadow-lg border border-slate-300 py-6 px-0 select-text'
      }`}
    >
      <style>{`
        .visum-doc .visum-content-area {
          width: 86%;
          max-width: 86%;
          margin-left: auto;
          margin-right: auto;
        }
        .visum-doc table {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }
        .visum-doc td {
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        @media print {
          .visum-doc .visum-content-area {
            width: 86% !important;
            max-width: 86% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
        }
      `}</style>

      {/* PEMBATAS LEBAR TOTAL VISUM SPD BELAKANG: 86% DARI LEBAR KERTAS (IDENTIK DENGAN SPD DEPAN) */}
      <div
        data-testid="visum-content-area"
        style={{
          width: '86%',
          maxWidth: '86%',
        }}
        className="visum-content-area w-[86%] max-w-[86%] mx-auto print:w-[86%] print:max-w-[86%] print:mx-auto"
      >
        {/* TABEL PENGESAHAN / VISUM SPD */}
        <table
          className="w-full border-collapse border border-black table-fixed text-[10.5px]"
          style={{ borderColor: '#000000' }}
        >
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <tbody>
            {/* BARIS I: KEBERANGKATAN AWAL */}
            <tr className="border-b border-black">
              {/* Kolom Kiri: Kosong sesuai format resmi */}
              <td className="border-r border-black p-2.5 align-top"></td>

              {/* Kolom Kanan: I. Berangkat dari (tempat kedudukan) */}
              <td
                onClick={() => onSelectZone?.('bagian-1')}
                className={`p-2.5 align-top ${getZoneClass('bagian-1')}`}
              >
                <div className="flex items-start">
                  <span className="font-normal w-5 shrink-0 text-left">I.</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                      <span>Berangkat dari</span>
                      <span className="text-center">:</span>
                      <span className="font-normal break-words">{data.berangkatDariAwal}</span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                      <span className="text-[9.5px] text-slate-700 leading-none">(tempat kedudukan)</span>
                      <span className="text-center"></span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                      <span>Ke</span>
                      <span className="text-center">:</span>
                      <span className="font-normal break-words">{data.berangkatKeAwal}</span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                      <span>Pada tanggal</span>
                      <span className="text-center">:</span>
                      <span className="font-normal break-words">{data.berangkatTglAwal}</span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline pt-0.5">
                      <span>Kepala</span>
                      <span className="text-center">:</span>
                      <span className="font-normal break-words">{data.berangkatKepalaAwal}</span>
                    </div>

                    {/* Ruang Tanda Tangan & Cap (Tanpa margin kiri berlebih agar tidak mendorong kolom kanan keluar kertas) */}
                    <div className="pt-6 pl-[100px] text-left w-full break-words">
                      <p className="font-semibold underline">{data.pejabatNamaAwal}</p>
                      <p className="text-[10px]">{data.pejabatPangkatAwal}</p>
                      <p className="text-[10px]">NIP {data.pejabatNipAwal}</p>
                    </div>
                  </div>
                </div>
              </td>
            </tr>

            {/* BARIS II SAMPAI V: TEMPAT PERSINGGAHAN / TRANSIT */}
            {data.persinggahanList &&
              data.persinggahanList.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onSelectZone?.('bagian-transit')}
                  className={`border-b border-black ${getZoneClass('bagian-transit')}`}
                >
                  {/* Kolom Kiri: Tiba di */}
                  <td className="border-r border-black p-2.5 align-top">
                    <div className="flex items-start">
                      <span className="font-normal w-5 shrink-0 text-left">
                        {row.labelRomawi}.
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[96px]">
                        <div className="space-y-0.5 min-h-[54px]">
                          <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                            <span>Tiba di</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.tibaDi}</span>
                          </div>
                          <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                            <span>Pada tanggal</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.tibaTgl}</span>
                          </div>
                          <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                            <span>Kepala</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.tibaKepala}</span>
                          </div>
                        </div>

                        {/* Ruang cap stempel & tanda tangan + NIP */}
                        <div className="pt-4">
                          <p className="break-words">NIP {row.tibaNip}</p>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Kolom Kanan: Berangkat dari */}
                  <td className="p-2.5 align-top">
                    <div className="flex items-start">
                      <span className="w-5 shrink-0" aria-hidden="true"></span>
                      <div className="flex-1 min-w-0 flex flex-col justify-between min-h-[96px]">
                        <div className="space-y-0.5 min-h-[54px]">
                          <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                            <span>Berangkat dari</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatDari}</span>
                          </div>
                          <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                            <span>Ke</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatKe}</span>
                          </div>
                          <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                            <span>Pada tanggal</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatTgl}</span>
                          </div>
                          <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                            <span>Kepala</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatKepala}</span>
                          </div>
                        </div>

                        {/* Ruang cap stempel & tanda tangan + NIP */}
                        <div className="pt-4">
                          <p className="break-words">NIP {row.berangkatNip}</p>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

            {/* BARIS VI: TIBA KEMBALI DI TEMPAT KEDUDUKAN & KETERANGAN PEMERIKSA */}
            <tr className="border-b border-black">
              {/* Kolom Kiri: VI. Tiba di (tempat kedudukan) */}
              <td
                onClick={() => onSelectZone?.('bagian-6')}
                className={`border-r border-black p-2.5 align-top ${getZoneClass(
                  'bagian-6'
                )}`}
              >
                <div className="flex items-start">
                  <span className="font-normal w-5 shrink-0 text-left">VI.</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                      <span>Tiba di</span>
                      <span className="text-center">:</span>
                      <span className="font-normal break-words">{data.tibaDiAkhir}</span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                      <span className="text-[9.5px] text-slate-700 leading-none">(tempat kedudukan)</span>
                      <span className="text-center"></span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-[90px_10px_1fr] items-baseline">
                      <span>Pada tanggal</span>
                      <span className="text-center">:</span>
                      <span className="font-normal break-words">{data.tibaTglAkhir}</span>
                    </div>
                    <div className="pt-0.5">
                      <p className="font-normal break-words">{data.tibaKepalaAkhir}</p>
                    </div>

                    {/* Ruang Tanda Tangan */}
                    <div className="pt-6 text-left w-full break-words">
                      <p className="font-semibold underline">{data.pejabatNamaAkhir}</p>
                      <p className="text-[10px]">{data.pejabatPangkatAkhir}</p>
                      <p className="text-[10px]">NIP {data.pejabatNipAkhir}</p>
                    </div>
                  </div>
                </div>
              </td>

              {/* Kolom Kanan: Keterangan Pemeriksa Perjalanan Dinas */}
              <td
                onClick={() => onSelectZone?.('bagian-6')}
                className={`p-2.5 align-top ${getZoneClass('bagian-6')}`}
              >
                <p className="text-justify leading-snug break-words">
                  {data.keteranganPemeriksa}
                </p>
              </td>
            </tr>

            {/* BARIS VII: CATATAN LAIN-LAIN */}
            <tr
              onClick={() => onSelectZone?.('bagian-catatan')}
              className={`border-b border-black ${getZoneClass('bagian-catatan')}`}
            >
              <td colSpan={2} className="p-2.5 align-top">
                <div className="flex items-start">
                  <span className="font-normal w-6 shrink-0 text-left">VII.</span>
                  <div className="flex-1 min-w-0">
                    <span>Catatan lain-lain</span>
                    {data.catatanLainLain ? (
                      <p className="mt-1 text-[10.5px] break-words">{data.catatanLainLain}</p>
                    ) : null}
                  </div>
                </div>
              </td>
            </tr>

            {/* BARIS VIII: PERHATIAN */}
            <tr
              onClick={() => onSelectZone?.('bagian-catatan')}
              className={`border-b border-black ${getZoneClass('bagian-catatan')}`}
            >
              <td colSpan={2} className="p-2.5 align-top">
                <div className="flex items-start">
                  <span className="font-bold w-6 shrink-0 text-left">VIII.</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="font-bold uppercase tracking-wide">
                      PERHATIAN:
                    </span>
                    <p className="text-justify leading-snug text-[10px] break-words">
                      {data.teksPerhatian}
                    </p>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
