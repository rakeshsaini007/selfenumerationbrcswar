import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { AlertDialogState } from '../types/school';

interface AlertBannerModalProps {
  alert: AlertDialogState;
  onClose: () => void;
}

export function AlertBannerModal({ alert, onClose }: AlertBannerModalProps) {
  useEffect(() => {
    if (!alert.open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alert.open, onClose]);

  if (!alert.open) return null;

  const isSuccess = alert.type === 'success';
  const isError = alert.type === 'error';

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
        <div className="p-5 flex items-start gap-4">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              isSuccess
                ? 'bg-emerald-50 text-emerald-700'
                : isError
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-blue-50 text-blue-700'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isError ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <Info className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 id="alert-dialog-title" className="text-base font-semibold text-slate-900">
              {alert.title}
            </h3>
            <p id="alert-dialog-desc" className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              {alert.message}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="बंद करें"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center -mr-2 -mt-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className={`w-full sm:w-auto min-h-[44px] px-5 py-2 text-sm font-medium text-white rounded-xl sm:rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              isSuccess
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : isError
                  ? 'bg-rose-700 hover:bg-rose-800'
                  : 'bg-blue-700 hover:bg-blue-800'
            }`}
          >
            ठीक है (OK)
          </button>
        </div>
      </div>
    </div>
  );
}
