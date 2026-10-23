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
  onUpdateVisumData,
  isPrintMode = false,
}) => {
  const spec = getPaperDimensions(paperSize);
  const data = propVisumData || getEffectiveVisumData(spt);

  const handleUpdate = (next: SpdVisumBelakangData) => {
    if (onUpdateVisumData) {
      onUpdateVisumData(next);
    }
  };

  const getZoneClass = (zone: SpdBelakangEditableZone) => {
    if (isPrintMode || !onSelectZone) return '';
    const isActive = activeZone === zone;
    return `cursor-pointer transition-all ${
      isActive
        ? 'ring-2 ring-sky-600 bg-sky-50/40'
        : 'hover:bg-slate-50/70 hover:outline-dashed hover:outline-1 hover:outline-sky-400'
    }`;
  };

  return (
    <div
      style={{
        width: isPrintMode ? '100%' : `${spec.widthPx}px`,
        minHeight: isPrintMode ? 'auto' : `${spec.minHeightPx}px`,
        fontFamily: 'Arial, Calibri, Liberation Sans, sans-serif',
      }}
      className={`mx-auto bg-white text-black leading-tight box-border text-[11px] ${
        isPrintMode
          ? 'print-only-sheet p-0 m-0'
          : 'shadow-lg border border-slate-300 p-8 sm:p-10 select-text'
      }`}
    >
      {/* TABEL PENGESAHAN / VISUM SPD */}
      <table
        className="w-full border-collapse border border-black table-fixed text-[11.5px]"
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
            <td className="border-r border-black p-3 align-top min-h-[145px]"></td>

            {/* Kolom Kanan: I. Berangkat dari (tempat kedudukan) */}
            <td
              onClick={() => onSelectZone?.('bagian-1')}
              className={`p-3 align-top min-h-[145px] ${getZoneClass('bagian-1')}`}
            >
              <div className="flex items-start">
                <span className="font-normal w-7 shrink-0 text-left">I.</span>
                <div className="flex-1 space-y-0.5">
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                    <span>Berangkat dari</span>
                    <span className="text-center">:</span>
                    <span className="font-normal">{data.berangkatDariAwal}</span>
                  </div>
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                    <span className="text-[10px] text-slate-700 leading-none">(tempat kedudukan)</span>
                    <span className="text-center"></span>
                    <span></span>
                  </div>
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                    <span>Ke</span>
                    <span className="text-center">:</span>
                    <span className="font-normal">{data.berangkatKeAwal}</span>
                  </div>
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                    <span>Pada tanggal</span>
                    <span className="text-center">:</span>
                    <span className="font-normal">{data.berangkatTglAwal}</span>
                  </div>
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline pt-0.5">
                    <span>Kepala</span>
                    <span className="text-center">:</span>
                    <span className="font-normal">{data.berangkatKepalaAwal}</span>
                  </div>

                  {/* Ruang Tanda Tangan & Cap */}
                  <div
                    className="pt-8 text-center ml-auto w-56"
                    style={{
                      textAlign: 'justify',
                      marginLeft: '87.5px',
                      paddingLeft: '30px',
                    }}
                  >
                    <p className="font-semibold underline">{data.pejabatNamaAwal}</p>
                    <p className="text-[10.5px]">{data.pejabatPangkatAwal}</p>
                    <p className="text-[10.5px]">NIP {data.pejabatNipAwal}</p>
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
                <td className="border-r border-black p-3 align-top">
                  <div className="flex items-start">
                    <span className="font-normal w-7 shrink-0 text-left">
                      {row.labelRomawi}.
                    </span>
                    <div className="flex-1 flex flex-col justify-between min-h-[120px]">
                      <div className="space-y-0.5 min-h-[68px]">
                        <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                          <span>Tiba di</span>
                          <span className="text-center">:</span>
                          <span>{row.tibaDi}</span>
                        </div>
                        <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                          <span>Pada tanggal</span>
                          <span className="text-center">:</span>
                          <span>{row.tibaTgl}</span>
                        </div>
                        <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                          <span>Kepala</span>
                          <span className="text-center">:</span>
                          <span>{row.tibaKepala}</span>
                        </div>
                      </div>

                      {/* Ruang cap stempel & tanda tangan + NIP */}
                      <div className="pt-6">
                        <p>NIP {row.tibaNip}</p>
                      </div>
                    </div>
                  </div>
                </td>

                {/* Kolom Kanan: Berangkat dari */}
                <td className="p-3 align-top">
                  <div className="flex items-start">
                    <span className="w-7 shrink-0" aria-hidden="true"></span>
                    <div className="flex-1 flex flex-col justify-between min-h-[120px]">
                      <div className="space-y-0.5 min-h-[68px]">
                        <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                          <span>Berangkat dari</span>
                          <span className="text-center">:</span>
                          <span>{row.berangkatDari}</span>
                        </div>
                        <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                          <span>Ke</span>
                          <span className="text-center">:</span>
                          <span>{row.berangkatKe}</span>
                        </div>
                        <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                          <span>Pada tanggal</span>
                          <span className="text-center">:</span>
                          <span>{row.berangkatTgl}</span>
                        </div>
                        <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                          <span>Kepala</span>
                          <span className="text-center">:</span>
                          <span>{row.berangkatKepala}</span>
                        </div>
                      </div>

                      {/* Ruang cap stempel & tanda tangan + NIP */}
                      <div className="pt-6">
                        <p>NIP {row.berangkatNip}</p>
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
              className={`border-r border-black p-3 align-top min-h-[145px] ${getZoneClass(
                'bagian-6'
              )}`}
            >
              <div className="flex items-start">
                <span className="font-normal w-7 shrink-0 text-left">VI.</span>
                <div className="flex-1 space-y-0.5">
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                    <span>Tiba di</span>
                    <span className="text-center">:</span>
                    <span className="font-normal">{data.tibaDiAkhir}</span>
                  </div>
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                    <span className="text-[10px] text-slate-700 leading-none">(tempat kedudukan)</span>
                    <span className="text-center"></span>
                    <span></span>
                  </div>
                  <div className="grid grid-cols-[105px_12px_1fr] items-baseline">
                    <span>Pada tanggal</span>
                    <span className="text-center">:</span>
                    <span className="font-normal">{data.tibaTglAkhir}</span>
                  </div>
                  <div className="pt-1">
                    <p className="font-normal">{data.tibaKepalaAkhir}</p>
                  </div>

                  {/* Ruang Tanda Tangan */}
                  <div
                    className="pt-8 text-center ml-auto w-56"
                    style={{
                      textAlign: 'justify',
                      paddingLeft: '4px',
                      marginLeft: '-3.5px',
                      marginTop: '1px',
                    }}
                  >
                    <p className="font-semibold underline">{data.pejabatNamaAkhir}</p>
                    <p className="text-[10.5px]">{data.pejabatPangkatAkhir}</p>
                    <p className="text-[10.5px]">NIP {data.pejabatNipAkhir}</p>
                  </div>
                </div>
              </div>
            </td>

            {/* Kolom Kanan: Keterangan Pemeriksa Perjalanan Dinas */}
            <td
              onClick={() => onSelectZone?.('bagian-6')}
              className={`p-3 align-top min-h-[145px] ${getZoneClass('bagian-6')}`}
            >
              <div className="flex items-start">
                <span className="w-7 shrink-0" aria-hidden="true"></span>
                <div className="flex-1 space-y-2">
                  <p
                    className="text-justify leading-snug"
                    style={{ marginLeft: '-27px', marginRight: '-5px' }}
                  >
                    {data.keteranganPemeriksa}
                  </p>
                </div>
              </div>
            </td>
          </tr>

          {/* BARIS VII: CATATAN LAIN-LAIN */}
          <tr
            onClick={() => onSelectZone?.('bagian-catatan')}
            className={`border-b border-black ${getZoneClass('bagian-catatan')}`}
          >
            <td colSpan={2} className="p-3 align-top min-h-[35px]">
              <div className="flex items-start">
                <span className="font-normal w-7 shrink-0 text-left">VII.</span>
                <div className="flex-1">
                  <span>Catatan lain-lain</span>
                  {data.catatanLainLain ? (
                    <p className="mt-1 text-[11px]">{data.catatanLainLain}</p>
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
            <td colSpan={2} className="p-3 align-top">
              <div className="flex items-start">
                <span className="font-bold w-7 shrink-0 text-left">VIII.</span>
                <div className="flex-1 space-y-1">
                  <span className="font-bold uppercase tracking-wide">
                    PERHATIAN:
                  </span>
                  <p className="text-justify leading-snug text-[11px]">
                    {data.teksPerhatian}
                  </p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
