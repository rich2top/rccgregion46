const ATTEMPTS_SHEET_NAME = "Attempts";
const LEADERBOARD_SHEET_NAME = "Leaderboard";

const ATTEMPT_HEADERS = [
  "attempt_id",
  "email_key",
  "email",
  "full_name",
  "region",
  "province",
  "zone",
  "class_type",
  "status",
  "score",
  "total_questions",
  "percentage",
  "started_at",
  "submitted_at",
  "submission_reason",
  "created_at",
  "updated_at",
];

const LEADERBOARD_HEADERS = [
  "position",
  "full_name",
  "email",
  "province",
  "zone",
  "class_type",
  "score",
  "total_questions",
  "percentage",
  "status",
  "submitted_at",
];

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const response = routeAction_(payload);
    return jsonOutput_({
      ok: true,
      ...response,
    });
  } catch (error) {
    return jsonOutput_({
      ok: false,
      error: error && error.message ? error.message : "Unexpected Apps Script error.",
    });
  }
}

function routeAction_(payload) {
  ensureSheets_();

  switch (payload.action) {
    case "startAttempt":
      return startAttempt_(payload.biodata || {});
    case "submitAttempt":
      return submitAttempt_(payload || {});
    default:
      throw new Error("Unsupported action.");
  }
}

function startAttempt_(biodata) {
  return withSheetLock_(function () {
    const emailKey = normalizeEmail_(biodata.email);

    if (!emailKey) {
      throw new Error("Email address is required.");
    }

    const attempts = getAttemptRecords_();
    const existingAttempt = attempts.find((item) => item.email_key === emailKey);

    if (existingAttempt) {
      throw new Error("This email has already been used for this quiz.");
    }

    const attemptsSheet = getSheet_(ATTEMPTS_SHEET_NAME, ATTEMPT_HEADERS);
    const now = new Date().toISOString();
    const attemptId = Utilities.getUuid();

    attemptsSheet.appendRow([
      attemptId,
      emailKey,
      String(biodata.email || "").trim(),
      String(biodata.fullName || "").trim(),
      String(biodata.region || "Region 49").trim(),
      String(biodata.province || "").trim(),
      String(biodata.zone || "").trim(),
      String(biodata.classType || "").trim(),
      "started",
      "",
      "",
      "",
      now,
      "",
      "",
      now,
      now,
    ]);

    return {
      attemptId,
      startedAt: now,
    };
  });
}

function submitAttempt_(payload) {
  return withSheetLock_(function () {
    const biodata = payload.biodata || {};
    const emailKey = normalizeEmail_(biodata.email);

    if (!emailKey) {
      throw new Error("Email address is required.");
    }

    const attemptsSheet = getSheet_(ATTEMPTS_SHEET_NAME, ATTEMPT_HEADERS);
    const records = getAttemptRecords_();
    const attemptId = payload.attemptId || "";
    const recordIndex = records.findIndex((item) => {
      if (attemptId && item.attempt_id === attemptId) {
        return true;
      }

      return item.email_key === emailKey;
    });

    const now = new Date().toISOString();
    const submissionReason = String(payload.submissionReason || "manual").trim();
    const status = submissionReason === "timed_out" ? "timed_out" : "submitted";
    const score = Number(payload.score || 0);
    const totalQuestions = Number(payload.totalQuestions || 0);
    const percentage =
      totalQuestions > 0 ? Number(((score / totalQuestions) * 100).toFixed(2)) : 0;
    const submittedAt = payload.submittedAt || now;
    const startedAt = payload.startedAt || now;

    const rowValues = [
      attemptId || Utilities.getUuid(),
      emailKey,
      String(biodata.email || "").trim(),
      String(biodata.fullName || "").trim(),
      String(biodata.region || "Region 49").trim(),
      String(biodata.province || "").trim(),
      String(biodata.zone || "").trim(),
      String(biodata.classType || "").trim(),
      status,
      score,
      totalQuestions,
      percentage,
      startedAt,
      submittedAt,
      submissionReason,
      startedAt,
      now,
    ];

    if (recordIndex >= 0) {
      attemptsSheet
        .getRange(recordIndex + 2, 1, 1, ATTEMPT_HEADERS.length)
        .setValues([rowValues]);
    } else {
      attemptsSheet.appendRow(rowValues);
    }

    rebuildLeaderboard_();

    return {
      attemptId: rowValues[0],
      status,
      score,
      percentage,
    };
  });
}

function rebuildLeaderboard_() {
  const leaderboardSheet = getSheet_(LEADERBOARD_SHEET_NAME, LEADERBOARD_HEADERS);
  const attempts = getAttemptRecords_()
    .filter((item) => item.status === "submitted" || item.status === "timed_out")
    .map((item) => ({
      ...item,
      score: Number(item.score || 0),
      total_questions: Number(item.total_questions || 0),
      percentage: Number(item.percentage || 0),
      submitted_at: item.submitted_at || "",
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.percentage !== left.percentage) {
        return right.percentage - left.percentage;
      }

      return String(left.submitted_at).localeCompare(String(right.submitted_at));
    });

  const rows = [];
  let currentPosition = 0;
  let currentTieCount = 0;
  let previousScore = null;

  attempts.forEach((item, index) => {
    if (index === 0) {
      currentPosition = 1;
      currentTieCount = 1;
      previousScore = item.score;
    } else if (item.score === previousScore) {
      currentTieCount += 1;
    } else {
      currentPosition += Math.max(1, currentTieCount - 1);
      currentTieCount = 1;
      previousScore = item.score;
    }

    rows.push([
      currentPosition,
      item.full_name || "",
      item.email || "",
      item.province || "",
      item.zone || "",
      item.class_type || "",
      item.score,
      item.total_questions,
      item.percentage,
      item.status || "",
      item.submitted_at || "",
    ]);
  });

  leaderboardSheet.clearContents();
  leaderboardSheet.getRange(1, 1, 1, LEADERBOARD_HEADERS.length).setValues([LEADERBOARD_HEADERS]);

  if (rows.length) {
    leaderboardSheet.getRange(2, 1, rows.length, LEADERBOARD_HEADERS.length).setValues(rows);
  }
}

function getAttemptRecords_() {
  const sheet = getSheet_(ATTEMPTS_SHEET_NAME, ATTEMPT_HEADERS);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) {
    return [];
  }

  const headers = values[0];

  return values.slice(1).map((row) => {
    const record = {};

    headers.forEach((header, index) => {
      record[header] = row[index];
    });

    return record;
  });
}

function ensureSheets_() {
  getSheet_(ATTEMPTS_SHEET_NAME, ATTEMPT_HEADERS);
  getSheet_(LEADERBOARD_SHEET_NAME, LEADERBOARD_HEADERS);
}

function getSheet_(sheetName, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  const currentHeaders = headerRange.getValues()[0];
  const hasHeaders = headers.every((header, index) => currentHeaders[index] === header);

  if (!hasHeaders) {
    headerRange.setValues([headers]);
  }

  return sheet;
}

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function withSheetLock_(callback) {
  const lock = LockService.getDocumentLock();

  if (!lock.tryLock(10000)) {
    throw new Error("The quiz service is busy. Please try again in a few seconds.");
  }

  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function jsonOutput_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
