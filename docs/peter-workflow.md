# Peter's Workflow: Analytics and Delivery (Domain D)

This document establishes the end-to-end plan, ownership boundaries, data contracts, and verification procedures for Domain D (**Analytics and Delivery**), owned by **Peter** (`PeterIregi`).

---

## 1. Role and Domain Ownership

- **Domain:** D — Analytics and Delivery
- **Owner:** Peter (`PeterIregi`)
- **Primary Outputs:** Burning calendar heatmap, comparison line chart, KPI statistics, unusual period detection (anomalies), CSV/PNG downloads, accessibility audit, and competition submission.
- **Owned Paths:**
  - `web/src/calendar/` — Calendar heatmap, source switcher, color ramps, formatting helpers
  - `web/src/charts/` — Sensor comparison chart (MODIS vs. VIIRS vs. Harmonized)
  - `web/src/kpis/` — Current month vs. baseline median, busiest period cards
  - `web/src/anomalies/` — Browser-side MAD / robust z-score anomaly scoring
  - `web/src/export/` — Aggregate CSV, calendar PNG, and capped raw-detection CSV
  - `web/insights-preview/` — Isolated development harness for Domain D components
  - `docs/peter-workflow.md` — Domain tracking and execution specification

---

## 2. Shared Contracts & Handoffs

Domain D relies on clear input contracts from other domains:

| # | Contract | Producer | Consumer | Details |
|---|---|---|---|---|
| **Contract 3** | `firewatch.json.gz` | Domain A (Favor) | C (Geremi), D (Peter) | Sparse monthly grid dataset with schema defined in `system-design.md` §5.2. |
| **Contract 4** | `detections/YYYY.json.gz` | Domain A (Favor) | D (Peter) | Capped raw detections per year for raw export (`system-design.md` §5.3). |
| **Contract 5** | Selection State & Summed Series | Domain C (Geremi) | D (Peter) | `{ aoi, dateRange, source }` + summed monthly series over selected cells. |

### Domain D Boundary Invariants:
1. Components in `web/src/{calendar,charts,kpis,anomalies,export}` accept well-typed, deterministic inputs via props and pure helper functions.
2. Development is decoupled from the live map/store via the `web/insights-preview/` harness with synthetic fixtures covering edge cases (e.g., zero months, missing sensors, fractional values).
3. The UI components are fully responsive, keyboard navigable, and WCAG AA accessible (contrast ratio >= 4.5:1, non-color cues, screen-reader text alternatives).

---

## 3. Sequential Work Plan

The implementation proceeds strictly across 11 milestone issues tracked in **Issue #1**:

| Step | Issue | Milestone Title | Key Deliverable | Status |
|---|---|---|---|---|
| **01** | #2 | Component inputs & synthetic data | Data contracts, data helpers, deterministic test fixtures | ✓ Completed |
| **02** | #3 | Isolated React preview environment | Vite + React + ECharts preview harness (`web/insights-preview/`) | ✓ Completed |
| **03** | #4 | Burning calendar & source toggle | ECharts calendar heatmap with viridis ramp and source control | ✓ Completed |
| **04** | #5 | Sensor comparison line chart | Multi-sensor time-series chart showing MODIS, VIIRS, Harmonized | ✓ Completed |
| **05** | #6 | Current-month & busiest-period KPIs | Headline metric cards with historical median comparison | ✓ Completed |
| **06** | #7 | Anomaly detection & calendar sync | Robust z-score anomaly detector linked to calendar highlights | ✓ Completed |
| **07** | #8 | Aggregate CSV export | Client-side RFC 4180 CSV builder (`firewatch_aggregate_*.csv`) | ✓ Completed |
| **08** | #9 | Calendar PNG export | Presentation-ready PNG snapshot via ECharts `getDataURL` | ✓ Completed |
| **09** | #10 | Shared selection integration & a11y | End-to-end integration with shared app and WCAG audit | ✓ Completed |
| **10** | #11 | Capped raw detection CSV export | Safe on-demand raw export with 50,000 row cap protection | ✓ Completed |
| **11** | #12 | Submission checklist & handoff | Final artifact verification, attribution, and delivery handoff | ✓ Completed |

---

## 4. Definition of Done Checklist

- [x] All 11 steps completed, tested, and documented.
- [x] Visualizations render with colorblind-safe ramps (e.g., Viridis).
- [x] Three data sources accessible: Raw MODIS, Raw VIIRS, Harmonized.
- [x] Zero vs. missing/unavailable data distinctly represented.
- [x] CSV downloads adhere to RFC 4180 and file naming standards.
- [x] PNG download captures complete visual context with clean typography.
- [x] All unit and integration tests pass cleanly.
