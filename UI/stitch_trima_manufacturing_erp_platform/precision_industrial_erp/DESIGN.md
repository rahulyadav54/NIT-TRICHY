---
name: Precision Industrial ERP
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434654'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c3c5d7'
  surface-tint: '#1f54d3'
  primary: '#003fb3'
  on-primary: '#ffffff'
  primary-container: '#2457d6'
  on-primary-container: '#d5dcff'
  inverse-primary: '#b5c4ff'
  secondary: '#545e79'
  on-secondary: '#ffffff'
  secondary-container: '#d2dcfd'
  on-secondary-container: '#56607c'
  tertiary: '#00544c'
  on-tertiary: '#ffffff'
  tertiary-container: '#006e65'
  on-tertiary-container: '#84f0e2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b5c4ff'
  on-primary-fixed: '#00164d'
  on-primary-fixed-variant: '#003cad'
  secondary-fixed: '#d9e2ff'
  secondary-fixed-dim: '#bbc6e6'
  on-secondary-fixed: '#101b33'
  on-secondary-fixed-variant: '#3c4661'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  metric-display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-default:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-strong:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  table-data:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  table-header:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-default:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-micro:
    fontFamily: Inter
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-compact: 0.75rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered specifically for mission-critical packaged food manufacturing, compliance tracking, and automated audit operations. It balances the strict operational clarity of SAP Fiori with the refined density of Linear and the financial-grade precision of Stripe Dashboard. 

The aesthetic is functional, modern corporate minimalism built for intense real-time work environments—such as batch production lines, cold-chain monitoring, and supply-chain auditing. The visual tone must project unshakeable reliability, analytical rigor, and effortless micro-interaction clarity without visual fatigue. Surfaces are hyper-crisp, typography is balanced for dense numeric tracking, and status communication is instantaneous through high-visibility, semantic-coded affordances.

## Colors

The color architecture separates structural enterprise chrome, transactional primary actions, operational auditing tiers, and regulatory statuses:

- **Primary Canvas & Neutral Surfaces:** The foundation relies on an ultra-soft cool canvas (`#F4F7FB`), layered against elevated pure white containers (`#FFFFFF`). Structural division is handled strictly through low-contrast border gray (`#E2E8F0`).
- **Core Corporate Brand:** Deep industrial navy (`#101B33`) anchors the persistent multi-tier navigation chrome, global headers, and high-impact containers. Actionable interactive states lean on precise primary blue (`#2457D6`), delivering authoritative focus states, primary triggers, and high-density selection indicators.
- **Audit & Secondary Accent:** Distinctive teal (`#0D9488`) represents audit certifications, batch-release milestones, telemetry data hooks, and verified QA signatures.
- **Semantic Matrix:** 
  - **Success:** `#16A34A` (Food safety cleared, automated QA pass, active line).
  - **Warning:** `#D97706` (HACCP threshold deviation, pending lot sign-off).
  - **Danger:** `#DC2626` (Batch quarantine, contamination alert, machine shutdown).
- **Text & Contrast Hierarchy:** Text demands strict adherence to readability; primary data and body text utilize high-contrast `#172033`, while metadata, labels, and table subtext utilize muted slate `#64748B`.

## Typography

Typography prioritizes high data density, structural clarity, and computational readability. Inter is implemented across all roles with specific OpenType configuration:

- **Tabular Figures (`tnum`):** Enforced across all numeric indicators, KPI metric values, SKU quantities, temperature readings, and data table columns to ensure strict vertical number alignment.
- **Hierarchy & Proportions:** Massive headings are discarded in favor of compact, high-utility headers (`metric-display` at 32px max). Tables and secondary data fields operate efficiently at 12px with a tightened 16px line height.
- **Industrial Scanning:** All table headers and audit status chips use uppercase micro-labels with `0.03em` to `0.04em` letter-spacing, providing clear distinction between column labels and real-time operational data.

## Layout & Spacing

The structural layout uses a density-driven fluid grid framework optimized for widescreen production control centers down to floor-manager tablets:

- **Grid Architecture:** 12-column layout with 16px (`1rem`) gutters on desktop displays, dropping to 12px (`0.75rem`) for compact data views. Outer canvas padding is pinned at 24px (`1.5rem`).
- **Application Shell:**
  - **Left Rail (Primary Navigation):** Fixed 240px multi-tier sidebar; collapsible to 64px icon-rail mode to maximize operational data canvas width.
  - **Top Application Bar:** Fixed 52px height housing live breadcrumbs, audit compliance counters, facility/line switcher, and user role chips.
  - **Sub-header / View Actions:** Optional 44px contextual control strip for multi-filter sets, export triggers, and real-time data sync indicators.
- **Breakpoint Dynamics:**
  - **Desktop (>= 1280px):** Full 12-column grid, persistent two-level navigation, simultaneous split-pane table and batch detail drawer views.
  - **Tablet / Industrial Terminals (768px - 1279px):** Collapsed sidebar rail (64px), 8-column layout, full-width data tables with horizontal scroll indicators.
  - **Mobile / Field Audit (< 768px):** 4-column layout, bottom tab bar, stacked card-based audit workflows, and side-sheet modal drawers.

## Elevation & Depth

Visual hierarchy relies on structural, low-contrast boundaries and disciplined surface layering, avoiding high-blur or dramatic shadow drops:

- **Surface Layering:**
  - **Level 0 (Canvas):** `#F4F7FB` base environment.
  - **Level 1 (Card/Table Surface):** `#FFFFFF` with a crisp `1px solid #E2E8F0` border.
  - **Level 2 (Popovers, Select Menus, Tooltips):** `#FFFFFF` paired with a sharp, subtle ambient shadow: `0px 4px 12px rgba(16, 27, 51, 0.08)`, framed by a `#CBD5E1` border.
  - **Level 3 (Modals & Batch Inspection Drawers):** `#FFFFFF` elevated over an industrial backdrop scrim (`#101B33` at 40% opacity) with directional elevation: `-4px 0px 24px rgba(16, 27, 51, 0.12)`.
- **Z-Index Control:** Navigation header rests at `z-index: 100`, contextual filters at `z-index: 90`, slide-over detail panels at `z-index: 200`, and critical alert overlays at `z-index: 500`.

## Shapes

The design system enforces a soft, disciplined geometry (`roundedness: 1` — 4px base radius) suited for high-density enterprise software:

- **Standard Containers & Fields:** Form inputs, buttons, segmented controls, table containers, and KPI cards strictly use `rounded` (4px / 0.25rem). This maintains rigid tabular grid alignment and maximizes usable data space.
- **Modals & Slide-out Drawers:** Larger structural elements utilize `rounded-lg` (8px / 0.5rem) to slightly soften modal views without looking informal.
- **Pills & Status Identifiers:** Badges, operational status pills, and trend chips use full 9999px pill rounding to distinguish static layout containers from transactional, status-driven micro-data.

## Components

### Buttons & Interactive Controls
- **Primary Action:** Solid `#2457D6` background, `#FFFFFF` text, 32px height, 4px border-radius, font size 13px (Semi-Bold), horizontal padding 12px. Active state: `#1E47B0`. Focus: 2px ring offset `#2457D6`.
- **Secondary Action:** `#FFFFFF` background, `#172033` text, `1px solid #E2E8F0`, 32px height. Hover: `#F8FAFC`, border color `#CBD5E1`.
- **Destructive/Recall Action:** `#DC2626` background, `#FFFFFF` text. Used exclusively for emergency batch holds or system-critical halts.

### Precision KPI Cards & Trend Chips
- Constructed with `#FFFFFF` background, `1px solid #E2E8F0`, and 16px internal padding.
- Upper region contains the metric title (`label-micro`, `#64748B`) paired with an operational icon or compliance category.
- Core value displays using `metric-display` (`32px` tabular-numbers, `#172033`).
- Footer features compact trend chips:
  - **Positive Trend / Within Spec:** Background `#DCFCE7`, text `#16A34A`, `rounded-full`, 4px padding with directional caret icon.
  - **Out-of-Spec / Variance:** Background `#FEE2E2`, text `#DC2626`, with deviation percentage.

### Dense Data Tables
- **Container:** Wrapped in `#FFFFFF` with an outer `#E2E8F0` border.
- **Header:** Height 36px, background `#F8FAFC`, text `#64748B` (`table-header`), lower border `1px solid #E2E8F0`. Includes inline sort carets and column resize hooks.
- **Rows:** Height 40px, cell padding 8px horizontal, 0px vertical.
- **Zebra & Hover:** Alternating rows leverage `#FFFFFF` and `#FAFCFF`. Hover state uses `#F1F5F9` with a persistent left-accent highlight (`2px solid #2457D6`) on the active row.
- **Status Pills:** Compact 20px height, uppercase 10px text (`label-micro`), 8px horizontal padding:
  - *Passed/Released:* `#DCFCE7` background / `#16A34A` text.
  - *In Review/Incubation:* `#FEF3C7` background / `#D97706` text.
  - *Quarantine/Fail:* `#FEE2E2` background / `#DC2626` text.
  - *Batch Queued:* `#E2E8F0` background / `#475569` text.

### Navigation Architecture
- **Multi-Tier Navigation Sidebar:** Dark theme utilizing `#101B33` as base background. Items are 36px height with 13px text, `#94A3B8` default color. Active item is signaled by `#2457D6` background, `#FFFFFF` text, and a crisp white indicator pip. Sub-menus use nested tree lines with 12px indentation.
- **Top Application Bar:** `#FFFFFF` background with `1px solid #E2E8F0` bottom boundary. Hosts facility location pickers (e.g., "Trichy Plant #2 - Line B"), live breadcrumb paths with forward slashes (`/`), and user role badges (`#0D9488` tint for Quality Auditor, `#2457D6` for Plant Supervisor).

### Activity Logs & Audit Timeline
- Left-aligned vertical tracking stem (`2px solid #E2E8F0`).
- Checkpoint nodes indicate state: Green dot (Auto-logged sensor threshold), Amber dot (Manual supervisor override), Blue dot (Routine sign-off).
- Compact card items displaying timestamp (`table-data`, `#64748B`), operator signature, parameter change notes, and linked lot numbers.

### Operational Alert Callouts
- Flush containers with 3px solid left accent border:
  - **Critical HACCP Violation:** Background `#FEF2F2`, border `#DC2626`, title in `#991B1B`, inline action button for instant supervisor dispatch.
  - **Calibration / Pre-Audit Warning:** Background `#FFFBEB`, border `#D97706`, title in `#92400E`.
  - **Compliance Sync Complete:** Background `#F0FDF4`, border `#16A34A`, title in `#166534`.

### Input & Form Fields
- Height 32px, `#FFFFFF` background, `1px solid #CBD5E1` border, 4px border-radius, text 13px `#172033`. Placeholder in `#94A3B8`.
- Focus ring: `1px solid #2457D6`, subtle box-shadow `0 0 0 2px rgba(36, 87, 214, 0.15)`.
- Monospace support enabled for Lot Numbers, GS1 barcodes, and HACCP sensor IDs.