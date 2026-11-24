# UdyamFlow ERP — From Order to Audit. Everything Connected.

**TRIMA — Trichy Integrated Manufacturing & Audit**  
*National Institute of Technology, Tiruchirappalli — Winter Internship Evaluation*

---

## 🌟 Project Overview
**UdyamFlow ERP** is an enterprise-grade ERP system engineered specifically for small South Indian packaged food manufacturers, using a standardized **Murukku 200g** production and distribution workflow as reference.

The system connects field sales, procurement, batch manufacturing, automated variance calculation, statutory GST invoicing, dispatch inventory deduction, accounts receivable, weighted-average costing, and compliance auditing.

---

## 🛠️ Technology Stack
- **Frontend:** React 18, TypeScript, Vite 6, Tailwind CSS, shadcn/ui components, Lucide icons, TanStack Query v5.
- **Backend:** Node.js, Express.js, TypeScript, RESTful API architecture.
- **Database & Persistence:** PostgreSQL via Prisma ORM and zero-config in-process PostgreSQL (`@electric-sql/pglite`).
- **Financial Precision:** `Decimal.js` and Prisma `Decimal` (zero floating-point math for money or stock).
- **Security & RBAC:** JWT authentication, bcrypt password hashing, and role authorization middleware.
- **Export Engines:** ExcelJS (multi-tab workbooks), CSV Stringify, and PDF generation.

---

## 👥 Five User Roles & Test Credentials

All accounts are pre-seeded with the password: `password123`

| Role | Email | Password | Primary Permissions |
|---|---|---|---|
| **SALESMAN** | `salesman@trima.com` | `password123` | Mobile order entry (< 1 min), assigned customer portfolio, price list, order history. |
| **ADMIN** | `admin@trima.com` | `password123` | Master data CRUD, order verification & approval, GST tax invoices, dispatches, payment collection. |
| **PRODUCTION SUPERVISOR** | `production@trima.com` | `password123` | BOM recipes, material issues, production runs, scrap/damaged packaging logging, variance alerts. |
| **ACCOUNTANT / AUDITOR** | `auditor@trima.com` | `password123` | Read-only compliance mode, 16 date-filtered registers, financial summaries, CSV/Excel exports. |
| **OWNER** | `owner@trima.com` | `password123` | Executive dashboard, live stock valuation, batch profitability, cost per good packet, gross margins. |

---

## 🚀 Quick Start & Local Execution

### 1. Prerequisites
- Node.js `v20+` or `v24+`
- npm `10+` or `11+`

### 2. Installation
```powershell
# In project root:
cd backend
npm install
npm run build

cd ../frontend
npm install
npm run build
```

### 3. Database Initialization & Seeding
```powershell
cd backend
# Seeds the 5 core roles, Murukku 200g BOM, and master entities:
npm run db:seed
```

### 4. Running Development Servers
```powershell
# Terminal 1 - Backend API (Port 5000):
cd backend
npm run dev

# Terminal 2 - Frontend UI (Port 5173):
cd frontend
npm run dev
```
Open browser at: `http://localhost:5173`

---

## 🧪 Automated Benchmark Testing

Run the end-to-end internship benchmark suite asserting all 26 metrics:
```powershell
cd backend
npx tsx test/benchmark.test.ts
```

### Verified Benchmark Criteria
- **Opening Stock:** Flour 100 kg, Oil 30 L, Spice 5 kg, 200g Pouches 500 pcs, Cartons 30 pcs, Finished Murukku 50 pkts.
- **Purchase:** 60 kg Flour @ ₹45/kg $\rightarrow$ Closing Flour: **160 kg**.
- **Production Run (Murukku 200g):** Actual: Flour 40 kg, Oil 10.5 L, Spice 1.2 kg, Good pkts 188, Damaged pouches 6, Cartons 9.
  - Yield Variance: **-6.00%** (Alert triggered at $> 3\%$).
  - Oil Consumption Variance: **+5.00%** (Alert triggered at $> 3\%$).
  - Closing Flour Stock: **120 kg**
  - Closing Oil Stock: **19.5 L**
  - Closing Spice Stock: **3.8 kg**
  - Closing Pouch Stock: **306 pcs** ($500 - 188 - 6$)
  - Closing Carton Stock: **21 pcs** ($30 - 9$)
  - Closing Finished Goods: **238 packets** ($50 + 188$)
- **Retailer A (Tamil Nadu - Intra-state):** 150 pkts @ ₹50 = Taxable ₹7,500 + CGST (2.5%) ₹187.50 + SGST (2.5%) ₹187.50 = **₹7,875.00**.
  - Dispatch 150 pkts $\rightarrow$ Remaining Finished Goods: **88 pkts**.
  - Payment: ₹4,000 $\rightarrow$ Remaining Outstanding: **₹3,875.00**.
- **Distributor B (Karnataka - Inter-state):** Requested 120 pkts $\rightarrow$ Available 88 pkts $\rightarrow$ **Shortage of 32 packets** accurately alerted; dispatch and invoicing blocked.
- **Production Costing:** Raw materials + Packaging (including damaged pouches) + Labour (₹1,200) + Power/Gas (₹600) = ₹5,810 / 188 pkts = **₹30.90 per packet** ($38.19\%$ gross profit margin).

---

## 📊 16 Mandatory Reports
Available under `/api/reports` with date filtering and CSV/Excel exports:
1. Sales Register
2. Customer-Wise Sales
3. Product-Wise Sales
4. GST Outward Supplies Summary (GSTR-1)
5. Purchase Register
6. Raw Material Stock Summary
7. Packaging Stock Summary
8. Finished Goods Stock Summary
9. Stock Ledger (Detailed movements)
10. Production Report
11. Planned vs Actual Consumption
12. Yield & Wastage Report
13. Product Cost Report
14. Payments & Collections
15. Outstanding Receivables
16. Customer Ageing Report (0-30, 31-60, 61-90, 90+ days)

---

## 📄 License
NIT Tiruchirappalli Winter Internship Project • Proprietary & Confidential

# NIT-TRICHY
