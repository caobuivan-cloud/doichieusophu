import { BizflyCustomer } from "./googleSheetsSync";

// Bảng ánh xạ PROJECTED_API_COLUMN_MAP (dùng ở Frontend)
// Index: 
// 0: Số PL
// 1: Tên sale
// 2: Nhãn hàng/TK set-up dv
// 3: Mã khách

export interface BizflyReconciliationRow {
  id: string;
  originalIndex: number;
  date: string;
  referenceNo: string; // Số chứng từ từ File 1 (cột C)
  tien: number;       // Phát sinh Có từ File 1 (cột G)
  dienGiai: string;   // Diễn giải từ File 1 (cột D)
  soPL: string;       // Số PL/Mã đơn hàng tìm thấy từ File 2 hoặc rỗng
  tenSale: string;    // Tên sale từ bảng mã KH BIZFLY
  nhanHang: string;   // Nhãn hàng/TK set-up dv từ bảng mã KH BIZFLY
  maKhach: string;    // Mã khách hàng chuẩn (Matched hoặc mặc định KH020219)
  matchType: "strict" | "unmatched";
  confidence: number;
  reasoning: string;
}

/**
 * Hàm chuẩn hóa chuỗi để tăng độ chính xác khi so sánh khóa
 */
export function normalizeCompareKey(str: string): string {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Thuật toán đối soát BIZFLY 4 bước
 * 
 * Bước 1: Chuẩn bị dữ liệu File 1 (Sổ chi tiết công nợ)
 * Bước 2: Liên kết thông tin hợp đồng/đơn hàng từ File 2 (Thông tin HD/PLHD)
 * Bước 3: Tra cứu bảng mã khách hàng BIZFLY (Google Sheets)
 * Bước 4: Chuẩn bị dữ liệu xuất hạch toán
 */
export function reconcileBizfly(
  file1Rows: any[][],
  file2Rows: any[][],
  bizflyCustomers: BizflyCustomer[]
): BizflyReconciliationRow[] {
  console.log(`[BIZFLY RECONCILIATION] Bắt đầu đối soát với ${file1Rows.length} dòng File 1, ${file2Rows.length} dòng File 2, ${bizflyCustomers.length} mã khách hàng.`);

  // 1. Phân tích File 2 để tạo map: Diễn giải link tiền (Cột BG - index 58) -> Số PL/Mã đơn hàng (Cột C - index 2)
  // Header File 2 ở dòng 4 (index 3). Nội dung từ index 4 trở đi.
  const file2Map = new Map<string, string>();
  
  // Xác định hàng bắt đầu của File 2. Mặc định là sau dòng 4.
  // Ta sẽ quét qua 10 dòng đầu để xem có tiêu đề "diễn giải link tiền" hay tương tự, nếu không mặc định index 3 là header.
  let file2HeaderIdx = 3;
  for (let r = 0; r < Math.min(file2Rows.length, 10); r++) {
    const row = file2Rows[r];
    if (row && row.some(cell => String(cell || "").toLowerCase().includes("diễn giải link tiền") || String(cell || "").toLowerCase().includes("dien giai link tien"))) {
      file2HeaderIdx = r;
      break;
    }
  }

  for (let r = file2HeaderIdx + 1; r < file2Rows.length; r++) {
    const row = file2Rows[r];
    if (!row || row.length < 3) continue;
    
    // BG (Cột 59) -> Index 58, C (Cột 3) -> Index 2
    const linkTienCell = row[58];
    const soPLCell = row[2];
    
    if (linkTienCell) {
      const normalizedLinkTien = normalizeCompareKey(String(linkTienCell));
      const soPL = String(soPLCell || "").trim();
      if (normalizedLinkTien && soPL) {
        file2Map.set(normalizedLinkTien, soPL);
      }
    }
  }

  // 2. Phân tích File 1 (Sổ chi tiết công nợ)
  // Header ở dòng 6 (index 5). Nội dung từ dòng 11 trở đi (index 10).
  let file1HeaderIdx = 5;
  for (let r = 0; r < Math.min(file1Rows.length, 15); r++) {
    const row = file1Rows[r];
    if (row && row.some(cell => String(cell || "").toLowerCase().includes("diễn giải") || String(cell || "").toLowerCase().includes("dien giai"))) {
      file1HeaderIdx = r;
      break;
    }
  }
  
  // Dòng bắt đầu nội dung là index 10 (dòng 11), trừ khi dòng header được phát hiện muộn hơn.
  const contentStartIdx = Math.max(10, file1HeaderIdx + 1);
  const result: BizflyReconciliationRow[] = [];
  
  // Tạo Map tra cứu nhanh cho bảng mã khách hàng BIZFLY (Số PL -> BizflyCustomer)
  const customerMap = new Map<string, BizflyCustomer>();
  bizflyCustomers.forEach(cust => {
    if (cust.soPL) {
      customerMap.set(normalizeCompareKey(cust.soPL), cust);
    }
  });

  let counter = 0;

  for (let r = contentStartIdx; r < file1Rows.length; r++) {
    const row = file1Rows[r];
    if (!row || row.length === 0) continue;

    const dienGiai = String(row[3] || "").trim(); // Cột D (index 3)
    const ngayCt = String(row[0] || "").trim();   // Cột A (index 0)
    const refNo = String(row[2] || "").trim();     // Cột C (index 2)
    const phatSinhCoStr = String(row[6] || "0");   // Cột G (index 6)
    
    // Convert phát sinh Có sang số
    const phatSinhCo = parseFloat(phatSinhCoStr.replace(/,/g, ""));
    
    // Chỉ xử lý các dòng có phát sinh Có > 0 và Diễn giải không trống
    if (phatSinhCo > 0 && dienGiai) {
      counter++;
      const id = `bizfly-${r}-${counter}`;
      const normalizedDienGiai = normalizeCompareKey(dienGiai);
      
      // Bước 2 & 3: Tìm Số PL và tra cứu bảng mã khách
      let matchedSoPL = "";
      let matchedCust: BizflyCustomer | undefined = undefined;
      let matchType: "strict" | "unmatched" = "unmatched";
      let reasoning = "";

      // 2a. Tra cứu Số PL từ File 2 bằng Diễn giải
      const soPLFromFile2 = file2Map.get(normalizedDienGiai);
      if (soPLFromFile2) {
        matchedSoPL = soPLFromFile2;
        
        // 2b. Tra cứu thông tin trong Bảng mã BIZFLY bằng Số PL
        matchedCust = customerMap.get(normalizeCompareKey(matchedSoPL));
        if (matchedCust) {
          matchType = "strict";
          reasoning = `Khớp Số PL "${matchedSoPL}" từ File 2 và tìm thấy trong bảng mã BIZFLY.`;
        } else {
          reasoning = `Khớp Số PL "${matchedSoPL}" từ File 2 nhưng không tìm thấy Số PL này trong bảng mã khách BIZFLY. Tự động gán KH020219.`;
        }
      } else {
        reasoning = `Không tìm thấy Diễn giải hạch toán khớp trong File 2. Tự động gán KH020219.`;
      }

      // Điền thông tin dòng đối soát
      result.push({
        id,
        originalIndex: r,
        date: ngayCt,
        referenceNo: refNo,
        tien: phatSinhCo,
        dienGiai,
        soPL: matchedSoPL,
        tenSale: matchedCust?.tenSale || "",
        nhanHang: matchedCust?.nhanHang || "",
        maKhach: matchedCust?.customerCode || "KH020219", // Tự động gán mã mặc định KH020219
        matchType,
        confidence: matchType === "strict" ? 1.0 : 0.0,
        reasoning
      });
    }
  }

  console.log(`[BIZFLY RECONCILIATION] Kết thúc đối soát. Tổng số dòng lọc được: ${result.length}`);
  return result;
}
