import React from 'react';
import { SpjSubSectionKey } from './SpjPerjalananSubHome';

export interface StudioStepMeta {
  key: SpjSubSectionKey;
  stepNum: number;
  label: string;
  fullLabel: string;
}

export const STUDIO_SPJ_STEPS: StudioStepMeta[] = [
  {
    key: 'spt',
    stepNum: 1,
    label: 'SPT',
    fullLabel: 'Surat Perintah Tugas',
  },
  {
    key: 'spd',
    stepNum: 2,
    label: 'SPD',
    fullLabel: 'Surat Perjalanan Dinas',
  },
  {
    key: 'visum',
    stepNum: 3,
    label: 'Visum',
    fullLabel: 'Visum SPD Belakang',
  },
  {
    key: 'kuitansi',
    stepNum: 4,
    label: 'Kuitansi',
    fullLabel: 'Kuitansi Perjalanan Dinas',
  },
  {
    key: 'dokumentasi',
    stepNum: 5,
    label: 'Dokumentasi',
    fullLabel: 'Dokumentasi Kegiatan',
  },
  {
    key: 'pengeluaran',
    stepNum: 6,
    label: 'Pengeluaran',
    fullLabel: 'Bukti Pengeluaran',
  },
];

export interface StudioSwipeProgressBarProps {
  activeStepKey: SpjSubSectionKey;
  scrollProgress?: number;
  onSelectStep?: (stepKey: SpjSubSectionKey) => void;
  variant?: 'appbar' | 'editor-header';
  className?: string;
}

export const StudioSwipeProgressBar: React.FC<StudioSwipeProgressBarProps> = () => {
  return null;
};

export interface FormSubTabProgressBarProps {
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
  onSelectTab?: (key: string) => void;
  className?: string;
}

export const FormSubTabProgressBar: React.FC<FormSubTabProgressBarProps> = () => {
  return null;
};
