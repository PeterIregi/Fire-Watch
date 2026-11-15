import React, { useState } from 'react';
import {
  generateAggregateCsv,
  getAggregateCsvFilename,
  downloadCsvFile,
} from './aggregateCsv.js';
import {
  filterAndCapRawDetections,
  generateRawHotspotsCsv,
  getRawHotspotsFilename,
  fetchYearlyDetections,
  MAX_RAW_EXPORT_ROWS,
} from './rawHotspotsExport.js';

/**
 * Export Panel Component (Domain D - Peter)
 * 
 * Provides downloads for the current selection:
 * 1. Aggregate CSV (always available, cell_month table)
 * 2. Calendar PNG (Issue #9)
 * 3. Capped Raw-detection CSV with 50,000 row safety cap (Issue #11)
 * 
 * Props:
 * - cellRows: Array of cell-month rows for the current AOI
 * - startMonth: 'YYYY-MM'
 * - endMonth: 'YYYY-MM'
 * - bbox: [w, s, e, n]
 * - onExportPng: () => void
 * - rawDetectionsFallback: Array of raw detections for test/offline environments
 */
export function ExportPanel({
  cellRows = [],
  startMonth,
  endMonth,
  bbox,
  onExportPng,
  rawDetectionsFallback = [],
}) {
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawError, setRawError] = useState(null);
  const [rawExportResult, setRawExportResult] = useState(null);

  // Aggregate CSV Download
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

  // Raw Hotspots Export Modal Trigger
  const handleOpenRawModal = async () => {
    setRawModalOpen(true);
    setRawLoading(true);
    setRawError(null);
    setRawExportResult(null);

    try {
      const startYear = parseInt((startMonth || '2000').slice(0, 4), 10);
      const endYear = parseInt((endMonth || '2025').slice(0, 4), 10);

      let allDetections = [...rawDetectionsFallback];

      // Fetch on-demand only for years inside the selected range
      if (typeof window !== 'undefined' && window.fetch) {
        for (let y = startYear; y <= endYear; y++) {
          const yearly = await fetchYearlyDetections(y);
          if (Array.isArray(yearly) && yearly.length > 0) {
            allDetections = allDetections.concat(yearly);
          }
        }
      }

      // Filter and evaluate cap
      const result = filterAndCapRawDetections(allDetections, bbox, startMonth, endMonth, MAX_RAW_EXPORT_ROWS);
      setRawExportResult(result);
      setRawLoading(false);
    } catch (err) {
      console.error('Raw export preparation failed:', err);
      setRawError(err.message || 'Failed to prepare raw detections.');
      setRawLoading(false);
    }
  };

  const handleDownloadRawCsv = () => {
    if (!rawExportResult || rawExportResult.exportedRows.length === 0) return;
    try {
      const csv = generateRawHotspotsCsv(rawExportResult.exportedRows);
      const filename = getRawHotspotsFilename(startMonth, endMonth);
      downloadCsvFile(csv, filename);
      setDownloadSuccess(`Downloaded ${filename} (${rawExportResult.exportedRows.length.toLocaleString()} rows)`);
      setRawModalOpen(false);
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      setRawError('Error generating raw CSV file.');
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
        {/* Export 1: Aggregate CSV */}
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
              Quality-filtered FIRMS detections for selected dates/AOI. Capped at 50,000 rows.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenRawModal}
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

      {/* Raw Export Modal Dialog */}
      {rawModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="raw-export-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '520px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 id="raw-export-modal-title" style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
                Raw Hotspot Detections Export
              </h3>
              <button
                type="button"
                onClick={() => setRawModalOpen(false)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {rawLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                <div>Fetching and filtering raw detections...</div>
              </div>
            ) : rawError ? (
              <div style={{ color: '#f87171', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                {rawError}
              </div>
            ) : rawExportResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Detections Matched: </span>
                  <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>
                    {rawExportResult.totalMatched.toLocaleString()} hotspots
                  </strong>
                </div>

                {rawExportResult.isCapped && (
                  <div
                    role="alert"
                    style={{
                      padding: '0.85rem',
                      backgroundColor: 'rgba(234, 179, 8, 0.15)',
                      border: '1px solid #eab308',
                      borderRadius: '6px',
                      color: '#fef08a',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong>Safety Cap Notice:</strong> Your selection matches{' '}
                    <strong>{rawExportResult.totalMatched.toLocaleString()}</strong> rows, exceeding the browser limit of{' '}
                    <strong>{MAX_RAW_EXPORT_ROWS.toLocaleString()}</strong> rows. To maintain performance, the export will contain the first{' '}
                    <strong>{MAX_RAW_EXPORT_ROWS.toLocaleString()}</strong> rows. For complete comprehensive analysis across this large selection, please download the Aggregate CSV instead.
                  </div>
                )}

                {rawExportResult.totalMatched === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                    No raw hotspot detections were found matching the selected area and date range.
                  </p>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleDownloadRawCsv}
                      style={{
                        flex: 1,
                        padding: '0.6rem 1rem',
                        backgroundColor: '#a855f7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        minHeight: '44px',
                      }}
                    >
                      {rawExportResult.isCapped
                        ? `Download First ${MAX_RAW_EXPORT_ROWS.toLocaleString()} Rows`
                        : `Download All ${rawExportResult.totalMatched.toLocaleString()} Rows`}
                    </button>
                    {rawExportResult.isCapped && (
                      <button
                        type="button"
                        onClick={() => {
                          setRawModalOpen(false);
                          handleDownloadAggregate();
                        }}
                        style={{
                          padding: '0.6rem 1rem',
                          backgroundColor: '#334155',
                          color: '#f8fafc',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          minHeight: '44px',
                        }}
                      >
                        Aggregate CSV
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
export default ExportPanel;
