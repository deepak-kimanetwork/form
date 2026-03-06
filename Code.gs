// Google Apps Script
// Deploy this as a Web App to get the Webhook URL
// 1. Extensions > Apps Script
// 2. Paste this code into Code.gs
// 3. Deploy > New deployment > Select "Web app"
// 4. Set "Who has access" to "Anyone"
// 5. Copy the Web app URL and put it in backend .env as GOOGLE_SHEETS_WEBHOOK_URL

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
       const headers = ['Timestamp', 'Form ID', ...Object.keys(data.answers)];
       sheet.appendRow(headers);
    }
    
    // Get headers to match columns
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const rowData = headers.map(header => {
      if (header === 'Timestamp') return new Date().toISOString();
      if (header === 'Form ID') return data.formId;
      return data.answers[header] || '';
    });
    
    sheet.appendRow(rowData);
    
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({ 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
