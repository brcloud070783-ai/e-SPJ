import React from 'react';
import {
  ClipboardList,
  FileText,
  Camera,
  Receipt,
  MapPin,
  Calendar,
  User,
} from 'lucide-react';
import {
  KuitansiPerjalananDinas,
  DokumentasiPengeluaranItem,
} from '../types/spj';
import { calculateKuitansiTotal, formatRupiah } from '../utils/spjCalculations';
import {
  LabeledIcon,
  InfoTooltip,
  UnifiedMediaCard,
  EmptyStateCard,
} from './UiPatterns';

interface LaporanPlaceholderSectionProps {
  activeKuitansi: KuitansiPerjalananDinas;
  docKegiatanCount: number;
  docPengeluaranList: DokumentasiPengeluaranItem[];
}

export const LaporanPlaceholderSection: React.FC<LaporanPlaceholderSectionProps> = ({
  activeKuitansi,
  docKegiatanCount,
  docPengeluaranList,
}) => {
  const totalKuitansi = calculateKuitansiTotal(activeKuitansi.rincian);
  const totalBukti = docPengeluaranList.reduce((acc, item) => acc + item.nominal, 0);

  return (
    <div className="space-y-6">
      {/* Header menggunakan LabeledIcon + InfoTooltip */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <LabeledIcon
          icon={ClipboardList}
          iconBgClass="bg-indigo-700 text-white"
          label="4. Laporan Perjalanan Dinas"
          microcopy="Ringkasan kesiapan berkas dari Kuitansi, Dokumentasi Kegiatan, dan Bukti Pengeluaran yang terhubung pada SPT ini."
          tooltipVariant="info"
          tooltipTitle="Integrasi Data Laporan"
          tooltipContent="Seluruh metadata di bawah ini ditarik secara otomatis dari isian Kuitansi SPPD, Galeri Dokumentasi, dan Bukti Pengeluaran aktif."
        />

        <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
          <span>Dasar SPT:</span>
          <strong className="font-mono text-slate-900">{activeKuitansi.noSpt}</strong>
          <InfoTooltip
            variant="question"
            align="right"
            title="Nomor Surat Perintah Tugas"
            content="Nomor SPT diatur pada modul 1. Kuitansi dan menjadi kunci penghubung seluruh berkas perjalanan dinas."
          />
        </div>
      </div>

      {/* 3 Unified Card Components untuk Kesiapan Data Laporan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <UnifiedMediaCard
          symbolIcon={FileText}
          symbolBgClass="bg-sky-700 text-white"
          metadataItems={['Sumber: 1. Kuitansi', `TA ${activeKuitansi.tahunAnggaran}`]}
          statusText="Tersedia"
          title="Data Kuitansi & SPT"
          subtitle={activeKuitansi.atasNama}
          highlightValue={formatRupiah(totalKuitansi)}
          description={activeKuitansi.untukPengeluaran}
          detailRows={[
            {
              icon: MapPin,
              text: `Tujuan: ${activeKuitansi.tujuan}`,
            },
            {
              icon: Calendar,
              text: `Tanggal: ${activeKuitansi.tanggalPerjalanan}`,
            },
          ]}
        />

        <UnifiedMediaCard
          symbolIcon={Camera}
          symbolBgClass="bg-emerald-700 text-white"
          metadataItems={['Sumber: 2. Dokumentasi', `SPT ${activeKuitansi.noSpt}`]}
          statusText={docKegiatanCount > 0 ? 'Tersedia' : 'Belum Ada'}
          title="Dokumentasi Kegiatan"
          subtitle="Lampiran Visual Pelaksanaan"
          highlightValue={`${docKegiatanCount} Berkas Kegiatan`}
          description="Foto kegiatan lapangan dan dokumen pendukung yang siap dilampirkan pada Bab Hasil Pelaksanaan."
          detailRows={[
            {
              icon: User,
              text: `Pelaksana: ${activeKuitansi.atasNama}`,
            },
          ]}
        />

        <UnifiedMediaCard
          symbolIcon={Receipt}
          symbolBgClass="bg-amber-600 text-white"
          metadataItems={['Sumber: 3. Bukti Pengeluaran', `${docPengeluaranList.length} Nota`]}
          statusText={docPengeluaranList.length > 0 ? 'Tercatatkan' : 'Kosong'}
          title="Rekap Bukti Pengeluaran"
          subtitle="Tiket, Hotel & Kwitansi Riil"
          highlightValue={formatRupiah(totalBukti)}
          description="Rekapitulasi bukti pengeluaran riil yang telah diunggah dan direkonsiliasi terhadap nilai kuitansi."
          detailRows={[
            {
              icon: FileText,
              text: `${activeKuitansi.rincian.length} komponen rincian di kuitansi`,
            },
          ]}
        />
      </div>

      {/* Empty State / Illustration Card untuk Naskah Laporan */}
      <EmptyStateCard
        variant="laporan"
        title="Struktur Naskah Laporan Perjalanan Dinas Siap Disusun"
        description="Bab I Pendahuluan (Dasar SPT & Maksud Tujuan), Bab II Pelaksanaan Kegiatan, Bab III Hasil yang Dicapai, serta Bab IV Penutup telah terhubung dengan metadata SPJ aktif."
        secondaryHint={`Pejabat Penandatangan: ${activeKuitansi.namaPenggunaAnggaran} · Pelaksana: ${activeKuitansi.atasNama}`}
      />
    </div>
  );
};
