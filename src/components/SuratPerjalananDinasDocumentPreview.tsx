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
    const base = 'relative cursor-pointer transition-all duration-150 rounded group';
    if (activeZone === zone) {
      return `${base} ring-2 ring-sky-600 bg-sky-50/50 shadow-xs`;
    }
    return `${base} hover:ring-1 hover:ring-sky-300`;
  };

  const editableClass = isPrintMode
    ? ''
    : 'outline-none focus:bg-amber-100/90 focus:ring-1 focus:ring-sky-500 rounded px-0.5 transition-colors cursor-text';

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

  return (
    <div
      className={`spd-doc mx-auto bg-white text-slate-900 shadow-xl print:shadow-none print:m-0 print:p-0 print:w-full font-sans ${
        isPrintMode ? '' : 'py-6 sm:py-8 px-0 border border-slate-200'
      }`}
      style={{
        width: isPrintMode ? '100%' : `${spec.widthPx}px`,
        minHeight: isPrintMode ? 'auto' : `${spec.minHeightPx}px`,
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 1.15,
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
        }
        .spd-doc td, .spd-doc th {
          border: 1px solid #000;
          padding: 3px 5px;
          vertical-align: top;
          font-size: 11px;
        }
        .spd-doc .spd-meta-table {
          width: auto !important;
          border-collapse: collapse !important;
          margin-left: auto;
        }
        .spd-doc .spd-meta-table td {
          border: none !important;
          padding: 1px 0 !important;
          font-size: 11px;
          line-height: 1.35;
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
            padding: 2.5px 4px;
          }
          .spd-doc .spd-meta-table td {
            font-size: 10.5px;
            padding: 1px 0 !important;
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
      <div className="border border-black p-3 sm:p-4 bg-white w-full box-border">
        {/* KOP SURAT DINAS */}
        <div
          onClick={() => onSelectZone?.('header')}
          className={`flex items-center gap-3 pb-2 border-b-2 border-black ${getZoneClass('header')}`}
        >
          <div className="w-16 h-20 shrink-0 flex items-center justify-center">
            <KaltaraEmblem
              className="w-14 h-18"
              logoDataUrl={appSettings.logoPemprovDataUrl}
            />
          </div>
          <div className="flex-1 text-center font-sans">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-black leading-tight">
              {appSettings.instansiUtama || 'PEMERINTAH PROVINSI KALIMANTAN UTARA'}
            </h2>
            <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-black leading-tight">
              {appSettings.namaDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
            </h1>
            <p className="text-[10px] text-black leading-tight mt-0.5">
              {appSettings.alamatDinasBaris1 || 'Jalan Kol. Soetadji Nomor 009 RT. 095 (Gedung Gabungan Dinas 2, Lantai 1), Tanjung Selor,'}
            </p>
            <p className="text-[10px] text-black leading-tight">
              {appSettings.alamatDinasBaris2 || 'Bulungan, Kalimantan Utara 77212 Telepon Seluler 082352465546'}
            </p>
            <p className="text-[9.5px] text-black leading-tight">
              Laman <span className="text-blue-700 underline">http://disdikbud.kaltaraprov.go.id</span>, Pos-el <span className="text-black">kaltara.pendidikan@gmail.com</span>
            </p>
          </div>
        </div>

        {/* METADATA POJOK KANAN ATAS (Lembar Ke, Kode No, Nomor) */}
        <div
          onClick={() => onSelectZone?.('header')}
          className={`flex justify-end pt-2 pb-1 text-[11px] ${getZoneClass('header')}`}
        >
          <table className="spd-meta-table text-[11px]">
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
        <div className="text-center py-2">
          <h2 className="text-sm font-bold uppercase tracking-wider underline text-black">
            SURAT PERJALANAN DINAS (SPD)
          </h2>
        </div>

        {/* TABEL 10 POIN RESMI SPD */}
        <table className="w-full border-collapse border border-black text-black">
          <tbody>
            {/* ROW 1: Pejabat Pelaksana Teknis Kegiatan */}
            <tr onClick={() => onSelectZone?.('header')} className={getZoneClass('header')}>
              <td className="w-8 text-center font-bold">1.</td>
              <td className="w-[42%] font-medium">Pejabat Pelaksana Teknis Kegiatan</td>
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
              <td rowSpan={2} className="text-center font-bold align-top pt-2">8.</td>
              <td className="font-medium">Pengikut : Nama</td>
              <td className="text-center font-semibold text-[10.5px] w-[29%]">
                Tanggal Lahir
              </td>
              <td className="text-center font-semibold text-[10.5px] w-[29%]">
                Keterangan
              </td>
            </tr>

            {/* ROW 8 CONTENT: 4 Baris Pengikut dengan Garis Penghubung Penuh Tanpa Terputus */}
            <tr onClick={() => onSelectZone?.('pengikut')} className={getZoneClass('pengikut')}>
              <td className="align-top py-1 px-1.5">
                <div className="space-y-1">
                  {rows.map((_, idx) => (
                    <div key={idx} className="h-5 flex items-center">
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
                <div className="space-y-1">
                  {rows.map((row, idx) => (
                    <div key={idx} className="h-5 flex items-center justify-center text-[10.5px]">
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
                <div className="space-y-1">
                  {rows.map((row, idx) => (
                    <div key={idx} className="h-5 flex items-center justify-center text-[10.5px]">
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
                <div className="space-y-0.5 pt-4">
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

        {/* FOOTER CATATAN & TANDA TANGAN (INSIDE OUTER BOX) */}
        <div className="mt-2 flex items-start justify-between text-[11px] text-black pt-1">
          <div className="text-[10px] italic pt-1">
            * Coret yang tidak perlu
          </div>

          <div
            onClick={() => onSelectZone?.('ttd')}
            className={`w-64 text-left pl-4 ${getZoneClass('ttd')}`}
          >
            <div>Dikeluarkan di {spt.tempatDitetapkan || 'Tanjung Selor'}</div>
            <div>Pada Tanggal {spt.tanggalDitetapkan || '15 Oktober 2026'}</div>
            <div className="mt-1 font-medium">{spt.jabatanPenandatangan || 'Plt. Kepala Dinas,'}</div>

            {/* Ruang TTD */}
            <div className="h-16 flex items-center justify-center">
              {/* Optional space for signature / stempel */}
            </div>

            <div className="font-bold underline">
              {spt.namaPenandatangan || 'Hasanuddin, S.Pd, M.Si'}
            </div>
            <div>
              NIP. {spt.nipPenandatangan || '197405272007011010'}
            </div>
          </div>
        </div>
      </div>

      {/* PENGGUNA ANGGARAN (BELOW THE OUTER BOX MATCHING image_3363546e.png) */}
      <div
        onClick={() => onSelectZone?.('ttd')}
        className={`mt-4 text-center mx-auto w-72 text-[11px] text-black ${getZoneClass('ttd')}`}
      >
        <div className="font-medium">Pengguna Anggaran</div>
        <div className="h-16 flex items-center justify-center">
          {/* Space for Signature */}
        </div>
        <div className="font-bold underline">
          {spt.namaPenandatangan || 'Hasanuddin, S.Pd, M.Si'}
        </div>
        <div>{spt.pangkatPenandatangan || 'Pembina Tingkat I. IV/b'}</div>
        <div>NIP. {spt.nipPenandatangan ? spt.nipPenandatangan.replace(/(\d{8})(\d{6})(\d{1})(\d{3})/, '$1 $2 $3 $4') : '19740527 200701 1 010'}</div>
      </div>
      </div>
    </div>
  );
};
