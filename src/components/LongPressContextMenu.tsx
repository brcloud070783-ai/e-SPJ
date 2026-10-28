import React from 'react';
import { Printer, Eye, Copy, Trash2, X } from 'lucide-react';
import { triggerHaptic } from '../utils/nativeMobile';

export interface ContextMenuOption {
  id: string;
  label: string;
  icon: React.ElementType;
  isDestructive?: boolean;
  action: () => void;
}

interface LongPressContextMenuProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  options: ContextMenuOption[];
}

export const LongPressContextMenu: React.FC<LongPressContextMenuProps> = ({
  title,
  subtitle,
  isOpen,
  onClose,
  options,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full sm:max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-4 text-white shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-200">
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-2.5 px-1">
          <div>
            <h4 className="text-xs font-black text-sky-400 uppercase tracking-wider">Aksi Cepat Document</h4>
            <div className="text-sm font-extrabold text-slate-100 mt-0.5 truncate max-w-[240px]">{title}</div>
            {subtitle && <div className="text-[11px] text-slate-400 truncate max-w-[240px]">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800/80 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  triggerHaptic(opt.isDestructive ? 'heavy' : 'medium');
                  onClose();
                  opt.action();
                }}
                className={`w-full py-3 px-3.5 rounded-xl font-bold text-xs flex items-center gap-3 transition-colors cursor-pointer select-none ${
                  opt.isDestructive
                    ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${opt.isDestructive ? 'text-rose-400' : 'text-sky-400'}`} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold text-xs cursor-pointer transition-colors"
        >
          Batal
        </button>
      </div>
    </div>
  );
};
