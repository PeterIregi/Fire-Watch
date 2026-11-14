
import { useEffect, useRef } from 'react'
import L from 'leaflet'

import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'leaflet-draw'

import eastAfrica from './data/east-africa.geojson?raw'
import { useFireWatch } from '../store/useFireWatch.js'

const EAST_AFRICA_VIEW = [
  [-13.5, 25.5],
  [3.5, 43.5],
]

const COUNTRY_STYLE = {
  color: '#536577',
  weight: 1,
  opacity: 0.8,
  fillColor: '#1b2936',
  fillOpacity: 0.9,
}

const TANZANIA_STYLE = {
  color: '#e19a51',
  weight: 1.8,
  opacity: 1,
  fillColor: '#344b40',
  fillOpacity: 0.95,
}

const SELECTION_STYLE = {
  color: '#f0a04b',
  weight: 2,
  opacity: 1,
  fillColor: '#f0a04b',
  fillOpacity: 0.12,
  dashArray: '6 5',
}

function getCountryStyle(feature) {
  const code = feature.properties?.['ISO3166-1-Alpha-3']

  return code === 'TZA' ? TANZANIA_STYLE : COUNTRY_STYLE
}

function FireMap() {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const selectionLayerRef = useRef(null)

  const { selection, setAOI } = useFireWatch()
  const aoi = selection.aoi

  // Initialise the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
      preferCanvas: true,
      minZoom: 4,
      maxZoom: 12,
    })

    mapRef.current = map

    L.control.zoom({ position: 'topright' }).addTo(map)

    L.geoJSON(JSON.parse(eastAfrica), {
      style: getCountryStyle,
      onEachFeature(feature, layer) {
        const code = feature.properties?.['ISO3166-1-Alpha-3']
        const name = code === 'TZA'
          ? 'TANZANIA'
          : feature.properties?.name?.toUpperCase()

        if (name) {
          layer.bindTooltip(name, {
            permanent: true,
            direction: 'center',
            className: code === 'TZA'
              ? 'firewatch-country-label firewatch-country-label-primary'
              : 'firewatch-country-label',
          })
        }
      },
    }).addTo(map)

    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false,
    }).addTo(map)

    map.attributionControl.setPrefix(false)
    map.attributionControl.addAttribution(
      'Boundaries: Natural Earth / geo-countries',
    )

    map.fitBounds(EAST_AFRICA_VIEW, {
      padding: [20, 20],
    })

    const drawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polygon: false,
        polyline: false,
        circle: false,
        circlemarker: false,
        marker: false,
        rectangle: {
          shapeOptions: {
            ...SELECTION_STYLE,
          },
        },
      },
      edit: false,
    })

    map.addControl(drawControl)

    function handleRectangleCreated(event) {
      if (event.layerType !== 'rectangle') return

      const bounds = event.layer.getBounds()

      setAOI({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      })
    }

    map.on(L.Draw.Event.CREATED, handleRectangleCreated)

    return () => {
      map.off(L.Draw.Event.CREATED, handleRectangleCreated)
      map.remove()
      mapRef.current = null
      selectionLayerRef.current = null
    }
  }, [setAOI])

  // Keep the visible rectangle synchronised with shared selection state.
  useEffect(() => {
    const map = mapRef.current

    if (!map) return

    if (selectionLayerRef.current) {
      map.removeLayer(selectionLayerRef.current)
      selectionLayerRef.current = null
    }

    if (!aoi) return

    const rectangle = L.rectangle(
      [
        [aoi.south, aoi.west],
        [aoi.north, aoi.east],
      ],
      SELECTION_STYLE,
    )

    rectangle.addTo(map)
    selectionLayerRef.current = rectangle
  }, [aoi])

  return (
    <div
      ref={containerRef}
      className="firewatch-map"
      role="application"
      aria-label="Interactive map of Tanzania and surrounding countries"
    />
  )
}

export default FireMap
