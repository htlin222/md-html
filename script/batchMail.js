function sendBulkEmails() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("main");
  if (!sheet) {
    Logger.log("找不到名為 'main' 的工作表");
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var columnIndexes = getColumnIndexes(headers);
  
  if (!validateRequiredColumns(columnIndexes)) return;
  
  for (var i = 1; i < data.length; i++) {
    var rowData = getRowData(headers, data[i]);
    updateProgress(sheet, i, columnIndexes, "處理中...");

    if (!isValidRecipient(rowData)) {
      updateProgress(sheet, i, columnIndexes, "無有效收件人");
      continue;
    }
    
    var recipientEmails = formatRecipients(rowData["recipient"]);
    Logger.log("準備發送郵件到: " + recipientEmails);

    var template = HtmlService.createTemplateFromFile("emailTemplate");
    populateTemplate(template, rowData);
    
    var htmlBody = generateHtml(template);
    if (!htmlBody) {
      updateProgress(sheet, i, columnIndexes, "渲染失敗");
      continue;
    }
    
    updateProgress(sheet, i, columnIndexes, "發送中...");
    
    if (!rowData["status"] && rowData["subject"]) {
      var emailSent = sendEmail(recipientEmails, rowData["subject"], htmlBody);
      if (emailSent) {
        sheet.getRange(i + 1, columnIndexes["status"] + 1).setValue(true); // ✅ 設置 status 為 true
      }
      updateProgress(sheet, i, columnIndexes, emailSent ? "發送成功" : "發送失敗");
    } else {
      updateProgress(sheet, i, columnIndexes, "已發送/無效");
    }
  }
}

function getColumnIndexes(headers) {
  var columnIndexes = {};
  headers.forEach((header, index) => {
    columnIndexes[header] = index;
  });
  return columnIndexes;
}

function validateRequiredColumns(columnIndexes) {
  if (columnIndexes["recipient"] === undefined || columnIndexes["subject"] === undefined) {
    Logger.log("標題行缺少必要欄位");
    return false;
  }
  return true;
}

function getRowData(headers, row) {
  var rowData = {};
  headers.forEach((header, index) => {
    rowData[header] = row[index];
  });
  return rowData;
}

function updateProgress(sheet, rowIndex, columnIndexes, status) {
  sheet.getRange(rowIndex + 1, columnIndexes["progress"] + 1).setValue(status);
  SpreadsheetApp.flush();
}

function isValidRecipient(rowData) {
  return rowData["recipient"] && typeof rowData["recipient"] === "string";
}

function formatRecipients(recipients) {
  return recipients.split(",").map(email => email.trim()).filter(email => email).join(",");
}

function populateTemplate(template, rowData) {
  Object.keys(rowData).forEach(key => {
    if (key.startsWith("content.")) {
      let variableName = key.replace("content.", "");
      template[variableName] = rowData[key] instanceof Date
        ? Utilities.formatDate(rowData[key], Session.getScriptTimeZone(), "yyyy-MM-dd")
        : rowData[key] || "";
    }
  });
}

function generateHtml(template) {
  try {
    var htmlBody = template.evaluate().getContent();
    if (!htmlBody || htmlBody.trim() === "") throw new Error("HTML 內容為空");
    Logger.log("成功生成 HTML 內容");
    return htmlBody;
  } catch (e) {
    Logger.log("HTML 渲染失敗: " + e.message);
    return null;
  }
}

function sendEmail(to, subject, htmlBody) {
  try {
    GmailApp.sendEmail(to, subject.trim(), "", { htmlBody: htmlBody.trim() });
    Logger.log("郵件發送成功: " + to);
    return true;
  } catch (e) {
    Logger.log("郵件發送失敗: " + e.message);
    return false;
  }
}

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("📧 寄信啦")
    .addItem("批次寄出💫", "sendBulkEmails")
    .addToUi();
}
