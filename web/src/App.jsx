
import { useFireWatch } from './store/useFireWatch.js'
import FireMap from './map/FireMap.jsx'

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
} = useFireWatch()

const months = dataset?.meta.months ?? []

function handleStartChange(start) {
  setDateRange({
    start,
    end: start > selection.dateRange.end
      ? start
      : selection.dateRange.end,
  })
}

function handleEndChange(end) {
  setDateRange({
    start: end < selection.dateRange.start
      ? end
      : selection.dateRange.start,
    end,
  })
}

  return (
    <main className="app-shell">
      <header className="app-header">
        <a className="brand" href="/" aria-label="FireWatch home">
          <span className="brand-mark">F</span>
          <span>
            <strong>FireWatch</strong>
            <small>East Africa · Fire intelligence</small>
          </span>
        </a>

        <div className="header-status">
          <span className={`status-dot ${loading ? 'loading' : error ? 'error' : 'ready'}`} />
          <span>
            {loading ? 'Loading data' : error ? 'Data unavailable' : 'System ready'}
          </span>
        </div>
      </header>

      <section className="dashboard">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">TANZANIA · HISTORICAL FIRE ACTIVITY</p>
            <h1>Understand where fire happens.</h1>
            <p className="intro">
              Explore historical fire activity across Tanzania using harmonized
              MODIS and VIIRS satellite observations.
            </p>
          </div>
        </div>

        {error && (
          <section className="feedback-panel error-panel" role="alert">
            <div>
              <h2>We couldn't load the dataset</h2>
              <p>{error}</p>
            </div>
            <button type="button" onClick={reload}>
              Try again
            </button>
          </section>
        )}

        {loading && (
          <section className="feedback-panel loading-panel" aria-live="polite">
            <span className="loader" />
            <div>
              <h2>Preparing FireWatch</h2>
              <p>Loading and validating the historical fire dataset...</p>
            </div>
          </section>
        )}

        {dataset && !loading && !error && (
          <>
            <section className="overview">
              <article className="metric-card">
                <span>GRID CELLS</span>
                <strong>{dataset.cells.length.toLocaleString()}</strong>
                <small>Across the study area</small>
              </article>

              <article className="metric-card">
                <span>SELECTED CELLS</span>
                <strong>{selectedCells.length.toLocaleString()}</strong>
                <small>Within current area of interest</small>
              </article>

              <article className="metric-card">
                <span>TIME COVERAGE</span>
                <strong>{dataset.meta.months.length.toLocaleString()}</strong>
                <small>Monthly observations</small>
              </article>
            </section>

            <section className="workspace">
             <div className="workspace-heading">
  <div>
    <p className="eyebrow">EXPLORATION</p>
    <h2>Fire activity map</h2>
  </div>

  <span className="source-label">
    {selection.source.toUpperCase()}
  </span>
</div>

<div className="map-controls">
  <div className="source-control">
    <span className="control-label">DATA SOURCE</span>

    <div className="source-options">
      {['modis', 'viirs', 'harmonized'].map((source) => (
        <button
          key={source}
          type="button"
          className={selection.source === source ? 'active' : ''}
          aria-pressed={selection.source === source}
          onClick={() => setSource(source)}
        >
          {source.toUpperCase()}
        </button>
      ))}
    </div>
  </div>

  <div className="date-control">
    <label>
      <span className="control-label">FROM</span>
      <select
        value={selection.dateRange.start}
        onChange={(event) => handleStartChange(event.target.value)}
      >
        {months.map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </select>
    </label>

    <label>
      <span className="control-label">TO</span>
      <select
        value={selection.dateRange.end}
        onChange={(event) => handleEndChange(event.target.value)}
      >
        {months.map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </select>
    </label>
  </div>
</div>

<FireMap />

              
            </section>

            <section className="analytics-placeholder">
              <div>
                <p className="eyebrow">HISTORICAL ANALYSIS</p>
                <h2>Monthly fire activity</h2>
                <p>
                  Select an area to calculate its monthly fire activity
                  timeline.
                </p>
              </div>
              <span className="analytics-tag">Analytics workspace</span>
            </section>
          </>
        )}
      </section>

      <footer className="app-footer">
        <span>FireWatch · Team Tazama</span>
        <span>Satellite detections are not fire boundaries.</span>
      </footer>
    </main>
  )
}

export default App
