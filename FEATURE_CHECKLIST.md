# UdyamFlow ERP — Comprehensive Feature & Requirement Checklist

This checklist tracks every mandatory requirement, should-have feature, business rule, and benchmark calculation specified for the **UdyamFlow ERP (TRIMA)** project.

---

## 1. Global Architectural & Engineering Rules
- [x] Inspect existing workspace before modifying files.
- [x] Clean, modular monorepo architecture (`frontend/` + `backend/`).
- [x] Real frontend screens connected to real backend APIs (zero hardcoded mock data).
- [x] PostgreSQL as primary database via Prisma ORM.
- [x] Zero reliance on `localStorage` for primary database state.
- [ ] Strict backend authorization middleware on every private endpoint.
- [ ] Database transactions (`prisma.$transaction`) for multi-record operations.
- [x] `Decimal.js` / Prisma `Decimal` for currency and precision inventory. Zero JS float arithmetic for money.
- [ ] Stock balances strictly derived from inventory movement ledger entries (not manually editable).
- [ ] Comprehensive immutable Audit Log for all critical operations.
- [ ] Zero silent deletion or overwriting of posted invoices or production records (use credit notes/reversals).
- [ ] Historical product prices and BOM versions preserved over time.
- [x] Form validation, loading spinners, empty states, and toast notifications.
- [ ] Automated unit and end-to-end integration tests for critical business logic.

---

## 2. Authentication & Five User Roles (Phase 2)
- [x] Secure JWT / session authentication with bcrypt password hashing.
- [x] Invalid credential rejection and session expiry handling.
- [x] **SALESMAN Role:**
  - [x] Secure login & mobile-optimized navigation.
  - [x] Filter customer list to assigned customers only.
  - [x] View product catalogue and active price list.
  - [ ] Create and submit sales orders in < 1 minute.
  - [ ] View order history and order statuses.
  - [ ] View customer-wise sales summary.
  - [x] Blocked from accessing admin, production, or accounting modules.
- [x] **ADMIN Role:**
  - [ ] Full visibility of incoming and historical orders.
  - [x] Manage customers, products, suppliers, and materials.
  - [ ] Verify, adjust quantities/prices (with history), and approve/reject orders.
  - [ ] Generate GST tax invoices from approved orders.
  - [ ] Manage dispatch batches and update stock.
  - [ ] Record customer payment collections.
  - [ ] View complete business reports.
- [x] **PRODUCTION SUPERVISOR Role:**
  - [x] View real-time raw material and packaging stock balances.
  - [ ] View active BOM recipes and batch requirements.
  - [x] Record material receipts/purchases where authorized.
  - [ ] Create production runs and issue materials.
  - [ ] Record good output packets, damaged packaging, and scrap.
  - [ ] View variance alerts and production history.
- [x] **ACCOUNTANT / AUDITOR Role:**
  - [x] Read-only access enforced by backend middleware.
  - [ ] View Sales Register and GST Outward Supplies summary.
  - [ ] View Purchase Register and Stock Ledger.
  - [ ] View Production Reports and Outstanding Receivables.
  - [ ] Export reports to PDF, Excel, and CSV.
  - [x] Blocked from modifying, posting, or deleting business transactions.
- [x] **OWNER Role:**
  - [ ] Executive dashboard with high-level revenue and sales analytics.
  - [x] Live finished goods, raw materials, and packaging inventory valuation.
  - [ ] Production efficiency and batch yield trends.
  - [ ] Material consumption variance and wastage alerts (> 3% threshold).
  - [ ] Unit cost per packet and gross profit margin analytics.
  - [ ] Outstanding receivables summary and ageing buckets.

---

## 3. Master Data Management (Phase 2)
- [x] **Product Master:** Product ID, code, SKU, name, category, pack size, selling price, HSN code, GST rate (5%), unit, active flag.
- [x] **Customer Master:** Customer ID, name, type (Retailer/Distributor), GSTIN, billing/shipping address, state, state code, phone, email, assigned salesman, credit limit.
- [x] **Supplier Master:** Supplier name, GSTIN, contact info, address, state, state code, payment terms.
- [x] **Raw Material Master:** Code, name, unit (kg, L, g, ml), opening stock, reorder level, purchase rate, ledger-derived balance.
- [x] **Packaging Material Master:** Code, name, unit (pcs, cartons), opening stock, purchase rate, ledger-derived balance.

---

## 4. Bill of Materials (BOM) & Unit Conversion (Phase 3)
- [x] Support BOM versioning (preserve past versions without breaking past production).
- [x] Batch size, expected output, raw materials, packaging materials, and quantities.
- [x] Benchmark BOM: Murukku 200g (Batch size 200 pkts):
  - [x] Flour: 40 kg
  - [x] Cooking Oil: 10 L
  - [x] Salt & Spice Mix: 1.2 kg
  - [x] 200g Pouch: 200 pcs
  - [x] Carton: 10 pcs
- [x] Dynamic batch requirement scaling based on target output.
- [x] Centralized Unit Conversion Service (kg <-> g, L <-> ml, pcs <-> cartons) with incompatibility rejection.

---

## 5. Procurement & Inventory Ledger (Phase 3)
- [x] Purchase order creation with supplier, materials, quantities, and rates.
- [x] Goods receipt workflow updating inventory atomically.
- [x] Dedicated stock categories: Raw Materials, Packaging Materials, Finished Goods.
- [x] Immutable Inventory Movement Ledger recording:
  - [x] Transaction ID, item ID, movement type (Opening, Purchase, Production Issue, Production Receipt, Dispatch, Return, Adjustment).
  - [x] Quantity in, quantity out, balance after transaction, unit, source document ID, user ID, timestamp.
- [x] Strict negative stock prevention in normal workflows.
- [x] Real-time low stock and reorder level alerts.
- [x] **Benchmark Purchase Verification:**
  - [x] Opening flour stock: 100 kg.
  - [x] Purchase: 60 kg flour @ ₹45/kg.
  - [x] Resulting flour stock: 160 kg.

---

## 6. Production Management & Variance Engine (Phase 4)
- [x] Select finished product and BOM version, input planned batch size.
- [x] Auto-calculate planned material requirements and display current stock availability.
- [x] Record actual material issues, good output, damaged pouches, and cartons used.
- [x] Atomic database transaction:
  - [x] Deduct consumed raw materials from inventory ledger.
  - [x] Deduct total pouches (good packets + damaged pouches) and cartons from inventory ledger.
  - [x] Credit good output packets to finished goods inventory ledger.
- [x] **Variance Computations:**
  - [x] Consumption Variance % = `((Actual - Planned) / Planned) * 100`
  - [x] Yield Variance % = `((Actual - Planned) / Planned) * 100`
  - [x] Warning triggers automatically when `abs(variance) > 3.0%`.
- [x] **Benchmark Production Run Verification:**
  - [x] Planned: Flour 40 kg, Oil 10 L, Spice 1.2 kg, Pouches 200, Cartons 10 -> Expected: 200 pkts.
  - [x] Actual: Flour 40 kg, Oil 10.5 L, Spice 1.2 kg, Good packets 188, Damaged pouches 6, Cartons 9.
  - [x] Expected Post-Production Stocks:
    - [x] Flour: 120 kg
    - [x] Oil: 19.5 L
    - [x] Spice mix: 3.8 kg
    - [x] Pouches: 306 pcs (500 - 188 - 6)
    - [x] Cartons: 21 pcs (30 - 9)
    - [x] Finished Goods: 238 pkts (50 + 188)
  - [x] Expected Variances:
    - [x] Yield variance: -6.00% (triggers warning)
    - [x] Oil consumption variance: +5.00% (triggers warning)

---

## 7. Sales Order Management & Mobile Salesman (Phase 5)
- [x] Ultra-fast mobile-friendly order placement (< 1 min target).
- [x] Customer dropdown filtered to salesman's portfolio.
- [x] Product catalogue selection with auto-filling current prices.
- [x] Snapshot unit prices into `SalesOrderItem` at creation time.
- [x] Order status pipeline: `DRAFT` -> `SUBMITTED` -> `APPROVED` / `REJECTED` -> `INVOICED` -> `PARTIALLY_DISPATCHED` -> `DISPATCHED`.
- [x] Admin order verification, modification with change history, and approval/rejection.
- [x] Concurrency safety: prevent overselling available finished goods across simultaneous orders.

---

## 8. GST Invoicing, Dispatch & Receivables (Phase 6)
- [x] **GST Rule Engine:**
  - [x] Intra-state (Tamil Nadu to Tamil Nadu): CGST (2.5%) + SGST (2.5%).
  - [x] Inter-state (Tamil Nadu to Karnataka, etc.): IGST (5.0%).
- [x] Financial-year sequential invoice numbering (`UF/2026-27/0001`).
- [x] Professional PDF invoice generation with HSN code, company GSTIN, and tax split.
- [x] Invoice cancellation strictly via Credit Notes (zero hard delete).
- [x] **Benchmark Retailer A Transaction:**
  - [x] State: Tamil Nadu (Intra-state).
  - [x] Quantity: 150 pkts @ ₹50.
  - [x] Taxable amount: ₹7,500.00
  - [x] CGST (2.5%): ₹187.50
  - [x] SGST (2.5%): ₹187.50
  - [x] Total Invoice: ₹7,875.00
  - [x] Dispatch 150 pkts -> Finished Goods stock drops from 238 to 88 pkts.
  - [x] Record payment: ₹4,000.00 -> Outstanding balance: ₹3,875.00.
- [x] **Benchmark Distributor B Shortage Check:**
  - [x] State: Karnataka (Inter-state).
  - [x] Requested quantity: 120 pkts.
  - [x] Available finished goods: 88 pkts.
  - [x] Shortage: 32 pkts.
  - [x] System blocks dispatch and alerts insufficient stock. Zero invalid invoice generation for unstocked goods.
- [x] Multi-tranche payments against invoices with overpayment protection.

---

## 9. Product Costing & Valuation (Phase 7)
- [x] Weighted-average costing formula implementation:
  `Weighted Average Rate = (Existing Stock Value + Purchase Value) / Total Available Qty`
- [x] Historical production cost freezing (never retroactively modify past batches).
- [x] Benchmark batch costing breakdown:
  - [x] Opening Flour: ₹42/kg; New Purchase: ₹45/kg (Weighted average applied).
  - [x] Cooking Oil: ₹140/L
  - [x] Spice Mix: ₹200/kg
  - [x] Pouches: ₹2.50/pc (including damaged pouches)
  - [x] Cartons: ₹15/pc
  - [x] Labour: ₹1,200.00
  - [x] Power & Gas: ₹600.00
- [x] Total Production Cost = Raw Materials + Total Packaging (good + damaged) + Overheads.
- [x] Cost Per Good Packet = Total Production Cost / 188 good packets.
- [x] Gross margin analytics based on ₹50 selling price.

---

## 10. Reports, Audits & Exports (Phase 8)
- [x] Date-filterable reporting for all 16 mandatory registers:
  1. Sales Register
  2. Customer-wise Sales
  3. Product-wise Sales
  4. GST Outward Supplies Summary (B2B / B2C)
  5. Purchase Register
  6. Raw Material Stock Summary
  7. Packaging Stock Summary
  8. Finished Goods Stock Summary
  9. Stock Ledger (detailed movements)
  10. Production Report
  11. Planned vs Actual Consumption
  12. Yield & Wastage Report
  13. Product Cost Report
  14. Payments & Collections Register
  15. Outstanding Receivables
  16. Customer Ageing Report (0-30, 31-60, 61-90, 90+ days)
- [x] Full export capabilities: PDF, Excel (multi-tab formatted), CSV.
- [x] Immutable Audit Log tracking actor, entity, action, before/after values, and timestamps.
- [x] Read-only auditor view enforcement.

---

## 11. Dashboards & UI/UX (Phase 9)
- [ ] Admin Dashboard (orders, invoices, dispatch, stock alerts).
- [ ] Production Dashboard (today's runs, output, consumption, scrap, variance).
- [ ] Owner Dashboard (revenue, margin, stock value, efficiency charts).
- [ ] Auditor Dashboard (financial summaries, GST, stock valuation, exports).
- [ ] Salesman Dashboard (mobile order CTA, customer list, order status tracker).
- [ ] Responsive navigation with collapsible sidebar, breadcrumbs, search, and notification bell.
- [ ] High-contrast design: Navy Blue (`#0F172A`), Teal (`#0D9488`), Neutral Grey background (`#F8FAFC`).

---

## 12. Benchmark Verification & Automated Testing (Phase 10)
- [x] Idempotent seed script establishing the exact benchmark starting position.
- [x] Automated end-to-end integration test suite verifying:
  - [x] Flour stock: 100 kg -> 160 kg -> 120 kg.
  - [x] Oil stock: 30 L -> 19.5 L.
  - [x] Spice stock: 5 kg -> 3.8 kg.
  - [x] Pouches: 500 pcs -> 306 pcs.
  - [x] Cartons: 30 pcs -> 21 pcs.
  - [x] Finished goods: 50 pkts -> 238 pkts -> 88 pkts.
  - [x] Yield variance = -6.00% (triggers alert).
  - [x] Oil consumption variance = +5.00% (triggers alert).
  - [x] Retailer A invoice total = ₹7,875.00 (CGST ₹187.50, SGST ₹187.50).
  - [x] Outstanding balance after ₹4,000 payment = ₹3,875.00.
  - [x] Distributor B order of 120 pkts rejected with 32 pkts shortage warning.
  - [x] Automated benchmark test report output.

---

## 13. Security, Deployment & Internship Deliverables (Phase 11)
- [x] Security hardening: rate limiting, CORS, input sanitization, bcrypt hashing, JWT validation.
- [x] Docker Compose & local deployment configuration.
- [x] Comprehensive README with setup commands and test credentials.
- [x] Two-page Design Note with Mermaid ER diagram and architectural justification.
- [x] Eight-minute demo walkthrough script.
- [x] Complete final submission verification report.

