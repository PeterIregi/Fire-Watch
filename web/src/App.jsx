
import { useFireWatch } from './store/useFireWatch.js'

function App() {
  const {
    dataset,
    loading,
    error,
    selection,
    selectedCells,
    reload,
  } = useFireWatch()

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

              <div className="map-placeholder">
                <div className="placeholder-content">
                  <span className="placeholder-icon">◎</span>
                  <h3>Map workspace</h3>
                  <p>
                    Select an area on the map to explore fire activity
                    across the region.
                  </p>
                  <small>Interactive map coming next</small>
                </div>
              </div>
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
