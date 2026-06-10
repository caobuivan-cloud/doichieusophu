/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BankTransaction {
  stt: number;
  date: string;
  referenceNo: string;
  payer: string;
  bankName: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface CloudRecord {
  stt: number;
  date: string;
  month: number;
  description: string;
  amount: number;
  paymentMethod: string;
  email: string;
  processedDate: string;
}

export interface AccountingCustomer {
  email: string;
  companyName: string;
  address: string;
  taxCode: string;
  customerCode: string; // Mã KH
}

export const sampleBankStatement: BankTransaction[] = [
  {
    stt: 1,
    date: "01/02/2026 09:29",
    referenceNo: "EBANKING01/FT260321NF4R",
    payer: "3101015104369/NGUYEN VAN HUNG",
    bankName: "MARITIME BANK",
    description: "Tai khoan hungxd2992@gmail.com, nap tien balance",
    debit: 0,
    credit: 500000,
    balance: 268771093,
  },
  {
    stt: 2,
    date: "01/02/2026 13:56",
    referenceNo: "IB20SML247/FT26032SKYTM",
    payer: "NGUYEN THE MINH",
    bankName: "MSB",
    description: "0370101000446-6032IBT1j1H1IK3-Nap tien dich vu tai khoan minhle91719gmailcom",
    debit: 0,
    credit: 1000000,
    balance: 269771093,
  },
  {
    stt: 3,
    date: "01/02/2026 20:31",
    referenceNo: "IB20SML247/FT26032J9VJY",
    payer: "NGUYEN THI NHU Y",
    bankName: "MSB",
    description: "0370101000446-6032BFTVG2EW6D7U-MBVCB.12842310506.6032BFTVG2EW6D7U.Nap tien dich vu tai khoan jenki@cocc.vn.CTtu 9972575631 NGUYEN THI NHU Y toi 0370101000446 CONGTY CO PHAN VCCORP tai MSB",
    debit: 0,
    credit: 1901500,
    balance: 271672593,
  },
  {
    stt: 4,
    date: "02/02/2026 07:00",
    referenceNo: "IB20SML247/FT26033L445G",
    payer: "HOANG TRUNG SANG",
    bankName: "MSB",
    description: "0370101000446-6033TPBVI22GYST6-nap tien dich vu tai khoan htjvn.trans@gmail.com",
    debit: 0,
    credit: 110000,
    balance: 271782593,
  },
  {
    stt: 5,
    date: "02/02/2026 08:39",
    referenceNo: "IB20SML247/FT26033HXDS4",
    payer: "NGUYEN THE DAN",
    bankName: "MSB",
    description: "0370101000446-6033BIDVE2TB3X8J-Tai khoan nguyenthedan0101982 gmail com nap",
    debit: 0,
    credit: 300000,
    balance: 272082593,
  },
  {
    stt: 6,
    date: "02/02/2026 11:20",
    referenceNo: "EBANKING02/FT26034XCVRT",
    payer: "CÔNG TY CLOUD_NEW_CORP",
    bankName: "VIETCOMBANK",
    description: "Nap tien Cloud VC hệ thống - MA KH HD3392",
    debit: 0,
    credit: 2500000,
    balance: 274582593,
  },
  {
    stt: 7,
    date: "02/02/2026 15:45",
    referenceNo: "EBANKING02/FT26035PLMKO",
    payer: "TRAN HOANG ANH",
    bankName: "MSB",
    description: "VCCloud payment - check manual",
    debit: 0,
    credit: 850000,
    balance: 275432593,
  }
];

export const sampleCloudTracking: CloudRecord[] = [
  {
    stt: 768,
    date: "01/02/2026",
    month: 2,
    description: "Tai khoan hungxd2992@gmail.com, nap tien balance",
    amount: 500000,
    paymentMethod: "MSB",
    email: "hungxd2992@gmail.com",
    processedDate: "",
  },
  {
    stt: 769,
    date: "01/02/2026",
    month: 2,
    description: "0370101000446-6032IBT1j1H1IK3-Nap tien",
    amount: 1000000,
    paymentMethod: "MSB",
    email: "minhle.91719@gmail.com",
    processedDate: "",
  },
  {
    stt: 770,
    date: "01/02/2026",
    month: 2,
    description: "0370101000446-6032BFTVG2EW6D7U",
    amount: 1901500,
    paymentMethod: "MSB",
    email: "jenki@cocc.vn",
    processedDate: "12-Feb",
  },
  {
    stt: 771,
    date: "02/02/2026",
    month: 2,
    description: "0370101000446-6033TPBVI22GYST6",
    amount: 110000,
    paymentMethod: "MSB",
    email: "htjvn.trans@gmail.com",
    processedDate: "5-Feb",
  },
  {
    stt: 772,
    date: "02/02/2026",
    month: 2,
    description: "0370101000446-6033BIDVE2TB3X8J",
    amount: 300000,
    paymentMethod: "MSB",
    email: "nguyenthedan0101982@gmail.com",
    processedDate: "",
  }
];

export const sampleAccountingCodes: AccountingCustomer[] = [
  {
    email: "tungcc@mobifoneservice.com.vn",
    companyName: "Công ty cổ phần dịch vụ kỹ thuật Mobifone",
    address: "Tầng 3, tòa nhà TTC, số 19 phố Duy Tân, Hà Nội",
    taxCode: "0102636299",
    customerCode: "KH030840",
  },
  {
    email: "phong@vngmedia.vn",
    companyName: "CÔNG TY CỔ PHẦN TRUYỀN THÔNG VNG VIỆT NAM",
    address: "Số 11 ngõ 160 đường Lương Thế Vinh, Hà Nội",
    taxCode: "102954213",
    customerCode: "KH026633",
  },
  {
    email: "ngon@ahamove.com",
    companyName: "Công ty cổ phần Dịch vụ Tức Thời",
    address: "405/15 Xô Viết Nghệ Tĩnh, Phường 24, Q. Bình Thạnh, TP.HCM",
    taxCode: "313506115",
    customerCode: "KH030960",
  },
  {
    email: "support@vavietnam.com",
    companyName: "CÔNG TY CỔ PHẦN V&A VIỆT NAM",
    address: "Số 63 ngõ 477 đường Nguyễn Trãi, Hà Nội",
    taxCode: "103330151",
    customerCode: "KH021885",
  },
  {
    email: "nvh53c@gmail.com",
    companyName: "Công ty cổ phần Kombo",
    address: "Số 60 đường Lê Văn Thiêm, Hà Nội",
    taxCode: "106473461",
    customerCode: "KH030962",
  },
  {
    email: "hungxd2992@gmail.com",
    companyName: "Doanh nghiệp Tư nhân Nguyễn Văn Hùng Cloud",
    address: "Số 1 Nguyễn Huy Tưởng, Thanh Xuân, Hà Nội",
    taxCode: "0101871229",
    customerCode: "KH03033",
  },
  {
    email: "minhle.91719@gmail.com",
    companyName: "Hộ kinh doanh Cá nhân Lê Minh",
    address: "Thảo Điền, Quận 2, TP. Hồ Chí Minh",
    taxCode: "0310293121",
    customerCode: "KH027690",
  },
  {
    email: "jenki@cocc.vn",
    companyName: "CÔNG TY CỔ PHẦN CỐC CỐC",
    address: "12A Tôn Thất Thuyết, Cầu Giấy, Hà Nội",
    taxCode: "0103289012",
    customerCode: "KH028911",
  },
  {
    email: "htjvn.trans@gmail.com",
    companyName: "CÔNG TY TNHH VẬN TẢI HT VIỆT NAM",
    address: "Phú Diễn, Bắc Từ Liêm, Hà Nội",
    taxCode: "0102654321",
    customerCode: "KH031234",
  },
  {
    email: "nguyenthedan0101982@gmail.com",
    companyName: "Khách hàng Nguyễn Thế Dân Cloud",
    address: "Hai Bà Trưng, Hà Nội",
    taxCode: "0109923812",
    customerCode: "KH031122",
  }
];
