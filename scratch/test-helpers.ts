import {
  normalizeDate,
  cleanReason,
  generateDocumentNumber,
  parseExchangeRate
} from "../src/utils/exportHelpers";

function assertEqual(actual: any, expected: any, message: string) {
  if (actual === expected) {
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
    console.error(`   Actual:   ${JSON.stringify(actual)}`);
    console.error(`   Expected: ${JSON.stringify(expected)}`);
    process.exit(1);
  }
}

console.log("=== Testing normalizeDate ===");
const today = new Date();
const todayFormatted = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
assertEqual(normalizeDate(null), todayFormatted, "normalizeDate(null) returns today");
assertEqual(normalizeDate(undefined), todayFormatted, "normalizeDate(undefined) returns today");
assertEqual(normalizeDate(new Date(2026, 5, 15)), "15/06/2026", "normalizeDate(Date Object) returns formatted date");
assertEqual(normalizeDate(45323), "01/02/2024", "normalizeDate(45323 Excel serial number)");
assertEqual(normalizeDate("45323"), "01/02/2024", "normalizeDate('45323' Excel serial number string)");
assertEqual(normalizeDate("15/06/2026"), "15/06/2026", "normalizeDate('15/06/2026')");
assertEqual(normalizeDate("15-06-2026 12:34:56"), "15/06/2026", "normalizeDate('15-06-2026 12:34:56')");
assertEqual(normalizeDate("raw_text_here"), "raw_text_here", "normalizeDate(raw text) returns raw text");

console.log("\n=== Testing cleanReason ===");
assertEqual(cleanReason("Nộp tiền dịch vụ cloud (support@company.com)"), "Nộp tiền dịch vụ cloud", "cleanReason: basic email inside parens");
assertEqual(cleanReason("Thanh toan cloud (user.name+tag@domain.co.uk) cho thang 6"), "Thanh toan cloud cho thang 6", "cleanReason: email inside parens with complex address");
assertEqual(cleanReason("Tai khoan user@gmail.com nap tien"), "Tai khoan user@gmail.com nap tien", "cleanReason: free floating email");
assertEqual(cleanReason("Nộp tiền dịch vụ cloud(support@company.com)"), "Nộp tiền dịch vụ cloud", "cleanReason: email inside parens without leading space");
assertEqual(cleanReason("Hello (abc@def.com) World (xyz@domain.com)"), "Hello World", "cleanReason: multiple emails in parens");

console.log("\n=== Testing generateDocumentNumber ===");
assertEqual(generateDocumentNumber("GBC004774", 0), "GBC004774", "generateDocumentNumber: index 0");
assertEqual(generateDocumentNumber("GBC004774", 1), "GBC004775", "generateDocumentNumber: index 1");
assertEqual(generateDocumentNumber("004774", 1), "004775", "generateDocumentNumber: raw number");
assertEqual(generateDocumentNumber("GBC004774", 10), "GBC004784", "generateDocumentNumber: index 10");
assertEqual(generateDocumentNumber("GBC", 1), "GBC", "generateDocumentNumber: no number suffix returns original");
assertEqual(generateDocumentNumber("", 1), "", "generateDocumentNumber: empty string returns empty");

console.log("\n=== Testing parseExchangeRate ===");
assertEqual(parseExchangeRate(1), 1, "parseExchangeRate(1)");
assertEqual(parseExchangeRate(24000), 24000, "parseExchangeRate(24000)");
assertEqual(parseExchangeRate(0), null, "parseExchangeRate(0)");
assertEqual(parseExchangeRate(-10), null, "parseExchangeRate(-10)");
assertEqual(parseExchangeRate("1"), 1, "parseExchangeRate('1')");
assertEqual(parseExchangeRate("1.000.000"), 1000000, "parseExchangeRate('1.000.000')");
assertEqual(parseExchangeRate("1,000,000"), 1000000, "parseExchangeRate('1,000,000')");
assertEqual(parseExchangeRate("24.500,75"), 24500.75, "parseExchangeRate('24.500,75')");
assertEqual(parseExchangeRate("24,500.75"), 24500.75, "parseExchangeRate('24,500.75')");
assertEqual(parseExchangeRate("24.500"), 24500, "parseExchangeRate('24.500')");
assertEqual(parseExchangeRate("24,500"), 24500, "parseExchangeRate('24,500')");
assertEqual(parseExchangeRate("1,25"), 1.25, "parseExchangeRate('1,25')");
assertEqual(parseExchangeRate("1.25"), 1.25, "parseExchangeRate('1.25')");
assertEqual(parseExchangeRate("abc"), null, "parseExchangeRate('abc')");
assertEqual(parseExchangeRate(""), null, "parseExchangeRate('')");
assertEqual(parseExchangeRate(null), null, "parseExchangeRate(null)");

console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
