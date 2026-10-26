# Implementation Plan - Rebranding App to SAPA Kaltara

Rename the application from "e-SPJ Kaltara" to **SAPA Kaltara** (Sistem Administrasi Perjalanan & Anggaran), a modern, memorable, and professional standalone administrative acronym.

## Proposed Name
- **Name**: SAPA Kaltara
- **Full Meaning**: Sistem Administrasi Perjalanan & Anggaran
- **Vibe**: Modern administrative acronym, friendly yet professional, easy to remember and pronounce.

## Proposed Changes

### 1. Configuration & Metadata (`metadata.json`)
- Update `name` to `SAPA Kaltara`
- Update `description` to reflect "Sistem Administrasi Perjalanan & Anggaran Kaltara"

### 2. HTML Entry Point (`index.html`)
- Update `<title>` to `SAPA Kaltara — Sistem Administrasi Perjalanan & Anggaran`
- Update OpenGraph tags (`og:title`, `og:description`)

### 3. Application Shell & UI (`src/App.tsx`, `src/components/MainHomeSection.tsx`)
- Replace branding title `"e-SPJ Kaltara"` across navigation headers, titles, and export headers with `"SAPA Kaltara"`.

### 4. Verification
- Run `compile_applet` and `lint_applet` to ensure zero compilation or type errors.
