import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Gunakan POST.',
    });
  }

  try {
    const {
      noSpt,
      yangMenugaskan,
      maksudPerjalanan,
      tujuanPerjalanan,
      tanggalPelaksanaan,
      namaPelaksana,
      catatanRingkas,
      instruksiRevisi,
      currentDraft,
    } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: 'GEMINI_API_KEY belum dikonfigurasi di environment server Vercel.',
      });
    }

    const isRevision = Boolean(instruksiRevisi && String(instruksiRevisi).trim().length > 0);

    const systemInstruction = `Anda adalah staf perumus naskah dinas resmi di lingkungan Dinas Pendidikan dan Kebudayaan Pemerintah Provinsi Kalimantan Utara (Pemprov Kaltara).
Tugas Anda adalah menyusun narasi formal Laporan Perjalanan Dinas sesuai format baku naskah dinas pemerintah.
Khusus Bab 6. Pelaksanaan Kegiatan, Anda WAJIB menyusun narasi yang hierarkis, sistematis, kronologis, dan berjenjang dengan format penomoran:
1) Nama Tahap/Agenda
   (narasi penjelasan singkat)
2) Nama Kegiatan/Kunjungan Kerja ke ...
   a. Narasi butir sub-kegiatan pertama...
   b. Narasi butir sub-kegiatan kedua...
   c. Narasi butir sub-kegiatan ketiga...
3) Penyesuaian Agenda / Kegiatan Tambahan (jika relevan)

Gunakan bahasa birokrasi pemerintahan Indonesia yang sopan, presisi, objektif, dan baku (PUEBI).
Juga rumuskan/revisi narasi untuk Bab 7 (Hasil yang dicapai) dengan poin 1), 2), dst., Bab 8 (Kesimpulan Dan Saran) dengan 1) Kesimpulan dan 2) Saran: a., b., serta Bab 9 (PENUTUP) berupa satu paragraf resmi penutup pertanggungjawaban dinas.

Keluarkan respon HANYA dalam format JSON valid tanpa tanda kutip markdown (\`\`\`json) atau teks pengantar lainnya, dengan struktur:
{
  "pelaksanaanKegiatan": "string narasi lengkap Bab 6",
  "hasilYangDicapai": "string narasi lengkap Bab 7",
  "kesimpulanDanSaran": "string narasi lengkap Bab 8",
  "penutup": "string kalimat penutup Bab 9"
}`;

    let promptText = '';
    if (isRevision) {
      promptText = `TUGAS: REVISI DAN SEMPURNAKAN DRAFT LAPORAN PERJALANAN DINAS BERDASARKAN INSTRUKSI PENGGUNA.

DATA DASAR SURAT TUGAS:
- Nomor Surat Tugas: ${noSpt || '-'}
- Yang Menugaskan: ${yangMenugaskan || '-'}
- Maksud Perjalanan Dinas: ${maksudPerjalanan || '-'}
- Tujuan Perjalanan Dinas: ${tujuanPerjalanan || '-'}
- Tanggal Pelaksanaan: ${tanggalPelaksanaan || '-'}
- Pelaksana Perjalanan: ${namaPelaksana || '-'}

DRAFT SAAT INI YANG HENDAK DIREVISI:
[Bab 6 Pelaksanaan Kegiatan]:
${currentDraft?.pelaksanaanKegiatan || '-'}

[Bab 7 Hasil yang Dicapai]:
${currentDraft?.hasilYangDicapai || '-'}

[Bab 8 Kesimpulan Dan Saran]:
${currentDraft?.kesimpulanDanSaran || '-'}

[Bab 9 Penutup]:
${currentDraft?.penutup || '-'}

INSTRUKSI REVISI / PERBAIKAN DARI PENGGUNA:
"${String(instruksiRevisi).trim()}"
${catatanRingkas ? `Catatan Lapangan Tambahan: ${catatanRingkas}` : ''}

PETUNJUK REVISI:
1. Perbaiki dan sesuaikan Bab 6, 7, 8, dan 9 secara cermat sesuai instruksi revisi di atas.
2. Pertahankan keakuratan data perjalanan dinas dan struktur hierarkis resmi Pemprov Kaltara (1), 2), a., b., c., dst.).
3. Hasilkan respon JSON valid dengan narasi hasil revisi yang telah disempurnakan.`;
    } else {
      promptText = `Berikut data Surat Perintah Tugas (SPT) dan catatan ringkas pelaksanaan kegiatan:
- Nomor Surat Tugas: ${noSpt || '-'}
- Yang Menugaskan: ${yangMenugaskan || '-'}
- Maksud Perjalanan Dinas: ${maksudPerjalanan || '-'}
- Tujuan Perjalanan Dinas: ${tujuanPerjalanan || '-'}
- Tanggal Pelaksanaan: ${tanggalPelaksanaan || '-'}
- Pelaksana Perjalanan: ${namaPelaksana || '-'}
- Catatan / Poin-Poin Ringkas Kegiatan Lapangan dari Pelaksana:
${catatanRingkas || 'Melakukan koordinasi, peninjauan sarana prasarana sekolah, verifikasi data pendukung, serta rapat evaluasi tindak lanjut.'}

Buatkan narasi resmi Bab 6 Pelaksanaan Kegiatan secara bertingkat dan rinci, Bab 7 Hasil yang Dicapai, serta Bab 8 Kesimpulan dan Saran.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const textOutput = response.text || '';
    let parsedData;
    try {
      parsedData = JSON.parse(textOutput);
    } catch {
      const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    return res.status(200).json({
      success: true,
      isRevision,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error generating laporan with Gemini on Vercel:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Gagal menghasilkan narasi laporan perjalanan dinas dengan AI.',
    });
  }
}
