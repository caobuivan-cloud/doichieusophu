import { AccountingCustomer } from "../sampleData";

export const STORAGE_KEYS = {
  WEB_APP_URL: "google_sheets_web_app_url",
  USER_EMAIL: "google_sheets_user_email",
  SYNC_ENABLED: "google_sheets_sync_enabled",
  AUTO_PULL: "google_sheets_sync_auto_pull",
  AUTO_PUSH: "google_sheets_sync_auto_push",
  LOGS_ENABLED: "google_sheets_sync_logs",
};

export interface SheetsConfig {
  webAppUrl: string;
  userEmail: string;
  syncEnabled: boolean;
  autoPull: boolean;
  autoPush: boolean;
  logsEnabled: boolean;
}

export const DEFAULT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxLAZsFPx1Cu9gWxulT8whbdfS9dQ4Ga0q-0BLexarbR4WrEmOnHHBk2QTa3FqowmYk/exec";

export function loadSheetsConfig(): SheetsConfig {
  return {
    webAppUrl: DEFAULT_WEB_APP_URL,
    userEmail: localStorage.getItem(STORAGE_KEYS.USER_EMAIL) || "Unknown User",
    syncEnabled: localStorage.getItem(STORAGE_KEYS.SYNC_ENABLED) !== "false",
    autoPull: localStorage.getItem(STORAGE_KEYS.AUTO_PULL) !== "false",
    autoPush: localStorage.getItem(STORAGE_KEYS.AUTO_PUSH) !== "false",
    logsEnabled: localStorage.getItem(STORAGE_KEYS.LOGS_ENABLED) !== "false",
  };
}

export function saveSheetsConfig(config: Partial<SheetsConfig>): void {
  if (config.userEmail !== undefined) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, config.userEmail.trim());
  if (config.syncEnabled !== undefined) localStorage.setItem(STORAGE_KEYS.SYNC_ENABLED, String(config.syncEnabled));
  if (config.autoPull !== undefined) localStorage.setItem(STORAGE_KEYS.AUTO_PULL, String(config.autoPull));
  if (config.autoPush !== undefined) localStorage.setItem(STORAGE_KEYS.AUTO_PUSH, String(config.autoPush));
  if (config.logsEnabled !== undefined) localStorage.setItem(STORAGE_KEYS.LOGS_ENABLED, String(config.logsEnabled));
}

export async function writeActionLogToSheet(
  webAppUrl: string,
  userStr: string,
  actionName: string,
  actionDetails: string
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
        actionDetails
      })
    });
  } catch (err) {
    console.error("Failed to append activity logs:", err);
  }
}

export async function pullCustomersFromGoogleSheet(webAppUrl: string): Promise<AccountingCustomer[]> {
  if (!webAppUrl) return [];
  try {
    const response = await fetch(`${webAppUrl}?action=get_rules`);
    if (response.ok) {
      const result = await response.json();
      if (result.status === "success" && result.data) {
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

export async function pushCustomersToGoogleSheet(customers: AccountingCustomer[], webAppUrl: string, userStr: string): Promise<void> {
  if (!webAppUrl || customers.length === 0) return;
  
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
        rules: values,
        user: userStr
      })
    });
    
    if (!response.ok) {
      throw new Error(`Web App returned error: ${response.statusText}`);
    }
  } catch(err) {
    console.error("Failed to push customers to sheets", err);
    throw err;
  }
}
