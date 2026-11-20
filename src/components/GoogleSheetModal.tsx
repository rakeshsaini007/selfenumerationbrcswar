import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { AdminUnauthorizedError, fetchGoogleSheetData } from '../services/appsScriptApi';
import type { GoogleSheetViewResponse } from '../types/school';

interface GoogleSheetModalProps {
  open: boolean;
  adminKey: string;
  onClose: () => void;
  onUnauthorized: () => void;
  onLockAdmin: () => void;
  onSheetUrlResolved?: (url: string) => void;
}

type SheetTab = 'Data' | 'School_List';
const PAGE_SIZE = 25;

export function GoogleSheetModal({
  open,
  adminKey,
  onClose,
  onUnauthorized,
  onLockAdmin,
  onSheetUrlResolved,
}: GoogleSheetModalProps) {
  const [activeSheet, setActiveSheet] = useState<SheetTab>('Data');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sheetData, setSheetData] = useState<GoogleSheetViewResponse | null>(null);

  const scrollBodyRef = useRef<HTMLDivElement | null>(null);

  const loadSheet = useCallback(
    async (tab: SheetTab) => {
      if (!adminKey) {
        onUnauthorized();
        return;
      }
      setLoading(true);
      setError('');
      try {
        const data = await fetchGoogleSheetData(tab, adminKey);
        setSheetData(data);
        setCurrentPage(1);
        const resolved = data.spreadsheetUrl || data.sheetUrl;
        if (resolved && onSheetUrlResolved) {
          onSheetUrlResolved(resolved);
        }
      } catch (err) {
        setSheetData(null);
        if (err instanceof AdminUnauthorizedError) {
          onUnauthorized();
          return;
        }
        setError(
          err instanceof Error ? err.message : 'Google Sheet डेटा लोड करने में त्रुटि हुई।'
        );
      } finally {
        setLoading(false);
      }
    },
    [adminKey, onUnauthorized, onSheetUrlResolved]
  );

  useEffect(() => {
    if (!open) return;
    void loadSheet(activeSheet);
  }, [open, activeSheet, loadSheet]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const filteredRows = useMemo(() => {
    if (!sheetData?.rows) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sheetData.rows;
    return sheetData.rows.filter((row) =>
      row.some((cell) => String(cell || '').toLowerCase().includes(q))
    );
  }, [sheetData, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, safePage]);

  const scrollHorizontally = (delta: number) => {
    if (!scrollBodyRef.current) return;
    scrollBodyRef.current.scrollBy({ left: delta, behavior: 'smooth' });
  };

  if (!open) return null;

  const headers = sheetData?.headers || [];
  const totalRows = sheetData?.rows?.length || 0;
  const navigateSheetUrl = sheetData?.sheetUrl || sheetData?.spreadsheetUrl || '';
  const startRowNumber = filteredRows.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endRowNumber = Math.min(safePage * PAGE_SIZE, filteredRows.length);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="google-sheet-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/55 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-6xl bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden h-[92vh] sm:h-[88vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="google-sheet-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 truncate"
              >
                Google Sheet डेटा व्यूअर
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {sheetData?.spreadsheetName
                  ? `${sheetData.spreadsheetName} · शीट: ${activeSheet}`
                  : `शीट: ${activeSheet}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {navigateSheetUrl && (
              <a
                href={navigateSheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 sm:px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 transition-colors whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Sheet पर जाएं</span>
                <span className="sm:hidden">Sheet पर जाएं</span>
              </a>
            )}
            <button
              type="button"
              onClick={onLockAdmin}
              title="एडमिन सत्र लॉक करें"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">लॉक करें</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="बंद करें"
              className="inline-flex items-center justify-center min-h-[40px] min-w-[40px] rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Sheet Switcher, Search, Column Scroll & Refresh */}
        <div className="px-4 py-3 sm:px-6 bg-slate-50/80 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
                setActiveSheet('Data');
              }}
              className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeSheet === 'Data'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Data शीट
            </button>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setCurrentPage(1);
                setActiveSheet('School_List');
              }}
              className={`min-h-[40px] px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg border transition-colors cursor-pointer ${
                activeSheet === 'School_List'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              School_List शीट
            </button>

            {!loading && sheetData && (
              <span className="ml-1 text-xs font-mono-code text-slate-600 whitespace-nowrap">
                {searchQuery.trim()
                  ? `${filteredRows.length} / ${totalRows} पंक्तियाँ`
                  : `कुल ${totalRows} पंक्तियाँ`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="UDISE, विद्यालय, कार्मिक या न्याय पंचायत खोजें..."
                className="w-full min-h-[40px] pl-9 pr-3 py-1.5 text-base sm:text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => scrollHorizontally(-320)}
                title="कॉलम बाएँ खिसकाएं"
                aria-label="कॉलम बाएँ खिसकाएं"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[36px] px-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontally(320)}
                title="कॉलम दाएँ खिसकाएं"
                aria-label="कॉलम दाएँ खिसकाएं"
                className="inline-flex items-center justify-center min-h-[40px] min-w-[36px] px-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void loadSheet(activeSheet)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>रीफ्रेश</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div ref={scrollBodyRef} className="flex-1 overflow-auto bg-white">
          {loading ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center gap-3 p-6 text-slate-600">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
              <p className="text-sm font-medium">
                Google Sheet ({activeSheet}) से लाइव डेटा लोड हो रहा है...
              </p>
            </div>
          ) : error ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center gap-3 p-6 text-center max-w-lg mx-auto">
              <div className="p-3 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-900">{error}</p>
              <button
                type="button"
                onClick={() => void loadSheet(activeSheet)}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>पुनः प्रयास करें</span>
              </button>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="h-full min-h-[240px] flex flex-col items-center justify-center gap-2 p-6 text-center text-slate-500">
              <FileSpreadsheet className="w-8 h-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                {totalRows === 0
                  ? `${activeSheet} शीट में अभी कोई डेटा दर्ज नहीं है।`
                  : 'खोज के अनुसार कोई रिकॉर्ड नहीं मिला।'}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="md:hidden divide-y divide-slate-200">
                {paginatedRows.map((row, idx) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                  return (
                    <div key={rowNum} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                        <span className="font-mono-code font-semibold text-slate-800">
                          #{rowNum} · {row[0] || '—'}
                        </span>
                        {row[1] && (
                          <span className="font-medium text-slate-700 truncate max-w-[65%]">
                            {row[1]}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                        {headers.map((header, cIdx) => {
                          const val = row[cIdx] || '—';
                          return (
                            <div key={`${rowNum}-${cIdx}`} className="min-w-0">
                              <span className="block text-[11px] font-medium text-slate-500">
                                {header || `कॉलम ${cIdx + 1}`}
                              </span>
                              <span className="block text-xs text-slate-900 break-words font-medium">
                                {val}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Spreadsheet Table (>= md) */}
              <div className="hidden md:block min-w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-20 bg-slate-100 shadow-[0_1px_0_0_rgb(226,232,240)]">
                    <tr className="text-slate-700 font-semibold">
                      <th className="py-2.5 px-3 border-r border-slate-200 text-center w-12 sticky left-0 bg-slate-100 z-30">
                        क्र.
                      </th>
                      {headers.map((header, cIdx) => (
                        <th
                          key={cIdx}
                          className="py-2.5 px-3 border-r border-slate-200 whitespace-nowrap"
                        >
                          {header || `कॉलम ${cIdx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {paginatedRows.map((row, idx) => {
                      const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                      return (
                        <tr key={rowNum} className="hover:bg-emerald-50/40 transition-colors">
                          <td className="py-2 px-3 border-r border-slate-200 text-center font-mono-code text-slate-500 sticky left-0 bg-white z-10">
                            {rowNum}
                          </td>
                          {headers.map((_, cIdx) => {
                            const cell = row[cIdx] || '';
                            const isMonoCol =
                              cIdx === 0 ||
                              cIdx === 3 ||
                              cIdx === 8 ||
                              cIdx === 11 ||
                              cIdx === 13 ||
                              cIdx === 14 ||
                              cIdx === 17;
                            return (
                              <td
                                key={cIdx}
                                className={`py-2 px-3 border-r border-slate-200 whitespace-nowrap text-slate-800 ${
                                  isMonoCol ? 'font-mono-code' : ''
                                }`}
                              >
                                {cell || <span className="text-slate-300">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer Row Navigation Bar */}
        {!loading && !error && filteredRows.length > 0 && (
          <div className="px-4 py-2.5 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <p className="text-xs font-mono-code text-slate-600">
              पंक्ति {startRowNumber}–{endRowNumber} (कुल {filteredRows.length})
            </p>

            <div className="flex items-center justify-between sm:justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={safePage <= 1}
                aria-label="पहला पेज"
                title="पहला पेज"
                className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] px-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="पिछला पेज"
                title="पिछला पेज"
                className="inline-flex items-center gap-1 min-h-[38px] px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">पिछला</span>
              </button>

              <span className="px-2.5 text-xs font-mono-code font-medium text-slate-800 whitespace-nowrap">
                पेज {safePage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="अगला पेज"
                title="अगला पेज"
                className="inline-flex items-center gap-1 min-h-[38px] px-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <span className="hidden sm:inline">अगला</span>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage >= totalPages}
                aria-label="अंतिम पेज"
                title="अंतिम पेज"
                className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] px-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
