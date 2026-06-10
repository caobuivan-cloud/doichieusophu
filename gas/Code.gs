function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Bảng Mã sheet
  var sheetRules = ss.getSheetByName("Bảng Mã Khách Hàng Chuẩn");
  if (!sheetRules) {
    sheetRules = ss.insertSheet("Bảng Mã Khách Hàng Chuẩn");
    sheetRules.appendRow(["Mã KH", "Email", "Tên Công Ty", "MST", "Địa Chỉ"]);
    sheetRules.getRange("A1:E1").setFontWeight("bold");
    sheetRules.setFrozenRows(1);
  }
  
  // Setup Log sheet
  var sheetLogs = ss.getSheetByName("Activity Log");
  if (!sheetLogs) {
    sheetLogs = ss.insertSheet("Activity Log");
    sheetLogs.appendRow(["Timestamp", "User Email", "Action Name", "Action Details"]);
    sheetLogs.getRange("A1:D1").setFontWeight("bold");
    sheetLogs.setFrozenRows(1);
  }
}

function doGet(e) {
  var action = e.parameter.action;
  
  if (action === "get_rules") {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Bảng Mã Khách Hàng Chuẩn");
    if (!sheet) {
      return createJsonResponse({ status: "error", message: "Không tìm thấy sheet Bảng Mã Khách Hàng Chuẩn" });
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse({ status: "success", data: [] });
    }
    
    var rulesData = data.slice(1); // Bỏ qua dòng header
    return createJsonResponse({ status: "success", data: rulesData });
  }
  
  return createJsonResponse({ status: "error", message: "Invalid action" });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "log") {
      var sheetLogs = ss.getSheetByName("Activity Log");
      if (!sheetLogs) {
        setupSheets();
        sheetLogs = ss.getSheetByName("Activity Log");
      }
      
      var timestamp = new Date();
      var user = body.user || "Unknown User";
      var actionName = body.actionName || "";
      var actionDetails = body.actionDetails || "";
      
      sheetLogs.appendRow([timestamp, user, actionName, actionDetails]);
      
      return createJsonResponse({ status: "success", message: "Log saved" });
    }
    
    if (action === "overwrite_rules") {
      var sheetRules = ss.getSheetByName("Bảng Mã Khách Hàng Chuẩn");
      if (!sheetRules) {
        setupSheets();
        sheetRules = ss.getSheetByName("Bảng Mã Khách Hàng Chuẩn");
      }
      
      var rules = body.rules || [];
      
      // Xóa dữ liệu cũ (chừa header)
      var lastRow = sheetRules.getLastRow();
      if (lastRow > 1) {
        sheetRules.getRange(2, 1, lastRow - 1, 5).clearContent();
      }
      
      // Ghi dữ liệu mới
      if (rules.length > 0) {
        sheetRules.getRange(2, 1, rules.length, rules[0].length).setValues(rules);
      }
      
      // Ghi log hành động overwrite này luôn để theo dõi
      var sheetLogs = ss.getSheetByName("Activity Log");
      if (sheetLogs) {
        var user = body.user || "Unknown User";
        sheetLogs.appendRow([new Date(), user, "OVERWRITE_RULES", "Đã lưu đè " + rules.length + " bản ghi khách hàng chuẩn."]);
      }
      
      return createJsonResponse({ status: "success", message: "Rules overwritten successfully" });
    }
    
    return createJsonResponse({ status: "error", message: "Unknown action" });
    
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function createJsonResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * HƯỚNG DẪN SỬ DỤNG (Dành cho Dev/Người dùng cuối):
 * 1. Mở Google Sheets mới.
 * 2. Vào Extensions (Tiện ích mở rộng) -> Apps Script (Tập lệnh).
 * 3. Dán toàn bộ đoạn code này vào file Code.gs.
 * 4. Chạy hàm `setupSheets` 1 lần (cấp quyền khi được hỏi) để tạo 2 sheet cơ bản.
 * 5. Bấm Deploy (Triển khai) -> New deployment (Triển khai mới).
 * 6. Chọn "Web app". 
 *    - Execute as (Thực thi dưới dạng): "Me" (Tôi).
 *    - Who has access (Ai có quyền truy cập): "Anyone" (Bất kỳ ai).
 * 7. Bấm Deploy, copy dòng "Web app URL" và đưa lại vào cấu hình hệ thống Đối Chiếu Sổ Phụ.
 */
