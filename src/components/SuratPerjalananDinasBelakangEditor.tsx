import React from 'react';
import {
  RotateCcw,
  Sparkles,
  AlertCircle,
  Stamp,
  PlaneTakeoff,
  Route,
  NotebookPen,
} from 'lucide-react';
import {
  SuratPerintahTugas,
  SpdVisumBelakangData,
  SpdVisumPersinggahanRow,
} from '../types/spj';
import {
  SpdBelakangEditableZone,
  getEffectiveVisumData,
} from './SuratPerjalananDinasBelakangDocumentPreview';
import { NativeSnapPager } from './NativeSnapPager';

interface SuratPerjalananDinasBelakangEditorProps {
  spt: SuratPerintahTugas;
  activeZone: SpdBelakangEditableZone;
  onSelectZone: (zone: SpdBelakangEditableZone) => void;
  visumData: SpdVisumBelakangData;
  onUpdateVisumData: (updated: SpdVisumBelakangData) => void;
  hideInternalTabs?: boolean;
}

export const SuratPerjalananDinasBelakangEditor: React.FC<
  SuratPerjalananDinasBelakangEditorProps
> = ({
  spt,
  activeZone,
  onSelectZone,
  visumData,
  onUpdateVisumData,
  hideInternalTabs = false,
}) => {
  const data = visumData || getEffectiveVisumData(spt);
  const visumZones: SpdBelakangEditableZone[] = [
    'bagian-1',
    'bagian-transit',
    'bagian-6',
    'bagian-catatan',
  ];

  const handleFieldChange = (field: keyof SpdVisumBelakangData, value: any) => {
    onUpdateVisumData({
      ...data,
      [field]: value,
    });
  };

  const handlePersinggahanFieldChange = (
    index: number,
    field: keyof SpdVisumPersinggahanRow,
    value: string
  ) => {
    const list = [...(data.persinggahanList || [])];
    if (list[index]) {
      list[index] = {
        ...list[index],
        [field]: value,
      };
      onUpdateVisumData({
        ...data,
        persinggahanList: list,
      });
    }
  };

  const handleSyncWithSpt = () => {
    const fresh = getEffectiveVisumData(spt);
    onUpdateVisumData({
      ...fresh,
      // Retain custom notes or persinggahan if user had written any
      persinggahanList: data.persinggahanList || fresh.persinggahanList,
      catatanLainLain: data.catatanLainLain || '',
    });
  };

  const handleSyncPejabatAwalFromSpt = () => {
    onUpdateVisumData({
      ...data,
      berangkatKepalaAwal: spt.jabatanPenandatangan || 'Kepala Dinas',
      pejabatNamaAwal: spt.namaPenandatangan || '',
      pejabatPangkatAwal: spt.pangkatPenandatangan || '',
      pejabatNipAwal: spt.nipPenandatangan || '',
    });
  };

  const handleSyncPejabatAkhirFromSpt = () => {
    onUpdateVisumData({
      ...data,
      tibaKepalaAkhir: spt.jabatanPenandatangan || 'Kepala Dinas',
      pejabatNamaAkhir: spt.namaPenandatangan || '',
      pejabatPangkatAkhir: spt.pangkatPenandatangan || '',
      pejabatNipAkhir: spt.nipPenandatangan || '',
    });
  };

  const handleClearPersinggahan = () => {
    const blankRows: SpdVisumPersinggahanRow[] = [
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
    onUpdateVisumData({
      ...data,
      persinggahanList: blankRows,
    });
  };

  const renderVisumZoneContent = (zoneToRender: SpdBelakangEditableZone) => (
    <>
      {/* TAB CONTENT 1: BAGIAN I (KEBERANGKATAN AWAL DARI TEMPAT KEDUDUKAN) */}
      {zoneToRender === 'bagian-1' && (
        <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
            <span className="w-5 h-5 rounded-md bg-sky-700 text-white font-bold text-xs flex items-center justify-center">
              I
            </span>
            <span className="text-xs font-bold text-slate-800">
              Keberangkatan Awal dari Tempat Kedudukan
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="input-visum-berangkat-dari"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Berangkat dari (Tempat Kedudukan)
              </label>
              <input
                id="input-visum-berangkat-dari"
                type="text"
                value={data.berangkatDariAwal}
                onChange={(e) =>
                  handleFieldChange('berangkatDariAwal', e.target.value)
                }
                placeholder="Contoh: Tanjung Selor"
                className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div>
              <label
                htmlFor="input-visum-ke"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Ke (Kota / Daerah Tujuan)
              </label>
              <input
                id="input-visum-ke"
                type="text"
                value={data.berangkatKeAwal}
                onChange={(e) => handleFieldChange('berangkatKeAwal', e.target.value)}
                placeholder="Contoh: Tarakan"
                className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="input-visum-tgl-berangkat"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Pada Tanggal
              </label>
              <input
                id="input-visum-tgl-berangkat"
                type="text"
                value={data.berangkatTglAwal}
                onChange={(e) =>
                  handleFieldChange('berangkatTglAwal', e.target.value)
                }
                placeholder="Contoh: 3 Oktober 2025"
                className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div>
              <label
                htmlFor="input-visum-kepala"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Kepala (Jabatan Pengesah)
              </label>
              <input
                id="input-visum-kepala"
                type="text"
                value={data.berangkatKepalaAwal}
                onChange={(e) =>
                  handleFieldChange('berangkatKepalaAwal', e.target.value)
                }
                placeholder="Contoh: Plt. Kepala Dinas"
                className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Pejabat Penandatangan Keberangkatan Awal
              </span>
              <button
                type="button"
                onClick={handleSyncPejabatAwalFromSpt}
                className="text-[10px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="Tarik data penandatangan dari SPT"
              >
                🔄 Sinkronkan dari SPT
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500">
              Otomatis mengikuti pejabat penandatangan SPT (dapat disunting manual jika ada pendelegasian wewenang).
            </p>

            <div>
              <label
                htmlFor="input-visum-nama-pejabat"
                className="block text-[11px] font-medium text-slate-600 mb-1"
              >
                Nama Pejabat (Lengkap dengan Gelar)
              </label>
              <input
                id="input-visum-nama-pejabat"
                type="text"
                value={data.pejabatNamaAwal}
                onChange={(e) =>
                  handleFieldChange('pejabatNamaAwal', e.target.value)
                }
                placeholder="Contoh: Hasanuddin, S.Pd., M.Si."
                className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="input-visum-pangkat"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Pangkat / Golongan
                </label>
                <input
                  id="input-visum-pangkat"
                  type="text"
                  value={data.pejabatPangkatAwal}
                  onChange={(e) =>
                    handleFieldChange('pejabatPangkatAwal', e.target.value)
                  }
                  placeholder="Contoh: Pembina Tingkat I, IV/b"
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div>
                <label
                  htmlFor="input-visum-nip"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  NIP
                </label>
                <input
                  id="input-visum-nip"
                  type="text"
                  value={data.pejabatNipAwal}
                  onChange={(e) =>
                    handleFieldChange('pejabatNipAwal', e.target.value)
                  }
                  placeholder="Contoh: 197405272007101010"
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: BAGIAN II - V (TEMPAT PERSINGGAHAN / TRANSIT) */}
      {zoneToRender === 'bagian-transit' && (
        <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-md bg-sky-700 text-white font-bold text-xs flex items-center justify-center">
                II-V
              </span>
              <span className="text-xs font-bold text-slate-800">
                Tempat Persinggahan / Singgah (4 Baris)
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearPersinggahan}
              className="text-[11px] font-semibold text-rose-700 hover:text-rose-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3 shrink-0" />
              <span>Kosongkan Semua (Cap Manual)</span>
            </button>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              <strong>Info Blanko SPD:</strong> Sesuai format resmi, baris II s.d
              V sengaja disiapkan dengan ruang kosong bertitik dua (":") untuk
              dicap stempel dan ditandatangani basah oleh pejabat di setiap
              lokasi transit. Anda dapat membiarkannya kosong atau mengisinya jika
              sudah ada rekapan digital.
            </span>
          </div>

          <div className="space-y-4">
            {(data.persinggahanList || []).map((row, idx) => (
              <div
                key={row.id || idx}
                className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900">
                    Baris {row.labelRomawi}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Kiri: Kedatangan | Kanan: Keberangkatan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sisi Kiri: Tiba */}
                  <div className="space-y-1.5 p-2 rounded-lg bg-slate-50/70 border border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Tiba (Sisi Kiri)
                    </span>
                    <div>
                      <label className="block text-[10px] text-slate-500">
                        Tiba di
                      </label>
                      <input
                        type="text"
                        value={row.tibaDi}
                        onChange={(e) =>
                          handlePersinggahanFieldChange(
                            idx,
                            'tibaDi',
                            e.target.value
                          )
                        }
                        placeholder="Contoh: Tarakan"
                        className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">
                        Pada tanggal
                      </label>
                      <input
                        type="text"
                        value={row.tibaTgl}
                        onChange={(e) =>
                          handlePersinggahanFieldChange(
                            idx,
                            'tibaTgl',
                            e.target.value
                          )
                        }
                        placeholder="Contoh: 3 Oktober 2025"
                        className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">
                        Kepala
                      </label>
                      <input
                        type="text"
                        value={row.tibaKepala}
                        onChange={(e) =>
                          handlePersinggahanFieldChange(
                            idx,
                            'tibaKepala',
                            e.target.value
                          )
                        }
                        placeholder="Nama/Jabatan Kepala di Lokasi"
                        className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">
                        NIP
                      </label>
                      <input
                        type="text"
                        value={row.tibaNip}
                        onChange={(e) =>
                          handlePersinggahanFieldChange(
                            idx,
                            'tibaNip',
                            e.target.value
                          )
                        }
                        placeholder="NIP Pengesah"
                        className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Sisi Kanan: Berangkat */}
                  <div className="space-y-1.5 p-2 rounded-lg bg-slate-50/70 border border-slate-200/60">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Berangkat (Sisi Kanan)
                    </span>
                    <div>
                      <label className="block text-[10px] text-slate-500">
                        Berangkat dari
                      </label>
                      <input
                        type="text"
                        value={row.berangkatDari}
                        onChange={(e) =>
                          handlePersinggahanFieldChange(
                            idx,
                            'berangkatDari',
                            e.target.value
                          )
                        }
                        placeholder="Contoh: Tarakan"
                        className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">
                        Ke
                      </label>
                      <input
                        type="text"
                        value={row.berangkatKe}
                        onChange={(e) =>
                          handlePersinggahanFieldChange(
                            idx,
                            'berangkatKe',
                            e.target.value
                          )
                        }
                        placeholder="Contoh: Tanjung Selor"
                        className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">
                        Pada tanggal
                      </label>
                      <input
                        type="text"
                        value={row.berangkatTgl}
                        onChange={(e) =>
                          handlePersinggahanFieldChange(
                            idx,
                            'berangkatTgl',
                            e.target.value
                          )
                        }
                        placeholder="Contoh: 4 Oktober 2025"
                        className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-500">
                          Kepala
                        </label>
                        <input
                          type="text"
                          value={row.berangkatKepala}
                          onChange={(e) =>
                            handlePersinggahanFieldChange(
                              idx,
                              'berangkatKepala',
                              e.target.value
                            )
                          }
                          placeholder="Jabatan"
                          className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500">
                          NIP
                        </label>
                        <input
                          type="text"
                          value={row.berangkatNip}
                          onChange={(e) =>
                            handlePersinggahanFieldChange(
                              idx,
                              'berangkatNip',
                              e.target.value
                            )
                          }
                          placeholder="NIP"
                          className="w-full min-h-[32px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-mono text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: BAGIAN VI (TIBA DI TEMPAT KEDUDUKAN & KETERANGAN PEMERIKSA) */}
      {zoneToRender === 'bagian-6' && (
        <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
            <span className="w-5 h-5 rounded-md bg-sky-700 text-white font-bold text-xs flex items-center justify-center">
              VI
            </span>
            <span className="text-xs font-bold text-slate-800">
              Tiba Kembali di Tempat Kedudukan &amp; Klausul Pemeriksaan
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 block">
                Kolom Kiri: Pengesahan Tiba di Tempat Kedudukan
              </span>
              <button
                type="button"
                onClick={handleSyncPejabatAkhirFromSpt}
                className="text-[10px] font-semibold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 border border-sky-200 px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="Tarik pejabat penandatangan dari SPT"
              >
                🔄 Sinkronkan dari SPT
              </button>
            </div>
            <p className="text-[10.5px] text-slate-500 -mt-1">
              Otomatis sinkron dengan penandatangan SPT (dapat diubah manual jika pengesahan diwakilkan kepada Plh/pejabat lain).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="input-visum-tiba-akhir"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Tiba di (Tempat Kedudukan)
                </label>
                <input
                  id="input-visum-tiba-akhir"
                  type="text"
                  value={data.tibaDiAkhir}
                  onChange={(e) =>
                    handleFieldChange('tibaDiAkhir', e.target.value)
                  }
                  placeholder="Contoh: Tanjung Selor"
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>

              <div>
                <label
                  htmlFor="input-visum-tgl-tiba-akhir"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Pada Tanggal Kembali
                </label>
                <input
                  id="input-visum-tgl-tiba-akhir"
                  type="text"
                  value={data.tibaTglAkhir}
                  onChange={(e) =>
                    handleFieldChange('tibaTglAkhir', e.target.value)
                  }
                  placeholder="Contoh: 4 Oktober 2025"
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="input-visum-kepala-akhir"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Jabatan Pengesah Tiba Kembali
              </label>
              <input
                id="input-visum-kepala-akhir"
                type="text"
                value={data.tibaKepalaAkhir}
                onChange={(e) =>
                  handleFieldChange('tibaKepalaAkhir', e.target.value)
                }
                placeholder="Contoh: Plh. Kepala Dinas"
                className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div>
                <label
                  htmlFor="input-visum-nama-akhir"
                  className="block text-[11px] font-medium text-slate-600 mb-1"
                >
                  Nama Pejabat Penandatangan
                </label>
                <input
                  id="input-visum-nama-akhir"
                  type="text"
                  value={data.pejabatNamaAkhir}
                  onChange={(e) =>
                    handleFieldChange('pejabatNamaAkhir', e.target.value)
                  }
                  placeholder="Contoh: Hasanuddin, S.Pd., M.Si."
                  className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="input-visum-pangkat-akhir"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    Pangkat / Golongan
                  </label>
                  <input
                    id="input-visum-pangkat-akhir"
                    type="text"
                    value={data.pejabatPangkatAkhir}
                    onChange={(e) =>
                      handleFieldChange('pejabatPangkatAkhir', e.target.value)
                    }
                    placeholder="Contoh: Pembina Tingkat I, IV/b"
                    className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="input-visum-nip-akhir"
                    className="block text-[11px] font-medium text-slate-600 mb-1"
                  >
                    NIP
                  </label>
                  <input
                    id="input-visum-nip-akhir"
                    type="text"
                    value={data.pejabatNipAkhir}
                    onChange={(e) =>
                      handleFieldChange('pejabatNipAkhir', e.target.value)
                    }
                    placeholder="Contoh: 197405272007101010"
                    className="w-full min-h-[38px] rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
            <label
              htmlFor="textarea-keterangan-pemeriksa"
              className="block text-xs font-bold text-slate-800"
            >
              Kolom Kanan: Teks Keterangan Pemeriksaan Perjalanan
            </label>
            <textarea
              id="textarea-keterangan-pemeriksa"
              rows={3}
              value={data.keteranganPemeriksa}
              onChange={(e) =>
                handleFieldChange('keteranganPemeriksa', e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: CATATAN (VII) & PERHATIAN (VIII) */}
      {zoneToRender === 'bagian-catatan' && (
        <div className="space-y-3.5 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
            <span className="w-5 h-5 rounded-md bg-sky-700 text-white font-bold text-xs flex items-center justify-center">
              VII-VIII
            </span>
            <span className="text-xs font-bold text-slate-800">
              Catatan Lain-lain &amp; Klausul Perhatian
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
            <label
              htmlFor="textarea-catatan-lain"
              className="block text-xs font-bold text-slate-800"
            >
              VII. Catatan Lain-lain (Opsional)
            </label>
            <textarea
              id="textarea-catatan-lain"
              rows={2}
              value={data.catatanLainLain}
              onChange={(e) =>
                handleFieldChange('catatanLainLain', e.target.value)
              }
              placeholder="Biarkan kosong jika tidak ada catatan tambahan khusus."
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
            <div className="flex items-center justify-between">
              <label
                htmlFor="textarea-teks-perhatian"
                className="block text-xs font-bold text-slate-800"
              >
                VIII. Klausul PERHATIAN (Tanggung Jawab Keuangan Negara)
              </label>
              <button
                type="button"
                onClick={() =>
                  handleFieldChange(
                    'teksPerhatian',
                    'PPTK yang menerbitkan SPD, pegawai yang melakukan perjalanan dinas, para pejabat yang mengesahkan tanggal berangkat/tiba, serta bendahara pengeluaran bertanggung jawab berdasarkan peraturan-peraturan keuangan negara apabila negara menderita rugi akibat kesalahan, kelalaian dan kealpaannya'
                  )
                }
                className="text-[11px] text-sky-700 hover:text-sky-800 underline cursor-pointer"
              >
                Reset Standar
              </button>
            </div>
            <textarea
              id="textarea-teks-perhatian"
              rows={4}
              value={data.teksPerhatian}
              onChange={(e) =>
                handleFieldChange('teksPerhatian', e.target.value)
              }
              className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-600"
            />
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-sky-50/70 border border-sky-200/80 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
          <Stamp className="w-4 h-4 text-sky-700" />
          <span>Formulir SPD Lembar 2 (Visum)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSyncWithSpt}
            title="Tarik data otomatis dari Surat Perintah Tugas (SPT)"
            className="min-h-[30px] px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Tarik dari SPT</span>
          </button>
        </div>
      </div>

      {/* TABS SELECTOR (Only shown when standalone; hidden when parent already renders the unified segmented tab bar) */}
      {!hideInternalTabs && (
        <div
          role="tablist"
          aria-label="Bagian SPD Lembar 2"
          className="grid grid-cols-4 bg-slate-200/75 p-1 gap-1 rounded-2xl text-center"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeZone === 'bagian-1'}
            onClick={() => onSelectZone('bagian-1')}
            className={`h-11 px-1 rounded-xl text-[10.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeZone === 'bagian-1'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="I. Keberangkatan Awal"
          >
            <PlaneTakeoff className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none whitespace-nowrap">I. Berangkat</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeZone === 'bagian-transit'}
            onClick={() => onSelectZone('bagian-transit')}
            className={`h-11 px-1 rounded-xl text-[10.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeZone === 'bagian-transit'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="II - V. Tempat Persinggahan"
          >
            <Route className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none whitespace-nowrap">II-V. Transit</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeZone === 'bagian-6'}
            onClick={() => onSelectZone('bagian-6')}
            className={`h-11 px-1 rounded-xl text-[10.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeZone === 'bagian-6'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="VI. Tiba Kembali & Pemeriksaan"
          >
            <Stamp className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none whitespace-nowrap">VI. Tiba</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeZone === 'bagian-catatan'}
            onClick={() => onSelectZone('bagian-catatan')}
            className={`h-11 px-1 rounded-xl text-[10.5px] font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              activeZone === 'bagian-catatan'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="VII & VIII. Catatan & Perhatian"
          >
            <NotebookPen className="w-3.5 h-3.5 shrink-0" />
            <span className="leading-none whitespace-nowrap">VII. Catatan</span>
          </button>
        </div>
      )}

      {hideInternalTabs ? (
        renderVisumZoneContent(activeZone)
      ) : (
        <NativeSnapPager
          activeTabId={activeZone}
          onTabChange={(next) => onSelectZone(next as SpdBelakangEditableZone)}
          stopPropagation={true}
          tabs={visumZones.map((z) => ({
            id: z,
            content: renderVisumZoneContent(z),
          }))}
        />
      )}
    </div>
  );
};
