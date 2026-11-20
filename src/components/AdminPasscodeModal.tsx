import { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react';
import { verifyAdminPasscode } from '../services/appsScriptApi';

interface AdminPasscodeModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: (adminKey: string, spreadsheetUrl?: string) => void;
}

export function AdminPasscodeModal({
  open,
  onClose,
  onVerified,
}: AdminPasscodeModalProps) {
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setPasscode('');
      setShowPasscode(false);
      setError('');
      setVerifying(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !verifying) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, verifying, onClose]);

  if (!open) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcode.trim();
    if (!trimmed) {
      setError('कृपया Admin Passcode दर्ज करें।');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      const result = await verifyAdminPasscode(trimmed);
      onVerified(trimmed, result.spreadsheetUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'एडमिन सत्यापन विफल रहा। कृपया सही पासकोड दर्ज करें।'
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-verify-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget && !verifying) onClose();
      }}
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="admin-verify-title" className="text-base font-bold text-slate-900">
                एडमिन सत्यापन (Admin Only)
              </h2>
              <p className="text-xs text-slate-500">
                केवल ऐप डेवलपर / एडमिन के लिए
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={verifying}
            aria-label="बंद करें"
            className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-5 space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Google Sheet देखने की सुविधा केवल <strong className="text-slate-900">एडमिन (App Developer)</strong> के लिए प्रतिबंधित है। आगे बढ़ने के लिए Admin Passcode दर्ज करें।
          </p>

          <div>
            <label
              htmlFor="admin-passcode-input"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Admin Passcode <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <input
                id="admin-passcode-input"
                type={showPasscode ? 'text' : 'password'}
                autoFocus
                autoComplete="current-password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError('');
                }}
                disabled={verifying}
                placeholder="Admin Passcode दर्ज करें"
                className="w-full min-h-[44px] pl-3.5 pr-11 py-2.5 text-base sm:text-sm font-mono-code bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 disabled:bg-slate-100"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((prev) => !prev)}
                aria-label={showPasscode ? 'पासकोड छिपाएं' : 'पासकोड दिखाएं'}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer"
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="mt-2 text-xs font-medium text-rose-700">{error}</p>}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={verifying}
              className="min-h-[44px] px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 cursor-pointer"
            >
              रद्द करें
            </button>
            <button
              type="submit"
              disabled={verifying || !passcode.trim()}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>सत्यापित हो रहा है...</span>
                </>
              ) : (
                <span>सत्यापित करें और Sheet खोलें</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
