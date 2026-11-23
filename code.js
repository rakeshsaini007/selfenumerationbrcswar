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

// केवल एडमिन (App Developer) के लिए पासकोड — Google Sheet देखने हेतु इसे अपने अनुसार बदलें
const DEFAULT_ADMIN_PASSCODE = "ADMIN@2026";

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
  "स्व गणना किसके द्वारा की गई",
  "न्याय पंचायत",
  "Timestamp"
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
    return;
  }
  const existingHeaders = sheet.getRange(1, 1, 1, DATA_HEADERS.length).getDisplayValues()[0];
  for (let colIdx = 0; colIdx < DATA_HEADERS.length; colIdx++) {
    const existing = String(existingHeaders[colIdx] || "").trim();
    if (!existing) {
      sheet.getRange(1, colIdx + 1).setValue(DATA_HEADERS[colIdx]).setFontWeight("bold");
    }
  }
}

function findNyayPanchayatColIndex(headersRow, fallbackIndex) {
  if (Array.isArray(headersRow)) {
    for (let c = 0; c < headersRow.length; c++) {
      const h = String(headersRow[c] || "").trim().toLowerCase();
      if (h.indexOf("न्याय") !== -1 || h.indexOf("nyay") !== -1 || h.indexOf("panchayat") !== -1) {
        return c;
      }
    }
  }
  return fallbackIndex;
}

function findTimestampColIndex(headersRow, fallbackIndex) {
  if (Array.isArray(headersRow)) {
    for (let c = 0; c < headersRow.length; c++) {
      const h = String(headersRow[c] || "").trim().toLowerCase();
      if (h.indexOf("timestamp") !== -1 || h.indexOf("समय") !== -1 || h.indexOf("दिनांक एवं समय") !== -1) {
        return c;
      }
    }
  }
  return fallbackIndex;
}

function findSeIdColIndex(headersRow, fallbackIndex) {
  if (Array.isArray(headersRow)) {
    for (let c = 0; c < headersRow.length; c++) {
      const h = String(headersRow[c] || "").trim().toLowerCase();
      if (h.indexOf("se id") !== -1 || h.indexOf("se_id") !== -1 || h.indexOf("स्व गणना आइडी") !== -1) {
        return c;
      }
    }
  }
  return fallbackIndex;
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
  let nyayPanchayat = "";
  let foundInSchoolList = false;
  const schoolValues = schoolSheet.getDataRange().getDisplayValues();
  const schoolNyayCol = findNyayPanchayatColIndex(schoolValues[0], 2);

  for (let i = 1; i < schoolValues.length; i++) {
    const rowUdise = normalizeUdise(schoolValues[i][0]);
    if (rowUdise === targetUdise) {
      schoolName = String(schoolValues[i][1] || "").trim();
      nyayPanchayat = String(schoolValues[i][schoolNyayCol] || "").trim();
      foundInSchoolList = true;
      break;
    }
  }

  // 2. Lookup existing records in Data sheet
  const dataSheet = ss.getSheetByName(SHEET_DATA);
  const existingRecords = [];
  let headmasterName = "";
  let headmasterMobile = "";
  let lastTimestamp = "";

  if (dataSheet && dataSheet.getLastRow() > 1) {
    const dataValues = dataSheet.getDataRange().getDisplayValues();
    const dataNyayCol = findNyayPanchayatColIndex(dataValues[0], 16);
    const dataTimestampCol = findTimestampColIndex(dataValues[0], 17);

    for (let i = 1; i < dataValues.length; i++) {
      const row = dataValues[i];
      const rowUdise = normalizeUdise(row[0]);
      if (rowUdise === targetUdise) {
        if (!schoolName && row[1]) {
          schoolName = String(row[1]).trim();
        }
        if (!nyayPanchayat && row[dataNyayCol]) {
          nyayPanchayat = String(row[dataNyayCol]).trim();
        }
        if (!headmasterName && row[2]) {
          headmasterName = String(row[2]).trim();
        }
        if (!headmasterMobile && row[3]) {
          headmasterMobile = String(row[3]).trim();
        }
        const rowTimestamp = String(row[dataTimestampCol] || "").trim();
        if (rowTimestamp) {
          lastTimestamp = rowTimestamp;
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
          enumeratedBy: String(row[15] || "").trim(),
          timestamp: rowTimestamp
        });
      }
    }
  }

  return {
    success: true,
    udiseCode: targetUdise,
    foundInSchoolList: foundInSchoolList,
    schoolName: schoolName,
    nyayPanchayat: nyayPanchayat,
    hasExistingData: existingRecords.length > 0,
    headmasterName: headmasterName,
    headmasterMobile: headmasterMobile,
    lastTimestamp: lastTimestamp,
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
  const schoolNyayCol = findNyayPanchayatColIndex(values[0], 2);
  const schools = [];
  for (let i = 1; i < values.length; i++) {
    const udise = normalizeUdise(values[i][0]);
    const name = String(values[i][1] || "").trim();
    const nyay = String(values[i][schoolNyayCol] || "").trim();
    if (udise && name) {
      schools.push({ udiseCode: udise, schoolName: name, nyayPanchayat: nyay });
    }
  }
  return {
    success: true,
    schools: schools
  };
}

function getAdminPasscode() {
  try {
    const prop = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSCODE");
    if (prop && String(prop).trim()) {
      return String(prop).trim();
    }
  } catch (err) {
    // ignore property lookup errors
  }
  return DEFAULT_ADMIN_PASSCODE;
}

function isAdminAuthorized(adminKey) {
  const provided = String(adminKey || "").trim();
  const expected = String(getAdminPasscode() || "").trim();
  return Boolean(provided && expected && provided === expected);
}

/**
 * Verifies Admin / App Developer passcode
 */
function verifyAdminAccess(adminKey) {
  if (!isAdminAuthorized(adminKey)) {
    return {
      success: false,
      authorized: false,
      unauthorized: true,
      error: "गलत Admin Passcode। यह सुविधा केवल एडमिन (App Developer) के लिए है।"
    };
  }
  const ss = getSpreadsheet();
  return {
    success: true,
    authorized: true,
    spreadsheetUrl: ss.getUrl()
  };
}

/**
 * Returns full display values and spreadsheet URL for "Data" or "School_List" (Admin only)
 */
function getSheetData(requestedSheet, adminKey) {
  if (!isAdminAuthorized(adminKey)) {
    return {
      success: false,
      unauthorized: true,
      error: "अनधिकृत पहुँच: Google Sheet केवल एडमिन (App Developer) द्वारा देखी जा सकती है।"
    };
  }

  const targetName = requestedSheet === SHEET_SCHOOL_LIST ? SHEET_SCHOOL_LIST : SHEET_DATA;
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(targetName);

  if (!sheet) {
    return {
      success: false,
      error: 'शीट "' + targetName + '" नहीं मिली।'
    };
  }

  const sheetUrl = ss.getUrl() + "#gid=" + sheet.getSheetId();

  if (targetName === SHEET_DATA && sheet.getLastRow() === 0) {
    return {
      success: true,
      sheetName: targetName,
      spreadsheetName: ss.getName(),
      spreadsheetUrl: ss.getUrl(),
      sheetUrl: sheetUrl,
      headers: DATA_HEADERS,
      rows: []
    };
  }

  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.length > 0 ? values[0] : (targetName === SHEET_DATA ? DATA_HEADERS : []);
  const rows = values.length > 1 ? values.slice(1) : [];

  return {
    success: true,
    sheetName: targetName,
    spreadsheetName: ss.getName(),
    spreadsheetUrl: ss.getUrl(),
    sheetUrl: sheetUrl,
    headers: headers,
    rows: rows
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
    const nyayPanchayat = String(payload.nyayPanchayat || "").trim();
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

    // Validate SE ID format and uniqueness within submitted rows
    const seenSeIdsInPayload = {};
    for (let r = 0; r < rows.length; r++) {
      const seIdVal = String(rows[r].seId || "").trim().toUpperCase();
      if (!/^P\d{11}$/.test(seIdVal)) {
        return {
          success: false,
          error:
            "पंक्ति " +
            (r + 1) +
            ' में स्व गणना आइडी (SE ID) "P" से शुरू होकर ठीक 11 अंकों की होनी चाहिए।'
        };
      }
      if (seenSeIdsInPayload[seIdVal]) {
        return {
          success: false,
          error:
            'डुप्लिकेट स्व गणना आइडी (SE ID): "' +
            seIdVal +
            '" पंक्ति ' +
            seenSeIdsInPayload[seIdVal] +
            " और पंक्ति " +
            (r + 1) +
            " दोनों में दर्ज है। प्रत्येक कार्मिक की SE ID अद्वितीय (Unique) होनी चाहिए।"
        };
      }
      seenSeIdsInPayload[seIdVal] = r + 1;
    }

    // Find existing rows for this UDISE CODE and check SE ID uniqueness across all other schools
    const existingRowIndices = [];
    const otherSchoolSeIds = {};
    if (dataSheet.getLastRow() > 1) {
      const existingValues = dataSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < existingValues.length; i++) {
        const rowUdise = normalizeUdise(existingValues[i][0]);
        if (rowUdise === targetUdise) {
          existingRowIndices.push(i + 1);
        } else {
          const existingSeId = String(existingValues[i][13] || "").trim().toUpperCase();
          if (existingSeId && !otherSchoolSeIds[existingSeId]) {
            otherSchoolSeIds[existingSeId] = {
              udise: rowUdise,
              schoolName: String(existingValues[i][1] || "").trim()
            };
          }
        }
      }
    }

    for (let r = 0; r < rows.length; r++) {
      const seIdVal = String(rows[r].seId || "").trim().toUpperCase();
      const conflict = otherSchoolSeIds[seIdVal];
      if (conflict) {
        return {
          success: false,
          error:
            'स्व गणना आइडी (SE ID) "' +
            seIdVal +
            '" पहले से UDISE ' +
            conflict.udise +
            (conflict.schoolName ? " (" + conflict.schoolName + ")" : "") +
            " में दर्ज है। प्रत्येक कार्मिक की SE ID अद्वितीय (Unique) होनी चाहिए।"
        };
      }
    }

    const wasUpdate = existingRowIndices.length > 0 || mode === "update";

    // Remove existing rows for this UDISE CODE from bottom to top before writing updated rows
    for (let i = existingRowIndices.length - 1; i >= 0; i--) {
      dataSheet.deleteRow(existingRowIndices[i]);
    }

    // Build matrix of rows to append with submit/update timestamp
    const timeZone = ss.getSpreadsheetTimeZone() || "Asia/Kolkata";
    const submitTimestamp = Utilities.formatDate(new Date(), timeZone, "dd/MM/yyyy HH:mm:ss");

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
        String(item.enumeratedBy || "").trim(),
        nyayPanchayat,
        submitTimestamp
      ];
    });

    const startRow = dataSheet.getLastRow() + 1;
    const writeRange = dataSheet.getRange(startRow, 1, newMatrix.length, DATA_HEADERS.length);

    // Format text-sensitive columns (UDISE, mobiles, EHRMS, SE ID, date, timestamp) as plain text so leading zeros stay intact
    writeRange.setNumberFormat("@");
    writeRange.setValues(newMatrix);

    return {
      success: true,
      mode: wasUpdate ? "update" : "save",
      savedCount: newMatrix.length,
      timestamp: submitTimestamp,
      message: wasUpdate
        ? "डेटा सफलतापूर्वक अपडेट हो गया है (" + newMatrix.length + " कार्मिक)।"
        : "डेटा सफलतापूर्वक सेव हो गया है (" + newMatrix.length + " कार्मिक)।"
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Removes rows having duplicate SE ID in "Data" sheet, keeping only the first row per SE ID.
 */
function removeDuplicateSeIdRowsCore() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    const ss = getSpreadsheet();
    const dataSheet = ss.getSheetByName(SHEET_DATA);
    if (!dataSheet || dataSheet.getLastRow() <= 1) {
      return {
        success: true,
        removedCount: 0,
        keptUniqueCount: 0,
        message: "Data शीट में कोई डुप्लिकेट SE ID पंक्ति नहीं मिली।"
      };
    }

    const values = dataSheet.getDataRange().getDisplayValues();
    const seIdCol = findSeIdColIndex(values[0], 13);
    const seenSeIds = {};
    const duplicateRowIndices = [];

    for (let i = 1; i < values.length; i++) {
      const seIdVal = String(values[i][seIdCol] || "").trim().toUpperCase();
      if (!seIdVal) {
        continue;
      }
      if (seenSeIds[seIdVal]) {
        duplicateRowIndices.push(i + 1);
      } else {
        seenSeIds[seIdVal] = true;
      }
    }

    for (let k = duplicateRowIndices.length - 1; k >= 0; k--) {
      dataSheet.deleteRow(duplicateRowIndices[k]);
    }

    const uniqueCount = Object.keys(seenSeIds).length;
    return {
      success: true,
      removedCount: duplicateRowIndices.length,
      keptUniqueCount: uniqueCount,
      message:
        duplicateRowIndices.length > 0
          ? duplicateRowIndices.length +
            " डुप्लिकेट SE ID पंक्तियाँ हटा दी गईं (प्रत्येक SE ID की 1 पंक्ति सुरक्षित रखी गई)।"
          : "Data शीट में कोई डुप्लिकेट SE ID पंक्ति नहीं मिली।"
    };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Admin-protected wrapper for removing duplicate SE ID rows from the web app
 */
function removeDuplicateSeIdRowsAdmin(adminKey) {
  if (!isAdminAuthorized(adminKey)) {
    return {
      success: false,
      unauthorized: true,
      error: "अनधिकृत पहुँच: केवल एडमिन (App Developer) ही डुप्लिकेट पंक्तियाँ हटा सकते हैं।"
    };
  }
  return removeDuplicateSeIdRowsCore();
}

/**
 * Adds a custom menu button inside Google Sheets toolbar on spreadsheet open.
 * You can also assign `removeDuplicateSeIdRowsFromMenu` to any Drawing/Button on the sheet.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("SE ID Tools")
    .addItem("डुप्लिकेट SE ID पंक्तियाँ हटाएं (1 छोड़कर)", "removeDuplicateSeIdRowsFromMenu")
    .addToUi();
}

/**
 * Assignable to a Google Sheet Drawing button or triggered via the "SE ID Tools" menu.
 */
function removeDuplicateSeIdRowsFromMenu() {
  const ui = SpreadsheetApp.getUi();
  const ss = getSpreadsheet();
  const dataSheet = ss.getSheetByName(SHEET_DATA);

  if (!dataSheet || dataSheet.getLastRow() <= 1) {
    ui.alert("Data शीट खाली है या मौजूद नहीं है।");
    return;
  }

  const values = dataSheet.getDataRange().getDisplayValues();
  const seIdCol = findSeIdColIndex(values[0], 13);
  const seen = {};
  let dupCount = 0;

  for (let i = 1; i < values.length; i++) {
    const seIdVal = String(values[i][seIdCol] || "").trim().toUpperCase();
    if (!seIdVal) continue;
    if (seen[seIdVal]) {
      dupCount++;
    } else {
      seen[seIdVal] = true;
    }
  }

  if (dupCount === 0) {
    ui.alert("कोई डुप्लिकेट SE ID पंक्ति नहीं मिली। सभी SE ID अद्वितीय हैं।");
    return;
  }

  const response = ui.alert(
    "डुप्लिकेट SE ID हटाएं",
    'शीट "Data" में ' +
      dupCount +
      " डुप्लिकेट SE ID पंक्तियाँ मिली हैं।\nक्या आप प्रत्येक SE ID की पहली 1 पंक्ति छोड़कर शेष डुप्लिकेट पंक्तियाँ हटाना चाहते हैं?",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  const result = removeDuplicateSeIdRowsCore();
  ui.alert(result.message);
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
    if (action === "sheetData") {
      return jsonResponse(getSheetData(params.sheet || SHEET_DATA, params.adminKey || ""));
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
 * Body JSON: { action: "save" | "update" | "verifyAdmin" | "sheetData" | "removeDuplicateSeIds", ... }
 */
function doPost(e) {
  try {
    const rawBody = e && e.postData && e.postData.contents ? e.postData.contents : "{}";
    const payload = JSON.parse(rawBody);
    const action = payload.action || "save";

    if (action === "save" || action === "update") {
      return jsonResponse(saveOrUpdateData(payload));
    }
    if (action === "verifyAdmin") {
      return jsonResponse(verifyAdminAccess(payload.adminKey || ""));
    }
    if (action === "sheetData") {
      return jsonResponse(getSheetData(payload.sheet || SHEET_DATA, payload.adminKey || ""));
    }
    if (action === "removeDuplicateSeIds") {
      return jsonResponse(removeDuplicateSeIdRowsAdmin(payload.adminKey || ""));
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
