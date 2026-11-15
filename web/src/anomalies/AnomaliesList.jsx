import React, { useState, useMemo } from 'react';
import { detectAnomalies } from './anomalyDetection.js';
import {
  SOURCES,
  SOURCE_METADATA,
  formatHotspotValue,
} from '../calendar/dataHelpers.js';

/**
 * Unusual Periods (Anomalies) List Component (Domain D - Peter)
 * 
 * Flags months where fire activity deviates substantially from the historical baseline.
 * Clicking or pressing Enter on an item highlights its cell in the Burning Calendar.
 * 
 * Props:
 * - displayedSeries: Active filtered series
 * - fullSeries: Complete historical series for the AOI
 * - source: Sensor source
 * - highlightedMonth: Currently highlighted month in calendar ('YYYY-MM' | null)
 * - onSelectAnomaly: (monthStr) => void
 */
export function AnomaliesList({
  displayedSeries = [],
  fullSeries = [],
  source = SOURCES.HARMONIZED,
  highlightedMonth = null,
  onSelectAnomaly,
}) {
  const [threshold, setThreshold] = useState(3.5);
  const meta = SOURCE_METADATA[source] || SOURCE_METADATA[SOURCES.HARMONIZED];

  const anomalies = useMemo(() => {
    return detectAnomalies(displayedSeries, fullSeries, {
      source,
      threshold,
      absoluteThreshold: 15,
    });
  }, [displayedSeries, fullSeries, source, threshold]);

  return (
    <section
      aria-label="Unusual Fire Activity Periods"
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#f8fafc' }}>
            Unusual Periods (Anomalies)
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Flagged via robust z-score ($z = 0.6745 \times (x - \text{median}) / \text{MAD}$). Click any item to highlight on calendar.
          </p>
        </div>

        {/* Threshold selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
          <label htmlFor="anomaly-threshold" style={{ color: '#cbd5e1', fontWeight: 600 }}>
            Sensitivity (Z-Threshold):
          </label>
          <select
            id="anomaly-threshold"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            style={{
              padding: '0.35rem 0.5rem',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #475569',
              borderRadius: '4px',
              fontSize: '0.8rem',
            }}
          >
            <option value="2.5">2.5 (High Sensitivity)</option>
            <option value="3.0">3.0 (Moderate)</option>
            <option value="3.5">3.5 (Default Standard)</option>
            <option value="4.0">4.0 (Conservative / Extreme)</option>
          </select>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div
          role="status"
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.875rem',
            border: '1px dashed #334155',
            borderRadius: '6px',
          }}
        >
          No unusual fire periods detected for this selection at threshold ±{threshold}.
        </div>
      ) : (
        <div
          role="list"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '0.75rem',
            maxHeight: '360px',
            overflowY: 'auto',
          }}
        >
          {anomalies.map((item) => {
            const isSelected = highlightedMonth === item.month;
            const isHigh = item.type === 'high';

            return (
              <div
                key={item.month}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Flagged ${item.type} period ${item.monthLabel}: ${item.value} hotspots compared to median ${item.median}`}
                onClick={() => onSelectAnomaly && onSelectAnomaly(item.month)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (onSelectAnomaly) onSelectAnomaly(item.month);
                  }
                }}
                style={{
                  padding: '0.875rem',
                  backgroundColor: isSelected ? 'rgba(234, 179, 8, 0.15)' : '#0f172a',
                  border: isSelected ? '2px solid #eab308' : '1px solid #334155',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                  outline: 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>
                    {item.monthLabel}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: isHigh ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                      color: isHigh ? '#f87171' : '#38bdf8',
                    }}
                  >
                    {isHigh ? 'High Anomaly' : 'Low Anomaly'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>
                    Observed: <strong style={{ color: '#f8fafc' }}>{formatHotspotValue(item.value, source)}</strong> {meta.shortUnit}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Median: {formatHotspotValue(item.median, source)}
                  </span>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Score: <strong style={{ color: isHigh ? '#f87171' : '#38bdf8' }}>z = {item.zScore !== null ? item.zScore : 'N/A'}</strong>
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                    Method: {item.method.toUpperCase()} ({item.baselineCount} yrs)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
export default AnomaliesList;
