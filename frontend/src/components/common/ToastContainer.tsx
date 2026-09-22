'use client';

import { useEffect } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  X 
} from 'lucide-react';
import useIndraStore, { type ToastNotification } from '@/store/indra-store';

function ToastItem({ toast, onRemove }: { toast: ToastNotification; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 6500);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const icons = {
    error: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-sky-600 dark:text-sky-400 flex-shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />,
  };

  const bgStyles = {
    error: 'bg-rose-50/95 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900/60 text-rose-950 dark:text-rose-100',
    warning: 'bg-amber-50/95 dark:bg-amber-950/90 border-amber-200 dark:border-amber-900/60 text-amber-950 dark:text-amber-100',
    info: 'bg-sky-50/95 dark:bg-sky-950/90 border-sky-200 dark:border-sky-900/60 text-sky-950 dark:text-sky-100',
    success: 'bg-emerald-50/95 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-800/60 text-emerald-950 dark:text-emerald-100',
  };

  return (
    <div className={`w-88 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md flex items-start gap-3 text-xs font-mono transition-all animate-in fade-in slide-in-from-bottom-3 duration-200 ${bgStyles[toast.type]}`}>
      <div className="mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="font-bold flex items-center justify-between">
          <span className="truncate">{toast.title}</span>
        </div>
        <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed break-words font-sans">
          {toast.message}
        </p>
        {toast.actionLabel && toast.onAction && (
          <button
            onClick={() => {
              toast.onAction?.();
              onRemove(toast.id);
            }}
            className="mt-2 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-black/60 border border-current font-bold text-[10px] transition-colors cursor-pointer"
          >
            {toast.actionLabel}
          </button>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 opacity-60 hover:opacity-100 transition-opacity rounded hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useIndraStore();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}
