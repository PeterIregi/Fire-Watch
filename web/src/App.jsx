import { useMemo, useRef, useState } from 'react'
import { useFireWatch } from './store/useFireWatch.js'
import FireMap from './map/FireMap.jsx'
import {
  SOURCE_METADATA,
  SOURCES,
  aggregateCellRowsToMonthlySeries,
  filterSeriesByDateRange,
  formatHotspotValue,
} from './calendar/dataHelpers.js'
import { CalendarHeatmap } from './calendar/CalendarHeatmap.jsx'
import { ComparisonChart } from './charts/ComparisonChart.jsx'
import { KpiCards } from './kpis/KpiCards.jsx'
import { AnomaliesList } from './anomalies/AnomaliesList.jsx'
import { ExportPanel } from './export/ExportPanel.jsx'
import {
  createPresentationCalendarPng,
  downloadDataUrl,
} from './export/calendarPng.js'

function formatValidationMetric(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : '—'
}

function App() {
  const {
    dataset,
    loading,
    error,
    setSource,
    setDateRange,
    selection,
    selectedCells,
    reload,
    setAOI,
    resetAOI,
  } = useFireWatch()

  const months = dataset?.meta.months ?? []
  const calendarRef = useRef(null)
  const [highlightedMonth, setHighlightedMonth] = useState(null)

  const { fullSeries, displayedSeries, cellRows } = useMemo(() => {
    if (!dataset) {
      return { fullSeries: [], displayedSeries: [], cellRows: [] }
    }

    const rows = []

    for (const cell of selectedCells) {
      const records = dataset.data[cell.id] ?? []

      for (const record of records) {
        const [
          monthIndex,
          modisHotspots,
          modisFireDays,
          viirsHotspots,
          viirsFireDays,
          harmonized,
        ] = record
        const month = dataset.meta.months[monthIndex]

        if (!month) continue

        rows.push({
          cell_id: cell.id,
          lat: cell.lat,
          lon: cell.lon,
          month,
          modis_hotspots: modisHotspots,
          modis_fire_days: modisFireDays,
          viirs_hotspots: viirsHotspots,
          viirs_fire_days: viirsFireDays,
          harmonized,
        })
      }
    }

    const full = aggregateCellRowsToMonthlySeries(rows)
    const displayed = filterSeriesByDateRange(
      full,
      selection.dateRange.start,
      selection.dateRange.end,
    )

    return { fullSeries: full, displayedSeries: displayed, cellRows: rows }
  }, [
    dataset,
    selectedCells,
    selection.dateRange.start,
    selection.dateRange.end,
  ])

  const exportBbox = selection.aoi
    ? [
        selection.aoi.west,
        selection.aoi.south,
        selection.aoi.east,
        selection.aoi.north,
      ]
    : null

  const validation = dataset?.meta?.validation ?? {}
  const calibration = dataset?.meta?.calibration ?? {}
  const validationPending =
    validation.status === 'placeholder' ||
    calibration.status === 'placeholder'

  async function handleExportPng() {
    if (!calendarRef.current) return

    const rawDataUrl = calendarRef.current.getDataUrl()

    if (!rawDataUrl) {
      window.alert('Calendar has no active data to export.')
      return
    }

    const sourceMeta =
      SOURCE_METADATA[selection.source] ||
      SOURCE_METADATA[SOURCES.HARMONIZED]

    const compositedUrl = await createPresentationCalendarPng(rawDataUrl, {
      aoiName: selection.aoi ? 'Custom AOI' : 'Tanzania study area',
      dateRange: `${selection.dateRange.start} to ${selection.dateRange.end}`,
      sourceLabel: sourceMeta.label,
      unit: sourceMeta.unit,
    })

    downloadDataUrl(compositedUrl, 'firewatch_calendar.png')
  }

  function toggleHighlightedMonth(month) {
    setHighlightedMonth((current) => (current === month ? null : month))
  }

  const [coordinates, setCoordinates] = useState({
  north: '',
  south: '',
  east: '',
  west: '',
})

const [coordinateError, setCoordinateError] = useState('')

function handleCoordinateChange(event) {
  const { name, value } = event.target

  setCoordinates((current) => ({
    ...current,
    [name]: value,
  }))

  setCoordinateError('')
}

function handleCoordinateSubmit(event) {
  event.preventDefault()

  const bounds = {
    north: Number(coordinates.north),
    south: Number(coordinates.south),
    east: Number(coordinates.east),
    west: Number(coordinates.west),
  }

  if (Object.values(coordinates).some((value) => value.trim() === '')) {
    setCoordinateError('Enter all four coordinates.')
    return
  }

  if (!Object.values(bounds).every(Number.isFinite)) {
    setCoordinateError('Coordinates must be valid numbers.')
    return
  }

  const [minWest, minSouth, maxEast, maxNorth] = dataset.meta.bbox

  if (
    bounds.west < minWest ||
    bounds.east > maxEast ||
    bounds.south < minSouth ||
    bounds.north > maxNorth
  ) {
    setCoordinateError(
      'Coordinates must fall within the Tanzania study area.',
    )
    return
  }

  if (
    bounds.north <= bounds.south ||
    bounds.east <= bounds.west
  ) {
    setCoordinateError(
      'North must exceed South, and East must exceed West.',
    )
    return
  }

  setAOI(bounds)
  setCoordinateError('')
}

  function handleStartChange(start) {
    setDateRange({
      start,
      end:
        start > selection.dateRange.end
          ? start
          : selection.dateRange.end,
    })
  }

  function handleEndChange(end) {
    setDateRange({
      start:
        end < selection.dateRange.start
          ? end
          : selection.dateRange.start,
      end,
    })
  }

  return (
    <main className="app-shell">
      {/* APPLICATION HEADER */}
      <header className="app-header">
        <a className="brand" href="/" aria-label="FireWatch home">
          <span className="brand-mark">FW</span>

          <span className="brand-copy">
            <strong>FIREWATCH</strong>
            <small>EARTH OBSERVATION INTELLIGENCE</small>
          </span>
        </a>

        <div className="header-project">
          <span>NASA SPACE APPS CHALLENGE</span>
          <strong>2026 / TEAM TAZAMA</strong>
        </div>

        <div className="header-status">
          <span
            className={`status-dot ${
              loading ? 'loading' : error ? 'error' : 'ready'
            }`}
          />
          <span>
            {loading
              ? 'LOADING DATA'
              : error
                ? 'DATA UNAVAILABLE'
                : 'SYSTEM READY'}
          </span>
        </div>
      </header>

      {/* ERROR STATE */}
      {error && (
        <section className="feedback-panel error-panel" role="alert">
          <div>
            <h2>Dataset unavailable</h2>
            <p>{error}</p>
          </div>

          <button type="button" onClick={reload}>
            Retry connection
          </button>
        </section>
      )}

      {/* LOADING STATE */}
      {loading && (
        <section
          className="feedback-panel loading-panel"
          aria-live="polite"
        >
          <span className="loader" />

          <div>
            <h2>Preparing FireWatch</h2>
            <p>
              Loading and validating the historical fire observation
              dataset...
            </p>
          </div>
        </section>
      )}

      {/* MAIN DASHBOARD */}
      {dataset && !loading && !error && (
        <section className="dashboard-layout">
          {/* REGIONAL INTELLIGENCE PANEL */}
          <aside className="dashboard-sidebar">
            <div className="sidebar-heading">
              <div className="sidebar-kicker">
                <span className="section-marker" />
                REGIONAL INTELLIGENCE
              </div>

              <div className="region-title">
                <div>
                  <span className="region-code">TZ / 001</span>
                  <h1>Tanzania</h1>
                </div>

                <span className="region-symbol" aria-hidden="true">
                  TZ
                </span>
              </div>

              <p className="sidebar-description">
                Historical satellite observations across the study area.
              </p>

              <div className="dataset-status">
                <span className="status-dot ready" />
                HISTORICAL DATASET LOADED
              </div>
            </div>

            {/* ACTIVITY METRICS */}
            <section className="sidebar-section">
              <div className="section-heading">
                <span className="section-number">01</span>
                <h2>Dataset overview</h2>
              </div>

              <div className="sidebar-metrics">
                <article className="sidebar-metric">
                  <span>GRID CELLS</span>
                  <strong>
                    {dataset.cells.length.toLocaleString()}
                  </strong>
                  <small>Across the study area</small>
                </article>

                <article className="sidebar-metric">
                  <span>SELECTED CELLS</span>
                  <strong>
                    {selectedCells.length.toLocaleString()}
                  </strong>
                  <small>Within the selected area</small>
                </article>

                <article className="sidebar-metric">
                  <span>TIME COVERAGE</span>
                  <strong>
                    {months.length.toLocaleString()}
                    <small className="metric-unit">MONTHS</small>
                  </strong>
                  <small>Available observation periods</small>
                </article>
              </div>
            </section>

            {/* FIRE INTENSITY */}
            <section className="sidebar-section">
              <div className="section-heading">
                <span className="section-number">02</span>
                <h2>Fire intensity</h2>
              </div>

              <div className="fire-legend-list">
                {[
                  ['#ffc766', 'Low'],
                  ['#ffad42', 'Moderate'],
                  ['#ff872e', 'High'],
                  ['#f45b25', 'Very high'],
                  ['#d93622', 'Extreme'],
                ].map(([color, label], index) => (
                  <div className="fire-legend-item" key={label}>
                    <span className="legend-index">
                      0{index + 1}
                    </span>

                    <span
                      className="fire-legend-dot"
                      style={{ backgroundColor: color }}
                    />

                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* AREA OF INTEREST */}
            <section className="sidebar-section sidebar-area">
              <div className="section-heading">
                <span className="section-number">03</span>
                <h2>Area of interest</h2>
              </div>

              <div className="area-readout">
                <span className="area-indicator" />

                <div>
                  <strong>
                    {selection.aoi
                      ? 'Custom selection'
                      : 'Entire Tanzania'}
                  </strong>

                  <small>
                    {selection.aoi
                      ? `${selectedCells.length} grid cells selected`
                      : 'No custom area selected'}
                  </small>
                </div>
              </div>

              <form
  className="coordinate-form"
  onSubmit={handleCoordinateSubmit}
>
  <div className="coordinate-form-heading">
    <span>DEFINE BY COORDINATES</span>
    <small>DECIMAL DEGREES</small>
  </div>

  <div className="coordinate-grid">
    {[
      { name: 'north', label: 'NORTH', placeholder: '-1.00' },
      { name: 'south', label: 'SOUTH', placeholder: '-11.00' },
      { name: 'east', label: 'EAST', placeholder: '40.00' },
      { name: 'west', label: 'WEST', placeholder: '30.00' },
    ].map(({ name, label, placeholder }) => (
      <label className="coordinate-field" key={name}>
        <span>{label}</span>
        <input
          type="number"
          name={name}
          step="any"
          value={coordinates[name]}
          onChange={handleCoordinateChange}
          placeholder={placeholder}
          required
        />
      </label>
    ))}
  </div>

  {coordinateError && (
    <p className="coordinate-error" role="alert">
      {coordinateError}
    </p>
  )}

  <button className="apply-coordinates-button" type="submit">
    APPLY COORDINATES
    <span aria-hidden="true">↗</span>
  </button>
</form>

              <button
                className="reset-area-button"
                type="button"
                onClick={resetAOI}
                disabled={!selection.aoi}
              >
                RESET SELECTION
                <span aria-hidden="true">↗</span>
              </button>
            </section>

            {/* SIDEBAR FOOTER */}
            <footer className="sidebar-footer">
              <span>FIREWATCH / TEAM TAZAMA</span>
              <small>
                Satellite detections indicate observed activity, not
                confirmed fire boundaries.
              </small>
            </footer>
          </aside>

          {/* MAP AND ANALYTICS WORKSPACE */}
          <section className="map-workspace">
            {/* WORKSPACE HEADING */}
            <div className="workspace-topline">
              <div>
                <span className="workspace-overline">
                  GEOSPATIAL MONITORING / EAST AFRICA
                </span>

                <h2>Fire activity map</h2>
              </div>

              <span className="historical-tag">
                HISTORICAL OBSERVATIONS
              </span>
            </div>

            {/* MAP TOOLBAR */}
            <div className="map-toolbar">
              <div className="map-toolbar-group">
                <span className="control-label">OBSERVATION SOURCE</span>

                <div className="source-options">
                  {['modis', 'viirs', 'harmonized'].map((source) => (
                    <button
                      key={source}
                      type="button"
                      className={
                        selection.source === source ? 'active' : ''
                      }
                      aria-pressed={selection.source === source}
                      onClick={() => setSource(source)}
                    >
                      {source.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="map-toolbar-group date-control">
                <label>
                  <span className="control-label">START PERIOD</span>

                  <select
                    value={selection.dateRange.start}
                    onChange={(event) =>
                      handleStartChange(event.target.value)
                    }
                  >
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </label>

                <span className="date-separator" aria-hidden="true">
                  →
                </span>

                <label>
                  <span className="control-label">END PERIOD</span>

                  <select
                    value={selection.dateRange.end}
                    onChange={(event) =>
                      handleEndChange(event.target.value)
                    }
                  >
                    {months.map((month) => (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="map-toolbar-status">
                <span className="status-dot ready" />
                MAP ACTIVE
              </div>
            </div>

            {/* MAP */}
            <div className="map-canvas">
              <FireMap />
            </div>

            {/* MAP STATUS STRIP */}
            <div className="map-bottom-bar">
              <span>
                SOURCE: {selection.source.toUpperCase()}
              </span>

              <span>
                {selectedCells.length.toLocaleString()} SELECTED CELLS
              </span>

              <span>
                PERIOD: {selection.dateRange.start} —{' '}
                {selection.dateRange.end}
              </span>
            </div>

            {/* ANALYTICS WORKSPACE */}
            <section
              className="analytics-workspace"
              aria-label="Temporal fire activity analysis"
            >
              <div className="analytics-heading">
                <div>
                  <span className="workspace-overline">
                    DATA ANALYSIS / MODULE 02
                  </span>

                  <h2>Temporal activity analysis</h2>

                  <p>
                    Explore satellite-detected fire activity across the
                    selected observation period, compare MODIS with
                    VIIRS, and export the current selection.
                  </p>
                </div>

                <span className="analytics-tag">LIVE ANALYTICS</span>
              </div>

              <KpiCards
                displayedSeries={displayedSeries}
                fullSeries={fullSeries}
                source={selection.source}
              />

              <CalendarHeatmap
                ref={calendarRef}
                series={displayedSeries}
                source={selection.source}
                onSourceChange={setSource}
                highlightedMonth={highlightedMonth}
                onCellClick={toggleHighlightedMonth}
              />

              <ComparisonChart series={displayedSeries} />

              <AnomaliesList
                displayedSeries={displayedSeries}
                fullSeries={fullSeries}
                source={selection.source}
                highlightedMonth={highlightedMonth}
                onSelectAnomaly={toggleHighlightedMonth}
              />

              <ExportPanel
                cellRows={cellRows}
                startMonth={selection.dateRange.start}
                endMonth={selection.dateRange.end}
                bbox={exportBbox}
                onExportPng={handleExportPng}
              />

              <section
                aria-label="Harmonization validation metrics"
                className="validation-panel"
              >
                <div className="validation-heading">
                  <div>
                    <span className="workspace-overline">
                      DATA QUALITY / MODULE 03
                    </span>

                    <h2>Harmonization validation</h2>

                    <p>
                      Calibration metadata reported by the data pipeline.
                      Held-out years are used where available.
                    </p>
                  </div>

                  <span className="analytics-tag">
                    {validationPending ? 'CALIBRATION PENDING' : 'VALIDATED'}
                  </span>
                </div>

                <div className="validation-grid">
                  <article>
                    <span>PEARSON CORRELATION (R)</span>
                    <strong>{formatValidationMetric(validation.pearson)}</strong>
                    <small>Linear agreement between sensors</small>
                  </article>

                  <article>
                    <span>SPEARMAN RANK (ρ)</span>
                    <strong>{formatValidationMetric(validation.spearman)}</strong>
                    <small>Rank-order agreement</small>
                  </article>

                  <article>
                    <span>MEAN ABSOLUTE ERROR</span>
                    <strong>{formatValidationMetric(validation.mae)}</strong>
                    <small>Hotspots per grid cell-month</small>
                  </article>

                  <article>
                    <span>ANNUAL TOTAL ERROR</span>
                    <strong>
                      {Number.isFinite(
                        validation.annual_total_relative_error,
                      )
                        ? `${(
                            validation.annual_total_relative_error * 100
                          ).toFixed(1)}%`
                        : '—'}
                    </strong>
                    <small>Relative error on annual totals</small>
                  </article>
                </div>

                <p className="validation-note">
                  {validationPending
                    ? 'The bundled dataset is a placeholder export. Validation figures will populate when the pipeline calibration run replaces it.'
                    : `Training period ${calibration.train ?? '—'} · test period ${calibration.test ?? '—'}.`}
                  {Number.isFinite(validation.bias) && (
                    <>
                      {' '}
                      Bias:{' '}
                      {formatHotspotValue(validation.bias, selection.source)}
                    </>
                  )}
                </p>
              </section>
            </section>
          </section>
        </section>
      )}
    </main>
  )
}

export default App
