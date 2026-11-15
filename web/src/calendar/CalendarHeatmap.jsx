import React, { useEffect, useRef, useState, useMemo, forwardRef, useImperativeHandle } from 'react';
import * as echarts from 'echarts';
import {
  SOURCES,
  SOURCE_METADATA,
  getValueForSource,
  formatHotspotValue,
} from './dataHelpers.js';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Colorblind-safe Viridis ramp
const VIRIDIS_COLORS = [
  '#440154', '#482878', '#3e4989', '#31688e', '#26828e',
  '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'
];

/**
 * Calendar Heatmap Component (Domain D - Peter)
 * 
 * Props:
 * - series: Array of { month: 'YYYY-MM', harmonized, modis_hotspots, viirs_hotspots, ... }
 * - source: 'harmonized' | 'modis' | 'viirs'
 * - onSourceChange: (newSource) => void
 * - highlightedMonth: 'YYYY-MM' | null (for anomaly sync)
 * - onCellClick: (monthStr, value) => void
 * - onChartReady: (echartsInstance) => void
 */
export const CalendarHeatmap = forwardRef(function CalendarHeatmap(
  {
    series = [],
    source = SOURCES.HARMONIZED,
    onSourceChange,
    highlightedMonth = null,
    onCellClick,
    onChartReady,
  },
  ref
) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [showTable, setShowTable] = useState(false);

  // Expose imperative methods for export
  useImperativeHandle(ref, () => ({
    getChartInstance: () => chartInstanceRef.current,
    hasData: () => hasData,
    getDataUrl: (options = {}) => {
      if (!chartInstanceRef.current) return null;
      return chartInstanceRef.current.getDataURL({
        type: 'png',
        pixelRatio: 2, // High-res presentation quality
        backgroundColor: '#1e293b',
        excludeComponents: ['toolbox'],
        ...options,
      });
    },
  }));

  const activeMeta = SOURCE_METADATA[source] || SOURCE_METADATA[SOURCES.HARMONIZED];

  // Extract years and build matrix
  const { years, matrixData, maxVal, hasData } = useMemo(() => {
    if (!series || series.length === 0) {
      return { years: [], matrixData: [], maxVal: 0, hasData: false };
    }

    const yearSet = new Set();
    const mapByYearMonth = new Map();
    let max = 0;
    let validCount = 0;

    for (const item of series) {
      if (!item || !item.month) continue;
      const [yStr, mStr] = item.month.split('-');
      const y = parseInt(yStr, 10);
      const m = parseInt(mStr, 10);
      yearSet.add(y);

      const val = getValueForSource(item, source);
      mapByYearMonth.set(item.month, { val, item });

      if (val !== null) {
        validCount++;
        if (val > max) max = val;
      }
    }

    const sortedYears = Array.from(yearSet).sort((a, b) => a - b);
    const matrix = [];

    sortedYears.forEach((yr, yIdx) => {
      for (let m = 1; m <= 12; m++) {
        const mStr = String(m).padStart(2, '0');
        const monthKey = `${yr}-${mStr}`;
        const record = mapByYearMonth.get(monthKey);
        const val = record ? record.val : null;

        // ECharts heatmap item: [x (month 0-11), y (yearIdx), val, monthKey]
        matrix.push([m - 1, yIdx, val, monthKey]);
      }
    });

    return {
      years: sortedYears,
      matrixData: matrix,
      maxVal: max > 0 ? max : 10,
      hasData: validCount > 0,
    };
  }, [series, source]);

  // Initialize and update ECharts
  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current, 'dark', {
        renderer: 'canvas',
      });
      if (onChartReady) {
        onChartReady(chartInstanceRef.current);
      }
    }

    const chart = chartInstanceRef.current;

    // Click handler
    const handleClick = (params) => {
      if (params.data && onCellClick) {
        const monthKey = params.data[3];
        const val = params.data[2];
        onCellClick(monthKey, val);
      }
    };
    chart.off('click');
    chart.on('click', handleClick);

    if (years.length === 0) {
      chart.clear();
      return;
    }

    const option = {
      backgroundColor: '#1e293b',
      textStyle: {
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      },
      tooltip: {
        position: 'top',
        backgroundColor: '#0f172a',
        borderColor: '#475569',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 13 },
        formatter: (params) => {
          const [mIdx, yIdx, val, monthKey] = params.data;
          const monthName = MONTH_NAMES[mIdx];
          const year = years[yIdx];
          const formattedVal = formatHotspotValue(val, source);
          const isHighlighted = monthKey === highlightedMonth;

          let statusLine = '';
          if (val === null) {
            statusLine = `<div style="color: #94a3b8; font-style: italic;">No observation / Sensor unavailable</div>`;
          } else if (val === 0) {
            statusLine = `<div style="color: #38bdf8;">True Zero (No fire detected)</div>`;
          }

          return `
            <div style="font-weight: 600; margin-bottom: 4px;">${monthName} ${year} (${monthKey})</div>
            <div style="color: #f97316; font-size: 14px; font-weight: 700;">
              ${formattedVal} <span style="font-size: 11px; font-weight: normal; color: #cbd5e1;">${activeMeta.unit}</span>
            </div>
            ${statusLine}
            ${isHighlighted ? '<div style="color: #eab308; margin-top: 4px; font-weight: bold;">⚡ Flagged Unusual Period</div>' : ''}
          `;
        },
      },
      grid: {
        top: 40,
        bottom: 60,
        left: 70,
        right: 20,
      },
      xAxis: {
        type: 'category',
        data: MONTH_NAMES,
        splitArea: { show: true, areaStyle: { color: ['rgba(255,255,255,0.02)', 'transparent'] } },
        axisLabel: { color: '#cbd5e1', fontSize: 12 },
        axisLine: { lineStyle: { color: '#475569' } },
      },
      yAxis: {
        type: 'category',
        data: years.map(String),
        splitArea: { show: true },
        axisLabel: { color: '#cbd5e1', fontSize: 12 },
        axisLine: { lineStyle: { color: '#475569' } },
      },
      visualMap: {
        min: 0,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 5,
        inRange: {
          color: VIRIDIS_COLORS,
        },
        textStyle: { color: '#94a3b8', fontSize: 11 },
        formatter: (val) => Math.round(val).toLocaleString(),
      },
      series: [
        {
          name: activeMeta.label,
          type: 'heatmap',
          data: matrixData.map(([mIdx, yIdx, val, monthKey]) => {
            const isHighlighted = monthKey === highlightedMonth;
            if (val === null) {
              return {
                value: [mIdx, yIdx, '-'],
                itemStyle: {
                  color: '#0f172a',
                  borderColor: isHighlighted ? '#eab308' : '#334155',
                  borderWidth: isHighlighted ? 2 : 1,
                  borderType: 'dashed',
                },
              };
            }
            if (isHighlighted) {
              return {
                value: [mIdx, yIdx, val, monthKey],
                itemStyle: {
                  borderColor: '#eab308',
                  borderWidth: 3,
                  shadowBlur: 6,
                  shadowColor: '#eab308',
                },
              };
            }
            return [mIdx, yIdx, val, monthKey];
          }),
          label: { show: false },
          itemStyle: {
            borderColor: '#1e293b',
            borderWidth: 1,
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: '#f97316',
              borderWidth: 2,
            },
          },
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart && chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [years, matrixData, maxVal, activeMeta, highlightedMonth, source, onCellClick, onChartReady]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '8px',
        border: '1px solid #334155',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      {/* Calendar Header with Source Toggle & Accessibility Switch */}
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
            Burning Calendar (Year by Month)
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Colorblind-safe Viridis ramp · {activeMeta.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Three-way source buttons */}
          <div
            role="radiogroup"
            aria-label="Calendar Sensor Source"
            style={{
              display: 'inline-flex',
              backgroundColor: '#0f172a',
              borderRadius: '6px',
              padding: '2px',
              border: '1px solid #334155',
            }}
          >
            {Object.values(SOURCES).map((s) => {
              const meta = SOURCE_METADATA[s];
              const isSelected = source === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSourceChange && onSourceChange(s)}
                  style={{
                    padding: '0.4rem 0.75rem',
                    backgroundColor: isSelected ? '#f97316' : 'transparent',
                    color: isSelected ? '#000' : '#cbd5e1',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    minHeight: '44px',
                    minWidth: '44px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Accessible Table View Toggle */}
          <button
            type="button"
            aria-expanded={showTable}
            onClick={() => setShowTable((prev) => !prev)}
            style={{
              padding: '0.4rem 0.75rem',
              backgroundColor: showTable ? '#38bdf8' : '#334155',
              color: showTable ? '#000' : '#f8fafc',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            {showTable ? 'Hide Table View' : 'Accessible Table'}
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div
        ref={chartContainerRef}
        role="region"
        aria-label={`Interactive burning calendar heatmap showing ${activeMeta.label}`}
        style={{
          width: '100%',
          height: `${Math.max(260, years.length * 28 + 120)}px`,
          minHeight: '260px',
        }}
      />

      {/* Empty State Overlay */}
      {!hasData && (
        <div
          role="status"
          style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#94a3b8',
            fontSize: '0.875rem',
          }}
        >
          No observation data available for the current filter.
        </div>
      )}

      {/* Accessible Screen Reader Table Alternative */}
      {showTable && (
        <div
          style={{
            marginTop: '0.5rem',
            overflowX: 'auto',
            maxHeight: '300px',
            border: '1px solid #334155',
            borderRadius: '6px',
          }}
        >
          <table
            aria-label="Burning Calendar Data Table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.75rem',
              color: '#f8fafc',
              textAlign: 'right',
            }}
          >
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155' }}>
                <th style={{ padding: '6px', textAlign: 'left' }}>Year</th>
                {MONTH_NAMES.map((m) => (
                  <th key={m} style={{ padding: '6px' }}>{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((yr) => (
                <tr key={yr} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>{yr}</td>
                  {MONTH_NAMES.map((m, mIdx) => {
                    const monthKey = `${yr}-${String(mIdx + 1).padStart(2, '0')}`;
                    const entry = series.find((s) => s.month === monthKey);
                    const val = entry ? getValueForSource(entry, source) : null;
                    return (
                      <td key={monthKey} style={{ padding: '6px' }}>
                        {formatHotspotValue(val, source, { placeholder: '—' })}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
export default CalendarHeatmap;
