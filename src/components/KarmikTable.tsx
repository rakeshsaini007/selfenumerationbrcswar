import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { KARMIK_TABLE_COLUMNS, type KarmikRow } from '../types/school';

interface KarmikTableProps {
  rows: KarmikRow[];
  onChangeRow: (rowId: string, field: keyof Omit<KarmikRow, 'id'>, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  disabled?: boolean;
}

function formatKarmikFieldValue(
  col: (typeof KARMIK_TABLE_COLUMNS)[number],
  rawValue: string
): string {
  if (col.key === 'mobileNumber') {
    return rawValue.replace(/\D/g, '').slice(0, 10);
  }
  if (col.key === 'seId') {
    const cleaned = rawValue.toUpperCase().replace(/[^P0-9]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('P')) {
      return 'P' + cleaned.slice(1).replace(/\D/g, '').slice(0, 11);
    }
    return 'P' + cleaned.replace(/\D/g, '').slice(0, 11);
  }
  if (
    col.key === 'karmikName' ||
    col.key === 'mukhiyaName' ||
    col.key === 'fatherHusbandName' ||
    col.key === 'village'
  ) {
    return rawValue.replace(/[^A-Za-z.\s]/g, '').toUpperCase();
  }
  if (col.key === 'officeName') {
    return rawValue.replace(/[^A-Za-z0-9.\-/\s]/g, '').toUpperCase();
  }
  if (col.key === 'ehrmsCode') {
    return rawValue.replace(/[^A-Za-z0-9\-/]/g, '').toUpperCase();
  }
  if (col.type !== 'date') {
    return rawValue.toUpperCase();
  }
  return rawValue;
}

export function KarmikTable({
  rows,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  disabled = false,
}: KarmikTableProps) {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const toggleMobileCard = (rowId: string) => {
    setCollapsedMap((prev) => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl sm:rounded-xl overflow-hidden">
      <div className="px-4 py-4 sm:px-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            कार्मिक एवं स्व गणना विवरण
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            प्रत्येक कार्मिक की प्रविष्टि अलग खंड/पंक्ति में करें · कुल कार्मिक:{' '}
            <span className="font-mono-code font-medium text-slate-800">{rows.length}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRow}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl sm:rounded-lg hover:bg-blue-100 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 transition-all whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>नया कार्मिक जोड़ें</span>
        </button>
      </div>

      {/* Datalist suggestions for fast data entry */}
      <datalist id="designation-suggestions">
        <option value="प्रधानाध्यापक" />
        <option value="इंचार्ज प्रधानाध्यापक" />
        <option value="सहायक अध्यापक" />
        <option value="शिक्षामित्र" />
        <option value="अनुदेशक" />
        <option value="परिचारक" />
        <option value="सफाईकर्मी" />
      </datalist>

      <datalist id="enumerated-by-suggestions">
        <option value="स्वयं" />
        <option value="प्रधानाध्यापक" />
        <option value="बीएलओ" />
      </datalist>

      {/* Mobile Touch-Friendly Stacked Entry Cards (< md) */}
      <div className="md:hidden divide-y divide-slate-200">
        {rows.map((row, index) => {
          const isCollapsed = Boolean(collapsedMap[row.id]);
          return (
            <div key={row.id} className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => toggleMobileCard(row.id)}
                  className="flex items-center gap-2 min-h-[44px] text-left flex-1 min-w-0 cursor-pointer"
                >
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-800 font-mono-code text-xs font-semibold shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900 truncate">
                      {row.karmikName || `कार्मिक #${index + 1}`}
                    </span>
                    <span className="block text-xs text-slate-500 truncate">
                      {row.designation || 'पद नाम नहीं भरा गया'}
                      {row.seId ? ` · ${row.seId}` : ''}
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveRow(row.id)}
                  disabled={disabled || rows.length <= 1}
                  aria-label={`कार्मिक ${index + 1} हटाएं`}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {KARMIK_TABLE_COLUMNS.map((col) => {
                    const listId =
                      col.key === 'designation'
                        ? 'designation-suggestions'
                        : col.key === 'enumeratedBy'
                          ? 'enumerated-by-suggestions'
                          : undefined;

                    const isInvalidSeId =
                      col.key === 'seId' &&
                      row.seId.length > 0 &&
                      !/^P\d{11}$/.test(row.seId);

                    return (
                      <div key={col.key}>
                        <label
                          htmlFor={`mobile-${row.id}-${col.key}`}
                          className="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                          {col.label}
                        </label>
                        <input
                          id={`mobile-${row.id}-${col.key}`}
                          type={col.type || 'text'}
                          inputMode={col.key === 'mobileNumber' ? 'numeric' : undefined}
                          list={listId}
                          value={row[col.key]}
                          maxLength={col.maxLength}
                          disabled={disabled}
                          placeholder={col.placeholder}
                          onChange={(e) => {
                            const val = formatKarmikFieldValue(col, e.target.value);
                            onChangeRow(row.id, col.key, val);
                          }}
                          className={`w-full min-h-[44px] px-3.5 py-2.5 text-base bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 ${
                            isInvalidSeId
                              ? 'border-amber-400 focus:border-amber-600 focus:ring-amber-600/15'
                              : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                          } ${
                            col.type !== 'date' && col.type !== 'tel'
                              ? 'uppercase placeholder:normal-case'
                              : ''
                          } ${col.mono ? 'font-mono-code' : ''}`}
                        />
                        {isInvalidSeId && (
                          <p className="mt-1 text-xs text-amber-700">
                            P के साथ ठीक 11 अंक दर्ज करें (उदा. P12345678945)
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop High-Density Tabular Grid (>= md) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700">
              <th className="py-3 px-3 border-r border-slate-200 text-center w-12 sticky left-0 bg-slate-50 z-10">
                क्र.
              </th>
              {KARMIK_TABLE_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-3 border-r border-slate-200 whitespace-nowrap ${col.minWidth}`}
                >
                  {col.label}
                </th>
              ))}
              <th className="py-3 px-3 text-center whitespace-nowrap w-20">हटाएं</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 text-sm">
            {rows.map((row, index) => (
              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono-code text-xs font-medium text-slate-600 sticky left-0 bg-white z-10">
                  {index + 1}
                </td>

                {KARMIK_TABLE_COLUMNS.map((col) => {
                  const listId =
                    col.key === 'designation'
                      ? 'designation-suggestions'
                      : col.key === 'enumeratedBy'
                        ? 'enumerated-by-suggestions'
                        : undefined;

                  const isInvalidSeId =
                    col.key === 'seId' &&
                    row.seId.length > 0 &&
                    !/^P\d{11}$/.test(row.seId);

                  return (
                    <td key={col.key} className="p-1.5 border-r border-slate-200 align-middle">
                      <input
                        type={col.type || 'text'}
                        list={listId}
                        value={row[col.key]}
                        maxLength={col.maxLength}
                        disabled={disabled}
                        placeholder={col.placeholder}
                        title={
                          col.key === 'seId'
                            ? 'P से शुरू होकर ठीक 11 अंक दर्ज करें (उदा. P12345678945)'
                            : undefined
                        }
                        aria-label={`${col.label} - पंक्ति ${index + 1}`}
                        onChange={(e) => {
                          const val = formatKarmikFieldValue(col, e.target.value);
                          onChangeRow(row.id, col.key, val);
                        }}
                        className={`w-full px-2.5 py-2 text-sm bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 ${
                          isInvalidSeId
                            ? 'border-amber-400 focus:border-amber-600 focus:ring-amber-600/15'
                            : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/15'
                        } ${
                          col.type !== 'date' && col.type !== 'tel'
                            ? 'uppercase placeholder:normal-case'
                            : ''
                        } ${col.mono ? 'font-mono-code' : ''}`}
                      />
                    </td>
                  );
                })}

                <td className="p-1.5 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => onRemoveRow(row.id)}
                    disabled={disabled || rows.length <= 1}
                    title={rows.length <= 1 ? 'कम से कम एक पंक्ति आवश्यक है' : 'यह पंक्ति हटाएं'}
                    aria-label={`पंक्ति ${index + 1} हटाएं`}
                    className="inline-flex items-center justify-center p-2 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500 transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-3 sm:px-5 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          अन्य कार्मिक जोड़ने के लिए <strong className="text-slate-700">+ नया कार्मिक जोड़ें</strong> बटन दबाएं।
        </p>
        <button
          type="button"
          onClick={onAddRow}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3.5 py-2 sm:py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>एक और पंक्ति जोड़ें</span>
        </button>
      </div>
    </section>
  );
}
