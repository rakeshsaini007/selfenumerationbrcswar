/**
 * Google Apps Script Backend (code.js)
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Spreadsheet containing the sheets named "Data" and "School_List".
 * 2. Go to Extensions -> Apps Script.
 * 3. Delete any existing code in Code.gs and paste this entire file.
 * 4. Click Save (Ctrl+S).
 * 5. Click Deploy -> New deployment -> Select type: "Web app".
 * 6. Execute as: "Me" | Who has access: "Anyone".
 * 7. Click Deploy, authorize permissions, and copy the Web App URL.
 * 8. Paste that URL into: src/config/appsScriptConfig.ts
 */

const SHEET_SCHOOL_LIST = "School_List";
const SHEET_DATA = "Data";

const DATA_HEADERS = [
  "UDISE CODE",
  "विद्यालय का नाम",
  "प्रधानाध्यापक / इंचार्ज अध्यापक का नाम",
  "प्रधानाध्यापक / इंचार्ज अध्यापक का मोबाइल नंबर",
  "कार्मिक का नाम",
  "पद नाम",
  "कार्यालय का नाम",
  "विभाग का नाम",
  "EHRMS CODE",
  "मुखिया का नाम",
  "पिता/पति का नाम",
  "मोबाइल नंबर",
  "ग्राम",
  "स्व गणना आइडी(SE ID)",
  "स्व गणना दिनांक",
  "स्व गणना किसके द्वारा की गई"
];

/**
 * Normalizes UDISE codes so leading zeros match reliably whether stored
 * as text ("09050306501") or numbers (9050306501) in Google Sheets.
 */
function normalizeUdise(value) {
  const raw = String(value == null ? "" : value).trim();
  if (!raw) return "";
  if (/^\d+$/.test(raw) && raw.length < 11) {
    return raw.padStart(11, "0");
  }
  return raw;
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function ensureDataHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(DATA_HEADERS);
    sheet.getRange(1, 1, 1, DATA_HEADERS.length).setFontWeight("bold");
  }
}

/**
 * Finds school name from "School_List" and existing saved rows from "Data"
 */
function lookupByUdise(udiseInput) {
  const targetUdise = normalizeUdise(udiseInput);
  if (!targetUdise) {
    return {
      success: false,
      error: "कृपया मान्य UDISE CODE दर्ज करें।"
    };
  }

  const ss = getSpreadsheet();
  const schoolSheet = ss.getSheetByName(SHEET_SCHOOL_LIST);
  if (!schoolSheet) {
    return {
      success: false,
      error: 'शीट "' + SHEET_SCHOOL_LIST + '" नहीं मिली।'
    };
  }

  // 1. Lookup in School_List
  let schoolName = "";
  let foundInSchoolList = false;
  const schoolValues = schoolSheet.getDataRange().getDisplayValues();
  for (let i = 1; i < schoolValues.length; i++) {
    const rowUdise = normalizeUdise(schoolValues[i][0]);
    if (rowUdise === targetUdise) {
      schoolName = String(schoolValues[i][1] || "").trim();
      foundInSchoolList = true;
      break;
    }
  }

  // 2. Lookup existing records in Data sheet
  const dataSheet = ss.getSheetByName(SHEET_DATA);
  const existingRecords = [];
  let headmasterName = "";
  let headmasterMobile = "";

  if (dataSheet && dataSheet.getLastRow() > 1) {
    const dataValues = dataSheet.getDataRange().getDisplayValues();
    for (let i = 1; i < dataValues.length; i++) {
      const row = dataValues[i];
      const rowUdise = normalizeUdise(row[0]);
      if (rowUdise === targetUdise) {
        if (!schoolName && row[1]) {
          schoolName = String(row[1]).trim();
        }
        if (!headmasterName && row[2]) {
          headmasterName = String(row[2]).trim();
        }
        if (!headmasterMobile && row[3]) {
          headmasterMobile = String(row[3]).trim();
        }
        existingRecords.push({
          rowIndex: i + 1,
          karmikName: String(row[4] || "").trim(),
          designation: String(row[5] || "").trim(),
          officeName: String(row[6] || "").trim(),
          departmentName: String(row[7] || "").trim(),
          ehrmsCode: String(row[8] || "").trim(),
          mukhiyaName: String(row[9] || "").trim(),
          fatherHusbandName: String(row[10] || "").trim(),
          mobileNumber: String(row[11] || "").trim(),
          village: String(row[12] || "").trim(),
          seId: String(row[13] || "").trim(),
          selfEnumDate: String(row[14] || "").trim(),
          enumeratedBy: String(row[15] || "").trim()
        });
      }
    }
  }

  return {
    success: true,
    udiseCode: targetUdise,
    foundInSchoolList: foundInSchoolList,
    schoolName: schoolName,
    hasExistingData: existingRecords.length > 0,
    headmasterName: headmasterName,
    headmasterMobile: headmasterMobile,
    existingRecords: existingRecords
  };
}

/**
 * Optional: returns all schools from School_List for quick search/autocomplete
 */
function getSchoolList() {
  const ss = getSpreadsheet();
  const schoolSheet = ss.getSheetByName(SHEET_SCHOOL_LIST);
  if (!schoolSheet) {
    return {
      success: false,
      error: 'शीट "' + SHEET_SCHOOL_LIST + '" नहीं मिली।'
    };
  }
  const values = schoolSheet.getDataRange().getDisplayValues();
  const schools = [];
  for (let i = 1; i < values.length; i++) {
    const udise = normalizeUdise(values[i][0]);
    const name = String(values[i][1] || "").trim();
    if (udise && name) {
      schools.push({ udiseCode: udise, schoolName: name });
    }
  }
  return {
    success: true,
    schools: schools
  };
}

/**
 * Saves new records or updates existing records for a UDISE CODE in "Data"
 */
function saveOrUpdateData(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ss = getSpreadsheet();
    let dataSheet = ss.getSheetByName(SHEET_DATA);
    if (!dataSheet) {
      dataSheet = ss.insertSheet(SHEET_DATA);
    }
    ensureDataHeaders(dataSheet);

    const targetUdise = normalizeUdise(payload.udiseCode);
    const schoolName = String(payload.schoolName || "").trim();
    const headmasterName = String(payload.headmasterName || "").trim();
    const headmasterMobile = String(payload.headmasterMobile || "").trim();
    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const mode = payload.mode === "update" ? "update" : "save";

    if (!targetUdise) {
      return { success: false, error: "UDISE CODE आवश्यक है।" };
    }
    if (!schoolName) {
      return { success: false, error: "विद्यालय का नाम आवश्यक है।" };
    }
    if (!headmasterName || !headmasterMobile) {
      return {
        success: false,
        error: "प्रधानाध्यापक / इंचार्ज अध्यापक का नाम और मोबाइल नंबर आवश्यक है।"
      };
    }
    if (rows.length === 0) {
      return {
        success: false,
        error: "कम से कम एक कार्मिक का विवरण भरें।"
      };
    }

    // Find existing rows for this UDISE CODE
    const existingRowIndices = [];
    if (dataSheet.getLastRow() > 1) {
      const existingValues = dataSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < existingValues.length; i++) {
        if (normalizeUdise(existingValues[i][0]) === targetUdise) {
          existingRowIndices.push(i + 1);
        }
      }
    }

    const wasUpdate = existingRowIndices.length > 0 || mode === "update";

    // Remove existing rows for this UDISE CODE from bottom to top before writing updated rows
    for (let i = existingRowIndices.length - 1; i >= 0; i--) {
      dataSheet.deleteRow(existingRowIndices[i]);
    }

    // Build matrix of rows to append
    const newMatrix = rows.map(function (item) {
      return [
        targetUdise,
        schoolName,
        headmasterName,
        headmasterMobile,
        String(item.karmikName || "").trim(),
        String(item.designation || "").trim(),
        String(item.officeName || "").trim(),
        String(item.departmentName || "").trim(),
        String(item.ehrmsCode || "").trim(),
        String(item.mukhiyaName || "").trim(),
        String(item.fatherHusbandName || "").trim(),
        String(item.mobileNumber || "").trim(),
        String(item.village || "").trim(),
        String(item.seId || "").trim(),
        String(item.selfEnumDate || "").trim(),
        String(item.enumeratedBy || "").trim()
      ];
    });

    const startRow = dataSheet.getLastRow() + 1;
    const writeRange = dataSheet.getRange(startRow, 1, newMatrix.length, DATA_HEADERS.length);

    // Format text-sensitive columns (UDISE, mobiles, EHRMS, SE ID, date) as plain text so leading zeros stay intact
    writeRange.setNumberFormat("@");
    writeRange.setValues(newMatrix);

    return {
      success: true,
      mode: wasUpdate ? "update" : "save",
      savedCount: newMatrix.length,
      message: wasUpdate
        ? "डेटा सफलतापूर्वक अपडेट हो गया है (" + newMatrix.length + " कार्मिक)।"
        : "डेटा सफलतापूर्वक सेव हो गया है (" + newMatrix.length + " कार्मिक)।"
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handles GET requests:
 * - ?action=lookup&udise=09050306501
 * - ?action=schools
 */
function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const action = params.action || "lookup";

    if (action === "schools") {
      return jsonResponse(getSchoolList());
    }
    if (action === "lookup") {
      return jsonResponse(lookupByUdise(params.udise || ""));
    }
    return jsonResponse({
      success: true,
      message: "Google Apps Script API is active."
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

/**
 * Handles POST requests (sent with Content-Type: text/plain;charset=utf-8 to bypass CORS preflight)
 * Body JSON: { action: "save" | "update", udiseCode, schoolName, headmasterName, headmasterMobile, rows: [...] }
 */
function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const payload = JSON.parse(rawBody);
    const action = payload.action || "save";

    if (action === "save" || action === "update") {
      return jsonResponse(saveOrUpdateData(payload));
    }

    return jsonResponse({
      success: false,
      error: "अमान्य action प्राप्त हुआ।"
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}
