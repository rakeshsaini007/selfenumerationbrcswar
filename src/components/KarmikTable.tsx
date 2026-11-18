import { Plus, Trash2 } from 'lucide-react';
import { KARMIK_TABLE_COLUMNS, type KarmikRow } from '../types/school';

interface KarmikTableProps {
  rows: KarmikRow[];
  onChangeRow: (rowId: string, field: keyof Omit<KarmikRow, 'id'>, value: string) => void;
  onAddRow: () => void;
  onRemoveRow: (rowId: string) => void;
  disabled?: boolean;
}

export function KarmikTable({
  rows,
  onChangeRow,
  onAddRow,
  onRemoveRow,
  disabled = false,
}: KarmikTableProps) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            कार्मिक एवं स्व गणना विवरण तालिका
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            प्रत्येक कार्मिक की प्रविष्टि अलग पंक्ति में करें · कुल पंक्तियाँ:{' '}
            <span className="font-mono-code font-medium text-slate-800">{rows.length}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onAddRow}
          disabled={disabled}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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

      <div className="overflow-x-auto">
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
                          let val = e.target.value;
                          if (col.key === 'mobileNumber') {
                            val = val.replace(/\D/g, '').slice(0, 10);
                          } else if (col.key === 'seId') {
                            const cleaned = val.toUpperCase().replace(/[^P0-9]/g, '');
                            if (!cleaned) {
                              val = '';
                            } else if (cleaned.startsWith('P')) {
                              val = 'P' + cleaned.slice(1).replace(/\D/g, '').slice(0, 11);
                            } else {
                              val = 'P' + cleaned.replace(/\D/g, '').slice(0, 11);
                            }
                          } else if (
                            col.key === 'karmikName' ||
                            col.key === 'mukhiyaName' ||
                            col.key === 'fatherHusbandName' ||
                            col.key === 'village'
                          ) {
                            val = val.replace(/[^A-Za-z.\s]/g, '').toUpperCase();
                          } else if (col.key === 'officeName') {
                            val = val.replace(/[^A-Za-z0-9.\-/\s]/g, '').toUpperCase();
                          } else if (col.key === 'ehrmsCode') {
                            val = val.replace(/[^A-Za-z0-9\-/]/g, '').toUpperCase();
                          } else if (col.type !== 'date') {
                            val = val.toUpperCase();
                          }
                          onChangeRow(row.id, col.key, val);
                        }}
                        className={`w-full px-2.5 py-2 text-sm bg-white border rounded-md text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 ${
                          isInvalidSeId
                            ? 'border-amber-400 focus:border-amber-600 focus:ring-amber-600/15'
                            : 'border-slate-200 focus:border-blue-600 focus:ring-blue-600/15'
                        } ${
                          col.type !== 'date' && col.type !== 'tel' ? 'uppercase placeholder:normal-case' : ''
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

      <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          अन्य कार्मिक जोड़ने के लिए <strong className="text-slate-700">+ नया कार्मिक जोड़ें</strong> बटन दबाएं।
        </p>
        <button
          type="button"
          onClick={onAddRow}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>एक और पंक्ति जोड़ें</span>
        </button>
      </div>
    </section>
  );
}
