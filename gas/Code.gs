function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Setup Bảng Mã sheet (Cloud)
  var sheetRules = ss.getSheetByName("Bảng Mã Khách Hàng Chuẩn");
  if (!sheetRules) {
    sheetRules = ss.insertSheet("Bảng Mã Khách Hàng Chuẩn");
    sheetRules.appendRow(["Mã KH", "Email", "Tên Công Ty", "MST", "Địa Chỉ"]);
    sheetRules.getRange("A1:E1").setFontWeight("bold");
    sheetRules.setFrozenRows(1);
  }

  // Setup Bảng Mã sheet BIZFLY (Read-Only)
  var sheetBizfly = ss.getSheetByName("Bảng Mã Khách Hàng BIZFLY");
  if (!sheetBizfly) {
    sheetBizfly = ss.insertSheet("Bảng Mã Khách Hàng BIZFLY");
    // Tạo dòng header tại dòng 2
    sheetBizfly.appendRow([]); // Dòng 1 trống
    
    // Ghi tiêu đề vào dòng 2 tại các cột A, B, C, D thay vì chừa trống nhiều cột
    sheetBizfly.getRange("A2").setValue("Số PL");
    sheetBizfly.getRange("B2").setValue("Tên sale");
    sheetBizfly.getRange("C2").setValue("Nhãn hàng/TK set-up dv");
    sheetBizfly.getRange("D2").setValue("Mã khách");
    sheetBizfly.getRange("A2:D2").setFontWeight("bold");
    sheetBizfly.setFrozenRows(2);
    
    // Ghi log cảnh báo sheet BIZFLY trống vừa tạo
    var sheetLogs = ss.getSheetByName("Activity Log");
    if (sheetLogs) {
      sheetLogs.appendRow([new Date(), "System", "WARNING", "Sheet Bảng Mã Khách Hàng BIZFLY mới được tự động tạo và hiện chưa có dữ liệu đối soát.", "Bizfly"]);
    }
  }
  
  // Setup Log sheet
  var sheetLogs = ss.getSheetByName("Activity Log");
  if (!sheetLogs) {
    sheetLogs = ss.insertSheet("Activity Log");
    sheetLogs.appendRow(["Timestamp", "User Email", "Action Name", "Action Details", "Phân hệ"]);
    sheetLogs.getRange("A1:E1").setFontWeight("bold");
    sheetLogs.setFrozenRows(1);
  } else {
    // Đảm bảo có tiêu đề cột E là "Phân hệ"
    var lastCol = sheetLogs.getLastColumn();
    if (lastCol < 5 || sheetLogs.getRange(1, 5).getValue() !== "Phân hệ") {
      sheetLogs.getRange(1, 5).setValue("Phân hệ");
      sheetLogs.getRange("E1").setFontWeight("bold");
    }
  }
}

// Cấu hình Allowlist tách biệt Read/Write để bảo vệ an toàn dữ liệu
var READ_ALLOWLIST = ["Bảng Mã Khách Hàng Chuẩn", "Bảng Mã Khách Hàng BIZFLY"];
var WRITE_ALLOWLIST = ["Bảng Mã Khách Hàng Chuẩn", "Bảng Mã Khách Hàng BIZFLY", "Activity Log"];

// Token xác thực ghi đè lấy từ PropertiesService
function getSharedWriteToken() {
  return PropertiesService.getScriptProperties().getProperty("SHARED_WRITE_TOKEN") || "default_token_please_change";
}

function doGet(e) {
  var action = e.parameter.action;
  var sheetName = e.parameter.sheetName || "Bảng Mã Khách Hàng Chuẩn";
  
  if (action === "get_rules") {
    // Kiểm tra sheetName có thuộc danh sách cho phép đọc hay không
    if (READ_ALLOWLIST.indexOf(sheetName) === -1) {
      return createJsonResponse({ status: "error", message: "Quyền đọc bị từ chối đối với sheet: " + sheetName });
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      // Nếu là BIZFLY và sheet chưa có, chạy setup và trả thành công nhưng cảnh báo rỗng
      if (sheetName === "Bảng Mã Khách Hàng BIZFLY") {
        setupSheets();
        return createJsonResponse({ 
          status: "success", 
          data: [], 
          warning: "Sheet Bảng Mã Khách Hàng BIZFLY mới được khởi tạo và chưa có dữ liệu. Vui lòng cập nhật trên Google Sheets." 
        });
      }
      return createJsonResponse({ status: "error", message: "Không tìm thấy sheet: " + sheetName });
    }
    
    var data = sheet.getDataRange().getValues();
    
    // Xử lý Cloud
    if (sheetName === "Bảng Mã Khách Hàng Chuẩn") {
      if (data.length <= 1) {
        return createJsonResponse({ status: "success", data: [] });
      }
      var rulesData = data.slice(1); // Loại bỏ 1 dòng header ở server
      return createJsonResponse({ status: "success", data: rulesData });
    }
    
    // Xử lý BIZFLY
    if (sheetName === "Bảng Mã Khách Hàng BIZFLY") {
      if (data.length <= 2) {
        return createJsonResponse({ 
          status: "success", 
          data: [], 
          warning: "Bảng mã BIZFLY không có dữ liệu thật (chỉ chứa header)." 
        });
      }
      
      // Loại bỏ 2 dòng header trên server (data.slice(2))
      var rawRows = data.slice(2);
      
      // Trích xuất trực tiếp từ 4 cột đầu (A=0, B=1, C=2, D=3)
      var projectedData = rawRows.map(function(row) {
        var soPL = row[0] ? String(row[0]).trim() : "";
        var tenSale = row[1] ? String(row[1]).trim() : "";
        var nhanHang = row[2] ? String(row[2]).trim() : "";
        var maKhach = row[3] ? String(row[3]).trim() : "";
        return [soPL, tenSale, nhanHang, maKhach];
      });
      
      return createJsonResponse({ status: "success", data: projectedData });
    }
  }
  
  return createJsonResponse({ status: "error", message: "Invalid action" });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var sheetName = body.sheetName || "Bảng Mã Khách Hàng Chuẩn";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Action append log (append-only): không yêu cầu check token để tránh mất log
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
      var section = body.section || "Cloud";
      
      // Giới hạn độ dài text log để chống spam
      if (actionDetails.length > 2000) {
        actionDetails = actionDetails.substring(0, 2000) + "... (bị cắt ngắn)";
      }
      
      sheetLogs.appendRow([timestamp, user, actionName, actionDetails, section]);
      return createJsonResponse({ status: "success", message: "Log saved" });
    }
    
    // Action overwrite (ghi đè): bắt buộc kiểm tra token và check allowlist
    if (action === "overwrite_rules") {
      if (WRITE_ALLOWLIST.indexOf(sheetName) === -1) {
        return createJsonResponse({ status: "error", message: "Quyền ghi bị từ chối đối với sheet: " + sheetName });
      }
      
      // Xác thực token ghi đè bảo vệ dữ liệu
      var clientToken = body.token || "";
      var serverToken = getSharedWriteToken();
      if (clientToken !== serverToken) {
        return createJsonResponse({ status: "error", message: "Token xác thực ghi đè không hợp lệ!" });
      }
      
      var sheetRules = ss.getSheetByName(sheetName);
      if (!sheetRules) {
        setupSheets();
        sheetRules = ss.getSheetByName(sheetName);
      }
      
      var rules = body.rules || [];
      var startRow = (sheetName === "Bảng Mã Khách Hàng BIZFLY") ? 3 : 2;
      
      // Xóa dữ liệu cũ (chừa header)
      var lastRow = sheetRules.getLastRow();
      var lastCol = sheetRules.getLastColumn() || 5;
      if (lastRow >= startRow) {
        sheetRules.getRange(startRow, 1, lastRow - startRow + 1, lastCol).clearContent();
      }
      
      // Ghi dữ liệu mới
      if (rules.length > 0) {
        sheetRules.getRange(startRow, 1, rules.length, rules[0].length).setValues(rules);
      }
      
      // Ghi log
      var sheetLogs = ss.getSheetByName("Activity Log");
      if (sheetLogs) {
        var user = body.user || "Unknown User";
        var section = (sheetName === "Bảng Mã Khách Hàng BIZFLY") ? "Bizfly" : "Cloud";
        sheetLogs.appendRow([new Date(), user, "OVERWRITE_RULES", "Đã lưu đè " + rules.length + " bản ghi khách hàng trên sheet " + sheetName, section]);
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
