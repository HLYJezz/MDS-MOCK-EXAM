/**
 * Receives question reports from the mock exam site and appends them to a sheet.
 *
 * Setup (about five minutes):
 *   1. Make a Google Sheet to hold the reports.
 *   2. In it: Extensions → Apps Script. Delete the sample code, paste this in, Save.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as:      Me
 *        Who has access:  Anyone
 *      Authorise it when asked, then copy the /exec URL it gives you.
 *   4. Put that URL in CONFIG.endpoint in assets/js/feedback.js and push.
 *
 * Re-deploy with "Manage deployments → edit → New version" after any change here,
 * otherwise the old code keeps running.
 */

/* The spreadsheet to write into. Filling this in is what makes the script work
   whether it lives inside the sheet (Extensions → Apps Script) or as a
   standalone project — getActiveSpreadsheet() returns nothing in the standalone
   case, which is the usual reason rows never appear. The id is the long part of
   the sheet's URL: docs.google.com/spreadsheets/d/<THIS BIT>/edit */
var SHEET_ID = '1-ibBrJvr76ZTwRqIYBGbagixJ3g6Qqx7QI5M9WxJC94';

var SHEET_NAME = 'Reports';

var HEADERS = [
  'Received', 'Sent at', 'Paper', 'Paper id', 'Question no.', 'Question id',
  'Problem', 'Comment', 'Name', 'Question', 'Options', 'Their answer',
  'Answer on file', 'Mode'
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);            // two reports at once must not overwrite a row
  try {
    var sheet = getSheet_();
    var d = JSON.parse(e.postData.contents);
    sheet.appendRow([
      new Date(),
      d.date ? new Date(d.date) : '',
      d.paperName || '',
      d.paper || '',
      d.questionNumber || '',
      d.questionId || '',
      d.issue || '',
      d.comment || '',
      d.name || '',
      d.stem || '',
      (d.options || []).join(' | '),
      d.givenAnswer || '',
      d.recordedAnswer || '',
      d.mode || ''
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Opening the /exec URL in a browser should say the endpoint is alive. */
function doGet() {
  try {
    var sheet = getSheet_();
    return json_({
      ok: true,
      sheet: sheet.getParent().getName(),
      tab: sheet.getName(),
      rows: Math.max(0, sheet.getLastRow() - 1)
    });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  var ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('No spreadsheet: set SHEET_ID at the top of this script.');
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
