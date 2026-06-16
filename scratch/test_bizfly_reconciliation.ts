import { reconcileBizfly } from "../src/utils/bizflyReconciliation";
import { BizflyCustomer } from "../src/utils/googleSheetsSync";

// 1. Mock BIZFLY Customer list (Projected structure)
const mockBizflyCustomers: BizflyCustomer[] = [
  {
    soPL: "PL-001",
    tenSale: "Nguyen Van A",
    nhanHang: "Brand Alpha",
    customerCode: "KH_ALPHA"
  },
  {
    soPL: "PL-002",
    tenSale: "Tran Thi B",
    nhanHang: "Brand Beta",
    customerCode: "KH_BETA"
  }
];

// 2. Mock File 2: Thông tin HD/PLHD
// Row index 3 (4th row) is header
const mockFile2Rows: any[][] = [
  [], [], [], // Padding rows
  ["STT", "Mã đơn hàng", "Số PL/ Mã đơn hàng", "Khách hàng", "...", "Diễn giải link tiền"], // Header at index 3
  [1, "ORD-101", "PL-001", "Client X", "...", "Thanh toán PL001 đầu kỳ"], // row 1
  [2, "ORD-102", "PL-002", "Client Y", "...", "Thanh toán cho PL002 tháng 6"] // row 2
];
// Fill empty elements up to index 58 (cột BG)
mockFile2Rows[4][58] = "Thanh toán PL001 đầu kỳ";
mockFile2Rows[5][58] = "Thanh toán cho PL002 tháng 6";

// 3. Mock File 1: Sổ chi tiết công nợ
// Header at row 6 (index 5), content from row 11 (index 10)
const mockFile1Rows: any[][] = [
  [], [], [], [], [],
  ["Ngày hạch toán", "Ngày ct", "Số chứng từ", "Diễn giải", "Tài khoản đối ứng", "Phát sinh nợ", "Phát sinh có"], // Header (index 5)
  [], [], [], [], // Padding to reach index 10
  ["15/06/2026", "15/06/2026", "PC-001", "Thanh toán PL001 đầu kỳ", "112", "0", "1,000,000"], // row 10 (content start) - Matched
  ["16/06/2026", "16/06/2026", "PC-002", "Thanh toán cho PL002 tháng 6", "112", "0", "2,500,000"], // row 11 - Matched
  ["17/06/2026", "17/06/2026", "PC-003", "Nạp tiền lẻ tẻ không khớp", "112", "0", "500,000"] // row 12 - Unmatched
];

console.log("--- CHẠY KIỂM THỬ THUẬT TOÁN ĐỐI SOÁT BIZFLY ---");
try {
  const result = reconcileBizfly(mockFile1Rows, mockFile2Rows, mockBizflyCustomers);
  
  if (result.length !== 3) {
    throw new Error(`Độ dài kết quả không đúng: Mong đợi 3, Nhận ${result.length}`);
  }

  // Row 0 check: should match PL-001
  const r0 = result[0];
  console.log("Kiểm tra dòng 1 (Khớp PL-001):");
  console.log(`- maKhach: ${r0.maKhach} (Mong đợi: KH_ALPHA)`);
  console.log(`- tenSale: ${r0.tenSale} (Mong đợi: Nguyen Van A)`);
  console.log(`- nhanHang: ${r0.nhanHang} (Mong đợi: Brand Alpha)`);
  console.log(`- matchType: ${r0.matchType} (Mong đợi: strict)`);
  if (r0.maKhach !== "KH_ALPHA" || r0.matchType !== "strict" || r0.tenSale !== "Nguyen Van A") {
    throw new Error("Lỗi đối soát dòng 1!");
  }

  // Row 1 check: should match PL-002
  const r1 = result[1];
  console.log("\nKiểm tra dòng 2 (Khớp PL-002):");
  console.log(`- maKhach: ${r1.maKhach} (Mong đợi: KH_BETA)`);
  console.log(`- matchType: ${r1.matchType} (Mong đợi: strict)`);
  if (r1.maKhach !== "KH_BETA" || r1.matchType !== "strict" || r1.tenSale !== "Tran Thi B") {
    throw new Error("Lỗi đối soát dòng 2!");
  }

  // Row 2 check: unmatched, should default to KH036906
  const r2 = result[2];
  console.log("\nKiểm tra dòng 3 (Không khớp -> Mã mặc định):");
  console.log(`- maKhach: ${r2.maKhach} (Mong đợi: KH036906)`);
  console.log(`- tenSale: "${r2.tenSale}" (Mong đợi: "")`);
  console.log(`- matchType: ${r2.matchType} (Mong đợi: unmatched)`);
  if (r2.maKhach !== "KH036906" || r2.matchType !== "unmatched" || r2.tenSale !== "") {
    throw new Error("Lỗi đối soát dòng 3!");
  }

  console.log("\n✅ TẤT CẢ CÁC BÀI KIỂM THỬ ĐỀU ĐÃ ĐẠT!");
} catch (e: any) {
  console.error("\n❌ KIỂM THỬ THẤT BẠI:", e.message || e);
  process.exit(1);
}
