import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as echarts from 'echarts';
import {
  SOURCES,
  SOURCE_METADATA,
  getValueForSource,
  formatHotspotValue,
} from '../calendar/dataHelpers.js';

/**
 * Sensor Comparison Line Chart (Domain D - Peter)
 * 
 * Plots Raw MODIS, Raw VIIRS, and Harmonized (MODIS-equivalent) time-series.
 * Demonstrates sensor mismatch and how the harmonized series bridges the records.
 * 
 * Props:
 * - series: Array of { month: 'YYYY-MM', harmonized, modis_hotspots, viirs_hotspots, ... }
 */
export function ComparisonChart({ series = [] }) {
  const chartContainerRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const [showTable, setShowTable] = useState(false);

  // Process data for the 3 lines
  const { months, harmonizedData, modisData, viirsData, hasData } = useMemo(() => {
    if (!series || series.length === 0) {
      return {
        months: [],
        harmonizedData: [],
        modisData: [],
        viirsData: [],
        hasData: false,
      };
    }

    const sorted = [...series].sort((a, b) => (a.month < b.month ? -1 : 1));
    const mList = [];
    const harm = [];
    const mod = [];
    const vii = [];
    let validCount = 0;

    for (const item of sorted) {
      if (!item || !item.month) continue;
      mList.push(item.month);

      const hVal = getValueForSource(item, SOURCES.HARMONIZED);
      const mVal = getValueForSource(item, SOURCES.MODIS);
      const vVal = getValueForSource(item, SOURCES.VIIRS);

      // In ECharts, null / '-' represents missing/unconnected data points
      harm.push(hVal !== null ? hVal : '-');
      mod.push(mVal !== null ? mVal : '-');
      vii.push(vVal !== null ? vVal : '-');

      if (hVal !== null || mVal !== null || vVal !== null) {
        validCount++;
      }
    }

    return {
      months: mList,
      harmonizedData: harm,
      modisData: mod,
      viirsData: vii,
      hasData: validCount > 0,
    };
  }, [series]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartContainerRef.current, 'dark', {
        renderer: 'canvas',
      });
    }

    const chart = chartInstanceRef.current;

    if (months.length === 0) {
      chart.clear();
      return;
    }

    const option = {
      backgroundColor: '#1e293b',
      textStyle: {
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#475569',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 13 },
        axisPointer: {
          type: 'cross',
          lineStyle: { color: '#f97316', type: 'dashed' },
        },
        formatter: (params) => {
          if (!params || params.length === 0) return '';
          const monthStr = params[0].axisValue;
          let html = `<div style="font-weight: 700; margin-bottom: 6px; border-bottom: 1px solid #334155; padding-bottom: 4px;">Month: ${monthStr}</div>`;
          
          params.forEach((p) => {
            const rawVal = p.value === '-' ? null : p.value;
            const displayVal = rawVal !== null ? Number(rawVal).toLocaleString(undefined, { maximumFractionDigits: 1 }) : 'No data / Unobserved';
            html += `
              <div style="display: flex; justify-content: space-between; gap: 1rem; align-items: center; margin: 3px 0;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${p.color};"></span>
                  <span style="color: #cbd5e1;">${p.seriesName}:</span>
                </span>
                <strong style="color: #f8fafc;">${displayVal}</strong>
              </div>
            `;
          });
          return html;
        },
      },
      legend: {
        data: ['Harmonized (MODIS-equiv)', 'Raw MODIS', 'Raw VIIRS'],
        top: 8,
        textStyle: { color: '#cbd5e1', fontSize: 12 },
        selectedMode: true,
      },
      grid: {
        top: 50,
        bottom: 60,
        left: 65,
        right: 30,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          bottom: 10,
          height: 20,
          borderColor: '#334155',
          textStyle: { color: '#94a3b8' },
        },
      ],
      xAxis: {
        type: 'category',
        data: months,
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: {
          color: '#cbd5e1',
          fontSize: 11,
          formatter: (val) => {
            // If January, highlight year
            if (val && val.endsWith('-01')) return val.slice(0, 4);
            return val ? val.slice(5) : '';
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Hotspots',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#475569' } },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } },
        axisLabel: { color: '#cbd5e1', fontSize: 11 },
      },
      series: [
        {
          name: 'Harmonized (MODIS-equiv)',
          type: 'line',
          data: harmonizedData,
          connectNulls: false, // PRESERVE GAPS FOR MISSING OBSERVATIONS
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            color: '#f97316',
            width: 2.5,
          },
          itemStyle: { color: '#f97316' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(249, 115, 22, 0.2)' },
              { offset: 1, color: 'rgba(249, 115, 22, 0.0)' },
            ]),
          },
        },
        {
          name: 'Raw MODIS',
          type: 'line',
          data: modisData,
          connectNulls: false,
          smooth: false,
          symbol: 'triangle',
          symbolSize: 5,
          lineStyle: {
            color: '#38bdf8',
            width: 1.8,
            type: 'dashed',
          },
          itemStyle: { color: '#38bdf8' },
        },
        {
          name: 'Raw VIIRS',
          type: 'line',
          data: viirsData,
          connectNulls: false, // Critical: preserves pre-2012 gap
          smooth: false,
          symbol: 'diamond',
          symbolSize: 5,
          lineStyle: {
            color: '#a855f7',
            width: 1.8,
            type: 'dotted',
          },
          itemStyle: { color: '#a855f7' },
        },
      ],
    };

    chart.setOption(option, true);

    const handleResize = () => chart && chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [months, harmonizedData, modisData, viirsData]);

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
            Sensor Comparison: Raw vs. Harmonized Series
          </h2>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Compare raw Terra/Aqua MODIS (dashed blue), raw Suomi NPP VIIRS (dotted purple), and calibrated harmonized continuity (solid orange).
          </p>
        </div>

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

      <div
        ref={chartContainerRef}
        role="region"
        aria-label="Comparison line chart of Raw MODIS, Raw VIIRS, and Harmonized series over time"
        style={{ width: '100%', height: '320px', minHeight: '300px' }}
      />

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
          No observation data available in the selected range to compare sensors.
        </div>
      )}

      {showTable && (
        <div
          style={{
            marginTop: '0.5rem',
            overflowX: 'auto',
            maxHeight: '260px',
            border: '1px solid #334155',
            borderRadius: '6px',
          }}
        >
          <table
            aria-label="Sensor Comparison Data Table"
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
                <th style={{ padding: '6px', textAlign: 'left' }}>Month</th>
                <th style={{ padding: '6px', color: '#f97316' }}>Harmonized (MODIS-equiv)</th>
                <th style={{ padding: '6px', color: '#38bdf8' }}>Raw MODIS</th>
                <th style={{ padding: '6px', color: '#a855f7' }}>Raw VIIRS</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, idx) => (
                <tr key={m} style={{ borderBottom: '1px solid #334155' }}>
                  <td style={{ padding: '6px', textAlign: 'left', fontWeight: 600 }}>{m}</td>
                  <td style={{ padding: '6px' }}>{formatHotspotValue(harmonizedData[idx] === '-' ? null : harmonizedData[idx])}</td>
                  <td style={{ padding: '6px' }}>{formatHotspotValue(modisData[idx] === '-' ? null : modisData[idx])}</td>
                  <td style={{ padding: '6px' }}>{formatHotspotValue(viirsData[idx] === '-' ? null : viirsData[idx])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
export default ComparisonChart;
