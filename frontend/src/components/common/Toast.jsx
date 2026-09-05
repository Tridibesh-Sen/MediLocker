import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div className="fixed top-16 right-4 z-50 max-w-sm w-full animate-in fade-in slide-in-from-top-4 duration-200">
      <div className={`p-4 rounded-xl shadow-xl border flex items-start gap-3 ${
        isSuccess
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : isError
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : 'bg-sky-50 border-sky-200 text-sky-900'
      }`}>
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />}
        {isError && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />}
        {!isSuccess && !isError && <Info className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />}

        <div className="flex-1 text-sm">
          {toast.title && <div className="font-bold">{toast.title}</div>}
          <div className="mt-0.5 leading-snug">{toast.message}</div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
