import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
} from 'lucide-react';
import { AlertBannerModal } from './components/AlertBannerModal';
import { ExistingDataCard } from './components/ExistingDataCard';
import { KarmikTable } from './components/KarmikTable';
import { SetupGuideModal } from './components/SetupGuideModal';
import {
  getActiveAppsScriptUrl,
  lookupSchoolByUdise,
  saveOrUpdateSchoolData,
} from './services/appsScriptApi';
import {
  createEmptyKarmikRow,
  type AlertDialogState,
  type ExistingKarmikRecord,
  type KarmikRow,
} from './types/school';

export default function App() {
  const [hasEndpoint, setHasEndpoint] = useState<boolean>(() => Boolean(getActiveAppsScriptUrl()));
  const [setupOpen, setSetupOpen] = useState(false);

  // School lookup state
  const [udiseInput, setUdiseInput] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [nyayPanchayat, setNyayPanchayat] = useState('');
  const [foundInSchoolList, setFoundInSchoolList] = useState<boolean | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [lastFetchedUdise, setLastFetchedUdise] = useState('');

  // Existing data in "Data" sheet
  const [hasExistingData, setHasExistingData] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<{
    udiseCode: string;
    schoolName: string;
    nyayPanchayat: string;
    headmasterName: string;
    headmasterMobile: string;
    lastTimestamp?: string;
    records: ExistingKarmikRecord[];
  } | null>(null);

  // Once-filled Head Teacher / In-charge fields
  const [headmasterName, setHeadmasterName] = useState('');
  const [headmasterMobile, setHeadmasterMobile] = useState('');

  // Tabular Karmik rows
  const [rows, setRows] = useState<KarmikRow[]>(() => [createEmptyKarmikRow()]);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [alertState, setAlertState] = useState<AlertDialogState>({
    open: false,
    type: 'info',
    title: '',
    message: '',
  });

  const debounceRef = useRef<number | null>(null);

  const showAlert = useCallback(
    (type: AlertDialogState['type'], title: string, message: string) => {
      setAlertState({ open: true, type, title, message });
    },
    []
  );

  const handleFetchUdise = useCallback(
    async (codeToFetch: string, isManualTrigger = false) => {
      const cleaned = codeToFetch.trim();
      if (!cleaned) {
        setLookupError('');
        setSchoolName('');
        setNyayPanchayat('');
        setFoundInSchoolList(null);
        setHasExistingData(false);
        setSavedSnapshot(null);
        return;
      }

      if (!getActiveAppsScriptUrl()) {
        if (isManualTrigger) {
          showAlert(
            'error',
            'Apps Script URL कॉन्फ़िगर नहीं है',
            'कृपया src/config/appsScriptConfig.ts फ़ाइल में अपना Google Apps Script Deploy URL दर्ज करें या ऊपर "सेटअप एवं निर्देश" से अस्थायी परीक्षण URL डालें।'
          );
        }
        return;
      }

      setLookupLoading(true);
      setLookupError('');

      try {
        setLastFetchedUdise(cleaned);
        const result = await lookupSchoolByUdise(cleaned);
        setFoundInSchoolList(result.foundInSchoolList);
        setSchoolName(result.schoolName || '');
        setNyayPanchayat(result.nyayPanchayat || '');

        if (!result.foundInSchoolList && !result.hasExistingData) {
          setLookupError(
            `UDISE CODE "${result.udiseCode}" School_List शीट में नहीं मिला। कृपया कोड की जांच करें।`
          );
        }

        if (result.hasExistingData && result.existingRecords.length > 0) {
          setHasExistingData(true);
          setSavedSnapshot({
            udiseCode: result.udiseCode,
            schoolName: result.schoolName,
            nyayPanchayat: result.nyayPanchayat || '',
            headmasterName: result.headmasterName,
            headmasterMobile: result.headmasterMobile,
            lastTimestamp: result.lastTimestamp || '',
            records: result.existingRecords,
          });
          setHeadmasterName(result.headmasterName || '');
          setHeadmasterMobile(result.headmasterMobile || '');
          setRows(
            result.existingRecords.map((rec, idx) => ({
              id: `existing-${idx}-${Date.now()}`,
              karmikName: rec.karmikName,
              designation: rec.designation,
              officeName: rec.officeName,
              departmentName: rec.departmentName,
              ehrmsCode: rec.ehrmsCode,
              mukhiyaName: rec.mukhiyaName,
              fatherHusbandName: rec.fatherHusbandName,
              mobileNumber: rec.mobileNumber,
              village: rec.village,
              seId: rec.seId,
              selfEnumDate: rec.selfEnumDate,
              enumeratedBy: rec.enumeratedBy,
            }))
          );
        } else {
          setHasExistingData(false);
          setSavedSnapshot(null);
          setHeadmasterName('');
          setHeadmasterMobile('');
          setRows([createEmptyKarmikRow()]);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'UDISE विवरण प्राप्त करने में त्रुटि हुई।';
        setLookupError(message);
        if (isManualTrigger) {
          showAlert('error', 'डेटा खोज त्रुटि', message);
        }
      } finally {
        setLookupLoading(false);
      }
    },
    [showAlert]
  );

  // Auto-fetch school name and existing records as user types UDISE code
  useEffect(() => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    const trimmed = udiseInput.trim();
    if (!trimmed) {
      setSchoolName('');
      setNyayPanchayat('');
      setFoundInSchoolList(null);
      setLookupError('');
      setHasExistingData(false);
      setSavedSnapshot(null);
      setLastFetchedUdise('');
      return;
    }

    if (!hasEndpoint) return;

    // Trigger faster when exact 11-digit UDISE is entered; otherwise debounce 650ms for >= 6 chars
    if (trimmed.length >= 6 && trimmed !== lastFetchedUdise) {
      const delay = trimmed.length === 11 ? 250 : 650;
      debounceRef.current = window.setTimeout(() => {
        void handleFetchUdise(trimmed, false);
      }, delay);
    }

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [udiseInput, hasEndpoint, lastFetchedUdise, handleFetchUdise]);

  const handleChangeRow = (
    rowId: string,
    field: keyof Omit<KarmikRow, 'id'>,
    value: string
  ) => {
    setRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyKarmikRow()]);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== rowId) : prev));
  };

  const handleResetForm = () => {
    setUdiseInput('');
    setSchoolName('');
    setNyayPanchayat('');
    setFoundInSchoolList(null);
    setLookupError('');
    setLastFetchedUdise('');
    setHasExistingData(false);
    setSavedSnapshot(null);
    setHeadmasterName('');
    setHeadmasterMobile('');
    setRows([createEmptyKarmikRow()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!getActiveAppsScriptUrl()) {
      showAlert(
        'error',
        'Apps Script URL आवश्यक है',
        'कृपया src/config/appsScriptConfig.ts में अपना Google Apps Script Deploy URL दर्ज करें।'
      );
      return;
    }

    const cleanedUdise = udiseInput.trim();
    const cleanedSchool = schoolName.trim();
    const cleanedHmName = headmasterName.trim();
    const cleanedHmMobile = headmasterMobile.trim();

    if (!cleanedUdise) {
      showAlert('error', 'UDISE CODE आवश्यक है', 'कृपया पहले विद्यालय का UDISE CODE दर्ज करें।');
      return;
    }

    if (!cleanedSchool) {
      showAlert(
        'error',
        'विद्यालय का नाम प्राप्त नहीं हुआ',
        'कृपया मान्य UDISE CODE दर्ज करें जिससे School_List से विद्यालय का नाम प्राप्त हो सके।'
      );
      return;
    }

    if (!cleanedHmName) {
      showAlert(
        'error',
        'प्रधानाध्यापक का नाम आवश्यक है',
        'कृपया प्रधानाध्यापक / इंचार्ज अध्यापक का नाम दर्ज करें।'
      );
      return;
    }

    if (!/^\d{10}$/.test(cleanedHmMobile)) {
      showAlert(
        'error',
        'अमान्य मोबाइल नंबर',
        'कृपया प्रधानाध्यापक / इंचार्ज अध्यापक का 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।'
      );
      return;
    }

    const nonEmptyRows = rows.filter((r) => {
      const { id: _id, departmentName, ...rest } = r;
      const hasOtherField = Object.values(rest).some((v) => v.trim() !== '');
      return hasOtherField || departmentName.trim() !== 'बेसिक शिक्षा विभाग';
    });

    if (nonEmptyRows.length === 0) {
      showAlert(
        'error',
        'कार्मिक विवरण खाली है',
        'कृपया तालिका में कम से कम एक कार्मिक का विवरण दर्ज करें।'
      );
      return;
    }

    for (let i = 0; i < nonEmptyRows.length; i++) {
      const row = nonEmptyRows[i];
      if (!row.karmikName.trim()) {
        showAlert(
          'error',
          'कार्मिक का नाम अनिवार्य है',
          `पंक्ति ${i + 1} में "कार्मिक का नाम" दर्ज करें।`
        );
        return;
      }
      if (!row.designation.trim()) {
        showAlert(
          'error',
          'पद नाम अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में "पद नाम" दर्ज करें।`
        );
        return;
      }
      if (!row.officeName.trim()) {
        showAlert(
          'error',
          'कार्यालय का नाम अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में "कार्यालय का नाम" दर्ज करें।`
        );
        return;
      }
      if (!row.mukhiyaName.trim()) {
        showAlert(
          'error',
          'मुखिया का नाम अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में "मुखिया का नाम" दर्ज करें।`
        );
        return;
      }
      if (!row.fatherHusbandName.trim()) {
        showAlert(
          'error',
          'पिता/पति का नाम अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में "पिता/पति का नाम" दर्ज करें।`
        );
        return;
      }
      if (!/^\d{10}$/.test(row.mobileNumber.trim())) {
        showAlert(
          'error',
          'मोबाइल नंबर अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में 10 अंकों का मान्य मोबाइल नंबर दर्ज करें।`
        );
        return;
      }
      if (!row.village.trim()) {
        showAlert(
          'error',
          'ग्राम अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में "ग्राम" दर्ज करें।`
        );
        return;
      }
      if (!/^P\d{11}$/.test(row.seId.trim())) {
        showAlert(
          'error',
          'स्व गणना आइडी (SE ID) अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में स्व गणना आइडी "P" से शुरू होकर ठीक 11 अंकों की होनी चाहिए (उदा. P12345678945)।`
        );
        return;
      }
      if (!row.selfEnumDate.trim()) {
        showAlert(
          'error',
          'स्व गणना दिनांक अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में "स्व गणना दिनांक" चुनें।`
        );
        return;
      }
      const enumVal = row.enumeratedBy.trim();
      if (!enumVal) {
        showAlert(
          'error',
          'स्व गणना किसके द्वारा की गई अनिवार्य है',
          `पंक्ति ${i + 1} (${row.karmikName}) में "स्व गणना किसके द्वारा की गई" चुनें।`
        );
        return;
      }
      for (const prefixChoice of ['स्वयं', 'अन्य'] as const) {
        if (
          enumVal === prefixChoice ||
          enumVal === `${prefixChoice} -` ||
          (enumVal.startsWith(`${prefixChoice} -`) &&
            !enumVal.slice(`${prefixChoice} -`.length).replace(/[^A-Za-z]/g, '').trim())
        ) {
          showAlert(
            'error',
            `${prefixChoice} चुनने पर नाम अनिवार्य है`,
            `पंक्ति ${i + 1} (${row.karmikName}) में "${prefixChoice}" चुनने के बाद नाम (UPPERCASE में) दर्ज करें।`
          );
          return;
        }
      }
    }

    const actionMode = hasExistingData ? 'update' : 'save';
    setSubmitting(true);

    try {
      const sanitizedRows = nonEmptyRows.map(({ id: _id, ...rest }) => {
        let cleanedEnum = rest.enumeratedBy.trim();
        for (const prefixChoice of ['स्वयं', 'अन्य'] as const) {
          if (cleanedEnum.startsWith(`${prefixChoice} - `)) {
            cleanedEnum = `${prefixChoice} - ${cleanedEnum.slice(`${prefixChoice} - `.length).trim()}`;
            break;
          }
        }
        return {
          ...rest,
          enumeratedBy: cleanedEnum,
        };
      });
      const response = await saveOrUpdateSchoolData({
        action: actionMode,
        mode: actionMode,
        udiseCode: cleanedUdise,
        schoolName: cleanedSchool,
        nyayPanchayat: nyayPanchayat.trim(),
        headmasterName: cleanedHmName,
        headmasterMobile: cleanedHmMobile,
        rows: sanitizedRows,
      });

      const resolvedMode = response.mode || actionMode;
      const alertTitle =
        resolvedMode === 'update'
          ? 'डेटा सफलतापूर्वक अपडेट हुआ!'
          : 'डेटा सफलतापूर्वक सेव हुआ!';
      const alertMsg =
        response.message ||
        (resolvedMode === 'update'
          ? `UDISE ${cleanedUdise} का डेटा सफलतापूर्वक अपडेट कर दिया गया है।`
          : `UDISE ${cleanedUdise} का डेटा सफलतापूर्वक सेव कर दिया गया है।`);

      // Refresh lookup snapshot so ExistingDataCard and Update state stay in sync with sheet
      await handleFetchUdise(cleanedUdise, false);
      showAlert('success', alertTitle, alertMsg);
    } catch (err) {
      const errMsg =
        err instanceof Error ? err.message : 'डेटा सेव करते समय अनपेक्षित त्रुटि हुई।';
      showAlert('error', 'डेटा सेव / अपडेट विफल', errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <a
            href="#top"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 truncate"
          >
            UDISE स्व गणना पोर्टल
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" className="flex-1 w-full max-w-[1400px] mx-auto px-3.5 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
        {/* Page Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4 pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              विद्यालय कार्मिक स्व गणना डेटा प्रविष्टि
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              UDISE CODE दर्ज करने पर विद्यालय का नाम स्वतः प्राप्त होगा · पूर्व डेटा होने पर अपडेट विकल्प सक्रिय होगा
            </p>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2 whitespace-nowrap">
            <span className="font-medium text-slate-700">
              मोड: {hasExistingData ? 'अपडेट (Update)' : 'नया सबमिट (Submit)'}
            </span>
          </div>
        </div>

        {/* Setup Warning if Apps Script URL is not configured */}
        {!hasEndpoint && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-sm text-amber-950">
              <p className="font-semibold">
                Google Apps Script Deploy URL अभी कॉन्फ़िगर नहीं है
              </p>
              <p className="text-xs text-amber-900 mt-1">
                Vercel पर होस्ट करने से पहले केवल{' '}
                <code className="font-mono-code bg-white px-1.5 py-0.5 rounded border border-amber-300">
                  src/config/appsScriptConfig.ts
                </code>{' '}
                फ़ाइल में अपना Web App URL दर्ज करें।
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSetupOpen(true)}
              className="px-4 py-2 text-xs font-medium text-amber-950 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              URL सेटअप खोलें
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" noValidate>
          {/* Section 1: UDISE Lookup & Auto-fetched School Name */}
          <section
            id="school-lookup"
            className="bg-white border border-slate-200 rounded-2xl sm:rounded-xl p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5 sm:mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                1. विद्यालय पहचान (UDISE CODE से स्वतः खोज)
              </h2>
              {lookupLoading && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>विद्यालय खोजा जा रहा है...</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-4">
                <label
                  htmlFor="udise-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  UDISE CODE <span className="text-rose-600">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="udise-input"
                    type="text"
                    inputMode="numeric"
                    value={udiseInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\s+/g, '');
                      setUdiseInput(val);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleFetchUdise(udiseInput, true);
                      }
                    }}
                    placeholder="उदा. 09050306501"
                    className="flex-1 min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm font-mono-code bg-white border border-slate-300 rounded-xl sm:rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                  <button
                    type="button"
                    onClick={() => void handleFetchUdise(udiseInput, true)}
                    disabled={lookupLoading || !udiseInput.trim()}
                    className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-xl sm:rounded-lg hover:bg-slate-800 active:scale-[0.99] disabled:opacity-50 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {lookupLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>खोजें</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  11 अंकों का UDISE कोड भरते ही School_List से विद्यालय एवं न्याय पंचायत स्वतः आ जाएगा।
                </p>
              </div>

              <div className="lg:col-span-5">
                <label
                  htmlFor="school-name-display"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  विद्यालय का नाम (Auto-Fetched)
                </label>
                <div className="relative">
                  <input
                    id="school-name-display"
                    type="text"
                    readOnly
                    value={schoolName}
                    placeholder="UDISE CODE दर्ज करने पर विद्यालय का नाम यहाँ दिखाई देगा"
                    className={`w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl sm:rounded-lg border font-medium focus:outline-none ${
                      schoolName
                        ? 'bg-emerald-50/50 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  />
                  {foundInSchoolList && schoolName && (
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>School_List से सत्यापित</span>
                    </span>
                  )}
                </div>
                {lookupError && (
                  <p className="mt-1.5 text-xs font-medium text-rose-700">{lookupError}</p>
                )}
              </div>

              <div className="lg:col-span-3">
                <label
                  htmlFor="nyay-panchayat-display"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  न्याय पंचायत (Auto-Fetched)
                </label>
                <input
                  id="nyay-panchayat-display"
                  type="text"
                  readOnly
                  value={nyayPanchayat}
                  placeholder="न्याय पंचायत स्वतः प्राप्त होगा"
                  className={`w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm rounded-xl sm:rounded-lg border font-medium focus:outline-none ${
                    nyayPanchayat
                      ? 'bg-emerald-50/50 border-emerald-300 text-slate-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Existing Saved Data Card (if already present in Data sheet) */}
          {hasExistingData && savedSnapshot && (
            <ExistingDataCard
              udiseCode={savedSnapshot.udiseCode}
              schoolName={savedSnapshot.schoolName}
              nyayPanchayat={savedSnapshot.nyayPanchayat}
              headmasterName={savedSnapshot.headmasterName}
              headmasterMobile={savedSnapshot.headmasterMobile}
              lastTimestamp={savedSnapshot.lastTimestamp}
              records={savedSnapshot.records}
            />
          )}

          {/* Section 3: Headmaster / In-Charge Teacher Details (Filled Once) */}
          <section
            id="headmaster-info"
            className="bg-white border border-slate-200 rounded-2xl sm:rounded-xl p-4 sm:p-6"
          >
            <div className="mb-3.5 sm:mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                2. प्रधानाध्यापक / इंचार्ज अध्यापक का विवरण (केवल एक बार भरें)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                यह नाम एवं मोबाइल नंबर नीचे दर्ज सभी कार्मिकों की पंक्तियों के साथ स्वतः सुरक्षित होगा।
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label
                  htmlFor="headmaster-name"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  प्रधानाध्यापक / इंचार्ज अध्यापक का नाम <span className="text-rose-600">*</span>
                </label>
                <input
                  id="headmaster-name"
                  type="text"
                  value={headmasterName}
                  onChange={(e) =>
                    setHeadmasterName(e.target.value.replace(/[^A-Za-z.\s]/g, '').toUpperCase())
                  }
                  disabled={submitting}
                  placeholder="प्रधानाध्यापक / इंचार्ज अध्यापक का पूरा नाम"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm bg-white border border-slate-300 rounded-xl sm:rounded-lg text-slate-900 placeholder:text-slate-400 uppercase placeholder:normal-case focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>

              <div>
                <label
                  htmlFor="headmaster-mobile"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  प्रधानाध्यापक / इंचार्ज अध्यापक का मोबाइल नंबर <span className="text-rose-600">*</span>
                </label>
                <input
                  id="headmaster-mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={headmasterMobile}
                  onChange={(e) =>
                    setHeadmasterMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
                  }
                  disabled={submitting}
                  placeholder="10 अंकों का मोबाइल नंबर"
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-base sm:text-sm font-mono-code bg-white border border-slate-300 rounded-xl sm:rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </div>
            </div>
          </section>

          {/* Section 4: Tabular Entry Grid for Karmik Rows */}
          <div id="karmik-table">
            <KarmikTable
              rows={rows}
              onChangeRow={handleChangeRow}
              onAddRow={handleAddRow}
              onRemoveRow={handleRemoveRow}
              disabled={submitting}
            />
          </div>

          {/* Section 5: Submit / Update Action Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-xl px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              {hasExistingData ? (
                <span>
                  Data शीट में इस UDISE का डेटा पहले से उपलब्ध है — सहेजने पर पुराना रिकॉर्ड{' '}
                  <strong className="text-slate-900">अपडेट (Update)</strong> हो जाएगा।
                </span>
              ) : (
                <span>
                  नई प्रविष्टि के लिए नीचे{' '}
                  <strong className="text-slate-900">डेटा सबमिट करें</strong> बटन पर क्लिक करें।
                </span>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full sm:w-auto sm:ml-auto">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl sm:rounded-lg hover:bg-slate-50 active:scale-[0.99] disabled:opacity-50 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>रीसेट करें</span>
              </button>

              <button
                type="submit"
                disabled={submitting || lookupLoading}
                className={`inline-flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[44px] px-6 py-2.5 text-sm font-semibold text-white rounded-xl sm:rounded-lg active:scale-[0.99] disabled:opacity-60 transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  hasExistingData
                    ? 'bg-amber-600 hover:bg-amber-700 focus-visible:ring-2 focus-visible:ring-amber-600'
                    : 'bg-blue-700 hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-700'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{hasExistingData ? 'अपडेट हो रहा है...' : 'सेव हो रहा है...'}</span>
                  </>
                ) : hasExistingData ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>डेटा अपडेट करें (Update)</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>डेटा सबमिट करें (Submit)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Save / Update Alert Dialog */}
      <AlertBannerModal
        alert={alertState}
        onClose={() => setAlertState((prev) => ({ ...prev, open: false }))}
      />

      {/* Setup & Deployment Modal */}
      <SetupGuideModal
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        onUrlUpdated={() => setHasEndpoint(Boolean(getActiveAppsScriptUrl()))}
      />
    </div>
  );
}
