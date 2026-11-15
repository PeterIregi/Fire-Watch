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
import { getCellActivity } from './store/selection.js'
import {
  generateAggregateCsv,
  getAggregateCsvFilename,
  downloadCsvFile,
} from './export/aggregateCsv.js'
import {
  createPresentationCalendarPng,
  downloadDataUrl,
} from './export/calendarPng.js'

const HEAT_COLORS = [
  '#ffc766',
  '#ffad42',
  '#ff872e',
  '#f45b25',
  '#d93622',
]

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
  const [coordinates, setCoordinates] = useState({
    north: '',
    south: '',
    east: '',
    west: '',
  })
  const [coordinateError, setCoordinateError] = useState('')

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

  const activityGrid = useMemo(() => {
    if (!dataset || !selection.dateRange.start) return null

    const [minWest, minSouth, maxEast, maxNorth] = dataset.meta.bbox
    const lats = [...new Set(dataset.cells.map((cell) => cell.lat))].sort(
      (a, b) => b - a,
    )
    const lons = [...new Set(dataset.cells.map((cell) => cell.lon))].sort(
      (a, b) => a - b,
    )
    const idByCoordinate = new Map(
      dataset.cells.map((cell) => [`${cell.lat}_${cell.lon}`, cell.id]),
    )

    const cells = []
    let maximum = 0

    for (const lat of lats) {
      for (const lon of lons) {
        const id = idByCoordinate.get(`${lat}_${lon}`)
        const activity = id
          ? getCellActivity(
              dataset,
              id,
              selection.source,
              selection.dateRange,
            )
          : 0

        if (activity > maximum) maximum = activity
        cells.push({ key: `${lat}_${lon}`, activity })
      }
    }

    const colored = cells.map((cell) => {
      if (cell.activity <= 0 || maximum <= 0) {
        return { ...cell, color: null }
      }

      const index = Math.min(
        HEAT_COLORS.length - 1,
        Math.floor((cell.activity / maximum) * HEAT_COLORS.length),
      )

      return { ...cell, color: HEAT_COLORS[index] }
    })

    return {
      columns: lons.length,
      cells: colored,
      bounds: { west: minWest, south: minSouth, east: maxEast, north: maxNorth },
    }
  }, [dataset, selection.source, selection.dateRange])

  const selectedBounds = selection.aoi ?? activityGrid?.bounds

  const selectionBoxStyle =
    activityGrid && selectedBounds
      ? {
          left: `${((selectedBounds.west - activityGrid.bounds.west) / (activityGrid.bounds.east - activityGrid.bounds.west)) * 100}%`,
          top: `${((activityGrid.bounds.north - selectedBounds.north) / (activityGrid.bounds.north - activityGrid.bounds.south)) * 100}%`,
          width: `${((selectedBounds.east - selectedBounds.west) / (activityGrid.bounds.east - activityGrid.bounds.west)) * 100}%`,
          height: `${((selectedBounds.north - selectedBounds.south) / (activityGrid.bounds.north - activityGrid.bounds.south)) * 100}%`,
        }
      : undefined

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

  const firstMonth = months[0] ?? ''
  const lastMonth = months[months.length - 1] ?? ''

  function handleExportCsv() {
    if (cellRows.length === 0) return

    const csv = generateAggregateCsv(
      cellRows,
      selection.dateRange.start,
      selection.dateRange.end,
    )
    downloadCsvFile(
      csv,
      getAggregateCsvFilename(
        selection.dateRange.start,
        selection.dateRange.end,
      ),
    )
  }

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

    if (bounds.north <= bounds.south || bounds.east <= bounds.west) {
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
      <header className="app-header">
        <div className="app-title">
          <h1>FireWatch</h1>
          <p>
            Tanzania burning calendar, {firstMonth.slice(0, 4)} to{' '}
            {lastMonth.slice(0, 4)}, MODIS and VIIRS on one scale
          </p>
        </div>

        <div className="header-controls">
          <div
            className="segmented"
            role="group"
            aria-label="Observation source"
          >
            {Object.values(SOURCES).map((source) => (
              <button
                key={source}
                type="button"
                className={selection.source === source ? 'is-active' : ''}
                aria-pressed={selection.source === source}
                onClick={() => setSource(source)}
              >
                {SOURCE_METADATA[source].label}
              </button>
            ))}
          </div>

          <label className="field">
            <span>From</span>
            <select
              value={selection.dateRange.start}
              onChange={(event) => handleStartChange(event.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>To</span>
            <select
              value={selection.dateRange.end}
              onChange={(event) => handleEndChange(event.target.value)}
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn btn-primary"
            type="button"
            onClick={handleExportCsv}
            disabled={cellRows.length === 0}
          >
            Download CSV
          </button>
        </div>
      </header>

      {error && (
        <section className="feedback-panel error-panel" role="alert">
          <div>
            <h2>Dataset unavailable</h2>
            <p>{error}</p>
          </div>

          <button className="btn btn-secondary" type="button" onClick={reload}>
            Retry connection
          </button>
        </section>
      )}

      {loading && (
        <section className="feedback-panel loading-panel" aria-live="polite">
          <span className="loader" />

          <div>
            <h2>Preparing FireWatch</h2>
            <p>
              Loading and validating the historical fire observation
              dataset.
            </p>
          </div>
        </section>
      )}

      {dataset && !loading && !error && (
        <div className="dashboard">
          <aside className="panel aoi-panel">
            <div className="panel-heading">
              <h2>Area of interest</h2>
              <p>
                Draw a box on the map, or type coordinates. Each square is
                one {dataset.meta.grid_deg}° cell.
              </p>
            </div>

            {activityGrid && (
              <>
                <div className="aoi-grid-wrap">
                  <div
                    className="aoi-grid"
                    style={{
                      gridTemplateColumns: `repeat(${activityGrid.columns}, minmax(0, 1fr))`,
                    }}
                    aria-hidden="true"
                  >
                    {activityGrid.cells.map((cell) => (
                      <span
                        key={cell.key}
                        className={`aoi-cell${cell.color ? '' : ' is-empty'}`}
                        style={
                          cell.color
                            ? { backgroundColor: cell.color }
                            : undefined
                        }
                      />
                    ))}
                  </div>

                  <span
                    className="aoi-selection-box"
                    style={selectionBoxStyle}
                    aria-hidden="true"
                  />
                </div>

                <div className="aoi-legend" aria-hidden="true">
                  <span>Fewer hotspots</span>
                  {HEAT_COLORS.map((color) => (
                    <span
                      key={color}
                      className="aoi-legend-swatch"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <span>More hotspots</span>
                </div>
              </>
            )}

            <div className="aoi-stats">
              <div>
                <span>Selected cells</span>
                <strong>{selectedCells.length.toLocaleString()}</strong>
              </div>
              <div>
                <span>Grid</span>
                <strong>
                  {dataset.cells.length.toLocaleString()} @{' '}
                  {dataset.meta.grid_deg}°
                </strong>
              </div>
              <div>
                <span>Coverage</span>
                <strong>
                  {months.length.toLocaleString()} months
                </strong>
              </div>
            </div>

            <form className="coordinate-form" onSubmit={handleCoordinateSubmit}>
              <div className="coordinate-grid">
                {[
                  { name: 'north', label: 'North', placeholder: '-1.00' },
                  { name: 'south', label: 'South', placeholder: '-11.00' },
                  { name: 'east', label: 'East', placeholder: '40.00' },
                  { name: 'west', label: 'West', placeholder: '30.00' },
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

              <div className="aoi-actions">
                <button className="btn btn-secondary" type="submit">
                  Apply coordinates
                </button>
                <button
                  className="btn btn-quiet"
                  type="button"
                  onClick={resetAOI}
                  disabled={!selection.aoi}
                >
                  Reset selection
                </button>
              </div>
            </form>
          </aside>

          <div className="main-column">
            <KpiCards
              displayedSeries={displayedSeries}
              fullSeries={fullSeries}
              source={selection.source}
            />

            <section className="panel map-panel">
              <div className="panel-heading panel-heading-row">
                <div>
                  <h2>Fire activity map</h2>
                  <p>
                    Satellite detections for{' '}
                    {selection.dateRange.start} to {selection.dateRange.end}
                    , coloured by relative intensity.
                  </p>
                </div>
                <span className="map-badge">
                  {selectedCells.length.toLocaleString()} cells
                </span>
              </div>

              <div className="map-canvas">
                <FireMap />
              </div>

              <div className="map-status">
                <span>{selection.source.toUpperCase()}</span>
                <span>{selection.dateRange.start} — {selection.dateRange.end}</span>
                <span>Tanzania study area</span>
              </div>
            </section>

            <CalendarHeatmap
              ref={calendarRef}
              series={displayedSeries}
              source={selection.source}
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

            <section className="panel validation-panel">
              <div className="panel-heading panel-heading-row">
                <div>
                  <h2>Harmonization validation</h2>
                  <p>
                    Calibration metadata reported by the data pipeline.
                    Held-out years are used where available.
                  </p>
                </div>
                <span className="panel-badge">
                  {validationPending ? 'Calibration pending' : 'Validated'}
                </span>
              </div>

              <div className="validation-grid">
                <article>
                  <span>Pearson correlation (r)</span>
                  <strong>{formatValidationMetric(validation.pearson)}</strong>
                  <small>Linear agreement between sensors</small>
                </article>

                <article>
                  <span>Spearman rank (ρ)</span>
                  <strong>{formatValidationMetric(validation.spearman)}</strong>
                  <small>Rank-order agreement</small>
                </article>

                <article>
                  <span>Mean absolute error</span>
                  <strong>{formatValidationMetric(validation.mae)}</strong>
                  <small>Hotspots per grid cell-month</small>
                </article>

                <article>
                  <span>Annual total error</span>
                  <strong>
                    {Number.isFinite(validation.annual_total_relative_error)
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

            <p className="app-note">
              Hotspots are thermal detections, not fire boundaries. A day
              with no detection can still hold a fire the satellites missed.
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
