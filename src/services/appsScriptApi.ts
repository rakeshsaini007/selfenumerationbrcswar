import { GOOGLE_APPS_SCRIPT_URL } from '../config/appsScriptConfig';
import type {
  SaveUpdatePayload,
  SaveUpdateResponse,
  SchoolDirectoryItem,
  SchoolLookupResponse,
} from '../types/school';

const LOCAL_OVERRIDE_STORAGE_KEY = 'udise_portal_temp_gas_url';

export function isValidAppsScriptUrl(url: string): boolean {
  const trimmed = url.trim();
  return (
    trimmed.startsWith('https://script.google.com/') ||
    trimmed.startsWith('https://script.googleusercontent.com/')
  );
}

export function getActiveAppsScriptUrl(): string {
  if (isValidAppsScriptUrl(GOOGLE_APPS_SCRIPT_URL)) {
    return GOOGLE_APPS_SCRIPT_URL.trim();
  }
  try {
    const saved = window.localStorage.getItem(LOCAL_OVERRIDE_STORAGE_KEY) || '';
    if (isValidAppsScriptUrl(saved)) {
      return saved.trim();
    }
  } catch {
    // ignore storage errors
  }
  return '';
}

export function setTemporaryAppsScriptUrl(url: string): void {
  try {
    if (url.trim()) {
      window.localStorage.setItem(LOCAL_OVERRIDE_STORAGE_KEY, url.trim());
    } else {
      window.localStorage.removeItem(LOCAL_OVERRIDE_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function isUsingHardcodedUrl(): boolean {
  return isValidAppsScriptUrl(GOOGLE_APPS_SCRIPT_URL);
}

export async function lookupSchoolByUdise(udiseCode: string): Promise<SchoolLookupResponse> {
  const endpoint = getActiveAppsScriptUrl();
  if (!endpoint) {
    throw new Error(
      'Google Apps Script URL कॉन्फ़िगर नहीं है। कृपया src/config/appsScriptConfig.ts में अपना Deploy URL दर्ज करें।'
    );
  }

  const url = new URL(endpoint);
  url.searchParams.set('action', 'lookup');
  url.searchParams.set('udise', udiseCode.trim());

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`सर्वर त्रुटि (${response.status}): विद्यालय डेटा प्राप्त नहीं हो सका।`);
  }

  const data = (await response.json()) as SchoolLookupResponse;
  if (!data.success) {
    throw new Error(data.error || 'UDISE खोज में त्रुटि हुई।');
  }

  return data;
}

export async function fetchSchoolDirectory(): Promise<SchoolDirectoryItem[]> {
  const endpoint = getActiveAppsScriptUrl();
  if (!endpoint) return [];

  const url = new URL(endpoint);
  url.searchParams.set('action', 'schools');

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
  });

  if (!response.ok) return [];
  const data = (await response.json()) as {
    success: boolean;
    schools?: SchoolDirectoryItem[];
  };
  return data.success && Array.isArray(data.schools) ? data.schools : [];
}

export async function saveOrUpdateSchoolData(
  payload: SaveUpdatePayload
): Promise<SaveUpdateResponse> {
  const endpoint = getActiveAppsScriptUrl();
  if (!endpoint) {
    throw new Error(
      'Google Apps Script URL कॉन्फ़िगर नहीं है। कृपया src/config/appsScriptConfig.ts में अपना Deploy URL दर्ज करें।'
    );
  }

  // Using text/plain avoids CORS preflight OPTIONS requests that Google Apps Script cannot answer.
  const response = await fetch(endpoint, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`सर्वर त्रुटि (${response.status}): डेटा सेव नहीं हो सका।`);
  }

  const data = (await response.json()) as SaveUpdateResponse;
  if (!data.success) {
    throw new Error(data.error || 'डेटा सेव करने में त्रुटि हुई।');
  }

  return data;
}
