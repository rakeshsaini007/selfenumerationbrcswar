import { useState } from 'react';
import { ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react';
import type { ExistingKarmikRecord } from '../types/school';

interface ExistingDataCardProps {
  udiseCode: string;
  schoolName: string;
  headmasterName: string;
  headmasterMobile: string;
  records: ExistingKarmikRecord[];
}

export function ExistingDataCard({
  udiseCode,
  schoolName,
  headmasterName,
  headmasterMobile,
  records,
}: ExistingDataCardProps) {
  const [expanded, setExpanded] = useState(true);

  if (records.length === 0) return null;

  return (
    <section
      aria-label="पूर्व से दर्ज डेटा विवरण"
      className="bg-white border border-amber-300 rounded-xl overflow-hidden"
    >
      <div className="px-5 py-4 bg-amber-50/70 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              पूर्व से दर्ज डेटा (Data शीट में उपलब्ध)
            </h2>
            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                UDISE: <span className="font-mono-code font-medium text-slate-900">{udiseCode}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-800">{schoolName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-code font-medium text-amber-900">
                कुल {records.length} कार्मिक दर्ज
              </span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {expanded ? (
            <>
              <span>विवरण छिपाएं</span>
              <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              <span>दर्ज रिकॉर्ड देखें</span>
              <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {expanded && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 text-sm">
            <div>
              <span className="block text-xs text-slate-500">
                प्रधानाध्यापक / इंचार्ज अध्यापक का नाम
              </span>
              <span className="font-medium text-slate-900 mt-0.5 block">
                {headmasterName || '—'}
              </span>
            </div>
            <div>
              <span className="block text-xs text-slate-500">
                प्रधानाध्यापक / इंचार्ज अध्यापक का मोबाइल नंबर
              </span>
              <span className="font-mono-code font-medium text-slate-900 mt-0.5 block">
                {headmasterMobile || '—'}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">क्र.</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">कार्मिक का नाम</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">पद नाम</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">EHRMS CODE</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">मुखिया का नाम</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">पिता/पति का नाम</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">मोबाइल नंबर</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">ग्राम</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">स्व गणना आइडी(SE ID)</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">स्व गणना दिनांक</th>
                  <th className="py-2.5 px-3 font-semibold whitespace-nowrap">किसके द्वारा</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((rec, idx) => (
                  <tr key={`${rec.ehrmsCode}-${idx}`} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-mono-code text-slate-500">{idx + 1}</td>
                    <td className="py-2 px-3 font-medium text-slate-900 whitespace-nowrap">
                      {rec.karmikName || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {rec.designation || '—'}
                    </td>
                    <td className="py-2 px-3 font-mono-code text-slate-700 whitespace-nowrap">
                      {rec.ehrmsCode || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {rec.mukhiyaName || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {rec.fatherHusbandName || '—'}
                    </td>
                    <td className="py-2 px-3 font-mono-code text-slate-700 whitespace-nowrap">
                      {rec.mobileNumber || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {rec.village || '—'}
                    </td>
                    <td className="py-2 px-3 font-mono-code text-slate-700 whitespace-nowrap">
                      {rec.seId || '—'}
                    </td>
                    <td className="py-2 px-3 font-mono-code text-slate-700 whitespace-nowrap">
                      {rec.selfEnumDate || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                      {rec.enumeratedBy || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-600">
            नीचे दी गई तालिका में यह डेटा संपादन के लिए लोड हो चुका है। परिवर्तन या नया कार्मिक जोड़ने के बाद नीचे{' '}
            <strong className="font-semibold text-slate-900">डेटा अपडेट करें</strong> बटन पर क्लिक करें।
          </p>
        </div>
      )}
    </section>
  );
}
