import { useState } from 'react';
import { Check, ExternalLink, X } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_URL } from '../config/appsScriptConfig';
import {
  getActiveAppsScriptUrl,
  isUsingHardcodedUrl,
  isValidAppsScriptUrl,
  setTemporaryAppsScriptUrl,
} from '../services/appsScriptApi';

interface SetupGuideModalProps {
  open: boolean;
  onClose: () => void;
  onUrlUpdated: () => void;
}

export function SetupGuideModal({ open, onClose, onUrlUpdated }: SetupGuideModalProps) {
  const [tempUrl, setTempUrl] = useState(() => getActiveAppsScriptUrl());
  const [savedNotice, setSavedNotice] = useState(false);
  const [urlError, setUrlError] = useState('');

  if (!open) return null;

  const hardcoded = isUsingHardcodedUrl();

  const handleSaveTemp = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempUrl.trim();
    if (!trimmed) {
      setTemporaryAppsScriptUrl('');
      setUrlError('');
      setSavedNotice(true);
      onUrlUpdated();
      setTimeout(() => setSavedNotice(false), 2000);
      return;
    }
    if (!isValidAppsScriptUrl(trimmed)) {
      setUrlError(
        'कृपया मान्य Google Apps Script Web App URL दर्ज करें (https://script.google.com/... से शुरू)।'
      );
      return;
    }
    setUrlError('');
    setTemporaryAppsScriptUrl(trimmed);
    setSavedNotice(true);
    onUrlUpdated();
    setTimeout(() => setSavedNotice(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
    >
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 id="setup-modal-title" className="text-base font-semibold text-slate-900">
              Google Apps Script और Vercel सेटअप निर्देश
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              शीट: School_List एवं Data · बैकएंड फ़ाइल: code.js
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="बंद करें"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              1. Google Apps Script Deploy (code.js)
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 text-xs leading-relaxed text-slate-600">
              <li>
                अपनी Google Spreadsheet खोलें जिसमें <strong className="text-slate-900">School_List</strong> और{' '}
                <strong className="text-slate-900">Data</strong> नाम की दो शीट हैं।
              </li>
              <li>
                मेनू में <strong className="text-slate-900">Extensions → Apps Script</strong> खोलें और प्रोजेक्ट के रूट की{' '}
                <code className="font-mono-code bg-white px-1.5 py-0.5 border border-slate-200 rounded text-slate-900">
                  code.js
                </code>{' '}
                फ़ाइल का पूरा कोड पेस्ट करके Save करें।
              </li>
              <li>
                <strong className="text-slate-900">Deploy → New deployment → Web app</strong> चुनें।
                <br />
                Execute as: <strong className="text-slate-900">Me</strong> · Who has access:{' '}
                <strong className="text-slate-900">Anyone</strong> रखें और Deploy करके Web App URL कॉपी करें।
              </li>
            </ol>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <h3 className="font-semibold text-slate-900 text-sm">
              2. Vercel होस्टिंग के लिए URL Hardcode फ़ाइल
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              केवल इस एक फ़ाइल में अपना Web App URL डालें:
            </p>
            <div className="px-3 py-2 bg-white border border-slate-200 rounded-md font-mono-code text-xs text-slate-900">
              src/config/appsScriptConfig.ts
            </div>
            <p className="text-xs text-slate-600">
              वर्तमान मान:{' '}
              <span className="font-mono-code text-slate-900 break-all">
                {hardcoded ? GOOGLE_APPS_SCRIPT_URL : 'अभी URL दर्ज नहीं है (Placeholder)'}
              </span>
            </p>
          </div>

          {!hardcoded && (
            <form
              onSubmit={handleSaveTemp}
              className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 space-y-3"
            >
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  3. प्रीव्यू टेस्टिंग के लिए अस्थायी URL (वैकल्पिक)
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  जब तक आप{' '}
                  <code className="font-mono-code">src/config/appsScriptConfig.ts</code> संपादित नहीं करते, तब तक आप यहाँ URL डालकर सीधे टेस्ट कर सकते हैं।
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={tempUrl}
                  onChange={(e) => setTempUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3 py-2 text-xs font-mono-code bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-blue-600"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-lg hover:bg-blue-800 whitespace-nowrap cursor-pointer"
                >
                  {savedNotice ? <Check className="w-3.5 h-3.5" /> : <ExternalLink className="w-3.5 h-3.5" />}
                  <span>{savedNotice ? 'सहेजा गया' : 'लागू करें'}</span>
                </button>
              </div>
              {urlError && <p className="text-xs text-rose-700">{urlError}</p>}
            </form>
          )}
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
}
