import React, { useState } from 'react';
import {
  generateAggregateCsv,
  getAggregateCsvFilename,
  downloadCsvFile,
} from './aggregateCsv.js';

/**
 * Export Panel Component (Domain D - Peter)
 * 
 * Provides downloads for the current selection:
 * 1. Aggregate CSV (always available, cell_month table)
 * 2. Calendar PNG (Issue #9)
 * 3. Capped Raw-detection CSV (Issue #11)
 * 
 * Props:
 * - cellRows: Array of cell-month rows for the current AOI
 * - startMonth: 'YYYY-MM'
 * - endMonth: 'YYYY-MM'
 * - onExportPng: () => void
 * - onExportRawCsv: () => void
 * - rawExportAvailable: boolean
 */
export function ExportPanel({
  cellRows = [],
  startMonth,
  endMonth,
  onExportPng,
  onExportRawCsv,
  rawExportAvailable = false,
}) {
  const [downloadSuccess, setDownloadSuccess] = useState(null);

  const handleDownloadAggregate = () => {
    try {
      const csv = generateAggregateCsv(cellRows, startMonth, endMonth);
      const filename = getAggregateCsvFilename(startMonth, endMonth);
      downloadCsvFile(csv, filename);
      setDownloadSuccess(`Downloaded ${filename}`);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Aggregate CSV export failed:', err);
    }
  };

  const matchingRowCount = cellRows.filter(r => {
    if (!r || !r.month) return false;
    if (startMonth && r.month < startMonth) return false;
    if (endMonth && r.month > endMonth) return false;
    return true;
  }).length;

  return (
    <section
      aria-label="Data Downloads and Export Actions"
      style={{
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
          Data Downloads & Export
        </h2>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
          Export the active selection as harmonized tabular data or presentation-ready graphics.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Export 1: Aggregate CSV (Always Available) */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                Aggregate CSV
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Required
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Harmonized cell-month table with MODIS, VIIRS and calibrated counts.
            </p>
            <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '0.5rem' }}>
              Records in selection: <strong>{matchingRowCount} cell-months</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadAggregate}
            disabled={matchingRowCount === 0}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: matchingRowCount > 0 ? '#f97316' : '#475569',
              color: matchingRowCount > 0 ? '#000' : '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: matchingRowCount > 0 ? 'pointer' : 'not-allowed',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>📥 Download Aggregate CSV</span>
          </button>
        </div>

        {/* Export 2: Calendar PNG */}
        <div
          id="export-calendar-png-slot"
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                Calendar Image (PNG)
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Visual
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Export high-resolution PNG snapshot of the burning calendar heatmap.
            </p>
          </div>

          <button
            type="button"
            onClick={onExportPng}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: '#38bdf8',
              color: '#000',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🖼️ Download Calendar PNG</span>
          </button>
        </div>

        {/* Export 3: Capped Raw Detections CSV */}
        <div
          id="export-raw-hotspots-slot"
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                Raw Detections CSV
              </span>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#7c3aed',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Capped (50k)
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Individual FIRMS hotspot detections (sensor, coords, FRP, date). Capped at 50,000 rows.
            </p>
          </div>

          <button
            type="button"
            onClick={onExportRawCsv}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: '#a855f7',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <span>🔥 Export Raw Hotspots</span>
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div
          role="status"
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            border: '1px solid #22c55e',
            borderRadius: '4px',
            color: '#86efac',
            fontSize: '0.8rem',
            textAlign: 'center',
          }}
        >
          ✓ {downloadSuccess}
        </div>
      )}
    </section>
  );
}
export default ExportPanel;
