import { AccountingCustomer } from "../sampleData";

export const STORAGE_KEYS = {
  WEB_APP_URL: "google_sheets_web_app_url",
  USER_EMAIL: "google_sheets_user_email",
  SYNC_ENABLED: "google_sheets_sync_enabled",
  AUTO_PULL: "google_sheets_sync_auto_pull",
  AUTO_PUSH: "google_sheets_sync_auto_push",
  LOGS_ENABLED: "google_sheets_sync_logs",
  WRITE_TOKEN: "google_sheets_write_token", // Token bảo vệ ghi đè
};

export interface SheetsConfig {
  webAppUrl: string;
  userEmail: string;
  syncEnabled: boolean;
  autoPull: boolean;
  autoPush: boolean;
  logsEnabled: boolean;
  writeToken: string;
}

export interface BizflyCustomer {
  soPL: string;         // Cột F (index 0 trong projected API)
  tenSale: string;      // Cột H (index 1 trong projected API)
  nhanHang: string;     // Cột J (index 2 trong projected API)
  customerCode: string; // Cột BB (index 3 trong projected API)
}

export const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxLAZsFPx1Cu9gWxulT8whbdfS9dQ4Ga0q-0BLexarbR4WrEmOnHHBk2QTa3FqowmYk/exec";

export function loadSheetsConfig(): SheetsConfig {
  return {
    webAppUrl: localStorage.getItem(STORAGE_KEYS.WEB_APP_URL) || DEFAULT_WEB_APP_URL,
    userEmail: localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || "Unknown User",
    syncEnabled: localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) !== "false",
    autoPull: localStorage.getItem(STORAGE_KEYS.AUTO_PULL) !== "false",
    autoPush: localStorage.getItem(STORAGE_KEYS.AUTO_PUSH) !== "false",
    logsEnabled: localStorage.getItem(STORAGE_KEYS.LOGS_ENABLED) !== "false",
    writeToken: localStorage.getItem(STORAGE_KEYS.WRITE_TOKEN) || "default_token_please_change",
  };
}

export function saveSheetsConfig(config: Partial<SheetsConfig>): void {
  if (config.webAppUrl !== undefined) localStorage.setItem(STORAGE_KEYS.WEB_APP_URL, config.webAppUrl.trim());
  if (config.userEmail !== undefined) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, config.userEmail.trim());
  if (config.syncEnabled !== undefined) localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, String(config.syncEnabled));
  if (config.autoPull !== undefined) localStorage.setItem(STORAGE_KEYS.AUTO_PULL, String(config.autoPull));
  if (config.autoPush !== undefined) localStorage.setItem(STORAGE_KEYS.AUTO_PUSH, String(config.autoPush));
  if (config.logsEnabled !== undefined) localStorage.setItem(STORAGE_KEYS.LOGS_ENABLED, String(config.logsEnabled));
  if (config.writeToken !== undefined) localStorage.setItem(STORAGE_KEYS.WRITE_TOKEN, config.writeToken.trim());
}

export async function writeActionLogToSheet(
  webAppUrl: string,
  userStr: string,
  actionName: string,
  actionDetails: string,
  section: string = "Cloud"
): Promise<void> {
  if (!webAppUrl) return;
  try {
    await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "log",
        user: userStr,
        actionName,
        actionDetails,
        section
      })
    });
  } catch (err) {
    console.error("Failed to append activity logs:", err);
  }
}

export async function pullCustomersFromGoogleSheet(webAppUrl: string, sheetName: string): Promise<any[]> {
  if (!webAppUrl) return [];
  try {
    const response = await fetch(`${webAppUrl}?action=get_rules&sheetName=${encodeURIComponent(sheetName)}`);
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.data) {
        if (sheetName === "Bảng Mã Khách Hàng BIZFLY") {
          return parseBizflyCustomerRows(result.data);
        }
        return parseCustomerRows(result.data);
      }
    }
  } catch (err) {
    console.error("Lỗi khi tải bảng mã khách hàng từ Web App:", err);
  }
  return [];
}

function parseCustomerRows(rows: any[][]): AccountingCustomer[] {
  const customers: AccountingCustomer[] = [];
  
  rows.forEach((row: any) => {
    const customerCode = String(row[0] || "").trim();
    const email = String(row[1] || "").trim();
    const companyName = String(row[2] || "").trim();
    const taxCode = String(row[3] || "").trim();
    const address = String(row[4] || "").trim();
    
    if (customerCode || companyName) {
      customers.push({
        customerCode,
        email,
        companyName,
        taxCode,
        address
      });
    }
  });
  
  return customers;
}

function parseBizflyCustomerRows(rows: any[][]): BizflyCustomer[] {
  const customers: BizflyCustomer[] = [];
  
  rows.forEach((row: any) => {
    const soPL = String(row[0] || "").trim();
    const tenSale = String(row[1] || "").trim();
    const nhanHang = String(row[2] || "").trim();
    const customerCode = String(row[3] || "").trim();
    
    if (soPL || customerCode) {
      customers.push({
        soPL,
        tenSale,
        nhanHang,
        customerCode
      });
    }
  });
  
  return customers;
}

export async function pushCustomersToGoogleSheet(
  customers: AccountingCustomer[], 
  webAppUrl: string, 
  userStr: string,
  token: string = ""
): Promise<void> {
  if (!webAppUrl) return;
  
  const values: any[][] = customers.map(c => [
    c.customerCode,
    c.email,
    c.companyName,
    c.taxCode,
    c.address
  ]);

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "overwrite_rules",
        sheetName: "Bảng Mã Khách Hàng Chuẩn", // Chỉ Cloud mới được phép overwrite
        rules: values,
        user: userStr,
        token: token // Truyền token xác thực cho write action
      })
    });
    
    if (!response.ok) {
      throw new Error(`Web App returned error: ${response.statusText}`);
    } else {
      const result = await response.json();
      if (result.status === "error") {
        throw new Error(result.message || "Lỗi không xác định từ Apps Script");
      }
    }
  } catch(err) {
    console.error("Failed to push customers to sheets", err);
    throw err;
  }
}

export async function pushBizflyCustomersToGoogleSheet(
  values: any[][], 
  webAppUrl: string, 
  userStr: string,
  token: string = ""
): Promise<void> {
  if (!webAppUrl) return;

  try {
    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "overwrite_rules",
        sheetName: "Bảng Mã Khách Hàng BIZFLY",
        rules: values,
        user: userStr,
        token: token
      })
    });
    
    if (!response.ok) {
      throw new Error(`Web App returned error: ${response.statusText}`);
    } else {
      const result = await response.json();
      if (result.status === "error") {
        throw new Error(result.message || "Lỗi không xác định từ Apps Script");
      }
    }
  } catch(err) {
    console.error("Failed to push BIZFLY customers to sheets", err);
    throw err;
  }
}
