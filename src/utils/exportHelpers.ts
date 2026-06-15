/**
 * Export helpers for 21-column Excel Giấy Báo Có template
 */

/**
 * Chuẩn hóa ngày chứng từ sang định dạng dd/MM/yyyy.
 * Hỗ trợ Date object, chuỗi ngày giờ, và số serial của Excel.
 */
export const normalizeDate = (val: any): string => {
  if (!val) {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }
  
  if (val instanceof Date) {
    return `${String(val.getDate()).padStart(2, '0')}/${String(val.getMonth() + 1).padStart(2, '0')}/${val.getFullYear()}`;
  }

  // Xử lý Excel serial number (ví dụ: 45323 hoặc "45323")
  const num = Number(val);
  if (!isNaN(num) && num > 10000 && num < 100000) {
    // Chuyển đổi Excel serial date sang JS Date (ngày gốc là 30/12/1899 do bug năm nhuận 1900 của Excel)
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  const str = String(val).trim();
  
  // Regex khớp định dạng dd/MM/yyyy hoặc dd-MM-yyyy (có thể có giờ phía sau)
  const match = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${day}/${month}/${year}`;
  }
  
  return str;
};

/**
 * Trích lọc email nằm trong dấu ngoặc đơn ở cột "Lý do nộp" (xóa cả dấu ngoặc đơn).
 * Giữ nguyên email tự do không có dấu ngoặc.
 */
export const cleanReason = (text: string | null | undefined): string => {
  if (!text) return "";
  // Chỉ loại bỏ email nằm trong dấu ngoặc đơn (xóa cả dấu ngoặc đơn và khoảng trắng liền trước nếu có)
  const cleaned = text.replace(/\s*\(\s*[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\s*\)/gi, "");
  return cleaned.replace(/\s+/g, " ").trim();
};

/**
 * Tự động tăng số chứng từ động dựa trên số bắt đầu và index dòng.
 * Hỗ trợ cả số thuần (ví dụ: "004774" -> "004775") và chữ+số (ví dụ: "GBC001" -> "GBC002").
 */
export const generateDocumentNumber = (startStr: string, index: number): string => {
  if (!startStr) return "";
  const match = startStr.match(/^(.*?)([0-9]+)$/);
  if (!match) return startStr; 
  
  const prefix = match[1];
  const suffixStr = match[2];
  const padLen = suffixStr.length;
  const startNum = parseInt(suffixStr, 10);
  if (isNaN(startNum)) return startStr;
  
  const nextNum = startNum + index;
  return prefix + nextNum.toString().padStart(padLen, "0");
};

/**
 * Parse tỷ giá từ chuỗi sang số lớn hơn 0, xử lý an toàn dấu phân cách hàng nghìn/thập phân locale.
 * Trả về null nếu không hợp lệ.
 */
export const parseExchangeRate = (val: any): number | null => {
  if (typeof val === 'number') return val > 0 ? val : null;
  if (!val || typeof val !== 'string') return null;
  const str = val.trim().replace(/\s+/g, "");
  if (!str) return null;

  const dots = (str.match(/\./g) || []).length;
  const commas = (str.match(/,/g) || []).length;

  let cleanStr = str;
  if (dots > 0 && commas > 0) {
    // Có cả . và , (ví dụ: 24,500.75 hoặc 24.500,75)
    const lastDot = str.lastIndexOf(".");
    const lastComma = str.lastIndexOf(",");
    if (lastDot > lastComma) {
      cleanStr = str.replace(/,/g, "");
    } else {
      cleanStr = str.replace(/\./g, "").replace(",", ".");
    }
  } else if (dots > 1) {
    // Nhiều chấm (ví dụ: 1.000.000) -> hàng nghìn
    cleanStr = str.replace(/\./g, "");
  } else if (commas > 1) {
    // Nhiều phẩy (ví dụ: 1,000,000) -> hàng nghìn
    cleanStr = str.replace(/,/g, "");
  } else if (dots === 1) {
    // 1 chấm duy nhất (ví dụ: 24.500 hoặc 1.25)
    const parts = str.split(".");
    if (parts[1].length === 3) {
      cleanStr = str.replace(".", "");
    } else {
      cleanStr = str;
    }
  } else if (commas === 1) {
    // 1 phẩy duy nhất (ví dụ: 24,500 hoặc 1,25)
    const parts = str.split(",");
    if (parts[1].length === 3) {
      cleanStr = str.replace(",", "");
    } else {
      cleanStr = str.replace(",", ".");
    }
  }

  const parsed = parseFloat(cleanStr);
  return isNaN(parsed) || parsed <= 0 ? null : parsed;
};
