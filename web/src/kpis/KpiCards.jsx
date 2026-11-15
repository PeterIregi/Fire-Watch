import React, { useMemo } from 'react';
import {
  calculateCurrentMonthKpi,
  calculateBusiestMonthKpi,
  calculateBusiestYearKpi,
} from './kpiCalculations.js';
import {
  SOURCES,
  SOURCE_METADATA,
  formatHotspotValue,
} from '../calendar/dataHelpers.js';

/**
 * Headline KPI Cards Component (Domain D - Peter)
 * 
 * Shows:
 * 1. Current Available Month vs. Historical Median
 * 2. Busiest Month in Selection
 * 3. Busiest Year in Selection
 * 
 * Props:
 * - displayedSeries: Filtered monthly observations for the current date range
 * - fullSeries: Complete historical observations for the AOI (baseline source)
 * - source: Active sensor source
 */
export function KpiCards({
  displayedSeries = [],
  fullSeries = [],
  source = SOURCES.HARMONIZED,
}) {
  const meta = SOURCE_METADATA[source] || SOURCE_METADATA[SOURCES.HARMONIZED];

  const currentMonthKpi = useMemo(() => {
    return calculateCurrentMonthKpi(displayedSeries, fullSeries, source);
  }, [displayedSeries, fullSeries, source]);

  const busiestMonthKpi = useMemo(() => {
    return calculateBusiestMonthKpi(displayedSeries, source);
  }, [displayedSeries, source]);

  const busiestYearKpi = useMemo(() => {
    return calculateBusiestYearKpi(displayedSeries, source);
  }, [displayedSeries, source]);

  return (
    <section
      aria-label="Fire Activity Headline Figures"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1rem',
      }}
    >
      {/* Card 1: Current Month vs Historical Median */}
      <article
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
              Current Available Month
            </span>
            {currentMonthKpi.status === 'higher' && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontWeight: 700,
                }}
              >
                Above Median
              </span>
            )}
            {currentMonthKpi.status === 'lower' && (
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  fontWeight: 700,
                }}
              >
                Below Median
              </span>
            )}
          </div>

          <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '0.25rem', fontWeight: 600 }}>
            {currentMonthKpi.targetMonthLabel || 'No data'}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.875rem', fontWeight: 800, color: '#f8fafc' }}>
              {formatHotspotValue(currentMonthKpi.currentValue, source, { placeholder: '—' })}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {meta.shortUnit}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #334155', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <div>
            Historical Median: <strong style={{ color: '#cbd5e1' }}>{formatHotspotValue(currentMonthKpi.historicalMedian, source, { placeholder: '—' })}</strong>
            {currentMonthKpi.baselineYearCount ? ` (${currentMonthKpi.baselineYearCount} yrs)` : ''}
          </div>
          <div style={{ marginTop: '2px', color: currentMonthKpi.status === 'higher' ? '#f87171' : currentMonthKpi.status === 'lower' ? '#38bdf8' : '#94a3b8' }}>
            <strong>{currentMonthKpi.percentText}</strong>
          </div>
        </div>
      </article>

      {/* Card 2: Busiest Month */}
      <article
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Busiest Month (in Selection)
          </span>
          <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '0.25rem', fontWeight: 600 }}>
            {busiestMonthKpi.monthLabel}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.875rem', fontWeight: 800, color: '#f97316' }}>
              {formatHotspotValue(busiestMonthKpi.value, source, { placeholder: '—' })}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {meta.shortUnit}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #334155', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          Peak monthly fire activity detected within the selected timeframe.
        </div>
      </article>

      {/* Card 3: Busiest Year */}
      <article
        style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
            Busiest Year (in Selection)
          </span>
          <div style={{ fontSize: '0.875rem', color: '#cbd5e1', marginTop: '0.25rem', fontWeight: 600 }}>
            {busiestYearKpi.hasData ? `Year ${busiestYearKpi.year}` : 'No data'}
            {busiestYearKpi.isPartial && <span style={{ color: '#f59e0b', fontSize: '0.75rem', marginLeft: '6px' }}>(partial range)</span>}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.875rem', fontWeight: 800, color: '#eab308' }}>
              {formatHotspotValue(busiestYearKpi.value, source, { placeholder: '—' })}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              annual sum ({meta.shortUnit})
            </span>
          </div>
        </div>

        <div style={{ marginTop: '0.75rem', borderTop: '1px solid #334155', paddingTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          Cumulative annual total for the selected area.
        </div>
      </article>
    </section>
  );
}
export default KpiCards;
