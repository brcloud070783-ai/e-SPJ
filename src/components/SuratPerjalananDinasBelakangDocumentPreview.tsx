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

  const sptBerangkatTgl = cleanStr(spt.tanggalBerangkat);
  const sptKembaliTgl = cleanStr(spt.tanggalHarusKembali);
  const sptTempatBerangkat = cleanStr(spt.tempatBerangkat);
  const sptTempatTujuan = cleanStr(spt.tempatTujuan);

  return {
    berangkatDariAwal:
      sptTempatBerangkat || custom?.berangkatDariAwal || 'Tanjung Selor',
    berangkatKeAwal:
      sptTempatTujuan || custom?.berangkatKeAwal || 'Tarakan',
    berangkatTglAwal:
      sptBerangkatTgl || custom?.berangkatTglAwal || '15 Oktober 2026',
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
      sptTempatBerangkat || custom?.tibaDiAkhir || 'Tanjung Selor',
    tibaTglAkhir:
      sptKembaliTgl || custom?.tibaTglAkhir || '17 Oktober 2026',
    tibaKepalaAkhir:
      custom?.tibaKepalaAkhir ?? currentJabatan,
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
> = React.memo(({
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
        height: isPrintMode ? '100%' : `${spec.minHeightPx}px`,
        minHeight: isPrintMode ? 'auto' : `${spec.minHeightPx}px`,
        maxHeight: isPrintMode ? 'none' : `${spec.minHeightPx}px`,
        fontFamily: "Calibri, 'Carlito', 'Arimo', Arial, Liberation Sans, sans-serif",
        boxSizing: 'border-box',
      }}
      className={`visum-doc spj-font-calibri mx-auto bg-white text-black leading-tight box-border text-[9.5pt] flex flex-col justify-center items-center print:border-none print:shadow-none print:p-0 print:m-0 select-text ${
        isPrintMode ? 'print-only-sheet p-0 m-0 w-full h-full' : 'w-full h-full p-0'
      }`}
    >
      <style>{`
        .visum-doc,
        .visum-doc table,
        .visum-doc tr,
        .visum-doc td,
        .visum-doc th,
        .visum-doc p,
        .visum-doc span,
        .visum-doc div {
          font-family: Calibri, 'Carlito', 'Arimo', Arial, Liberation Sans, sans-serif;
        }
        .visum-doc .visum-content-area {
          width: 88%;
          max-width: 88%;
          height: 90%;
          max-height: 90%;
          margin-top: auto;
          margin-bottom: auto;
          margin-left: auto;
          margin-right: auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
        }
        .visum-doc .visum-table {
          border-collapse: collapse;
          width: 100%;
          height: 100%;
          table-layout: fixed;
          border: 1px solid #000000;
        }
        .visum-doc .visum-table td {
          overflow-wrap: anywhere;
          word-break: break-word;
          height: 1px;
          vertical-align: top;
          font-size: 9.5pt !important;
          line-height: 1.25;
        }
        .visum-doc .visum-table p,
        .visum-doc .visum-table span {
          font-size: 9.5pt !important;
        }
        .visum-doc .text-sub {
          font-size: 8.5pt !important;
        }
        @media print {
          @page {
            size: ${paperSize === 'F4' ? '215mm 330mm' : '210mm 297mm'};
            margin: 0 !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            background: #ffffff !important;
          }
          #spj-isolated-print-root .spj-isolated-print-page {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: ${paperSize === 'F4' ? '330mm' : '297mm'} !important;
            max-height: ${paperSize === 'F4' ? '330mm' : '297mm'} !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            box-sizing: border-box !important;
          }
          .visum-doc {
            width: 100% !important;
            height: ${paperSize === 'F4' ? '330mm' : '297mm'} !important;
            max-height: ${paperSize === 'F4' ? '330mm' : '297mm'} !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .visum-doc .visum-content-area {
            width: 88% !important;
            max-width: 88% !important;
            height: 90% !important;
            max-height: 90% !important;
            margin: auto !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            box-sizing: border-box !important;
          }
          .visum-doc .visum-table {
            width: 100% !important;
            height: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          .visum-doc,
          .visum-doc .visum-table,
          .visum-doc .visum-table td,
          .visum-doc .visum-table th,
          .visum-doc .visum-table p,
          .visum-doc .visum-table span {
            font-size: 9.5pt !important;
          }
        }
      `}</style>

      {/* PEMBATAS TOTAL VISUM SPD BELAKANG: 88% LEBAR KERTAS & 90% TINGGI KERTAS (TEPAT DI TENGAH SECARA VERTIKAL & HORIZONTAL) */}
      <div
        data-testid="visum-content-area"
        style={{
          width: '88%',
          maxWidth: '88%',
          height: '90%',
          maxHeight: '90%',
        }}
        className="visum-content-area w-[88%] max-w-[88%] h-[90%] max-h-[90%] mx-auto my-auto flex flex-col justify-center items-center"
      >
        {/* TABEL PENGESAHAN / VISUM SPD */}
        <table
          className="visum-table w-full h-full border-collapse border border-black table-fixed text-[9.5pt]"
          style={{ borderColor: '#000000', height: '100%', width: '100%' }}
        >
          <colgroup>
            <col style={{ width: '50%' }} />
            <col style={{ width: '50%' }} />
          </colgroup>
          <tbody>
            {/* BARIS I: KEBERANGKATAN AWAL (~16% tinggi tabel) */}
            <tr className="border-b border-black" style={{ height: '16%' }}>
              {/* Kolom Kiri: Kosong sesuai format resmi */}
              <td className="border-r border-black p-2 align-top h-full"></td>

              {/* Kolom Kanan: I. Berangkat dari (tempat kedudukan) */}
              <td
                onClick={() => onSelectZone?.('bagian-1')}
                className={`p-2 align-top h-full ${getZoneClass('bagian-1')}`}
              >
                <div className="h-full flex flex-col justify-between">
                  <div className="flex items-start">
                    <span className="font-normal w-5 shrink-0 text-left">I.</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                        <span>Berangkat dari</span>
                        <span className="text-center">:</span>
                        <span className="font-normal break-words">{data.berangkatDariAwal}</span>
                      </div>
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                        <span className="text-sub text-black leading-none">(tempat kedudukan)</span>
                        <span className="text-center"></span>
                        <span></span>
                      </div>
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                        <span>Ke</span>
                        <span className="text-center">:</span>
                        <span className="font-normal break-words">{data.berangkatKeAwal}</span>
                      </div>
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                        <span>Pada tanggal</span>
                        <span className="text-center">:</span>
                        <span className="font-normal break-words">{data.berangkatTglAwal}</span>
                      </div>
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline pt-0.5">
                        <span>Kepala</span>
                        <span className="text-center">:</span>
                        <span className="font-normal break-words">{data.berangkatKepalaAwal}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ruang Tanda Tangan & Cap */}
                  <div className="pt-10 pl-[125px] text-left w-full break-words">
                    <p className="font-semibold underline">{data.pejabatNamaAwal}</p>
                    <p>NIP {data.pejabatNipAwal}</p>
                  </div>
                </div>
              </td>
            </tr>

            {/* BARIS II SAMPAI V: TEMPAT PERSINGGAHAN / TRANSIT (~12.5% tinggi tabel masing-masing) */}
            {data.persinggahanList &&
              data.persinggahanList.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onSelectZone?.('bagian-transit')}
                  className={`border-b border-black ${getZoneClass('bagian-transit')}`}
                  style={{ height: '12.5%' }}
                >
                  {/* Kolom Kiri: Tiba di */}
                  <td className="border-r border-black p-2 align-top h-full">
                    <div className="h-full flex flex-col justify-between">
                      <div className="flex items-start">
                        <span className="font-normal w-5 shrink-0 text-left">
                          {row.labelRomawi}.
                        </span>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                            <span>Tiba di</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.tibaDi}</span>
                          </div>
                          <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                            <span>Pada tanggal</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.tibaTgl}</span>
                          </div>
                          <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                            <span>Kepala</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.tibaKepala}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ruang cap stempel & tanda tangan + NIP */}
                      <div className="pt-6 pl-5">
                        <p className="break-words">
                          {row.tibaNip ? `NIP ${row.tibaNip}` : 'NIP'}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Kolom Kanan: Berangkat dari */}
                  <td className="p-2 align-top h-full">
                    <div className="h-full flex flex-col justify-between">
                      <div className="flex items-start">
                        <span className="w-5 shrink-0" aria-hidden="true"></span>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                            <span>Berangkat dari</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatDari}</span>
                          </div>
                          <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                            <span>Ke</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatKe}</span>
                          </div>
                          <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                            <span>Pada tanggal</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatTgl}</span>
                          </div>
                          <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                            <span>Kepala</span>
                            <span className="text-center">:</span>
                            <span className="break-words">{row.berangkatKepala}</span>
                          </div>
                        </div>
                      </div>

                      {/* Ruang cap stempel & tanda tangan + NIP */}
                      <div className="pt-6 pl-5">
                        <p className="break-words">
                          {row.berangkatNip ? `NIP ${row.berangkatNip}` : 'NIP'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

            {/* BARIS VI: TIBA KEMBALI DI TEMPAT KEDUDUKAN & KETERANGAN PEMERIKSA (~18% tinggi tabel) */}
            <tr className="border-b border-black" style={{ height: '18%' }}>
              {/* Kolom Kiri: VI. Tiba di (tempat kedudukan) */}
              <td
                onClick={() => onSelectZone?.('bagian-6')}
                className={`border-r border-black p-2 align-top h-full ${getZoneClass(
                  'bagian-6'
                )}`}
              >
                <div className="h-full flex flex-col justify-between">
                  <div className="flex items-start">
                    <span className="font-normal w-5 shrink-0 text-left">VI.</span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                        <span>Tiba di</span>
                        <span className="text-center">:</span>
                        <span className="font-normal break-words">{data.tibaDiAkhir}</span>
                      </div>
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                        <span className="text-sub text-black leading-none">(tempat kedudukan)</span>
                        <span className="text-center"></span>
                        <span></span>
                      </div>
                      <div className="grid grid-cols-[95px_10px_1fr] items-baseline">
                        <span>Pada tanggal</span>
                        <span className="text-center">:</span>
                        <span className="font-normal break-words">{data.tibaTglAkhir}</span>
                      </div>
                      <div className="pt-0.5">
                        <p className="font-normal break-words">{data.tibaKepalaAkhir}</p>
                      </div>
                    </div>
                  </div>

                  {/* Ruang Tanda Tangan */}
                  <div className="pt-10 pl-5 text-left w-full break-words">
                    <p className="font-semibold underline">{data.pejabatNamaAkhir}</p>
                    <p>NIP {data.pejabatNipAkhir}</p>
                  </div>
                </div>
              </td>

              {/* Kolom Kanan: Keterangan Pemeriksa Perjalanan Dinas */}
              <td
                onClick={() => onSelectZone?.('bagian-6')}
                className={`p-2.5 align-top h-full ${getZoneClass('bagian-6')}`}
              >
                <div className="h-full flex flex-col justify-start">
                  <p className="text-justify leading-snug break-words">
                    {data.keteranganPemeriksa}
                  </p>
                </div>
              </td>
            </tr>

            {/* BARIS VII: CATATAN LAIN-LAIN (~4% tinggi tabel) */}
            <tr
              onClick={() => onSelectZone?.('bagian-catatan')}
              className={`border-b border-black ${getZoneClass('bagian-catatan')}`}
              style={{ height: '4%' }}
            >
              <td colSpan={2} className="p-2 align-top h-full">
                <div className="flex items-start">
                  <span className="font-normal w-6 shrink-0 text-left">VII.</span>
                  <div className="flex-1 min-w-0">
                    <span>Catatan lain-lain</span>
                    {data.catatanLainLain ? (
                      <p className="mt-1 break-words">{data.catatanLainLain}</p>
                    ) : null}
                  </div>
                </div>
              </td>
            </tr>

            {/* BARIS VIII: PERHATIAN (~12% tinggi tabel) */}
            <tr
              onClick={() => onSelectZone?.('bagian-catatan')}
              className={`border-b border-black ${getZoneClass('bagian-catatan')}`}
              style={{ height: '12%' }}
            >
              <td colSpan={2} className="p-2 align-top h-full">
                <div className="flex items-start">
                  <span className="font-bold w-6 shrink-0 text-left">VIII.</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <span className="font-bold uppercase tracking-wide">
                      PERHATIAN:
                    </span>
                    <p className="text-justify leading-snug break-words">
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
});
SuratPerjalananDinasBelakangDocumentPreview.displayName = 'SuratPerjalananDinasBelakangDocumentPreview';
