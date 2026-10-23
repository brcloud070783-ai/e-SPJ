# Implementation Plan - Redesigning Documentation Section & A4/F4 Print Layout

## User Feedback & Requirements
- **Issue**: Current documentation layout and print sheet for A4/F4 are cluttered and unpolished ("kacau... rusak").
- **Solution**: Redesign the documentation list, upload form, and print view into a **Minimalist Table Format** with photo and description side-by-side, ensuring perfect print formatting for A4 and F4 paper without overflow.

## Recent Adjustments
- **Upload Modal Cleanup**: Removed redundant fields (*Tautkan ke Entri SPJ*, *Jenis Unggahan*, dan *Uraian / Keterangan Dokumentasi*) from the upload modal so the user can quickly pick photos with automatic linking and labeling.
- **Kop Surat Halaman 1 Saja**: Added official Kop Surat Dinas (Pemerintah Provinsi Kalimantan Utara + Lambang Daerah + Dinas Pendidikan dan Kebudayaan) exclusively on Page 1 of the print sheet (`pageIdx === 0`). Pages 2 and beyond omit the letterhead, displaying only a subtle page continuation label to maximize print area for photos without redundancy.

## Verification
- `tsc --noEmit` passed with no errors.
- `compile_applet` passed successfully.
