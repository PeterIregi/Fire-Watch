# Domain D: Insights & Delivery Isolated Preview

This isolated preview harness provides a runnable development environment for Domain D (**Analytics & Delivery** — Peter) without waiting for the live map, store, or data ingestion pipeline.

## 1. Quick Start

Ensure you have Node.js 18+ installed.

```bash
cd web
npm install
npm run dev
```

Visit the preview directly in your browser:
- `http://localhost:5173/insights-preview/`

## 2. Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Starts Vite local development server with HMR |
| `npm test` | Runs all unit and helper tests via Vitest |
| `npm run build` | Builds production-ready static assets to `web/dist/` |
| `npm run preview` | Previews the production build locally |

## 3. Features & Controls

- **Sample AOI Presets:** Serengeti Ecosystem, Ruaha National Park, Selous/Nyerere, Arusha Highlands (low-fire regime).
- **Date Range Controls:** Interactive start and end month inputs (`YYYY-MM`) with instant validation and inclusive filtering.
- **Sensor Source Switcher:** Toggle between Harmonized (calibrated), Raw MODIS, and Raw VIIRS data.
- **State Simulation:** Toggle buttons to test empty data ranges, error validation, and loading spinners.
- **Synthetic Data Isolation:** All fixtures are generated deterministically and labeled clearly with synthetic warning tags.
