import React from 'react';
import { SuratPerintahTugas, SuratTugasPegawai, AppSettings, PaperSize } from '../types/spj';
import { KaltaraEmblem } from './KaltaraEmblem';
import { getPaperDimensions } from '../utils/spjCalculations';

export type SuratTugasEditableZone = 'header' | 'dasar' | 'pegawai' | 'detail' | 'ttd';

interface SuratTugasDocumentPreviewProps {
  spt: SuratPerintahTugas;
  appSettings: AppSettings;
  paperSize: PaperSize;
  activeZone?: SuratTugasEditableZone;
  onSelectZone?: (zone: SuratTugasEditableZone) => void;
  onUpdateField?: (field: keyof SuratPerintahTugas, value: any) => void;
  onUpdateDasar?: (index: number, value: string) => void;
  onUpdatePegawai?: (id: string, field: keyof SuratTugasPegawai, value: string) => void;
  isPrintMode?: boolean;
}

export const SuratTugasDocumentPreview: React.FC<SuratTugasDocumentPreviewProps> = ({
  spt,
  appSettings,
  paperSize,
  activeZone,
  onSelectZone,
  onUpdateField,
  onUpdateDasar,
  onUpdatePegawai,
  isPrintMode = false,
}) => {
  const spec = getPaperDimensions(paperSize);

  const getZoneClass = (zone: SuratTugasEditableZone) => {
    if (isPrintMode || !onSelectZone) return '';
    const base = 'relative cursor-pointer transition-all duration-150 rounded-lg p-1.5 -m-1.5 group';
    if (activeZone === zone) {
      return `${base} ring-2 ring-sky-600 bg-sky-50/60 shadow-xs`;
    }
    return `${base} hover:ring-2 hover:ring-sky-300 hover:bg-slate-50/70`;
  };

  const renderZoneBadge = (label: string) => {
    if (isPrintMode || !onSelectZone) return null;
    return (
      <span className="no-print absolute -top-2.5 right-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-sky-700 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xs">
        Klik / Ketik untuk Edit {label}
      </span>
    );
  };

  const editableClass = isPrintMode
    ? ''
    : 'outline-none focus:bg-amber-100/90 focus:ring-2 focus:ring-sky-500 rounded px-1 transition-colors cursor-text';

  return (
    <div
      className={`spt-doc mx-auto bg-white text-slate-900 shadow-xl print:shadow-none print:m-0 print:p-0 print:w-full font-sans ${
        isPrintMode ? '' : 'p-8 sm:p-12 border border-slate-200'
      }`}
      style={{
        width: isPrintMode ? '100%' : `${spec.widthPx}px`,
        minHeight: isPrintMode ? 'auto' : `${spec.minHeightPx}px`,
        boxSizing: 'border-box',
        fontFamily: 'Arial, Helvetica, sans-serif',
        lineHeight: 1.125,
      }}
    >
      <style>{`
        .spt-doc p {
          margin-bottom: 1.5pt;
        }
        .spt-para {
          margin-bottom: 1.5pt;
        }
      `}</style>

      {/* 1. KOP SURAT DINAS */}
      <div
        onClick={() => onSelectZone?.('header')}
        className={getZoneClass('header')}
      >
        {renderZoneBadge('Kop & Nomor')}
        <div className="flex items-start gap-4 pb-2 border-b-4 border-double border-slate-900">
          <div className="w-16 h-20 shrink-0 flex items-center justify-center pt-1">
            <KaltaraEmblem
              className="w-14 h-18"
              logoDataUrl={appSettings.logoPemprovDataUrl}
            />
          </div>
          <div className="flex-1 text-center pr-12 font-sans">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide text-slate-800 mb-[1.5pt]">
              {appSettings.instansiUtama || 'PEMERINTAH PROVINSI KALIMANTAN UTARA'}
            </h2>
            <h1 className="text-sm sm:text-base font-extrabold uppercase tracking-tight text-slate-900 mb-[1.5pt]">
              {appSettings.namaDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
            </h1>
            <p className="text-[10px] text-slate-700 mb-[1.5pt]">
              {appSettings.alamatDinasBaris1}
            </p>
            <p className="text-[10px] text-slate-700 mb-[1.5pt]">
              {appSettings.alamatDinasBaris2} | {appSettings.kontakDinas}
            </p>
          </div>
        </div>

        {/* JUDUL SURAT & NOMOR */}
        <div className="text-center pt-4 pb-2">
          <h2 className="text-sm sm:text-base font-bold uppercase tracking-wider underline text-slate-900 mb-[1.5pt]">
            SURAT PERINTAH TUGAS
          </h2>
          <p className="text-xs font-sans font-medium text-slate-800 mb-[1.5pt]">
            Nomor:{' '}
            <span
              contentEditable={!isPrintMode}
              suppressContentEditableWarning
              onBlur={(e) =>
                onUpdateField?.('noSpt', e.currentTarget.innerText.trim())
              }
              className={`whitespace-pre ${editableClass}`}
            >
              {spt.noSpt || '800.1.11.1/ 11898/SPT/Disdikbud/KU/X/2026'}
            </span>
          </p>
        </div>
      </div>

      {/* 2. DASAR HUKUM */}
      <div
        onClick={() => onSelectZone?.('dasar')}
        className={`mt-2 ${getZoneClass('dasar')}`}
      >
        {renderZoneBadge('Dasar Hukum')}
        <div className="flex items-start text-xs sm:text-xs">
          <span className="w-16 shrink-0 font-medium">Dasar</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <div className="flex-1">
            {spt.dasarList && spt.dasarList.length > 0 ? (
              spt.dasarList.map((dasar, idx) => (
                <div key={idx} className="flex items-start gap-1.5 text-justify mb-[1.5pt] spt-para">
                  <span className="shrink-0">{idx + 1}.</span>
                  <span
                    contentEditable={!isPrintMode}
                    suppressContentEditableWarning
                    onBlur={(e) =>
                      onUpdateDasar?.(idx, e.currentTarget.innerText.trim())
                    }
                    className={`flex-1 ${editableClass}`}
                  >
                    {dasar}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic mb-[1.5pt]">(Belum ada dasar hukum)</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. MEMERINTAHKAN & KEPADA (DAFTAR PEGAWAI) */}
      <div
        onClick={() => onSelectZone?.('pegawai')}
        className={`mt-3 ${getZoneClass('pegawai')}`}
      >
        {renderZoneBadge('Daftar Pegawai')}
        <div className="text-center font-bold uppercase text-xs tracking-widest my-2">
          MEMERINTAHKAN
        </div>

        <div className="flex items-start text-xs">
          <span className="w-16 shrink-0 font-medium">Kepada</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <div className="flex-1">
            {spt.pegawaiList && spt.pegawaiList.length > 0 ? (
              spt.pegawaiList.map((peg, idx) => (
                <div key={peg.id || idx} className="space-y-0.5 mb-[3pt] spt-para">
                  {/* Row 1: Nama */}
                  <div className="flex items-baseline text-xs mb-[1.5pt]">
                    <span className="w-6 shrink-0 font-medium">{idx + 1}.</span>
                    <span className="w-28 shrink-0 font-medium text-slate-800">Nama</span>
                    <span className="w-4 shrink-0 font-medium text-slate-800">:</span>
                    <span
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdatePegawai?.(peg.id, 'nama', e.currentTarget.innerText.trim())
                      }
                      className={`flex-1 font-bold text-slate-900 ${editableClass}`}
                    >
                      {peg.nama}
                    </span>
                  </div>

                  {/* Row 2: Pangkat/Gol. */}
                  <div className="flex items-baseline text-xs mb-[1.5pt]">
                    <span className="w-6 shrink-0"></span>
                    <span className="w-28 shrink-0 text-slate-700">Pangkat/Gol.</span>
                    <span className="w-4 shrink-0 font-medium text-slate-800">:</span>
                    <span
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdatePegawai?.(peg.id, 'pangkatGol', e.currentTarget.innerText.trim())
                      }
                      className={`flex-1 ${editableClass}`}
                    >
                      {peg.pangkatGol || '-'}
                    </span>
                  </div>

                  {/* Row 3: NIP */}
                  <div className="flex items-baseline text-xs mb-[1.5pt]">
                    <span className="w-6 shrink-0"></span>
                    <span className="w-28 shrink-0 text-slate-700 font-sans font-medium">NIP</span>
                    <span className="w-4 shrink-0 font-medium text-slate-800">:</span>
                    <span
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdatePegawai?.(peg.id, 'nip', e.currentTarget.innerText.trim())
                      }
                      className={`flex-1 font-sans font-medium ${editableClass}`}
                    >
                      {peg.nip || '-'}
                    </span>
                  </div>

                  {/* Row 4: Jabatan */}
                  <div className="flex items-baseline text-xs mb-[1.5pt]">
                    <span className="w-6 shrink-0"></span>
                    <span className="w-28 shrink-0 text-slate-700">Jabatan</span>
                    <span className="w-4 shrink-0 font-medium text-slate-800">:</span>
                    <span
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdatePegawai?.(peg.id, 'jabatan', e.currentTarget.innerText.trim())
                      }
                      className={`flex-1 ${editableClass}`}
                    >
                      {peg.jabatan || '-'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 italic mb-[1.5pt]">(Belum ada pegawai ditugaskan)</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. DETAIL TUGAS & RINCIAN PERJALANAN */}
      <div
        onClick={() => onSelectZone?.('detail')}
        className={`mt-4 text-xs ${getZoneClass('detail')}`}
      >
        {renderZoneBadge('Detail Perjalanan')}

        <div className="flex items-start mb-[1.5pt] spt-para">
          <span className="w-44 shrink-0 font-medium">Maksud perjalanan dinas</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <span
            contentEditable={!isPrintMode}
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdateField?.('maksudPerjalanan', e.currentTarget.innerText.trim())
            }
            className={`flex-1 text-justify ${editableClass}`}
          >
            {spt.maksudPerjalanan || '-'}
          </span>
        </div>

        <div className="flex items-start mb-[1.5pt] spt-para">
          <span className="w-44 shrink-0 font-medium">Tempat berangkat</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <span
            contentEditable={!isPrintMode}
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdateField?.('tempatBerangkat', e.currentTarget.innerText.trim())
            }
            className={`flex-1 ${editableClass}`}
          >
            {spt.tempatBerangkat || '-'}
          </span>
        </div>

        <div className="flex items-start mb-[1.5pt] spt-para">
          <span className="w-44 shrink-0 font-medium">Tempat tujuan</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <span
            contentEditable={!isPrintMode}
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdateField?.('tempatTujuan', e.currentTarget.innerText.trim())
            }
            className={`flex-1 ${editableClass}`}
          >
            {spt.tempatTujuan || '-'}
          </span>
        </div>

        <div className="flex items-start mb-[1.5pt] spt-para">
          <span className="w-44 shrink-0 font-medium">Tanggal berangkat</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <span
            contentEditable={!isPrintMode}
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdateField?.('tanggalBerangkat', e.currentTarget.innerText.trim())
            }
            className={`flex-1 ${editableClass}`}
          >
            {spt.tanggalBerangkat || '-'}
          </span>
        </div>

        <div className="flex items-start mb-[1.5pt] spt-para">
          <span className="w-44 shrink-0 font-medium">Tanggal harus kembali</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <span
            contentEditable={!isPrintMode}
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdateField?.('tanggalHarusKembali', e.currentTarget.innerText.trim())
            }
            className={`flex-1 ${editableClass}`}
          >
            {spt.tanggalHarusKembali || '-'}
          </span>
        </div>

        <div className="flex items-start mb-[1.5pt] spt-para">
          <span className="w-44 shrink-0 font-medium">Lamanya Perjalanan Dinas</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <span
            contentEditable={!isPrintMode}
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdateField?.('lamanyaPerjalanan', e.currentTarget.innerText.trim())
            }
            className={`flex-1 ${editableClass}`}
          >
            {spt.lamanyaPerjalanan || '-'}
          </span>
        </div>

        <div className="flex items-start mb-[1.5pt] spt-para">
          <span className="w-44 shrink-0 font-medium">Pembebanan anggaran</span>
          <span className="w-4 shrink-0 font-medium">:</span>
          <span
            contentEditable={!isPrintMode}
            suppressContentEditableWarning
            onBlur={(e) =>
              onUpdateField?.('pembebananAnggaran', e.currentTarget.innerText.trim())
            }
            className={`flex-1 text-justify ${editableClass}`}
          >
            {spt.pembebananAnggaran || '-'}
          </span>
        </div>
      </div>

      {/* 5. PARAGRAF PENUTUP & TANDA TANGAN */}
      <div
        onClick={() => onSelectZone?.('ttd')}
        className={`mt-6 ${getZoneClass('ttd')}`}
      >
        {renderZoneBadge('Penandatangan')}

        <p className="text-xs text-justify mb-[1.5pt] spt-para">
          Demikian Surat Perintah Tugas ini diberikan agar dapat dipergunakan sebagaimana mestinya dan segera membuat laporan setelah melaksanakan tugas.
        </p>

        {/* PENANDATANGAN (RIGHT ALIGNED) */}
        <div className="mt-6 flex justify-end text-xs">
          <div className="w-72">
            <div className="flex items-center mb-[1.5pt] spt-para">
              <span className="w-28 shrink-0">Ditetapkan di</span>
              <span className="w-3 shrink-0">:</span>
              <span
                contentEditable={!isPrintMode}
                suppressContentEditableWarning
                onBlur={(e) =>
                  onUpdateField?.('tempatDitetapkan', e.currentTarget.innerText.trim())
                }
                className={`font-semibold ${editableClass}`}
              >
                {spt.tempatDitetapkan || 'Tanjung Selor'}
              </span>
            </div>
            <div className="flex items-center mb-[1.5pt] spt-para">
              <span className="w-28 shrink-0">Pada Tanggal</span>
              <span className="w-3 shrink-0">:</span>
              <span
                contentEditable={!isPrintMode}
                suppressContentEditableWarning
                onBlur={(e) =>
                  onUpdateField?.('tanggalDitetapkan', e.currentTarget.innerText.trim())
                }
                className={`font-semibold ${editableClass}`}
              >
                {spt.tanggalDitetapkan || '15 Oktober 2026'}
              </span>
            </div>

            <div className="pt-2 font-semibold mb-[1.5pt] spt-para">
              <p
                contentEditable={!isPrintMode}
                suppressContentEditableWarning
                onBlur={(e) =>
                  onUpdateField?.('jabatanPenandatangan', e.currentTarget.innerText.trim())
                }
                className={editableClass}
              >
                {spt.jabatanPenandatangan || 'Plt. Kepala Dinas'}
              </p>
            </div>

            {/* Signature Gap */}
            <div className="h-16" />

            <div>
              <p
                contentEditable={!isPrintMode}
                suppressContentEditableWarning
                onBlur={(e) =>
                  onUpdateField?.('namaPenandatangan', e.currentTarget.innerText.trim())
                }
                className={`font-bold underline text-slate-900 mb-[1.5pt] ${editableClass}`}
              >
                {spt.namaPenandatangan || 'Hasanuddin, S.Pd., M.Si.'}
              </p>
              <p className="font-sans font-medium text-slate-800 mb-[1.5pt] spt-para">
                NIP{' '}
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('nipPenandatangan', e.currentTarget.innerText.trim())
                  }
                  className={editableClass}
                >
                  {spt.nipPenandatangan || '197405272007011010'}
                </span>
              </p>
              <p
                contentEditable={!isPrintMode}
                suppressContentEditableWarning
                onBlur={(e) =>
                  onUpdateField?.('pangkatPenandatangan', e.currentTarget.innerText.trim())
                }
                className={`text-slate-700 font-medium mb-[1.5pt] ${editableClass}`}
              >
                {spt.pangkatPenandatangan || 'Pembina Tingkat I, IV/b'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
