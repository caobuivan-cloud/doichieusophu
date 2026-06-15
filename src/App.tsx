/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  Download,
  Search,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Edit2,
  Settings,
  Layers,
  ArrowRightLeft,
  Sliders,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Menu
} from "lucide-react";
import {
  sampleBankStatement,
  sampleCloudTracking,
  sampleAccountingCodes,
  BankTransaction,
  CloudRecord,
  AccountingCustomer
} from "./sampleData";

import { 
  pullCustomersFromGoogleSheet, 
  pushCustomersToGoogleSheet, 
  writeActionLogToSheet,
  DEFAULT_WEB_APP_URL,
  BizflyCustomer
} from "./utils/googleSheetsSync";
import {
  reconcileBizfly,
  BizflyReconciliationRow,
  normalizeCompareKey
} from "./utils/bizflyReconciliation";
import { getPortalUserEmail } from "./utils/portalAuth";
import {
  normalizeDate,
  cleanReason,
  generateDocumentNumber,
  parseExchangeRate
} from "./utils/exportHelpers";

interface ProcessedRow {
  id: string; // Unique id for list tracking
  originalIndex: number; // Index in the original bank statement
  date: string;
  referenceNo: string;
  tien: number;
  dienGiai: string;
  extractedEmail: string | null;
  resolvedEmail: string | null;
  cloudDescMatched: boolean;
  matchType: "strict" | "fuzzy" | "ai" | "unmatched" | "manual";
  confidence: number;
  reasoning: string;
  
  // 11 output columns for "GIẤY BÁO CÓ"
  tkCo: string;
  tenTkCo: string;
  maKhach: string;
  tenKhach: string;
  vuViec: string;
  boPhan: string;
  hopDong: string;
  bangKe: string;
  td2: string;
}
const CustomerCodeEditor = ({
  row,
  accountingCustomers,
  handleCellEdit,
  mode
}: {
  row: ProcessedRow;
  accountingCustomers: any[];
  handleCellEdit: (id: string, field: keyof ProcessedRow, val: any) => void;
  mode: "cloud" | "bizfly";
}) => {
  const [val, setVal] = useState(row.maKhach);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value;
    setVal(code);

    if (mode === "cloud") {
      const corresponding = (accountingCustomers as AccountingCustomer[]).find((c) => c.customerCode === code);
      if (corresponding) {
        handleCellEdit(row.id, "maKhach", code);
        handleCellEdit(row.id, "tenKhach", corresponding.companyName);
        if (corresponding.email) {
          handleCellEdit(row.id, "resolvedEmail", corresponding.email);
        }
      }
    } else {
      const corresponding = (accountingCustomers as BizflyCustomer[]).find((c) => c.customerCode === code);
      if (corresponding) {
        handleCellEdit(row.id, "maKhach", code);
        handleCellEdit(row.id, "tenKhach", corresponding.tenSale ? `${corresponding.tenSale} (${corresponding.nhanHang})` : "Khách hàng BIZFLY");
        handleCellEdit(row.id, "hopDong", corresponding.soPL);
        // Lưu các thuộc tính đặc thù BIZFLY để hạch toán diễn giải
        handleCellEdit(row.id, "bizflyTenSale" as any, corresponding.tenSale);
        handleCellEdit(row.id, "bizflyNhanHang" as any, corresponding.nhanHang);
      }
    }
  };

  const handleBlur = () => {
    if (val !== row.maKhach) {
      const corresponding = accountingCustomers.find((c) => c.customerCode === val);
      if (!corresponding) {
        handleCellEdit(row.id, "maKhach", val);
      }
    }
  };

  return (
    <input
      list="accounting-customers-list"
      value={val}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="Gõ mã hoặc tên KH..."
      className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 bg-white"
    />
  );
};

/* Virtual scrolling table for rendering 10k BIZFLY customer records smoothly */
const VirtualCustomerTable = ({
  customers,
  editingCustomerCode,
  editCustData,
  setEditingCustomerCode,
  setEditCustData,
  handleSaveCustomerEdit,
  handleStartEditingCustomer,
  handleDeleteCustomer,
}: {
  customers: BizflyCustomer[];
  editingCustomerCode: string | null;
  editCustData: Partial<BizflyCustomer>;
  setEditingCustomerCode: (val: string | null) => void;
  setEditCustData: (val: Partial<BizflyCustomer>) => void;
  handleSaveCustomerEdit: (code: string) => void;
  handleStartEditingCustomer: (cust: any) => void;
  handleDeleteCustomer: (code: string) => void;
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const itemHeight = 44; // Chiều cao mỗi hàng (px)
  const containerHeight = 500; // Chiều cao khung hiển thị (px)
  const totalItems = customers.length;
  const totalHeight = totalItems * itemHeight;
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };
  
  const buffer = 5;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const endIndex = Math.min(totalItems - 1, Math.floor((scrollTop + containerHeight) / itemHeight) + buffer);
  
  const visibleCustomers = React.useMemo(() => {
    return customers.slice(startIndex, endIndex + 1).map((cust, idx) => ({
      cust,
      absoluteIndex: startIndex + idx,
    }));
  }, [customers, startIndex, endIndex]);

  return (
    <div className="flex flex-col border border-slate-200 rounded overflow-hidden shadow-xs">
      {/* Table Header */}
      <div className="flex bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider py-3 px-3">
        <div className="w-12 text-center shrink-0">STT</div>
        <div className="w-32 shrink-0">Số PL</div>
        <div className="w-32 shrink-0">Tên Sale</div>
        <div className="flex-1 truncate">Nhãn hàng / TK setup</div>
        <div className="w-48 shrink-0">Mã Khách</div>
        <div className="w-24 text-center shrink-0">Thao tác</div>
      </div>
      
      {/* Scrollable Container */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className="overflow-y-auto relative bg-white"
        style={{ height: `${containerHeight}px` }}
      >
        {customers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-50 font-medium">
            Không tìm thấy bản ghi khách hàng nào phù hợp bộ lọc tìm kiếm.
          </div>
        ) : (
          <div style={{ height: `${totalHeight}px`, position: "relative" }}>
            <div 
              className="absolute left-0 right-0 top-0 divide-y divide-slate-100"
              style={{ transform: `translateY(${startIndex * itemHeight}px)` }}
            >
              {visibleCustomers.map(({ cust, absoluteIndex }) => {
                const isCustEditing = editingCustomerCode === cust.customerCode;
                
                return (
                  <div 
                    key={cust.customerCode + "-" + cust.soPL + "-" + absoluteIndex} 
                    className="flex hover:bg-slate-50/50 transition-colors items-center text-xs text-slate-700 px-3"
                    style={{ height: `${itemHeight}px` }}
                  >
                    {/* STT */}
                    <div className="w-12 text-center shrink-0 font-mono text-slate-400">
                      {absoluteIndex + 1}
                    </div>
                    
                    {/* Số PL */}
                    <div className="w-32 shrink-0 font-semibold font-mono text-slate-900 truncate pr-2" title={cust.soPL}>
                      {cust.soPL || "—"}
                    </div>
                    
                    {/* Tên Sale */}
                    <div className="w-32 shrink-0 font-medium text-slate-800 pr-2 truncate" title={cust.tenSale}>
                      {cust.tenSale || "—"}
                    </div>
                    
                    {/* Nhãn hàng */}
                    <div className="flex-1 truncate font-medium text-slate-600 pr-2" title={cust.nhanHang}>
                      {cust.nhanHang || "—"}
                    </div>
                    
                    {/* Mã khách */}
                    <div className="w-48 shrink-0 font-semibold font-mono text-slate-900 truncate pr-2">
                      {cust.customerCode}
                    </div>
                    
                    {/* Thao tác */}
                    <div className="w-24 shrink-0 text-center font-bold text-slate-400 italic text-[10px]">
                      Read-only
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [mode, setMode] = useState<"cloud" | "bizfly">("cloud");

  // Migration dữ liệu cũ an toàn (Task 2.2)
  React.useEffect(() => {
    try {
      const oldSaved = localStorage.getItem("accounting_customers");
      if (oldSaved && !localStorage.getItem("accounting_customers_cloud")) {
        localStorage.setItem("accounting_customers_cloud", oldSaved);
        if (localStorage.getItem("accounting_customers_cloud") === oldSaved) {
          localStorage.removeItem("accounting_customers");
          console.log("LocalStorage accounting_customers migrated successfully");
        }
      }
    } catch (e) {
      console.error("Migration error:", e);
    }
  }, []);

  // Main states for holding active accounting tables
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [cloudRecords, setCloudRecords] = useState<CloudRecord[]>([]);

  // States for BIZFLY files
  const [bizflyFile1, setBizflyFile1] = useState<string>("");
  const [bizflyFile2, setBizflyFile2] = useState<string>("");
  const [bizflyFile1Rows, setBizflyFile1Rows] = useState<any[][]>([]);
  const [bizflyFile2Rows, setBizflyFile2Rows] = useState<any[][]>([]);
  const [isParsingLoading, setIsParsingLoading] = useState<boolean>(false);

  // Tách biệt states cho Cloud và BIZFLY (Task 2.3)
  const [cloudCustomers, setCloudCustomers] = useState<AccountingCustomer[]>(() => {
    try {
      const saved = localStorage.getItem("accounting_customers_cloud");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading cloud customers:", e);
    }
    return sampleAccountingCodes;
  });

  const [bizflyCustomers, setBizflyCustomers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("accounting_customers_bizfly");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error loading bizfly customers:", e);
    }
    return [];
  });

  // Resolve dynamic customer state dựa trên mode để giữ khả năng tương thích ngược
  const accountingCustomers = useMemo(() => {
    return mode === "cloud" ? cloudCustomers : bizflyCustomers;
  }, [mode, cloudCustomers, bizflyCustomers]);

  const setAccountingCustomers = (data: any) => {
    if (mode === "cloud") {
      setCloudCustomers(data);
    } else {
      setBizflyCustomers(data);
    }
  };

  // Cache cloud
  React.useEffect(() => {
    try {
      localStorage.setItem("accounting_customers_cloud", JSON.stringify(cloudCustomers));
    } catch (e) {
      console.error("Error saving cloud customers to localStorage:", e);
    }
  }, [cloudCustomers]);

  // Cache BIZFLY có try/catch quota fallback (Task 2.4)
  React.useEffect(() => {
    try {
      localStorage.setItem("accounting_customers_bizfly", JSON.stringify(bizflyCustomers));
    } catch (e) {
      console.warn("Storage quota exceeded. BIZFLY customer cache fallback to React in-memory state.");
      // Lỗi quota: chỉ giữ in-memory state, không crash app
    }
  }, [bizflyCustomers]);

  // Selected file names for visual feedback
  const [bankFile, setBankFile] = useState<string>("");
  const [cloudFile, setCloudFile] = useState<string>("");
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [customerFile, setCustomerFile] = useState<string>(() => {
    return "Sẵn dùng trên app (Lưu trữ)";
  });

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [matchFilter, setMatchFilter] = useState<string>("all");

  // Global settings for credit notes
  const [globalTkCo, setGlobalTkCo] = useState("131");
  const [globalTenTkCo, setGlobalTenTkCo] = useState("Phải thu của khách hàng");
  const [globalVuViec, setGlobalVuViec] = useState("VV_CLOUD");
  const [globalBoPhan, setGlobalBoPhan] = useState("BP_VCCLOUD");

  // Export configurations for 21-column template (does not trigger recompute on preview grid)
  const [exportConfig, setExportConfig] = useState({
    dvcs: "HANOI",
    tkNo: "112104",
    maGd: "2",
    soCtStart: "",
    maNt: "VND",
    tyGia: "1",
    tkCo: "131",
    vuViec: "CLOUD",
    boPhan: "DIG.TRAN",
    maQuyen: "BC" + new Date().getFullYear()
  });

  // Detailed modal or inline editing state
  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  // AI State management
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Tab navigation state
  const [activeTab, setActiveTab] = useState<"reconciliation" | "customers" | "settings">("reconciliation");

  // Google Sheets integration state
  const [userEmail, setUserEmail] = useState<string>(() => {
    return localStorage.getItem("google_sheets_user_email") || "Kế toán viên";
  });

  // Auto-pull and parse email from AI Hub hash and IndexedDB
  React.useEffect(() => {
    // 1. Lấy email từ URL
    const hash = window.location.hash || window.location.search;
    const match = hash.match(/email=([^&]+)/);
    if (match && match[1]) {
      const email = decodeURIComponent(match[1]);
      setUserEmail(email);
      localStorage.setItem("google_sheets_user_email", email);
    } else {
      // 2. Thử lấy từ portal IndexedDB
      getPortalUserEmail().then((portalEmail) => {
        if (portalEmail) {
          setUserEmail(portalEmail);
          localStorage.setItem("google_sheets_user_email", portalEmail);
        } else {
          // Fallback nếu có lưu từ trước
          const savedEmail = localStorage.getItem("google_sheets_user_email");
          if (savedEmail) {
            setUserEmail(savedEmail);
          } else {
            setUserEmail("Kế toán viên");
          }
        }
      });
    }

    // 3. Auto-pull dữ liệu khi mở
    const cfgStr = localStorage.getItem("google_sheets_sync_auto_pull");
    const autoPull = cfgStr !== "false";
    const webAppUrl = DEFAULT_WEB_APP_URL;

    if (autoPull && webAppUrl) {
      pullCustomersFromGoogleSheet(webAppUrl, "Bảng Mã Khách Hàng Chuẩn").then(data => {
        if (data && data.length > 0) {
          setAccountingCustomers(data);
          console.log("Auto-pulled", data.length, "customers from Google Sheets");
        }
      });
    }
  }, []);

  // Automated auto-matching trigger state (Matching 1 + 2)
  const [isMatchedRun, setIsMatchedRun] = useState<boolean>(false);
  const [isMatchingLoading, setIsMatchingLoading] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showWarningConfirmModal, setShowWarningConfirmModal] = useState<boolean>(false);

  // Customer Master tab interactive search and customer management form
  const [searchCustomerQuery, setSearchCustomerQuery] = useState("");
  const [newCustCode, setNewCustCode] = useState("");
  const [newCustName, setNewCustName] = useState("");
  const [newCustEmail, setNewCustEmail] = useState("");
  const [newCustTax, setNewCustTax] = useState("");
  const [newCustAddress, setNewCustAddress] = useState("");

  // Customer inline editing support states
  const [editingCustomerCode, setEditingCustomerCode] = useState<string | null>(null);
  const [editCustData, setEditCustData] = useState<Partial<AccountingCustomer>>({});

  // Elegant Toast notification system (bypasses sandboxed window.alert blocks)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleModeChange = (newMode: "cloud" | "bizfly") => {
    setMode(newMode);
    
    // Reset states workflow (Task 2.5)
    setBankTransactions([]);
    setCloudRecords([]);
    setBankFile("");
    setCloudFile("");
    setBizflyFile1("");
    setBizflyFile2("");
    setBizflyFile1Rows([]);
    setBizflyFile2Rows([]);
    setMatchFilter("all");
    setSearchQuery("");
    setSearchCustomerQuery("");
    setCustomerPage(1);
    setManualRows({});
    setIsMatchedRun(false);
    
    // Reset exportConfig về giá trị mặc định của từng mode
    if (newMode === "cloud") {
      setExportConfig({
        dvcs: "HANOI",
        tkNo: "112104",
        maGd: "2",
        soCtStart: "",
        maNt: "VND",
        tyGia: "1",
        tkCo: "131",
        vuViec: "CLOUD",
        boPhan: "DIG.TRAN",
        maQuyen: "BC" + new Date().getFullYear()
      });
      showToast("Đã chuyển sang phân hệ CLOUD", "success");
    } else {
      setExportConfig({
        dvcs: "HANOI",
        tkNo: "112106",
        maGd: "2",
        soCtStart: "",
        maNt: "VND",
        tyGia: "1",
        tkCo: "131",
        vuViec: "BIZFLY",
        boPhan: "DIG.TRAN",
        maQuyen: "BC" + new Date().getFullYear()
      });
      showToast("Đã chuyển sang phân hệ BIZFLY", "success");

      // Tự động tải bảng mã khách hàng BIZFLY từ Google Sheets nếu danh bạ trống
      if (bizflyCustomers.length === 0) {
        const webAppUrl = DEFAULT_WEB_APP_URL;
        if (webAppUrl) {
          showToast("Đang tải danh bạ BIZFLY từ Google Sheets...", "info");
          pullCustomersFromGoogleSheet(webAppUrl, "Bảng Mã Khách Hàng BIZFLY").then(data => {
            if (data && data.length > 0) {
              setBizflyCustomers(data);
              showToast(`Đã tải thành công ${data.length} mã khách BIZFLY`, "success");
            } else {
              showToast("Bảng mã BIZFLY trống hoặc chưa cấu hình trên Sheets", "info");
            }
          }).catch(err => {
            console.error("Lỗi khi tải bảng mã BIZFLY:", err);
            showToast("Không thể kết nối đến Google Sheets", "error");
          });
        }
      }
    }
  };

  const handleSyncFromGoogleSheets = () => {
    const webAppUrl = DEFAULT_WEB_APP_URL;
    if (!webAppUrl) {
      showToast("Chưa cấu hình URL Web App Google Sheets", "error");
      return;
    }
    const targetSheet = mode === "cloud" ? "Bảng Mã Khách Hàng Chuẩn" : "Bảng Mã Khách Hàng BIZFLY";
    showToast(`Đang tải dữ liệu từ sheet "${targetSheet}"...`, "info");
    
    pullCustomersFromGoogleSheet(webAppUrl, targetSheet).then(data => {
      if (data && data.length > 0) {
        setAccountingCustomers(data);
        showToast(`Đã đồng bộ thành công ${data.length} mã khách từ Google Sheets`, "success");
        if (localStorage.getItem("google_sheets_sync_logs") !== "false") {
          writeActionLogToSheet(webAppUrl, userEmail, "Đồng Bộ Google Sheets", `Tải thành công ${data.length} mã từ ${targetSheet}`);
        }
      } else {
        showToast("Không tìm thấy dữ liệu hoặc lỗi kết nối Google Sheets", "error");
      }
    }).catch(err => {
      console.error(err);
      showToast("Lỗi kết nối khi đồng bộ: " + err.message, "error");
    });
  };

  // Pagination and filtering state for Customer database tab
  const [customerPage, setCustomerPage] = useState(1);
  const itemsPerPage = 15;

  const deferredSearchCustomerQuery = React.useDeferredValue(searchCustomerQuery);

  const filteredCustomers = useMemo(() => {
    const query = deferredSearchCustomerQuery.trim().toLowerCase();
    if (!query) return accountingCustomers;
    return accountingCustomers.filter((c) => {
      const codeMatch = c.customerCode?.toLowerCase().includes(query) || false;
      const nameMatch = (c.companyName || c.tenSale || "")?.toLowerCase().includes(query) || false;
      const emailMatch = (c.email || c.nhanHang || "")?.toLowerCase().includes(query) || false;
      const taxMatch = (c.taxCode || c.soPL || "")?.toLowerCase().includes(query) || false;
      const addressMatch = (c.address || "")?.toLowerCase().includes(query) || false;
      return codeMatch || nameMatch || emailMatch || taxMatch || addressMatch;
    });
  }, [accountingCustomers, deferredSearchCustomerQuery]);

  const totalCustomerPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;

  const paginatedCustomers = useMemo(() => {
    const startIndex = (customerPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, customerPage]);

  // Active trigger for running Matching 1 + Matching 2 manually list-wide
  const handlePerformAutomatedMatching = () => {
    setIsMatchingLoading(true);
    setTimeout(() => {
      setIsMatchingLoading(false);
      setIsMatchedRun(true);
    }, 600); // Friendly visual delay to notice the computation running
  };

  // Add standard new customer record
  const handleAddCustomer = () => {
    if (!newCustCode.trim() || !newCustName.trim() || !newCustEmail.trim()) {
      showToast("Vui lòng nhập đầy đủ Mã KH, Tên công ty ứng với Email đối chiếu!", "error");
      return;
    }

    // Check duplicate code
    const isDuplicate = accountingCustomers.some(
      (c) => c.customerCode.trim().toLowerCase() === newCustCode.trim().toLowerCase()
    );
    if (isDuplicate) {
      showToast(`Mã KH "${newCustCode}" đã tồn tại trong danh bạ.`, "error");
      return;
    }

    const newCust: AccountingCustomer = {
      customerCode: newCustCode.trim().toUpperCase(),
      companyName: newCustName.trim(),
      email: newCustEmail.trim(),
      taxCode: newCustTax.trim() || "Chưa cập nhật",
      address: newCustAddress.trim() || "Chưa cập nhật",
    };

    setAccountingCustomers((prev) => [newCust, ...prev]);
    showToast("Đã thêm Mã KH mới thành công!", "success");

    if (localStorage.getItem("google_sheets_sync_logs") !== "false") {
      writeActionLogToSheet(DEFAULT_WEB_APP_URL, userEmail, "Thêm Mã Khách Hàng", `Thêm mới mã ${newCust.customerCode} (${newCust.companyName})`);
    }
    
    // Clear inputs back
    setNewCustCode("");
    setNewCustName("");
    setNewCustEmail("");
    setNewCustTax("");
    setNewCustAddress("");
  };

  // Delete customer record from catalog
  const handleDeleteCustomer = (code: string) => {
    setAccountingCustomers((prev) => prev.filter((c) => c.customerCode !== code));
    showToast(`Đã xóa Mã KH "${code}" thành công!`, "success");

    if (localStorage.getItem("google_sheets_sync_logs") !== "false") {
      writeActionLogToSheet(DEFAULT_WEB_APP_URL, userEmail, "Xóa Mã Khách Hàng", `Đã xóa mã ${code}`);
    }
  };

  // Clear entire customer list
  const handleClearAllCustomers = () => {
    setAccountingCustomers([]);
    setCustomerFile("Chưa nạp hoặc trống");
    showToast("Đã xóa sạch toàn bộ mã khách khỏi danh bạ chuẩn!", "success");

    if (localStorage.getItem("google_sheets_sync_logs") !== "false") {
      writeActionLogToSheet(DEFAULT_WEB_APP_URL, userEmail, "Xóa Sạch Bảng Mã", "Đã xóa toàn bộ dữ liệu bảng mã cục bộ");
    }
  };

  // Begin inline customer editing
  const handleStartEditingCustomer = (cust: AccountingCustomer) => {
    setEditingCustomerCode(cust.customerCode);
    setEditCustData({ ...cust });
  };

  // Save inline customer editing changes
  const handleSaveCustomerEdit = (code: string) => {
    if (!editCustData.companyName?.trim() || !editCustData.email?.trim()) {
      showToast("Tên và Email không được để trống!", "error");
      return;
    }
    setAccountingCustomers((prev) =>
      prev.map((c) => (c.customerCode === code ? { ...c, ...editCustData } : c))
    );
    showToast("Đã cập nhật thông tin thành công!", "success");
    setEditingCustomerCode(null);

    if (localStorage.getItem("google_sheets_sync_logs") !== "false") {
      writeActionLogToSheet(DEFAULT_WEB_APP_URL, userEmail, "Cập nhật Mã Khách Hàng", `Sửa thông tin mã ${code}`);
    }
  };

  // Load sample dataset
  const handleLoadSample = () => {
    setBankTransactions(sampleBankStatement);
    setCloudRecords(sampleCloudTracking);
    setAccountingCustomers(sampleAccountingCodes);
    setBankFile("Sổ phụ ngân hàng_Mẫu Vccloud.xlsx");
    setCloudFile("File theo dõi dịch vụ Cloud_Mẫu Vccloud.xlsx");
    setCustomerFile("Bảng mã khách hàng kế toán_Mẫu Vccloud.xlsx");
    setIsMatchedRun(false); // Let them click the shiny Match button!
  };

  // Helper: Reset all tables (does not delete persistent company/customer list)
  const handleReset = () => {
    setBankTransactions([]);
    setCloudRecords([]);
    setBankFile("");
    setCloudFile("");
    setEditingRowId(null);
    setSearchQuery("");
    setIsMatchedRun(false); // reset button status
  };

  // Parsing algorithms for uploaded excel sheets
  const handleExcelUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "bank" | "cloud" | "customer" | "bizfly_file1" | "bizfly_file2"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (Max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast("Kích thước file vượt quá giới hạn 10MB. Vui lòng rút gọn file.", "error");
      return;
    }

    setIsParsingLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

        if (rawJson.length === 0) {
          showToast("File Excel trống hoặc không có dòng dữ liệu hợp lệ.", "error");
          setIsParsingLoading(false);
          return;
        }

        if (type === "bank") {
          setBankFile(file.name);
          parseBankStatement(rawJson);
          showToast(`Đã hạch toán thành công file Sổ phụ: ${file.name}`, "success");
        } else if (type === "cloud") {
          setCloudFile(file.name);
          parseCloudRecords(rawJson);
          showToast(`Đã nạp thành công file theo dõi Cloud: ${file.name}`, "success");
        } else if (type === "bizfly_file1") {
          setBizflyFile1(file.name);
          setBizflyFile1Rows(rawJson);
          showToast(`Đã nạp sổ công nợ BIZFLY: ${file.name}`, "success");
        } else if (type === "bizfly_file2") {
          setBizflyFile2(file.name);
          setBizflyFile2Rows(rawJson);
          showToast(`Đã nạp file HD/PLHD BIZFLY: ${file.name}`, "success");
        } else if (type === "customer") {
          setCustomerFile(file.name);
          const newCustomers = parseCustomerCodes(rawJson);
          showToast(`Đã cập nhật danh bạ khách chuẩn từ file: ${file.name}`, "success");
          
          // Tự động đồng bộ lên Google Sheets
          pushCustomersToGoogleSheet(newCustomers, DEFAULT_WEB_APP_URL, userEmail).then(() => {
            showToast("Đã đồng bộ lên Google Sheets thành công!", "success");
          }).catch(err => {
            console.error("Lỗi đồng bộ", err);
            showToast("Đã xảy ra lỗi khi đồng bộ lên Google Sheets.", "error");
          });
        }
      } catch (err: any) {
        console.error(err);
        showToast(`Đọc file Excel thất bại: ${err.message || err}`, "error");
      } finally {
        setIsParsingLoading(false);
      }
    };
    reader.onerror = () => {
      showToast("Đọc file Excel thất bại.", "error");
      setIsParsingLoading(false);
    };
    reader.readAsBinaryString(file);
  };

  // Parse Bank Statement sheet (looking for Có/Credit column index)
  const parseBankStatement = (rows: any[][]) => {
    // We search for standard bank headers to find the START row
    let headerRowIndex = -1;
    
    // Fixed columns from user: Cột F (Index 5) là Diễn giải
    // We retain defaults for others (Date: 1, Ref: 2, Credit: 7) unless detected
    let colIndices = { date: -1, ref: -1, desc: 5, credit: -1 };

    // Traverse first 25 rows to locate header row
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const row = rows[r];
      if (!row) continue;
      const creditIdx = row.findIndex((cell) => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().trim();
        return s === "có" || s === "co" || s === "có/credit" || s === "co/credit" || s === "credit" || s === "phát sinh có" || s === "phat sinh co";
      });

      if (creditIdx !== -1) {
        headerRowIndex = r;
        colIndices.credit = creditIdx;
        
        // Find other columns, but keep desc fixed at 5 (Cột F)
        row.forEach((cell, idx) => {
          if (!cell) return;
          const s = String(cell).toLowerCase().trim();
          if (s.includes("ngày") || s.includes("ngay") || s.includes("date")) colIndices.date = idx;
          else if (s.includes("bút toán") || s.includes("but toan") || s.includes("reference") || s.includes("ref")) colIndices.ref = idx;
        });
        break;
      }
    }

    // Default column fallbacks if headers are not found
    if (headerRowIndex === -1) {
      headerRowIndex = 11; // Standard row starting in the photo
      colIndices = { date: 1, ref: 2, desc: 5, credit: 7 };
    }

    const cleaned: BankTransaction[] = [];
    let counter = 1;

    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const dateStr = String(row[colIndices.date] || "").trim();
      const refStr = String(row[colIndices.ref] || "").trim();
      const descStr = String(row[colIndices.desc] || "").trim();
      const creditVal = parseFloat(String(row[colIndices.credit] || "0").replace(/,/g, ""));

      // Only import transaction with a valid Credit amount (phát sinh Có) > 0
      if (creditVal > 0 && descStr) {
        cleaned.push({
          stt: counter++,
          date: dateStr,
          referenceNo: refStr,
          payer: String(row[3] || "").trim(),
          bankName: String(row[4] || "").trim(),
          description: descStr,
          debit: 0,
          credit: creditVal,
          balance: parseFloat(String(row[8] || "0").replace(/,/g, "")),
        });
      }
    }

    setBankTransactions(cleaned);
  };

  // Parse Cloud Tracking table
  const parseCloudRecords = (rows: any[][]) => {
    let headerRowIndex = 0;
    
    // Fixed columns from user: 
    // Diễn giải Cloud = Cột D (Index 3)
    // Email Cloud = Cột G (Index 6)
    // Giữ nguyên số tiền mặc định là cột E (Index 4) nếu không quét thấy
    let colIndices = { description: 3, amount: 4, email: 6 };

    // Traverse top rows to locate header row just to know where data starts
    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row) continue;
      
      const hasHeader = row.some((cell) => {
        if (!cell) return false;
        const s = String(cell).toLowerCase().trim();
        return s.includes("email") || s.includes("diễn giải") || s.includes("dien giai");
      });

      if (hasHeader) {
        headerRowIndex = r;
        // Optionally detect amount column if it moved, but keep fixed for desc and email
        row.forEach((cell, idx) => {
          if (!cell) return;
          const s = String(cell).toLowerCase().trim();
          if (s.includes("tiền") || s.includes("tien") || s.includes("amount")) colIndices.amount = idx;
        });
        break;
      }
    }

    const cleaned: CloudRecord[] = [];
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;
      
      const email = String(row[colIndices.email] || "").trim();
      const desc = String(row[colIndices.description] || "").trim();
      const amount = parseFloat(String(row[colIndices.amount] || "0").replace(/,/g, ""));

      if (email || desc) {
        cleaned.push({
          stt: cleaned.length + 1,
          date: String(row[1] || "").trim(),
          month: parseInt(String(row[2] || "0")),
          description: desc,
          amount: amount,
          paymentMethod: String(row[5] || "").trim(),
          email: email,
          processedDate: String(row[8] || "").trim(),
        });
      }
    }

    // Xử lý dữ liệu: Fill các ô email bị trống dựa trên diễn giải giống nhau
    const descToEmailMap = new Map<string, string>();
    // Lần 1: Lưu lại email đầu tiên không trống của mỗi diễn giải
    for (const rec of cleaned) {
      if (rec.email && rec.description) {
        const cleanDesc = cleanCompareText(rec.description);
        if (!descToEmailMap.has(cleanDesc)) {
          descToEmailMap.set(cleanDesc, rec.email);
        }
      }
    }

    // Lần 2: Cập nhật lại email cho các dòng bị trống
    for (const rec of cleaned) {
      if (!rec.email && rec.description) {
        const cleanDesc = cleanCompareText(rec.description);
        const mappedEmail = descToEmailMap.get(cleanDesc);
        if (mappedEmail) {
          rec.email = mappedEmail;
        }
      }
    }

    setCloudRecords(cleaned);
  };

  // Parse Accounting Clients map
  const parseCustomerCodes = (rows: any[][]) => {
    let headerRowIndex = 0;
    let colIndices = { email: 0, name: 1, address: 2, tax: 3, code: 4 };

    for (let r = 0; r < Math.min(rows.length, 10); r++) {
      const row = rows[r];
      if (!row) continue;
      const codeIdx = row.findIndex(
        (cell) => cell && (String(cell).toLowerCase().includes("mã kh") || String(cell).toLowerCase().includes("ma kh") || String(cell).toLowerCase() === "mã" || String(cell).toLowerCase() === "ma")
      );
      if (codeIdx !== -1) {
        headerRowIndex = r;
        colIndices.code = codeIdx;
        row.forEach((cell, idx) => {
          if (!cell) return;
          const s = String(cell).toLowerCase().trim();
          if (s.includes("email")) colIndices.email = idx;
          else if (s.includes("tên") || s.includes("ten") || s.includes("công ty") || s.includes("cong ty")) colIndices.name = idx;
          else if (s.includes("địa chỉ") || s.includes("dia chi")) colIndices.address = idx;
          else if (s.includes("mst") || s.includes("thuế") || s.includes("thue")) colIndices.tax = idx;
        });
        break;
      }
    }

    const cleaned: AccountingCustomer[] = [];
    for (let r = headerRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const code = String(row[colIndices.code] || "").trim();
      const email = String(row[colIndices.email] || "").trim();
      const name = String(row[colIndices.name] || "").trim();

      if (code || email) {
        cleaned.push({
          email: email,
          companyName: name,
          address: String(row[colIndices.address] || "").trim(),
          taxCode: String(row[colIndices.tax] || "").trim(),
          customerCode: code,
        });
      }
    }
    setAccountingCustomers(cleaned);
    return cleaned;
  };

  // 1. Regular Expressions for Extracting Email Identities
  const extractEmailFromText = (text: string): string | null => {
    if (!text) return null;

    // Direct match: standard email pattern
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const matches = text.match(emailRegex);
    if (matches && matches.length > 0) {
      return matches[0].toLowerCase().trim();
    }

    // Fuzzy clean alignment: e.g. "minhle91719gmailcom" or "nguyenthedan0101982 gmail com"
    // Handle space patterns inside typical provider domains
    const spaceEmailMatch = text.match(/([a-zA-Z0-9._%+-]+)\s*(?:gmail|cocc)\s*(?:com|vn)/i);
    if (spaceEmailMatch) {
      const handle = spaceEmailMatch[1].replace(/\s+/g, "");
      const fullText = spaceEmailMatch[0].toLowerCase().replace(/\s+/g, "");
      if (fullText.includes("gmail")) {
        return `${handle}@gmail.com`;
      } else if (fullText.includes("cocc")) {
        return `${handle}@cocc.vn`;
      }
    }

    // Direct sticky alphanumeric domains: "minhle91719gmailcom"
    const stickyMatch = text.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (stickyMatch.includes("gmailcom")) {
      const handle = stickyMatch.substring(0, stickyMatch.indexOf("gmailcom"));
      if (handle.length > 2) return `${handle}@gmail.com`;
    } else if (stickyMatch.includes("coccvn")) {
      const handle = stickyMatch.substring(0, stickyMatch.indexOf("coccvn"));
      if (handle.length > 2) return `${handle}@cocc.vn`;
    }

    return null;
  };

  // 2. Extractor of contract code from description (e.g. HĐ-3392, HD2026...)
  const extractContractCode = (text: string): string => {
    if (!text) return "";
    const contractRegex = /(?:HD|HĐ|HDONG|HỢP ĐỒNG|HOP DONG)[\s\-–\/#]*([A-Z0-9\/_\-]+)/i;
    const match = text.match(contractRegex);
    if (match && match[1]) {
      // Avoid raw words or generic terms
      const possibleCode = match[1].trim();
      if (possibleCode.length >= 2 && !/^(TIEN|NAP|DICH|VU|TAI)$/i.test(possibleCode)) {
        return `HĐ-${possibleCode}`;
      }
    }
    return "";
  };

  // Helper to normalize username characters to ignore dots or casing
  // e.g., minhle.91719@gmail.com and minhle91719@gmail.com align perfectly
  const normalizeEmail = (email: string | null): string => {
    if (!email) return "";
    const parts = email.toLowerCase().trim().split("@");
    if (parts.length < 2) return parts[0];
    const username = parts[0].replace(/[^a-z0-9]/g, ""); // strip dots/points
    const domain = parts[1];
    return `${username}@${domain}`;
  };
  
  // Helper to normalize general text comparison by stripping extra spacing, tabs, non-breaking spaces, and ignore case
  const cleanCompareText = (text: string | null | undefined): string => {
    if (!text) return "";
    return String(text)
      .toLowerCase()
      .replace(/[\u00A0\s]+/g, " ") // normalize whitespace, replacing tabs/NBSP with normal space
      .trim();
  };

  // State variable to store manual edits mapped by row ID
  const [manualRows, setManualRows] = useState<Record<string, Partial<ProcessedRow>>>({});

  // 3. Main processing pipeline generating GIẤY BÁO CÓ
  const processedRows = useMemo<ProcessedRow[]>(() => {
    if (mode === "bizfly") {
      if (bizflyFile1Rows.length === 0) return [];

      const reconciled = isMatchedRun
        ? reconcileBizfly(bizflyFile1Rows, bizflyFile2Rows, bizflyCustomers)
        : bizflyFile1Rows.slice(Math.max(10, bizflyFile1Rows.findIndex(row => row && row.some(cell => String(cell || "").toLowerCase().includes("diễn giải")))) + 1).map((row, rIdx) => {
            const dienGiai = String(row[3] || "").trim();
            const ngayCt = String(row[1] || "").trim();
            const refNo = String(row[2] || "").trim();
            const phatSinhCoStr = String(row[6] || "0");
            const phatSinhCo = parseFloat(phatSinhCoStr.replace(/,/g, ""));

            return {
              id: `bizfly-pre-${rIdx}`,
              originalIndex: rIdx,
              date: ngayCt,
              referenceNo: refNo,
              tien: phatSinhCo,
              dienGiai,
              soPL: "",
              tenSale: "",
              nhanHang: "",
              maKhach: "KH_CHUA_PHAN_LOAI",
              matchType: "unmatched" as const,
              confidence: 0.0,
              reasoning: "Chờ chạy đối soát hạch toán BIZFLY"
            };
          }).filter(r => r.tien > 0 && r.dienGiai);

      return reconciled.map((item) => {
        const hasManualOverride = manualRows[item.id];

        const computed: ProcessedRow = {
          id: item.id,
          originalIndex: item.originalIndex,
          date: item.date,
          referenceNo: item.referenceNo,
          tien: item.tien,
          dienGiai: item.dienGiai,
          extractedEmail: null,
          resolvedEmail: null,
          cloudDescMatched: false,
          matchType: item.matchType,
          confidence: item.confidence,
          reasoning: item.reasoning,

          tkCo: exportConfig.tkCo,
          tenTkCo: globalTenTkCo,
          maKhach: item.maKhach,
          tenKhach: item.tenSale ? `${item.tenSale} (${item.nhanHang})` : (item.maKhach === "KH020219" ? "Khách hàng Bizfly lẻ" : "Khách hàng Bizfly"),
          vuViec: exportConfig.vuViec,
          boPhan: exportConfig.boPhan,
          hopDong: item.soPL,
          bangKe: "",
          td2: "",
        };

        // Inject BIZFLY specific fields on the record for easy export lookup
        (computed as any).bizflyNhanHang = item.nhanHang;
        (computed as any).bizflyTenSale = item.tenSale;

        if (hasManualOverride) {
          const manualTarget = { ...computed, ...hasManualOverride };

          // Tra cứu động nếu thay đổi mã khách hàng thủ công
          if (hasManualOverride.maKhach !== undefined && hasManualOverride.tenKhach === undefined) {
            const matchingCust = bizflyCustomers.find((c) => c.customerCode === hasManualOverride.maKhach);
            if (matchingCust) {
              manualTarget.tenKhach = matchingCust.tenSale ? `${matchingCust.tenSale} (${matchingCust.nhanHang})` : "Khách hàng BIZFLY";
              manualTarget.hopDong = matchingCust.soPL;
              (manualTarget as any).bizflyNhanHang = matchingCust.nhanHang;
              (manualTarget as any).bizflyTenSale = matchingCust.tenSale;
            }
          }

          return {
            ...manualTarget,
            matchType: hasManualOverride.matchType || "manual"
          };
        }

        return computed;
      });
    }

    // CLOUD MODE
    if (bankTransactions.length === 0) return [];

    return bankTransactions.map((bankObj) => {
      const id = `row-${bankObj.stt}`;
      const hasManualOverride = manualRows[id];

      // Extraction and standard detection
      const textDesc = bankObj.description;
      const extractedEmail = extractEmailFromText(textDesc);

      // We determine the resolved email (Matching 1 step)
      let resolvedEmail: string | null = null;
      let cloudDescMatched = false;
      let step1Reason = "";

      // Matching 2 step: Using resolvedEmail, find matching client in database
      let matchedCust: AccountingCustomer | null = null;
      let matchType: ProcessedRow["matchType"] = "unmatched";
      let step2Reason = "";
      let confidence = 0.0;

      // Allow complete manual override of the resolved email
      if (hasManualOverride && hasManualOverride.resolvedEmail !== undefined) {
        resolvedEmail = hasManualOverride.resolvedEmail;
        step1Reason = resolvedEmail ? `Kế toán gán Email thủ công: ${resolvedEmail}` : "Kế toán xóa Email đối chiếu";
      } else if (isMatchedRun) {
        // Look up by perfect description match in Cloud Tracking (Matching 1)
        const cleanBkDesc = cleanCompareText(textDesc);

        let cloudMatch = cloudRecords.find((rec) => {
          if (!rec.description) return false;
          const cleanClDesc = cleanCompareText(rec.description);
          return cleanClDesc === cleanBkDesc;
        });

        if (cloudMatch && cloudMatch.email) {
          resolvedEmail = cloudMatch.email.trim();
          cloudDescMatched = true;
          step1Reason = `Khớp diễn giải Cloud -> Email: ${cloudMatch.email}`;
        } else if (extractedEmail) {
          // If no Cloud match is found, fallback to directly extracted email from the bank statement text
          resolvedEmail = extractedEmail;
          step1Reason = `Tìm thấy Email trực tiếp trong diễn giải: ${extractedEmail}`;
        } else {
          resolvedEmail = null;
          step1Reason = "Chưa tìm thấy Email đối chiếu từ File Cloud hoặc mô tả.";
        }
      } else {
        step1Reason = "Chờ hạch toán đối chiếu";
      }

      if (hasManualOverride && hasManualOverride.maKhach !== undefined) {
        // Handled via manualTarget
      } else if (isMatchedRun) {
        // We look for strict match on resolvedEmail if present
        if (resolvedEmail) {
          const normalizedRes = normalizeEmail(resolvedEmail);
          
          // Exact match on email against customer database
          matchedCust = (accountingCustomers as AccountingCustomer[]).find(
            (c) => normalizeEmail(c.email) === normalizedRes
          ) || null;

          if (matchedCust) {
            matchType = "strict";
            confidence = 1.0;
            step2Reason = `Khớp Mã KH từ Email đối chiếu: ${matchedCust.customerCode}`;
          }
        }

        // Secondary backup: scan description text for Customer Code or Company Name
        if (!matchedCust) {
          const cleanBkDesc = cleanCompareText(textDesc);
          
          for (const cust of (accountingCustomers as AccountingCustomer[])) {
            // First check customer code
            if (cust.customerCode && cust.customerCode.trim()) {
              const cleanCode = cleanCompareText(cust.customerCode);
              if (cleanCode.length >= 3 && cleanBkDesc.includes(cleanCode)) {
                matchedCust = cust;
                matchType = "fuzzy";
                confidence = 0.95;
                if (cust.email) resolvedEmail = cust.email.trim();
                step2Reason = `Khớp Mã KH [${cust.customerCode}] trực tiếp trong Diễn giải`;
                break;
              }
            }
            
            // Then check company name / project name
            if (cust.companyName && cust.companyName.trim()) {
              const cleanCompanyName = cleanCompareText(cust.companyName);
              // Avoid too-short terms like "cty", "tnhh", "vcc"
              if (cleanCompanyName.length >= 5 && cleanBkDesc.includes(cleanCompanyName)) {
                matchedCust = cust;
                matchType = "fuzzy";
                confidence = 0.85;
                if (cust.email) resolvedEmail = cust.email.trim();
                step2Reason = `Tìm bằng tên công ty [${cust.companyName}] trong Diễn giải`;
                break;
              }
            }
          }
        }

        if (!matchedCust && resolvedEmail) {
          step2Reason = `Không tìm thấy Mã KH tương ứng với Email: ${resolvedEmail}`;
        }
      } else if (!isMatchedRun) {
        step2Reason = "Chờ chạy hạch toán";
      }

      // Default values for standard accounting columns
      const defaultTkCo = globalTkCo;
      const defaultTenTkCo = globalTenTkCo;
      const defaultVuViec = globalVuViec;
      const defaultBoPhan = globalBoPhan;
      const contractVal = extractContractCode(textDesc);

      const computedRow: ProcessedRow = {
        id,
        originalIndex: bankObj.stt,
        date: bankObj.date,
        referenceNo: bankObj.referenceNo,
        tien: bankObj.credit,
        dienGiai: textDesc,
        extractedEmail,
        resolvedEmail,
        cloudDescMatched,
        matchType,
        confidence,
        reasoning: `${step1Reason} | ${step2Reason || "Không có đối tượng phù hợp"}`,
        
        tkCo: defaultTkCo,
        tenTkCo: defaultTenTkCo,
        maKhach: matchedCust ? matchedCust.customerCode : "KH_CHUA_PHAN_LOAI",
        tenKhach: matchedCust ? matchedCust.companyName : (bankObj.payer || "Khách hàng Vccloud lẻ"),
        vuViec: defaultVuViec,
        boPhan: defaultBoPhan,
        hopDong: contractVal,
        bangKe: "",
        td2: "",
      };

      // Wrap with any manual configurations or edits
      if (hasManualOverride) {
        const manualTarget = { ...computedRow, ...hasManualOverride };
        
        // If they edited resolvedEmail manually but did not specify or change maKhach directly,
        // let's run dynamically a lookup in the customer directory for user's convenience!
        if (hasManualOverride.resolvedEmail !== undefined && hasManualOverride.maKhach === undefined) {
          const matchingCust = (accountingCustomers as AccountingCustomer[]).find(
            (c) => normalizeEmail(c.email) === normalizeEmail(hasManualOverride.resolvedEmail || "")
          );
          if (matchingCust) {
            manualTarget.maKhach = matchingCust.customerCode;
            manualTarget.tenKhach = matchingCust.companyName;
          } else {
            manualTarget.maKhach = "KH_CHUA_PHAN_LOAI";
          }
        }

        return {
          ...manualTarget,
          matchType: hasManualOverride.matchType || "manual"
        };
      }

      return computedRow;
    });
    }, [bankTransactions, cloudRecords, accountingCustomers, globalTkCo, globalTenTkCo, globalVuViec, globalBoPhan, manualRows, isMatchedRun, mode, bizflyFile1Rows, bizflyFile2Rows, bizflyCustomers, exportConfig]);

  // Execute AI matching call to our server route for the selected or all unmatched entries
  const handleAiDeepMatching = async () => {
    const unmatchedRows = processedRows.filter((r) => r.matchType === "unmatched");

    if (unmatchedRows.length === 0) {
      showToast("Tất cả giao dịch đều đã được phân loại thành công!", "success");
      return;
    }

    if (accountingCustomers.length === 0) {
      showToast("Vui lòng tải hoặc nạp Bảng mã khách hàng trước.", "error");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    const txToSend = unmatchedRows.map((r) => ({
      index: r.originalIndex,
      description: r.dienGiai,
      amount: r.tien,
    }));

    const masterToSend = accountingCustomers.map((c) => ({
      email: c.email,
      name: c.companyName,
      code: c.customerCode,
      taxCode: c.taxCode || "",
    }));

    try {
      const response = await fetch("/api/gemini/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions: txToSend,
          masterList: masterToSend,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Lỗi máy chủ khi kết quả phân bổ với AI");
      }

      if (data.success && Array.isArray(data.results)) {
        const overrides: Record<string, Partial<ProcessedRow>> = {};

        data.results.forEach((match: any) => {
          const rowId = `row-${match.transactionIndex}`;
          
          if (match.matchedCustomerCode) {
            overrides[rowId] = {
              maKhach: match.matchedCustomerCode,
              tenKhach: match.matchedCustomerName || unmatchedRows.find(u => u.id === rowId)?.tenKhach || "",
              matchType: "ai",
              confidence: match.confidence || 0.8,
              reasoning: `[AI Gợi Ý] ${match.reasoning}`,
            };
          } else {
            overrides[rowId] = {
              reasoning: `[AI Thất Bại] ${match.reasoning}`,
            };
          }
        });

        // Merge overrides with current manual matches
        setManualRows((prev) => ({
          ...prev,
          ...overrides,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Không thể thực hiện kết nối với Gemini API. Vui lòng kiểm tra GEMINI_API_KEY.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Single Cell edit modification handler
  const handleCellEdit = (rowId: string, field: keyof ProcessedRow, value: any) => {
    setManualRows((prev) => {
      const current = prev[rowId] || {};
      return {
        ...prev,
        [rowId]: {
          ...current,
          [field]: value,
          matchType: current.matchType || "manual",
        },
      };
    });
  };

  // Render clean currency format
  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const total = processedRows.length;
    const matched = processedRows.filter((r) => r.matchType !== "unmatched").length;
    const unmatched = total - matched;
    const matchedAmount = processedRows
      .filter((r) => r.matchType !== "unmatched")
      .reduce((sum, r) => sum + r.tien, 0);
    const totalAmount = processedRows.reduce((sum, r) => sum + r.tien, 0);

    return { total, matched, unmatched, matchedAmount, totalAmount };
  }, [processedRows]);

  // Filtered rows display
  const filteredRows = useMemo(() => {
    return processedRows.filter((row) => {
      const textMatch =
        row.dienGiai.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.tenKhach.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.maKhach.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.referenceNo.toLowerCase().includes(searchQuery.toLowerCase());

      if (matchFilter === "all") return textMatch;
      if (matchFilter === "matched") return textMatch && row.matchType !== "unmatched";
      if (matchFilter === "unmatched") return textMatch && row.matchType === "unmatched";
      if (matchFilter === "ai") return textMatch && row.matchType === "ai";
      return textMatch;
    });
  }, [processedRows, searchQuery, matchFilter]);

  // Validation checks for exportConfig in Modal
  const isTyGiaValValid = parseExchangeRate(exportConfig.tyGia) !== null;
  const isSoCtStartValid = /([0-9]+)$/.test(exportConfig.soCtStart);
  const hasValidationError = 
    !isTyGiaValValid || 
    !isSoCtStartValid || 
    !exportConfig.dvcs.trim() || 
    !exportConfig.tkNo.trim() || 
    !exportConfig.maGd.trim() || 
    !exportConfig.maNt.trim() || 
    !exportConfig.tkCo.trim() || 
    !exportConfig.vuViec.trim() || 
    !exportConfig.boPhan.trim() || 
    !exportConfig.maQuyen.trim();

  // Export to standard formatted Excel Workbook
  const handleExportXlsx = () => {
    if (filteredRows.length === 0) {
      showToast("Không có dữ liệu giao dịch để xuất file.", "error");
      return;
    }

    const parsedTyGia = parseExchangeRate(exportConfig.tyGia) || 1;

    // Row 1 of Worksheet: Column Headers directly
    const headers = [
      "ĐVCS",
      "Mã khách",
      "Người nhận tiền",
      "Lý do nộp",
      "Tài khoản nợ",
      "Mã giao dịch",
      "Số chứng từ",
      "Ngày chứng từ",
      "Mã ngoại tệ",
      "Tỷ giá",
      "Tk có",
      "Mã khách ct",
      "Tiền nt",
      "Tiền",
      "Diễn giải",
      "Vụ việc",
      "Bộ phận",
      "Hợp đồng",
      "Bảng kê",
      "TD2",
      "Mã quyển"
    ];

    const wsData: any[] = [
      ["Import phiếu báo có"],
      headers
    ];

    filteredRows.forEach((r, idx) => {
      const finalTkCo = manualRows[r.id]?.tkCo || exportConfig.tkCo;
      const finalVuViec = manualRows[r.id]?.vuViec || exportConfig.vuViec;
      const finalBoPhan = manualRows[r.id]?.boPhan || exportConfig.boPhan;
      
      let finalDienGiai = r.dienGiai;
      if (mode === "bizfly") {
        if (r.matchType !== "unmatched") {
          const nhanHang = (r as any).bizflyNhanHang || "";
          const tenSale = (r as any).bizflyTenSale || "";
          const soPL = r.hopDong || "";
          finalDienGiai = `${r.dienGiai} ${nhanHang} ${tenSale} ${nhanHang} ${soPL}`.trim().replace(/\s+/g, " ");
        }
      } else {
        finalDienGiai = r.dienGiai + (r.resolvedEmail ? ` (${r.resolvedEmail})` : "");
      }

      const formattedDocNum = generateDocumentNumber(exportConfig.soCtStart, idx);
      const formattedDate = normalizeDate(r.date);
      const customerCodeForExcel = r.maKhach === "KH_CHUA_PHAN_LOAI" ? "KH020219" : r.maKhach;

      wsData.push([
        { v: exportConfig.dvcs, t: "s" },
        { v: customerCodeForExcel, t: "s" },
        { v: "", t: "s" },
        r.dienGiai,
        { v: exportConfig.tkNo, t: "s" },
        { v: exportConfig.maGd, t: "s" },
        { v: formattedDocNum, t: "s" },
        formattedDate,
        exportConfig.maNt,
        parsedTyGia,
        { v: finalTkCo, t: "s" },
        { v: customerCodeForExcel, t: "s" },
        r.tien,
        r.tien * parsedTyGia,
        finalDienGiai,
        { v: finalVuViec, t: "s" },
        { v: finalBoPhan, t: "s" },
        { v: r.hopDong || "", t: "s" },
        "",
        "",
        { v: exportConfig.maQuyen, t: "s" }
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Enforce cell types in worksheet object explicitly
    const colLetters = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U"];
    const forceStringCols = [0, 1, 2, 4, 5, 6, 7, 8, 10, 11, 14, 15, 16, 17, 18, 19, 20];

    for (let rIdx = 2; rIdx < wsData.length; rIdx++) {
      colLetters.forEach((letter, cIdx) => {
        const cellRef = `${letter}${rIdx + 1}`;
        if (ws[cellRef]) {
          if (forceStringCols.includes(cIdx)) {
            ws[cellRef].t = 's';
            if (ws[cellRef].v !== undefined && ws[cellRef].v !== null) {
              ws[cellRef].v = String(ws[cellRef].v);
            }
          }
        }
      });
    }

    // Set columns width
    ws["!cols"] = [
      { wch: 10 }, // ĐVCS
      { wch: 16 }, // Mã khách
      { wch: 16 }, // Người nhận tiền
      { wch: 40 }, // Lý do nộp
      { wch: 10 }, // Tài khoản nợ
      { wch: 12 }, // Mã giao dịch
      { wch: 14 }, // Số chứng từ
      { wch: 12 }, // Ngày chứng từ
      { wch: 10 }, // Mã ngoại tệ
      { wch: 10 }, // Tỷ giá
      { wch: 10 }, // Tk có
      { wch: 16 }, // Mã khách ct
      { wch: 16 }, // Tiền nt
      { wch: 16 }, // Tiền
      { wch: 50 }, // Diễn giải
      { wch: 12 }, // Vụ việc
      { wch: 12 }, // Bộ phận
      { wch: 16 }, // Hợp đồng
      { wch: 10 }, // Bảng kê
      { wch: 10 }, // TD2
      { wch: 12 }  // Mã quyển
    ];

    const outputFilename = mode === "bizfly" ? "GIAY_BAO_CO_BIZFLY.xlsx" : "GIAY_BAO_CO_VCCLOUD.xlsx";
    XLSX.utils.book_append_sheet(wb, ws, "GIAY_BAO_CO");
    XLSX.writeFile(wb, outputFilename);

    // Ghi log hoạt động
    if (localStorage.getItem("google_sheets_sync_logs") !== "false") {
      const logPrefix = mode === "bizfly" ? "[BIZFLY] " : "";
      writeActionLogToSheet(
        DEFAULT_WEB_APP_URL,
        userEmail,
        `${logPrefix}Xuất Báo Cáo GBC`,
        `Đã xuất file ${outputFilename} chứa ${wsData.length - 2} dòng.`
      );
    }
  };

  // Export Unclassified Customers for supplementing the standard customer list
  const handleExportUnclassifiedXlsx = () => {
    // Only get unique unclassified customers by email/name to avoid duplicates
    const unclassifiedRows = processedRows.filter(r => r.maKhach === "KH_CHUA_PHAN_LOAI");
    
    if (unclassifiedRows.length === 0) {
      showToast("Không có khách hàng nào chưa được phân loại để xuất.", "info");
      return;
    }

    // Deduplicate logic: use a Map to keep unique unclassified by email or name
    const uniqueMap = new Map();
    unclassifiedRows.forEach(r => {
      // Use email as key if available, otherwise use name. Fallback to dienGiai
      const key = r.resolvedEmail || r.tenKhach || r.dienGiai;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, r);
      }
    });

    const uniqueUnclassified = Array.from(uniqueMap.values());

    // Sheet formatted for Customer list import/supplement
    const wsData = [
      ["Mã khách", "Tên khách hàng", "Email", "Mã số thuế", "Địa chỉ", "Ghi chú (Nguồn gốc giao dịch)"]
    ];

    uniqueUnclassified.forEach((r) => {
      wsData.push([
        "", // Mã khách để trống để kế toán điền
        r.tenKhach || "",
        r.resolvedEmail || "",
        "", // Mã số thuế chưa có
        "", // Địa chỉ chưa có
        r.dienGiai || ""
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws["!cols"] = [
      { wch: 16 }, // Mã khách
      { wch: 40 }, // Tên khách hàng
      { wch: 30 }, // Email
      { wch: 20 }, // Mã số thuế
      { wch: 40 }, // Địa chỉ
      { wch: 60 }, // Ghi chú
    ];

    XLSX.utils.book_append_sheet(wb, ws, "KH_CHUA_PHAN_LOAI");
    XLSX.writeFile(wb, "DANH_SACH_KH_CHUA_PHAN_LOAI.xlsx");
    showToast(`Đã xuất file chứa ${uniqueUnclassified.length} liên hệ chưa có mã khách.`, "success");

    // Ghi log hoạt động
    if (localStorage.getItem("google_sheets_sync_logs") !== "false") {
      writeActionLogToSheet(
        DEFAULT_WEB_APP_URL,
        userEmail,
        "Xuất KH Chưa Phân Loại",
        `Đã xuất file DANH_SACH_KH_CHUA_PHAN_LOAI.xlsx chứa ${uniqueUnclassified.length} liên hệ.`
      );
    }
  };

  return (
    <div id="root-container" className="min-h-screen bg-slate-50 text-slate-900 flex font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className={`bg-white border-r border-slate-200 transition-all duration-300 flex flex-col shrink-0 relative z-50 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="h-20 border-b border-slate-100 flex items-center px-4 shrink-0">
          {/* Logo */}
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-black font-bold text-xl shadow-sm shrink-0">VC</div>
          {!isSidebarCollapsed && (
            <div className="ml-3 overflow-hidden flex-1">
              <h1 className="text-[17px] font-bold text-slate-800 leading-tight whitespace-nowrap">Accounting Tools</h1>
              <p className="text-[13px] text-slate-500 whitespace-nowrap">Assistant for Accounting</p>
            </div>
          )}
        </div>
        
        {/* Collapse Button */}
        <button 
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)} 
          className="absolute top-6 -right-4 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-sm cursor-pointer z-50"
        >
          {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>

        <nav className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto">
          <button
            onClick={() => setActiveTab("reconciliation")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === "reconciliation" ? "bg-orange-50 text-orange-600 border-l-4 border-orange-500" : "text-slate-600 hover:bg-slate-100 border-l-4 border-transparent"
            }`}
            title="Đối Chiếu & Hạch Toán"
          >
            <ArrowRightLeft className={`w-5 h-5 shrink-0 ${activeTab === "reconciliation" ? "text-orange-600" : "text-slate-500"}`} />
            {!isSidebarCollapsed && <span className={`font-semibold text-sm whitespace-nowrap ${activeTab === "reconciliation" ? "text-orange-700" : ""}`}>Đối Chiếu & Hạch Toán</span>}
          </button>
          
          <button
            onClick={() => {
              setActiveTab("customers");
              setCustomerPage(1);
            }}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === "customers" ? "bg-orange-50 text-orange-600 border-l-4 border-orange-500" : "text-slate-600 hover:bg-slate-100 border-l-4 border-transparent"
            }`}
            title="Bảng Mã Khách Hàng"
          >
            <FileSpreadsheet className={`w-5 h-5 shrink-0 ${activeTab === "customers" ? "text-orange-600" : "text-slate-500"}`} />
            {!isSidebarCollapsed && (
              <div className="flex items-center justify-between w-full">
                <span className={`font-semibold text-sm whitespace-nowrap ${activeTab === "customers" ? "text-orange-700" : ""}`}>Bảng Mã Khách</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-orange-100/50 text-orange-700 rounded-full font-bold">
                  {accountingCustomers.length}
                </span>
              </div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
              activeTab === "guide" ? "bg-orange-50 text-orange-600 border-l-4 border-orange-500" : "text-slate-600 hover:bg-slate-100 border-l-4 border-transparent"
            }`}
            title="Hướng Dẫn Sử Dụng"
          >
            <Layers className={`w-5 h-5 shrink-0 ${activeTab === "guide" ? "text-orange-600" : "text-slate-500"}`} />
            {!isSidebarCollapsed && <span className={`font-semibold text-sm whitespace-nowrap ${activeTab === "guide" ? "text-orange-700" : ""}`}>Hướng Dẫn Sử Dụng</span>}
          </button>
        </nav>

        {/* User Profile Footer */}
        <div className="border-t border-slate-100 p-3 bg-slate-50/50 mt-auto shrink-0 overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm shrink-0 shadow-sm">
              {userEmail ? userEmail.charAt(0).toUpperCase() : "K"}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-700 truncate" title={userEmail}>
                  {userEmail}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold truncate">
                  {userEmail && userEmail !== "Kế toán viên" ? "Đã đăng nhập portal" : "Chế độ offline"}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
        {/* Top Header inside Main Area for Status and Actions */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex items-center justify-between min-h-[80px]">
           <div className="flex items-center gap-4 flex-wrap">
              <h2 className="text-lg font-bold text-slate-800">
                 {activeTab === "reconciliation" && "Đối Chiếu & Hạch Toán Sổ Phụ"}
                 {activeTab === "customers" && (mode === "cloud" ? "Bảng Mã Khách Hàng Chuẩn (Cloud)" : "Bảng Mã Khách Hàng BIZFLY")}
                 {activeTab === "guide" && "Hướng Dẫn Vận Hành Hệ Thống"}
              </h2>
              
              {/* Glassmorphic Mode Switcher */}
              <div className="flex items-center bg-slate-100/80 backdrop-blur-md p-0.5 rounded-lg border border-slate-200/50 shadow-inner">
                <button
                  onClick={() => handleModeChange("cloud")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    mode === "cloud"
                      ? "bg-white text-indigo-650 shadow-sm border border-slate-200/30"
                      : "text-slate-500 hover:text-slate-850"
                  }`}
                >
                  ☁️ Cloud
                </button>
                <button
                  onClick={() => handleModeChange("bizfly")}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1 ${
                    mode === "bizfly"
                      ? "bg-white text-orange-650 shadow-sm border border-slate-200/30"
                      : "text-slate-500 hover:text-slate-850"
                  }`}
                >
                  🚀 BIZFLY
                </button>
              </div>
           </div>
           
           <div className="flex items-center space-x-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">System Status</p>
              <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                ● AI Processing Engine Ready
              </p>
            </div>
            
            <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

            <div className="flex items-center gap-2">
              {isParsingLoading && (
                <div className="flex items-center gap-1.5 px-3 py-2 text-indigo-600 text-xs font-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang xử lý...
                </div>
              )}
              {((mode === "cloud" && bankTransactions.length > 0) || (mode === "bizfly" && bizflyFile1Rows.length > 0)) && (
                <button
                  id="btn-reset"
                  onClick={handleReset}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-md text-xs transition-colors cursor-pointer"
                  title="Xóa dữ liệu hiện tại"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Làm mới
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 w-full max-w-[1600px] mx-auto flex flex-col gap-6">

        {activeTab === "customers" && (
          <div id="customers-tab-view" className="flex flex-col gap-6 animate-fade-in-down">
            {/* Layout: Left Column (Upload + Add) & Right Column (Search/Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                {/* Bảng Mã Khách Hàng Kế Toán Uploader Card */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Input Master</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${mode === "cloud" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-705"}`}>
                        {mode === "cloud" ? "Sẵn chuẩn" : "Read-Only"}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-700">
                      {mode === "cloud" ? "[Bảng mã khách hàng]" : "[Bảng mã khách hàng BIZFLY]"}
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 mt-1 h-10 overflow-hidden text-ellipsis line-clamp-2 font-medium">
                      {mode === "cloud" 
                        ? "Danh bạ mã kế toán (.xlsx). Nạp file danh bạ chuẩn từ Excel để cập nhật nhanh toàn bộ danh sách."
                        : "Bảng mã khách hàng BIZFLY được tải tự động và đồng bộ từ Google Sheets. Không hỗ trợ nạp file hoặc đẩy ngược."}
                    </p>
                  </div>

                  <div className="mt-2">
                    <div className={`border rounded p-3 flex flex-col space-y-2 ${mode === "cloud" ? "border-emerald-100 bg-emerald-50/30" : "border-amber-100 bg-amber-50/30"}`}>
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-white rounded shadow-xs border border-slate-100">
                          <CheckCircle2 className={`w-5 h-5 ${mode === "cloud" ? "text-emerald-500" : "text-amber-500"}`} />
                        </div>
                        <div className="text-xs truncate">
                          <p className="font-semibold text-slate-800 truncate" title={mode === "cloud" ? customerFile : "Google Sheets Sync"}>
                            {mode === "cloud" ? customerFile : "Đồng bộ đám mây"}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{accountingCustomers.length} mã khách chuẩn đã nạp</p>
                        </div>
                      </div>
                      {mode === "cloud" ? (
                        <label className="text-center text-[11px] block text-indigo-650 hover:text-indigo-850 font-bold underline cursor-pointer mt-1 bg-white hover:bg-slate-50 py-1.5 border border-slate-200 rounded transition-colors shadow-xs">
                          Cập nhật / Nạp bảng mã mới (.xlsx)
                          <input
                            type="file"
                            accept=".xls,.xlsx"
                            onChange={(e) => handleExcelUpload(e, "customer")}
                            className="hidden"
                          />
                        </label>
                      ) : (
                        <button
                          onClick={handleSyncFromGoogleSheets}
                          className="w-full text-center text-[11px] block text-indigo-650 hover:text-indigo-850 font-bold underline cursor-pointer mt-1 bg-white hover:bg-slate-50 py-1.5 border border-slate-200 rounded transition-colors shadow-xs"
                        >
                          Tải lại từ Google Sheets 🔄
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Form: Add New Customer hoặc Báo cáo Read-Only */}
                {mode === "cloud" ? (
                  <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1">
                      <Plus className="w-4 h-4 text-emerald-500" />
                      Thêm Mã Khách Hàng Thủ Công
                    </h3>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã KH Kế toán *</label>
                      <input
                        type="text"
                        value={newCustCode}
                        onChange={(e) => setNewCustCode(e.target.value)}
                        placeholder="e.g. KH_VNDIRECT, VCC_KHACHLE"
                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden uppercase font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tên Công ty / Pháp nhân *</label>
                      <input
                        type="text"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        placeholder="e.g. Công ty Cổ phần Chứng khoán VNDIRECT"
                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email đối chiếu Match 2 *</label>
                      <input
                        type="email"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        placeholder="e.g. support@vndirect.com.vn"
                        className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Mã số thuế</label>
                        <input
                          type="text"
                          value={newCustTax}
                          onChange={(e) => setNewCustTax(e.target.value)}
                          placeholder="e.g. 0102030405"
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Địa chỉ</label>
                        <input
                          type="text"
                          value={newCustAddress}
                          onChange={(e) => setNewCustAddress(e.target.value)}
                          placeholder="e.g. Hà Nội, Việt Nam"
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomer}
                      className="mt-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Thêm Vào Bảng Danh Bạ
                    </button>
                  </div>
                ) : (
                  <div className="bg-orange-50 border border-orange-200 p-5 rounded-lg shadow-sm flex flex-col gap-3">
                    <h3 className="text-xs font-bold text-orange-850 uppercase tracking-wider border-b border-orange-200 pb-2 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4 text-orange-650" />
                      Chế Độ Chỉ Đọc BIZFLY
                    </h3>
                    <p className="text-xs text-orange-750 leading-relaxed font-medium">
                      Bảng mã khách hàng phân hệ BIZFLY có cấu trúc đặc thù 59 cột (Google Sheets) và chứa lượng dữ liệu lớn (~10.000 dòng).
                    </p>
                    <ul className="text-[11px] text-orange-800 list-disc list-inside space-y-1 font-medium">
                      <li>Không hỗ trợ thêm mới thủ công cục bộ.</li>
                      <li>Quyền chỉnh sửa bị vô hiệu hóa trên ứng dụng.</li>
                      <li>Các thay đổi cần được thực hiện trực tiếp trên Google Sheets.</li>
                      <li>Sau khi sửa đổi trên Sheets, hãy bấm nút <strong>"Tải lại từ Google Sheets"</strong> để cập nhật dữ liệu.</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Search and List View */}
              <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-blue-500" />
                    Bảng Tra cứu Danh bạ ({filteredCustomers.length} mã tìm thấy)
                  </h3>
                  
                  {/* Search box and Clear button */}
                  <div className="flex flex-wrap items-center gap-2">
                    {accountingCustomers.length > 0 && (
                      <button
                        onClick={handleClearAllCustomers}
                        className="px-2.5 py-1.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition-colors"
                        title="Xóa toàn bộ mã khách hàng kế toán chuẩn"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa tất cả ({accountingCustomers.length})
                      </button>
                    )}
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Tìm Mã KH, Tên, Email..."
                        value={searchCustomerQuery}
                        onChange={(e) => {
                          setSearchCustomerQuery(e.target.value);
                          setCustomerPage(1);
                        }}
                        className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Table list */}
                {mode === "cloud" ? (
                  <>
                    <div className="overflow-x-auto border border-slate-100 rounded">
                      <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <th className="w-12 py-2 px-3 text-center">STT</th>
                            <th className="w-32 py-2 px-3">Mã KH kế toán</th>
                            <th className="py-2 px-3">Tên Công ty / Pháp nhân</th>
                            <th className="w-48 py-2 px-3">Email đối chiếu</th>
                            <th className="w-24 py-2 px-3 text-center">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                          {paginatedCustomers.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-slate-400 bg-slate-50 font-medium">
                                Không tìm thấy bản ghi khách hàng nào phù hợp bộ lọc tìm kiếm.
                              </td>
                            </tr>
                          ) : (
                            paginatedCustomers.map((cust, idx) => {
                              const isCustEditing = editingCustomerCode === cust.customerCode;
                              const absoluteStt = (customerPage - 1) * itemsPerPage + idx + 1;
                              
                              return (
                                <tr key={cust.customerCode} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2 px-3 text-center font-mono text-slate-400">{absoluteStt}</td>
                                  
                                  <td className="py-2 px-3 font-semibold font-mono text-slate-900 truncate">
                                    {cust.customerCode}
                                  </td>

                                  <td className="py-2 px-3 truncate font-medium text-slate-800" title={cust.companyName}>
                                    {isCustEditing ? (
                                      <input
                                        type="text"
                                        value={editCustData.companyName || ""}
                                        onChange={(e) => setEditCustData(prev => ({ ...prev, companyName: e.target.value }))}
                                        className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                                      />
                                    ) : (
                                      cust.companyName
                                    )}
                                  </td>

                                  <td className="py-2 px-3 font-mono text-xs text-blue-700 truncate" title={cust.email}>
                                    {isCustEditing ? (
                                      <input
                                        type="text"
                                        value={editCustData.email || ""}
                                        onChange={(e) => setEditCustData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full px-1.5 py-0.5 font-mono text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500"
                                      />
                                    ) : (
                                      cust.email
                                    )}
                                  </td>

                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      {isCustEditing ? (
                                        <>
                                          <button
                                            onClick={() => handleSaveCustomerEdit(cust.customerCode)}
                                            className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                          >
                                            Lưu
                                          </button>
                                          <button
                                            onClick={() => setEditingCustomerCode(null)}
                                            className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded text-[10px] font-bold cursor-pointer"
                                          >
                                            Hủy
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={() => handleStartEditingCustomer(cust)}
                                            className="p-1 hover:bg-blue-50 text-blue-600 rounded cursor-pointer transition-colors"
                                            title="Chỉnh sửa dòng danh bạ này"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleDeleteCustomer(cust.customerCode)}
                                            className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer transition-colors"
                                            title="Xóa mã danh bạ"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalCustomerPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs text-slate-500">
                          Hiển thị trang <strong>{customerPage}</strong> / <strong>{totalCustomerPages}</strong> (Tổng cộng {filteredCustomers.length} mã)
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setCustomerPage(prev => Math.max(1, prev - 1))}
                            disabled={customerPage === 1}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Trang trước
                          </button>
                          <button
                            onClick={() => setCustomerPage(prev => Math.min(totalCustomerPages, prev + 1))}
                            disabled={customerPage === totalCustomerPages}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-600 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                          >
                            Trang sau
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <VirtualCustomerTable
                    customers={filteredCustomers}
                    editingCustomerCode={editingCustomerCode}
                    editCustData={editCustData}
                    setEditingCustomerCode={setEditingCustomerCode}
                    setEditCustData={setEditCustData}
                    handleSaveCustomerEdit={handleSaveCustomerEdit}
                    handleStartEditingCustomer={handleStartEditingCustomer}
                    handleDeleteCustomer={handleDeleteCustomer}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "reconciliation" && (
          <div className="flex flex-col gap-6 animate-fade-in-down">
            {/* Top row with 3 blocks or 2 blocks */}
            <div className="flex flex-col xl:flex-row gap-4">
              {/* Box 1: Sổ Phụ Ngân Hàng hoặc Sổ công nợ BIZFLY */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {mode === "cloud" ? "Bước 1: Sổ phụ" : "Bước 1: Sổ công nợ"}
                  </span>
                  {(mode === "cloud" ? bankFile : bizflyFile1) ? (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase">Uploaded</span>
                  ) : (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold uppercase">Bắt buộc</span>
                  )}
                </div>
                
                <div>
                  {(mode === "cloud" ? bankFile : bizflyFile1) ? (
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-right">
                        <p className="font-semibold text-slate-700 truncate max-w-[150px]" title={mode === "cloud" ? bankFile : bizflyFile1}>
                          {mode === "cloud" ? bankFile : bizflyFile1}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {mode === "cloud" ? `${bankTransactions.length} bút toán` : `${bizflyFile1Rows.length} dòng`}
                        </p>
                      </div>
                      <label className="flex items-center text-center text-[10px] text-blue-600 hover:text-blue-800 font-bold border border-blue-200 hover:bg-white bg-white/80 px-2 py-1 rounded cursor-pointer transition-colors shadow-xs">
                        Đổi file
                        <input 
                          type="file" 
                          accept=".xls,.xlsx" 
                          onChange={(e) => handleExcelUpload(e, mode === "cloud" ? "bank" : "bizfly_file1")} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded py-1.5 px-3 text-center cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                      <span className="text-xs font-semibold text-slate-600">Tải lên</span>
                      <input 
                        type="file" 
                        accept=".xls,.xlsx" 
                        onChange={(e) => handleExcelUpload(e, mode === "cloud" ? "bank" : "bizfly_file1")} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Box 2: File Theo Dõi Dịch Vụ Cloud hoặc File HD/PLHD BIZFLY */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    {mode === "cloud" ? "Bước 2: File Cloud" : "Bước 2: File HD/PLHD"}
                  </span>
                  {(mode === "cloud" ? cloudFile : bizflyFile2) ? (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded uppercase">Uploaded</span>
                  ) : (
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      {mode === "cloud" ? "Bổ trợ" : "Bắt buộc"}
                    </span>
                  )}
                </div>

                <div>
                  {(mode === "cloud" ? cloudFile : bizflyFile2) ? (
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-right">
                        <p className="font-semibold text-slate-700 truncate max-w-[150px]" title={mode === "cloud" ? cloudFile : bizflyFile2}>
                          {mode === "cloud" ? cloudFile : bizflyFile2}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {mode === "cloud" ? `${cloudRecords.length} dòng` : `${bizflyFile2Rows.length} dòng`}
                        </p>
                      </div>
                      <label className="flex items-center text-center text-[10px] text-blue-600 hover:text-blue-800 font-bold border border-blue-200 hover:bg-white bg-white/80 px-2 py-1 rounded cursor-pointer transition-colors shadow-xs">
                        Đổi file
                        <input 
                          type="file" 
                          accept=".xls,.xlsx" 
                          onChange={(e) => handleExcelUpload(e, mode === "cloud" ? "cloud" : "bizfly_file2")} 
                          className="hidden" 
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded py-1.5 px-3 text-center cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5 text-slate-500 mr-1.5" />
                      <span className="text-xs font-semibold text-slate-600">Tải lên</span>
                      <input 
                        type="file" 
                        accept=".xls,.xlsx" 
                        onChange={(e) => handleExcelUpload(e, mode === "cloud" ? "cloud" : "bizfly_file2")} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Prominent Operational Match Trigger Banner */}
              {((mode === "cloud" && bankTransactions.length > 0) || (mode === "bizfly" && bizflyFile1Rows.length > 0)) && (
                <section id="matching-trigger-banner" className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-1 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full justify-between sm:justify-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isMatchedRun ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}>
                        <ArrowRightLeft className={`w-5 h-5 ${isMatchingLoading ? "animate-spin" : ""}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {isMatchedRun ? "Bộ Đối Soát Đã Hoạt Động" : "Sẵn Sàng Chạy Đối Soát"}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePerformAutomatedMatching}
                    disabled={isMatchingLoading}
                    className={`px-4 py-1.5 rounded font-bold text-xs shadow-sm cursor-pointer transition-colors flex items-center gap-2 whitespace-nowrap ${
                      isMatchedRun 
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200" 
                        : "bg-blue-600 hover:bg-blue-700 text-white animate-pulse"
                    }`}
                  >
                    {isMatchingLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Đang khớp...
                      </>
                    ) : isMatchedRun ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Chạy lại
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Thực Hiện
                      </>
                    )}
                  </button>
                </section>
              )}
            </div>

            {/* Clean summary metrics bar */}
            {((mode === "cloud" && bankTransactions.length > 0) || (mode === "bizfly" && bizflyFile1Rows.length > 0)) && (
              <section id="config-metrics-bar" className="bg-slate-900 border border-slate-800 text-white p-3 rounded-lg shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số dòng</h4>
                    <p className="text-lg font-extrabold text-white">{stats.total} <span className="text-xs font-normal text-slate-400">bản ghi</span></p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đã khớp</h4>
                    <p className="text-lg font-extrabold text-emerald-400">{stats.matched} <span className="text-xs font-normal text-slate-400">giao dịch</span></p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chưa khớp</h4>
                    <p className="text-lg font-extrabold text-amber-400">{stats.unmatched} <span className="text-xs font-normal text-slate-400">giao dịch</span></p>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng tiền báo Có</h4>
                    <p className="text-lg font-extrabold text-blue-400">{formatVND(stats.totalAmount)}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Main Interactive Spreadsheet Editor Panel */}
            <section id="spreadsheet-workspace" className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden flex flex-col">
              
              {/* Spreadsheet headers and search filters */}
              <div className="p-4 border-b border-slate-300 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">Live Draft: Giấy Báo Có Preview</span>
                  <div className="flex rounded bg-white border border-slate-200 p-0.5">
                    <button
                      onClick={() => setMatchFilter("all")}
                      className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                        matchFilter === "all" ? "bg-blue-600 text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Tất cả ({processedRows.length})
                    </button>
                    <button
                      onClick={() => setMatchFilter("matched")}
                      className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                        matchFilter === "matched" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Đã Khớp ({stats.matched})
                    </button>
                    <button
                      onClick={() => setMatchFilter("unmatched")}
                      className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${
                        matchFilter === "unmatched" ? "bg-amber-600 text-white" : "text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      Chưa Khớp ({stats.unmatched})
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Tìm theo nội dung diễn giải, mã..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-4 py-2 bg-white border border-slate-200 rounded focus:outline-hidden focus:ring-1 focus:ring-blue-600"
                    />
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleExportUnclassifiedXlsx}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded text-xs shadow-sm cursor-pointer transition-colors"
                      title="Xuất riêng danh sách chưa có mã khách để chuẩn hoá bổ sung"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Xuất KH Chưa Khớp
                    </button>
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded text-xs shadow-sm cursor-pointer transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Xuất toàn bộ danh sách
                    </button>
                  </div>
                </div>
              </div>

              {/* Excel Spreadsheet Table Rendering */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="w-32 py-3.5 px-3">Ngày giao dịch</th>
                      <th className="w-36 py-3.5 px-3 text-right pr-6">Số tiền Có</th>
                      <th className="w-[450px] py-3.5 px-3">Diễn giải gốc sổ phụ</th>
                      <th className="w-56 py-3.5 px-3 bg-blue-50/85 text-blue-800 font-bold border border-blue-100 text-xs">Email đối chiếu (Cloud)</th>
                      <th className="w-32 py-3.5 px-3">C (Mã khách)</th>
                      <th className="w-56 py-3.5 px-3">D (Tên khách hàng)</th>
                      <th className="w-32 py-3.5 px-3 text-center">Trạng thái Khớp</th>
                      <th className="w-24 py-3.5 px-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 bg-slate-50 font-medium">
                          Không tìm thấy bản ghi nào khớp bộ lọc hạch toán hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const isEditing = editingRowId === row.id;
                        let labelBg = "bg-slate-150 text-slate-800 border border-slate-200";
                        let labelText = "Thủ công";

                        if (row.matchType === "strict") {
                          if (row.cloudDescMatched) {
                            labelBg = "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold";
                            labelText = "M1+M2: Khớp Sổ-Cloud";
                          } else {
                            labelBg = "bg-teal-50 text-teal-800 border border-teal-200 font-semibold";
                            labelText = "M2: Khớp Email";
                          }
                        } else if (row.matchType === "fuzzy") {
                          labelBg = "bg-blue-50 text-blue-700 border border-blue-200/60";
                          labelText = "Khớp Phỏng Đoán";
                        } else if (row.matchType === "ai") {
                          labelBg = "bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-bold";
                          labelText = "AI Gợi Ý Sát";
                        } else if (row.matchType === "unmatched") {
                          labelBg = "bg-amber-50 text-amber-700 border border-amber-200/60 font-bold";
                          labelText = "Lẻ / Chưa Khớp";
                        } else if (row.matchType === "manual") {
                          labelBg = "bg-teal-50 text-teal-700 border border-teal-200/60";
                          labelText = "Kế toán chọn";
                        }

                        return (
                          <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                            {/* Ngày giao dịch */}
                            <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                              {row.date}
                            </td>

                            {/* Số tiền Có */}
                            <td className="py-2.5 px-3 text-right pr-6 font-mono font-semibold text-slate-950">
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={row.tien}
                                  onChange={(e) => handleCellEdit(row.id, "tien", parseFloat(e.target.value) || 0)}
                                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded text-right focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <span className="text-slate-950 block">{formatVND(row.tien)}</span>
                              )}
                            </td>

                            {/* Diễn giải gốc sổ phụ */}
                            <td className="py-2.5 px-3 text-slate-500 italic whitespace-normal break-words cursor-help" title={row.dienGiai}>
                              {isEditing ? (
                                <textarea
                                  value={row.dienGiai}
                                  onChange={(e) => handleCellEdit(row.id, "dienGiai", e.target.value)}
                                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 h-10"
                                />
                              ) : (
                                <span className="block whitespace-normal break-words">{row.dienGiai}</span>
                              )}
                            </td>

                            {/* Matching 1 Helper: Email đối chiếu (Tìm từ File Cloud) */}
                            <td className="py-2.5 px-3 bg-blue-50/10 border-x border-blue-100/50 whitespace-normal break-all">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.resolvedEmail || ""}
                                  onChange={(e) => handleCellEdit(row.id, "resolvedEmail", e.target.value || null)}
                                  placeholder="Gõ email để tự tìm..."
                                  className="w-full px-1.5 py-1 text-xs border border-blue-300 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-mono"
                                />
                              ) : (
                                <div className="flex flex-col">
                                  <span className={`font-mono text-xs whitespace-normal break-all block ${row.resolvedEmail ? "text-blue-700 font-bold" : "text-slate-400 italic"}`} title={row.resolvedEmail || ""}>
                                    {row.resolvedEmail || "— Chưa khớp —"}
                                  </span>
                                  {row.cloudDescMatched && (
                                    <span className="text-[9px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded-xs w-max mt-0.5 font-bold animate-pulse">
                                      Xác thực hoàn toàn từ Cloud
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Cột C: Mã Khách (Matching 2 Outcome) */}
                            <td className="py-2.5 px-3 whitespace-normal break-all">
                              {isEditing ? (
                                <CustomerCodeEditor
                                  row={row}
                                  accountingCustomers={accountingCustomers}
                                  handleCellEdit={handleCellEdit}
                                  mode={mode}
                                />
                              ) : (
                                <span className={`font-semibold font-mono whitespace-normal break-all inline-block max-w-full ${row.maKhach === "KH_CHUA_PHAN_LOAI" ? "text-amber-600 bg-amber-50 px-1 rounded" : "text-slate-900"}`}>
                                  {row.maKhach}
                                </span>
                              )}
                            </td>

                            {/* Cột D: Tên khách hàng (Matching 2 Outcome) */}
                            <td className="py-2.5 px-3 whitespace-normal break-words font-medium text-slate-800" title={row.tenKhach}>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={row.tenKhach}
                                  onChange={(e) => handleCellEdit(row.id, "tenKhach", e.target.value)}
                                  className="w-full px-1.5 py-1 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500"
                                />
                              ) : (
                                <span className="block whitespace-normal break-words">{row.tenKhach}</span>
                              )}
                            </td>

                            {/* Trạng thái hạch toán */}
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold block text-center ${labelBg}`}>
                                {labelText}
                              </span>
                            </td>

                            {/* Thao tác */}
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] text-slate-400 block text-left truncate max-w-[120px]" title={row.reasoning}>
                                  {row.reasoning}
                                </span>
                                
                                {isEditing ? (
                                  <button
                                    onClick={() => setEditingRowId(null)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded text-[10px] cursor-pointer flex-shrink-0"
                                  >
                                    Lưu
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingRowId(row.id)}
                                    className="p-1 hover:bg-slate-200 active:bg-slate-300 text-slate-500 rounded cursor-pointer flex-shrink-0"
                                    title="Chỉnh sửa hạch toán dòng này"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Grid Footer information */}
              <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-400 text-center">
                Mẹo kế toán: Nhấp vào nút "Chỉnh sửa" hình bút ở cột cuối của bất kì dòng nào để tùy ghi đè tài khoản hạch toán, Mã khách, hoặc bổ sung mã hợp đồng gốc theo nghiệp vụ thực tế.
              </div>
              
              <datalist id="accounting-customers-list">
                <option value="KH_CHUA_PHAN_LOAI">KH_CHUA_PHAN_LOAI</option>
                {accountingCustomers.map((cust) => (
                  <option key={cust.customerCode} value={cust.customerCode}>
                    {cust.customerCode} - {cust.companyName}
                  </option>
                ))}
              </datalist>
            </section>
          </div>
        )}

        {activeTab === "guide" && (
          <div className="animate-fade-in-down p-2 flex flex-col gap-6">
            <section id="features-guide" className="bg-white p-7 rounded-xl border border-slate-200 shadow-xs max-w-4xl mx-auto flex flex-col md:flex-row gap-6 mt-4">
              <div className="w-full md:w-1/2 flex flex-col justify-center">
                <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  Hướng dẫn vận hành hệ thống
                </h3>
                <ul className="text-xs text-slate-600 space-y-3 list-decimal list-inside pl-1">
                  <li>
                    <strong className="text-slate-800">Tải lên các file Excel:</strong> Tiến hành nạp 2 file đầu vào bắt buộc gồm <span className="bg-slate-100 text-slate-800 px-1 rounded">Sổ phụ ngân hàng</span> và <span className="bg-slate-100 text-slate-800 px-1 rounded">Bảng mã khách hàng kế toán</span>.
                  </li>
                  <li>
                    <strong className="text-slate-800">Đọc &amp; Phân tích tự động:</strong> Hệ thống tự động lọc các giao dịch "Có" phát sinh dòng tiền lớn hơn 0, phân tích chuỗi ký tự Email như <code className="bg-slate-100 text-slate-800 px-1 rounded font-mono">@gmail.com</code> hoặc tên công ty.
                  </li>
                  <li>
                    <strong className="text-slate-800">Sửa đổi trực tiếp tại Bảng:</strong> Bạn có quyền tự ghi đè số tiền, mã khách hàng, tài khoản có hoặc thêm mã hợp đồng trực quan trước khi tải.
                  </li>
                  <li>
                    <strong className="text-slate-800">Xuất file chuẩn Kế toán:</strong> Nhấp nút "Tải File" để tải xuống trực tiếp tài liệu Microsoft Excel (.xlsx) định dạng 11 cột chuẩn mực để import thẳng vào phần mềm kế toán.
                  </li>
                </ul>
              </div>

              <div className="w-full md:w-1/2 bg-slate-50 p-5 rounded-lg border border-slate-150 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1">
                    💡 Bạn chưa chuẩn bị sẵn file dữ liệu?
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">
                    Không sao! Hãy nhấp chọn nút <strong className="text-emerald-700">"Chạy thử dữ liệu mẫu Vccloud"</strong> ở góc phía trên bên phải màn hình. 
                    Ứng dụng sẽ nạp hệ thống dữ liệu hạch toán thực tế chuẩn chỉnh, cho phép bạn trải nghiệm đầy đủ tính năng tra cứu, đối soát AI, và tải Giấy Báo Có mẫu ngay lập tức.
                  </p>
                </div>

                <div className="p-3 bg-indigo-50 border border-indigo-150 rounded-md text-[11px] text-indigo-800">
                  ⭐ <strong>Cặp khớp thông minh:</strong> Tự động bóc tách các trường hợp người dùng ghi liền không ký tự đặc biệt, ví dụ <code className="bg-indigo-100 px-1 rounded font-mono">minhle91719gmailcom</code> quy đổi chuẩn về <code className="bg-indigo-100 px-1 rounded font-mono">minhle.91719@gmail.com</code>.
                </div>
              </div>
            </section>

            {/* BIZFLY Guide section */}
            <section id="bizfly-guide" className="bg-white p-7 rounded-xl border border-slate-200 shadow-xs max-w-4xl mx-auto flex flex-col gap-4 mt-6">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Hướng dẫn phân hệ BIZFLY (Đặc thù)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600">
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800">Quy trình đối soát 4 bước:</h4>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 leading-relaxed">
                    <li>Chuyển chế độ sang <strong className="text-orange-650">BIZFLY</strong> tại thanh tiêu đề phía trên.</li>
                    <li>Nạp file đầu vào 1: <strong className="text-slate-800">Sổ công nợ</strong> (Excel có header dòng 6, nội dung từ dòng 11).</li>
                    <li>Nạp file đầu vào 2: <strong className="text-slate-800">Thông tin HD/PLHD</strong> (Excel có header dòng 4, chứa cột BG - Diễn giải link tiền).</li>
                    <li>Bấm nút <strong className="text-blue-600">Thực hiện</strong> để chạy đối soát tự động thông qua Số PL và tra cứu danh bạ.</li>
                  </ol>
                </div>
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800">Lưu ý cấu hình danh bạ & bảo mật:</h4>
                  <ul className="list-disc list-inside space-y-1.5 pl-1 leading-relaxed">
                    <li>Danh bạ BIZFLY được lưu tại sheet riêng <code className="bg-slate-100 text-slate-800 px-1 rounded font-mono">Bảng Mã Khách Hàng BIZFLY</code> trên Google Sheets.</li>
                    <li>Để bảo mật, danh bạ BIZFLY hoạt động ở chế độ **Read-Only** trên ứng dụng (không hỗ trợ lưu ghi đè cục bộ).</li>
                    <li>Mọi thay đổi danh bạ BIZFLY phải thực hiện trực tiếp trên Google Sheets, sau đó bấm <strong>"Tải lại từ Google Sheets"</strong>.</li>
                  </ul>
                </div>
              </div>
            </section>
          </div>
        )}

          </div>
          
          <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 mt-auto shrink-0 w-full relative z-10">
            Bản quyền &copy; 2026 Trợ Lý Kế Toán Doanh nghiệp Trung tâm dịch vụ Vccloud. Tất cả các quyền được bảo hộ.
          </footer>
        </main>

      {/* Excel Export Configuration Modal Popup */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-950 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-sm">Cấu Hình Hạch Toán &amp; Xuất Excel 21 Cột</h3>
                  <p className="text-[10px] text-slate-400">Thiết lập các thông tin mặc định áp dụng khi xuất file Giấy Báo Có</p>
                </div>
              </div>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              {/* Note alert */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-800 leading-relaxed">
                👉 Cấu hình dưới đây được tách biệt với bảng đối chiếu, chỉ áp dụng trực tiếp khi xuất file Excel hạch toán. Dữ liệu hạch toán xuất ra sẽ tuân theo bộ lọc hiện tại của bạn.
              </div>

              {/* Grid 2 Columns for Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Nhóm 1: Thông tin chứng từ */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    Thông tin chứng từ
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 1: ĐVCS *</label>
                      <input
                        type="text"
                        value={exportConfig.dvcs}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, dvcs: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 6: Mã GD *</label>
                      <input
                        type="text"
                        value={exportConfig.maGd}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, maGd: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 7: Số CT bắt đầu *</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: GBC004774 hoặc 004774"
                        value={exportConfig.soCtStart}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, soCtStart: e.target.value }))}
                        className={`w-full text-xs px-2.5 py-1.5 bg-white border rounded focus:ring-1 focus:outline-hidden font-mono ${
                          exportConfig.soCtStart && !/([0-9]+)$/.test(exportConfig.soCtStart)
                            ? "border-red-400 focus:ring-red-500"
                            : "border-slate-200 focus:ring-blue-600"
                        }`}
                      />
                      {exportConfig.soCtStart && !/([0-9]+)$/.test(exportConfig.soCtStart) && (
                        <p className="text-[9px] text-red-500 mt-1 font-semibold">⚠️ Số chứng từ bắt đầu phải chứa hậu tố số ở cuối.</p>
                      )}
                      {!exportConfig.soCtStart && (
                        <p className="text-[9px] text-amber-600 mt-1 font-semibold">⚠️ Cần nhập số chứng từ bắt đầu.</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 21: Mã quyển *</label>
                      <input
                        type="text"
                        value={exportConfig.maQuyen}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, maQuyen: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Nhóm 2: Tài khoản */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4 flex flex-col">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Tài khoản hạch toán
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 5: TK Nợ *</label>
                      <input
                        type="text"
                        value={exportConfig.tkNo}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, tkNo: e.target.value }))}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 11: TK Có mặc định *</label>
                      <input
                        type="text"
                        value={exportConfig.tkCo}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, tkCo: e.target.value }))}
                        className="w-full text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-auto leading-relaxed pt-2">
                    * Các dòng hạch toán đã được kế toán sửa đổi thủ công tài khoản Có trên grid preview sẽ giữ nguyên giá trị riêng đó khi xuất Excel.
                  </p>
                </div>

                {/* Nhóm 3: Tiền tệ */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    Tiền tệ
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 9: Ngoại tệ *</label>
                      <input
                        type="text"
                        value={exportConfig.maNt}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, maNt: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 10: Tỷ giá *</label>
                      <input
                        type="text"
                        value={exportConfig.tyGia}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, tyGia: e.target.value }))}
                        className={`w-full text-xs px-2.5 py-1.5 bg-white border rounded focus:ring-1 focus:outline-hidden font-mono ${
                          exportConfig.tyGia && parseExchangeRate(exportConfig.tyGia) === null
                            ? "border-red-400 focus:ring-red-500"
                            : "border-slate-200 focus:ring-blue-600"
                        }`}
                      />
                      {exportConfig.tyGia && parseExchangeRate(exportConfig.tyGia) === null && (
                        <p className="text-[9px] text-red-500 mt-1 font-semibold">⚠️ Tỷ giá không hợp lệ (ví dụ nhập: 24,500 hoặc 1.000.000).</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nhóm 4: Mã phân tích */}
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide border-b border-slate-200 pb-1.5">
                    <Settings className="w-4 h-4 text-blue-500" />
                    Mã hạch toán phân tích
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 16: Vụ việc mặc định *</label>
                      <input
                        type="text"
                        value={exportConfig.vuViec}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, vuViec: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cột 17: Bộ phận mặc định *</label>
                      <input
                        type="text"
                        value={exportConfig.boPhan}
                        onChange={(e) => setExportConfig(prev => ({ ...prev, boPhan: e.target.value }))}
                        className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Dòng Preview Hạch Toán Mẫu */}
              <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/20 space-y-3">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2 uppercase tracking-wide">
                  <Search className="w-4 h-4 text-indigo-500" />
                  Xem trước dòng hạch toán đầu tiên (Excel Row 3 Preview)
                </h4>
                {filteredRows.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Không có dữ liệu giao dịch hiển thị hiện tại để hiển thị preview.</p>
                ) : (
                  (() => {
                    const r = filteredRows[0];
                    const parsedTyGia = parseExchangeRate(exportConfig.tyGia) || 1;
                    const finalTkCo = manualRows[r.id]?.tkCo || exportConfig.tkCo;
                    const finalVuViec = manualRows[r.id]?.vuViec || exportConfig.vuViec;
                    const finalBoPhan = manualRows[r.id]?.boPhan || exportConfig.boPhan;
                    const dienGiaiWithEmail = r.dienGiai + (r.resolvedEmail ? ` (${r.resolvedEmail})` : "");
                    const formattedDocNum = generateDocumentNumber(exportConfig.soCtStart, 0);
                    const formattedDate = normalizeDate(r.date);
                    const customerCodeForExcel = r.maKhach === "KH_CHUA_PHAN_LOAI" ? "KH020219" : r.maKhach;
                    
                    return (
                      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-xs">
                        <table className="border-collapse text-[10px] min-w-[2000px] w-full text-left font-mono">
                          <thead>
                            <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                              <th className="border-r border-slate-200 p-2 w-20">1. ĐVCS</th>
                              <th className="border-r border-slate-200 p-2 w-32">2. Mã khách</th>
                              <th className="border-r border-slate-200 p-2 w-24">3. Người nhận</th>
                              <th className="border-r border-slate-200 p-2 w-[300px]">4. Lý do nộp</th>
                              <th className="border-r border-slate-200 p-2 w-20">5. TK Nợ</th>
                              <th className="border-r border-slate-200 p-2 w-16">6. Mã GD</th>
                              <th className="border-r border-slate-200 p-2 w-28">7. Số CT</th>
                              <th className="border-r border-slate-200 p-2 w-24">8. Ngày CT</th>
                              <th className="border-r border-slate-200 p-2 w-20">9. Ngoại tệ</th>
                              <th className="border-r border-slate-200 p-2 w-20">10. Tỷ giá</th>
                              <th className="border-r border-slate-200 p-2 w-20">11. TK Có</th>
                              <th className="border-r border-slate-200 p-2 w-32">12. Mã khách ct</th>
                              <th className="border-r border-slate-200 p-2 w-28 text-right">13. Tiền nt</th>
                              <th className="border-r border-slate-200 p-2 w-28 text-right">14. Tiền</th>
                              <th className="border-r border-slate-200 p-2 w-[300px]">15. Diễn giải</th>
                              <th className="border-r border-slate-200 p-2 w-20">16. Vụ việc</th>
                              <th className="border-r border-slate-200 p-2 w-24">17. Bộ phận</th>
                              <th className="border-r border-slate-200 p-2 w-28">18. Hợp đồng</th>
                              <th className="border-r border-slate-200 p-2 w-16">19. Bảng kê</th>
                              <th className="border-r border-slate-200 p-2 w-16">20. TD2</th>
                              <th className="p-2 w-24">21. Mã quyển</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="divide-x divide-slate-200 text-slate-800">
                              <td className="p-2 truncate font-semibold text-slate-500">{exportConfig.dvcs}</td>
                              <td className="p-2 truncate font-bold">{customerCodeForExcel}</td>
                              <td className="p-2 italic text-slate-400">— Trống —</td>
                              <td className="p-2 whitespace-normal break-words font-sans text-slate-650" title={r.dienGiai}>{r.dienGiai}</td>
                              <td className="p-2 font-semibold text-slate-600">{exportConfig.tkNo}</td>
                              <td className="p-2 text-center text-slate-500">{exportConfig.maGd}</td>
                              <td className="p-2 font-bold text-indigo-700">{formattedDocNum || <span className="text-red-500">Chờ nhập...</span>}</td>
                              <td className="p-2 text-slate-500">{formattedDate}</td>
                              <td className="p-2 text-center">{exportConfig.maNt}</td>
                              <td className="p-2 text-center text-indigo-650">{parsedTyGia}</td>
                              <td className="p-2 font-semibold text-slate-600">{finalTkCo}</td>
                              <td className="p-2 truncate">{customerCodeForExcel}</td>
                              <td className="p-2 text-right font-bold">{formatVND(r.tien)}</td>
                              <td className="p-2 text-right font-extrabold text-blue-700">{formatVND(r.tien * parsedTyGia)}</td>
                              <td className="p-2 whitespace-normal break-words font-sans text-slate-450 italic" title={dienGiaiWithEmail}>{dienGiaiWithEmail}</td>
                              <td className="p-2 truncate">{finalVuViec}</td>
                              <td className="p-2 truncate">{finalBoPhan}</td>
                              <td className="p-2 truncate">{r.hopDong || <span className="text-slate-350 font-sans italic">Trống</span>}</td>
                              <td className="p-2 italic text-slate-400">— Trống —</td>
                              <td className="p-2 italic text-slate-400">— Trống —</td>
                              <td className="p-2 truncate font-semibold text-slate-500">{exportConfig.maQuyen}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-150 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 italic">
                {filteredRows.length > 0 ? `Xuất ${filteredRows.length} dòng hạch toán đang được lọc` : "Không có dòng dữ liệu hợp lệ"}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={() => {
                    const hasUnclassified = filteredRows.some(r => r.maKhach === "KH_CHUA_PHAN_LOAI");
                    if (hasUnclassified) {
                      setShowWarningConfirmModal(true);
                    } else {
                      handleExportXlsx();
                      setShowExportModal(false);
                    }
                  }}
                  disabled={hasValidationError || filteredRows.length === 0}
                  className={`px-5 py-2 font-semibold rounded text-xs shadow-sm transition-colors flex items-center gap-2 cursor-pointer ${
                    hasValidationError || filteredRows.length === 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-100"
                      : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white"
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Xác nhận xuất (.xlsx)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWarningConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-[60] p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-xl shadow-2xl border border-rose-100 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-rose-950 text-rose-100 p-5 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Cảnh Báo Dữ Liệu Chưa Đồng Bộ</h3>
                <p className="text-[10px] text-rose-300">Phát hiện dòng hạch toán chưa khớp mã khách hàng</p>
              </div>
            </div>
            <div className="p-6 space-y-3 text-xs text-slate-600 leading-relaxed text-left">
              <p>
                Hiện tại có <strong className="text-rose-600">{filteredRows.filter(r => r.maKhach === "KH_CHUA_PHAN_LOAI").length} dòng</strong> hạch toán đang mang mã mặc định <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-700 font-mono font-bold">KH_CHUA_PHAN_LOAI</code>.
              </p>
              <p>
                Việc xuất file hạch toán khi chưa phân loại có thể gây lỗi hoặc sai lệch đối chiếu khi import vào phần Misa/Fast.
              </p>
              <p className="font-semibold text-slate-800">
                Bạn có chắc chắn muốn bỏ qua và tiếp tục xuất file Excel không?
              </p>
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-150 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowWarningConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-100 rounded cursor-pointer transition-colors"
              >
                Quay lại chỉnh sửa
              </button>
              <button
                onClick={() => {
                  handleExportXlsx();
                  setShowExportModal(false);
                  setShowWarningConfirmModal(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold rounded text-xs shadow-sm transition-colors cursor-pointer"
              >
                Vẫn xuất Excel (.xlsx)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State-Based Toast Notifications Component */}
      {toast && (
        <div
          id="custom-toast"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-xl border transition-all duration-300 transform translate-y-0 scale-100 ${
            toast.type === "success"
              ? "bg-slate-900 border-emerald-500/30 text-white"
              : toast.type === "error"
              ? "bg-red-950 border-red-500/30 text-rose-150"
              : "bg-slate-900 border-slate-700 text-slate-100"
          }`}
        >
          {toast.type === "success" && (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          {toast.type === "error" && (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          {toast.type === "info" && (
            <HelpCircle className="w-5 h-5 text-blue-400 shrink-0" />
          )}
          
          <span className="text-xs font-medium">{toast.message}</span>
          
          <button
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
