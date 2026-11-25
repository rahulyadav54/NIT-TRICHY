# TRIMA ERP — 8-Minute Evaluation Walkthrough Script
**NIT Tiruchirappalli Winter Internship Demonstration**

---

### Timing Breakdown (Total Duration: 8 Minutes)

| Time | Stage | Action & Screen Demonstrated | Key Talking Points |
|---|---|---|---|
| **0:00 - 0:45** | **Architecture & Concept** | Open Landing Screen / Architecture Diagram | Introduce TRIMA ERP. Explain the NIT Trichy internship problem: small South Indian snacks manufacturer (Murukku 200g). Emphasize: Real PostgreSQL database, Decimal.js financial math, derived stock balances, 5 distinct roles. |
| **0:45 - 2:00** | **Salesman Mobile Order** | Login as `salesman@trima.com`. Switch to mobile viewport. Open "New Sales Order". Select "Retailer A (Madurai)". | Show that only assigned customers are visible. Select Murukku 200g (150 pkts). Notice price auto-populates ₹50.00 and is snapshotted. Subtotal: ₹7,500, Total with 5% GST: ₹7,875. Submit order in < 1 min. Status becomes `SUBMITTED`. |
| **2:00 - 3:30** | **Admin Verification & Invoicing** | Logout. Login as `admin@trima.com`. Open Operations Dashboard. | Inspect incoming order from Salesman Ravi. Show available finished goods stock (238 pkts). Click "Approve". Click "Generate GST Invoice". Point out place of supply: Tamil Nadu (33) $\rightarrow$ CGST (₹187.50) + SGST (₹187.50) = ₹7,875.00. Sequential numbering `UF/2026-27/0001`. |
| **3:30 - 4:45** | **Dispatch & Inventory Deduction** | On Invoice screen, click "Dispatch Goods". Confirm dispatch of 150 packets. | Navigate to Master Data $\rightarrow$ Materials/Finished Goods. Show that Finished Goods stock automatically reduced from 238 to exactly 88 packets. Attempt duplicate dispatch to show safety check. |
| **4:45 - 5:30** | **Payment Collection** | Navigate to Payments $\rightarrow$ Record Payment. | Customer: Retailer A. Invoice: ₹7,875. Enter received amount: ₹4,000 via NEFT. Show remaining balance due is immediately ₹3,875.00. Attempt overpayment of ₹5,000 to show validation protection. |
| **5:30 - 6:30** | **Manufacturing & Variance Analysis** | Logout. Login as `production@trima.com`. Open Production Dashboard. | Show Murukku 200g BOM (40kg flour, 10L oil, 1.2kg spice, 200 pouches, 10 cartons). Review completed benchmark batch: Good packets: 188, Damaged pouches: 6. Point out Yield Variance: -6.00% (Warning flag) and Oil Variance: +5.00% (Warning flag). Show stock ledger traceability. |
| **6:30 - 7:15** | **Distributor B Shortage Block** | Switch to Admin. View Distributor B order (120 packets). Click "Approve". | System immediately halts with Error: "Insufficient finished goods stock. Requested 120 pkts, Available 88 pkts. Shortage: 32 pkts." Emphasize concurrency safety: unstocked goods can never be invoiced or dispatched. |
| **7:15 - 8:00** | **Owner Analytics & Auditor Exports** | Logout. Login as `owner@trima.com`, then `auditor@trima.com`. | Owner Dashboard: Live inventory valuation (Raw, Packaging, FG). Cost per good packet: ₹30.90, Gross Margin: 38.19%. Auditor screen: Read-only restrictions, 16 date-filtered compliance registers, and instant one-click CSV / Excel / PDF exports. Conclude demonstration. |

