/**
 * CET Connect – read-only JSON API for the "Websites" sheet.
 * Bind this script to the spreadsheet (Extensions > Apps Script) and deploy as a web app.
 */
var SHEET_NAME = 'Websites';
var REQUIRED = ['Title', 'URL'];

function doGet() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) throw new Error('Worksheet "' + SHEET_NAME + '" was not found.');

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return json_({ updated: new Date().toISOString(), count: 0, resources: [] });

    var headers = values[0].map(function (h) { return String(h).trim(); });
    REQUIRED.forEach(function (h) {
      if (headers.indexOf(h) === -1) throw new Error('Missing column: ' + h);
    });

    var resources = [];
    for (var i = 1; i < values.length; i++) {
      var obj = {};
      headers.forEach(function (h, c) { obj[h] = format_(values[i][c]); });
      if (!obj.Title || !obj.URL) continue;                       // skip invalid rows
      if (String(obj.Status).toLowerCase() !== 'active') continue; // skip inactive
      obj.Featured = String(obj.Featured).toLowerCase() === 'true';
      resources.push(obj);
    }
    return json_({ updated: new Date().toISOString(), count: resources.length, resources: resources });
  } catch (err) {
    return json_({ error: String(err.message || err), resources: [] });
  }
}

function format_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : (typeof v === 'boolean' ? v : String(v).trim());
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
