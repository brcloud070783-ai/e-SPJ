# UI Cleanup & Text Reduction: Clean Cards & Single CTA Overhaul

Streamline the Main Dashboard (`MainHomeSection`) and SPJ Document List (`SpjPerjalananSubHome`) to eliminate visual clutter and text-heavy density, replacing lengthy instructions with clean color-coded badges, minimalist progress indicators, progressive disclosure accordions for long bureaucratic reference numbers, and single prominent Call-to-Action (CTA) buttons in a Canva Light Workspace aesthetic.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following user preferences were confirmed during Phase 1 clarification:
> - **Long Reference Number Handling**: Full bureaucratic SPT reference numbers will be tucked inside a clean, expandable accordion on tap, keeping the default card view focused strictly on essential data (Pelaksana, Tujuan, Total Biaya).
> - **Primary CTA Button**: Each SPJ card will feature a single, high-contrast, prominent Call-to-Action button labeled **"Buka SPJ"**.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the information density of the SPJ dashboard from verbose administrative prose into an executive, glanceable dashboard. Users can inspect status, destination, and financial totals in under 1 second without visual fatigue.
- **Target Audience / Persona**: Provincial government administrators and staff processing SPJ travel expense dossiers on mobile and desktop who need rapid, friction-free document verification and printing.
- **Key Value**: Drastically reduced cognitive load through instant visual chunking, spacious breathing room (whitespace), and direct single-action pathways.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Dashboard Glance**: User opens the app and sees the "SAPA Kaltara" brand header, clean executive summary stats (Berkas, Foto, Selisih), and the active SPJ card with high-contrast primary CTA "Buka SPJ".
2. **Progressive Disclosure**: When viewing any SPJ card in the list or dashboard, secondary details (full SPT number, NIP, detailed period breakdown) remain quietly collapsed. Tapping the card or chevron unfolds a sleek accordion displaying the full reference numbers and metadata.
3. **Action List (Perlu Tindakan)**: If expense receipts or photo documentations are pending, cards present a clean color badge (e.g. amber badge "Belum Lengkap" or green badge "Siap Cetak") with a single high-contrast action button (e.g. "Lengkapi Bukti") rather than multi-sentence warning paragraphs.

### Visual Identity & Theme
- **Aesthetic Direction**: Canva Light Workspace — airy, breathable, crisp white elevated cards on a soft neutral `bg-slate-100` canvas.
- **Color Palette & Discipline (60-30-10)**:
  - *60% Neutral Canvas*: `#F1F5F9` (slate-100) page background.
  - *30% Structural Surfaces*: Pure white (`#FFFFFF`) cards with subtle hairline borders (`border-slate-200/90`) and gentle ambient drop shadows (`shadow-sm` / `shadow-xs`).
  - *10% Action Accent*: Deep cobalt/sky (`#0369A1` / `bg-sky-700`) for primary interactive CTAs, paired with semantic status greens (`#15803D`) and ambers (`#B45309`).
- **Typography & Hierarchy**:
  - Primary text: Bold names and destinations in display sans (`font-extrabold text-slate-900`).
  - Financial figures: High-contrast monospace figures with tabular alignment (`font-mono font-extrabold tabular-nums`).
  - Metadata: Quiet unboxed inline text with typographic separators (`·`). Zero pill-badge sandwiches.
- **Progressive Disclosure & Touch Targets**:
  - Touch targets $\ge 42\text{px}$ for comfortable thumb navigation on mobile devices.
  - Smooth 150ms expand/collapse animations for detail accordions.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Accordion vs. Modal for Long Reference Numbers**
  - *Chosen Approach*: In-place expandable accordion on the card itself.
  - *Why*: Keeps context immediately visible without context switching or modal backdrops.
  - *Alternatives Considered*: Modal dialog was rejected as it interrupts rapid scanning.
- **Decision 2: Single Primary CTA per Card**
  - *Chosen Approach*: Highlight a single dominant action button ("Buka SPJ") per card. Secondary actions (e.g., delete, archive) are relegated to quiet overflow or swipe menus.
  - *Why*: Eliminates decision fatigue and satisfies the "Single CTA" design constitution.
- **Decision 3: Elimination of Verbose Explanatory Text Blocks**
  - *Chosen Approach*: Remove descriptive guidance paragraphs (such as "Menampilkan maksimal 3 berkas SPJ yang masih menunggu kelengkapan nota/tiket...") and replace with concise badges and progress bars.
  - *Why*: Once users understand the application, explanatory text blocks become visual clutter that crowds out real data.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   App State Store                       │
│    (kuitansiList, activeKuitansi, expenses, photos)    │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│     MainHomeSection     │ │   SpjPerjalananSubHome  │
│  - Hero Brand Zone      │ │  - Period Filter Tabs   │
│  - Executive Stat Grid  │ │  - Clean SPJ Card List  │
│  - Active SPJ Card      │ │    • Compact Scannable  │
│    (Single CTA "Buka")  │ │    • Accordion Details  │
│  - Action Needed List   │ │    • Single CTA "Buka"  │
└─────────────────────────┘ └─────────────────────────┘
```

### Component & State Mapping
- `MainHomeSection.tsx`:
  - Streamline Executive Summary Grid: remove redundant helper paragraphs; enforce tabular numbers.
  - Re-architect "SPJ Terakhir Diedit": display Pelaksana, Tujuan, and Total Biaya prominently; hide lengthy SPT number inside an expandable micro-accordion; feature a single prominent CTA button ("Buka SPJ").
  - Clean up Action List: convert text alerts into clean status badges and single action buttons.
- `SpjPerjalananSubHome.tsx`:
  - Enhance Mobile Card List: integrate `expandedCardIds` state with clean chevron toggles.
  - Apply Canva Light Workspace styling with generous whitespace (`p-4 sm:p-5 rounded-2xl`).
