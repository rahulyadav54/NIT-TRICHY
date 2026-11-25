# TRIMA ERP — Trichy Integrated Manufacturing & Audit
## Development Plan & Technical Architecture Roadmap

**Version:** 1.0  
**Date:** November 2026  
**Context:** NIT Tiruchirappalli Winter Internship Benchmark Problem Statement  
**Target Enterprise:** Small South Indian Packaged Snacks Manufacturer (Benchmark: Murukku 200g Packets)  

---

## 1. Executive Summary & Problem Scope

**TRIMA ERP** (*"From Order to Audit. Everything Connected."*) is a mission-critical, full-stack Enterprise Resource Planning solution engineered specifically for small packaged snack food manufacturing units in South India.

The application manages the end-to-end operational and financial life cycle:
1. **Sales Order Capture** via a mobile-optimized salesman interface.
2. **Order Verification & Approval** by Admin.
3. **Bill of Materials (BOM) Formulation** with automated batch scaling and unit conversions (kg, g, L, ml, pieces, cartons).
4. **Procurement & Goods Receipt** directly updating the stock ledger.
5. **Manufacturing Execution** tracking standard vs. actual consumption, damaged packaging scrap, good packet yields, and 3% tolerance variance alerts.
6. **Statutory GST Invoicing** (Intra-state CGST/SGST vs. Inter-state IGST at 5% benchmark), dispatch control with atomic stock reservation, and credit notes.
7. **Accounts Receivable & Multi-tranche Payments** with customer ageing and balance tracking.
8. **Weighted-Average Inventory Valuation & Granular Costing** incorporating raw materials, packaging, labour, power, and gas overheads per packet.
9. **Role-Based Access Control (RBAC)** across 5 roles: SALESMAN, ADMIN, PRODUCTION SUPERVISOR, ACCOUNTANT / AUDITOR, and OWNER.
10. **Statutory Reporting, Immutable Audit Trails, and Multi-format Exports** (PDF, Excel, CSV).

---

## 2. Workspace Assessment & Runtime Environment

### Inspection Findings
- **Workspace State:** Fresh / empty directory (`c:\PROJECTS\TRIMA NIT`).
- **Node.js Runtime:** `v24.16.0` (LTS/current modern Node runtime available).
- **Package Manager:** `npm 11.13.0`.
- **Git:** Fresh directory, will initialize local git repository.
- **Database Strategy:**
  - Docker engine is not currently on PATH in this environment.
  - PostgreSQL is required as the primary database.
  - To support reliable local execution, we will configure Prisma to target PostgreSQL via `DATABASE_URL` (with standard connection string), provide complete `docker-compose.yml` for containerized environments, and support an embedded/local Postgres setup (such as `@electric-sql/pglite` or local Postgres service) or standard PostgreSQL container. Prisma migrations and schema will remain 100% standard PostgreSQL.

---

## 3. Technology Stack & Architectural Decisions

### Frontend Architecture
- **Framework:** React 18+ with Vite and TypeScript.
- **Styling & UI Components:** Tailwind CSS, shadcn/ui design primitives, Lucide React icons.
- **Design System:** Deep navy blue primary (`#0F172A` / `#1E293B`), Teal secondary/accent (`#0D9488` / `#14B8A6`), light neutral grey backgrounds (`#F8FAFC`), white card surfaces, subtle borders and shadows.
- **Routing:** React Router v6 with strict Protected Route guards.
- **Server State & Caching:** TanStack Query (React Query) v5 for data synchronization and cache invalidation.
- **Form Management & Validation:** React Hook Form with Zod schemas.
- **Data Visualization:** Recharts for sales trends, production yield variance, and cost breakdowns.

### Backend Architecture
- **Runtime & Framework:** Node.js with Express.js and TypeScript.
- **ORM & Database Client:** Prisma ORM connected to PostgreSQL.
- **Decimal Precision:** Prisma `Decimal` and `decimal.js` for financial arithmetic (zero IEEE-754 floating-point inaccuracies).
- **Security & Auth:** HTTP-only cookies / Bearer JWT with bcrypt (cost factor 10), role-enforcing middleware at router and controller levels.
- **Document & File Generation:**
  - PDF: `pdfmake` / `jspdf` / `html-pdf` for compliant GST tax invoices and reports.
  - Spreadsheets: `exceljs` for multi-tab formatted Excel workbooks.
  - CSV: `csv-stringify` / `fast-csv`.

---

## 4. Module Dependency Graph & Workflow Topology

```
[Phase 1: Project & DB Foundation]
             │
             ▼
[Phase 2: Auth, Roles & Master Data] (Users, Customers, Suppliers, Products, Materials)
             │
             ├─────────────────────────────────────────────────┐
             ▼                                                 ▼
[Phase 3: BOM, Purchases & Inventory Ledger]       [Phase 5: Sales Order Workflow]
(Formulas, Unit Conv, Raw/Pack/FG Stock)           (Mobile Salesman, Price Snapshots)
             │                                                 │
             ▼                                                 │
[Phase 4: Production Run & Variance Analysis]                 │
(Actual vs BOM, Yield, Scrap, Warnings)                        │
             │                                                 │
             ├─────────────────────────────────────────────────┘
             ▼
[Phase 6: GST Invoicing, Dispatch & Payments]
(Stock Validation, CGST/SGST/IGST, Allocation)
             │
             ▼
[Phase 7: Costing & Weighted-Average Valuation]
(Flour, Oil, Pouches, Labour, Overheads per packet)
             │
             ▼
[Phase 8: Reporting, Audit Trail & Exports]
(16 Date-filterable Registers, PDF/Excel/CSV, Audit Log)
             │
             ▼
[Phase 9: Role-Specific Dashboards & UI/UX]
(Admin, Production, Owner, Auditor, Salesman)
             │
             ▼
[Phase 10: Benchmark Seed Data & Automated E2E Tests]
(Murukku 200g Benchmark Verification)
             │
             ▼
[Phase 11: Security Hardening, Deployment & Final Deliverables]
```

---

## 5. Major Database Entities & Relations (Prisma Schema Blueprint)

1. **User & Role:** `User` (id, email, passwordHash, name, role [SALESMAN, ADMIN, PRODUCTION_SUPERVISOR, ACCOUNTANT_AUDITOR, OWNER], active).
2. **Master Entities:**
   - `Customer`: id, code, name, type (RETAILER, DISTRIBUTOR), gstin, billingAddress, shippingAddress, state, stateCode, phone, email, assignedSalesmanId, creditLimit.
   - `Supplier`: id, code, name, gstin, contactInfo, address, state, stateCode, paymentTerms.
   - `Product`: id, code, sku, name, category, packSize, netWeightGrams, hsnCode, gstRate (5%), unit, active.
   - `ProductPrice`: id, productId, customerType, effectiveDate, price (Decimal), isCurrent.
   - `Material`: id, code, name, category (RAW_MATERIAL, PACKAGING), unit (KG, L, PCS, G, ML), openingStock, reorderLevel, purchaseRate, active.
3. **BOM & Operations:**
   - `BOM`: id, bomNumber, productId, version, batchSize, expectedOutput, effectiveDate, isActive.
   - `BOMItem`: id, bomId, materialId, standardQuantity, unit.
4. **Procurement & Inventory:**
   - `Purchase`: id, poNumber, supplierId, orderDate, receivedDate, status, subtotal, taxTotal, grandTotal.
   - `PurchaseItem`: id, purchaseId, materialId, orderedQty, receivedQty, unitRate, subtotal.
   - `InventoryMovement`: id, materialId (nullable), productId (nullable), category (RAW, PACKAGING, FINISHED_GOODS), transactionType (OPENING_STOCK, PURCHASE_RECEIPT, PRODUCTION_ISSUE, PRODUCTION_RECEIPT, SALES_DISPATCH, RETURN, ADJUSTMENT), qtyIn, qtyOut, balanceAfter, unit, sourceDocumentType, sourceDocumentId, transactionDate, performedByUserId, notes.
5. **Manufacturing Execution:**
   - `ProductionRun`: id, runNumber, productId, bomId, batchSize, plannedOutput, goodOutput, damagedPackagingQty, cartonsUsed, productionDate, supervisorUserId, labourCost, powerGasCost, otherOverheads, totalCost, costPerPacket, yieldVariancePct, status, notes.
   - `ProductionConsumption`: id, productionRunId, materialId, plannedQty, actualQty, varianceQty, variancePct, unitCost, totalCost, unit.
6. **Sales, Invoicing & Receivables:**
   - `SalesOrder`: id, orderNumber, salesmanUserId, customerId, orderDate, status (DRAFT, SUBMITTED, APPROVED, REJECTED, INVOICED, PARTIALLY_DISPATCHED, DISPATCHED), subtotal, taxTotal, grandTotal, notes.
   - `SalesOrderItem`: id, salesOrderId, productId, quantity, unitPrice, subtotal.
   - `Invoice`: id, invoiceNumber, salesOrderId, customerId, invoiceDate, dueDate, placeOfSupply, taxableAmount, gstRate, cgstAmount, sgstAmount, igstAmount, grandTotal, balanceDue, status (ISSUED, PARTIALLY_PAID, PAID, CANCELLED).
   - `InvoiceItem`: id, invoiceId, productId, hsnCode, quantity, unitPrice, taxableAmount, gstRate, cgst, sgst, igst, totalAmount.
   - `Dispatch`: id, dispatchNumber, invoiceId, salesOrderId, dispatchDate, status, notes.
   - `DispatchItem`: id, dispatchId, productId, quantityDispatched.
   - `Payment`: id, paymentNumber, customerId, invoiceId, amount, paymentMode (CASH, NEFT, RTGS, CHEQUE, UPI), referenceNumber, paymentDate, notes.
   - `CreditNote`: id, creditNoteNumber, invoiceId, reason, taxableAmount, cgst, sgst, igst, totalAmount, date.
7. **Governance & Audit:**
   - `AuditLog`: id, userId, action, entityName, entityId, previousValues (JSON), newValues (JSON), timestamp, ipAddress.

---

## 6. Phase-by-Phase Implementation Blueprint

| Phase | Core Deliverables | Testing & Gate Criteria |
|---|---|---|
| **Phase 0** | Workspace inspection, requirements analysis, `DEVELOPMENT_PLAN.md`, `DEVELOPMENT_PROGRESS.md`, `FEATURE_CHECKLIST.md`, `docs/architecture.md`. | Complete blueprint approved by user. |
| **Phase 1** | Monorepo structure, Vite+React+TS frontend, Express+TS backend, Tailwind+shadcn/ui, PostgreSQL setup, Prisma schema, Health check API, dev scripts. | Frontend and backend build and run clean; DB connection & health checks succeed. |
| **Phase 2** | JWT auth, bcrypt, 5 roles, route guards, complete CRUD for Products, Customers, Suppliers, Materials, User management. | All 5 roles login; backend permission checks pass; auditor is read-only. |
| **Phase 3** | BOM master & scaling, centralized Unit Conversion service, Purchase orders & receipt workflow, immutable Inventory Ledger, low-stock alerts. | Murukku BOM created; 60 kg flour purchase updates stock from 100 kg to 160 kg; zero negative stock. |
| **Phase 4** | Production run module, material issues, good/scrap outputs, automatic inventory balance updates, formula variance & yield calculations with ±3% warnings. | Benchmark Run: 188 good packets, 6 damaged pouches; exact closing stock matches; yield (-6%) and oil (+5%) warnings fire. |
| **Phase 5** | Mobile-first salesman order entry (< 1 min UX), price snapshots, Admin order verification/approval/rejection, stock concurrency protection. | Salesman creates Retailer A order (150 pkts); prices snapshotted; Admin approves; concurrency safe. |
| **Phase 6** | Statutory GST Invoicing (Intra-TN 2.5%+2.5% vs Inter-state 5%), PDF generation, dispatch stock deduction, multi-payment receipt, distributor stock shortage block. | Retailer A invoice ₹7,875; dispatch leaves 88 pkts; ₹4,000 payment leaves ₹3,875 outstanding; Distributor B (120 pkts) blocked. |
| **Phase 7** | Weighted-average inventory valuation, batch costing (flour, oil, spice, pouches, cartons, ₹1200 labour, ₹600 power/gas), cost per good packet, gross margin. | Weighted avg rates traceable; cost per packet matches material + packaging + overhead breakdown; historical preservation. |
| **Phase 8** | 16 mandatory date-filterable reports, PDF/Excel/CSV exports, immutable audit log for all updates/reversals, auditor read-only enforcement. | All 16 reports calculate from real DB records; exports download cleanly; audit logs capture state changes. |
| **Phase 9** | 5 distinct role-specific dashboards (Admin, Production Supervisor, Owner, Auditor, Salesman), responsive mobile navigation, search, notifications. | Every dashboard displays real backend metrics; charts render live data; zero hardcoded statistics. |
| **Phase 10** | Repeatable idempotent benchmark seed script, automated end-to-end test suite asserting all 20+ benchmark values and edge cases. | Automated test suite passes 100% of benchmark assertions and edge cases; benchmark test report generated. |
| **Phase 11** | Security hardening (rate limiting, sanitize, CORS, bcrypt), Docker deployment, 2-page Design Note with ER diagram, 8-min walkthrough demo script, final report. | Production build clean; documentation complete; internship submission ready. |

---

## 7. Technical Risks & Mitigation Strategies

1. **Precision in Financial & Stock Calculations:**
   - *Risk:* Rounding discrepancies in GST (paise calculations) or material usage (decimals in kg/L).
   - *Mitigation:* Decimal.js / Prisma `Decimal(12, 4)` for inventory and `Decimal(12, 2)` for currency. No JavaScript float arithmetic (`+`, `*`).
2. **Stock Concurrency & Race Conditions:**
   - *Risk:* Multiple salesmen or dispatches simultaneously committing more finished goods than in stock.
   - *Mitigation:* Database transactions (`prisma.$transaction`) with atomic stock verification and row locks during dispatch.
3. **Pouch Wastage Accounting:**
   - *Risk:* Forgetting that damaged pouches also consume packaging stock and add to the production packet cost.
   - *Mitigation:* Packaging consumption explicitly equals `good_packets + damaged_pouches`, logged in the ledger and factored into total batch cost.
4. **GST Place of Supply Compliance:**
   - *Risk:* Incorrect tax components on inter-state shipments.
   - *Mitigation:* Systematic state code comparison: `supplierStateCode === customerStateCode ? (CGST + SGST) : IGST`.

