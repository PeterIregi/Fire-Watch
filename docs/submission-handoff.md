# NASA Space Apps Challenge 2026 — Submission Handoff Document

- **Challenge:** Harmonization of MODIS and VIIRS Hot Spots
- **Project Name:** FireWatch Tanzania
- **Team Name:** Team Tazama
- **Submission Date:** November 15, 2026 (Local Time: 03:55 EAT / UTC+3)
- **Repository:** [https://github.com/PeterIregi/Fire-Watch](https://github.com/PeterIregi/Fire-Watch)
- **License:** MIT License (`LICENSE`)

---

## 1. Executive Summary & Impact

FireWatch harmonizes 25+ years of active fire detection in Tanzania (2000–present), resolving the sensor mismatch between MODIS (~1 km pixels, Terra/Aqua) and VIIRS (~375 m pixels, Suomi NPP).

By converting quality-filtered hotspots to daily gridded fire-days and calibrating across the 2012–2025 overlap, FireWatch generates a unified **MODIS-equivalent burning activity series**. Emergency responders, reserve rangers (e.g. Serengeti, Ruaha, Selous), and climate scientists can instantly examine long-term trends, detect unusual fire peaks, and export research-ready data.

---

## 2. Team Tazama Deliverables & Attribution

| Domain | Owner | Key Deliverables | Status |
|---|---|---|---|
| **A. Data Engineering** | Favor | Ingest pipeline, quality filters, spatial gridding, sparse web data bundle | Complete |
| **B. Science & Validation** | Silas | Seasonal regression calibration, held-out validation (2019–2025: $r=0.942$), deck & 2-min demo script | Complete |
| **C. Web App Core** | Geremi | Leaflet AOI bounding box, coordinate inputs, static deployment shell | Complete |
| **D. Analytics & Delivery** | Peter | Burning calendar (Viridis), multi-sensor chart, KPIs, robust z-score anomalies, aggregate/raw CSV & PNG exports | Complete |

---

## 3. Two-Minute Demo Script Alignment

1. **Problem (30s):** Show raw MODIS and VIIRS divergence—VIIRS detects ~3x more fires for the exact same physical burning, causing an artificial leap in 2012.
2. **Method & Validation (30s):** Show held-out validation panel (Pearson $r=0.942$, bias $-0.82$, MAE $13.85$). Single-satellite rule preserves continuity without uncalibrated drift.
3. **Interactive Explorer (30s):** Pick an AOI (e.g. Serengeti Ecosystem), examine the burning calendar heatmap on the Viridis ramp, and toggle between raw and harmonized series.
4. **Insights & Action (20s):** Highlight unusual periods ($z_{\text{robust}} \ge 3.5$), compare this season to historical medians, and download the RFC 4180 Aggregate CSV and presentation PNG.
5. **Limitations & Future Steps (10s):** Thermal detections vs. burn scars, diurnal sampling differences, and path to global near-real-time coverage.

---

## 4. Verification & Testing Checklist

- [x] **Burning Calendar Heatmap:** Tested on arbitrary year ranges (2000–2025), colorblind-safe Viridis ramp, true zeros distinguished from unavailable sensor observations, clean unmount cleanup.
- [x] **Sensor Comparison Line Chart:** Plots MODIS, VIIRS, and Harmonized lines; preserves pre-2012 VIIRS gaps without fake interpolation (`connectNulls: false`).
- [x] **Headline KPI Cards:** Current month against full-history baseline median (no truncation), handles zero medians without NaN or Infinity, busiest month and year calculation.
- [x] **Unusual Periods (Anomalies):** Browser-side robust z-scores with MAD, strictly excludes target year, documented fallbacks for IQR and absolute departures, interactive calendar cell highlight sync.
- [x] **Aggregate CSV Export:** Complies with RFC 4180 (`cell_id,lat,lon,month,modis_hotspots,modis_fire_days,viirs_hotspots,viirs_fire_days,harmonized`).
- [x] **Calendar PNG Export:** High-res ECharts `getDataURL` snapshot composited with AOI, date range, source metadata, and NASA FIRMS attribution banner.
- [x] **Capped Raw Detections Export:** On-demand fetching with explicit 50,000 row safety cap notice and 1-click aggregate CSV alternative.
- [x] **WCAG AA Accessibility:** 44px minimum touch targets, visible focus outlines, text contrast $\ge 4.5:1$, and accessible HTML table alternatives.
- [x] **Automated Test Suite:** 49 unit and integration tests passing (`npm test`).
