import React, { useRef, useState, useEffect } from 'react';
import { SuratPerintahTugas, SuratTugasPegawai, AppSettings, PaperSize } from '../types/spj';
import { KaltaraEmblem } from './KaltaraEmblem';
import { getPaperDimensions } from '../utils/spjCalculations';

export type SuratTugasEditableZone = 'header' | 'dasar' | 'pegawai' | 'detail' | 'ttd';

export const ALLOWED_SPT_FONT_SIZES = [11.5, 11.0, 10.5, 10.0, 9.5] as const;
export type SptFontSize = typeof ALLOWED_SPT_FONT_SIZES[number];

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
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Auto-calculated optimal font size to ensure SPT strictly fits on 1 page (default: 11.5pt, min: 9.5pt)
  const [computedFontSize, setComputedFontSize] = useState<number>(() => {
    if (spt.fontSizePt && ALLOWED_SPT_FONT_SIZES.includes(spt.fontSizePt as any)) {
      return spt.fontSizePt;
    }
    // Predictive estimation to avoid initial layout flash
    const dasarCount = spt.dasarList?.length || 0;
    const pegCount = spt.pegawaiList?.length || 1;
    const maksudLen = (spt.maksudPerjalanan || '').length;
    const anggaranLen = (spt.pembebananAnggaran || '').length;
    const maxPageHeight = paperSize === 'F4' ? 1160 : 1040;

    let estimatedHeight = 670 + Math.max(0, dasarCount - 1) * 42 + (pegCount - 1) * 88;
    if (maksudLen > 90) estimatedHeight += Math.ceil((maksudLen - 90) / 75) * 16;
    if (anggaranLen > 110) estimatedHeight += Math.ceil((anggaranLen - 110) / 75) * 16;

    if (estimatedHeight > maxPageHeight) {
      const ratio = estimatedHeight / maxPageHeight;
      if (ratio > 1.20) return 9.5;
      if (ratio > 1.12) return 10.0;
      if (ratio > 1.05) return 10.5;
      return 11.0;
    }
    return 11.5;
  });

  // Effective font size: user manual override or computed auto size
  const effectiveFontSizePt =
    spt.fontSizePt && ALLOWED_SPT_FONT_SIZES.includes(spt.fontSizePt as any)
      ? spt.fontSizePt
      : computedFontSize;

  const isAutoAdjusted = !spt.fontSizePt && computedFontSize < 11.5;

  // Measure actual DOM height and dynamically step down font size if overflowing 1 page
  useEffect(() => {
    if (spt.fontSizePt && ALLOWED_SPT_FONT_SIZES.includes(spt.fontSizePt as any)) {
      return; // User set explicit font size
    }

    const checkFit = () => {
      const el = contentAreaRef.current;
      if (!el) return;

      const maxPageHeight = paperSize === 'F4' ? 1160 : 1040;
      const actualHeight = el.scrollHeight;

      if (actualHeight > maxPageHeight + 8) {
        // Content overflows 1 page, step down font size if not already at minimum 9.5pt
        setComputedFontSize((prev) => {
          const idx = ALLOWED_SPT_FONT_SIZES.indexOf(prev as any);
          if (idx !== -1 && idx < ALLOWED_SPT_FONT_SIZES.length - 1) {
            return ALLOWED_SPT_FONT_SIZES[idx + 1];
          }
          return 9.5;
        });
      } else if (actualHeight < maxPageHeight - 90 && computedFontSize < 11.5) {
        // Generous room available, step up towards default 11.5pt
        setComputedFontSize((prev) => {
          const idx = ALLOWED_SPT_FONT_SIZES.indexOf(prev as any);
          if (idx > 0) {
            return ALLOWED_SPT_FONT_SIZES[idx - 1];
          }
          return 11.5;
        });
      }
    };

    const timer = setTimeout(checkFit, 60);
    return () => clearTimeout(timer);
  }, [spt, paperSize, computedFontSize]);

  const getZoneClass = (zone: SuratTugasEditableZone) => {
    if (isPrintMode || !onSelectZone) return '';
    const base =
      'relative cursor-pointer transition-all duration-150 rounded-md p-1.5 -m-1.5 group print:outline-none print:ring-0 print:bg-transparent';
    if (activeZone === zone) {
      return `${base} outline-2 outline-dashed outline-sky-500 bg-sky-50/50 shadow-2xs`;
    }
    return `${base} hover:outline-1 hover:outline-dashed hover:outline-sky-400 active:outline-2 active:outline-dashed active:outline-sky-500 hover:bg-sky-50/30 active:bg-sky-50/50`;
  };

  const renderZoneBadge = (label: string) => {
    if (isPrintMode || !onSelectZone) return null;
    return (
      <span className="no-print absolute -top-2.5 right-2 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-sky-700 text-white opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity z-10 shadow-xs pointer-events-none">
        Ketuk untuk Edit {label}
      </span>
    );
  };

  const editableClass = isPrintMode
    ? ''
    : 'outline-none hover:outline-1 hover:outline-dashed hover:outline-sky-400/90 focus:bg-amber-100/90 focus:outline-2 focus:outline-dashed focus:outline-sky-500 rounded px-0 transition-all cursor-text print:outline-none print:px-0';

  const signatureGapClass =
    effectiveFontSizePt <= 10.0 || (spt.pegawaiList && spt.pegawaiList.length > 2)
      ? 'h-8'
      : 'h-11';

  return (
    <div className="w-full">
      {/* DOKUMEN FISIK SURAT PERINTAH TUGAS (SPT) */}
      <div
        className={`spt-doc spj-font-calibri mx-auto bg-white text-black shadow-xl print:shadow-none print:border-none print:m-0 print:p-0 print:w-full print:min-h-0 print:h-auto ${
          isPrintMode ? 'py-3 px-0' : 'py-7 px-0 border border-slate-200'
        }`}
        style={{
          width: isPrintMode ? '100%' : `${spec.widthPx}px`,
          minHeight: isPrintMode ? 'auto' : `${spec.minHeightPx}px`,
          boxSizing: 'border-box',
          fontFamily: "Calibri, 'Carlito', 'Arimo', Arial, Helvetica, sans-serif",
          lineHeight: effectiveFontSizePt <= 10.0 ? 1.15 : 1.18,
        }}
      >
        <style>{`
          .spt-doc .spt-content-area {
            width: 86%;
            max-width: 86%;
            margin-left: auto;
            margin-right: auto;
          }
          .spt-doc p {
            margin-bottom: ${effectiveFontSizePt <= 10.0 ? '1pt' : '1.5pt'};
          }
          .spt-para {
            margin-bottom: ${effectiveFontSizePt <= 10.0 ? '1pt' : '1.5pt'};
          }
          .spt-doc [contenteditable] {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          /* SELURUH ISI NASKAH SPT DI LUAR KOP MEMILIKI UKURAN FONT DINAMIS (STANDAR 11.5pt, MIN 9.5pt) */
          .spt-body-content,
          .spt-body-content p,
          .spt-body-content span,
          .spt-body-content div:not(.no-font-inherit) {
            font-size: ${effectiveFontSizePt}pt !important;
          }
          .spt-title-main {
            font-size: ${Number((effectiveFontSizePt * 1.25).toFixed(1))}pt !important;
          }
          @media print {
            .spt-doc .spt-content-area {
              width: 86% !important;
              max-width: 86% !important;
              margin-left: auto !important;
              margin-right: auto !important;
            }
            .spt-doc [contenteditable] {
              padding: 0 !important;
              margin: 0 !important;
            }
            .spt-body-content,
            .spt-body-content p,
            .spt-body-content span,
            .spt-body-content div:not(.no-font-inherit) {
              font-size: ${effectiveFontSizePt}pt !important;
            }
            .spt-title-main {
              font-size: ${Number((effectiveFontSizePt * 1.25).toFixed(1))}pt !important;
            }
          }
        `}</style>

        {/* PEMBATAS LEBAR TOTAL SPT: 86% DARI LEBAR KERTAS AGAR TIDAK PERNAH TERPOTONG DI KANAN/KIRI */}
        <div
          ref={contentAreaRef}
          data-testid="spt-content-area"
          style={{
            width: '86%',
            maxWidth: '86%',
          }}
          className="spt-content-area w-[86%] max-w-[86%] mx-auto print:w-[86%] print:max-w-[86%] print:mx-auto"
        >
          {/* 1. KOP SURAT DINAS (UKURAN TETAP STANDAR RESMI KOP DINAS) */}
          <div
            onClick={() => onSelectZone?.('header')}
            className={getZoneClass('header')}
          >
            {renderZoneBadge('Kop & Nomor')}
            <div className="flex items-center gap-3 pb-2 border-b-4 border-double border-black">
              <div className="w-17 h-21 shrink-0 flex items-center justify-center">
                <KaltaraEmblem
                  className="w-16 h-20"
                  logoDataUrl={appSettings.logoPemprovDataUrl}
                />
              </div>
              <div className="flex-1 text-center pr-2 min-w-0">
                <h2 className="text-[17.5px] font-bold uppercase tracking-wide text-black leading-[1.18] mb-[1.5pt]">
                  {appSettings.instansiUtama || 'PEMERINTAH PROVINSI KALIMANTAN UTARA'}
                </h2>
                <h1 className="text-[19.5px] font-extrabold uppercase tracking-tight text-black leading-[1.18] mb-[1.5pt]">
                  {appSettings.namaDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
                </h1>
                <p className="text-[11.5px] text-black leading-[1.18] mb-[1pt] break-words">
                  {appSettings.alamatDinasBaris1}
                </p>
                <p className="text-[11.5px] text-black leading-[1.18] mb-[1pt] break-words">
                  {appSettings.alamatDinasBaris2} | {appSettings.kontakDinas}
                </p>
              </div>
            </div>
          </div>

          {/* 2. AREA NASKAH SPT DI LUAR KOP (FONTS: 11.5pt HINGGA MINIMAL 9.5pt) */}
          <div className="spt-body-content text-black">
            {/* JUDUL SURAT & NOMOR */}
            <div
              onClick={() => onSelectZone?.('header')}
              className={`text-center pt-2.5 pb-1.5 ${getZoneClass('header')}`}
            >
              <h2 className="spt-title-main font-bold uppercase tracking-wider underline text-black leading-[1.2] mb-[1.5pt]">
                SURAT PERINTAH TUGAS
              </h2>
              <p className="font-medium text-black leading-[1.2] mb-[1.5pt] break-words">
                Nomor:{' '}
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('noSpt', e.currentTarget.innerText.trim())
                  }
                  className={`break-words ${editableClass}`}
                >
                  {spt.noSpt || '800.1.11.1/ 11898/SPT/Disdikbud/KU/X/2026'}
                </span>
              </p>
            </div>

            {/* DASAR HUKUM */}
            <div
              onClick={() => onSelectZone?.('dasar')}
              className={`mt-1.5 ${getZoneClass('dasar')}`}
            >
              {renderZoneBadge('Dasar Hukum')}
              <div className="flex items-start">
                <span className="w-14 shrink-0 font-medium">Dasar</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <div className="flex-1 min-w-0">
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
                          className={`flex-1 min-w-0 break-words ${editableClass}`}
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

            {/* MEMERINTAHKAN & KEPADA (DAFTAR PEGAWAI) */}
            <div
              onClick={() => onSelectZone?.('pegawai')}
              className={`mt-2 ${getZoneClass('pegawai')}`}
            >
              {renderZoneBadge('Daftar Pegawai')}
              <div className="text-center font-bold uppercase tracking-widest my-1">
                MEMERINTAHKAN
              </div>

              <div className="flex items-start">
                <span className="w-14 shrink-0 font-medium">Kepada</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <div className="flex-1 min-w-0">
                  {spt.pegawaiList && spt.pegawaiList.length > 0 ? (
                    (() => {
                      const hasMultiple = spt.pegawaiList.length > 1;
                      return spt.pegawaiList.map((peg, idx) => (
                        <div key={peg.id || idx} className="space-y-0.5 mb-[2.5pt] spt-para">
                          {/* Row 1: Nama */}
                          <div className="flex items-baseline mb-[1pt]">
                            {hasMultiple && (
                              <span className="w-5 shrink-0 font-medium">{idx + 1}.</span>
                            )}
                            <span className="w-24 shrink-0 font-medium text-black">Nama</span>
                            <span className="w-3.5 shrink-0 font-medium text-black">:</span>
                            <span
                              contentEditable={!isPrintMode}
                              suppressContentEditableWarning
                              onBlur={(e) =>
                                onUpdatePegawai?.(peg.id, 'nama', e.currentTarget.innerText.trim())
                              }
                              className={`flex-1 min-w-0 break-words font-bold text-black ${editableClass}`}
                            >
                              {peg.nama}
                            </span>
                          </div>

                          {/* Row 2: Pangkat/Gol. */}
                          <div className="flex items-baseline mb-[1pt]">
                            {hasMultiple && <span className="w-5 shrink-0"></span>}
                            <span className="w-24 shrink-0 text-black">Pangkat/Gol.</span>
                            <span className="w-3.5 shrink-0 font-medium text-black">:</span>
                            <span
                              contentEditable={!isPrintMode}
                              suppressContentEditableWarning
                              onBlur={(e) =>
                                onUpdatePegawai?.(peg.id, 'pangkatGol', e.currentTarget.innerText.trim())
                              }
                              className={`flex-1 min-w-0 break-words ${editableClass}`}
                            >
                              {peg.pangkatGol || '-'}
                            </span>
                          </div>

                          {/* Row 3: NIP */}
                          <div className="flex items-baseline mb-[1pt]">
                            {hasMultiple && <span className="w-5 shrink-0"></span>}
                            <span className="w-24 shrink-0 text-black font-medium">NIP</span>
                            <span className="w-3.5 shrink-0 font-medium text-black">:</span>
                            <span
                              contentEditable={!isPrintMode}
                              suppressContentEditableWarning
                              onBlur={(e) =>
                                onUpdatePegawai?.(peg.id, 'nip', e.currentTarget.innerText.trim())
                              }
                              className={`flex-1 min-w-0 break-words font-medium tabular-nums ${editableClass}`}
                            >
                              {peg.nip || '-'}
                            </span>
                          </div>

                          {/* Row 4: Jabatan */}
                          <div className="flex items-baseline mb-[1pt]">
                            {hasMultiple && <span className="w-5 shrink-0"></span>}
                            <span className="w-24 shrink-0 text-black">Jabatan</span>
                            <span className="w-3.5 shrink-0 font-medium text-black">:</span>
                            <span
                              contentEditable={!isPrintMode}
                              suppressContentEditableWarning
                              onBlur={(e) =>
                                onUpdatePegawai?.(peg.id, 'jabatan', e.currentTarget.innerText.trim())
                              }
                              className={`flex-1 min-w-0 break-words ${editableClass}`}
                            >
                              {peg.jabatan || '-'}
                            </span>
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    <p className="text-slate-400 italic mb-[1.5pt]">(Belum ada pegawai ditugaskan)</p>
                  )}
                </div>
              </div>
            </div>

            {/* DETAIL TUGAS & RINCIAN PERJALANAN */}
            <div
              onClick={() => onSelectZone?.('detail')}
              className={`mt-2.5 text-black ${getZoneClass('detail')}`}
            >
              {renderZoneBadge('Detail Perjalanan')}

              <div className="flex items-start mb-[1.5pt] spt-para">
                <span className="w-40 shrink-0 font-medium">Maksud perjalanan dinas</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('maksudPerjalanan', e.currentTarget.innerText.trim())
                  }
                  className={`flex-1 min-w-0 break-words text-justify ${editableClass}`}
                >
                  {spt.maksudPerjalanan || '-'}
                </span>
              </div>

              <div className="flex items-start mb-[1.5pt] spt-para">
                <span className="w-40 shrink-0 font-medium">Tempat berangkat</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('tempatBerangkat', e.currentTarget.innerText.trim())
                  }
                  className={`flex-1 min-w-0 break-words ${editableClass}`}
                >
                  {spt.tempatBerangkat || '-'}
                </span>
              </div>

              <div className="flex items-start mb-[1.5pt] spt-para">
                <span className="w-40 shrink-0 font-medium">Tempat tujuan</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('tempatTujuan', e.currentTarget.innerText.trim())
                  }
                  className={`flex-1 min-w-0 break-words ${editableClass}`}
                >
                  {spt.tempatTujuan || '-'}
                </span>
              </div>

              <div className="flex items-start mb-[1.5pt] spt-para">
                <span className="w-40 shrink-0 font-medium">Tanggal berangkat</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('tanggalBerangkat', e.currentTarget.innerText.trim())
                  }
                  className={`flex-1 min-w-0 break-words ${editableClass}`}
                >
                  {spt.tanggalBerangkat || '-'}
                </span>
              </div>

              <div className="flex items-start mb-[1.5pt] spt-para">
                <span className="w-40 shrink-0 font-medium">Tanggal harus kembali</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('tanggalHarusKembali', e.currentTarget.innerText.trim())
                  }
                  className={`flex-1 min-w-0 break-words ${editableClass}`}
                >
                  {spt.tanggalHarusKembali || '-'}
                </span>
              </div>

              <div className="flex items-start mb-[1.5pt] spt-para">
                <span className="w-40 shrink-0 font-medium">Lamanya Perjalanan Dinas</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('lamanyaPerjalanan', e.currentTarget.innerText.trim())
                  }
                  className={`flex-1 min-w-0 break-words ${editableClass}`}
                >
                  {spt.lamanyaPerjalanan || '-'}
                </span>
              </div>

              <div className="flex items-start mb-[1.5pt] spt-para">
                <span className="w-40 shrink-0 font-medium">Pembebanan anggaran</span>
                <span className="w-3.5 shrink-0 font-medium">:</span>
                <span
                  contentEditable={!isPrintMode}
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    onUpdateField?.('pembebananAnggaran', e.currentTarget.innerText.trim())
                  }
                  className={`flex-1 min-w-0 break-words text-justify ${editableClass}`}
                >
                  {spt.pembebananAnggaran || '-'}
                </span>
              </div>
            </div>

            {/* PARAGRAF PENUTUP & TANDA TANGAN */}
            <div
              onClick={() => onSelectZone?.('ttd')}
              className={`mt-3.5 text-black ${getZoneClass('ttd')}`}
            >
              {renderZoneBadge('Penandatangan')}

              <p className="text-justify mb-[1.5pt] spt-para break-words">
                Demikian Surat Perintah Tugas ini diberikan agar dapat dipergunakan sebagaimana mestinya dan segera membuat laporan setelah melaksanakan tugas.
              </p>

              {/* PENANDATANGAN (RIGHT ALIGNED, FLUSH LEFT INSIDE COLUMN) */}
              <div className="mt-3.5 flex justify-end">
                <div className="w-64 max-w-full text-left">
                  <div className="flex items-center mb-[1pt] spt-para">
                    <span className="w-24 shrink-0 font-medium">Ditetapkan di</span>
                    <span className="w-3 shrink-0 font-medium">:</span>
                    <span
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdateField?.('tempatDitetapkan', e.currentTarget.innerText.trim())
                      }
                      className={`font-semibold break-words ${editableClass}`}
                    >
                      {(spt.tempatDitetapkan || 'Tanjung Selor').trim()}
                    </span>
                  </div>
                  <div className="flex items-center mb-[1pt] spt-para">
                    <span className="w-24 shrink-0 font-medium">Pada Tanggal</span>
                    <span className="w-3 shrink-0 font-medium">:</span>
                    <span
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdateField?.('tanggalDitetapkan', e.currentTarget.innerText.trim())
                      }
                      className={`font-semibold break-words ${editableClass}`}
                    >
                      {(spt.tanggalDitetapkan || '15 Oktober 2026').trim()}
                    </span>
                  </div>

                  <div className="pt-1.5 font-semibold mb-[1pt] spt-para">
                    <p
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdateField?.('jabatanPenandatangan', e.currentTarget.innerText.trim())
                      }
                      className={`block ${editableClass}`}
                    >
                      {(spt.jabatanPenandatangan || 'Plt. Kepala Dinas').trim()}
                    </p>
                  </div>

                  {/* Signature Gap */}
                  <div className={signatureGapClass} />

                  {/* BLOK TANDA TANGAN: NAMA, PANGKAT, DAN NIP PERSISI SEJAJAR RATA KIRI */}
                  <div className="text-left space-y-0.5">
                    <p
                      contentEditable={!isPrintMode}
                      suppressContentEditableWarning
                      onBlur={(e) =>
                        onUpdateField?.('namaPenandatangan', e.currentTarget.innerText.trim())
                      }
                      className={`font-bold underline text-black block mb-[1pt] ${editableClass}`}
                    >
                      {(spt.namaPenandatangan || 'Hasanuddin, S.Pd., M.Si.').trim()}
                    </p>

                    {/* Urutan NIP & Pangkat (Default: Pangkat di atas NIP sesuai tata naskah dinas resmi, atau NIP lalu Pangkat) */}
                    {spt.urutanTtdPangkatNip === 'nip-dulu' ? (
                      <>
                        <p className="font-medium text-black tabular-nums block mb-[1pt] spt-para">
                          <span className="font-medium select-none">NIP </span>
                          <span
                            contentEditable={!isPrintMode}
                            suppressContentEditableWarning
                            onBlur={(e) =>
                              onUpdateField?.(
                                'nipPenandatangan',
                                e.currentTarget.innerText.trim().replace(/^NIP\.?\s*/i, '')
                              )
                            }
                            className={`tabular-nums ${editableClass}`}
                          >
                            {(spt.nipPenandatangan || '197405272007011010')
                              .trim()
                              .replace(/^NIP\.?\s*/i, '')}
                          </span>
                        </p>
                        {spt.pangkatPenandatangan && spt.pangkatPenandatangan.trim() !== '' && (
                          <p
                            contentEditable={!isPrintMode}
                            suppressContentEditableWarning
                            onBlur={(e) =>
                              onUpdateField?.('pangkatPenandatangan', e.currentTarget.innerText.trim())
                            }
                            className={`text-black font-medium block mb-[1pt] ${editableClass}`}
                          >
                            {spt.pangkatPenandatangan.trim()}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        {spt.pangkatPenandatangan && spt.pangkatPenandatangan.trim() !== '' && (
                          <p
                            contentEditable={!isPrintMode}
                            suppressContentEditableWarning
                            onBlur={(e) =>
                              onUpdateField?.('pangkatPenandatangan', e.currentTarget.innerText.trim())
                            }
                            className={`text-black font-medium block mb-[1pt] ${editableClass}`}
                          >
                            {spt.pangkatPenandatangan.trim()}
                          </p>
                        )}
                        <p className="font-medium text-black tabular-nums block mb-[1pt] spt-para">
                          <span className="font-medium select-none">NIP </span>
                          <span
                            contentEditable={!isPrintMode}
                            suppressContentEditableWarning
                            onBlur={(e) =>
                              onUpdateField?.(
                                'nipPenandatangan',
                                e.currentTarget.innerText.trim().replace(/^NIP\.?\s*/i, '')
                              )
                            }
                            className={`tabular-nums ${editableClass}`}
                          >
                            {(spt.nipPenandatangan || '197405272007011010')
                              .trim()
                              .replace(/^NIP\.?\s*/i, '')}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
