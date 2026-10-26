import React from 'react';
import { SuratPerintahTugas, AppSettings, PaperSize, SuratPerjalananDinasData, SpdPengikutItem } from '../types/spj';
import { KaltaraEmblem } from './KaltaraEmblem';
import { getPaperDimensions } from '../utils/spjCalculations';

export type SpdEditableZone = 'header' | 'pelaksana' | 'perjalanan' | 'pengikut' | 'anggaran' | 'ttd';

interface SuratPerjalananDinasDocumentPreviewProps {
  spt: SuratPerintahTugas;
  appSettings: AppSettings;
  paperSize: PaperSize;
  activeZone?: SpdEditableZone;
  onSelectZone?: (zone: SpdEditableZone) => void;
  onUpdateSpdData?: (spd: SuratPerjalananDinasData) => void;
  selectedPegawaiId?: string;
  onSelectPegawaiId?: (id: string) => void;
  isPrintMode?: boolean;
}

export const SuratPerjalananDinasDocumentPreview: React.FC<SuratPerjalananDinasDocumentPreviewProps> = ({
  spt,
  appSettings,
  paperSize,
  activeZone,
  onSelectZone,
  onUpdateSpdData,
  selectedPegawaiId,
  onSelectPegawaiId,
  isPrintMode = false,
}) => {
  const spec = getPaperDimensions(paperSize);

  // Active Pelaksana Pegawai
  const effectiveSelectedId = selectedPegawaiId || spt.spdData?.selectedPegawaiId || (spt.pegawaiList[0]?.id ?? '');
  const activePelaksana = spt.pegawaiList.find((p) => p.id === effectiveSelectedId) || spt.pegawaiList[0] || {
    id: 'default',
    nama: 'Hendry Setyo Utomo',
    nip: '198712112025211028',
    pangkatGol: 'IX',
    jabatan: 'Penata Layanan Operasional',
  };

  // Safe SPD Data defaults matching image_3363546e.png
  const spdData: SuratPerjalananDinasData = {
    lembarKe: spt.spdData?.lembarKe ?? '...............................................',
    kodeNo: spt.spdData?.kodeNo ?? '...............................................',
    nomorSpd: spt.spdData?.nomorSpd ?? `000.1.2.3/       /SPPD/Disdikbud/${new Date().getFullYear()}`,
    pptkNama: spt.spdData?.pptkNama ?? (spt.pegawaiList[0]?.nama ? `${spt.pegawaiList[0].nama}/NIP ${spt.pegawaiList[0].nip}` : 'Bayu Ramadhan/NIP 198307072015031002'),
    pptkNip: spt.spdData?.pptkNip ?? (spt.pegawaiList[0]?.nip || '198307072015031002'),
    tingkatBiaya: spt.spdData?.tingkatBiaya ?? '',
    alatAngkut: spt.spdData?.alatAngkut ?? 'Darat dan Air',
    instansiAnggaran: spt.spdData?.instansiAnggaran ?? (appSettings.namaDinas || 'Dinas Pendidikan dan Kebudayaan'),
    akunAnggaran: spt.spdData?.akunAnggaran ?? (spt.pembebananAnggaran?.match(/\d+\.\d+\.\d+\.\d+\.\d+\s*[-–]\s*\d+\.\d+\.\d+\.\d+\.\d+/)?.[0] || '1.01.02.1.01.0078 – 5.1.02.04.001.00001'),
    keteranganLain: spt.spdData?.keteranganLain ?? '',
    selectedPegawaiId: effectiveSelectedId,
    pengikutList: spt.spdData?.pengikutList && spt.spdData.pengikutList.length > 0
      ? spt.spdData.pengikutList
      : [
          { id: '1', nama: '', tanggalLahir: '', keterangan: '' },
          { id: '2', nama: '', tanggalLahir: '', keterangan: '' },
          { id: '3', nama: '', tanggalLahir: '', keterangan: '' },
          { id: '4', nama: '', tanggalLahir: '', keterangan: '' },
        ],
  };

  const cleanText = (val?: string) => {
    if (!val) return '';
    return val.replace(/;$/, '').trim();
  };

  const cleanDate = (val?: string) => {
    if (!val) return '';
    const trimmed = val.replace(/;$/, '').trim();
    const commaIndex = trimmed.indexOf(',');
    if (commaIndex !== -1 && commaIndex < trimmed.length - 1) {
      return trimmed.slice(commaIndex + 1).trim();
    }
    return trimmed;
  };

  const handleUpdateField = (field: keyof SuratPerjalananDinasData, val: any) => {
    if (!onUpdateSpdData) return;
    onUpdateSpdData({
      ...spdData,
      [field]: val,
    });
  };

  const handleUpdatePengikut = (idx: number, field: keyof SpdPengikutItem, val: string) => {
    if (!onUpdateSpdData) return;
    const currentList = [...(spdData.pengikutList || [])];
    while (currentList.length < 4) {
      currentList.push({ id: `p-${currentList.length + 1}`, nama: '', tanggalLahir: '', keterangan: '' });
    }
    currentList[idx] = {
      ...currentList[idx],
      [field]: val,
    };
    onUpdateSpdData({
      ...spdData,
      pengikutList: currentList,
    });
  };

  const getZoneClass = (zone: SpdEditableZone) => {
    if (isPrintMode || !onSelectZone) return '';
    const base =
      'relative cursor-pointer transition-all duration-150 rounded-sm group print:outline-none print:ring-0 print:bg-transparent';
    if (activeZone === zone) {
      return `${base} outline-2 outline-dashed outline-sky-500 -outline-offset-1 bg-sky-50/50`;
    }
    return `${base} hover:outline-1 hover:outline-dashed hover:outline-sky-400 hover:-outline-offset-1 active:outline-2 active:outline-dashed active:outline-sky-500 hover:bg-sky-50/30 active:bg-sky-50/50`;
  };

  const editableClass = isPrintMode
    ? ''
    : 'outline-none hover:outline-1 hover:outline-dashed hover:outline-sky-400/90 focus:bg-amber-100/90 focus:outline-2 focus:outline-dashed focus:outline-sky-500 rounded px-0.5 transition-all cursor-text print:outline-none';

  const rows = spdData.pengikutList && spdData.pengikutList.length >= 4
    ? spdData.pengikutList.slice(0, 4)
    : [
        spdData.pengikutList?.[0] || { id: '1', nama: '', tanggalLahir: '', keterangan: '' },
        spdData.pengikutList?.[1] || { id: '2', nama: '', tanggalLahir: '', keterangan: '' },
        spdData.pengikutList?.[2] || { id: '3', nama: '', tanggalLahir: '', keterangan: '' },
        spdData.pengikutList?.[3] || { id: '4', nama: '', tanggalLahir: '', keterangan: '' },
      ];

  const DEFAULT_DOTS = '...............................................';
  const rawLembarKe = (spdData.lembarKe || '').replace(/^[:\s]+/, '').trim();
  const displayLembarKe = rawLembarKe || DEFAULT_DOTS;

  const rawKodeNo = (spdData.kodeNo || '').replace(/^[:\s]+/, '').trim();
  const displayKodeNo = rawKodeNo || DEFAULT_DOTS;

  const rawNomorSpd = (spdData.nomorSpd || '').replace(/^[:\s]+/, '');
  const displayNomorSpd =
    !rawNomorSpd || rawNomorSpd === '000.1.2.3/       /SPPD/Disdikbud/2026'
      ? '000.1.2.3/                  /SPPD/Disdikbud/2026'
      : rawNomorSpd;

  // Pejabat 1 (Atas): Pengguna Anggaran (PA / KPA)
  const effectivePaJabatan =
    spdData.paJabatan ||
    appSettings.jabatanPenggunaAnggaran ||
    'Pengguna Anggaran';
  const effectivePaNama =
    spdData.paNama ||
    appSettings.namaPenggunaAnggaran ||
    spt.namaPenandatangan ||
    'Hasanuddin, S.Pd, M.Si';
  const effectivePaPangkat =
    spdData.paPangkat ||
    (effectivePaNama === spt.namaPenandatangan ? spt.pangkatPenandatangan : undefined) ||
    'Pembina Tingkat I, IV/b';
  const effectivePaNip =
    spdData.paNip ||
    appSettings.nipPenggunaAnggaran ||
    spt.nipPenandatangan ||
    '197405272007011010';

  // Pejabat 2 (Bawah): Penandatangan SPT
  const effectivePejabatSptJabatan =
    spdData.pejabatSptJabatan ||
    spt.jabatanPenandatangan ||
    'Plt. Kepala Dinas';
  const effectivePejabatSptNama =
    spdData.pejabatSptNama ||
    spt.namaPenandatangan ||
    'Hasanuddin, S.Pd, M.Si';
  const effectivePejabatSptPangkat =
    spdData.pejabatSptPangkat ||
    spt.pangkatPenandatangan ||
    'Pembina Tingkat I, IV/b';
  const effectivePejabatSptNip =
    spdData.pejabatSptNip ||
    spt.nipPenandatangan ||
    '197405272007011010';

  const formatNip = (nip?: string) => {
    if (!nip) return '-';
    const digitsOnly = nip.replace(/\D/g, '');
    if (digitsOnly.length === 18) {
      return digitsOnly.replace(/(\d{8})(\d{6})(\d{1})(\d{3})/, '$1 $2 $3 $4');
    }
    return nip;
  };

  return (
    <div
      className={`spd-doc spj-font-calibri mx-auto bg-white text-black shadow-xl print:shadow-none print:border-none print:m-0 print:p-0 print:w-full print:min-h-0 print:h-auto ${
        isPrintMode ? 'py-1 px-0' : 'py-4 px-0 border border-slate-200'
      }`}
      style={{
        width: isPrintMode ? '100%' : `${spec.widthPx}px`,
        minHeight: isPrintMode ? 'auto' : `${spec.minHeightPx}px`,
        boxSizing: 'border-box',
        fontFamily: "Calibri, 'Carlito', 'Arimo', Arial, Helvetica, sans-serif",
        lineHeight: 1.14,
      }}
    >
      <style>{`
        .spd-doc .spd-depan-content {
          width: 86%;
          max-width: 86%;
          margin-left: auto;
          margin-right: auto;
        }
        .spd-doc table {
          border-collapse: collapse;
          width: 100%;
          table-layout: fixed;
        }
        .spd-doc td, .spd-doc th {
          border: 1px solid #000;
          padding: 2px 4.5px;
          vertical-align: top;
          font-size: 10.5px;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .spd-doc .spd-meta-table {
          width: auto !important;
          table-layout: auto !important;
          border-collapse: collapse !important;
          margin-left: auto;
        }
        .spd-doc .spd-meta-table td {
          border: none !important;
          padding: 0.5px 0 !important;
          font-size: 10.5px;
          line-height: 1.25;
        }
        .spd-doc .spd-meta-table .spd-meta-label {
          padding-right: 6px !important;
          white-space: nowrap;
          text-align: left;
        }
        .spd-doc .spd-meta-table .spd-meta-colon {
          padding: 0 4px !important;
          text-align: center;
          width: 12px;
          min-width: 12px;
        }
        .spd-doc .spd-meta-table .spd-meta-val {
          padding-left: 4px !important;
          text-align: left;
        }
        @media print {
          .spd-doc .spd-depan-content {
            width: 86% !important;
            max-width: 86% !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          .spd-doc td, .spd-doc th {
            font-size: 10.5px;
            padding: 1.5px 4px;
          }
          .spd-doc .spd-meta-table td {
            font-size: 10.5px;
            padding: 0.5px 0 !important;
          }
        }
      `}</style>

      {/* PEMBATAS LEBAR TOTAL SPD DEPAN: 86% DARI LEBAR KERTAS */}
      <div
        data-testid="spd-depan-content-area"
        style={{
          width: '86%',
          maxWidth: '86%',
        }}
        className="spd-depan-content w-[86%] max-w-[86%] mx-auto print:w-[86%] print:max-w-[86%] print:mx-auto"
      >
        {/* OUTER BOX CONTAINER MATCHING image_3363546e.png */}
        <div className="border border-black p-3 bg-white w-full box-border">
          {/* KOP SURAT DINAS (MENGIKUTI KOP SURAT PADA SURAT TUGAS/SPT) */}
          <div
            onClick={() => onSelectZone?.('header')}
            className={`flex items-center gap-3 pb-2 border-b-4 border-double border-black ${getZoneClass('header')}`}
          >
            <div className="w-15 h-19 shrink-0 flex items-center justify-center">
              <KaltaraEmblem
                className="w-14 h-18"
                logoDataUrl={appSettings.logoPemprovDataUrl}
              />
            </div>
            <div className="flex-1 text-center pr-2 min-w-0">
              <h2 className="text-[13.5px] font-bold uppercase tracking-wide text-black leading-[1.18] mb-[1.5pt]">
                {appSettings.instansiUtama || 'PEMERINTAH PROVINSI KALIMANTAN UTARA'}
              </h2>
              <h1 className="text-[15.5px] font-extrabold uppercase tracking-tight text-black leading-[1.18] mb-[1.5pt]">
                {appSettings.namaDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
              </h1>
              <p className="text-[10px] text-black leading-[1.18] mb-[1pt] break-words">
                {appSettings.alamatDinasBaris1}
              </p>
              <p className="text-[10px] text-black leading-[1.18] mb-[1pt] break-words">
                {appSettings.alamatDinasBaris2} | {appSettings.kontakDinas}
              </p>
            </div>
          </div>

          {/* METADATA POJOK KANAN ATAS (Lembar Ke, Kode No, Nomor) */}
          <div
            onClick={() => onSelectZone?.('header')}
            className={`flex justify-end pt-1 pb-0.5 text-[10.5px] ${getZoneClass('header')}`}
          >
            <table className="spd-meta-table text-[10.5px]">
              <tbody>
                <tr>
                  <td className="spd-meta-label">Lembar Ke</td>
                  <td className="spd-meta-colon">:</td>
                  <td
                    className={`spd-meta-val ${editableClass}`}
                    contentEditable={!isPrintMode}
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdateField(
                        'lembarKe',
                        e.currentTarget.innerText.replace(/^[:\s]+/, '').trim()
                      )
                    }
                  >
                    {displayLembarKe}
                  </td>
                </tr>
                <tr>
                  <td className="spd-meta-label">Kode No.</td>
                  <td className="spd-meta-colon">:</td>
                  <td
                    className={`spd-meta-val ${editableClass}`}
                    contentEditable={!isPrintMode}
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdateField(
                        'kodeNo',
                        e.currentTarget.innerText.replace(/^[:\s]+/, '').trim()
                      )
                    }
                  >
                    {displayKodeNo}
                  </td>
                </tr>
                <tr>
                  <td className="spd-meta-label font-medium">Nomor</td>
                  <td className="spd-meta-colon font-medium">:</td>
                  <td
                    className={`spd-meta-val font-medium whitespace-pre ${editableClass}`}
                    contentEditable={!isPrintMode}
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      handleUpdateField(
                        'nomorSpd',
                        e.currentTarget.innerText.replace(/^[:\s]+/, '')
                      )
                    }
                  >
                    {displayNomorSpd}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* JUDUL DOKUMEN: SURAT PERJALANAN DINAS (SPD) */}
          <div className="text-center py-1.5">
            <h2 className="text-[13px] font-bold uppercase tracking-wider underline text-black">
              SURAT PERJALANAN DINAS (SPD)
            </h2>
          </div>

          {/* TABEL 10 POIN RESMI SPD */}
          <table className="w-full border-collapse border border-black text-black">
            <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '40%' }} />
              <col style={{ width: '27%' }} />
              <col style={{ width: '27%' }} />
            </colgroup>
            <tbody>
              {/* ROW 1: Pejabat Pelaksana Teknis Kegiatan */}
              <tr onClick={() => onSelectZone?.('header')} className={getZoneClass('header')}>
                <td className="text-center font-bold">1.</td>
                <td className="font-medium">Pejabat Pelaksana Teknis Kegiatan</td>
                <td colSpan={2}>
                  <span
                    contentEditable={!isPrintMode}
                    suppressContentEditableWarning
                    onBlur={(e) => handleUpdateField('pptkNama', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {spdData.pptkNama}
                  </span>
                </td>
              </tr>

              {/* ROW 2: Nama/NIP Pegawai yang melaksanakan dinas */}
              <tr onClick={() => onSelectZone?.('pelaksana')} className={getZoneClass('pelaksana')}>
                <td className="text-center font-bold">2.</td>
                <td className="font-medium">Nama/NIP Pegawai yang melaksanakan dinas</td>
                <td colSpan={2}>
                  <span>
                    {activePelaksana.nama} /NIP {activePelaksana.nip}
                  </span>
                </td>
              </tr>

              {/* ROW 3: Pangkat & Golongan / Jabatan / Tingkat Biaya */}
              <tr onClick={() => onSelectZone?.('pelaksana')} className={getZoneClass('pelaksana')}>
                <td className="text-center font-bold">3.</td>
                <td>
                  <div className="space-y-0.5">
                    <div>a. Pangkat dan Golongan</div>
                    <div>b. Jabatan / Instansi</div>
                    <div>c. Tingkat Biaya Perjalanan Dinas</div>
                  </div>
                </td>
                <td colSpan={2}>
                  <div className="space-y-0.5">
                    <div>
                      <span className="inline-block w-4">a.</span>
                      <span className="font-medium">{activePelaksana.pangkatGol || '-'}</span>
                    </div>
                    <div>
                      <span className="inline-block w-4">b.</span>
                      <span>{activePelaksana.jabatan || 'Pelaksana'}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block w-4">c.</span>
                      <span
                        contentEditable={!isPrintMode}
                        suppressContentEditableWarning
                        onBlur={(e) => handleUpdateField('tingkatBiaya', e.currentTarget.innerText.trim())}
                        className={`flex-1 ${editableClass}`}
                      >
                        {spdData.tingkatBiaya || ''}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* ROW 4: Maksud Perjalanan Dinas */}
              <tr onClick={() => onSelectZone?.('perjalanan')} className={getZoneClass('perjalanan')}>
                <td className="text-center font-bold">4.</td>
                <td className="font-medium">Maksud Perjalanan Dinas</td>
                <td colSpan={2} className="text-justify">
                  {cleanText(spt.maksudPerjalanan) || 'Monitoring dan Peninjauan Lokasi Rencana Kegiatan APBD Perubahan 2026 di SMAN 4 Tarakan, SMAN 2 Tarakan serta Progres Pekerjaan di SMAN 5 Tarakan'}
                </td>
              </tr>

              {/* ROW 5: Alat Angkut yang dipergunakan */}
              <tr onClick={() => onSelectZone?.('perjalanan')} className={getZoneClass('perjalanan')}>
                <td className="text-center font-bold">5.</td>
                <td className="font-medium">Alat Angkut yang dipergunakan</td>
                <td colSpan={2}>
                  <span
                    contentEditable={!isPrintMode}
                    suppressContentEditableWarning
                    onBlur={(e) => handleUpdateField('alatAngkut', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {spdData.alatAngkut || 'Darat dan Air'}
                  </span>
                </td>
              </tr>

              {/* ROW 6: Tempat Berangkat & Tempat Tujuan */}
              <tr onClick={() => onSelectZone?.('perjalanan')} className={getZoneClass('perjalanan')}>
                <td className="text-center font-bold">6.</td>
                <td>
                  <div className="space-y-0.5">
                    <div>a. Tempat Berangkat</div>
                    <div>b. Tempat Tujuan</div>
                  </div>
                </td>
                <td colSpan={2}>
                  <div className="space-y-0.5">
                    <div>
                      <span className="inline-block w-4">a.</span>
                      <span>{cleanText(spt.tempatBerangkat) || 'Tanjung Selor'}</span>
                    </div>
                    <div>
                      <span className="inline-block w-4">b.</span>
                      <span>{cleanText(spt.tempatTujuan) || 'Tarakan'}</span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* ROW 7: Lamanya Perjalanan Dinas & Tanggal */}
              <tr onClick={() => onSelectZone?.('perjalanan')} className={getZoneClass('perjalanan')}>
                <td className="text-center font-bold">7.</td>
                <td>
                  <div className="space-y-0.5">
                    <div>a. Lamanya Perjalanan Dinas</div>
                    <div>b. Tanggal Berangkat</div>
                    <div>c. Tanggal Harus Kembali/tiba di tempat baru</div>
                  </div>
                </td>
                <td colSpan={2}>
                  <div className="space-y-0.5">
                    <div>
                      <span className="inline-block w-4">a.</span>
                      <span>{cleanText(spt.lamanyaPerjalanan) || '3 (tiga) hari'}</span>
                    </div>
                    <div>
                      <span className="inline-block w-4">b.</span>
                      <span>{cleanDate(spt.tanggalBerangkat) || '15 Oktober 2026'}</span>
                    </div>
                    <div>
                      <span className="inline-block w-4">c.</span>
                      <span>{cleanDate(spt.tanggalHarusKembali) || '17 Oktober 2026'}</span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* ROW 8 HEADER: Pengikut, Tanggal Lahir, Keterangan */}
              <tr onClick={() => onSelectZone?.('pengikut')} className={getZoneClass('pengikut')}>
                <td rowSpan={2} className="text-center font-bold align-top pt-1.5">8.</td>
                <td className="font-medium">Pengikut : Nama</td>
                <td className="text-center font-semibold text-[10px]">
                  Tanggal Lahir
                </td>
                <td className="text-center font-semibold text-[10px]">
                  Keterangan
                </td>
              </tr>

              {/* ROW 8 CONTENT: 4 Baris Pengikut dengan Garis Penghubung Penuh Tanpa Terputus */}
              <tr onClick={() => onSelectZone?.('pengikut')} className={getZoneClass('pengikut')}>
                <td className="align-top py-1 px-1.5">
                  <div className="space-y-0.5">
                    {rows.map((_, idx) => (
                      <div key={idx} className="h-4 flex items-center">
                        <span className="w-4 shrink-0 font-medium">{idx + 1}.</span>
                        <span
                          contentEditable={!isPrintMode}
                          suppressContentEditableWarning
                          onBlur={(e) => handleUpdatePengikut(idx, 'nama', e.currentTarget.innerText.trim())}
                          className={`flex-1 truncate ${editableClass}`}
                        >
                          {rows[idx]?.nama || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="align-top py-1 px-1.5 text-center">
                  <div className="space-y-0.5">
                    {rows.map((row, idx) => (
                      <div key={idx} className="h-4 flex items-center justify-center text-[10px]">
                        <span
                          contentEditable={!isPrintMode}
                          suppressContentEditableWarning
                          onBlur={(e) => handleUpdatePengikut(idx, 'tanggalLahir', e.currentTarget.innerText.trim())}
                          className={editableClass}
                        >
                          {row.tanggalLahir || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="align-top py-1 px-1.5 text-center">
                  <div className="space-y-0.5">
                    {rows.map((row, idx) => (
                      <div key={idx} className="h-4 flex items-center justify-center text-[10px]">
                        <span
                          contentEditable={!isPrintMode}
                          suppressContentEditableWarning
                          onBlur={(e) => handleUpdatePengikut(idx, 'keterangan', e.currentTarget.innerText.trim())}
                          className={editableClass}
                        >
                          {row.keterangan || ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>

              {/* ROW 9: Pembebanan Anggaran */}
              <tr onClick={() => onSelectZone?.('anggaran')} className={getZoneClass('anggaran')}>
                <td className="text-center font-bold">9.</td>
                <td>
                  <div className="font-medium">Pembebanan Anggaran</div>
                  <div className="space-y-0.5">
                    <div>a. Instansi</div>
                    <div>b. Akun</div>
                  </div>
                </td>
                <td colSpan={2}>
                  <div className="space-y-0.5 pt-1">
                    <div>
                      <span className="inline-block w-4">a.</span>
                      <span
                        contentEditable={!isPrintMode}
                        suppressContentEditableWarning
                        onBlur={(e) => handleUpdateField('instansiAnggaran', e.currentTarget.innerText.trim())}
                        className={editableClass}
                      >
                        {spdData.instansiAnggaran}
                      </span>
                    </div>
                    <div>
                      <span className="inline-block w-4">b.</span>
                      <span
                        contentEditable={!isPrintMode}
                        suppressContentEditableWarning
                        onBlur={(e) => handleUpdateField('akunAnggaran', e.currentTarget.innerText.trim())}
                        className={editableClass}
                      >
                        {spdData.akunAnggaran}
                      </span>
                    </div>
                  </div>
                </td>
              </tr>

              {/* ROW 10: Keterangan Lain-lain */}
              <tr onClick={() => onSelectZone?.('anggaran')} className={getZoneClass('anggaran')}>
                <td className="text-center font-bold">10.</td>
                <td className="font-medium">Keterangan Lain-lain</td>
                <td colSpan={2}>
                  <span
                    contentEditable={!isPrintMode}
                    suppressContentEditableWarning
                    onBlur={(e) => handleUpdateField('keteranganLain', e.currentTarget.innerText.trim())}
                    className={editableClass}
                  >
                    {spdData.keteranganLain || ''}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>

          {/* FOOTER CATATAN & TANDA TANGAN PEJABAT SPT (INSIDE OUTER BOX - MATCHING GAMBAR 2) */}
          <div className="mt-1 flex items-start justify-between text-[10.5px] text-black pt-0.5">
            <div className="text-[9.5px] italic pt-0.5">
              * Coret yang tidak perlu
            </div>

            <div
              onClick={() => onSelectZone?.('ttd')}
              className={`w-64 max-w-[55%] text-left pl-2 ${getZoneClass('ttd')}`}
            >
              <div>Dikeluarkan di {spt.tempatDitetapkan || 'Tanjung Selor'}</div>
              <div>Pada Tanggal {spt.tanggalDitetapkan || '15 Oktober 2026'}</div>
              <div className="mt-0.5 font-medium">
                {effectivePejabatSptJabatan}{effectivePejabatSptJabatan.trim().endsWith(',') ? '' : ','}
              </div>

              {/* Ruang TTD */}
              <div className="h-10 flex items-center justify-center" />

              <div className="font-bold underline">
                {effectivePejabatSptNama}
              </div>
              <div>
                NIP. {effectivePejabatSptNip ? effectivePejabatSptNip.replace(/\D/g, '') : '197405272007011010'}
              </div>
            </div>
          </div>
        </div>

        {/* PENGGUNA ANGGARAN (BELOW THE OUTER BOX - EXACTLY AS IN GAMBAR 2) */}
        <div
          onClick={() => onSelectZone?.('ttd')}
          className={`mt-2.5 text-center mx-auto w-64 max-w-full text-[10.5px] text-black ${getZoneClass('ttd')}`}
        >
          <div className="font-medium">{effectivePaJabatan || 'Pengguna Anggaran'}</div>
          <div className="h-10 flex items-center justify-center" />
          <div className="font-bold underline">
            {effectivePaNama}
          </div>
          <div>{effectivePaPangkat || 'Pembina Tingkat I. IV/b'}</div>
          <div>
            NIP. {formatNip(effectivePaNip)}
          </div>
        </div>
      </div>
    </div>
  );
};
